/**
 * DuelingBookLogStorageService
 *
 * Persists DuelingBook log submission records to localStorage.
 *
 * Submission record shape:
 *   {
 *     id:          string,   // crypto.randomUUID()
 *     rawText:     string,   // original pasted text
 *     actions:     Action[], // parsed action sequence (see DuelingBookLogService)
 *     submittedAt: string,   // ISO-8601 timestamp
 *   }
 */

const STORAGE_KEY = 'fdgg_duelingbook_logs';

const DuelingBookLogStorageService = {
  // ── Read ──────────────────────────────────────────────────────────────────

  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getById(id) {
    return this.getAll().find(r => r.id === id) ?? null;
  },

  // ── Write ─────────────────────────────────────────────────────────────────

  /**
   * Save a new submission record.  Returns the saved record (including the
   * generated id and submittedAt timestamp).
   *
   * @param {{ rawText: string, actions: object[] }} record
   * @returns {{ id: string, rawText: string, actions: object[], submittedAt: string }}
   */
  save({ rawText, actions }) {
    const record = {
      id:          crypto.randomUUID(),
      rawText,
      actions,
      submittedAt: new Date().toISOString(),
    };

    const all = this.getAll();
    all.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return record;
  },

  delete(id) {
    const updated = this.getAll().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },
};

export default DuelingBookLogStorageService;
