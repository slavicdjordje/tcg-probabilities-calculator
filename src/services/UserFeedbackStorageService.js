/**
 * UserFeedbackStorageService
 *
 * Stores validated user contributions (combo sequence confirmations) and
 * prevents duplicate submissions from inflating agreement counts.
 *
 * ── Storage keys ──────────────────────────────────────────────────────────────
 *   fdgg_device_fp          – stable device fingerprint (localStorage)
 *   fdgg_session_fp         – per-session fingerprint (sessionStorage)
 *   fdgg_feedback_submissions – individual submission records (localStorage)
 *   fdgg_feedback_agreements  – per-pattern agreement counters (localStorage)
 *
 * ── Submission record shape ───────────────────────────────────────────────────
 *   {
 *     id:                     string,    // crypto.randomUUID()
 *     deckHash:               string,    // FNV-1a hash of canonical deck string
 *     archetypeId:            string|null,
 *     archetypeName:          string|null,
 *     sequenceId:             string|null,
 *     validatedActionSequence: string[], // log lines that matched steps
 *     sequencePattern:        string,    // canonical step-tag+card fingerprint
 *     deviceFingerprint:      string,
 *     sessionFingerprint:     string,
 *     timestamp:              string,    // ISO-8601
 *     isHybridCandidate:      boolean,
 *     hybridParents:          string[]|null,
 *   }
 *
 * ── Agreement record shape ────────────────────────────────────────────────────
 *   {
 *     deckHash:          string,
 *     sequencePattern:   string,
 *     archetypeId:       string|null,
 *     agreementCount:    number,
 *     isHybridCandidate: boolean,
 *     hybridParents:     string[]|null,
 *     firstSeenAt:       string,   // ISO-8601
 *     lastSeenAt:        string,   // ISO-8601
 *   }
 *
 * ── submit() return shape ─────────────────────────────────────────────────────
 *   { stored: false, reason: 'duplicate' }
 *   { stored: true, record, agreementCount, isHybridCandidate, hybridParents }
 */

const SUBMISSIONS_KEY    = 'fdgg_feedback_submissions';
const AGREEMENTS_KEY     = 'fdgg_feedback_agreements';
const DEVICE_FP_KEY      = 'fdgg_device_fp';
const SESSION_FP_KEY     = 'fdgg_session_fp';
const MAX_SUBMISSIONS    = 200;

// ── FNV-1a 32-bit hash ────────────────────────────────────────────────────────

/**
 * Deterministic FNV-1a 32-bit string hash, returned as an 8-char hex string.
 * Sufficient for deck identity — no cryptographic requirement.
 *
 * @param {string} str
 * @returns {string}
 */
function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // Multiply by FNV prime, keeping within 32 bits
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ── Fingerprint helpers ───────────────────────────────────────────────────────

/**
 * Return the stable device fingerprint, creating it on first visit.
 * Stored in localStorage so it persists across sessions.
 *
 * @returns {string}
 */
function getDeviceFingerprint() {
  try {
    let fp = localStorage.getItem(DEVICE_FP_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(DEVICE_FP_KEY, fp);
    }
    return fp;
  } catch {
    return 'unknown-device';
  }
}

/**
 * Return the per-session fingerprint, creating it on first access.
 * Stored in sessionStorage so a new tab / closed tab starts fresh.
 *
 * @returns {string}
 */
function getSessionFingerprint() {
  try {
    let fp = sessionStorage.getItem(SESSION_FP_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      sessionStorage.setItem(SESSION_FP_KEY, fp);
    }
    return fp;
  } catch {
    return 'unknown-session';
  }
}

// ── Deck hash ─────────────────────────────────────────────────────────────────

/**
 * Hash a deck represented as { cardName: count }.
 * Sorts card names alphabetically before hashing so insertion order doesn't matter.
 *
 * @param {object} deckCardCounts - { cardName: count }
 * @returns {string}
 */
function hashDeck(deckCardCounts) {
  const canonical = Object.keys(deckCardCounts)
    .sort()
    .map(name => `${name}:${deckCardCounts[name]}`)
    .join('|');
  return fnv1a(canonical);
}

// ── Sequence pattern ──────────────────────────────────────────────────────────

/**
 * Derive a canonical sequence pattern from a mappedSteps array
 * (output of LogSequenceMappingService) or a plain action string array.
 *
 * Pattern = "stepIndex:tag1+tag2:card1,card2" per step, joined with ";".
 * Only matched steps (verdict !== 'unmatched') are included so that
 * partial sequences from different users compare correctly.
 *
 * @param {object[]|string[]} mappedSteps
 *   Either MappedStep objects from LogSequenceMappingService
 *   or raw action strings (used when no sequence reference is available).
 * @returns {string}
 */
function computeSequencePattern(mappedSteps) {
  if (!Array.isArray(mappedSteps) || mappedSteps.length === 0) return '';

  // Raw string array path
  if (typeof mappedSteps[0] === 'string') {
    return fnv1a(mappedSteps.join('|'));
  }

  // MappedStep object path
  const parts = mappedSteps
    .filter(s => s.verdict !== 'unmatched' && s.matchedAction != null)
    .map(s => {
      const cardPart = s.cardName ?? '';
      return `${s.stepIndex}:${cardPart}`;
    });

  return parts.length === 0 ? '' : fnv1a(parts.join(';'));
}

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

// ── Public service ────────────────────────────────────────────────────────────

