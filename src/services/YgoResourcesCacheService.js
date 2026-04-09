/**
 * YgoResourcesCacheService
 *
 * Local cache for FAQ and Q&A entries from db.ygoresources.com.
 *
 * Strategy:
 *  - Prefetch: on startup (or when a new archetype is added) proactively fetch
 *    every card listed in ENGINE_DATABASE's identifierCards + comboTemplates.
 *  - Lazy: on cache miss for any arbitrary card ID, fetch and store for future use.
 *  - Revision tracking: every response carries an X-Cache-Revision header.
 *    On init, call checkManifest() to query /manifest/<lastRevision> and
 *    invalidate only the entries whose paths appear in the diff.
 */

import { ENGINE_DATABASE } from '../data/engineDatabase.js';

const BASE_URL = 'https://db.ygoresources.com';

/** localStorage keys */
const KEYS = {
  ENTRIES:       'ygoresources_entries',    // { [konamiId]: { data, revision } }
  NAME_INDEX:    'ygoresources_name_idx',   // { [cardName]: konamiId }
  NAME_INDEX_TS: 'ygoresources_name_idx_ts',
  LAST_REVISION: 'ygoresources_revision',  // last known X-Cache-Revision (integer)
};

/** How long to trust the cached name index before re-fetching (24 h). */
const NAME_INDEX_TTL = 24 * 60 * 60 * 1000;

// ── Storage helpers ──────────────────────────────────────────────────────────

function loadEntries() {
  try {
    const raw = localStorage.getItem(KEYS.ENTRIES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  } catch (e) {
    // Quota exceeded — evict half the entries (oldest first via key order) and retry.
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      const keys = Object.keys(entries);
      const half = keys.slice(0, Math.floor(keys.length / 2));
      half.forEach(k => delete entries[k]);
      try {
        localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
      } catch {
        // If it still fails, abandon — cached data is best-effort.
      }
    }
  }
}

function getLastRevision() {
  const v = localStorage.getItem(KEYS.LAST_REVISION);
  return v !== null ? parseInt(v, 10) : -1;
}

function setLastRevision(rev) {
  if (rev >= 0) localStorage.setItem(KEYS.LAST_REVISION, String(rev));
}

function revisionFromHeaders(headers) {
  const v = headers.get('X-Cache-Revision');
  return v !== null ? parseInt(v, 10) : -1;
}

// ── Name index ───────────────────────────────────────────────────────────────

async function fetchNameIndex() {
  const res = await fetch(`${BASE_URL}/data/idx/card/name/en`);
  if (!res.ok) throw new Error(`Name-index fetch failed: ${res.status}`);
  const raw = await res.json(); // { "Card Name": [konamiId, …], … }

  // Flatten: keep only the first (most-recent) ID per name.
  const index = {};
  for (const [name, ids] of Object.entries(raw)) {
    if (Array.isArray(ids) && ids.length > 0) index[name] = ids[0];
  }
  return index;
}

async function getNameIndex() {
  const ts  = parseInt(localStorage.getItem(KEYS.NAME_INDEX_TS) ?? '0', 10);
  const raw = localStorage.getItem(KEYS.NAME_INDEX);

  if (raw && Date.now() - ts < NAME_INDEX_TTL) {
    try { return JSON.parse(raw); } catch { /* fall through to re-fetch */ }
  }

  const index = await fetchNameIndex();
  try {
    localStorage.setItem(KEYS.NAME_INDEX, JSON.stringify(index));
    localStorage.setItem(KEYS.NAME_INDEX_TS, String(Date.now()));
  } catch { /* storage full — index lives only in memory this session */ }
  return index;
}

// ── Card fetch ───────────────────────────────────────────────────────────────

async function fetchCard(konamiId) {
  const res = await fetch(`${BASE_URL}/data/card/${konamiId}`);
  if (!res.ok) throw new Error(`Card fetch failed (id=${konamiId}): ${res.status}`);
  const data = await res.json();
  const revision = revisionFromHeaders(res.headers);
  return { data, revision };
}

// ── Public service object ────────────────────────────────────────────────────

