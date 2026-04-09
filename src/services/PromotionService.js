/**
 * PromotionService
 *
 * Evaluates community feedback agreement counts and promotes validated patterns
 * into the knowledgebase when they cross a configurable threshold.
 *
 * ── Scenarios ─────────────────────────────────────────────────────────────────
 *
 *   1. Existing archetype + threshold met
 *        → Promoted as a new variant ComboSequence; stored in localStorage.
 *
 *   2. Unknown-hybrid + threshold met
 *        → New archetype node created (with correct parents) + a reference
 *          ComboSequence stored for it; both stored in localStorage.
 *
 *   3. Threshold not yet met
 *        → Contribution acknowledged; counters updated; nothing promoted.
 *
 * ── Storage keys ──────────────────────────────────────────────────────────────
 *   fdgg_promotions            – log of every promotion event
 *   fdgg_promoted_archetypes   – community-validated archetype nodes
 *   fdgg_promoted_sequences    – community-validated combo sequences
 *   fdgg_promotion_config      – { threshold: number }
 *
 * ── evaluate() return shape ───────────────────────────────────────────────────
 *   { outcome: 'not-stored' }
 *     submit() returned stored:false — nothing to evaluate.
 *
 *   { outcome: 'already-promoted', promotionRecord }
 *     This pattern was promoted in a previous call.
 *
 *   { outcome: 'threshold-not-met', agreementCount, threshold }
 *     Agreement count is below threshold; keep collecting.
 *
 *   { outcome: 'promoted', type: 'variant', sequence }
 *     Pattern promoted as a new ComboSequence variant of an existing archetype.
 *
 *   { outcome: 'promoted', type: 'new-archetype', archetype, sequence }
 *     Pattern promoted; a new hybrid archetype node and its reference sequence
 *     were added to the knowledgebase.
 *
 * ── Promotion record shape ────────────────────────────────────────────────────
 *   {
 *     id:                   string,   // crypto.randomUUID()
 *     sequencePattern:      string,
 *     archetypeId:          string|null,
 *     promotedAt:           string,   // ISO-8601
 *     type:                 'variant' | 'new-archetype',
 *     promotedSequenceId:   string,
 *     promotedArchetypeId:  string|null,  // new-archetype only
 *     agreementCount:       number,
 *   }
 *
 * ── Default config ────────────────────────────────────────────────────────────
 *   threshold: 5  (conservative — change with setConfig({ threshold: N }))
 */

const PROMOTIONS_KEY          = 'fdgg_promotions';
const PROMOTED_ARCHETYPES_KEY = 'fdgg_promoted_archetypes';
const PROMOTED_SEQUENCES_KEY  = 'fdgg_promoted_sequences';
const CONFIG_KEY              = 'fdgg_promotion_config';

const DEFAULT_CONFIG = { threshold: 5 };

// ── localStorage helpers ──────────────────────────────────────────────────────

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Non-fatal — storage quota exceeded or private browsing
  }
}

// ── Sequence builders ─────────────────────────────────────────────────────────

/**
 * Build a minimal ComboSequence from MappedStep objects.
 * Only matched steps (verdict !== 'unmatched') are included.
 *
 * @param {object[]} mappedSteps
 * @param {string}   archetypeId
 * @param {string}   sequenceId
 * @param {string}   name
 * @returns {object}
 */
function buildSequenceFromMappedSteps(mappedSteps, archetypeId, sequenceId, name) {
  const validDate = new Date().toISOString().split('T')[0];
  const steps = mappedSteps
    .filter(s => s.verdict !== 'unmatched' && s.matchedAction != null)
    .map((s, i) => ({
      index: i,
      description: s.matchedAction,
      tags: [],
      cards: s.cardName
        ? [{ name: s.cardName, role: 'activator', fromZone: 'hand', toZone: 'field' }]
        : [],
    }));

  return {
    id: sequenceId,
    archetypeId,
    name,
    valid_from: validDate,
    steps,
    endboard:   { field: [], gy: [], hand: [], notes: 'Community-validated sequence.' },
    chokePoints: [],
    weaknesses: { breakingCategories: [], namedCounters: [], notes: '' },
    communityValidated: true,
  };
}

/**
 * Build a minimal ComboSequence from raw action strings.
 *
 * @param {string[]} actionStrings
 * @param {string}   archetypeId
 * @param {string}   sequenceId
 * @param {string}   name
 * @returns {object}
 */
function buildSequenceFromActions(actionStrings, archetypeId, sequenceId, name) {
  const validDate = new Date().toISOString().split('T')[0];
  const steps = actionStrings.map((action, i) => ({
    index: i,
    description: action,
    tags: [],
    cards: [],
  }));

  return {
    id: sequenceId,
    archetypeId,
    name,
    valid_from: validDate,
    steps,
    endboard:   { field: [], gy: [], hand: [], notes: 'Community-validated sequence.' },
    chokePoints: [],
    weaknesses: { breakingCategories: [], namedCounters: [], notes: '' },
    communityValidated: true,
  };
}

