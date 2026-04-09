/**
 * FunctionalRoleInferenceService – unit tests
 *
 * We stub the Anthropic HTTP call so the tests run offline without an API key.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FunctionalRoleInferenceService from './FunctionalRoleInferenceService.js';

// Mock YgoResourcesCacheService to avoid real network calls
vi.mock('./YgoResourcesCacheService.js', () => ({
  default: {
    getCardDataByName: vi.fn().mockResolvedValue(null),
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIENDSMITH_SEQUENCE = {
  id: 'fiendsmith-engraver-1c',
  name: 'Fiendsmith Engraver (1-card)',
  steps: [
    {
      index: 0,
      description: 'Normal Summon Fiendsmith Engraver.',
      tags: ['normal-summon'],
      cards: [
        { name: 'Fiendsmith Engraver', role: 'activator', fromZone: 'hand', toZone: 'field' },
      ],
    },
    {
      index: 1,
      description: "Activate Fiendsmith Engraver's effect.",
      tags: ['activate-effect', 'send-to-gy'],
      cards: [
        { name: 'Fiendsmith Engraver', role: 'activator', fromZone: 'field', toZone: 'field' },
        { name: "Fiendsmith's Sanct",  role: 'cost',      fromZone: 'deck',  toZone: 'gy'    },
      ],
    },
  ],
};

const CARD_DATABASE = [
  { name: 'Fiendsmith Engraver',   desc: 'If this card is Normal or Special Summoned: send 1 "Fiendsmith" card from your Deck to the GY.' },
  { name: 'Ash Blossom',           desc: 'When a card or effect is activated that includes any of these effects: send to the GY.' },
  { name: "Fiendsmith's Tract",    desc: 'Add 1 "Fiendsmith" card from your Deck or GY to your hand.' },
  { name: 'Effect Veiler',         desc: 'Once per turn, during your opponent\'s Main Phase: send this card from your hand to the GY.' },
];

const DECK_CARD_COUNTS = {
  'Fiendsmith Engraver': 3,
  "Fiendsmith's Tract":  3,
  'Ash Blossom':         3,
  'Effect Veiler':       2,
};

// ── Stub setup ────────────────────────────────────────────────────────────────

function makeAiResponse(results) {
  const text = JSON.stringify(results);
  return {
    ok:   true,
    json: () => Promise.resolve({ content: [{ text }] }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FunctionalRoleInferenceService.inferPieceGroups', () => {
  it('produces a group only for hand-card steps', async () => {
    // The AI says Fiendsmith's Tract qualifies, others don't
    global.fetch.mockResolvedValueOnce(makeAiResponse([
      { name: "Fiendsmith's Tract", qualifies: true,  reason: "Tutors Fiendsmith cards just like Engraver." },
      { name: 'Ash Blossom',        qualifies: false, reason: "Hand trap, cannot normal summon to start the combo." },
      { name: 'Effect Veiler',       qualifies: false, reason: "Does not initiate the Fiendsmith play." },
    ]));

    const result = await FunctionalRoleInferenceService.inferPieceGroups({
      sequence:       FIENDSMITH_SEQUENCE,
      deckCardCounts: DECK_CARD_COUNTS,
      cardDatabase:   CARD_DATABASE,
    });

    // Only step 0 has a fromZone: 'hand' card (step 1 uses Engraver from 'field')
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].stepIndex).toBe(0);
  });

  it('always includes the reference card in qualified when it is in the deck', async () => {
    global.fetch.mockResolvedValueOnce(makeAiResponse([
      { name: "Fiendsmith's Tract", qualifies: false, reason: "Does not normal summon." },
      { name: 'Ash Blossom',        qualifies: false, reason: "Not a Fiendsmith card." },
      { name: 'Effect Veiler',       qualifies: false, reason: "Not a Fiendsmith card." },
    ]));

    const result = await FunctionalRoleInferenceService.inferPieceGroups({
      sequence:       FIENDSMITH_SEQUENCE,
      deckCardCounts: DECK_CARD_COUNTS,
      cardDatabase:   CARD_DATABASE,
    });

    const group = result.groups[0];
    const refEntry = group.qualified.find(c => c.name === 'Fiendsmith Engraver');
    expect(refEntry).toBeDefined();
    expect(refEntry.count).toBe(3);
  });

  it('includes AI-qualified substitutes in the qualified list with correct counts', async () => {
    global.fetch.mockResolvedValueOnce(makeAiResponse([
      { name: "Fiendsmith's Tract", qualifies: true,  reason: "Can also start the Fiendsmith engine." },
      { name: 'Ash Blossom',        qualifies: false, reason: "Hand trap only." },
      { name: 'Effect Veiler',       qualifies: false, reason: "Hand trap only." },
    ]));

    const result = await FunctionalRoleInferenceService.inferPieceGroups({
      sequence:       FIENDSMITH_SEQUENCE,
      deckCardCounts: DECK_CARD_COUNTS,
      cardDatabase:   CARD_DATABASE,
    });

    const group = result.groups[0];
    const tractEntry = group.qualified.find(c => c.name === "Fiendsmith's Tract");
    expect(tractEntry).toBeDefined();
    expect(tractEntry.count).toBe(3);
  });

  it('puts non-qualifying cards in the rejected list', async () => {
    global.fetch.mockResolvedValueOnce(makeAiResponse([
      { name: "Fiendsmith's Tract", qualifies: false, reason: "Different role." },
      { name: 'Ash Blossom',        qualifies: false, reason: "Hand trap." },
      { name: 'Effect Veiler',       qualifies: false, reason: "Hand trap." },
    ]));

    const result = await FunctionalRoleInferenceService.inferPieceGroups({
      sequence:       FIENDSMITH_SEQUENCE,
      deckCardCounts: DECK_CARD_COUNTS,
      cardDatabase:   CARD_DATABASE,
    });

    const group = result.groups[0];
    expect(group.rejected.map(c => c.name)).toContain('Ash Blossom');
    expect(group.rejected.map(c => c.name)).toContain('Effect Veiler');
  });

  it('returns the correct sequenceId and sequenceName', async () => {
    global.fetch.mockResolvedValueOnce(makeAiResponse([]));

    const result = await FunctionalRoleInferenceService.inferPieceGroups({
      sequence:       FIENDSMITH_SEQUENCE,
      deckCardCounts: DECK_CARD_COUNTS,
      cardDatabase:   CARD_DATABASE,
    });

    expect(result.sequenceId).toBe('fiendsmith-engraver-1c');
    expect(result.sequenceName).toBe('Fiendsmith Engraver (1-card)');
  });

  it('gracefully handles AI JSON parse errors', async () => {
    global.fetch.mockResolvedValueOnce({
      ok:   true,
      json: () => Promise.resolve({ content: [{ text: 'not valid json at all' }] }),
    });

    const result = await FunctionalRoleInferenceService.inferPieceGroups({
      sequence:       FIENDSMITH_SEQUENCE,
      deckCardCounts: DECK_CARD_COUNTS,
      cardDatabase:   CARD_DATABASE,
    });

    // Should not throw; rejected list should contain the candidates
    const group = result.groups[0];
    expect(group.qualified.length).toBeGreaterThanOrEqual(1); // reference card always qualifies
    expect(group.rejected.length).toBeGreaterThan(0);
  });

  it('returns empty groups array for a sequence with no hand cards', async () => {
    const noHandSequence = {
      id: 'no-hand',
      name: 'No hand cards',
      steps: [
        {
          index: 0,
          description: 'Activate from GY.',
          tags: ['activate-effect'],
          cards: [{ name: 'Some Card', role: 'activator', fromZone: 'gy', toZone: 'field' }],
        },
      ],
    };

    const result = await FunctionalRoleInferenceService.inferPieceGroups({
      sequence:       noHandSequence,
      deckCardCounts: DECK_CARD_COUNTS,
      cardDatabase:   CARD_DATABASE,
    });

    expect(result.groups).toHaveLength(0);
  });
});
