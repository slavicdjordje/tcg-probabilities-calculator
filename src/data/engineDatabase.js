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

  // ── Swordsoul / Tenyi ────────────────────────────────────────────────────
  {
    name: 'Swordsoul / Tenyi',
    identifierCards: [
      'Swordsoul of Mo Ye',
      'Swordsoul Strategist Longyuan',
      'Swordsoul Emergence',
      'Heavenly Dragon Circle',
      'Vessel for the Dragon Cycle',
    ],
    comboTemplates: [
      // ── 1-card starters ──
      {
        name: 'Swordsoul of Mo Ye',
        cards: [{ name: 'Swordsoul of Mo Ye', minInHand: 1 }],
      },
      {
        name: 'Swordsoul Strategist Longyuan',
        cards: [{ name: 'Swordsoul Strategist Longyuan', minInHand: 1 }],
      },
      {
        name: 'Incredible Ecclesia, the Virtuous',
        cards: [{ name: 'Incredible Ecclesia, the Virtuous', minInHand: 1 }],
      },
      {
        name: 'Swordsoul Emergence',
        cards: [{ name: 'Swordsoul Emergence', minInHand: 1 }],
      },
      {
        name: 'Heavenly Dragon Circle',
        cards: [{ name: 'Heavenly Dragon Circle', minInHand: 1 }],
      },
      {
        name: 'Vessel for the Dragon Cycle',
        cards: [{ name: 'Vessel for the Dragon Cycle', minInHand: 1 }],
      },
      {
        name: 'Tenyi Spirit - Ashuna',
        cards: [{ name: 'Tenyi Spirit - Ashuna', minInHand: 1 }],
      },
      {
        name: 'Tenyi Spirit - Shthana',
        cards: [{ name: 'Tenyi Spirit - Shthana', minInHand: 1 }],
      },
      {
        name: 'Tenyi Spirit - Vishuda',
        cards: [{ name: 'Tenyi Spirit - Vishuda', minInHand: 1 }],
      },
      // ── 2-card combos ──
      {
        name: 'Mo Ye + Ecclesia',
        cards: [
          { name: 'Swordsoul of Mo Ye', minInHand: 1 },
          { name: 'Incredible Ecclesia, the Virtuous', minInHand: 1 },
        ],
      },
      {
        name: 'Longyuan + Ecclesia',
        cards: [
          { name: 'Swordsoul Strategist Longyuan', minInHand: 1 },
          { name: 'Incredible Ecclesia, the Virtuous', minInHand: 1 },
        ],
      },
      {
        name: 'Ashuna + Shthana',
        cards: [
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
          { name: 'Tenyi Spirit - Shthana', minInHand: 1 },
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
        name: 'Mo Ye + Taia',
        cards: [
          { name: 'Swordsoul of Mo Ye', minInHand: 1 },
          { name: 'Swordsoul of Taia', minInHand: 1 },
        ],
      },
      {
        name: 'Emergence + Ecclesia',
        cards: [
          { name: 'Swordsoul Emergence', minInHand: 1 },
          { name: 'Incredible Ecclesia, the Virtuous', minInHand: 1 },
        ],
      },
      // ── 3-card combo ──
      {
        name: 'Ashuna + Shthana + Adhara',
        cards: [
          { name: 'Tenyi Spirit - Ashuna', minInHand: 1 },
          { name: 'Tenyi Spirit - Shthana', minInHand: 1 },
          { name: 'Tenyi Spirit - Adhara', minInHand: 1 },
        ],
      },
      // ── Extenders ──
      {
        name: 'Swordsoul of Taia',
        cards: [{ name: 'Swordsoul of Taia', minInHand: 1 }],
      },
      {
        name: 'Tenyi Spirit - Adhara',
        cards: [{ name: 'Tenyi Spirit - Adhara', minInHand: 1 }],
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
];
