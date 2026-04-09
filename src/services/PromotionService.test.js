/**
 * PromotionService tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import PromotionService, { hybridArchetypeId, variantSequenceId } from './PromotionService.js';

// ── localStorage mock ─────────────────────────────────────────────────────────

function makeStorageMock() {
  let store = {};
  return {
    getItem:    (k)    => store[k] ?? null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k)    => { delete store[k]; },
    clear:      ()     => { store = {}; },
  };
}

const localStorageMock = makeStorageMock();
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  localStorageMock.clear();
  let counter = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++counter}`);
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SEQ_PATTERN    = 'abc12345';
const ARCHETYPE_ID   = 'fiendsmith';
const ARCHETYPE_NAME = 'Fiendsmith';

function makeSubmitResult({
  stored           = true,
  agreementCount   = 5,
  isHybridCandidate = false,
  hybridParents    = null,
  sequenceId       = 'fiendsmith-engraver-1c',
  validatedActions = ['Normal Summon Fiendsmith Engraver', 'Special Summon Lacrima'],
} = {}) {
  return {
    stored,
    agreementCount,
    isHybridCandidate,
    hybridParents,
    record: {
      id:                      'record-uuid',
      deckHash:                'deadbeef',
      archetypeId:             isHybridCandidate ? null : ARCHETYPE_ID,
      archetypeName:           isHybridCandidate ? null : ARCHETYPE_NAME,
      sequenceId,
      validatedActionSequence: validatedActions,
      sequencePattern:         SEQ_PATTERN,
      deviceFingerprint:       'device-1',
      sessionFingerprint:      'session-1',
      timestamp:               '2026-04-05T10:00:00.000Z',
      isHybridCandidate,
      hybridParents,
    },
  };
}

const MAPPED_STEPS = [
  { stepIndex: 0, verdict: 'legal', matchedAction: 'Normal Summon Fiendsmith Engraver', cardName: 'Fiendsmith Engraver' },
  { stepIndex: 1, verdict: 'legal', matchedAction: 'Special Summon Lacrima the Crimson Tears', cardName: 'Lacrima the Crimson Tears' },
  { stepIndex: 2, verdict: 'unmatched', matchedAction: null, cardName: null },
];

// ── hybridArchetypeId ─────────────────────────────────────────────────────────

describe('hybridArchetypeId', () => {
  it('sorts parents alphabetically for a deterministic ID', () => {
    expect(hybridArchetypeId(['unchained', 'fiendsmith']))
      .toBe('community-hybrid-fiendsmith-unchained');
  });

  it('is order-independent', () => {
    expect(hybridArchetypeId(['b', 'a'])).toBe(hybridArchetypeId(['a', 'b']));
  });
});

// ── variantSequenceId ─────────────────────────────────────────────────────────

describe('variantSequenceId', () => {
  it('produces a stable ID from archetypeId + sequencePattern', () => {
    const id = variantSequenceId('fiendsmith', 'abc12345');
    expect(id).toBe('community-fiendsmith-abc12345');
  });
});

// ── getConfig / setConfig ─────────────────────────────────────────────────────

describe('PromotionService.getConfig / setConfig', () => {
  it('returns default threshold of 5', () => {
    expect(PromotionService.getConfig().threshold).toBe(5);
  });

  it('persists a custom threshold', () => {
    PromotionService.setConfig({ threshold: 10 });
    expect(PromotionService.getConfig().threshold).toBe(10);
  });

  it('merges with existing config rather than replacing it', () => {
    PromotionService.setConfig({ threshold: 7 });
    PromotionService.setConfig({ threshold: 3 });
    expect(PromotionService.getConfig().threshold).toBe(3);
  });
});

// ── evaluate — not-stored ─────────────────────────────────────────────────────

describe('PromotionService.evaluate — not-stored', () => {
  it('returns not-stored when submitResult.stored is false', () => {
    const result = PromotionService.evaluate({
      submitResult: { stored: false, reason: 'duplicate' },
    });
    expect(result.outcome).toBe('not-stored');
  });

  it('returns not-stored when submitResult is null', () => {
    const result = PromotionService.evaluate({ submitResult: null });
    expect(result.outcome).toBe('not-stored');
  });
});

// ── evaluate — threshold-not-met ─────────────────────────────────────────────

describe('PromotionService.evaluate — threshold-not-met', () => {
  it('returns threshold-not-met when count < threshold', () => {
    const result = PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 3 }),
    });
    expect(result.outcome).toBe('threshold-not-met');
    expect(result.agreementCount).toBe(3);
    expect(result.threshold).toBe(5);
  });

  it('does not persist any data when threshold is not met', () => {
    PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 4 }),
    });
    expect(PromotionService.getPromotions()).toHaveLength(0);
    expect(PromotionService.getPromotedSequences()).toHaveLength(0);
  });

  it('respects a custom threshold', () => {
    PromotionService.setConfig({ threshold: 2 });
    const result = PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 1 }),
    });
    expect(result.outcome).toBe('threshold-not-met');
  });
});

// ── evaluate — variant promotion ──────────────────────────────────────────────

describe('PromotionService.evaluate — variant promotion (existing archetype)', () => {
  it('returns promoted with type variant when threshold is met', () => {
    const result = PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 5 }),
    });
    expect(result.outcome).toBe('promoted');
    expect(result.type).toBe('variant');
  });

  it('produces a valid sequence object', () => {
    const result = PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 5 }),
    });
    expect(result.sequence.archetypeId).toBe(ARCHETYPE_ID);
    expect(result.sequence.communityValidated).toBe(true);
    expect(result.sequence.id).toMatch(/^community-fiendsmith-/);
  });

  it('uses mappedSteps when provided for step detail', () => {
    const result = PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 5 }),
      mappedSteps:  MAPPED_STEPS,
    });
    // Only the 2 matched steps should appear (unmatched is filtered out)
    expect(result.sequence.steps).toHaveLength(2);
    expect(result.sequence.steps[0].description).toBe('Normal Summon Fiendsmith Engraver');
    expect(result.sequence.steps[0].cards[0].name).toBe('Fiendsmith Engraver');
  });

  it('falls back to raw action strings when mappedSteps are empty', () => {
    const result = PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 5 }),
    });
    expect(result.sequence.steps).toHaveLength(2);
    expect(result.sequence.steps[0].description).toBe('Normal Summon Fiendsmith Engraver');
  });

  it('tags the referenceSequenceId when sequenceId is set', () => {
    const result = PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 5, sequenceId: 'fiendsmith-engraver-1c' }),
    });
    expect(result.sequence.referenceSequenceId).toBe('fiendsmith-engraver-1c');
  });

  it('persists the sequence to getPromotedSequences()', () => {
    PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 5 }) });
    expect(PromotionService.getPromotedSequences()).toHaveLength(1);
  });

  it('persists a promotion record to getPromotions()', () => {
    PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 5 }) });
    const promotions = PromotionService.getPromotions();
    expect(promotions).toHaveLength(1);
    expect(promotions[0].type).toBe('variant');
    expect(promotions[0].archetypeId).toBe(ARCHETYPE_ID);
    expect(promotions[0].agreementCount).toBe(5);
    expect(promotions[0].promotedArchetypeId).toBeNull();
  });

  it('exact threshold value (=== threshold) triggers promotion', () => {
    PromotionService.setConfig({ threshold: 3 });
    const result = PromotionService.evaluate({
      submitResult: makeSubmitResult({ agreementCount: 3 }),
    });
    expect(result.outcome).toBe('promoted');
  });
});

// ── evaluate — already-promoted ───────────────────────────────────────────────

describe('PromotionService.evaluate — already-promoted', () => {
  it('returns already-promoted on a second call for the same pattern', () => {
    PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 5 }) });

    const second = PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 6 }) });
    expect(second.outcome).toBe('already-promoted');
  });

  it('does not create a duplicate promotion record', () => {
    PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 5 }) });
    PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 6 }) });
    expect(PromotionService.getPromotions()).toHaveLength(1);
  });

  it('returns the original promotionRecord in the already-promoted response', () => {
    PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 5 }) });
    const second = PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 6 }) });
    expect(second.promotionRecord).toBeDefined();
    expect(second.promotionRecord.type).toBe('variant');
  });
});

// ── evaluate — new-archetype promotion ───────────────────────────────────────

describe('PromotionService.evaluate — new-archetype promotion (unknown hybrid)', () => {
  const HYBRID_SUBMIT = makeSubmitResult({
    agreementCount:    5,
    isHybridCandidate: true,
    hybridParents:     ['fiendsmith', 'unchained'],
    sequenceId:        null,
  });

  it('returns promoted with type new-archetype', () => {
    const result = PromotionService.evaluate({ submitResult: HYBRID_SUBMIT });
    expect(result.outcome).toBe('promoted');
    expect(result.type).toBe('new-archetype');
  });

  it('produces a valid archetype node with correct parents', () => {
    const result = PromotionService.evaluate({ submitResult: HYBRID_SUBMIT });
    expect(result.archetype.id).toBe('community-hybrid-fiendsmith-unchained');
    expect(result.archetype.parents).toEqual(['fiendsmith', 'unchained']);
    expect(result.archetype.communityValidated).toBe(true);
  });

  it('produces a valid reference sequence linked to the new archetype', () => {
    const result = PromotionService.evaluate({ submitResult: HYBRID_SUBMIT });
    expect(result.sequence.archetypeId).toBe('community-hybrid-fiendsmith-unchained');
    expect(result.sequence.communityValidated).toBe(true);
  });

  it('persists the archetype to getPromotedArchetypes()', () => {
    PromotionService.evaluate({ submitResult: HYBRID_SUBMIT });
    const archetypes = PromotionService.getPromotedArchetypes();
    expect(archetypes).toHaveLength(1);
    expect(archetypes[0].id).toBe('community-hybrid-fiendsmith-unchained');
  });

  it('persists the sequence to getPromotedSequences()', () => {
    PromotionService.evaluate({ submitResult: HYBRID_SUBMIT });
    expect(PromotionService.getPromotedSequences()).toHaveLength(1);
  });

  it('persists a promotion record with type new-archetype', () => {
    PromotionService.evaluate({ submitResult: HYBRID_SUBMIT });
    const promotions = PromotionService.getPromotions();
    expect(promotions).toHaveLength(1);
    expect(promotions[0].type).toBe('new-archetype');
    expect(promotions[0].promotedArchetypeId).toBe('community-hybrid-fiendsmith-unchained');
    expect(promotions[0].hybridParents).toEqual(['fiendsmith', 'unchained']);
  });

  it('builds steps from mappedSteps when provided', () => {
    const result = PromotionService.evaluate({
      submitResult: HYBRID_SUBMIT,
      mappedSteps:  MAPPED_STEPS,
    });
    expect(result.sequence.steps).toHaveLength(2);
  });

  it('idempotently overwrites the archetype/sequence on repeated calls with the same pattern', () => {
    // First promote it.
    PromotionService.evaluate({ submitResult: HYBRID_SUBMIT });

    // Force a re-promotion by clearing the promotions log only.
    localStorageMock.setItem('fdgg_promotions', JSON.stringify([]));

    PromotionService.evaluate({ submitResult: HYBRID_SUBMIT });

    // Should still be exactly one archetype and one sequence.
    expect(PromotionService.getPromotedArchetypes()).toHaveLength(1);
    expect(PromotionService.getPromotedSequences()).toHaveLength(1);
  });
});

// ── isAlreadyPromoted ─────────────────────────────────────────────────────────

describe('PromotionService.isAlreadyPromoted', () => {
  it('returns false before any promotion', () => {
    expect(PromotionService.isAlreadyPromoted(SEQ_PATTERN)).toBe(false);
  });

  it('returns true after the pattern has been promoted', () => {
    PromotionService.evaluate({ submitResult: makeSubmitResult({ agreementCount: 5 }) });
    expect(PromotionService.isAlreadyPromoted(SEQ_PATTERN)).toBe(true);
  });
});
