/**
 * ArchetypeRecognitionService
 *
 * Scores an uploaded deck against all known archetypes and resolves the best
 * match, including hybrid detection.
 *
 * ## How scoring works
 *
 *   confidence = Σ(weight of signature cards present in deck)
 *              / Σ(weight of all signature cards)
 *
 *   An archetype "matches" when confidence ≥ archetype.threshold.
 *
 * ## Hybrid resolution
 *
 *   1. Score every non-hybrid (root/leaf) archetype.
 *   2. Collect all that score ≥ their threshold  →  `matches`.
 *   3. If matches.length === 1  →  single archetype result.
 *   4. If matches.length ≥ 2   →  look for a hybrid node whose parents
 *      contain all matched IDs.
 *        • Found  →  hybrid result (parent combos are merged in).
 *        • Not found  →  unknown-hybrid result (callers route to unknown-deck flow).
 *   5. If matches.length === 0  →  no-match result.
 *
 * ## Result shape
 *
 *   Single:
 *     { type: 'single', archetype, confidence, combos }
 *
 *   Hybrid (known):
 *     { type: 'hybrid', archetype, parents: [{ archetype, confidence }], combos }
 *
 *   Unknown hybrid:
 *     { type: 'unknown-hybrid', parents: [{ archetype, confidence }] }
 *
 *   No match:
 *     { type: 'no-match' }
 */

import { ARCHETYPE_DATABASE } from '../data/archetypeDatabase.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Compute the confidence score for one archetype against the deck.
 *
 * @param {object} archetype  - node from ARCHETYPE_DATABASE
 * @param {object} ydkCardCounts - { cardName: count }
 * @returns {number} confidence in [0, 1]
 */
function scoreArchetype(archetype, ydkCardCounts) {
  const { signature } = archetype;
  if (!signature || signature.length === 0) return 0;

  const maxWeight = signature.reduce((sum, card) => sum + card.weight, 0);
  if (maxWeight === 0) return 0;

  const presentWeight = signature
    .filter(card => Object.prototype.hasOwnProperty.call(ydkCardCounts, card.name))
    .reduce((sum, card) => sum + card.weight, 0);

  return presentWeight / maxWeight;
}

/**
 * Returns true when the archetype is a hybrid node (has ≥2 parents).
 *
 * @param {object} archetype
 * @returns {boolean}
 */
function isHybrid(archetype) {
  return Array.isArray(archetype.parents) && archetype.parents.length >= 2;
}

/**
 * Merge comboTemplates from an archetype and its parent nodes, deduplicating
 * by template name.  The hybrid node's own templates take precedence.
 *
 * @param {object}   archetype
 * @param {object[]} parentArchetypes
 * @returns {object[]}
 */
function mergeComboTemplates(archetype, parentArchetypes) {
  const seen = new Set();
  const merged = [];

  for (const template of archetype.comboTemplates) {
    if (!seen.has(template.name)) {
      seen.add(template.name);
      merged.push(template);
    }
  }

  for (const parent of parentArchetypes) {
    for (const template of parent.comboTemplates) {
      if (!seen.has(template.name)) {
        seen.add(template.name);
        merged.push(template);
      }
    }
  }

  return merged;
}

/**
 * Build combo state objects from comboTemplates, filtering out cards absent
 * from the deck (partial match support).  Returns the same shape as
 * ComboRecognitionService.buildCombos so callers don't need two code paths.
 *
 * @param {object[]} comboTemplates
 * @param {object}   ydkCardCounts  - { cardName: count }
 * @param {object[]} ydkCards       - [{ name, id, isCustom }]
 * @returns {object[]}
 */
function buildCombos(comboTemplates, ydkCardCounts, ydkCards) {
  const cardIdMap = {};
  if (ydkCards) {
    ydkCards.forEach(card => { cardIdMap[card.name] = card.id; });
  }

  const combos = [];

  for (const template of comboTemplates) {
    const presentCards = template.cards.filter(
      card => Object.prototype.hasOwnProperty.call(ydkCardCounts, card.name)
    );

    if (presentCards.length === 0) continue;

    combos.push({
      id: crypto.randomUUID(),
      name: template.name,
      cards: presentCards.map(card => {
        const deckCount = ydkCardCounts[card.name];
        return {
          starterCard:      card.name,
          cardId:           cardIdMap[card.name] ?? null,
          isCustom:         false,
          startersInDeck:   deckCount,
          minCopiesInHand:  card.minInHand,
          maxCopiesInHand:  deckCount,
          logicOperator:    'AND',
        };
      }),
    });
  }

  return combos;
}

