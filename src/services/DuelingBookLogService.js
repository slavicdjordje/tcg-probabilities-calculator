/**
 * DuelingBookLogService
 *
 * Validates and parses raw DuelingBook game log text into structured action
 * records.  Parsing is intentionally lenient — unrecognised lines are kept as
 * `actionType: 'other'` so that no data is silently dropped.
 *
 * Parsed action shape:
 *   {
 *     actingPlayer: string | null,   // e.g. "Slavi"
 *     card:         string | null,   // English card name, if present in the line
 *     actionType:   ActionType,      // see ACTION_TYPES below
 *     phase:        string | null,   // game phase active when the action occurred
 *     rawLine:      string,          // original, unmodified line
 *   }
 *
 * Validation result shape:
 *   {
 *     valid:   boolean,
 *     reason?: string,   // present when valid === false
 *   }
 */

// ── Action type constants ─────────────────────────────────────────────────────

export const ACTION_TYPES = /** @type {const} */ ({
  DRAW:           'draw',
  NORMAL_SUMMON:  'normal-summon',
  SPECIAL_SUMMON: 'special-summon',
  ACTIVATE:       'activate',
  SET:            'set',
  ATTACK:         'attack',
  ADD_TO_HAND:    'add-to-hand',
  SEND_TO_GY:     'send-to-gy',
  BANISH:         'banish',
  PHASE_CHANGE:   'phase-change',
  TURN_MARKER:    'turn-marker',
  OTHER:          'other',
});

// ── Pattern tables ────────────────────────────────────────────────────────────

/**
 * Each entry:  { regex, type, playerGroup, cardGroup }
 *   playerGroup – capture group index for acting player (1-based); 0 = none
 *   cardGroup   – capture group index for card name;              0 = none
 */
const ACTION_PATTERNS = [
  {
    regex:       /^(.+?) drew? (\d+) cards?\.?$/i,
    type:        ACTION_TYPES.DRAW,
    playerGroup: 1,
    cardGroup:   0,
  },
  {
    regex:       /^(.+?) Normal Summon(?:ed)? (.+?)(?:\s*\(.*?\))?\.?$/i,
    type:        ACTION_TYPES.NORMAL_SUMMON,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) Special Summon(?:ed)? (.+?)(?:\s*(?:from|to|in|at)\b.*?)?(?:\s*\(.*?\))?\.?$/i,
    type:        ACTION_TYPES.SPECIAL_SUMMON,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) activated (.+?)'s? (?:effect|ability)\.?$/i,
    type:        ACTION_TYPES.ACTIVATE,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) activated (.+?)\.?$/i,
    type:        ACTION_TYPES.ACTIVATE,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) Set (.+?)\.?$/i,
    type:        ACTION_TYPES.SET,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) (?:declared an attack|attacked) with (.+?)\.?$/i,
    type:        ACTION_TYPES.ATTACK,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) attacked(?:\s+(.+?))?\.?$/i,
    type:        ACTION_TYPES.ATTACK,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) added (.+?) to (?:their )?hand\.?$/i,
    type:        ACTION_TYPES.ADD_TO_HAND,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) sent (.+?) to the Graveyard\.?$/i,
    type:        ACTION_TYPES.SEND_TO_GY,
    playerGroup: 1,
    cardGroup:   2,
  },
  {
    regex:       /^(.+?) banished (.+?)\.?$/i,
    type:        ACTION_TYPES.BANISH,
    playerGroup: 1,
    cardGroup:   2,
  },
];

/** Recognisable game phases. */
const PHASE_PATTERNS = [
  { regex: /^\[?Draw Phase\]?$/i,          phase: 'Draw Phase' },
  { regex: /^\[?Standby Phase\]?$/i,       phase: 'Standby Phase' },
  { regex: /^\[?Main Phase 1\]?$/i,        phase: 'Main Phase 1' },
  { regex: /^\[?Main Phase 2\]?$/i,        phase: 'Main Phase 2' },
  { regex: /^\[?Battle Phase\]?$/i,        phase: 'Battle Phase' },
  { regex: /^\[?End Phase\]?$/i,           phase: 'End Phase' },
  { regex: /^\[?Main Phase\]?$/i,          phase: 'Main Phase 1' },
  // Inline: "Draw Phase: Slavi drew…" — captured by contains check
  { regex: /(?:Draw Phase|Standby Phase|Main Phase [12]|Battle Phase|End Phase)/i, phase: null },
];

