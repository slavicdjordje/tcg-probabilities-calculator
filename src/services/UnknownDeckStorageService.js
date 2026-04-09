/**
 * UnknownDeckStorageService
 *
 * Persists unknown-deck records to localStorage for frequency tracking.
 * A record is created silently whenever ArchetypeRecognitionService returns
 * no-match or unknown-hybrid.  If the same deck hash is seen again the
 * submittedAt timestamp is refreshed so frequency can be derived from the
 * full record list.
 *
 * Record shape:
 *   {
 *     id:              string,   // crypto.randomUUID()
 *     deckHash:        string,   // deterministic 8-char hex hash of card counts
 *     archetypeScores: Array<{ id, name, confidence }>,  // top-5 from scoreAll()
 *     cardCount:       number,   // total main-deck cards
 *     submittedAt:     string,   // ISO-8601
 *   }
 */

const STORAGE_KEY = 'fdgg_unknown_decks';

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * djb2-style string hash → unsigned 32-bit integer rendered as 8-char hex.
 *
 * @param {string} str
 * @returns {string}
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // coerce to unsigned 32-bit
  }
  return hash.toString(16).padStart(8, '0');
}

// ── Public service ────────────────────────────────────────────────────────────

const UnknownDeckStorageService = {
  /**
   * Produce a stable, deterministic hash of a card-count map.
   * Cards are sorted by name before hashing so insertion order doesn't matter.
   *
   * @param {object} ydkCardCounts - { cardName: count }
   * @returns {string} 8-char hex string
   */
  hashDeck(ydkCardCounts) {
    const entries = Object.entries(ydkCardCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => `${name}:${count}`)
      .join(',');
    return djb2Hash(entries);
  },

  // ── Read ──────────────────────────────────────────────────────────────────

  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getByHash(deckHash) {
    return this.getAll().find(r => r.deckHash === deckHash) ?? null;
  },

  // ── Write ─────────────────────────────────────────────────────────────────

  /**
   * Silently save (or update the timestamp of) an unknown-deck record.
   * If a record with the same deckHash already exists the submittedAt
   * timestamp is refreshed for frequency tracking.  Returns the saved record.
   *
   * @param {{ deckHash: string, archetypeScores: object[], cardCount: number }} data
   * @returns {object} saved record
   */
  save({ deckHash, archetypeScores, cardCount }) {
    const all = this.getAll();
    const existing = all.find(r => r.deckHash === deckHash);

    if (existing) {
      existing.submittedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return existing;
    }

    const record = {
      id:              crypto.randomUUID(),
      deckHash,
      archetypeScores,
      cardCount,
      submittedAt:     new Date().toISOString(),
    };
    all.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return record;
  },

  delete(id) {
    const updated = this.getAll().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },
};

export default UnknownDeckStorageService;
