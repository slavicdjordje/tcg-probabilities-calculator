/**
 * ComboSequenceStorageService
 *
 * Persists authored combo sequences to localStorage and merges them with the
 * static COMBO_SEQUENCE_DATABASE for use across the app.
 *
 * Authored sequences override static entries with the same id.
 *
 * Substitution delta shape:
 *   { removed: string[], added: string[] }
 *   - removed: cards present in the reference sequence but absent in this one
 *   - added:   cards present in this sequence but absent in the reference
 */

import { COMBO_SEQUENCE_DATABASE } from '../data/comboSequenceDatabase';

const STORAGE_KEY = 'fdgg_authored_sequences';

export default class ComboSequenceStorageService {
  // ── Read ──────────────────────────────────────────────────────────────────

  static getAuthored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Returns static + authored sequences; authored entries override static ones by id. */
  static getAll() {
    const authored = this.getAuthored();
    const authoredIds = new Set(authored.map(s => s.id));
    const staticOnly = COMBO_SEQUENCE_DATABASE.filter(s => !authoredIds.has(s.id));
    return [...staticOnly, ...authored];
  }

  static getByArchetype(archetypeId) {
    return this.getAll().filter(s => s.archetypeId === archetypeId);
  }

  static getById(id) {
    return this.getAll().find(s => s.id === id) ?? null;
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  static save(sequence) {
    const authored = this.getAuthored();
    const idx = authored.findIndex(s => s.id === sequence.id);
    if (idx >= 0) {
      authored[idx] = sequence;
    } else {
      authored.push(sequence);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authored));
  }

  static delete(id) {
    const authored = this.getAuthored().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authored));
  }

  // ── Delta ─────────────────────────────────────────────────────────────────

  /**
   * Computes the substitution delta between a reference sequence and a new one.
   * Returns the set of card names removed and added at the step-card level.
   */
  static computeDelta(referenceSequence, newSequence) {
    const cardsOf = seq =>
      new Set(seq.steps.flatMap(s => s.cards.map(c => c.name)));
    const refCards = cardsOf(referenceSequence);
    const newCards = cardsOf(newSequence);
    return {
      removed: [...refCards].filter(c => !newCards.has(c)),
      added:   [...newCards].filter(c => !refCards.has(c)),
    };
  }

  // ── Export ────────────────────────────────────────────────────────────────

  /** Serialises a sequence as a JavaScript object literal for pasting into the DB file. */
  static exportAsJS(sequence) {
    const { substitutionDelta, ...rest } = sequence;
    const lines = [
      `  {`,
      `    id: '${rest.id}',`,
      `    archetypeId: '${rest.archetypeId}',`,
      `    name: '${rest.name}',`,
      `    valid_from: '${rest.valid_from}',`,
      ``,
      `    steps: ${JSON.stringify(rest.steps, null, 6).replace(/^/gm, '    ').trimStart()},`,
      ``,
      `    endboard: ${JSON.stringify(rest.endboard, null, 6).replace(/^/gm, '    ').trimStart()},`,
      ``,
      `    chokePoints: ${JSON.stringify(rest.chokePoints, null, 6).replace(/^/gm, '    ').trimStart()},`,
      ``,
      `    weaknesses: ${JSON.stringify(rest.weaknesses, null, 6).replace(/^/gm, '    ').trimStart()},`,
      ...(substitutionDelta
        ? [``, `    substitutionDelta: ${JSON.stringify(substitutionDelta, null, 6).replace(/^/gm, '    ').trimStart()},`]
        : []),
      `  },`,
    ];
    return lines.join('\n');
  }
}
