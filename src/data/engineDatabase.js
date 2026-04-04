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
      'Branded Fusion',
      'Aluber the Jester of Despia',
      'Fallen of Albaz',
    ],
    comboTemplates: [
      {
        name: 'Branded Fusion',
        cards: [{ name: 'Branded Fusion', minInHand: 1 }],
      },
      {
        name: 'Aluber the Jester of Despia',
        cards: [{ name: 'Aluber the Jester of Despia', minInHand: 1 }],
      },
      {
        name: 'Fallen of Albaz',
        cards: [{ name: 'Fallen of Albaz', minInHand: 1 }],
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
