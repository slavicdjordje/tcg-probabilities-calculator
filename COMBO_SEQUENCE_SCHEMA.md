# Combo Sequence Data Model

Defined in `src/data/comboSequenceDatabase.js`.  
This schema is the shared contract for combo authoring, delta analysis, and probability calculation.

---

## Top-level sequence

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique slug, e.g. `"fiendsmith-engraver-1c"` |
| `archetypeId` | `string` | References `ARCHETYPE_DATABASE` entry by `id` |
| `name` | `string` | Display name shown in the UI |
| `valid_from` | `string` | ISO-8601 date of earliest banlist where the line is legal, e.g. `"2024-10-01"` |
| `steps` | `Step[]` | Ordered play actions; index 0 = first action |
| `endboard` | `Endboard` | Expected board state after full resolution |
| `chokePoints` | `ChokePoint[]` | Vulnerable moments within the step sequence |
| `weaknesses` | `WeaknessProfile` | Card categories and named cards that break this line |

---

## Step

| Field | Type | Description |
|---|---|---|
| `index` | `number` | 0-based position in the sequence |
| `description` | `string` | Plain-English action, e.g. `"Normal Summon Fiendsmith Engraver"` |
| `tags` | `string[]` | Functional requirement tags from `STEP_TAGS` |
| `cards` | `StepCard[]` | Reference-deck cards that satisfy this step |
| `checkpoint` | `Checkpoint \| null` | Optional. Present when this step is a causal link in the combo chain (see below) |

### STEP_TAGS enum

| Value | Meaning |
|---|---|
| `normal-summon` | Step uses the normal summon for the turn |
| `special-summon` | General special summon |
| `activate-spell` | Spell card activation |
| `activate-trap` | Trap card activation |
| `activate-effect` | Monster / continuous effect activation |
| `search` | Adds a card from deck to hand |
| `send-to-gy` | Sends a card to the graveyard (not as damage) |
| `banish` | Banishes a card |
| `discard` | Discards from hand as cost or effect |
| `special-from-gy` | Special summons from the graveyard |
| `special-from-hand` | Special summons from the hand |
| `special-from-deck` | Special summons directly from the deck |
| `link-summon` | Link summon |
| `synchro-summon` | Synchro summon |
| `xyz-summon` | Xyz summon |
| `fusion-summon` | Fusion summon |
| `ritual-summon` | Ritual summon |
| `set` | Sets a card face-down |
| `attach-material` | Attaches a card as xyz material |
| `detach-material` | Detaches a card from xyz material |

---

## Checkpoint

A checkpoint is a step that satisfies all four of these properties simultaneously:

1. A required board/GY/hand state **gates** the next action — you cannot skip to the following step without the prerequisite in place.
2. Arriving at it **consumes a specific resource** whose absence later breaks the line.
3. The exact state at checkpoint N **causally determines** what is possible at checkpoint N+1 (output of one is the required input of the next).
4. It is the **last window** for a specific interruption (covered by the `chokePoints` array on the sequence).

| Field | Type | Description |
|---|---|---|
| `gateCondition` | `object \| null` | State that must exist **before** this step can fire |
| `gateCondition.zone` | `string` | Zone to check — values from `CHECKPOINT_ZONES` |
| `gateCondition.cards` | `string[]` | Card names that must be present in that zone |
| `gateCondition.description` | `string` | Human-readable gate, e.g. `"Requiem must be on field"` |
| `consumedResource` | `object \| null` | Resource spent at this step that has downstream consequences |
| `consumedResource.card` | `string` | Card name consumed |
| `consumedResource.toZone` | `string` | Zone it moves to |
| `consumedResource.downstreamDependency` | `string` | Why it matters later, e.g. `"Engraver in GY enables SS at step 6"` |
| `intermediateState` | `object \| null` | Board snapshot immediately after this step resolves |
| `intermediateState.field` | `string[]` | Cards on field |
| `intermediateState.gy` | `string[]` | Cards in GY |
| `intermediateState.hand` | `string[]` | Cards in hand |
| `causesCheckpointAt` | `number \| null` | Step index whose `gateCondition` the state created here satisfies |

### CHECKPOINT_ZONES enum

| Value | Meaning |
|---|---|
| `field` | Monster zone or spell/trap zone |
| `gy` | Graveyard |
| `hand` | Hand |
| `banished` | Banished zone |
| `deck` | Main deck |

### Causal chain model

Checkpoints are not isolated moments — they are linked. The intermediate state produced at checkpoint N is the required input for checkpoint N+1:

```
Step 2 (Requiem on field) ──causesCheckpointAt:3──► Step 3 gateCondition (Requiem on field)
Step 3 (Requiem in GY)    ──causesCheckpointAt:5──► Step 5 gateCondition (Requiem in GY)
Step 5 (Lacrima in GY)    ──causesCheckpointAt:8──► Step 8 gateCondition (Lacrima + Engraver in GY)
Step 7 (Engraver in GY)   ──causesCheckpointAt:8──► Step 8 gateCondition (same)
```