/**
 * Build a new hybrid archetype node from two or more parent IDs.
 * The node has an empty signature — it will be populated as more data is
 * collected.  ArchetypeRecognitionService can match it once the caller
 * populates its signature, or by direct ID lookup.
 *
 * @param {string[]} parentIds   - IDs of the parent archetypes
 * @param {string}   archetypeId - pre-computed deterministic ID
 * @param {string}   name
 * @returns {object}
 */
function buildHybridArchetypeNode(parentIds, archetypeId, name) {
  return {
    id:              archetypeId,
    name,
    parents:         [...parentIds],
    threshold:       0.3,
    signature:       [],
    comboTemplates:  [],
    communityValidated: true,
  };
}

// ── ID generators ─────────────────────────────────────────────────────────────

/**
 * Deterministic archetype ID for a hybrid, derived from sorted parent IDs.
 * e.g. parents ['unchained', 'fiendsmith'] → 'community-hybrid-fiendsmith-unchained'
 *
 * @param {string[]} parentIds
 * @returns {string}
 */
function hybridArchetypeId(parentIds) {
  return `community-hybrid-${[...parentIds].sort().join('-')}`;
}

/**
 * Generate a unique sequence ID for a promoted variant.
 *
 * @param {string} archetypeId
 * @param {string} sequencePattern
 * @returns {string}
 */
function variantSequenceId(archetypeId, sequencePattern) {
  return `community-${archetypeId}-${sequencePattern.slice(0, 8)}`;
}

// ── Public service ────────────────────────────────────────────────────────────

