import { describe, it, expect } from 'vitest';
import ArchetypeRecognitionService, {
  scoreArchetype,
  isHybrid,
  mergeComboTemplates,
} from './ArchetypeRecognitionService.js';
import { ARCHETYPE_DATABASE } from '../data/archetypeDatabase.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Minimal Snake-Eye engine (3x Ash, 3x Poplar, 1x Original Sinful Spoils) */
const SNAKE_EYE_DECK = {
  'Snake-Eye Ash':                       3,
  'Snake-Eyes Poplar':                   3,
  'Original Sinful Spoils - Snake-Eye':  1,
};

/** Minimal Fiendsmith engine (2x Engraver, 2x Tract, 1x Sanct) */
const FIENDSMITH_DECK = {
  'Fiendsmith Engraver':   2,
  "Fiendsmith's Tract":    2,
  "Fiendsmith's Sanct":    1,
};

/** Hybrid deck: Snake-Eye + Fiendsmith together */
const SNAKE_EYE_FIENDSMITH_DECK = {
  ...SNAKE_EYE_DECK,
  ...FIENDSMITH_DECK,
};

/** Branded / Despia deck */
const BRANDED_DECK = {
  'Aluber, the Jester of Despia': 3,
  'Branded Fusion':               3,
  'Nadir Servant':                2,
  'Fallen of the White Dragon':   2,
};

/** Completely unknown deck with no signature cards */
const UNKNOWN_DECK = {
  'Blue-Eyes White Dragon': 3,
  'Dark Magician':          3,
};

// ── scoreArchetype ────────────────────────────────────────────────────────────

