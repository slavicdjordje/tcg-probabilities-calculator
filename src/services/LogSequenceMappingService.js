/**
 * LogSequenceMappingService
 *
 * Maps parsed DuelingBook log actions onto a reference combo sequence,
 * runs legal checks on successfully matched actions, and produces:
 *
 *   - mappedSteps:    each sequence step annotated with its matching log action + verdict
 *   - extraActions:   log lines that did not map to any reference step
 *   - feedbackRecord: persisted to localStorage for the learning loop
 *
 * ── Input ─────────────────────────────────────────────────────────────────────
 *   parsedLog      – { filename, raw, actions: string[] } from DuelingBook parser
 *   sequence       – combo sequence from COMBO_SEQUENCE_DATABASE
 *   deckCardCounts – { cardName: count } from the uploaded YDK
 *
 * ── Output ────────────────────────────────────────────────────────────────────
 *   {
 *     mappedSteps:   MappedStep[],
 *     extraActions:  string[],
 *     feedbackRecord: FeedbackRecord,
 *   }
 *
 * ── MappedStep ────────────────────────────────────────────────────────────────
 *   {
 *     stepIndex:            number,
 *     referenceDescription: string,
 *     matchedAction:        string | null,   // log line that matched (null = no match)
 *     verdict:              'legal' | 'ambiguous' | 'illegal' | 'unmatched',
 *     explanation:          string,
 *     cardName:             string | null,   // card name extracted from the log action
 *   }
 *
 * ── FeedbackRecord ────────────────────────────────────────────────────────────
 *   {
 *     sequenceId:  string,
 *     filename:    string,
 *     timestamp:   string,   // ISO-8601
 *     mappedSteps: MappedStep[],
 *   }
 */

import LegalCheckService from './LegalCheckService.js';

const FEEDBACK_STORAGE_KEY = 'fdgg_sequence_feedback';
const MAX_FEEDBACK_RECORDS  = 50;

// ── Action classification ─────────────────────────────────────────────────────

/**
 * DuelingBook log keyword → STEP_TAG mapping.
 * Ordered so more-specific keywords are checked before generic ones.
 */
const ACTION_KEYWORD_MAP = [
  { keyword: 'Normal Summon',   tag: 'normal-summon'    },
  { keyword: 'Special Summon',  tag: 'special-summon'   },
  { keyword: 'Ritual Summon',   tag: 'ritual-summon'    },
  { keyword: 'Fusion Summon',   tag: 'fusion-summon'    },
  { keyword: 'Synchro Summon',  tag: 'synchro-summon'   },
  { keyword: 'Xyz Summon',      tag: 'xyz-summon'       },
  { keyword: 'Link Summon',     tag: 'link-summon'      },
  { keyword: 'activated',       tag: 'activate-effect'  },
  { keyword: 'added',           tag: 'search'           },
  { keyword: 'sent',            tag: 'send-to-gy'       },
  { keyword: 'banished',        tag: 'banish'           },
  { keyword: 'Set',             tag: 'set'              },
  { keyword: 'discarded',       tag: 'discard'          },
  { keyword: 'attached',        tag: 'attach-material'  },
  { keyword: 'detached',        tag: 'detach-material'  },
];

/**
 * Extract the first quoted card name from a DuelingBook log action.
 *
 * @param {string} action
 * @returns {string|null}
 */
