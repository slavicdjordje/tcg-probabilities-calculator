import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LegalCheckService from './LegalCheckService.js';
import YgoResourcesCacheService from './YgoResourcesCacheService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AI_PROXY_URL = '/api/ai';

/**
 * Build a minimal successful proxy response for a given verdict JSON.
 */
function anthropicResponse(verdictJson) {
  return {
    ok:      true,
    status:  200,
    text:    () => Promise.resolve(''),
    json:    () => Promise.resolve({
      content: [{ text: verdictJson }],
    }),
  };
}

function verdictJson(verdict, extra = {}) {
  return JSON.stringify({ verdict, explanation: 'Test explanation.', ...extra });
}

const MOCK_CARD_DATA = {
  cardId: 14558127,
  faqData: {
    entries: {
      1: { en: 'This card cannot be chained to a Normal Summon.' },
    },
  },
  qaIndex: [
    {
      question: { en: 'Can this card negate a Normal Summon?' },
      answer:   { en: 'No. Normal Summons are not effects and cannot be negated.' },
    },
  ],
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./YgoResourcesCacheService.js', () => ({
  default: {
    getCardDataByName: vi.fn(),
  },
}));

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default: card data resolves successfully.
  YgoResourcesCacheService.getCardDataByName.mockResolvedValue(MOCK_CARD_DATA);

  // Default: proxy returns a "legal" verdict.
  global.fetch = vi.fn().mockResolvedValue(
    anthropicResponse(verdictJson('legal'))
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helper to grab the parsed body of the proxy fetch call ───────────────────
function getAnthropicCallBody() {
  const call = global.fetch.mock.calls.find(([url]) => url === AI_PROXY_URL);
  if (!call) return null;
  return JSON.parse(call[1].body);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LegalCheckService', () => {

  // ── Input validation ───────────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws when cardNames is empty', async () => {
      await expect(
        LegalCheckService.check({ cardNames: [], claim: 'Some action.' })
      ).rejects.toThrow('cardNames must be a non-empty array');
    });

    it('throws when cardNames is not an array', async () => {
      await expect(
        LegalCheckService.check({ cardNames: 'Ash Blossom', claim: 'Some action.' })
      ).rejects.toThrow('cardNames must be a non-empty array');
    });

    it('throws when claim is an empty string', async () => {
      await expect(
        LegalCheckService.check({ cardNames: ['Ash Blossom & Joyous Spring'], claim: '   ' })
      ).rejects.toThrow('claim must be a non-empty string');
    });

    it('throws when claim is missing', async () => {
      await expect(
        LegalCheckService.check({ cardNames: ['Ash Blossom & Joyous Spring'], claim: undefined })
      ).rejects.toThrow('claim must be a non-empty string');
    });

  });

  // ── Ruling data fetching ───────────────────────────────────────────────────

  describe('ruling data fetching', () => {
    it('fetches card data for each card in cardNames', async () => {
      await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring', 'Nibiru, the Primal Being'],
        claim:     "I activate Ash Blossom during the opponent's Normal Summon.",
      });

      expect(YgoResourcesCacheService.getCardDataByName).toHaveBeenCalledTimes(2);
      expect(YgoResourcesCacheService.getCardDataByName).toHaveBeenCalledWith(
        'Ash Blossom & Joyous Spring'
      );
      expect(YgoResourcesCacheService.getCardDataByName).toHaveBeenCalledWith(
        'Nibiru, the Primal Being'
      );
    });

    it('includes a fallback message when card data is null', async () => {
      YgoResourcesCacheService.getCardDataByName.mockResolvedValue(null);

      await LegalCheckService.check({
        cardNames: ['Unknown Card'],
        claim:     'I activate an unknown card.',
      });

      const body = getAnthropicCallBody();
      const userMsg = body.messages[0].content;
      expect(userMsg).toContain('no ruling data available');
    });

    it('fetches only the cards involved, not extra cards', async () => {
      await LegalCheckService.check({
        cardNames: ['Card A'],
        claim:     'I do a thing.',
      });

      // Only 1 call to getCardDataByName — exactly the cards in cardNames.
      expect(YgoResourcesCacheService.getCardDataByName).toHaveBeenCalledTimes(1);
    });
  });

  // ── Prompt content ─────────────────────────────────────────────────────────

  describe('prompt building', () => {
    it("includes the player's claim in the user message", async () => {
      const claim = 'I use Nibiru after the fifth summon.';
      await LegalCheckService.check({ cardNames: ['Nibiru, the Primal Being'], claim });

      const body = getAnthropicCallBody();
      expect(body.messages[0].content).toContain(claim);
    });

    it('includes deckContext key-value pairs in the user message', async () => {
      await LegalCheckService.check({
        cardNames:   ['Ash Blossom & Joyous Spring'],
        claim:       'Activate in response.',
        deckContext: { turn: 2, phase: 'Battle Phase' },
      });

      const body = getAnthropicCallBody();
      const userMsg = body.messages[0].content;
      expect(userMsg).toContain('turn: 2');
      expect(userMsg).toContain('phase: Battle Phase');
    });

    it('includes FAQ entries extracted from card data', async () => {
      await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring'],
        claim:     'Activate to negate.',
      });

      const body = getAnthropicCallBody();
      expect(body.messages[0].content).toContain(
        'This card cannot be chained to a Normal Summon.'
      );
    });

    it('includes Q&A pairs extracted from card data', async () => {
      await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring'],
        claim:     'Negate the Normal Summon.',
      });

      const body = getAnthropicCallBody();
      const userMsg = body.messages[0].content;
      expect(userMsg).toContain('Can this card negate a Normal Summon?');
      expect(userMsg).toContain('Normal Summons are not effects and cannot be negated.');
    });

  });

  // ── Verdict parsing ────────────────────────────────────────────────────────

  describe('verdict: legal', () => {
    it('returns verdict "legal" with explanation and no extra fields', async () => {
      global.fetch.mockResolvedValue(anthropicResponse(verdictJson('legal')));

      const result = await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring'],
        claim:     'I chain Ash Blossom to a monster effect that adds to hand.',
      });

      expect(result.verdict).toBe('legal');
      expect(result.explanation).toBe('Test explanation.');
      expect(result.violatedRuling).toBeUndefined();
      expect(result.clarifyingQuestion).toBeUndefined();
    });
  });

  describe('verdict: illegal', () => {
    it('returns verdict "illegal" with explanation and violatedRuling', async () => {
      global.fetch.mockResolvedValue(anthropicResponse(verdictJson('illegal', {
        explanation:    'You cannot negate a Normal Summon with this card.',
        violatedRuling: 'This card cannot be chained to a Normal Summon.',
      })));

      const result = await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring'],
        claim:     'I activate Ash Blossom to negate the Normal Summon.',
      });

      expect(result.verdict).toBe('illegal');
      expect(result.violatedRuling).toBe('This card cannot be chained to a Normal Summon.');
      expect(result.clarifyingQuestion).toBeUndefined();
    });

    it('omits violatedRuling when the field is missing from AI response', async () => {
      global.fetch.mockResolvedValue(
        anthropicResponse(verdictJson('illegal')) // no violatedRuling
      );

      const result = await LegalCheckService.check({
        cardNames: ['Some Card'],
        claim:     'Illegal action.',
      });

      expect(result.verdict).toBe('illegal');
      expect(result.violatedRuling).toBeUndefined();
    });
  });

  describe('verdict: ambiguous', () => {
    it('returns verdict "ambiguous" with clarifyingQuestion and no violatedRuling', async () => {
      global.fetch.mockResolvedValue(anthropicResponse(verdictJson('ambiguous', {
        clarifyingQuestion: 'Are you activating this in the Damage Step?',
      })));

      const result = await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring'],
        claim:     'I activate it now.',
      });

      expect(result.verdict).toBe('ambiguous');
      expect(result.clarifyingQuestion).toBe('Are you activating this in the Damage Step?');
      expect(result.violatedRuling).toBeUndefined();
    });
  });

  // ── Malformed AI responses ─────────────────────────────────────────────────

  describe('malformed AI responses', () => {
    it('falls back to "ambiguous" when AI returns invalid JSON', async () => {
      global.fetch.mockResolvedValue(anthropicResponse('not json at all'));

      const result = await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring'],
        claim:     'Activate.',
      });

      expect(result.verdict).toBe('ambiguous');
      expect(result.clarifyingQuestion).toBeDefined();
    });

    it('falls back to "ambiguous" when verdict is not a recognised value', async () => {
      global.fetch.mockResolvedValue(
        anthropicResponse(JSON.stringify({ verdict: 'maybe', explanation: 'Hmm.' }))
      );

      const result = await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring'],
        claim:     'Activate.',
      });

      expect(result.verdict).toBe('ambiguous');
    });

    it('falls back to "ambiguous" when the content array is empty', async () => {
      global.fetch.mockResolvedValue({
        ok:   true,
        status: 200,
        json: () => Promise.resolve({ content: [] }),
      });

      const result = await LegalCheckService.check({
        cardNames: ['Ash Blossom & Joyous Spring'],
        claim:     'Activate.',
      });

      expect(result.verdict).toBe('ambiguous');
    });
  });

  // ── API error handling ─────────────────────────────────────────────────────

  describe('API error handling', () => {
    it('propagates non-2xx responses from the AI proxy', async () => {
      global.fetch.mockResolvedValue({
        ok:     false,
        status: 429,
        text:   () => Promise.resolve('rate limited'),
      });

      await expect(
        LegalCheckService.check({
          cardNames: ['Ash Blossom & Joyous Spring'],
          claim:     'Activate.',
        })
      ).rejects.toThrow('429');
    });

    it('propagates network errors', async () => {
      global.fetch.mockRejectedValue(new Error('network failure'));

      await expect(
        LegalCheckService.check({
          cardNames: ['Ash Blossom & Joyous Spring'],
          claim:     'Activate.',
        })
      ).rejects.toThrow('network failure');
    });
  });

});
