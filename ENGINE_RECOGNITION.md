# Engine Recognition System

When a user uploads a YDK deck file, the app automatically detects known card engines in the deck and pre-populates the combo builder with the relevant combo lines. This removes the need to manually configure combos for well-known archetypes.

## How It Works

1. The YDK is parsed into a `ydkCardCounts` map (`{ cardName: count }`).
2. `ComboRecognitionService.recognizeEngines(ydkCardCounts)` scans the `ENGINE_DATABASE` and returns every engine where **at least one** `identifierCard` is present in the deck.
3. `ComboRecognitionService.buildCombos(matchedEngines, ydkCardCounts, ydkCards)` converts each matched engine's `comboTemplates` into app-state combo objects. Cards in a template that are **not** in the deck are skipped (partial match support), so templates that require cards the user doesn't run are omitted automatically.
4. The resulting combos replace the current combo state and the combo drawer auto-collapses when more than one combo is populated.

## Supported Engines

| Engine | Key Identifier Cards |
|--------|----------------------|
| Fiendsmith | Fiendsmith Engraver, Fiendsmith's Sanct, Fiendsmith's Tract, Lacrima the Crimson Tears |
| Unchained | Abomination's Prison, Unchained Soul of Sharvara, Unchained Twins - Aruha |
| Cyber Dragon | Cyber Emergency, Cyber Repair Plant, Nachster |
| Branded / Despia | Aluber the Jester of Despia, Branded Fusion, Nadir Servant, Fallen of the White Dragon, Branded Opening |
| Snake-Eye | Snake-Eye Ash, Diabellstar the Black Witch, Original Sinful Spoils - Snake-Eye, Snake-Eyes Poplar |
| Gem-Knight | Gem-Knight Quartz, Gem-Knight Nepyrim, Gem-Knight Lazuli |

> **Swordsoul / Tenyi** data exists in `engineDatabase.js` but is commented out pending review.

## Data Schema

Engine data lives in `src/data/engineDatabase.js` and is exported as `ENGINE_DATABASE` — a plain array. `ComboRecognitionService` imports it directly.

### Engine object

```js
{
  name: 'Engine Display Name',

  // Recognition: engine matches if ANY of these cards is in the deck
  identifierCards: ['Card Name A', 'Card Name B'],

  // One entry per distinct combo line to generate
  comboTemplates: [
    {
      name: 'Combo Label (shown in UI)',
      // All cards are AND — every card must appear in the opening hand
      cards: [
        { name: 'Card Name', minInHand: 1 }
      ]
    }
  ]
}
```

### Built combo object (app state shape)

`buildCombos` returns objects that match the shape expected by the combos React state:

```js
{
  id: '<uuid>',
  name: 'Combo Label',
  cards: [
    {
      starterCard: 'Card Name',
      cardId: <number | null>,   // from ydkCards lookup
      isCustom: false,
      startersInDeck: <count>,   // from ydkCardCounts
      minCopiesInHand: 1,        // from template
      maxCopiesInHand: <count>,  // same as startersInDeck
      logicOperator: 'AND'
    }
  ]
}
```

## Adding a New Engine

1. Open `src/data/engineDatabase.js`.
2. Add a new object to the `ENGINE_DATABASE` array following the schema above.
3. Choose `identifierCards` that uniquely signal the engine is present — usually the core starters or the engine's dedicated spell/trap.
4. Add one `comboTemplate` per meaningful combo line (1-card starters, 2-card combos, key extenders, etc.).
5. `minInHand` is almost always `1`; only raise it if a combo genuinely requires multiple copies of the same card in hand simultaneously.
6. No other files need to change — `ComboRecognitionService` reads the database dynamically.

## File Map

| File | Purpose |
|------|---------|
| `src/data/engineDatabase.js` | Engine and combo template definitions |
| `src/services/ComboRecognitionService.js` | Recognition and combo-building logic |
| `src/features/deck-import/YdkImporter.jsx` | Calls recognition on YDK upload and sets combo state |
