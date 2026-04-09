/**
 * AIComboGenerationService
 *
 * AI-powered combo generation for uploaded decks.
 *
 * When a deck does not match any known engine in the local ENGINE_DATABASE,
 * this service calls the Anthropic API and asks Claude to:
 *   1. Identify the deck archetype from the card list.
 *   2. Determine the key combo starter cards and 2-card combinations.
 *   3. Return structured combo data and brief combo sequences.
 *
 * The returned `appCombos` array is directly compatible with the app's
 * combo state shape so they can be passed straight to ProbabilityService.
 *
 * Output shape:
 * {
 *   deckType:  string,
 *   confidence: 'high' | 'medium' | 'low',
 *   appCombos: Array<{
 *     id:    string,
 *     name:  string,
 *     cards: Array<{
 *       starterCard:     string,
 *       cardId:          null,
 *       isCustom:        false,
 *       startersInDeck:  number,
 *       minCopiesInHand: number,
 *       maxCopiesInHand: number,
 *       logicOperator:   'AND',
 *     }>,
 *   }>,
 *   sequences: Array<{
 *     name:     string,
 *     steps:    string[],
 *     endboard: string[],
 *   }>,
 * }
 *
 * Environment
 * -----------
 *   VITE_ANTHROPIC_API_KEY  – required when running in the browser / Vite context.
 *   ANTHROPIC_API_KEY       – used when running in Node / Vercel Edge Functions.
 */

import { popularDecksSummary } from '../data/popularDecksDatabase.js';

const AI_PROXY_URL = '/api/ai';
const MODEL        = 'claude-haiku-4-5-20251001';
const MAX_TOKENS   = 2048;

// ── HTTP helper ───────────────────────────────────────────────────────────────

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

// ── Prompt builder ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are a Yu-Gi-Oh! card game expert specializing in deck analysis and probability calculation.

Your task: analyze a deck list and identify the key combo starter cards and multi-card combination lines.

Output ONLY a valid JSON object — no markdown fences, no extra text, just the raw JSON:
{
  "deckType": "<main archetype or strategy name>",
  "confidence": "high" | "medium" | "low",
  "combos": [
    {
      "name": "<descriptive combo name, e.g. 'Mo Ye 1-card' or 'Mo Ye + Adhara'>",
      "cards": [
        { "name": "<exact card name as it appears in the deck list>", "minInHand": 1 }
      ]
    }
  ],
  "sequences": [
    {
      "name": "<sequence name>",
      "steps": [
        "<plain-English action step 1>",
        "<plain-English action step 2>"
      ],
      "endboard": ["<card name on field>", "<card name on field>"]
    }
  ]
}

Rules:
- "combos" feed directly into a Monte Carlo probability calculator: each combo is a set of cards that ALL need to be drawn together in the opening hand to initiate that line.
- List 3 to 8 combos. Cover the primary 1-card starters first, then the key 2-card combinations.
- minInHand should be 1 in almost all cases (unless the card is needed in multiples).
- Use EXACT card names as they appear in the provided deck list.
- Omit hand traps (Ash Blossom, Effect Veiler, Nibiru, etc.) from combos — they are not combo starters.
- "sequences" are optional step-by-step play patterns. Include 1 to 2 of the most important lines.
- If you cannot confidently identify the deck type, set confidence to "low" and do your best.`;

/**
 * Build the user message from deck card counts and card database.
 *
 * @param {object} deckCardCounts  – { cardName: count }
 * @param {Array}  cardDatabase    – full card array (may be empty)
 * @returns {string}
 */
function buildUserContent(deckCardCounts, cardDatabase) {
  // Build a name → desc map for effect text lookups
  const descMap = new Map();
  if (Array.isArray(cardDatabase)) {
    for (const card of cardDatabase) {
      if (card?.name && card?.desc) descMap.set(card.name, card.desc);
    }
  }

  // Sort cards: highest count first, then alphabetically
  const entries = Object.entries(deckCardCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // Build card list with optional truncated effect text for 3-of cards
  const cardLines = entries.map(([name, count]) => {
    const desc = descMap.get(name) ?? '';
    const snippet = desc.length > 0 ? ` — ${desc.slice(0, 120).replace(/\n/g, ' ')}…` : '';
    return `${name} ×${count}${count >= 3 ? snippet : ''}`;
  });

  const popularRef = popularDecksSummary();

  return `\
