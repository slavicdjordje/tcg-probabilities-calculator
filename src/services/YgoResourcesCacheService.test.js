import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import YgoResourcesCacheService from './YgoResourcesCacheService.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeResponse(body, { revision = 42, ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: (k) => (k === 'X-Cache-Revision' ? String(revision) : null) },
    json: () => Promise.resolve(body),
  };
}

/** Minimal name index: a few archetype cards mapped to fake Konami IDs. */
const MOCK_NAME_INDEX = {
  'Fiendsmith Engraver': 10001,
  "Fiendsmith's Sanct":  10002,
  "Fiendsmith's Tract":  10003,
  'Lacrima the Crimson Tears': 10004,
  'Fabled Lurrie': 10005,
  'Snake-Eye Ash': 20001,
  'Snake-Eyes Poplar': 20002,
  'Diabellstar the Black Witch': 20003,
  'Original Sinful Spoils - Snake-Eye': 20004,
};

/** What /data/idx/card/name/en returns (arrays of IDs per name). */
const MOCK_RAW_INDEX = Object.fromEntries(
  Object.entries(MOCK_NAME_INDEX).map(([name, id]) => [name, [id]])
);

const MOCK_CARD_DATA = { cardId: 10001, faqData: { entries: {} }, qaIndex: [] };

// ── localStorage mock ─────────────────────────────────────────────────────────

