/**
 * Engine Database
 *
 * Each engine entry:
 *   - name: display name
 *   - identifierCards: at least one must be present in the deck for recognition
 *   - comboTemplates: one entry per distinct combo
 *
 * Each comboTemplate:
 *   - name: combo label shown in the UI
 *   - cards: all cards are AND — every card must be present to count the combo
 *     - name: exact card name (matched against ydkCardCounts)
 *     - minInHand: minimum copies needed in opening hand
 */

export const ENGINE_DATABASE = [
  // ── Fiendsmith ───────────────────────────────────────────────────────────
  {
    name: 'Fiendsmith',
    identifierCards: [
      'Fiendsmith Engraver',
      "Fiendsmith's Sanct",
      "Fiendsmith's Tract",
      'Lacrima the Crimson Tears',
    ],
    comboTemplates: [
      {
        name: 'Fiendsmith Engraver',
        cards: [{ name: 'Fiendsmith Engraver', minInHand: 1 }],
      },
      {
        name: 'Lacrima the Crimson Tears',
        cards: [{ name: 'Lacrima the Crimson Tears', minInHand: 1 }],
      },
      {
        name: 'Fabled Lurrie',
        cards: [{ name: 'Fabled Lurrie', minInHand: 1 }],
      },
      {
        name: "Fiendsmith's Tract",
        cards: [{ name: "Fiendsmith's Tract", minInHand: 1 }],
      },
      {
        name: "Fiendsmith's Sanct",
        cards: [{ name: "Fiendsmith's Sanct", minInHand: 1 }],
      },
    ],
  },

  // ── Unchained ────────────────────────────────────────────────────────────
  {
    name: 'Unchained',
    identifierCards: [
      "Abomination's Prison",
      'Unchained Soul of Sharvara',
      'Unchained Twins - Aruha',
    ],
    comboTemplates: [
      // 2-card combos
      {
        name: 'Sharvara + Prison',
        cards: [
          { name: 'Unchained Soul of Sharvara', minInHand: 1 },
          { name: "Abomination's Prison", minInHand: 1 },
        ],
      },
      {
        name: 'Aruha + Prison',
        cards: [
          { name: 'Unchained Twins - Aruha', minInHand: 1 },
          { name: "Abomination's Prison", minInHand: 1 },
        ],
      },
      {
        name: 'Prison + Chamber',
        cards: [
          { name: "Abomination's Prison", minInHand: 1 },
          { name: 'Abominable Chamber of the Unchained', minInHand: 1 },
        ],
      },
      {
        name: 'Prison + Escape',
        cards: [
          { name: "Abomination's Prison", minInHand: 1 },
          { name: 'Escape of the Unchained', minInHand: 1 },
        ],
      },
      {
        name: 'Sharvara + Chamber',
        cards: [
          { name: 'Unchained Soul of Sharvara', minInHand: 1 },
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

  // ── Cyber Dragon ─────────────────────────────────────────────────────────
  {
    name: 'Cyber Dragon',
    identifierCards: ['Cyber Emergency', 'Cyber Repair Plant', 'Nachster'],
    comboTemplates: [
      {
        name: 'Cyber Emergency',
        cards: [{ name: 'Cyber Emergency', minInHand: 1 }],
      },
      {
        name: 'Cyber Repair Plant',
        cards: [{ name: 'Cyber Repair Plant', minInHand: 1 }],
      },
      {
        name: 'Nachster',
        cards: [{ name: 'Nachster', minInHand: 1 }],
      },
    ],
  },

  // ── Branded / Despia ─────────────────────────────────────────────────────
  {
    name: 'Branded / Despia',
    identifierCards: [
      'Aluber, the Jester of Despia',
      'Branded Fusion',
      'Nadir Servant',
      'Fallen of the White Dragon',
      'Branded Opening',
    ],
    comboTemplates: [
      // ── 1-card starters ──
      {
        name: 'Aluber, the Jester of Despia',
        cards: [{ name: 'Aluber, the Jester of Despia', minInHand: 1 }],
      },
      {
        name: 'Foolish Burial',
        cards: [{ name: 'Foolish Burial', minInHand: 1 }],
      },
      {
        name: 'Fallen of the White Dragon',
        cards: [{ name: 'Fallen of the White Dragon', minInHand: 1 }],
      },
      {
        name: 'Gold Sarcophagus',
        cards: [{ name: 'Gold Sarcophagus', minInHand: 1 }],
      },
      {
        name: 'Branded Fusion',
        cards: [{ name: 'Branded Fusion', minInHand: 1 }],
      },
      {
        name: 'Branded Opening',
        cards: [{ name: 'Branded Opening', minInHand: 1 }],
      },
      {
        name: 'Springans Kitt',
        cards: [{ name: 'Springans Kitt', minInHand: 1 }],
      },
      {
        name: 'Nadir Servant',
        cards: [{ name: 'Nadir Servant', minInHand: 1 }],
      },
      {
        name: 'Keeper of Dragon Magic',
        cards: [{ name: 'Keeper of Dragon Magic', minInHand: 1 }],
      },
      {
        name: 'Fusion Deployment',
        cards: [{ name: 'Fusion Deployment', minInHand: 1 }],
      },
      {
        name: 'Starliege Seyfert',
        cards: [{ name: 'Starliege Seyfert', minInHand: 1 }],
      },
      // ── 2-card combos ──
      {
        name: 'Aluber + Fusion Deployment',
        cards: [
          { name: 'Aluber, the Jester of Despia', minInHand: 1 },
          { name: 'Fusion Deployment', minInHand: 1 },
        ],
      },
      {
        name: 'Aluber + Fallen of the White Dragon',
        cards: [
          { name: 'Aluber, the Jester of Despia', minInHand: 1 },
          { name: 'Fallen of the White Dragon', minInHand: 1 },
        ],
      },
      {
        name: 'Aluber + Branded Fusion',
        cards: [
          { name: 'Aluber, the Jester of Despia', minInHand: 1 },
          { name: 'Branded Fusion', minInHand: 1 },
        ],
      },
      {
        name: 'Aluber + Bystial Lubellion',
        cards: [
          { name: 'Aluber, the Jester of Despia', minInHand: 1 },
          { name: 'Bystial Lubellion', minInHand: 1 },
        ],
      },
      {
        name: 'Aluber + Springans Saronir',
        cards: [
          { name: 'Aluber, the Jester of Despia', minInHand: 1 },
          { name: 'Springans Saronir', minInHand: 1 },
        ],
      },
      {
        name: 'Fallen of the White Dragon + Bystial Lubellion',
        cards: [
          { name: 'Fallen of the White Dragon', minInHand: 1 },
          { name: 'Bystial Lubellion', minInHand: 1 },
        ],
      },
      {
        name: 'Fallen of the White Dragon + Branded Fusion',
        cards: [
          { name: 'Fallen of the White Dragon', minInHand: 1 },
          { name: 'Branded Fusion', minInHand: 1 },
        ],
      },
      {
        name: 'Quem + Bystial Lubellion',
        cards: [
          { name: 'Quem, the Avatar of Branded', minInHand: 1 },
          { name: 'Bystial Lubellion', minInHand: 1 },
        ],
      },
      {
        name: 'Quem + Springans Saronir',
        cards: [
          { name: 'Quem, the Avatar of Branded', minInHand: 1 },
          { name: 'Springans Saronir', minInHand: 1 },
        ],
      },
      {
        name: 'Branded in High Spirits + Bystial Lubellion',
        cards: [
          { name: 'Branded in High Spirits', minInHand: 1 },
          { name: 'Bystial Lubellion', minInHand: 1 },
        ],
      },
      {
        name: 'Branded in High Spirits + Springans Saronir',
        cards: [
          { name: 'Branded in High Spirits', minInHand: 1 },
          { name: 'Springans Saronir', minInHand: 1 },
        ],
      },
    ],
  },

  // ── Swordsoul / Tenyi (Post-SUDA) ────────────────────────────────────────
  // SUDA additions: Tenyi Spirit - Suruya (already present), Tenyi Spirit - Mula Adhara (Extra Deck),
  // Tenyinfinity (Field Spell — searches Dragon Circle/Vessel, converts to Flawless Perfection).
  // NO true 1-card starters: every combo requires at least 2 cards.
  // Core 2-card lines: (1) Taia + Suruya → Baxia route, (2) Ashuna + Suruya → Mula Adhara route,
  // (3) Mo Ye + Taia/Wyrm. Searchers (Emergence x3, Ecclesia x3, Circle x3, Vessel x1, Tenyinfinity)
  // fetch the missing piece, making them functional openers when paired with a combo card.
  // Longyuan is a mid-combo extender to reach Synchro 10 (not a starter).
  {
    name: 'Swordsoul / Tenyi',
    identifierCards: [
      'Swordsoul of Mo Ye',
      'Swordsoul Strategist Longyuan',
      'Swordsoul Emergence',
      'Heavenly Dragon Circle',
      'Vessel for the Dragon Cycle',
      'Tenyi Spirit - Suruya',
      'Tenyinfinity',
    ],
    comboTemplates: [
      // ── 2-card combos ──
      // Main line 1: Taia + Suruya → Baxia → Chaofeng + Chixiao + Protos
      {
        name: 'Taia + Suruya',
        cards: [
          { name: 'Swordsoul of Taia', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
        ],
      },
      // Main line 2: Ashuna + Suruya → Mula Adhara + Chixiao + Protos + Flawless Perfection
      {
        name: 'Ashuna + Suruya',
        cards: [
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
        ],
      },
      // Classic Mo Ye 2-card combo (Mo Ye reveals Taia → Token + Taia on field)
      {
        name: 'Mo Ye + Taia',
        cards: [
          { name: 'Swordsoul of Mo Ye', minInHand: 1 },
          { name: 'Swordsoul of Taia', minInHand: 1 },
        ],
      },
      // Searcher-enabled 2-card lines
      {
        name: 'Emergence + Suruya',
        cards: [
          { name: 'Swordsoul Emergence', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
        ],
      },
      {
        name: 'Emergence + Ashuna',
        cards: [
          { name: 'Swordsoul Emergence', minInHand: 1 },
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
        ],
      },
      {
        name: 'Emergence + Taia',
        cards: [
          { name: 'Swordsoul Emergence', minInHand: 1 },
          { name: 'Swordsoul of Taia', minInHand: 1 },
        ],
      },
      {
        name: 'Ecclesia + Suruya',
        cards: [
          { name: 'Incredible Ecclesia, the Virtuous', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
        ],
      },
      {
        name: 'Ecclesia + Ashuna',
        cards: [
          { name: 'Incredible Ecclesia, the Virtuous', minInHand: 1 },
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
        ],
      },
      {
        name: 'Ecclesia + Taia',
        cards: [
          { name: 'Incredible Ecclesia, the Virtuous', minInHand: 1 },
          { name: 'Swordsoul of Taia', minInHand: 1 },
        ],
      },
      {
        name: 'Circle + Suruya',
        cards: [
          { name: 'Heavenly Dragon Circle', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
        ],
      },
      {
        name: 'Circle + Ashuna',
        cards: [
          { name: 'Heavenly Dragon Circle', minInHand: 1 },
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
        ],
      },
      {
        name: 'Mo Ye + Ashuna',
        cards: [
          { name: 'Swordsoul of Mo Ye', minInHand: 1 },
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
        ],
      },
      {
        name: 'Mo Ye + Suruya',
        cards: [
          { name: 'Swordsoul of Mo Ye', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
        ],
      },
      {
        name: 'Vessel + Suruya',
        cards: [
          { name: 'Vessel for the Dragon Cycle', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
        ],
      },
      {
        name: 'Tenyinfinity + Suruya',
        cards: [
          { name: 'Tenyinfinity', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
        ],
      },
      {
        name: 'Tenyinfinity + Ashuna',
        cards: [
          { name: 'Tenyinfinity', minInHand: 1 },
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
        ],
      },
      {
        name: 'Ashuna + Shthana',
        cards: [
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
          { name: 'Tenyi Spirit - Shthana', minInHand: 1 },
        ],
      },
      // ── 3-card combos ──
      {
        name: 'Taia + Suruya + Ashuna',
        cards: [
          { name: 'Swordsoul of Taia', minInHand: 1 },
          { name: 'Tenyi Spirit - Suruya', minInHand: 1 },
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
        ],
      },
    ],
  },

  // ── Snake-Eye ────────────────────────────────────────────────────────────
  {
    name: 'Snake-Eye',
    identifierCards: [
      'Snake-Eye Ash',
      'Diabellstar the Black Witch',
      'Original Sinful Spoils - Snake-Eye',
      'Snake-Eyes Poplar',
    ],
    comboTemplates: [
      {
        name: 'Snake-Eye Ash',
        cards: [{ name: 'Snake-Eye Ash', minInHand: 1 }],
      },
      {
        name: 'Diabellstar the Black Witch',
        cards: [{ name: 'Diabellstar the Black Witch', minInHand: 1 }],
      },
      {
        name: 'Original Sinful Spoils - Snake-Eye',
        cards: [{ name: 'Original Sinful Spoils - Snake-Eye', minInHand: 1 }],
      },
      {
        name: 'Snake-Eyes Poplar',
        cards: [{ name: 'Snake-Eyes Poplar', minInHand: 1 }],
      },
    ],
  },

  // ── Gem-Knight ───────────────────────────────────────────────────────────
  {
    name: 'Gem-Knight',
    identifierCards: ['Gem-Knight Quartz', 'Gem-Knight Nepyrim', 'Gem-Knight Lazuli'],
    comboTemplates: [
      {
        name: 'Gem-Knight Quartz',
        cards: [{ name: 'Gem-Knight Quartz', minInHand: 1 }],
      },
      {
        name: 'Gem-Knight Nepyrim',
        cards: [{ name: 'Gem-Knight Nepyrim', minInHand: 1 }],
      },
      {
        name: 'Gem-Knight Lazuli',
        cards: [{ name: 'Gem-Knight Lazuli', minInHand: 1 }],
      },
    ],
  },

  // ── Vanquish Soul / K9 ───────────────────────────────────────────────────
  // VS combos are attribute-driven, not card-name-driven.
  // The key recognition signal is the presence of Rock of the Vanquisher + a VS monster.
  // All VS lines route through the FIRE+DARK hand gate (Sue's CP3).
  {
    name: 'Vanquish Soul K9',
    identifierCards: [
      'Rock of the Vanquisher',
      'Vanquish Soul Razen',
      'Vanquish Soul Hollie Sue',
      'Vanquish Soul Dr. Mad Love',
    ],
    comboTemplates: [
      // 2-card starters — standard lines
      {
        name: 'Razen + Stake Your Soul',
        cards: [
          { name: 'Vanquish Soul Razen', minInHand: 1 },
          { name: 'Stake your Soul!',    minInHand: 1 },
        ],
      },
      {
        name: 'Razen + DARK card (Borger)',
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
        name: 'Razen + Jiaolong',
        cards: [
          { name: 'Vanquish Soul Razen',    minInHand: 1 },
          { name: 'Vanquish Soul Jiaolong', minInHand: 1 },
        ],
      },
      {
        name: 'Razen + Mad Love',
        cards: [
          { name: 'Vanquish Soul Razen',        minInHand: 1 },
          { name: 'Vanquish Soul Dr. Mad Love', minInHand: 1 },
        ],
      },
      {
        name: 'Mad Love + FIRE card (Razen)',
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', minInHand: 1 },
          { name: 'Vanquish Soul Razen',        minInHand: 1 },
        ],
      },
      // 3-card K9 line
      {
        name: 'Mad Love + Sue + Jiaolong (K9)',
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', minInHand: 1 },
          { name: 'Vanquish Soul Hollie Sue',   minInHand: 1 },
          { name: 'Vanquish Soul Jiaolong',     minInHand: 1 },
        ],
      },
      // 1-card starters
      { name: 'Vanquish Soul Razen',        cards: [{ name: 'Vanquish Soul Razen',        minInHand: 1 }] },
      { name: 'Vanquish Soul Dr. Mad Love', cards: [{ name: 'Vanquish Soul Dr. Mad Love', minInHand: 1 }] },
      { name: 'Vanquish Soul Hollie Sue',   cards: [{ name: 'Vanquish Soul Hollie Sue',   minInHand: 1 }] },
    ],
  },

  // ── Chimera ───────────────────────────────────────────────────────────────
  {
    name: 'Chimera',
    identifierCards: [
      'Gazelle the King of Mythical Claws',
      'Mirror Swordknight',
      'Chimera Fusion',
      'Big-Winged Berfomet',
      'Cornfield Coatl',
    ],
    comboTemplates: [
      { name: 'Mirror Swordknight (1-card)',
        cards: [{ name: 'Mirror Swordknight', minInHand: 1 }] },
      { name: 'Gazelle + Mirror',
        cards: [
          { name: 'Gazelle the King of Mythical Claws', minInHand: 1 },
          { name: 'Mirror Swordknight',                 minInHand: 1 },
        ],
      },
      { name: 'Nightmare Apprentice + discard',
        cards: [{ name: 'Nightmare Apprentice', minInHand: 1 }] },
      { name: 'Gazelle + Chimera Fusion',
        cards: [
          { name: 'Gazelle the King of Mythical Claws', minInHand: 1 },
          { name: 'Chimera Fusion',                     minInHand: 1 },
        ],
      },
      { name: 'Gazelle the King of Mythical Claws',
        cards: [{ name: 'Gazelle the King of Mythical Claws', minInHand: 1 }] },
    ],
  },

  // ── Chimera Fiendsmith ────────────────────────────────────────────────────
  {
    name: 'Chimera Fiendsmith',
    identifierCards: [
      'Gazelle the King of Mythical Claws',
      'Mirror Swordknight',
      'Chimera Fusion',
      'Evil HERO Sinister Necrom',
      'Evil HERO Adusted Gold',
    ],
    comboTemplates: [
      { name: 'Nightmare Apprentice + discard (FS)',
        cards: [{ name: 'Nightmare Apprentice', minInHand: 1 }] },
      { name: 'Gazelle + CF/Necrom + discard',
        cards: [
          { name: 'Gazelle the King of Mythical Claws', minInHand: 1 },
          { name: 'Evil HERO Sinister Necrom',          minInHand: 1 },
        ],
      },
      { name: 'Gazelle + Fiendsmith\'s Tract',
        cards: [
          { name: 'Gazelle the King of Mythical Claws', minInHand: 1 },
          { name: "Fiendsmith's Tract",                 minInHand: 1 },
        ],
      },
      { name: 'Gazelle + Fiend/Illusion + discard',
        cards: [
          { name: 'Gazelle the King of Mythical Claws', minInHand: 1 },
          { name: 'Nightmare Apprentice',               minInHand: 1 },
        ],
      },
    ],
  },
];