const YgoResourcesCacheService = {
  /**
   * Collect every unique card name referenced across all ENGINE_DATABASE entries
   * (identifierCards + every card in every comboTemplate).
   *
   * @returns {string[]}
   */
  getArchetypeCardNames() {
    const names = new Set();
    for (const engine of ENGINE_DATABASE) {
      for (const name of engine.identifierCards) names.add(name);
      for (const tpl of engine.comboTemplates) {
        for (const card of tpl.cards) names.add(card.name);
      }
    }
    return [...names];
  },

  /**
   * Check /manifest/<lastRevision> and invalidate any cached entries whose
   * paths appear in the diff.  Should be called once on app startup.
   */
  async checkManifest() {
    const lastRevision = getLastRevision();
    if (lastRevision < 0) return; // no baseline yet — nothing to diff

    let res;
    try {
      res = await fetch(`${BASE_URL}/manifest/${lastRevision}`);
      if (!res.ok) return;
    } catch {
      return; // network error — keep existing cache
    }

    let changed;
    try {
      changed = await res.json();
    } catch {
      return;
    }

    // The manifest returns a JSON object whose keys are changed paths or IDs.
    // Observed formats:
    //   { "/data/card/12345": 1, "/data/qa/67890": 1, … }   (path-keyed)
    //   { "12345": 1, … }                                    (bare ID)
    const entries = loadEntries();
    let dirty = false;

    for (const key of Object.keys(changed)) {
      // Try path-style first: /data/card/<id>
      const pathMatch = key.match(/\/data\/card\/(\d+)/);
      const id = pathMatch ? parseInt(pathMatch[1], 10) : parseInt(key, 10);

      if (!isNaN(id) && entries[id]) {
        delete entries[id];
        dirty = true;
      }
    }

    if (dirty) saveEntries(entries);

    const newRev = revisionFromHeaders(res.headers);
    if (newRev > lastRevision) setLastRevision(newRev);
  },

  /**
   * Proactively fetch and cache FAQ/card data for every card in ENGINE_DATABASE.
   * Already-cached entries are skipped.  Fetches are serialised to avoid
   * rate-limiting the upstream API.
   *
   * Call this once after ENGINE_DATABASE is extended with a new archetype.
   */
  async prefetchArchetypeCards() {
    let nameIndex;
    try {
      nameIndex = await getNameIndex();
    } catch (e) {
      console.warn('YgoResources: could not load name index', e);
      return;
    }

    const entries = loadEntries();
    const missing = [];

    for (const name of this.getArchetypeCardNames()) {
      const konamiId = nameIndex[name];
      if (!konamiId) continue;          // card not in ygoresources index
      if (entries[konamiId]) continue;  // already cached
      missing.push({ name, konamiId });
    }

    if (missing.length === 0) return;

    let latestRevision = getLastRevision();

    for (const { name, konamiId } of missing) {
      try {
        const { data, revision } = await fetchCard(konamiId);
        entries[konamiId] = { data, revision };
        if (revision > latestRevision) latestRevision = revision;
      } catch (e) {
        console.warn(`YgoResources: prefetch failed for "${name}" (id=${konamiId})`, e);
      }
    }

    saveEntries(entries);
    setLastRevision(latestRevision);
  },

  /**
   * Return cached FAQ/card data for a card by its Konami database ID.
   * On a cache miss the card is fetched lazily and stored before returning.
   *
   * @param {number} konamiId
   * @returns {Promise<object|null>}
   */
  async getCardDataById(konamiId) {
    const entries = loadEntries();

    if (entries[konamiId]) {
      return entries[konamiId].data; // cache hit — no network call
    }

    // Cache miss — fetch lazily.
    try {
      const { data, revision } = await fetchCard(konamiId);
      entries[konamiId] = { data, revision };
      saveEntries(entries);
      if (revision > getLastRevision()) setLastRevision(revision);
      return data;
    } catch (e) {
      console.warn(`YgoResources: lazy fetch failed for id=${konamiId}`, e);
      return null;
    }
  },

  /**
   * Return cached FAQ/card data for a card by its English name.
   * Resolves the name to a Konami ID via the name index, then delegates to
   * getCardDataById (cache-first, lazy fetch on miss).
   *
   * @param {string} cardName
   * @returns {Promise<object|null>}
   */
  async getCardDataByName(cardName) {
    let nameIndex;
    try {
      nameIndex = await getNameIndex();
    } catch {
      return null;
    }

    const konamiId = nameIndex[cardName];
    if (!konamiId) return null; // card not in ygoresources

    return this.getCardDataById(konamiId);
  },

  /**
   * Synchronous cache-only lookup by English card name.
   * Returns the cached card data if it is already stored locally, or null if
   * the entry is absent (no network call is made).
   *
   * Used by FunctionalRoleInferenceService to enrich candidate cards with FAQ
   * data that was prefetched or previously lazily fetched, without adding
   * additional network round-trips during bulk evaluation.
   *
   * @param {string} cardName
   * @returns {object|null}
   */
  _getCachedByName(cardName) {
    let nameIndex;
    try {
      const raw = localStorage.getItem(KEYS.NAME_INDEX);
      nameIndex = raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }

    if (!nameIndex) return null;

    const konamiId = nameIndex[cardName];
    if (!konamiId) return null;

    const entries = loadEntries();
    return entries[konamiId]?.data ?? null;
  },
};

export default YgoResourcesCacheService;