let store = {};
const localStorageMock = {
  getItem:    vi.fn((k)      => store[k] ?? null),
  setItem:    vi.fn((k, v)   => { store[k] = String(v); }),
  removeItem: vi.fn((k)      => { delete store[k]; }),
  clear:      vi.fn(()       => { store = {}; }),
};

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
  global.fetch = vi.fn();
  Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('YgoResourcesCacheService', () => {

  describe('getArchetypeCardNames()', () => {
    it('returns a non-empty array of unique strings', () => {
      const names = YgoResourcesCacheService.getArchetypeCardNames();
      expect(names.length).toBeGreaterThan(0);
      expect(new Set(names).size).toBe(names.length); // no duplicates
      names.forEach(n => expect(typeof n).toBe('string'));
    });

    it('includes identifier cards and combo template cards', () => {
      const names = YgoResourcesCacheService.getArchetypeCardNames();
      expect(names).toContain('Fiendsmith Engraver');
      expect(names).toContain('Snake-Eye Ash');
    });
  });

  // ── getCardDataById ──────────────────────────────────────────────────────

  describe('getCardDataById()', () => {
    it('returns cached data without fetching on cache hit', async () => {
      store['ygoresources_entries'] = JSON.stringify({
        10001: { data: MOCK_CARD_DATA, revision: 5 },
      });

      const result = await YgoResourcesCacheService.getCardDataById(10001);

      expect(result).toEqual(MOCK_CARD_DATA);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches lazily on cache miss and stores the result', async () => {
      global.fetch.mockResolvedValueOnce(makeResponse(MOCK_CARD_DATA, { revision: 7 }));

      const result = await YgoResourcesCacheService.getCardDataById(10001);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://db.ygoresources.com/data/card/10001'
      );
      expect(result).toEqual(MOCK_CARD_DATA);

      // Entry should now be persisted
      const entries = JSON.parse(store['ygoresources_entries']);
      expect(entries[10001]).toMatchObject({ data: MOCK_CARD_DATA, revision: 7 });
    });

    it('updates the stored revision after a lazy fetch', async () => {
      global.fetch.mockResolvedValueOnce(makeResponse(MOCK_CARD_DATA, { revision: 99 }));

      await YgoResourcesCacheService.getCardDataById(10001);

      expect(store['ygoresources_revision']).toBe('99');
    });

    it('returns null when the fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('network error'));

      const result = await YgoResourcesCacheService.getCardDataById(10001);

      expect(result).toBeNull();
    });

    it('returns null for a 404 response', async () => {
      global.fetch.mockResolvedValueOnce(makeResponse({}, { ok: false, status: 404 }));

      const result = await YgoResourcesCacheService.getCardDataById(10001);

      expect(result).toBeNull();
    });
  });

  // ── getCardDataByName ────────────────────────────────────────────────────

  describe('getCardDataByName()', () => {
    beforeEach(() => {
      // Seed a warm name index so we don't have to mock that fetch in every test.
      store['ygoresources_name_idx']    = JSON.stringify(MOCK_NAME_INDEX);
      store['ygoresources_name_idx_ts'] = String(Date.now());
    });

    it('resolves the name to an ID and returns cached data', async () => {
      store['ygoresources_entries'] = JSON.stringify({
        10001: { data: MOCK_CARD_DATA, revision: 5 },
      });

      const result = await YgoResourcesCacheService.getCardDataByName('Fiendsmith Engraver');

      expect(result).toEqual(MOCK_CARD_DATA);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null for an unknown card name', async () => {
      const result = await YgoResourcesCacheService.getCardDataByName('Nonexistent Card');
      expect(result).toBeNull();
    });

    it('fetches lazily when the name is known but not cached', async () => {
      global.fetch.mockResolvedValueOnce(makeResponse(MOCK_CARD_DATA, { revision: 3 }));

      const result = await YgoResourcesCacheService.getCardDataByName('Fiendsmith Engraver');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://db.ygoresources.com/data/card/10001'
      );
      expect(result).toEqual(MOCK_CARD_DATA);
    });

    it('fetches the name index when it is stale', async () => {
      // Mark the index as expired
      store['ygoresources_name_idx_ts'] = String(Date.now() - 25 * 60 * 60 * 1000);

      global.fetch
        .mockResolvedValueOnce(makeResponse(MOCK_RAW_INDEX))       // name index re-fetch
        .mockResolvedValueOnce(makeResponse(MOCK_CARD_DATA, { revision: 2 })); // card

      const result = await YgoResourcesCacheService.getCardDataByName('Fiendsmith Engraver');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(MOCK_CARD_DATA);
    });
  });

  // ── prefetchArchetypeCards ───────────────────────────────────────────────

  describe('prefetchArchetypeCards()', () => {
    it('fetches all uncached archetype cards', async () => {
      // Seed name index
      store['ygoresources_name_idx']    = JSON.stringify(MOCK_NAME_INDEX);
      store['ygoresources_name_idx_ts'] = String(Date.now());

      // Return the same mock data for every card fetch
      global.fetch.mockResolvedValue(makeResponse(MOCK_CARD_DATA, { revision: 10 }));

      await YgoResourcesCacheService.prefetchArchetypeCards();

      // Should have fetched each card that appears in MOCK_NAME_INDEX
      const expectedFetches = Object.keys(MOCK_NAME_INDEX).length;
      expect(global.fetch).toHaveBeenCalledTimes(expectedFetches);

      const entries = JSON.parse(store['ygoresources_entries']);
      Object.values(MOCK_NAME_INDEX).forEach(id => {
        expect(entries[id]).toBeDefined();
      });
    });

    it('skips cards that are already cached', async () => {
      store['ygoresources_name_idx']    = JSON.stringify(MOCK_NAME_INDEX);
      store['ygoresources_name_idx_ts'] = String(Date.now());

      // Pre-populate one entry
      store['ygoresources_entries'] = JSON.stringify({
        10001: { data: MOCK_CARD_DATA, revision: 5 },
      });

      global.fetch.mockResolvedValue(makeResponse(MOCK_CARD_DATA, { revision: 10 }));

      await YgoResourcesCacheService.prefetchArchetypeCards();

      // 10001 was cached → should NOT be re-fetched
      const calls = global.fetch.mock.calls.map(([url]) => url);
      expect(calls).not.toContain('https://db.ygoresources.com/data/card/10001');
    });

    it('stores the highest revision seen', async () => {
      store['ygoresources_name_idx']    = JSON.stringify({ 'Fiendsmith Engraver': 10001 });
      store['ygoresources_name_idx_ts'] = String(Date.now());

      global.fetch.mockResolvedValueOnce(makeResponse(MOCK_CARD_DATA, { revision: 55 }));

      await YgoResourcesCacheService.prefetchArchetypeCards();

      expect(store['ygoresources_revision']).toBe('55');
    });

    it('continues past individual fetch failures', async () => {
      store['ygoresources_name_idx']    = JSON.stringify(MOCK_NAME_INDEX);
      store['ygoresources_name_idx_ts'] = String(Date.now());

      // First card throws, rest succeed
      global.fetch
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue(makeResponse(MOCK_CARD_DATA, { revision: 10 }));

      await expect(
        YgoResourcesCacheService.prefetchArchetypeCards()
      ).resolves.not.toThrow();

      // All but the first should be cached
      const entries = JSON.parse(store['ygoresources_entries']);
      const ids = Object.values(MOCK_NAME_INDEX);
      const cached = ids.filter(id => entries[id]);
      expect(cached.length).toBe(ids.length - 1);
    });

    it('does nothing when all cards are already cached', async () => {
      store['ygoresources_name_idx']    = JSON.stringify(MOCK_NAME_INDEX);
      store['ygoresources_name_idx_ts'] = String(Date.now());

      const allCached = Object.fromEntries(
        Object.values(MOCK_NAME_INDEX).map(id => [id, { data: MOCK_CARD_DATA, revision: 1 }])
      );
      store['ygoresources_entries'] = JSON.stringify(allCached);

      await YgoResourcesCacheService.prefetchArchetypeCards();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ── checkManifest ────────────────────────────────────────────────────────

  describe('checkManifest()', () => {
    it('does nothing when there is no stored revision', async () => {
      await YgoResourcesCacheService.checkManifest();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('invalidates entries whose paths appear in the manifest diff (path format)', async () => {
      store['ygoresources_revision'] = '10';
      store['ygoresources_entries']  = JSON.stringify({
        10001: { data: MOCK_CARD_DATA, revision: 5 },
        10002: { data: MOCK_CARD_DATA, revision: 5 },
      });

      // Only 10001 changed
      global.fetch.mockResolvedValueOnce(
        makeResponse({ '/data/card/10001': 1 }, { revision: 11 })
      );

      await YgoResourcesCacheService.checkManifest();

      const entries = JSON.parse(store['ygoresources_entries']);
      expect(entries[10001]).toBeUndefined(); // invalidated
      expect(entries[10002]).toBeDefined();   // untouched
    });

    it('invalidates entries for bare numeric ID manifest format', async () => {
      store['ygoresources_revision'] = '10';
      store['ygoresources_entries']  = JSON.stringify({
        10001: { data: MOCK_CARD_DATA, revision: 5 },
      });

      global.fetch.mockResolvedValueOnce(
        makeResponse({ '10001': 1 }, { revision: 11 })
      );

      await YgoResourcesCacheService.checkManifest();

      const entries = JSON.parse(store['ygoresources_entries']);
      expect(entries[10001]).toBeUndefined();
    });

    it('updates the stored revision after a successful manifest check', async () => {
      store['ygoresources_revision'] = '10';
      store['ygoresources_entries']  = JSON.stringify({});

      global.fetch.mockResolvedValueOnce(makeResponse({}, { revision: 20 }));

      await YgoResourcesCacheService.checkManifest();

      expect(store['ygoresources_revision']).toBe('20');
    });

    it('is resilient to network errors', async () => {
      store['ygoresources_revision'] = '10';
      global.fetch.mockRejectedValueOnce(new Error('offline'));

      await expect(YgoResourcesCacheService.checkManifest()).resolves.not.toThrow();
    });

    it('is resilient to non-OK manifest responses', async () => {
      store['ygoresources_revision'] = '10';
      global.fetch.mockResolvedValueOnce(makeResponse({}, { ok: false, status: 500 }));

      await expect(YgoResourcesCacheService.checkManifest()).resolves.not.toThrow();
    });
  });

  // ── _getCachedByName ─────────────────────────────────────────────────────

  describe('_getCachedByName()', () => {
    beforeEach(() => {
      store['ygoresources_name_idx']    = JSON.stringify(MOCK_NAME_INDEX);
      store['ygoresources_name_idx_ts'] = String(Date.now());
    });

    it('returns cached data for a known card without making a network call', () => {
      store['ygoresources_entries'] = JSON.stringify({
        10001: { data: MOCK_CARD_DATA, revision: 5 },
      });

      const result = YgoResourcesCacheService._getCachedByName('Fiendsmith Engraver');

      expect(result).toEqual(MOCK_CARD_DATA);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null when the card is not in the name index', () => {
      const result = YgoResourcesCacheService._getCachedByName('Nonexistent Card');
      expect(result).toBeNull();
    });

    it('returns null when the card is in the index but not yet cached', () => {
      // 10001 is in the name index but entries are empty
      store['ygoresources_entries'] = JSON.stringify({});

      const result = YgoResourcesCacheService._getCachedByName('Fiendsmith Engraver');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null when the name index is absent', () => {
      delete store['ygoresources_name_idx'];

      const result = YgoResourcesCacheService._getCachedByName('Fiendsmith Engraver');

      expect(result).toBeNull();
    });
  });

});