The delta between entry paths into the same checkpoint is entirely expressed as differences in GY/hand/field state at that checkpoint. If an alternate entry skips a checkpoint, the downstream requirement that checkpoint satisfied cannot be met.

---

## StepCard

| Field | Type | Values |
|---|---|---|
| `name` | `string` | Card name matching `cardDatabase` keys |
| `role` | `string` | `"activator"` \| `"material"` \| `"cost"` \| `"target"` |
| `fromZone` | `string` | `"hand"` \| `"deck"` \| `"gy"` \| `"field"` \| `"banished"` \| `"extra"` |
| `toZone` | `string` | Same values as `fromZone` |

---

## Endboard

| Field | Type | Description |
|---|---|---|
| `field` | `string[]` | Card names expected on field after full combo resolution |
| `gy` | `string[]` | Card names expected in GY after full combo resolution |
| `hand` | `string[]` | Card names remaining in hand after full combo resolution |
| `notes` | `string` | Optional plain-English summary |

---

## ChokePoint

| Field | Type | Description |
|---|---|---|
| `afterStepIndex` | `number` | Combo is interruptible **after** this step index resolves |
| `interruptCategories` | `string[]` | Types of interrupts from `INTERRUPT_CATEGORIES` |
| `description` | `string` | Plain-English context |

### INTERRUPT_CATEGORIES enum

| Value | Meaning |
|---|---|
| `negate-summon` | Negate a summon (Solemn Judgment, etc.) |
| `negate-effect` | Negate a monster effect in hand or on field |
| `negate-spell` | Negate a spell activation |
| `negate-trap` | Negate a trap activation |
| `banish-from-gy` | Banish a card from the GY (D.D. Crow, etc.) |
| `banish-hand` | Banish from the hand |
| `banish-field` | Banish from the field |
| `bounce` | Return to hand / extra deck |
| `destroy` | Destroy a card on field |
| `change-control` | Take control of an opponent's card |
| `hand-trap` | Generic hand-trap disruption |
| `counter-trap` | Spell Speed 3 counter trap |

---

## WeaknessProfile

| Field | Type | Description |
|---|---|---|
| `breakingCategories` | `string[]` | Broad categories from `BREAKING_CATEGORIES` |
| `namedCounters` | `string[]` | Specific card names that counter this combo |
| `notes` | `string` | Optional context |

### BREAKING_CATEGORIES enum

| Value | Meaning |
|---|---|
| `hand-trap` | Disrupted by a hand trap |
| `gy-banish` | Graveyard banish (D.D. Crow, etc.) |
| `spell-trap-removal` | Removal of a key spell or trap |
| `monster-negation` | Monster effect negated |
| `summon-negation` | Summon negated |
| `board-wipe` | Mass destruction (Dark Hole, etc.) |
| `anti-special-summon` | Banishes, locks, or prevents special summons |
| `banish-zone-lock` | Prevents banished cards from being accessed |
| `graveyard-lock` | Prevents GY interaction (Macro Cosmos, etc.) |
| `spell-speed-3` | Counter trap stops an effect on the chain |

---

## Relationship to other models

```
ARCHETYPE_DATABASE (archetypeDatabase.js)
  └── archetypeId ──► COMBO_SEQUENCE_DATABASE (comboSequenceDatabase.js)
                          ├── steps[].cards[].name ──► cardDatabase
                          ├── endboard.field / gy / hand ──► cardDatabase
                          └── weaknesses.namedCounters ──► cardDatabase
```

- `archetypeId` must match an `id` in `ARCHETYPE_DATABASE`.
- Card names in `steps`, `endboard`, and `weaknesses.namedCounters` must resolve in `cardDatabase` (from Vercel Blob or YGOPro API).
- `valid_from` is compared against the current banlist date to filter stale sequences.

---

## Adding a new sequence

1. Open `src/data/comboSequenceDatabase.js`.
2. Add an entry to `COMBO_SEQUENCE_DATABASE` following the schema above.
3. Set `archetypeId` to an existing `id` in `ARCHETYPE_DATABASE`; add the archetype first if missing.
4. List every step in play order with a plain-English `description`, applicable `tags`, and the `cards` involved.
5. Populate `endboard` with the realistic board after the line resolves cleanly.
6. Add `chokePoints` for every moment an opponent can meaningfully interrupt.
7. Fill `weaknesses` with both broad `breakingCategories` and the most commonly played `namedCounters`.
8. Set `valid_from` to the ISO-8601 start date of the banlist where the line became legal.
9. For key steps, add a `checkpoint` object to model the causal chain: gate conditions, consumed resources, board state snapshots, and the causal link to the next gated step. All fields are nullable — omit `checkpoint` entirely on steps that are not causal links.
