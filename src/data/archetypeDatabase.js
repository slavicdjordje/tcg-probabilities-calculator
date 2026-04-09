/**
 * Archetype Database — DAG model
 *
 * Each archetype node:
 *
 *   id            {string}   Unique slug used for parent references.
 *   name          {string}   Display name.
 *   parents       {string[]} IDs of parent archetypes.  Empty array = root node.
 *                            Many-to-many: hybrid nodes list both parents here.
 *   signature     {Array}    Minimum sufficient identifying card set (NOT a full
 *                            deck list).  Each entry: { name, weight }.
 *                              weight 1.0 — uniquely identifies this archetype.
 *                              weight 0.7 — strongly associated, rarely shared.
 *                              weight 0.4 — present in archetype, also in relatives.
 *   threshold     {number}   Minimum confidence in [0, 1] for a deck to match.
 *                            confidence = Σ(present card weights) / Σ(all weights).
 *   comboTemplates {Array}   Same shape as ENGINE_DATABASE comboTemplates.
 *                            Hybrid nodes may add or override templates.
 *
 * Hybrid resolution (performed by ArchetypeRecognitionService):
 *   If ≥2 root/leaf archetypes score ≥ threshold, look for a hybrid node whose
 *   parents contain all matched IDs.  Match it when found; otherwise return an
 *   unknown-hybrid result so callers can route to the unknown-deck flow.
 */

