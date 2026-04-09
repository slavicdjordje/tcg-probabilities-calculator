/**
 * FunctionalRoleInferenceService
 *
 * AI inference layer that determines which cards in an uploaded deck satisfy
 * each combo-step functional requirement.
 *
 * For each step that requires a card from the opening hand, every card in the
 * uploaded deck is evaluated against:
 *   - The step's functional tags (e.g. 'normal-summon', 'search')
 *   - The reference card's role, fromZone, and effect text
 *   - Cached FAQ / ruling data from YgoResourcesCacheService
 *
 * Cards that satisfy the requirement are collected into a "piece group" for
 * that step; cards that do not are logged with a reason.
 *
 * Output shape (InferenceResult):
 * {
 *   sequenceId:   string,
 *   sequenceName: string,
 *   groups: Array<{
 *     stepIndex:     number,
 *     description:   string,
 *     tags:          string[],
 *     referenceCard: StepCard,      // reference hand activator from the sequence
 *     qualified:     Array<{ name: string, count: number, reason: string }>,
 *     rejected:      Array<{ name: string, reason: string }>,
 *   }>
 * }
 *
 * Piece groups only exist for steps that have at least one card with
 * fromZone === 'hand'.  Steps that operate entirely on-field / from-deck
 * are omitted because they don't affect the opening-hand probability.
 *
 * Environment
 * -----------
 *   VITE_ANTHROPIC_API_KEY  – required when running in the browser / Vite context.
 *   ANTHROPIC_API_KEY       – used when running in Node / Vercel Edge Functions.
 */

import YgoResourcesCacheService from './YgoResourcesCacheService.js';

const AI_PROXY_URL = '/api/ai';
const MODEL        = 'claude-haiku-4-5-20251001'; // Haiku for cost-efficient bulk evaluation
const MAX_TOKENS   = 1024;

// ── HTTP call ─────────────────────────────────────────────────────────────────

/**
 * Call the AI proxy and return the first content block's text.
 * Throws on non-2xx responses.
 *
 * @param {string} system
 * @param {string} userContent
 * @returns {Promise<string>}
 */