/** Pattern for turn-marker lines, e.g. "Turn 1", "Turn 2 (Slavi's Turn)" */
const TURN_PATTERN = /^Turn\s+\d+/i;

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractPhaseFromLine(line) {
  for (const { regex, phase } of PHASE_PATTERNS) {
    if (regex.test(line)) {
      return phase ?? (line.match(/(Draw Phase|Standby Phase|Main Phase [12]|Battle Phase|End Phase)/i)?.[1] ?? null);
    }
  }
  return null;
}

function parseActionLine(line) {
  for (const { regex, type, playerGroup, cardGroup } of ACTION_PATTERNS) {
    const m = line.match(regex);
    if (m) {
      return {
        type,
        player: playerGroup ? (m[playerGroup] ?? null) : null,
        card:   cardGroup   ? (m[cardGroup]   ?? null) : null,
      };
    }
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

const DuelingBookLogService = {
  /**
   * Determine whether `rawText` plausibly resembles a DuelingBook game log.
   *
   * Rules:
   *   1. At least 3 non-empty lines.
   *   2. At least 1 recognisable action OR turn/phase marker.
   *   3. At least 15% of non-empty lines are recognisable (keeps noise-only
   *      pasted text from passing).
   *
   * @param {string} rawText
   * @returns {{ valid: boolean, reason?: string }}
   */
  validate(rawText) {
    if (typeof rawText !== 'string' || rawText.trim() === '') {
      return { valid: false, reason: 'The log is empty.' };
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length < 3) {
      return { valid: false, reason: 'The log is too short — paste the full game log.' };
    }

    let recognisedCount = 0;

    for (const line of lines) {
      if (TURN_PATTERN.test(line)) { recognisedCount++; continue; }
      if (extractPhaseFromLine(line) !== null) { recognisedCount++; continue; }
      if (parseActionLine(line) !== null) { recognisedCount++; }
    }

    if (recognisedCount === 0) {
      return {
        valid:  false,
        reason: 'No recognisable DuelingBook actions found. Check that you pasted a full game log.',
      };
    }

    const ratio = recognisedCount / lines.length;
    if (ratio < 0.15) {
      return {
        valid:  false,
        reason: 'Too few recognisable lines — this doesn\'t look like a DuelingBook log.',
      };
    }

    return { valid: true };
  },

  /**
   * Parse a validated DuelingBook log into an ordered array of action records.
   * Call `validate()` first; behaviour for invalid input is unspecified.
   *
   * @param {string} rawText
   * @returns {Array<{
   *   actingPlayer: string | null,
   *   card:         string | null,
   *   actionType:   string,
   *   phase:        string | null,
   *   rawLine:      string,
   * }>}
   */
  parse(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const actions = [];
    let currentPhase = null;

    for (const line of lines) {
      // Turn marker — not an "action" per se, but keep it for context.
      if (TURN_PATTERN.test(line)) {
        // Reset phase on new turn (Draw Phase is first).
        currentPhase = 'Draw Phase';
        actions.push({
          actingPlayer: null,
          card:         null,
          actionType:   ACTION_TYPES.TURN_MARKER,
          phase:        currentPhase,
          rawLine:      line,
        });
        continue;
      }

      // Phase-change line.
      const phaseLabel = extractPhaseFromLine(line);
      if (phaseLabel !== null) {
        currentPhase = phaseLabel;
        actions.push({
          actingPlayer: null,
          card:         null,
          actionType:   ACTION_TYPES.PHASE_CHANGE,
          phase:        currentPhase,
          rawLine:      line,
        });
        continue;
      }

      // Action line.
      const parsed = parseActionLine(line);
      if (parsed) {
        actions.push({
          actingPlayer: parsed.player,
          card:         parsed.card,
          actionType:   parsed.type,
          phase:        currentPhase,
          rawLine:      line,
        });
        continue;
      }

      // Unrecognised line — keep it as-is.
      actions.push({
        actingPlayer: null,
        card:         null,
        actionType:   ACTION_TYPES.OTHER,
        phase:        currentPhase,
        rawLine:      line,
      });
    }

    return actions;
  },
};

export default DuelingBookLogService;