// ── Public service ────────────────────────────────────────────────────────────

const ArchetypeRecognitionService = {
  /**
   * Score the deck against every archetype and return the best match.
   *
   * @param {object}   ydkCardCounts      - { cardName: count } from parsed YDK
   * @param {object[]} [ydkCards]         - [{ name, id, isCustom }] from parsed YDK
   * @param {object[]} [extraArchetypes]  - Additional archetype nodes to include,
   *                                        e.g. community-promoted archetypes from
   *                                        PromotionService.getPromotedArchetypes().
   * @returns {object} result (see module-level JSDoc for shape)
   */
  recognize(ydkCardCounts, ydkCards = [], extraArchetypes = []) {
    if (!ydkCardCounts || Object.keys(ydkCardCounts).length === 0) {
      return { type: 'no-match' };
    }

    // Merge static database with any extra (e.g. community-promoted) archetypes.
    // Extra entries with a matching id take precedence over static ones.
    const extraIds     = new Set(extraArchetypes.map(a => a.id));
    const allArchetypes = [
      ...ARCHETYPE_DATABASE.filter(a => !extraIds.has(a.id)),
      ...extraArchetypes,
    ];

    // Score only non-hybrid archetypes (root/leaf nodes).
    const nonHybridArchetypes = allArchetypes.filter(a => !isHybrid(a));

    const matches = nonHybridArchetypes
      .map(archetype => ({ archetype, confidence: scoreArchetype(archetype, ydkCardCounts) }))
      .filter(({ archetype, confidence }) => confidence >= archetype.threshold);

    // ── No match ──────────────────────────────────────────────────────────────
    if (matches.length === 0) {
      return { type: 'no-match' };
    }

    // ── Single match ──────────────────────────────────────────────────────────
    if (matches.length === 1) {
      const { archetype, confidence } = matches[0];
      return {
        type:       'single',
        archetype,
        confidence,
        combos:     buildCombos(archetype.comboTemplates, ydkCardCounts, ydkCards),
      };
    }

    // ── Multiple matches — attempt hybrid resolution ───────────────────────
    const matchedIds = new Set(matches.map(m => m.archetype.id));

    const hybridNode = allArchetypes.find(
      arch =>
        isHybrid(arch) &&
        arch.parents.length === matchedIds.size &&
        arch.parents.every(parentId => matchedIds.has(parentId))
    );

    if (hybridNode) {
      const parentNodes = hybridNode.parents.map(
        id => allArchetypes.find(a => a.id === id)
      );
      const mergedTemplates = mergeComboTemplates(hybridNode, parentNodes);

      return {
        type:      'hybrid',
        archetype: hybridNode,
        parents:   matches,
        combos:    buildCombos(mergedTemplates, ydkCardCounts, ydkCards),
      };
    }

    // ── Unknown hybrid — caller routes to unknown-deck flow ──────────────────
    return {
      type:    'unknown-hybrid',
      parents: matches,
    };
  },

  /**
   * Return a confidence score per archetype for every known archetype,
   * sorted descending.  Useful for debugging and future threshold tuning.
   *
   * @param {object}   ydkCardCounts    - { cardName: count }
   * @param {object[]} [extraArchetypes] - Additional archetype nodes to include.
   * @returns {Array<{ id: string, name: string, confidence: number }>}
   */
  scoreAll(ydkCardCounts, extraArchetypes = []) {
    const extraIds      = new Set(extraArchetypes.map(a => a.id));
    const allArchetypes = [
      ...ARCHETYPE_DATABASE.filter(a => !extraIds.has(a.id)),
      ...extraArchetypes,
    ];

    return allArchetypes
      .map(archetype => ({
        id:         archetype.id,
        name:       archetype.name,
        confidence: scoreArchetype(archetype, ydkCardCounts),
      }))
      .sort((a, b) => b.confidence - a.confidence);
  },
};

export { buildCombos, scoreArchetype, isHybrid, mergeComboTemplates };
export default ArchetypeRecognitionService;