export const ARCHETYPE_DATABASE = [

  // ── Fiendsmith (root) ──────────────────────────────────────────────────────
  {
    id: 'fiendsmith',
    name: 'Fiendsmith',
    parents: [],
    threshold: 0.25,
    signature: [
      { name: 'Fiendsmith Engraver',         weight: 1.0 },
      { name: "Fiendsmith's Sanct",           weight: 1.0 },
      { name: "Fiendsmith's Tract",           weight: 1.0 },
      { name: 'Lacrima the Crimson Tears',    weight: 0.9 },
    ],
    comboTemplates: [
      { name: 'Fiendsmith Engraver',          cards: [{ name: 'Fiendsmith Engraver',        minInHand: 1 }] },
      { name: 'Lacrima the Crimson Tears',    cards: [{ name: 'Lacrima the Crimson Tears',  minInHand: 1 }] },
      { name: 'Fabled Lurrie',                cards: [{ name: 'Fabled Lurrie',              minInHand: 1 }] },
      { name: "Fiendsmith's Tract",           cards: [{ name: "Fiendsmith's Tract",         minInHand: 1 }] },
      { name: "Fiendsmith's Sanct",           cards: [{ name: "Fiendsmith's Sanct",         minInHand: 1 }] },
    ],
  },

  // ── Unchained (root) ──────────────────────────────────────────────────────
  {
    id: 'unchained',
    name: 'Unchained',
    parents: [],
    threshold: 0.25,
    signature: [
      { name: "Abomination's Prison",                   weight: 1.0 },
      { name: 'Unchained Soul of Sharvara',             weight: 1.0 },
      { name: 'Unchained Twins - Aruha',                weight: 1.0 },
      { name: 'Abominable Chamber of the Unchained',    weight: 0.8 },
      { name: 'Escape of the Unchained',                weight: 0.8 },
    ],
    comboTemplates: [
      {
        name: 'Sharvara + Prison',
        cards: [
          { name: 'Unchained Soul of Sharvara', minInHand: 1 },
          { name: "Abomination's Prison",        minInHand: 1 },
        ],
      },
      {
        name: 'Aruha + Prison',
        cards: [
          { name: 'Unchained Twins - Aruha', minInHand: 1 },
          { name: "Abomination's Prison",    minInHand: 1 },
        ],
      },
      {
        name: 'Prison + Chamber',
        cards: [
          { name: "Abomination's Prison",                minInHand: 1 },
          { name: 'Abominable Chamber of the Unchained', minInHand: 1 },
        ],
      },
      {
        name: 'Prison + Escape',
        cards: [
          { name: "Abomination's Prison",    minInHand: 1 },
          { name: 'Escape of the Unchained', minInHand: 1 },
        ],
      },
      {
        name: 'Sharvara + Chamber',
        cards: [
          { name: 'Unchained Soul of Sharvara',          minInHand: 1 },
          { name: 'Abominable Chamber of the Unchained', minInHand: 1 },
        ],
      },
      {
        name: 'Aruha + Escape',
        cards: [
          { name: 'Unchained Twins - Aruha', minInHand: 1 },
          { name: 'Escape of the Unchained', minInHand: 1 },
        ],
      },
    ],
  },

  // ── Cyber Dragon (root) ────────────────────────────────────────────────────
  {
    id: 'cyber-dragon',
    name: 'Cyber Dragon',
    parents: [],
    threshold: 0.3,
    signature: [
      { name: 'Cyber Emergency',   weight: 1.0 },
      { name: 'Cyber Repair Plant', weight: 1.0 },
      { name: 'Nachster',           weight: 1.0 },
    ],
    comboTemplates: [
      { name: 'Cyber Emergency',    cards: [{ name: 'Cyber Emergency',    minInHand: 1 }] },
      { name: 'Cyber Repair Plant', cards: [{ name: 'Cyber Repair Plant', minInHand: 1 }] },
      { name: 'Nachster',           cards: [{ name: 'Nachster',           minInHand: 1 }] },
    ],
  },

  // ── Branded / Despia (root) ────────────────────────────────────────────────
  {
    id: 'branded-despia',
    name: 'Branded / Despia',
    parents: [],
    threshold: 0.2,
    signature: [
      { name: 'Aluber, the Jester of Despia',  weight: 1.0 },
      { name: 'Branded Fusion',                weight: 1.0 },
      { name: 'Nadir Servant',                 weight: 0.9 },
      { name: 'Fallen of the White Dragon',    weight: 0.9 },
      { name: 'Branded Opening',               weight: 0.8 },
      { name: 'Springans Kitt',                weight: 0.7 },
    ],
    comboTemplates: [
      { name: 'Aluber, the Jester of Despia', cards: [{ name: 'Aluber, the Jester of Despia', minInHand: 1 }] },
      { name: 'Foolish Burial',               cards: [{ name: 'Foolish Burial',               minInHand: 1 }] },
      { name: 'Fallen of the White Dragon',   cards: [{ name: 'Fallen of the White Dragon',   minInHand: 1 }] },
      { name: 'Gold Sarcophagus',             cards: [{ name: 'Gold Sarcophagus',             minInHand: 1 }] },
      { name: 'Branded Fusion',               cards: [{ name: 'Branded Fusion',               minInHand: 1 }] },
      { name: 'Branded Opening',              cards: [{ name: 'Branded Opening',              minInHand: 1 }] },
      { name: 'Springans Kitt',               cards: [{ name: 'Springans Kitt',               minInHand: 1 }] },
      { name: 'Nadir Servant',                cards: [{ name: 'Nadir Servant',                minInHand: 1 }] },
      { name: 'Keeper of Dragon Magic',       cards: [{ name: 'Keeper of Dragon Magic',       minInHand: 1 }] },
      { name: 'Fusion Deployment',            cards: [{ name: 'Fusion Deployment',            minInHand: 1 }] },
      { name: 'Starliege Seyfert',            cards: [{ name: 'Starliege Seyfert',            minInHand: 1 }] },
      {
        name: 'Aluber + Fusion Deployment',
        cards: [
          { name: 'Aluber, the Jester of Despia', minInHand: 1 },
          { name: 'Fusion Deployment',             minInHand: 1 },
        ],
      },
      {
        name: 'Aluber + Branded Fusion',
        cards: [
          { name: 'Aluber, the Jester of Despia', minInHand: 1 },
          { name: 'Branded Fusion',                minInHand: 1 },
        ],
      },
      {
        name: 'Fallen of the White Dragon + Branded Fusion',
        cards: [
          { name: 'Fallen of the White Dragon', minInHand: 1 },
          { name: 'Branded Fusion',              minInHand: 1 },
        ],
      },
    ],
  },

  // ── Snake-Eye (root) ───────────────────────────────────────────────────────
  {
    id: 'snake-eye',
    name: 'Snake-Eye',
    parents: [],
    threshold: 0.25,
    signature: [
      { name: 'Snake-Eye Ash',                        weight: 1.0 },
      { name: 'Diabellstar the Black Witch',          weight: 0.9 },
      { name: 'Original Sinful Spoils - Snake-Eye',  weight: 1.0 },
      { name: 'Snake-Eyes Poplar',                   weight: 1.0 },
    ],
    comboTemplates: [
      { name: 'Snake-Eye Ash',                       cards: [{ name: 'Snake-Eye Ash',                       minInHand: 1 }] },
      { name: 'Diabellstar the Black Witch',         cards: [{ name: 'Diabellstar the Black Witch',         minInHand: 1 }] },
      { name: 'Original Sinful Spoils - Snake-Eye',  cards: [{ name: 'Original Sinful Spoils - Snake-Eye', minInHand: 1 }] },
      { name: 'Snake-Eyes Poplar',                   cards: [{ name: 'Snake-Eyes Poplar',                  minInHand: 1 }] },
    ],
  },

  // ── Gem-Knight (root) ──────────────────────────────────────────────────────
  {
    id: 'gem-knight',
    name: 'Gem-Knight',
    parents: [],
    threshold: 0.3,
    signature: [
      { name: 'Gem-Knight Quartz',  weight: 1.0 },
      { name: 'Gem-Knight Nepyrim', weight: 1.0 },
      { name: 'Gem-Knight Lazuli',  weight: 1.0 },
    ],
    comboTemplates: [
      { name: 'Gem-Knight Quartz',  cards: [{ name: 'Gem-Knight Quartz',  minInHand: 1 }] },
      { name: 'Gem-Knight Nepyrim', cards: [{ name: 'Gem-Knight Nepyrim', minInHand: 1 }] },
      { name: 'Gem-Knight Lazuli',  cards: [{ name: 'Gem-Knight Lazuli',  minInHand: 1 }] },
    ],
  },

  // ── Swordsoul / Tenyi (root) ──────────────────────────────────────────────
  // NO true 1-card starters; every combo requires ≥2 cards.
  // Core starters: Mo Ye, Taia, Ashuna, Suruya.  Searchers bridge the gap.
  {
    id: 'swordsoul-tenyi',
    name: 'Swordsoul / Tenyi',
    parents: [],
    threshold: 0.2,
    signature: [
      { name: 'Swordsoul of Mo Ye',              weight: 1.0 },
      { name: 'Swordsoul of Taia',               weight: 1.0 },
      { name: 'Swordsoul Strategist Longyuan',   weight: 1.0 },
      { name: 'Swordsoul Emergence',             weight: 0.9 },
      { name: 'Heavenly Dragon Circle',          weight: 0.9 },
      { name: 'Vessel for the Dragon Cycle',     weight: 0.8 },
      { name: 'Tenyi Spirit - Suruya',           weight: 0.9 },
      { name: 'Tenyinfinity',                    weight: 1.0 },
    ],
    comboTemplates: [
      { name: 'Taia + Suruya',    cards: [{ name: 'Swordsoul of Taia', minInHand: 1 }, { name: 'Tenyi Spirit - Suruya', minInHand: 1 }] },
      { name: 'Ashuna + Suruya',  cards: [{ name: 'Tenyi Spirit - Ashuna', minInHand: 1 }, { name: 'Tenyi Spirit - Suruya', minInHand: 1 }] },
      { name: 'Mo Ye + Taia',     cards: [{ name: 'Swordsoul of Mo Ye', minInHand: 1 }, { name: 'Swordsoul of Taia', minInHand: 1 }] },
      { name: 'Emergence + Suruya', cards: [{ name: 'Swordsoul Emergence', minInHand: 1 }, { name: 'Tenyi Spirit - Suruya', minInHand: 1 }] },
      { name: 'Emergence + Ashuna', cards: [{ name: 'Swordsoul Emergence', minInHand: 1 }, { name: 'Tenyi Spirit - Ashuna', minInHand: 1 }] },
      { name: 'Emergence + Taia',   cards: [{ name: 'Swordsoul Emergence', minInHand: 1 }, { name: 'Swordsoul of Taia', minInHand: 1 }] },
      { name: 'Tenyinfinity + Suruya', cards: [{ name: 'Tenyinfinity', minInHand: 1 }, { name: 'Tenyi Spirit - Suruya', minInHand: 1 }] },
      { name: 'Tenyinfinity + Ashuna', cards: [{ name: 'Tenyinfinity', minInHand: 1 }, { name: 'Tenyi Spirit - Ashuna', minInHand: 1 }] },
    ],
  },

  // ── Vanquish Soul (root) ──────────────────────────────────────────────────
  {
    id: 'vanquish-soul',
    name: 'Vanquish Soul',
    parents: [],
    threshold: 0.25,
    signature: [
      { name: 'Vanquish Soul Razen',          weight: 1.0 },
      { name: 'Vanquish Soul Hollie Sue',     weight: 1.0 },
      { name: 'Rock of the Vanquisher',       weight: 1.0 },
      { name: 'Vanquish Soul Dr. Mad Love',   weight: 0.9 },
      { name: 'Vanquish Soul Heavy Borger',   weight: 0.8 },
      { name: 'Vanquish Soul Caesar Valius',  weight: 0.7 },
      { name: 'Vanquish Soul Start!',         weight: 0.8 },
      { name: 'Vanquish Soul Snow Devil',     weight: 0.7 },
    ],
    comboTemplates: [
      {
        name: 'Razen + Stake Your Soul',
        cards: [
          { name: 'Vanquish Soul Razen', minInHand: 1 },
          { name: 'Stake your Soul!',    minInHand: 1 },
        ],
      },
      {
        name: 'Razen + DARK card',
        cards: [
          { name: 'Vanquish Soul Razen',        minInHand: 1 },
          { name: 'Vanquish Soul Heavy Borger', minInHand: 1 },
        ],
      },
      {
        name: 'Razen + Sue',
        cards: [
          { name: 'Vanquish Soul Razen',      minInHand: 1 },
          { name: 'Vanquish Soul Hollie Sue', minInHand: 1 },
        ],
      },
      {
        name: 'Mad Love + FIRE card',
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', minInHand: 1 },
          { name: 'Vanquish Soul Razen',        minInHand: 1 },
        ],
      },
      { name: 'Vanquish Soul Razen',        cards: [{ name: 'Vanquish Soul Razen',        minInHand: 1 }] },
      { name: 'Vanquish Soul Dr. Mad Love', cards: [{ name: 'Vanquish Soul Dr. Mad Love', minInHand: 1 }] },
      { name: 'Vanquish Soul Hollie Sue',   cards: [{ name: 'Vanquish Soul Hollie Sue',   minInHand: 1 }] },
    ],
  },

  // ── K9 (root) ──────────────────────────────────────────────────────────────
  {
    id: 'k9',
    name: 'K9',
    parents: [],
    threshold: 0.3,
    signature: [
      { name: 'K9-17 Izuna',   weight: 1.0 },
      { name: 'K9-66a Jokul',  weight: 1.0 },
      { name: 'K9-66b Lantern', weight: 0.9 },
      { name: 'K9-04 Noroi',   weight: 0.8 },
      { name: 'K9-ØØ Lupis',   weight: 0.8 },
    ],
    comboTemplates: [
      { name: 'K9-17 Izuna',    cards: [{ name: 'K9-17 Izuna',   minInHand: 1 }] },
      { name: 'K9-66a Jokul',   cards: [{ name: 'K9-66a Jokul',  minInHand: 1 }] },
      { name: 'K9-66b Lantern', cards: [{ name: 'K9-66b Lantern', minInHand: 1 }] },
    ],
  },

  // ══ Hybrid nodes ═══════════════════════════════════════════════════════════
  // Parents list the root archetype IDs that make up the hybrid.
  // Signature is intentionally empty — identification comes from both parent
  // signatures scoring above their thresholds simultaneously.
  // comboTemplates can be empty (the service merges parent templates) or can
  // override/add hybrid-specific combos.

  // ── Snake-Eye + Fiendsmith ─────────────────────────────────────────────────
  {
    id: 'snake-eye-fiendsmith',
    name: 'Snake-Eye + Fiendsmith',
    parents: ['snake-eye', 'fiendsmith'],
    threshold: 0,          // matched via hybrid resolution, not standalone scoring
    signature: [],
    comboTemplates: [],    // inherits both parent template sets via service merge
  },

  // ── Branded / Despia + Fiendsmith ─────────────────────────────────────────
  {
    id: 'branded-despia-fiendsmith',
    name: 'Branded / Despia + Fiendsmith',
    parents: ['branded-despia', 'fiendsmith'],
    threshold: 0,
    signature: [],
    comboTemplates: [],
  },

  // ── Unchained + Fiendsmith ────────────────────────────────────────────────
  {
    id: 'unchained-fiendsmith',
    name: 'Unchained + Fiendsmith',
    parents: ['unchained', 'fiendsmith'],
    threshold: 0,
    signature: [],
    comboTemplates: [],
  },

  // ── Vanquish Soul K9 ──────────────────────────────────────────────────────
  {
    id: 'vanquish-soul-k9',
    name: 'Vanquish Soul K9',
    parents: ['vanquish-soul', 'k9'],
    threshold: 0,
    signature: [],
    comboTemplates: [],  // inherits both parent template sets via service merge
  },

  // ── Chimera (root) ────────────────────────────────────────────────────────
  // GY-state driven deck. Draw Phase Mirror → Big-Wing loop is the core engine.
  // Chimera Fusion + any Beast/Fiend/Illusion is the universal access condition.
  {
    id: 'chimera',
    name: 'Chimera',
    parents: [],
    threshold: 0.25,
    signature: [
      { name: 'Gazelle the King of Mythical Claws', weight: 1.0 },
      { name: 'Mirror Swordknight',                 weight: 1.0 },
      { name: 'Chimera Fusion',                     weight: 1.0 },
      { name: 'Big-Winged Berfomet',                weight: 0.9 },
      { name: 'Cornfield Coatl',                    weight: 0.8 },
      { name: 'Nightmare Apprentice',               weight: 0.8 },
    ],
    comboTemplates: [
      { name: 'Mirror Swordknight (1-card)',
        cards: [{ name: 'Mirror Swordknight', minInHand: 1 }] },
      { name: 'Gazelle + Chimera Fusion',
        cards: [{ name: 'Gazelle the King of Mythical Claws', minInHand: 1 }, { name: 'Chimera Fusion', minInHand: 1 }] },
      { name: 'Gazelle + Mirror Swordknight',
        cards: [{ name: 'Gazelle the King of Mythical Claws', minInHand: 1 }, { name: 'Mirror Swordknight', minInHand: 1 }] },
      { name: 'Nightmare Apprentice + 1 discard',
        cards: [{ name: 'Nightmare Apprentice', minInHand: 1 }] },
      { name: 'Gazelle the King of Mythical Claws',
        cards: [{ name: 'Gazelle the King of Mythical Claws', minInHand: 1 }] },
    ],
  },

  // ── Chimera Frightfur (root) ───────────────────────────────────────────────
  // Chimera + Frightfur Patchwork/Edge Imp Chain floodgate variant.
  // Sets Barrier Statue or Diabellze on opponent's first Main Phase via CF GY banish.
  {
    id: 'chimera-frightfur',
    name: 'Chimera Frightfur',
    parents: [],
    threshold: 0.3,
    signature: [
      { name: 'Gazelle the King of Mythical Claws', weight: 0.8 },
      { name: 'Chimera Fusion',                     weight: 0.9 },
      { name: 'Mirror Swordknight',                 weight: 0.7 },
      { name: 'Frightfur Patchwork',                weight: 1.0 },
      { name: 'Edge Imp Chain',                     weight: 1.0 },
    ],
    comboTemplates: [
      { name: 'Gazelle + Frightfur Patchwork',
        cards: [{ name: 'Gazelle the King of Mythical Claws', minInHand: 1 }, { name: 'Frightfur Patchwork', minInHand: 1 }] },
      { name: 'Gazelle + Edge Imp Chain',
        cards: [{ name: 'Gazelle the King of Mythical Claws', minInHand: 1 }, { name: 'Edge Imp Chain', minInHand: 1 }] },
    ],
  },

  // ── Chimera + Fiendsmith ──────────────────────────────────────────────────
  {
    id: 'chimera-fiendsmith',
    name: 'Chimera Fiendsmith',
    parents: ['chimera', 'fiendsmith'],
    threshold: 0,
    signature: [],
    comboTemplates: [],  // inherits both parent template sets via service merge
  },
];