describe('scoreArchetype', () => {
  const snakeEyeNode = ARCHETYPE_DATABASE.find(a => a.id === 'snake-eye');

  it('returns 0 for empty ydkCardCounts', () => {
    expect(scoreArchetype(snakeEyeNode, {})).toBe(0);
  });

  it('returns 0 for an archetype with an empty signature', () => {
    const hybridNode = ARCHETYPE_DATABASE.find(a => a.id === 'snake-eye-fiendsmith');
    expect(scoreArchetype(hybridNode, SNAKE_EYE_DECK)).toBe(0);
  });

  it('returns 1 when every signature card is present', () => {
    const fullDeck = {};
    snakeEyeNode.signature.forEach(c => { fullDeck[c.name] = 3; });
    expect(scoreArchetype(snakeEyeNode, fullDeck)).toBe(1);
  });

  it('returns a partial score when only some signature cards are present', () => {
    const score = scoreArchetype(snakeEyeNode, SNAKE_EYE_DECK);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('scores above threshold for a realistic Snake-Eye deck', () => {
    const score = scoreArchetype(snakeEyeNode, SNAKE_EYE_DECK);
    expect(score).toBeGreaterThanOrEqual(snakeEyeNode.threshold);
  });
});

// ── isHybrid ─────────────────────────────────────────────────────────────────

describe('isHybrid', () => {
  it('returns false for root nodes', () => {
    const root = ARCHETYPE_DATABASE.find(a => a.id === 'snake-eye');
    expect(isHybrid(root)).toBe(false);
  });

  it('returns true for hybrid nodes', () => {
    const hybrid = ARCHETYPE_DATABASE.find(a => a.id === 'snake-eye-fiendsmith');
    expect(isHybrid(hybrid)).toBe(true);
  });
});

// ── mergeComboTemplates ───────────────────────────────────────────────────────

describe('mergeComboTemplates', () => {
  it('deduplicates templates by name', () => {
    const hybridNode = { comboTemplates: [{ name: 'A', cards: [] }] };
    const parentA    = { comboTemplates: [{ name: 'A', cards: [] }, { name: 'B', cards: [] }] };
    const parentB    = { comboTemplates: [{ name: 'B', cards: [] }, { name: 'C', cards: [] }] };

    const merged = mergeComboTemplates(hybridNode, [parentA, parentB]);
    const names  = merged.map(t => t.name);

    expect(names).toEqual(['A', 'B', 'C']);
    expect(names.filter(n => n === 'A')).toHaveLength(1);
  });

  it('hybrid templates take precedence over parent templates', () => {
    const hybridTemplate = { name: 'Shared', cards: [{ name: 'hybrid-card', minInHand: 1 }] };
    const parentTemplate = { name: 'Shared', cards: [{ name: 'parent-card', minInHand: 1 }] };

    const merged = mergeComboTemplates(
      { comboTemplates: [hybridTemplate] },
      [{ comboTemplates: [parentTemplate] }]
    );

    expect(merged[0].cards[0].name).toBe('hybrid-card');
  });
});

// ── recognize — single match ──────────────────────────────────────────────────

describe('recognize — single archetype', () => {
  it('returns no-match for an empty deck', () => {
    expect(ArchetypeRecognitionService.recognize({})).toEqual({ type: 'no-match' });
  });

  it('returns no-match for a deck with no signature cards', () => {
    expect(ArchetypeRecognitionService.recognize(UNKNOWN_DECK).type).toBe('no-match');
  });

  it('returns a single result for a Snake-Eye deck', () => {
    const result = ArchetypeRecognitionService.recognize(SNAKE_EYE_DECK);
    expect(result.type).toBe('single');
    expect(result.archetype.id).toBe('snake-eye');
    expect(result.confidence).toBeGreaterThanOrEqual(0.25);
  });

  it('returns a single result for a Branded/Despia deck', () => {
    const result = ArchetypeRecognitionService.recognize(BRANDED_DECK);
    expect(result.type).toBe('single');
    expect(result.archetype.id).toBe('branded-despia');
  });

  it('includes combos filtered to cards present in the deck', () => {
    const result = ArchetypeRecognitionService.recognize(SNAKE_EYE_DECK);
    expect(Array.isArray(result.combos)).toBe(true);
    result.combos.forEach(combo => {
      combo.cards.forEach(card => {
        expect(SNAKE_EYE_DECK[card.starterCard]).toBeDefined();
      });
    });
  });

  it('each combo has a unique id', () => {
    const result = ArchetypeRecognitionService.recognize(SNAKE_EYE_DECK);
    const ids = result.combos.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── recognize — hybrid match ──────────────────────────────────────────────────

describe('recognize — known hybrid', () => {
  it('resolves Snake-Eye + Fiendsmith as a known hybrid', () => {
    const result = ArchetypeRecognitionService.recognize(SNAKE_EYE_FIENDSMITH_DECK);
    expect(result.type).toBe('hybrid');
    expect(result.archetype.id).toBe('snake-eye-fiendsmith');
  });

  it('lists both parent matches', () => {
    const result = ArchetypeRecognitionService.recognize(SNAKE_EYE_FIENDSMITH_DECK);
    const parentIds = result.parents.map(p => p.archetype.id);
    expect(parentIds).toContain('snake-eye');
    expect(parentIds).toContain('fiendsmith');
  });

  it('merges combos from both parents', () => {
    const result = ArchetypeRecognitionService.recognize(SNAKE_EYE_FIENDSMITH_DECK);
    const comboNames = result.combos.map(c => c.name);
    // Should contain at least one Snake-Eye combo and one Fiendsmith combo
    const hasSnakeEye  = comboNames.some(n => n.toLowerCase().includes('snake'));
    const hasFiendsmith = comboNames.some(n => n.toLowerCase().includes('fiendsmith'));
    expect(hasSnakeEye).toBe(true);
    expect(hasFiendsmith).toBe(true);
  });
});

// ── recognize — unknown hybrid ────────────────────────────────────────────────

describe('recognize — unknown hybrid', () => {
  it('returns unknown-hybrid when two archetypes match but no hybrid node exists', () => {
    // Snake-Eye + Cyber Dragon is not a registered hybrid
    const mixedDeck = {
      ...SNAKE_EYE_DECK,
      'Cyber Emergency':    2,
      'Cyber Repair Plant': 2,
      'Nachster':           2,
    };
    const result = ArchetypeRecognitionService.recognize(mixedDeck);
    expect(result.type).toBe('unknown-hybrid');
  });

  it('includes parent match information in unknown-hybrid result', () => {
    const mixedDeck = {
      ...SNAKE_EYE_DECK,
      'Cyber Emergency':    2,
      'Cyber Repair Plant': 2,
      'Nachster':           2,
    };
    const result = ArchetypeRecognitionService.recognize(mixedDeck);
    expect(Array.isArray(result.parents)).toBe(true);
    expect(result.parents.length).toBeGreaterThanOrEqual(2);
  });
});

// ── scoreAll ──────────────────────────────────────────────────────────────────

describe('scoreAll', () => {
  it('returns an entry for every archetype in the database', () => {
    const scores = ArchetypeRecognitionService.scoreAll(SNAKE_EYE_DECK);
    expect(scores.length).toBe(ARCHETYPE_DATABASE.length);
  });

  it('returns scores sorted descending', () => {
    const scores = ArchetypeRecognitionService.scoreAll(SNAKE_EYE_DECK);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i].confidence).toBeGreaterThanOrEqual(scores[i + 1].confidence);
    }
  });

  it('ranks the expected archetype highest for a mono-archetype deck', () => {
    const scores = ArchetypeRecognitionService.scoreAll(SNAKE_EYE_DECK);
    expect(scores[0].id).toBe('snake-eye');
  });
});

// ── DAG structure ─────────────────────────────────────────────────────────────

describe('ARCHETYPE_DATABASE DAG invariants', () => {
  it('every parent ID referenced by a hybrid node exists in the database', () => {
    const allIds = new Set(ARCHETYPE_DATABASE.map(a => a.id));
    ARCHETYPE_DATABASE.filter(isHybrid).forEach(hybrid => {
      hybrid.parents.forEach(parentId => {
        expect(allIds.has(parentId), `Missing parent: ${parentId} in ${hybrid.id}`).toBe(true);
      });
    });
  });

  it('root nodes have no parents', () => {
    const roots = ARCHETYPE_DATABASE.filter(a => a.parents.length === 0);
    expect(roots.length).toBeGreaterThan(0);
    roots.forEach(root => {
      expect(root.parents).toEqual([]);
    });
  });

  it('all archetype IDs are unique', () => {
    const ids = ARCHETYPE_DATABASE.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all archetypes have a threshold property', () => {
    ARCHETYPE_DATABASE.forEach(arch => {
      expect(typeof arch.threshold).toBe('number');
      expect(arch.threshold).toBeGreaterThanOrEqual(0);
      expect(arch.threshold).toBeLessThanOrEqual(1);
    });
  });
});