const UserFeedbackStorageService = {
  // ── Submit ────────────────────────────────────────────────────────────────

  /**
   * Validate and persist a user feedback contribution.
   *
   * @param {object} options
   * @param {object}   options.deckCardCounts        - { cardName: count }
   * @param {object}   options.archetypeResult       - result from ArchetypeRecognitionService
   * @param {object[]|string[]} options.mappedSteps  - MappedStep[] or raw action strings
   * @param {string[]} [options.validatedActionSequence] - raw log lines that matched
   * @param {string}   [options.sequenceId]          - matched combo sequence id (if any)
   * @returns {{ stored: boolean, reason?: string, record?: object, agreementCount?: number,
   *             isHybridCandidate?: boolean, hybridParents?: string[]|null }}
   */
  submit({
    deckCardCounts,
    archetypeResult,
    mappedSteps,
    validatedActionSequence = [],
    sequenceId = null,
  }) {
    const deviceFp       = getDeviceFingerprint();
    const sessionFp      = getSessionFingerprint();
    const deckHash       = hashDeck(deckCardCounts ?? {});
    const sequencePattern = computeSequencePattern(mappedSteps ?? []);

    // ── Duplicate check ──────────────────────────────────────────────────────
    const submissions = readJSON(SUBMISSIONS_KEY, []);
    const isDuplicate = submissions.some(
      s =>
        (s.deviceFingerprint === deviceFp || s.sessionFingerprint === sessionFp) &&
        s.deckHash === deckHash &&
        s.sequencePattern === sequencePattern,
    );

    if (isDuplicate) {
      return { stored: false, reason: 'duplicate' };
    }

    // ── Archetype metadata ───────────────────────────────────────────────────
    const type            = archetypeResult?.type ?? 'no-match';
    const archetypeId     = archetypeResult?.archetype?.id   ?? null;
    const archetypeName   = archetypeResult?.archetype?.name ?? null;
    const isHybridCandidate = type === 'unknown-hybrid';
    const hybridParents   = isHybridCandidate
      ? (archetypeResult.parents ?? []).map(p => p.archetype.id)
      : null;

    // ── Build record ─────────────────────────────────────────────────────────
    const record = {
      id:                      crypto.randomUUID(),
      deckHash,
      archetypeId,
      archetypeName,
      sequenceId,
      validatedActionSequence,
      sequencePattern,
      deviceFingerprint:       deviceFp,
      sessionFingerprint:      sessionFp,
      timestamp:               new Date().toISOString(),
      isHybridCandidate,
      hybridParents,
    };

    // ── Persist submission ────────────────────────────────────────────────────
    submissions.push(record);
    if (submissions.length > MAX_SUBMISSIONS) {
      submissions.splice(0, submissions.length - MAX_SUBMISSIONS);
    }
    writeJSON(SUBMISSIONS_KEY, submissions);

    // ── Increment agreement counter ───────────────────────────────────────────
    const agreementCount = this._incrementAgreement({
      deckHash,
      sequencePattern,
      archetypeId,
      isHybridCandidate,
      hybridParents,
    });

    return { stored: true, record, agreementCount, isHybridCandidate, hybridParents };
  },

  // ── Read ──────────────────────────────────────────────────────────────────

  getSubmissions() {
    return readJSON(SUBMISSIONS_KEY, []);
  },

  getAgreements() {
    return readJSON(AGREEMENTS_KEY, []);
  },

  /**
   * Return the agreement record for a specific deck-hash + sequence-pattern,
   * or null when none exists yet.
   *
   * @param {string} deckHash
   * @param {string} sequencePattern
   * @returns {object|null}
   */
  getAgreement(deckHash, sequencePattern) {
    return (
      this.getAgreements().find(
        a => a.deckHash === deckHash && a.sequencePattern === sequencePattern,
      ) ?? null
    );
  },

  /**
   * Return all agreement records flagged as hybrid candidates, sorted by
   * agreement count descending.  These are passed to the threshold mechanism
   * for potential new archetype creation.
   *
   * @returns {object[]}
   */
  getHybridCandidates() {
    return this.getAgreements()
      .filter(a => a.isHybridCandidate)
      .sort((a, b) => b.agreementCount - a.agreementCount);
  },

  // ── Fingerprint exposure (for testing / admin UI) ─────────────────────────

  getDeviceFingerprint: getDeviceFingerprint,
  getSessionFingerprint: getSessionFingerprint,

  // ── Utility ───────────────────────────────────────────────────────────────

  hashDeck,
  computeSequencePattern,

  // ── Internal ──────────────────────────────────────────────────────────────

  /**
   * Find or create the agreement record for a deckHash+sequencePattern pair
   * and increment its counter.  Returns the updated count.
   *
   * @private
   */
  _incrementAgreement({ deckHash, sequencePattern, archetypeId, isHybridCandidate, hybridParents }) {
    const agreements = readJSON(AGREEMENTS_KEY, []);
    const now        = new Date().toISOString();

    const idx = agreements.findIndex(
      a => a.deckHash === deckHash && a.sequencePattern === sequencePattern,
    );

    if (idx >= 0) {
      agreements[idx].agreementCount++;
      agreements[idx].lastSeenAt = now;
      // Update hybrid metadata if it was unknown before
      if (isHybridCandidate && !agreements[idx].isHybridCandidate) {
        agreements[idx].isHybridCandidate = true;
        agreements[idx].hybridParents     = hybridParents;
      }
      writeJSON(AGREEMENTS_KEY, agreements);
      return agreements[idx].agreementCount;
    }

    const newRecord = {
      deckHash,
      sequencePattern,
      archetypeId,
      agreementCount:    1,
      isHybridCandidate,
      hybridParents,
      firstSeenAt:       now,
      lastSeenAt:        now,
    };
    agreements.push(newRecord);
    writeJSON(AGREEMENTS_KEY, agreements);
    return 1;
  },
};

export { hashDeck, computeSequencePattern };
export default UserFeedbackStorageService;