async function callAnthropic(system, userContent) {
  const res = await fetch(AI_PROXY_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data?.content?.[0]?.text ?? '';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return the first card in a step that originates from the opening hand.
 * This is the card the player must draw to execute the step.
 *
 * @param {object} step
 * @returns {object|null}
 */
function findHandCard(step) {
  return step.cards.find(c => c.fromZone === 'hand') ?? null;
}

/**
 * Look up a card's effect text in the cardDatabase array.
 * Returns an empty string when not found.
 *
 * @param {string}   cardName
 * @param {Map}      cardMap  – pre-built Map<name, cardData>
 * @returns {string}
 */
function getCardDesc(cardName, cardMap) {
  const card = cardMap.get(cardName);
  return card?.desc ?? '';
}

/**
 * Truncate a string to a maximum character length, appending '…' when cut.
 *
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function trunc(text, max) {
  if (!text || text.length <= max) return text || '';
  return text.slice(0, max - 1) + '…';
}

/**
 * Extract a concise FAQ summary from ygoresources card data.
 * Returns an empty string when no useful entries are found.
 *
 * @param {object|null} cardData
 * @returns {string}
 */
function extractFaqSummary(cardData) {
  if (!cardData) return '';
  const lines = [];

  const faqEntries = cardData?.faqData?.entries;
  if (faqEntries && typeof faqEntries === 'object') {
    for (const entry of Object.values(faqEntries).slice(0, 3)) {
      if (entry?.en) lines.push(`• ${entry.en}`);
    }
  }

  const qaIndex = cardData?.qaIndex;
  if (Array.isArray(qaIndex)) {
    for (const qa of qaIndex.slice(0, 2)) {
      if (qa?.question?.en) lines.push(`Q: ${qa.question.en}`);
      if (qa?.answer?.en)   lines.push(`A: ${qa.answer.en}`);
    }
  }

  return lines.join('\n');
}

// ── Prompt construction ───────────────────────────────────────────────────────

/**
 * Build the system + user messages for evaluating deck cards against a step.
 *
 * @param {object}   step               – from the combo sequence
 * @param {object}   referenceCard      – StepCard with fromZone: 'hand'
 * @param {string}   referenceDesc      – effect text of the reference card
 * @param {string}   referenceFaq       – FAQ summary for the reference card
 * @param {Array}    candidates         – [{ name, desc, faq }]
 * @returns {{ system: string, userContent: string }}
 */
function buildEvalPrompt(step, referenceCard, referenceDesc, referenceFaq, candidates) {
  const system = `\
You are a Yu-Gi-Oh! combo analysis expert.
Given a combo step's requirements and a list of deck cards, determine which
deck cards can functionally replace the reference card at that step.

Respond ONLY with a JSON array (no markdown, no extra text):
[{"name":"<cardName>","qualifies":true|false,"reason":"<one concise sentence>"}]
Include exactly one entry per deck card listed.`;

  const tagsLine = step.tags.length > 0
    ? step.tags.join(', ')
    : '(none specified)';

  const refFaqSection = referenceFaq
    ? `\nFAQ:\n${trunc(referenceFaq, 400)}`
    : '';

  const candidateBlocks = candidates.map(({ name, desc, faq }) => {
    const faqSection = faq ? `\nFAQ:\n${trunc(faq, 200)}` : '';
    return `Card: ${name}\nEffect: ${trunc(desc, 250)}${faqSection}`;
  }).join('\n\n');

  const userContent = `\
COMBO STEP ${step.index}: ${step.description}
FUNCTIONAL TAGS: ${tagsLine}
REFERENCE CARD: ${referenceCard.name} (role: ${referenceCard.role}, from ${referenceCard.fromZone} to ${referenceCard.toZone})
REFERENCE EFFECT: ${trunc(referenceDesc, 350)}${refFaqSection}

EVALUATE THESE DECK CARDS:

${candidateBlocks}`;

  return { system, userContent };
}

// ── Response parsing ──────────────────────────────────────────────────────────

/**
 * Parse the AI's JSON response and map results back to candidate names.
 * Falls back gracefully on parse errors — unknown cards are marked rejected
 * with a generic reason.
 *
 * @param {string}   raw            – raw text from the AI
 * @param {string[]} candidateNames – ordered list of names sent to the AI
 * @returns {{ qualified: Array<{name,reason}>, rejected: Array<{name,reason}> }}
 */
function parseEvalResponse(raw, candidateNames) {
  let parsed;
  try {
    // Strip markdown code fences if the model accidentally wraps the response
    const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    parsed = JSON.parse(cleaned);
  } catch {
    // On parse failure, reject everything with a diagnostic reason
    return {
      qualified: [],
      rejected: candidateNames.map(name => ({ name, reason: 'AI response could not be parsed.' })),
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      qualified: [],
      rejected: candidateNames.map(name => ({ name, reason: 'AI returned unexpected response shape.' })),
    };
  }

  const resultMap = new Map();
  for (const entry of parsed) {
    if (entry?.name) resultMap.set(entry.name, entry);
  }

  const qualified = [];
  const rejected  = [];

  for (const name of candidateNames) {
    const entry = resultMap.get(name);
    if (!entry) {
      rejected.push({ name, reason: 'Not evaluated by AI.' });
      continue;
    }
    if (entry.qualifies) {
      qualified.push({ name, reason: entry.reason ?? 'Satisfies functional requirement.' });
    } else {
      rejected.push({ name, reason: entry.reason ?? 'Does not satisfy functional requirement.' });
    }
  }

  return { qualified, rejected };
}

// ── Public service ────────────────────────────────────────────────────────────

const FunctionalRoleInferenceService = {
  /**
   * Infer piece groups for every hand-card step in the given combo sequence.
   *
   * @param {object}   options
   * @param {object}   options.sequence        – combo sequence from COMBO_SEQUENCE_DATABASE
   * @param {object}   options.deckCardCounts  – { cardName: count } from uploaded YDK
   * @param {Array}    options.cardDatabase    – array of card objects from YGOPro API (has .desc)
   *
   * @returns {Promise<InferenceResult>}
   */
  async inferPieceGroups({ sequence, deckCardCounts, cardDatabase }) {
    // Build a name → cardData map for efficient effect-text lookups
    const cardMap = new Map();
    if (Array.isArray(cardDatabase)) {
      for (const card of cardDatabase) {
        if (card?.name) cardMap.set(card.name, card);
      }
    }

    // All unique card names present in the uploaded deck
    const deckCardNames = Object.keys(deckCardCounts);

    const groups = [];

    for (const step of sequence.steps) {
      const referenceCard = findHandCard(step);
      if (!referenceCard) continue; // step has no hand requirement — skip

      // ── Reference card data ───────────────────────────────────────────────
      const referenceDesc = getCardDesc(referenceCard.name, cardMap);
      let referenceFaq = '';
      try {
        const refData = await YgoResourcesCacheService.getCardDataByName(referenceCard.name);
        referenceFaq = extractFaqSummary(refData);
      } catch {
        // FAQ fetch failure is non-fatal
      }

      // ── Candidate deck cards ──────────────────────────────────────────────
      // All deck cards except the reference card itself (it always qualifies)
      const candidateNames = deckCardNames.filter(n => n !== referenceCard.name);

      // Enrich candidates with effect text and any already-cached FAQ
      const candidates = candidateNames.map(name => {
        const desc = getCardDesc(name, cardMap);
        const cachedData = YgoResourcesCacheService._getCachedByName?.(name) ?? null;
        const faq = extractFaqSummary(cachedData);
        return { name, desc, faq };
      });

      let qualified = [];
      let rejected  = [];

      // ── Reference card is always in the piece group if present in deck ────
      const refCount = deckCardCounts[referenceCard.name] ?? 0;
      if (refCount > 0) {
        qualified.push({
          name:   referenceCard.name,
          count:  refCount,
          reason: 'Reference card for this step.',
        });
      }

      // ── AI evaluation of candidate deck cards ─────────────────────────────
      if (candidates.length > 0) {
        try {
          const { system, userContent } = buildEvalPrompt(
            step, referenceCard, referenceDesc, referenceFaq, candidates
          );

          const raw = await callAnthropic(system, userContent);
          const { qualified: aiQualified, rejected: aiRejected } = parseEvalResponse(
            raw,
            candidateNames
          );

          for (const q of aiQualified) {
            qualified.push({
              name:   q.name,
              count:  deckCardCounts[q.name] ?? 0,
              reason: q.reason,
            });
          }
          rejected = aiRejected;
        } catch (e) {
          // On AI error, mark all candidates as rejected with the error reason
          console.warn('FunctionalRoleInferenceService: AI evaluation failed', e);
          rejected = candidates.map(c => ({
            name:   c.name,
            reason: 'AI evaluation unavailable.',
          }));
        }
      }

      groups.push({
        stepIndex:     step.index,
        description:   step.description,
        tags:          step.tags,
        referenceCard,
        qualified,
        rejected,
      });
    }

    return {
      sequenceId:   sequence.id,
      sequenceName: sequence.name,
      groups,
    };
  },
};

export default FunctionalRoleInferenceService;