const PromotionService = {
  // ── Config ────────────────────────────────────────────────────────────────

  /**
   * Return the current promotion config.
   * @returns {{ threshold: number }}
   */
  getConfig() {
    return { ...DEFAULT_CONFIG, ...readJSON(CONFIG_KEY, {}) };
  },

  /**
   * Persist updated config values (merged with defaults).
   *
   * @param {{ threshold?: number }} updates
   */
  setConfig(updates) {
    const current = this.getConfig();
    writeJSON(CONFIG_KEY, { ...current, ...updates });
  },

  // ── Read ──────────────────────────────────────────────────────────────────

  /** @returns {object[]} All promotion event records. */
  getPromotions() {
    return readJSON(PROMOTIONS_KEY, []);
  },

  /** @returns {object[]} Community-validated archetype nodes. */
  getPromotedArchetypes() {
    return readJSON(PROMOTED_ARCHETYPES_KEY, []);
  },

  /** @returns {object[]} Community-validated combo sequences. */
  getPromotedSequences() {
    return readJSON(PROMOTED_SEQUENCES_KEY, []);
  },

  /**
   * Return true if the given sequencePattern has already been promoted.
   *
   * @param {string} sequencePattern
   * @returns {boolean}
   */
  isAlreadyPromoted(sequencePattern) {
    return this.getPromotions().some(p => p.sequencePattern === sequencePattern);
  },

  /**
   * Find the existing promotion record for a sequencePattern, or null.
   *
   * @param {string} sequencePattern
   * @returns {object|null}
   */
  getPromotionRecord(sequencePattern) {
    return this.getPromotions().find(p => p.sequencePattern === sequencePattern) ?? null;
  },

  // ── Evaluate ──────────────────────────────────────────────────────────────

  /**
   * Evaluate whether a newly submitted feedback record tips the agreement count
   * past the promotion threshold, and promote it if so.
   *
   * Call this immediately after UserFeedbackStorageService.submit() returns.
   *
   * @param {object} options
   * @param {object}   options.submitResult
   *   The value returned by UserFeedbackStorageService.submit().
   * @param {object[]} [options.mappedSteps]
   *   MappedStep[] from LogSequenceMappingService — enriches the generated
   *   sequence with card-level data.  Optional: falls back to the raw
   *   validatedActionSequence strings stored in the submission record.
   * @returns {object} Evaluation outcome (see module-level JSDoc).
   */
  evaluate({ submitResult, mappedSteps = [] }) {
    if (!submitResult?.stored) {
      return { outcome: 'not-stored' };
    }

    const { record, agreementCount, isHybridCandidate, hybridParents } = submitResult;
    const { sequencePattern, archetypeId, archetypeName, validatedActionSequence, sequenceId } = record;

    // ── Already promoted? ────────────────────────────────────────────────────
    if (this.isAlreadyPromoted(sequencePattern)) {
      return { outcome: 'already-promoted', promotionRecord: this.getPromotionRecord(sequencePattern) };
    }

    const { threshold } = this.getConfig();

    // ── Threshold not met ────────────────────────────────────────────────────
    if (agreementCount < threshold) {
      return { outcome: 'threshold-not-met', agreementCount, threshold };
    }

    // ── Promote ──────────────────────────────────────────────────────────────
    const now = new Date().toISOString();

    if (isHybridCandidate && Array.isArray(hybridParents) && hybridParents.length >= 2) {
      return this._promoteHybrid({
        sequencePattern,
        hybridParents,
        mappedSteps,
        validatedActionSequence,
        agreementCount,
        now,
      });
    }

    return this._promoteVariant({
      sequencePattern,
      archetypeId,
      archetypeName,
      sequenceId,
      mappedSteps,
      validatedActionSequence,
      agreementCount,
      now,
    });
  },

  // ── Internal promotion helpers ────────────────────────────────────────────

  /**
   * Promote a pattern as a new variant sequence on an existing archetype.
   * @private
   */
  _promoteVariant({
    sequencePattern,
    archetypeId,
    archetypeName,
    sequenceId,
    mappedSteps,
    validatedActionSequence,
    agreementCount,
    now,
  }) {
    const targetArchetypeId = archetypeId ?? 'unknown';
    const newSequenceId     = variantSequenceId(targetArchetypeId, sequencePattern);
    const name              = `${archetypeName ?? targetArchetypeId} — Community Variant`;

    // Build the sequence from the richest available data source.
    const sequence =
      mappedSteps.length > 0
        ? buildSequenceFromMappedSteps(mappedSteps, targetArchetypeId, newSequenceId, name)
        : buildSequenceFromActions(validatedActionSequence ?? [], targetArchetypeId, newSequenceId, name);

    // If we have a reference sequence ID, tag it for lineage tracking.
    if (sequenceId) {
      sequence.referenceSequenceId = sequenceId;
    }

    // Persist promoted sequence.
    const sequences = readJSON(PROMOTED_SEQUENCES_KEY, []);
    const existingIdx = sequences.findIndex(s => s.id === newSequenceId);
    if (existingIdx >= 0) {
      sequences[existingIdx] = sequence;
    } else {
      sequences.push(sequence);
    }
    writeJSON(PROMOTED_SEQUENCES_KEY, sequences);

    // Record the promotion event.
    const promotionRecord = {
      id:                  crypto.randomUUID(),
      sequencePattern,
      archetypeId:         targetArchetypeId,
      promotedAt:          now,
      type:                'variant',
      promotedSequenceId:  newSequenceId,
      promotedArchetypeId: null,
      agreementCount,
    };
    const promotions = readJSON(PROMOTIONS_KEY, []);
    promotions.push(promotionRecord);
    writeJSON(PROMOTIONS_KEY, promotions);

    return { outcome: 'promoted', type: 'variant', sequence, promotionRecord };
  },

  /**
   * Promote an unknown-hybrid pattern: create a new archetype node + its
   * reference sequence.
   * @private
   */
  _promoteHybrid({
    sequencePattern,
    hybridParents,
    mappedSteps,
    validatedActionSequence,
    agreementCount,
    now,
  }) {
    const newArchetypeId = hybridArchetypeId(hybridParents);
    const archetypeName  = hybridParents
      .slice()
      .sort()
      .map(id => id.charAt(0).toUpperCase() + id.slice(1))
      .join(' / ');
    const newSequenceId  = variantSequenceId(newArchetypeId, sequencePattern);
    const sequenceName   = `${archetypeName} — Community Reference`;

    // Build the archetype node.
    const archetype = buildHybridArchetypeNode(hybridParents, newArchetypeId, archetypeName);

    // Build the reference sequence.
    const sequence =
      mappedSteps.length > 0
        ? buildSequenceFromMappedSteps(mappedSteps, newArchetypeId, newSequenceId, sequenceName)
        : buildSequenceFromActions(validatedActionSequence ?? [], newArchetypeId, newSequenceId, sequenceName);

    // Persist promoted archetype.
    const archetypes  = readJSON(PROMOTED_ARCHETYPES_KEY, []);
    const archIdx     = archetypes.findIndex(a => a.id === newArchetypeId);
    if (archIdx >= 0) {
      archetypes[archIdx] = archetype;
    } else {
      archetypes.push(archetype);
    }
    writeJSON(PROMOTED_ARCHETYPES_KEY, archetypes);

    // Persist promoted sequence.
    const sequences  = readJSON(PROMOTED_SEQUENCES_KEY, []);
    const seqIdx     = sequences.findIndex(s => s.id === newSequenceId);
    if (seqIdx >= 0) {
      sequences[seqIdx] = sequence;
    } else {
      sequences.push(sequence);
    }
    writeJSON(PROMOTED_SEQUENCES_KEY, sequences);

    // Record the promotion event.
    const promotionRecord = {
      id:                  crypto.randomUUID(),
      sequencePattern,
      archetypeId:         null,
      promotedAt:          now,
      type:                'new-archetype',
      promotedSequenceId:  newSequenceId,
      promotedArchetypeId: newArchetypeId,
      agreementCount,
      hybridParents,
    };
    const promotions = readJSON(PROMOTIONS_KEY, []);
    promotions.push(promotionRecord);
    writeJSON(PROMOTIONS_KEY, promotions);

    return { outcome: 'promoted', type: 'new-archetype', archetype, sequence, promotionRecord };
  },
};

export { hybridArchetypeId, variantSequenceId };
export default PromotionService;