function extractCardName(action) {
  const match = action.match(/"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Classify a log action string into a STEP_TAG value.
 * Returns null when no keyword matches.
 *
 * @param {string} action
 * @returns {string|null}
 */
function classifyAction(action) {
  for (const { keyword, tag } of ACTION_KEYWORD_MAP) {
    if (action.includes(keyword)) return tag;
  }
  return null;
}

// ── Step matching ─────────────────────────────────────────────────────────────

/**
 * Greedily match log actions to sequence steps (left-to-right, one-to-one).
 *
 * A log action matches a step when:
 *   1. The extracted card name appears in step.cards (by name), AND
 *   2. The classified action tag matches at least one of the step's tags,
 *      OR the step has no tags (unconstrained).
 *
 * Each log action is consumed at most once to preserve order.
 *
 * @param {string[]} actions
 * @param {object}   sequence
 * @returns {Map<number, { action: string, cardName: string }>}
 *          stepIndex → match
 */
function matchActionsToSteps(actions, sequence) {
  const usedIndices = new Set();
  const matches     = new Map();

  for (const step of sequence.steps) {
    const stepCardNames = new Set(step.cards.map(c => c.name));
    const stepTags      = new Set(step.tags ?? []);

    for (let i = 0; i < actions.length; i++) {
      if (usedIndices.has(i)) continue;

      const action    = actions[i];
      const cardName  = extractCardName(action);
      const actionTag = classifyAction(action);

      const cardMatch = cardName != null && stepCardNames.has(cardName);
      const tagMatch  = actionTag == null || stepTags.size === 0 || stepTags.has(actionTag);

      if (cardMatch && tagMatch) {
        matches.set(step.index, { action, cardName });
        usedIndices.add(i);
        break;
      }
    }
  }

  return matches;
}

// ── Public service object ─────────────────────────────────────────────────────

const LogSequenceMappingService = {
  /**
   * Map log actions onto a reference sequence, validate legal for each match,
   * and persist a feedback record.
   *
   * @param {object} options
   * @param {object} options.parsedLog      – { filename, raw, actions }
   * @param {object} options.sequence       – combo sequence
   * @param {object} options.deckCardCounts – { cardName: count }
   * @returns {Promise<{ mappedSteps: MappedStep[], extraActions: string[], feedbackRecord: FeedbackRecord }>}
   */
  async mapAndValidate({ parsedLog, sequence, deckCardCounts }) {
    const { filename, actions } = parsedLog;
    const stepMatches = matchActionsToSteps(actions, sequence);

    // Collect actions that matched any step (for computing extras)
    const matchedActions = new Set([...stepMatches.values()].map(m => m.action));
    const extraActions   = actions.filter(a => !matchedActions.has(a));

    const mappedSteps = [];

    for (const step of sequence.steps) {
      const match = stepMatches.get(step.index);

      if (!match) {
        mappedSteps.push({
          stepIndex:            step.index,
          referenceDescription: step.description,
          matchedAction:        null,
          verdict:              'unmatched',
          explanation:          'No matching action found in the log.',
          cardName:             null,
        });
        continue;
      }

      const { action, cardName } = match;

      // Build the card-name list for legal check (primary + other step cards)
      const cardNames = [
        cardName,
        ...step.cards.map(c => c.name).filter(n => n !== cardName),
      ].filter(Boolean);

      let verdict     = 'legal';
      let explanation = 'Legal check unavailable; action assumed legal.';

      try {
        const result = await LegalCheckService.check({
          cardNames,
          claim:       action,
          deckContext: { sequenceStep: step.description },
        });
        verdict     = result.verdict;
        explanation = result.explanation;
      } catch {
        // Non-fatal — keep the 'assumed legal' defaults above
      }

      mappedSteps.push({
        stepIndex:            step.index,
        referenceDescription: step.description,
        matchedAction:        action,
        verdict,
        explanation,
        cardName,
      });
    }

    const feedbackRecord = {
      sequenceId:  sequence.id,
      filename,
      timestamp:   new Date().toISOString(),
      mappedSteps,
    };

    this._saveFeedback(feedbackRecord);

    return { mappedSteps, extraActions, feedbackRecord };
  },

  // ── Feedback persistence ──────────────────────────────────────────────────

  _saveFeedback(record) {
    try {
      const raw      = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      existing.push(record);
      if (existing.length > MAX_FEEDBACK_RECORDS) {
        existing.splice(0, existing.length - MAX_FEEDBACK_RECORDS);
      }
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // localStorage failure is non-fatal
    }
  },

  getFeedback() {
    try {
      const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};

export default LogSequenceMappingService;
