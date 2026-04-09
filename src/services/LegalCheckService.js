/**
 * LegalCheckService
 *
 * Validates user-submitted actions and combo steps against official Yu-Gi-Oh!
 * rulings fetched from db.ygoresources.com, then passes the ruling data and
 * the user's claim to an AI referee (Claude) for a structured verdict.
 *
 * Verdicts
 * --------
 *  - "legal"      – action is valid; no interruption needed.
 *  - "ambiguous"  – ruling data is unclear; a clarifying question is returned.
 *  - "illegal"    – action violates a ruling; the violated ruling is returned.
 *
 * Usage
 * -----
 *   import LegalCheckService from './LegalCheckService.js';
 *
 *   const result = await LegalCheckService.check({
 *     cardNames:   ['Ash Blossom & Joyous Spring', 'Nibiru, the Primal Being'],
 *     claim:       'I activate Ash Blossom to negate the Normal Summon.',
 *     deckContext: { turn: 1, phase: 'Main Phase 1' },
 *   });
 *   // result → { verdict: 'illegal', explanation: '…', violatedRuling: '…' }
 *
 * Environment
 * -----------
 *   VITE_ANTHROPIC_API_KEY  – required when running in the browser / Vite context.
 *   ANTHROPIC_API_KEY       – used when running in Node / Vercel Edge Functions.
 */

import YgoResourcesCacheService from './YgoResourcesCacheService.js';

const AI_PROXY_URL = '/api/ai';
const MODEL        = 'claude-opus-4-6';
const MAX_TOKENS   = 512;

// ── Prompt construction ───────────────────────────────────────────────────────

/**
 * Compress raw ygoresources card data into a concise ruling summary suitable
 * for inclusion in a prompt.  We extract FAQ entries and Q&A pairs only.
 *
 * @param {string}      cardName
 * @param {object|null} cardData  – shape returned by YgoResourcesCacheService
 * @returns {string}
 */
function summariseRulings(cardName, cardData) {
  if (!cardData) return `${cardName}: no ruling data available.`;

  const lines = [`Rulings for "${cardName}":`];

  // FAQ entries
  const faqEntries = cardData?.faqData?.entries;
  if (faqEntries && typeof faqEntries === 'object') {
    for (const entry of Object.values(faqEntries)) {
      if (entry?.en) lines.push(`  • ${entry.en}`);
    }
  }

  // Q&A index
  const qaIndex = cardData?.qaIndex;
  if (Array.isArray(qaIndex)) {
    for (const qa of qaIndex) {
      if (qa?.question?.en) lines.push(`  Q: ${qa.question.en}`);
      if (qa?.answer?.en)   lines.push(`  A: ${qa.answer.en}`);
    }
  }

  if (lines.length === 1) lines.push('  (no specific FAQ entries found)');

  return lines.join('\n');
}

/**
 * Build the system + user messages sent to the AI referee.
 *
 * @param {string}   rulingSummary
 * @param {string}   claim
 * @param {object}   deckContext
 * @returns {{ system: string, userContent: string }}
 */
function buildPrompt(rulingSummary, claim, deckContext) {
  const system = `\
You are a strict Yu-Gi-Oh! rules referee.  You are given official FAQ and Q&A
rulings from the Konami database.  Your job is to evaluate whether a player's
claimed action is legal under those rulings.

Respond ONLY with a JSON object matching this schema (no markdown, no extra text):
{
  "verdict":            "legal" | "ambiguous" | "illegal",
  "explanation":        "<plain-English sentence(s)>",
  "violatedRuling":     "<quoted ruling text — only present when verdict is illegal>",
  "clarifyingQuestion": "<question for the player — only present when verdict is ambiguous>"
}`;

  const contextLines = deckContext && typeof deckContext === 'object'
    ? Object.entries(deckContext).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : '  (no additional context)';

  const userContent = `\
=== Official Rulings ===
${rulingSummary}

=== Game Context ===
${contextLines}

=== Player's Claimed Action ===
${claim}

Evaluate the claimed action against the rulings and respond with the JSON verdict.`;

  return { system, userContent };
}

// ── AI call ───────────────────────────────────────────────────────────────────

/**
 * Call the AI proxy and return the raw text of the first choice.
 * Throws on non-2xx responses.
 *
 * Extracted as a named function so tests can stub it via vi.spyOn.
 *
 * @param {string} system
 * @param {string} userContent
 * @returns {Promise<string>}
 */
export async function callAnthropicAPI(system, userContent) {
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

// ── Response parsing ──────────────────────────────────────────────────────────

/**
 * Parse and validate the AI referee's JSON response.
 * Falls back to an "ambiguous" verdict when parsing fails.
 *
 * @param {string} raw
 * @returns {{ verdict: string, explanation: string, violatedRuling?: string, clarifyingQuestion?: string }}
 */
function parseVerdict(raw) {
  const VALID_VERDICTS = new Set(['legal', 'ambiguous', 'illegal']);

  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return {
      verdict:            'ambiguous',
      explanation:        'The referee could not parse the ruling response.',
      clarifyingQuestion: 'Could you clarify your action in more detail?',
    };
  }

  if (!VALID_VERDICTS.has(parsed.verdict)) {
    return {
      verdict:            'ambiguous',
      explanation:        'The referee returned an unrecognised verdict.',
      clarifyingQuestion: 'Could you clarify your action in more detail?',
    };
  }

  const result = {
    verdict:     parsed.verdict,
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
  };

  if (parsed.verdict === 'illegal' && typeof parsed.violatedRuling === 'string') {
    result.violatedRuling = parsed.violatedRuling;
  }
  if (parsed.verdict === 'ambiguous' && typeof parsed.clarifyingQuestion === 'string') {
    result.clarifyingQuestion = parsed.clarifyingQuestion;
  }

  return result;
}

// ── Public service object ─────────────────────────────────────────────────────

const LegalCheckService = {
  /**
   * Check whether a player's claimed action is legal under official Yu-Gi-Oh!
   * rulings for the cards involved.
   *
   * @param {object}   options
   * @param {string[]} options.cardNames    - English card names involved in the action.
   * @param {string}   options.claim        - The player's described action / claim.
   * @param {object}  [options.deckContext] - Optional game-state metadata (turn, phase, etc.).
   *
   * @returns {Promise<{
   *   verdict:             'legal' | 'ambiguous' | 'illegal',
   *   explanation:         string,
   *   violatedRuling?:     string,
   *   clarifyingQuestion?: string,
   * }>}
   */
  async check({ cardNames, claim, deckContext = {} }) {
    if (!Array.isArray(cardNames) || cardNames.length === 0) {
      throw new Error('LegalCheckService.check: cardNames must be a non-empty array.');
    }
    if (typeof claim !== 'string' || claim.trim() === '') {
      throw new Error('LegalCheckService.check: claim must be a non-empty string.');
    }

    // 1. Fetch ruling data — only for the cards involved, not the full deck.
    const rulingParts = await Promise.all(
      cardNames.map(async (name) => {
        const data = await YgoResourcesCacheService.getCardDataByName(name);
        return summariseRulings(name, data);
      })
    );
    const rulingSummary = rulingParts.join('\n\n');

    // 2. Build prompt.
    const { system, userContent } = buildPrompt(rulingSummary, claim, deckContext);

    // 3. Call AI referee.
    const raw = await callAnthropicAPI(system, userContent);

    // 4. Parse and return structured verdict.
    return parseVerdict(raw);
  },
};

export default LegalCheckService;