DECK CARD LIST (${entries.length} unique cards):
${cardLines.join('\n')}

POPULAR META DECK REFERENCE (for archetype recognition):
${popularRef}

Analyze the deck and return the JSON combo analysis.`;
}

// ── Response parser ───────────────────────────────────────────────────────────

/**
 * Parse Claude's JSON response. Strips accidental markdown fences.
 *
 * @param {string} raw
 * @returns {{ deckType: string, confidence: string, combos: Array, sequences: Array }}
 */
function parseResponse(raw) {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned invalid JSON — cannot parse combo data.');
  }

  if (!Array.isArray(parsed.combos)) {
    throw new Error('AI response missing "combos" array.');
  }

  return {
    deckType:   parsed.deckType   ?? 'Unknown',
    confidence: parsed.confidence ?? 'low',
    combos:     parsed.combos     ?? [],
    sequences:  Array.isArray(parsed.sequences) ? parsed.sequences : [],
  };
}

// ── App combo converter ───────────────────────────────────────────────────────

/**
 * Convert AI-returned combo objects to the app's combo state format.
 * Cards not present in the deck are silently dropped.
 *
 * @param {Array}  aiCombos        – from parseResponse
 * @param {object} deckCardCounts  – { cardName: count }
 * @param {Array}  ydkCards        – [{ name, id }]
 * @returns {Array} app-state combo objects
 */
function convertToAppCombos(aiCombos, deckCardCounts, ydkCards) {
  const cardIdMap = {};
  if (Array.isArray(ydkCards)) {
    for (const card of ydkCards) {
      if (card?.name) cardIdMap[card.name] = card.id ?? null;
    }
  }

  const appCombos = [];

  for (const aiCombo of aiCombos) {
    if (!aiCombo?.name || !Array.isArray(aiCombo.cards)) continue;

    // Only include cards actually present in the uploaded deck
    const presentCards = aiCombo.cards.filter(c => c?.name && deckCardCounts[c.name] !== undefined);
    if (presentCards.length === 0) continue;

    appCombos.push({
      id:   crypto.randomUUID(),
      name: aiCombo.name,
      cards: presentCards.map(card => {
        const count = deckCardCounts[card.name];
        return {
          starterCard:     card.name,
          cardId:          cardIdMap[card.name] ?? null,
          isCustom:        false,
          startersInDeck:  count,
          minCopiesInHand: card.minInHand ?? 1,
          maxCopiesInHand: count,
          logicOperator:   'AND',
        };
      }),
    });
  }

  return appCombos;
}

// ── Public service ────────────────────────────────────────────────────────────

const AIComboGenerationService = {
  /**
   * Generate combo data for an uploaded deck via the Anthropic API.
   *
   * @param {object} options
   * @param {object} options.deckCardCounts  – { cardName: count }
   * @param {Array}  options.cardDatabase    – full card array with effect text
   * @param {Array}  options.ydkCards        – [{ name, id }] for ID resolution
   *
   * @returns {Promise<{
   *   deckType:   string,
   *   confidence: string,
   *   appCombos:  Array,
   *   sequences:  Array,
   * }>}
   */
  async generateCombos({ deckCardCounts, cardDatabase = [], ydkCards = [] }) {
    if (!deckCardCounts || Object.keys(deckCardCounts).length === 0) {
      throw new Error('No deck card data provided.');
    }

    const userContent = buildUserContent(deckCardCounts, cardDatabase);
    const raw         = await callAnthropic(SYSTEM_PROMPT, userContent);
    const parsed      = parseResponse(raw);

    return {
      deckType:   parsed.deckType,
      confidence: parsed.confidence,
      appCombos:  convertToAppCombos(parsed.combos, deckCardCounts, ydkCards),
      sequences:  parsed.sequences,
    };
  },
};

export default AIComboGenerationService;
