/**
 * UserFeedbackStorageService tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import UserFeedbackStorageService, { hashDeck, computeSequencePattern } from './UserFeedbackStorageService.js';

// ── localStorage / sessionStorage mock ───────────────────────────────────────

function makeStorageMock() {
  let store = {};
  return {
    getItem:    (k)      => store[k] ?? null,
    setItem:    (k, v)   => { store[k] = String(v); },
    removeItem: (k)      => { delete store[k]; },
    clear:      ()       => { store = {}; },
  };
}

const localStorageMock   = makeStorageMock();
const sessionStorageMock = makeStorageMock();

vi.stubGlobal('localStorage',   localStorageMock);
vi.stubGlobal('sessionStorage', sessionStorageMock);

// Give each test a clean slate
beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
  // Reset crypto.randomUUID call sequence
  let counter = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++counter}`);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const DECK_A = { 'Fiendsmith Engraver': 3, 'Lacrima the Crimson Tears': 2 };
const DECK_B = { 'Unchained Twins - Aruha': 3 };

const ARCHETYPE_SINGLE = {
  type:      'single',
  archetype: { id: 'fiendsmith', name: 'Fiendsmith' },
  confidence: 0.9,
};

const ARCHETYPE_UNKNOWN_HYBRID = {
  type:    'unknown-hybrid',
  parents: [
    { archetype: { id: 'fiendsmith', name: 'Fiendsmith' }, confidence: 0.8 },
    { archetype: { id: 'unchained',  name: 'Unchained'  }, confidence: 0.7 },
  ],
};

const MAPPED_STEPS_A = [
  { stepIndex: 0, verdict: 'legal',   matchedAction: 'activated "Fiendsmith Engraver"', cardName: 'Fiendsmith Engraver' },
  { stepIndex: 1, verdict: 'legal',   matchedAction: 'Special Summon "Lacrima the Crimson Tears"', cardName: 'Lacrima the Crimson Tears' },
];

const MAPPED_STEPS_B = [
  { stepIndex: 0, verdict: 'legal',   matchedAction: 'Normal Summon "Unchained Twins - Aruha"', cardName: 'Unchained Twins - Aruha' },
];

// ── hashDeck ──────────────────────────────────────────────────────────────────

describe('hashDeck', () => {
  it('returns a non-empty hex string', () => {
    const h = hashDeck(DECK_A);
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is order-independent', () => {
    const h1 = hashDeck({ Alpha: 1, Beta: 2 });
    const h2 = hashDeck({ Beta: 2, Alpha: 1 });
    expect(h1).toBe(h2);
  });

  it('differs for different decks', () => {
    expect(hashDeck(DECK_A)).not.toBe(hashDeck(DECK_B));
  });

  it('handles empty deck', () => {
    expect(hashDeck({})).toMatch(/^[0-9a-f]{8}$/);
  });
});

// ── computeSequencePattern ────────────────────────────────────────────────────

describe('computeSequencePattern', () => {
  it('returns a non-empty string for valid mapped steps', () => {
    expect(computeSequencePattern(MAPPED_STEPS_A)).toBeTruthy();
  });

  it('returns empty string for empty input', () => {
    expect(computeSequencePattern([])).toBe('');
  });

  it('returns empty string when all steps are unmatched', () => {
    const unmatched = [
      { stepIndex: 0, verdict: 'unmatched', matchedAction: null, cardName: null },
    ];
    expect(computeSequencePattern(unmatched)).toBe('');
  });

  it('produces same pattern regardless of unmatched-step count', () => {
    const withExtra = [
      ...MAPPED_STEPS_A,
      { stepIndex: 2, verdict: 'unmatched', matchedAction: null, cardName: null },
    ];
    expect(computeSequencePattern(withExtra)).toBe(computeSequencePattern(MAPPED_STEPS_A));
  });

  it('differs for different step sequences', () => {
    expect(computeSequencePattern(MAPPED_STEPS_A)).not.toBe(computeSequencePattern(MAPPED_STEPS_B));
  });

  it('handles raw string arrays', () => {
    const pattern = computeSequencePattern(['action one', 'action two']);
    expect(pattern).toMatch(/^[0-9a-f]{8}$/);
  });
});

// ── submit ────────────────────────────────────────────────────────────────────

describe('UserFeedbackStorageService.submit', () => {
  it('stores a new feedback record and returns stored: true', () => {
    const result = UserFeedbackStorageService.submit({
      deckCardCounts:          DECK_A,
      archetypeResult:         ARCHETYPE_SINGLE,
      mappedSteps:             MAPPED_STEPS_A,
      validatedActionSequence: MAPPED_STEPS_A.map(s => s.matchedAction),
      sequenceId:              'fiendsmith-engraver-1c',
    });

    expect(result.stored).toBe(true);
    expect(result.record).toBeDefined();
    expect(result.record.archetypeId).toBe('fiendsmith');
    expect(result.record.sequenceId).toBe('fiendsmith-engraver-1c');
    expect(result.record.isHybridCandidate).toBe(false);
    expect(result.agreementCount).toBe(1);
  });

  it('persists the record to getSubmissions()', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });
    const all = UserFeedbackStorageService.getSubmissions();
    expect(all).toHaveLength(1);
  });

  it('creates an agreement record in getAgreements()', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });
    const agreements = UserFeedbackStorageService.getAgreements();
    expect(agreements).toHaveLength(1);
    expect(agreements[0].agreementCount).toBe(1);
  });

  // ── Duplicate detection ────────────────────────────────────────────────────

  it('discards a duplicate from the same device fingerprint', () => {
    // First submit establishes the device fingerprint
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    // Second submit — same device (same localStorage) same deck + sequence
    const result = UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    expect(result.stored).toBe(false);
    expect(result.reason).toBe('duplicate');
    expect(UserFeedbackStorageService.getSubmissions()).toHaveLength(1);
    expect(UserFeedbackStorageService.getAgreements()[0].agreementCount).toBe(1);
  });

  it('discards a duplicate from the same session fingerprint (different "device")', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    // Simulate a different device but same session (manipulate stored fp)
    const submissions = UserFeedbackStorageService.getSubmissions();
    submissions[0].deviceFingerprint = 'different-device';
    localStorageMock.setItem('fdgg_feedback_submissions', JSON.stringify(submissions));

    const result = UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    expect(result.stored).toBe(false);
    expect(result.reason).toBe('duplicate');
  });

  it('allows a different deck with the same sequence from the same device', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    const result = UserFeedbackStorageService.submit({
      deckCardCounts: DECK_B,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    expect(result.stored).toBe(true);
    expect(UserFeedbackStorageService.getSubmissions()).toHaveLength(2);
  });

  it('allows the same deck with a different sequence from the same device', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    const result = UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_B,
    });

    expect(result.stored).toBe(true);
  });

  // ── Agreement count ────────────────────────────────────────────────────────

  it('increments the agreement count when a new unique device submits the same pattern', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    // Simulate a second device by patching the stored submissions' deviceFp
    const subs = UserFeedbackStorageService.getSubmissions();
    subs[0].deviceFingerprint  = 'device-one';
    subs[0].sessionFingerprint = 'session-one';
    localStorageMock.setItem('fdgg_feedback_submissions', JSON.stringify(subs));

    // Override our own device+session fingerprints to be different
    localStorageMock.setItem('fdgg_device_fp', 'device-two');
    sessionStorageMock.setItem('fdgg_session_fp', 'session-two');

    const result = UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    expect(result.stored).toBe(true);
    expect(result.agreementCount).toBe(2);
    expect(UserFeedbackStorageService.getAgreements()[0].agreementCount).toBe(2);
  });

  // ── Hybrid candidate flagging ──────────────────────────────────────────────

  it('flags unknown-hybrid submissions as isHybridCandidate', () => {
    const result = UserFeedbackStorageService.submit({
      deckCardCounts: { ...DECK_A, ...DECK_B },
      archetypeResult: ARCHETYPE_UNKNOWN_HYBRID,
      mappedSteps:    MAPPED_STEPS_A,
    });

    expect(result.stored).toBe(true);
    expect(result.isHybridCandidate).toBe(true);
    expect(result.hybridParents).toEqual(['fiendsmith', 'unchained']);
    expect(result.record.isHybridCandidate).toBe(true);
    expect(result.record.archetypeId).toBeNull();
  });

  it('includes hybrid candidates in getHybridCandidates()', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: { ...DECK_A, ...DECK_B },
      archetypeResult: ARCHETYPE_UNKNOWN_HYBRID,
      mappedSteps:    MAPPED_STEPS_A,
    });

    const candidates = UserFeedbackStorageService.getHybridCandidates();
    expect(candidates).toHaveLength(1);
    expect(candidates[0].isHybridCandidate).toBe(true);
    expect(candidates[0].hybridParents).toEqual(['fiendsmith', 'unchained']);
  });

  it('does not include non-hybrid submissions in getHybridCandidates()', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    expect(UserFeedbackStorageService.getHybridCandidates()).toHaveLength(0);
  });
});

// ── getAgreement ──────────────────────────────────────────────────────────────

describe('UserFeedbackStorageService.getAgreement', () => {
  it('returns null when no record exists', () => {
    expect(UserFeedbackStorageService.getAgreement('abc', 'xyz')).toBeNull();
  });

  it('returns the correct agreement record', () => {
    UserFeedbackStorageService.submit({
      deckCardCounts: DECK_A,
      archetypeResult: ARCHETYPE_SINGLE,
      mappedSteps:    MAPPED_STEPS_A,
    });

    const deckHash       = hashDeck(DECK_A);
    const seqPattern     = computeSequencePattern(MAPPED_STEPS_A);
    const agreement      = UserFeedbackStorageService.getAgreement(deckHash, seqPattern);

    expect(agreement).not.toBeNull();
    expect(agreement.agreementCount).toBe(1);
    expect(agreement.archetypeId).toBe('fiendsmith');
  });
});
