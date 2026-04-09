/**
 * Combo Sequence Database
 *
 * A combo sequence captures the full play-by-play of a known combo line,
 * including its endboard, choke points, and weakness profile.  This data
 * contract is shared by combo authoring, delta analysis, and probability
 * calculation.
 *
 * ── Top-level sequence object ────────────────────────────────────────────────
 *
 *   id              {string}        Unique slug, e.g. "fiendsmith-engraver-1c".
 *   archetypeId     {string}        References ARCHETYPE_DATABASE entry by id.
 *   name            {string}        Display name shown in the UI.
 *   valid_from      {string}        ISO-8601 date of the earliest banlist where
 *                                   this line is legal, e.g. "2024-10-01".
 *   steps           {Step[]}        Ordered play actions; index 0 = first action.
 *   endboard        {Endboard}      Expected board state after full resolution.
 *   chokePoints     {ChokePoint[]}  Vulnerable moments within the step sequence.
 *   weaknesses      {WeaknessProfile}
 *
 * ── Step ─────────────────────────────────────────────────────────────────────
 *
 *   index           {number}    0-based position in the sequence.
 *   description     {string}    Plain-English action, e.g.
 *                               "Normal Summon Fiendsmith Engraver".
 *   tags            {string[]}  Functional requirement tags drawn from STEP_TAGS.
 *   cards           {StepCard[]} Reference-deck cards that satisfy this step.
 *   checkpoint      {Checkpoint|null}  Optional. Present when this step is a
 *                               causal link in the combo chain — it gates what
 *                               follows, consumes a load-bearing resource, and
 *                               defines the last window for a specific interrupt.
 *
 * ── Checkpoint ───────────────────────────────────────────────────────────────
 *
 *   gateCondition   {object|null}  State that must exist BEFORE this step fires.
 *     .zone           {string}    "field" | "gy" | "hand" | "banished"
 *     .cards          {string[]}  Card names that must be in that zone.
 *     .description    {string}    Human-readable gate, e.g. "Requiem must be on field".
 *
 *   consumedResource {object|null}  Resource spent at this step that matters later.
 *     .card           {string}    Card name consumed here.
 *     .toZone         {string}    Zone it moves to ("gy" | "banished" | "hand" | "deck").
 *     .downstreamDependency {string}  Why it matters: e.g. "Engraver in GY lets it SS at step 6".
 *
 *   intermediateState {object|null}  Board snapshot immediately after this step resolves.
 *     .field          {string[]}
 *     .gy             {string[]}
 *     .hand           {string[]}
 *
 *   causesCheckpointAt {number|null}  Step index whose gate condition this state satisfies.
 *
 * ── StepCard ─────────────────────────────────────────────────────────────────
 *
 *   name            {string}    Card name matching cardDatabase keys.
 *   role            {string}    "activator" | "material" | "cost" | "target"
 *   fromZone        {string}    "hand" | "deck" | "gy" | "field" | "banished"
 *   toZone          {string}    Zone the card occupies after this step resolves.
 *                               Same values as fromZone, or "banished" / "gy".
 *
 * ── Endboard ─────────────────────────────────────────────────────────────────
 *
 *   field           {string[]}  Card names expected on field after combo.
 *   gy              {string[]}  Card names expected in GY after combo.
 *   hand            {string[]}  Card names remaining in hand after combo.
 *   notes           {string}    Optional plain-English summary.
 *
 * ── ChokePoint ───────────────────────────────────────────────────────────────
 *
 *   afterStepIndex  {number}    Combo is interruptible AFTER this step resolves.
 *   interruptCategories {string[]}  Drawn from INTERRUPT_CATEGORIES.
 *   description     {string}    Plain-English context.
 *
 * ── WeaknessProfile ──────────────────────────────────────────────────────────
 *
 *   breakingCategories {string[]}  Broad categories drawn from BREAKING_CATEGORIES.
 *   namedCounters   {string[]}  Specific card names that shut down the line.
 *   notes           {string}    Optional context.
 */

// ── Enumerations ─────────────────────────────────────────────────────────────

/**
 * Functional tags that describe what a step does.
 * Multiple tags may apply to a single step.
 */
export const STEP_TAGS = /** @type {const} */ ({
  NORMAL_SUMMON:    'normal-summon',
  SPECIAL_SUMMON:   'special-summon',
  TRIBUTE_SUMMON:   'tribute-summon',
  ACTIVATE_SPELL:   'activate-spell',
  ACTIVATE_TRAP:    'activate-trap',
  ACTIVATE_EFFECT:  'activate-effect',
  SEARCH:           'search',
  SEND_TO_GY:       'send-to-gy',
  BANISH:           'banish',
  DISCARD:          'discard',
  SPECIAL_FROM_GY:  'special-from-gy',
  SPECIAL_FROM_HAND:'special-from-hand',
  SPECIAL_FROM_DECK:'special-from-deck',
  LINK_SUMMON:      'link-summon',
  SYNCHRO_SUMMON:   'synchro-summon',
  XYZ_SUMMON:       'xyz-summon',
  FUSION_SUMMON:    'fusion-summon',
  RITUAL_SUMMON:    'ritual-summon',
  SET:              'set',
  ATTACH_MATERIAL:  'attach-material',
  DETACH_MATERIAL:  'detach-material',
});

/**
 * Interrupt categories — types of disruption that can be applied at a choke point.
 */
export const INTERRUPT_CATEGORIES = /** @type {const} */ ({
  NEGATE_SUMMON:      'negate-summon',
  NEGATE_EFFECT:      'negate-effect',
  NEGATE_SPELL:       'negate-spell',
  NEGATE_TRAP:        'negate-trap',
  BANISH_FROM_GY:     'banish-from-gy',
  BANISH_HAND:        'banish-hand',
  BANISH_FIELD:       'banish-field',
  BOUNCE:             'bounce',
  DESTROY:            'destroy',
  CHANGE_CONTROL:     'change-control',
  HAND_TRAP:          'hand-trap',
  COUNTER_TRAP:       'counter-trap',
});

/**
 * Zones referenced in checkpoint gate conditions and consumed-resource targets.
 */
export const CHECKPOINT_ZONES = /** @type {const} */ ({
  FIELD:    'field',
  GY:       'gy',
  HAND:     'hand',
  BANISHED: 'banished',
  DECK:     'deck',
});

/**
 * Broad breaking categories for weakness profiles.
 */
export const BREAKING_CATEGORIES = /** @type {const} */ ({
  HAND_TRAP:              'hand-trap',
  GY_BANISH:              'gy-banish',
  SPELL_TRAP_REMOVAL:     'spell-trap-removal',
  MONSTER_NEGATION:       'monster-negation',
  SUMMON_NEGATION:        'summon-negation',
  BOARD_WIPE:             'board-wipe',
  ANTI_SPECIAL_SUMMON:    'anti-special-summon',
  BANISH_ZONE_LOCK:       'banish-zone-lock',
  GRAVEYARD_LOCK:         'graveyard-lock',
  SPELL_SPEED_3:          'spell-speed-3',
});

// ── Database ──────────────────────────────────────────────────────────────────

/**
 * COMBO_SEQUENCE_DATABASE — authoritative list of combo sequences.
 *
 * Entries are added per archetype as sequences are authored.  The database is
 * intentionally sparse at launch; unknown archetypes fall back to the engine /
 * archetype combo template system.
 */
export const COMBO_SEQUENCE_DATABASE = [

  // ── Fiendsmith ────────────────────────────────────────────────────────────

  {
    id: 'fiendsmith-engraver-1c',
    archetypeId: 'fiendsmith',
    name: 'Fiendsmith Engraver (1-card)',
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: "Activate Fiendsmith Engraver's hand effect: discard Engraver to add Fiendsmith's Tract from deck to hand.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Fiendsmith Engraver',   role: 'activator', fromZone: 'hand', toZone: 'gy'   },
          { name: "Fiendsmith's Tract",    role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Fiendsmith Engraver',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Engraver in GY is required at step 6 to SS itself and return Lurrie to the deck.',
          },
          intermediateState: null,
          causesCheckpointAt: 6,
        },
      },
      {
        index: 1,
        description: "Activate Fiendsmith's Tract: add Fabled Lurrie from deck to hand, then send Fabled Lurrie and Tract to GY.",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SEARCH, STEP_TAGS.SEND_TO_GY],
        cards: [
          { name: "Fiendsmith's Tract", role: 'activator', fromZone: 'hand', toZone: 'gy'   },
          { name: 'Fabled Lurrie',      role: 'target',    fromZone: 'deck', toZone: 'gy'   },
        ],
      },
      {
        index: 2,
        description: "Activate Fabled Lurrie's GY effect to Special Summon itself. Link Summon Fiendsmith's Requiem using Fabled Lurrie.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: 'Fabled Lurrie',          role: 'activator', fromZone: 'gy',    toZone: 'gy'    },
          { name: "Fiendsmith's Requiem",   role: 'target',    fromZone: 'extra',  toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.GY,
            cards: ['Fabled Lurrie'],
            description: "Fabled Lurrie must be in GY to activate its SS effect and serve as Link material for Requiem.",
          },
          consumedResource: {
            card: 'Fabled Lurrie',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: "Lurrie in GY after this is inert until Engraver's step 6 effect returns it to the deck top.",
          },
          intermediateState: {
            field: ["Fiendsmith's Requiem"],
            gy: ['Fiendsmith Engraver', "Fiendsmith's Tract", 'Fabled Lurrie'],
            hand: [],
          },
          causesCheckpointAt: 3,
        },
      },
      {
        index: 3,
        description: "Activate Fiendsmith's Requiem's effect: send itself to GY to Special Summon Lacrima the Crimson Tears from deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK, STEP_TAGS.SEND_TO_GY],
        cards: [
          { name: "Fiendsmith's Requiem",       role: 'activator', fromZone: 'field', toZone: 'gy'    },
          { name: 'Lacrima the Crimson Tears',  role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ["Fiendsmith's Requiem"],
            description: "Requiem must be on field. Without it, Lacrima cannot be Special Summoned from deck.",
          },
          consumedResource: {
            card: "Fiendsmith's Requiem",
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: "Requiem in GY is the only way to trigger its GY equip effect at step 5, which makes Lacrima available as Link material for Necroquip Princess.",
          },
          intermediateState: {
            field: ['Lacrima the Crimson Tears'],
            gy: ['Fiendsmith Engraver', "Fiendsmith's Tract", 'Fabled Lurrie', "Fiendsmith's Requiem"],
            hand: [],
          },
          causesCheckpointAt: 5,
        },
      },
      {
        index: 4,
        description: "Activate Lacrima the Crimson Tears' effect: send Fiendsmith in Paradise from deck to GY.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEND_TO_GY],
        cards: [
          { name: 'Lacrima the Crimson Tears', role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Fiendsmith in Paradise',    role: 'cost',      fromZone: 'deck',  toZone: 'gy'    },
        ],
      },
      {
        index: 5,
        description: "Activate Fiendsmith's Requiem from GY: equip itself to Lacrima. Use Lacrima (equipped with Requiem) to Link Summon Necroquip Princess.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: "Fiendsmith's Requiem",  role: 'activator', fromZone: 'gy',    toZone: 'gy'    },
          { name: 'Lacrima the Crimson Tears', role: 'material', fromZone: 'field', toZone: 'gy'   },
          { name: 'Necroquip Princess',    role: 'target',    fromZone: 'extra',  toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.GY,
            cards: ["Fiendsmith's Requiem"],
            description: "Requiem must be in GY to activate its equip effect. Without it, Lacrima cannot be used as Link material and the path to Necroquip Princess is closed.",
          },
          consumedResource: {
            card: 'Lacrima the Crimson Tears',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: "Lacrima in GY is one of the two required cards Sequence returns to deck top at step 8. If Lacrima never reached GY here, step 8's cost cannot be paid.",
          },
          intermediateState: null,
          causesCheckpointAt: 8,
        },
      },
      {
        index: 6,
        description: "Activate Fiendsmith Engraver from GY: return Fabled Lurrie from GY to top of deck. Special Summon Engraver from GY.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_GY],
        cards: [
          { name: 'Fiendsmith Engraver', role: 'activator', fromZone: 'gy', toZone: 'field' },
          { name: 'Fabled Lurrie',       role: 'target',    fromZone: 'gy', toZone: 'deck'  },
        ],
      },
      {
        index: 7,
        description: "Link Summon Fiendsmith's Sequence using Fiendsmith Engraver and Necroquip Princess.",
        tags: [STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: 'Fiendsmith Engraver',      role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Necroquip Princess',        role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: "Fiendsmith's Sequence",    role: 'target',   fromZone: 'extra',  toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Fiendsmith Engraver',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: "Engraver in GY is the second card Sequence must return to deck top at step 8. Lacrima (from step 5) and Engraver must both be in GY simultaneously for the cost to resolve.",
          },
          intermediateState: {
            field: ["Fiendsmith's Sequence"],
            gy: [
              'Fiendsmith Engraver', "Fiendsmith's Tract", 'Fabled Lurrie',
              "Fiendsmith's Requiem", 'Lacrima the Crimson Tears', 'Fiendsmith in Paradise',
              'Necroquip Princess',
            ],
            hand: [],
          },
          causesCheckpointAt: 8,
        },
      },
      {
        index: 8,
        description: "Activate Fiendsmith's Sequence: return Lacrima and Engraver from GY to top of deck, then Special Summon Aerial Eater from Extra Deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_SUMMON],
        cards: [
          { name: "Fiendsmith's Sequence", role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Aerial Eater',          role: 'target',    fromZone: 'extra',  toZone: 'field' },
          { name: 'Lacrima the Crimson Tears', role: 'cost', fromZone: 'gy',    toZone: 'deck'  },
          { name: 'Fiendsmith Engraver',    role: 'cost',    fromZone: 'gy',    toZone: 'deck'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.GY,
            cards: ['Lacrima the Crimson Tears', 'Fiendsmith Engraver'],
            description: "Both Lacrima and Engraver must be in GY simultaneously. Lacrima arrives via step 5 (Link material cost); Engraver arrives via step 7 (Link material cost). If either path was broken or the entry was via a different route, this cost cannot be paid and Aerial Eater cannot be summoned.",
          },
          consumedResource: null,
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 9,
        description: "Activate Aerial Eater's effect: send Unchained Soul of Sharvara from deck to GY.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEND_TO_GY],
        cards: [
          { name: 'Aerial Eater',                 role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Unchained Soul of Sharvara',   role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
        ],
      },
      {
        index: 10,
        description: "Activate Unchained Soul of Sharvara from GY: place Abominable Chamber of the Unchained from deck face-down in a Spell/Trap zone.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SET],
        cards: [
          { name: 'Unchained Soul of Sharvara',            role: 'activator', fromZone: 'gy',   toZone: 'gy'    },
          { name: 'Abominable Chamber of the Unchained',   role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
      },
      {
        index: 11,
        description: "Link Summon Unchained Soul Lord of Yama using Fiendsmith's Sequence and Aerial Eater.",
        tags: [STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: "Fiendsmith's Sequence",         role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Aerial Eater',                  role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Unchained Soul Lord of Yama',   role: 'target',   fromZone: 'extra',  toZone: 'field' },
        ],
      },
      {
        index: 12,
        description: "Activate Unchained Soul Lord of Yama's effect: add Unchained Twins - Aruha from deck to hand.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Unchained Soul Lord of Yama', role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Unchained Twins - Aruha',     role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
      },
      {
        index: 13,
        description: "Activate Unchained Twins - Aruha's hand effect targeting the set Chamber: Chamber goes to GY, Aruha Special Summons from hand. Chamber GY effect Special Summons Unchained Twins - Sarama from deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Unchained Twins - Aruha',               role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Abominable Chamber of the Unchained',   role: 'cost',      fromZone: 'field', toZone: 'gy'    },
          { name: 'Unchained Twins - Sarama',              role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
      },
      {
        index: 14,
        description: "Sarama's effect resets Abominable Chamber face-down from GY. Aruha's GY effect Special Summons Unchained Soul of Shyama from deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SET, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Unchained Twins - Sarama',              role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Abominable Chamber of the Unchained',   role: 'target',    fromZone: 'gy',    toZone: 'field' },
          { name: 'Unchained Soul of Shyama',              role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
      },
      {
        index: 15,
        description: "Use Unchained Soul of Shyama and Unchained Soul Lord of Yama to Link Summon Unchained Soul of Rage. Shyama's GY effect Special Summons itself back. Rage's GY effect returns Sharvara from GY to hand.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Unchained Soul of Shyama',        role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Unchained Soul Lord of Yama',     role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Unchained Soul of Rage',          role: 'target',    fromZone: 'extra',  toZone: 'field' },
          { name: 'Unchained Soul of Shyama',        role: 'activator', fromZone: 'gy',    toZone: 'field' },
          { name: 'Unchained Soul of Sharvara',      role: 'target',    fromZone: 'gy',    toZone: 'hand'  },
        ],
      },
      {
        index: 16,
        description: "Shyama on field sends Unchained Twins - Sarama to GY. Sarama's GY effect Special Summons Unchained Soul of Sharvara from deck. XYZ Summon D/D/D Wave High King Caesar using Shyama and Sharvara.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEND_TO_GY, STEP_TAGS.SPECIAL_FROM_DECK, STEP_TAGS.XYZ_SUMMON],
        cards: [
          { name: 'Unchained Soul of Shyama',        role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Unchained Twins - Sarama',        role: 'cost',      fromZone: 'field', toZone: 'gy'    },
          { name: 'Unchained Soul of Sharvara',      role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'D/D/D Wave High King Caesar',     role: 'target',    fromZone: 'extra',  toZone: 'field' },
        ],
      },
    ],

    endboard: {
      field: ['D/D/D Wave High King Caesar'],
      gy: [
        'Fiendsmith Engraver', "Fiendsmith's Tract", 'Fabled Lurrie',
        "Fiendsmith's Requiem", 'Lacrima the Crimson Tears', 'Fiendsmith in Paradise',
        'Necroquip Princess', "Fiendsmith's Sequence", 'Aerial Eater',
        'Unchained Soul Lord of Yama', 'Unchained Twins - Aruha',
        'Unchained Twins - Sarama', 'Unchained Soul of Rage', 'Unchained Soul of Shyama',
      ],
      hand: ['Unchained Soul of Sharvara'],
      notes: 'D/D/D Wave High King Caesar on field with Abominable Chamber set and Sharvara in hand. Full Unchained follow-up available.',
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [
          INTERRUPT_CATEGORIES.NEGATE_EFFECT,
          INTERRUPT_CATEGORIES.HAND_TRAP,
        ],
        description: "Ash Blossom negates Engraver's hand effect, stopping the entire line.",
      },
      {
        afterStepIndex: 1,
        interruptCategories: [
          INTERRUPT_CATEGORIES.NEGATE_SPELL,
          INTERRUPT_CATEGORIES.BANISH_FROM_GY,
        ],
        description: "Ash Blossom stops Tract's search. D.D. Crow on Fabled Lurrie in GY halts step 2.",
      },
      {
        afterStepIndex: 3,
        interruptCategories: [
          INTERRUPT_CATEGORIES.NEGATE_EFFECT,
          INTERRUPT_CATEGORIES.BANISH_FROM_GY,
        ],
        description: "Interrupting Requiem's effect or banishing it from GY before it can set collapses the line.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.GY_BANISH,
        BREAKING_CATEGORIES.GRAVEYARD_LOCK,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'D.D. Crow',
        'Dimensional Barrier',
        'Bystial Magnumut',
        'Bystial Druiswurm',
      ],
      notes: 'Almost every step is GY-dependent. A single GY banish at the right moment (Lurrie, Requiem, or Sharvara) can end the line.',
    },
  },

  // ── Unchained ─────────────────────────────────────────────────────────────

  {
    id: 'unchained-sharvara-prison-2c',
    archetypeId: 'unchained',
    name: 'Sharvara + Prison (2-card)',
    valid_from: '2023-01-01',

    steps: [
      {
        index: 0,
        description: "Activate Abomination's Prison to Special Summon Unchained Soul of Sharvara from deck.",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: "Abomination's Prison",         role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Unchained Soul of Sharvara',   role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
      },
      {
        index: 1,
        description: 'Activate Unchained Soul of Sharvara effect: destroy one card you control to Special Summon an Unchained monster from the deck.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Unchained Soul of Sharvara',          role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: "Abomination's Prison",                role: 'cost',      fromZone: 'field', toZone: 'gy'    },
        ],
      },
      {
        index: 2,
        description: 'Link Summon Unchained Soul of Rage using Sharvara and the recruited monster.',
        tags: [STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: 'Unchained Soul of Rage', role: 'target', fromZone: 'extra', toZone: 'field' },
        ],
      },
    ],

    endboard: {
      field: ['Unchained Soul of Rage'],
      gy: ["Abomination's Prison", 'Unchained Soul of Sharvara'],
      hand: [],
      notes: 'Rage on field with GY fodder for follow-up Unchained effects.',
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [
          INTERRUPT_CATEGORIES.NEGATE_SPELL,
          INTERRUPT_CATEGORIES.NEGATE_SUMMON,
          INTERRUPT_CATEGORIES.HAND_TRAP,
        ],
        description: "Ash Blossom negates Prison's search; Solemn Judgment negates Sharvara's Special Summon.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
        BREAKING_CATEGORIES.SPELL_TRAP_REMOVAL,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Solemn Judgment',
        'Called by the Grave',
      ],
      notes: 'Two-card combo is resilient but still collapses to a timely Ash on Prison.',
    },
  },

  // ── Vanquish Soul K9 ─────────────────────────────────────────────────────
  //
  // VS checkpoints are HAND-STATE gates, not field/GY gates.
  // The key resource at each checkpoint is attribute availability in hand.
  // All standard lines converge at CP3 (FIRE+DARK gate for Sue's SS from deck).
  // The K9 branch (Line G) diverges at CP4 when the player extends past 4 summons.
  //
  // Tag Out (Quick Effect) returns a targeted VS to hand and replaces it with a
  // Tagger — this deliberately dodges Imperm/Veiler targeting the NS monster.

  // ── Line A — Razen + Stake Your Soul ─────────────────────────────────────

  {
    id: 'vs-k9-line-a',
    archetypeId: 'vanquish-soul-k9',
    name: 'Line A — Razen + Stake Your Soul',
    valid_from: '2024-07-01',

    steps: [
      {
        index: 0,
        description: "Normal Summon Vanquish Soul Razen. Razen's on-summon effect: search Vanquish Soul Heavy Borger from deck.",
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Razen',        role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Heavy Borger', role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Vanquish Soul Razen',
            toZone: CHECKPOINT_ZONES.FIELD,
            downstreamDependency: "Razen on field is the Link material for Rock at CP2. Rock recovers Razen to hand, providing the FIRE attribute needed for Sue's FIRE+DARK gate at CP3.",
          },
          intermediateState: null,
          causesCheckpointAt: 4,
        },
      },
      {
        index: 1,
        description: "Activate Stake Your Soul: reveal Heavy Borger (DARK) from hand. Special Summon Vanquish Soul Dr. Mad Love from deck (same DARK attribute). Mad Love returns to hand at this turn's End Phase.",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Stake your Soul!',           role: 'activator', fromZone: 'hand', toZone: 'gy'    },
          { name: 'Vanquish Soul Heavy Borger', role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',    fromZone: 'deck', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 2,
        description: "Mad Love's on-summon effect: search Vanquish Soul Start! from deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Start!',       role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 3,
        description: "Activate Vanquish Soul Start! Field Spell. Target Mad Love to search Vanquish Soul Hollie Sue from deck.",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Start!',       role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',    fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Hollie Sue',   role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 4,
        description: "Send Razen to GY as Link material. Link Summon Rock of the Vanquisher to EMZ. Rock's effect: recover Razen from GY to hand.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Razen',     role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Rock of the Vanquisher',  role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Vanquish Soul Razen',     role: 'target',   fromZone: 'gy',    toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Vanquish Soul Razen'],
            description: "Razen must be on field to serve as Link material for Rock. Without Rock in EMZ, the VS deploy engine on opponent's turn never activates.",
          },
          consumedResource: {
            card: 'Vanquish Soul Razen',
            toZone: CHECKPOINT_ZONES.HAND,
            downstreamDependency: "Rock's GY recovery of Razen is the core resource loop — it makes the opening net-zero. Razen recovered = FIRE attribute available for Sue's CP3 gate.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Dr. Mad Love'],
            gy: [],
            hand: ['Vanquish Soul Razen', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Heavy Borger'],
          },
          causesCheckpointAt: 5,
        },
      },
      {
        index: 5,
        description: "Hollie Sue SSs herself from hand (reveal any VS). Sue's effect: reveal Razen (FIRE) + Heavy Borger (DARK) to Special Summon Vanquish Soul Jiaolong from deck.",
        tags: [STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Vanquish Soul Hollie Sue',   role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Razen',        role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Heavy Borger', role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Jiaolong',     role: 'target',    fromZone: 'deck', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.HAND,
            cards: ['Vanquish Soul Razen', 'Vanquish Soul Heavy Borger'],
            description: "FIRE (Razen) AND DARK (Borger) must both be in hand when Sue's reveal resolves. Cards are not discarded — only their attributes are checked. This is a hand-composition gate, not a field or GY gate. Specific card identity is irrelevant; only attribute counts matter.",
          },
          consumedResource: {
            card: 'Vanquish Soul Hollie Sue',
            toZone: CHECKPOINT_ZONES.FIELD,
            downstreamDependency: "Sue on field enables her EARTH+DARK steal Quick Effect on opponent's turn — the primary active disruption in the endboard package.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Dr. Mad Love', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Jiaolong'],
            gy: [],
            hand: ['Vanquish Soul Razen', 'Vanquish Soul Heavy Borger'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 6,
        description: "DECISION — Stop at 4 summons (Nibiru wall). The 4 summons this turn: Razen (NS), Rock (SS), Mad Love (SS via Stake), Sue (SS). Extending to a 5th summon opens Nibiru. Pass to End Phase.",
        tags: [],
        cards: [],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Rock of the Vanquisher', 'Vanquish Soul Dr. Mad Love', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Jiaolong'],
            description: "4 summons completed. Any 5th summon this turn risks Nibiru the Primal Being replacing the entire board with a 3000/3000 token. This is a deliberate player decision, not a card gate.",
          },
          consumedResource: null,
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 7,
        description: "End Phase: Start! sets Vanquish Soul Snow Devil from deck (requires 2+ VS monsters on field). Mad Love returns to hand (Stake's return clause). Borger can reveal DARK in hand to draw 1 if on field.",
        tags: [STEP_TAGS.SET, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Start!',       role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Snow Devil',   role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',    fromZone: 'field', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Rock of the Vanquisher', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Jiaolong'],
      gy: ['Stake your Soul!'],
      hand: ['Vanquish Soul Razen', 'Vanquish Soul Dr. Mad Love', 'Vanquish Soul Heavy Borger'],
      notes: "Rock deploys Razen on opponent's turn → Razen searches Caesar → pop. Sue steals lowest ATK. Snow Devil pops all (3 attributes). Mad Love returned by Stake. Borger draw/burn if fetched.",
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash Blossom negates Razen's search. Imperm/Veiler negate Razen's NS effect. Tag Out Quick Effect can dodge Imperm/Veiler by returning Razen to hand mid-chain and replacing it with a Tagger.",
      },
      {
        afterStepIndex: 4,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash Blossom negates Rock's GY recovery. Razen stays in GY. Hand is down 1. Sue's CP3 gate may fail the FIRE+DARK requirement without Razen in hand.",
      },
      {
        afterStepIndex: 5,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Droll & Lock Bird locks all add-to-hand effects if activated after any search this turn. Dark Ruler No More on the completed board negates all monsters before opponent's turn disruption fires.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
        BREAKING_CATEGORIES.BOARD_WIPE,
        BREAKING_CATEGORIES.ANTI_SPECIAL_SUMMON,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Droll & Lock Bird',
        'Nibiru the Primal Being',
        'Dark Ruler No More',
        'Kaiju monsters',
      ],
      notes: "Tag Out intentionally dodges Imperm/Veiler by bouncing the targeted monster before the negate resolves. Dark Ruler No More negates Rock and all monsters simultaneously, collapsing the entire disruption package.",
    },
  },

  // ── Line B — Razen + DARK card in hand ───────────────────────────────────

  {
    id: 'vs-k9-line-b',
    archetypeId: 'vanquish-soul-k9',
    name: 'Line B — Razen + DARK card',
    valid_from: '2024-07-01',

    steps: [
      {
        index: 0,
        description: "Normal Summon Vanquish Soul Razen. On-summon effect: search Vanquish Soul Hollie Sue from deck.",
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Razen',      role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Hollie Sue', role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Vanquish Soul Razen',
            toZone: CHECKPOINT_ZONES.FIELD,
            downstreamDependency: "Razen on field is the Link material for Rock. Rock returns Razen to hand, providing the FIRE attribute for Sue's gate at CP3.",
          },
          intermediateState: null,
          causesCheckpointAt: 1,
        },
      },
      {
        index: 1,
        description: "Send Razen to GY as Link material. Link Summon Rock of the Vanquisher to EMZ. Rock's effect: recover Razen from GY to hand.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Razen',    role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Rock of the Vanquisher', role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Vanquish Soul Razen',    role: 'target',   fromZone: 'gy',    toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Vanquish Soul Razen'],
            description: "Razen must be on field as Link material for Rock.",
          },
          consumedResource: {
            card: 'Vanquish Soul Razen',
            toZone: CHECKPOINT_ZONES.HAND,
            downstreamDependency: "Razen recovered to hand = FIRE attribute secured for Sue's CP3 reveal gate. Combined with the DARK card already in hand, the gate is now passable.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher'],
            gy: [],
            hand: ['Vanquish Soul Hollie Sue', 'Vanquish Soul Razen', 'DARK card (opening hand)'],
          },
          causesCheckpointAt: 2,
        },
      },
      {
        index: 2,
        description: "Hollie Sue SSs herself from hand (reveal any VS). Sue's effect: reveal Razen (FIRE) + DARK card to Special Summon Vanquish Soul Dr. Mad Love from deck.",
        tags: [STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Vanquish Soul Hollie Sue',   role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Razen',        role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',    fromZone: 'deck', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.HAND,
            cards: ['Vanquish Soul Razen', 'any DARK card'],
            description: "FIRE (Razen, recovered by Rock) and DARK (from opening hand — Borger, Mad Love, Izuna, Bystial, Maxx C, or any DARK card) must both be in hand. The DARK card is the key differentiator for this line — any DARK in the opening hand unlocks the Sue gate.",
          },
          consumedResource: {
            card: 'Vanquish Soul Hollie Sue',
            toZone: CHECKPOINT_ZONES.FIELD,
            downstreamDependency: "Sue on field enables her steal effect on opponent's turn.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Dr. Mad Love'],
            gy: [],
            hand: ['Vanquish Soul Razen'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 3,
        description: "Mad Love's on-summon effect: search Vanquish Soul Start! from deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Start!',       role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 4,
        description: "Activate Vanquish Soul Start! Field Spell. Target Mad Love to search Vanquish Soul Caesar Valius from deck.",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Start!',        role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love',  role: 'target',    fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Caesar Valius', role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 5,
        description: "DECISION — Stop at 4 summons (Razen NS, Rock SS, Sue SS, Mad Love SS). Pass to End Phase.",
        tags: [],
        cards: [],
        checkpoint: null,
      },
      {
        index: 6,
        description: "End Phase: Start! sets Vanquish Soul Snow Devil from deck.",
        tags: [STEP_TAGS.SET, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Start!',     role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Snow Devil', role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Rock of the Vanquisher', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Dr. Mad Love'],
      gy: [],
      hand: ['Vanquish Soul Razen', 'Vanquish Soul Caesar Valius'],
      notes: "Rock deploys Razen on opponent's turn → Caesar search → pop. Sue steals. Caesar tags in (EARTH+FIRE+DARK) for any field pop. Snow Devil pops all monsters.",
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash Blossom on Razen's search stops Sue from being fetched. Tag Out dodges Imperm/Veiler on the NS.",
      },
      {
        afterStepIndex: 1,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash Blossom on Rock's GY recovery — Razen stays in GY, FIRE attribute unavailable. Sue's hand gate at CP3 fails if no alternative FIRE source exists.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
        BREAKING_CATEGORIES.BOARD_WIPE,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Droll & Lock Bird',
        'Nibiru the Primal Being',
        'Dark Ruler No More',
      ],
      notes: "The DARK card in the opening hand is the sole differentiator for this line. Any DARK attribute card works. Line collapses to Razen + nothing if both Ash and Rock's recovery are stopped.",
    },
  },

  // ── Line C — Razen + Sue in hand ─────────────────────────────────────────

  {
    id: 'vs-k9-line-c',
    archetypeId: 'vanquish-soul-k9',
    name: 'Line C — Razen + Sue in hand',
    valid_from: '2024-07-01',

    steps: [
      {
        index: 0,
        description: "Normal Summon Razen. On-summon effect: search Vanquish Soul Heavy Borger from deck.",
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Razen',        role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Heavy Borger', role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: "Send Razen to GY. Link Summon Rock of the Vanquisher. Rock recovers Razen from GY to hand.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Razen',    role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Rock of the Vanquisher', role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Vanquish Soul Razen',    role: 'target',   fromZone: 'gy',    toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Vanquish Soul Razen'],
            description: "Razen must be on field as Link material for Rock.",
          },
          consumedResource: {
            card: 'Vanquish Soul Razen',
            toZone: CHECKPOINT_ZONES.HAND,
            downstreamDependency: "Razen recovered = FIRE attribute for Sue's reveal gate. Borger (just searched) provides DARK. Both attributes now in hand simultaneously.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher'],
            gy: [],
            hand: ['Vanquish Soul Hollie Sue', 'Vanquish Soul Razen', 'Vanquish Soul Heavy Borger'],
          },
          causesCheckpointAt: 2,
        },
      },
      {
        index: 2,
        description: "Sue SSs herself (reveal any VS). Sue's effect: reveal Razen (FIRE) + Borger (DARK) to Special Summon Vanquish Soul Dr. Mad Love from deck.",
        tags: [STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Vanquish Soul Hollie Sue',   role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Razen',        role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Heavy Borger', role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',    fromZone: 'deck', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.HAND,
            cards: ['Vanquish Soul Razen', 'Vanquish Soul Heavy Borger'],
            description: "FIRE (Razen, recovered) and DARK (Borger, searched at step 0) must both be in hand. Sue in hand as opener means the gate is effectively free — no additional setup needed beyond Razen's CP2 recovery.",
          },
          consumedResource: null,
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Dr. Mad Love'],
            gy: [],
            hand: ['Vanquish Soul Razen', 'Vanquish Soul Heavy Borger'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 3,
        description: "Mad Love searches Start! → Start! targets Mad Love → searches Caesar Valius.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love',  role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Start!',        role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'Vanquish Soul Caesar Valius', role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 4,
        description: "DECISION — Stop at 4 summons. Pass to End Phase.",
        tags: [],
        cards: [],
        checkpoint: null,
      },
      {
        index: 5,
        description: "End Phase: Start! sets Vanquish Soul Snow Devil from deck.",
        tags: [STEP_TAGS.SET, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Start!',     role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Snow Devil', role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Rock of the Vanquisher', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Dr. Mad Love'],
      gy: [],
      hand: ['Vanquish Soul Razen', 'Vanquish Soul Heavy Borger', 'Vanquish Soul Caesar Valius'],
      notes: "Identical endboard to Line B. Sue in hand instead of a DARK card produces the same result because Sue herself is the FIRE source for her self-SS, and Borger (searched) is the DARK source.",
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Razen's search — Borger not fetched. Sue's gate requires a DARK source; without Borger, DARK must come from elsewhere in hand.",
      },
      {
        afterStepIndex: 1,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Rock's recovery — Razen stays in GY. Sue has no FIRE source in hand. Gate fails.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
        BREAKING_CATEGORIES.BOARD_WIPE,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Droll & Lock Bird',
        'Nibiru the Primal Being',
        'Dark Ruler No More',
      ],
      notes: 'Sue in hand as opener is stronger than a random DARK card — she guarantees the gate is satisfiable without needing a pre-existing DARK source.',
    },
  },

  // ── Line D — Razen + FIRE card / Jiaolong variant ────────────────────────

  {
    id: 'vs-k9-line-d',
    archetypeId: 'vanquish-soul-k9',
    name: 'Line D — Razen + Jiaolong (FIRE variant)',
    valid_from: '2024-07-01',

    steps: [
      {
        index: 0,
        description: "Normal Summon Vanquish Soul Razen. On-summon effect: search Vanquish Soul Jiaolong (or any VS needed).",
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Razen',    role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Jiaolong', role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: "Razen reveals Jiaolong (FIRE) from hand. Jiaolong's own condition: when a VS reveals it, Jiaolong SSs itself from hand as a new chain.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_HAND],
        cards: [
          { name: 'Vanquish Soul Razen',    role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Jiaolong', role: 'target',    fromZone: 'hand',  toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 2,
        description: "Send Razen to GY. Link Summon Rock of the Vanquisher (keeping Jiaolong). Rock recovers Razen from GY to hand.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Razen',    role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Rock of the Vanquisher', role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Vanquish Soul Razen',    role: 'target',   fromZone: 'gy',    toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Vanquish Soul Razen'],
            description: "Razen on field as Link material for Rock. Jiaolong is kept on field.",
          },
          consumedResource: {
            card: 'Vanquish Soul Razen',
            toZone: CHECKPOINT_ZONES.HAND,
            downstreamDependency: "Razen recovered = FIRE attribute. Jiaolong on field provides a second FIRE. Jiaolong's 2x FIRE reveal effect fires for a search at step 3.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Jiaolong'],
            gy: [],
            hand: ['Vanquish Soul Razen'],
          },
          causesCheckpointAt: 6,
        },
      },
      {
        index: 3,
        description: "Jiaolong's effect: reveal 2 FIRE monsters from hand (Razen + any FIRE) to search Vanquish Soul Start! from deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Jiaolong', role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Razen',    role: 'cost',      fromZone: 'hand',  toZone: 'hand'  },
          { name: 'Vanquish Soul Start!',   role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 4,
        description: "Activate Vanquish Soul Start! Target Jiaolong to search Vanquish Soul Hollie Sue from deck.",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Start!',     role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Vanquish Soul Jiaolong',   role: 'target',    fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Hollie Sue', role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 5,
        description: "Sue SSs herself from hand (reveal any VS). Sue's effect: reveal Razen (FIRE) + any DARK card to Special Summon Vanquish Soul Heavy Borger or Mad Love from deck.",
        tags: [STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Vanquish Soul Hollie Sue',   role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Razen',        role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Heavy Borger', role: 'target',    fromZone: 'deck', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.HAND,
            cards: ['Vanquish Soul Razen', 'any DARK card'],
            description: "FIRE (Razen) and DARK (from opening hand or a prior search) must both be present. In this line, DARK must come from the opening hand — Jiaolong's 2x FIRE search did not generate a DARK source, so a DARK card must have been in the initial 5.",
          },
          consumedResource: null,
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Jiaolong', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Heavy Borger'],
            gy: [],
            hand: ['Vanquish Soul Razen'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 6,
        description: "DECISION — Stop at 4 summons (Razen NS, Jiaolong SS, Rock SS, Sue SS). Pass to End Phase.",
        tags: [],
        cards: [],
        checkpoint: null,
      },
      {
        index: 7,
        description: "End Phase: Start! sets Vanquish Soul Snow Devil. On opponent's Standby Phase, Jiaolong reveals 2 FIRE monsters to search Vanquish Soul Heavy Borger (draw/burn engine).",
        tags: [STEP_TAGS.SET, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Start!',       role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Snow Devil',   role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'Vanquish Soul Jiaolong',     role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Heavy Borger', role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Rock of the Vanquisher', 'Vanquish Soul Jiaolong', 'Vanquish Soul Hollie Sue'],
      gy: [],
      hand: ['Vanquish Soul Razen'],
      notes: "Jiaolong on field searches Borger on opponent's Standby via 2x FIRE reveal — a bonus disruption lines without Jiaolong lack. Rock deploys Razen next turn → Caesar search → pop.",
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Razen's search — Jiaolong not fetched. The entire FIRE+FIRE engine stalls without Jiaolong.",
      },
      {
        afterStepIndex: 2,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Rock's recovery or Ash on Jiaolong's 2x FIRE search — chain collapses before Start! is reached.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
        BREAKING_CATEGORIES.BOARD_WIPE,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Nibiru the Primal Being',
        'Dark Ruler No More',
      ],
      notes: "Delta from standard lines: Jiaolong's Standby search on opponent's turn is a free +1. Requires a DARK card in opening hand for Sue's gate since the search chain doesn't generate one.",
    },
  },

  // ── Line E — Razen + Mad Love / Borger (Continue? recovery) ──────────────

  {
    id: 'vs-k9-line-e',
    archetypeId: 'vanquish-soul-k9',
    name: 'Line E — Razen + Mad Love / Borger (Continue? variant)',
    valid_from: '2024-07-01',

    steps: [
      {
        index: 0,
        description: "Normal Summon Razen. On-summon effect: search Mad Love (if not in hand) or a VS Spell/Trap.",
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Razen',        role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: "Send Razen to GY. Link Summon Rock of the Vanquisher. Rock's effect SSs Mad Love from hand to field.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_HAND],
        cards: [
          { name: 'Vanquish Soul Razen',        role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Rock of the Vanquisher',     role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',   fromZone: 'hand',  toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.HAND,
            cards: ['Vanquish Soul Dr. Mad Love'],
            description: "Mad Love must be in hand for Rock to SS it. Rock's SS effect deploys directly from hand here rather than recovering from GY — a different application of Rock's effect.",
          },
          consumedResource: {
            card: 'Vanquish Soul Dr. Mad Love',
            toZone: CHECKPOINT_ZONES.FIELD,
            downstreamDependency: "Mad Love on field searches a VS Spell/Trap (S/T). The S/T search funds the Continue? recovery loop on opponent's turn.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Dr. Mad Love'],
            gy: ['Vanquish Soul Razen'],
            hand: ['Vanquish Soul Heavy Borger'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 2,
        description: "Mad Love's on-summon effect: search Vanquish Soul Continue? (or Snow Devil / Dust Devil / Start!).",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Continue?',    role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 3,
        description: "Borger Tag In: reveal Mad Love (DARK) from hand to draw 1. Mad Love returned to hand via Tag Out.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Heavy Borger', role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'cost',      fromZone: 'field', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 4,
        description: "Set Vanquish Soul Continue? in Spell/Trap zone. Pass to End Phase.",
        tags: [STEP_TAGS.SET],
        cards: [
          { name: 'Vanquish Soul Continue?', role: 'activator', fromZone: 'hand', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 5,
        description: "Opponent's turn: activate Vanquish Soul Continue? — pay 500LP to Special Summon Razen from GY. Razen's on-summon effect searches Vanquish Soul Jiaolong.",
        tags: [STEP_TAGS.ACTIVATE_TRAP, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Continue?', role: 'activator', fromZone: 'field', toZone: 'gy'    },
          { name: 'Vanquish Soul Razen',     role: 'target',    fromZone: 'gy',    toZone: 'field' },
          { name: 'Vanquish Soul Jiaolong',  role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.GY,
            cards: ['Vanquish Soul Razen'],
            description: "Razen must be in GY (placed there at step 1 as Link material) for Continue? to revive it. This is the only GY-state gate in VS combos — all other VS checkpoints are hand-state gates.",
          },
          consumedResource: null,
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 6,
        description: "Razen on field: reveal DARK + FIRE to activate Caesar Valius (if available) tag-in pop effect. Full disruption fires if Caesar is in hand.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Caesar Valius', role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Vanquish Soul Razen',         role: 'target',    fromZone: 'field', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Rock of the Vanquisher', 'Vanquish Soul Heavy Borger'],
      gy: [],
      hand: ['Vanquish Soul Dr. Mad Love', '+1 drawn card from Borger'],
      notes: "Weaker opening than Sue lines. Continue? is a slower recovery tool — it requires LP payment and a GY Razen. Correct choice only when Sue is inaccessible. Borger draw/burn fires on opponent's turn.",
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Razen's search — Mad Love not fetched. Rock cannot deploy from hand if Mad Love is absent.",
      },
      {
        afterStepIndex: 5,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_SUMMON, INTERRUPT_CATEGORIES.NEGATE_TRAP, INTERRUPT_CATEGORIES.BANISH_FROM_GY],
        description: "Opponent can negate Continue? activation, negate Razen's summon from GY, or banish Razen from GY before Continue? resolves. D.D. Crow on Razen in GY collapses the recovery loop.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.GY_BANISH,
        BREAKING_CATEGORIES.SPELL_TRAP_REMOVAL,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'D.D. Crow',
        'Nibiru the Primal Being',
        'Dark Ruler No More',
      ],
      notes: "This is the only VS line with a GY-state gate (Razen in GY for Continue?). All other lines are pure hand-state driven. D.D. Crow on Razen hard-stops the recovery.",
    },
  },

  // ── Line F — Mad Love + FIRE card in hand ─────────────────────────────────

  {
    id: 'vs-k9-line-f',
    archetypeId: 'vanquish-soul-k9',
    name: 'Line F — Mad Love + FIRE card',
    valid_from: '2024-07-01',

    steps: [
      {
        index: 0,
        description: "Normal Summon Mad Love. On-summon effect: search Vanquish Soul Start! from deck.",
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Start!',       role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: "Activate Vanquish Soul Start! Target Mad Love to search Vanquish Soul Hollie Sue from deck.",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Start!',     role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',  fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Hollie Sue', role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 2,
        description: "Send Mad Love to GY. Link Summon Rock of the Vanquisher. Rock recovers Mad Love from GY to hand.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Rock of the Vanquisher',     role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',   fromZone: 'gy',    toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Vanquish Soul Dr. Mad Love'],
            description: "Mad Love must be on field as the Link material for Rock. Unlike Razen-opener lines, here it is Mad Love that gets recovered to hand — it provides the DARK attribute for Sue's gate.",
          },
          consumedResource: {
            card: 'Vanquish Soul Dr. Mad Love',
            toZone: CHECKPOINT_ZONES.HAND,
            downstreamDependency: "Mad Love recovered to hand = DARK attribute for Sue's FIRE+DARK reveal gate. The FIRE card from the opening hand completes the pair.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher'],
            gy: [],
            hand: ['Vanquish Soul Hollie Sue', 'Vanquish Soul Dr. Mad Love', 'FIRE card (opening hand)'],
          },
          causesCheckpointAt: 3,
        },
      },
      {
        index: 3,
        description: "Sue SSs herself from hand (reveal any VS). Sue's effect: reveal FIRE card + Mad Love (DARK) to Special Summon Vanquish Soul Razen from deck.",
        tags: [STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Vanquish Soul Hollie Sue',   role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Razen',        role: 'target',    fromZone: 'deck', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.HAND,
            cards: ['FIRE card (opening hand)', 'Vanquish Soul Dr. Mad Love'],
            description: "FIRE card (from opening hand) and DARK (Mad Love, recovered by Rock) must both be in hand. This is the CP3 convergence point. Mad Love as DARK source is the key differentiator of the Mad Love starter — it avoids the Razen-into-Borger-into-Sue extra step.",
          },
          consumedResource: null,
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Razen'],
            gy: [],
            hand: ['Vanquish Soul Dr. Mad Love', 'FIRE card'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 4,
        description: "Razen's on-summon effect: search Vanquish Soul Caesar Valius from deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Razen',        role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Caesar Valius', role: 'target',   fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 5,
        description: "DECISION — Stop at 4 summons (Mad Love NS, Rock SS, Sue SS, Razen SS). Pass to End Phase.",
        tags: [],
        cards: [],
        checkpoint: null,
      },
      {
        index: 6,
        description: "End Phase: Start! sets Vanquish Soul Snow Devil from deck.",
        tags: [STEP_TAGS.SET, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Start!',     role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Snow Devil', role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Rock of the Vanquisher', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Razen'],
      gy: [],
      hand: ['Vanquish Soul Dr. Mad Love', 'Vanquish Soul Caesar Valius'],
      notes: "Mad Love as starter is deceptively strong — it chains directly into Start! → Sue without the Borger middleman. Caesar in hand means immediate pop access on opponent's turn.",
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Mad Love's search — Start! not fetched. The entire chain through Start! → Sue collapses.",
      },
      {
        afterStepIndex: 2,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Rock's GY recovery — Mad Love stays in GY, DARK attribute unavailable. Sue's gate fails.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
        BREAKING_CATEGORIES.BOARD_WIPE,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Droll & Lock Bird',
        'Nibiru the Primal Being',
        'Dark Ruler No More',
      ],
      notes: "Mad Love starter requires any FIRE card in the opening hand. Ash Blossom itself is FIRE — it can serve as the FIRE reveal source for Sue while still being a handtrap on opponent's turn.",
    },
  },

  // ── Line G — Mad Love + Sue + Jiaolong (Full K9 Line) ────────────────────

  {
    id: 'vs-k9-line-g',
    archetypeId: 'vanquish-soul-k9',
    name: 'Line G — Mad Love + Sue + Jiaolong (Full K9)',
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: "Normal Summon Mad Love. Start! activates to search or Mad Love directly searches VS Spell/Trap (depending on hand). Search Vanquish Soul Start! if not already in hand.",
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Start!',       role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: "Activate Start! Target Mad Love to search Vanquish Soul Jiaolong (or the desired 5th-level VS).",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Vanquish Soul Start!',     role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',  fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Jiaolong',   role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 2,
        description: "Send Mad Love to GY. Link Summon Rock of the Vanquisher. Rock recovers Mad Love from GY to hand.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.ACTIVATE_EFFECT],
        cards: [
          { name: 'Vanquish Soul Dr. Mad Love', role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Rock of the Vanquisher',     role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'target',   fromZone: 'gy',    toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Vanquish Soul Dr. Mad Love'],
            description: "Mad Love must be on field as Link material for Rock.",
          },
          consumedResource: {
            card: 'Vanquish Soul Dr. Mad Love',
            toZone: CHECKPOINT_ZONES.HAND,
            downstreamDependency: "Mad Love recovered = DARK attribute for Sue's gate. Combined with the FIRE card in hand (Jiaolong), this satisfies CP3.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher'],
            gy: [],
            hand: ['Vanquish Soul Hollie Sue', 'Vanquish Soul Jiaolong', 'Vanquish Soul Dr. Mad Love'],
          },
          causesCheckpointAt: 3,
        },
      },
      {
        index: 3,
        description: "Sue SSs herself from hand (reveal VS). Sue's effect: reveal FIRE (Jiaolong) + DARK (Mad Love) to Special Summon Vanquish Soul Jiaolong from deck.",
        tags: [STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Vanquish Soul Hollie Sue',   role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Jiaolong',     role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Dr. Mad Love', role: 'cost',      fromZone: 'hand', toZone: 'hand'  },
          { name: 'Vanquish Soul Jiaolong',     role: 'target',    fromZone: 'deck', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.HAND,
            cards: ['Vanquish Soul Jiaolong', 'Vanquish Soul Dr. Mad Love'],
            description: "FIRE (Jiaolong in hand) and DARK (Mad Love, recovered by Rock) must both be present. This is the CP3 convergence point for the K9 line.",
          },
          consumedResource: null,
          intermediateState: {
            field: ['Rock of the Vanquisher', 'Vanquish Soul Hollie Sue', 'Vanquish Soul Jiaolong'],
            gy: [],
            hand: ['Vanquish Soul Jiaolong', 'Vanquish Soul Dr. Mad Love'],
          },
          causesCheckpointAt: 4,
        },
      },
      {
        index: 4,
        description: "DECISION — Player extends past 4 summons (Nibiru risk: HIGH). Overlay Sue (Level 5) + Jiaolong (Level 5) to Xyz Summon K9-17 Ripper.",
        tags: [STEP_TAGS.XYZ_SUMMON],
        cards: [
          { name: 'Vanquish Soul Hollie Sue', role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Vanquish Soul Jiaolong',   role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: "K9-17 'Ripper'",           role: 'target',   fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Vanquish Soul Hollie Sue', 'Vanquish Soul Jiaolong'],
            description: "Both Sue AND Jiaolong must be on field simultaneously, both Level 5. Sue is always Level 5. Jiaolong was SSd from deck via Sue's CP3 effect. This is the K9 branch divergence gate — crossing it means accepting Nibiru exposure.",
          },
          consumedResource: {
            card: 'Vanquish Soul Hollie Sue',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: "Sue is consumed as Xyz material for Ripper. Unlike standard lines, there is no Sue steal effect in this endboard — it is traded for the K9 disruption package.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher', "K9-17 'Ripper'"],
            gy: ['Vanquish Soul Hollie Sue', 'Vanquish Soul Jiaolong'],
            hand: ['Vanquish Soul Jiaolong', 'Vanquish Soul Dr. Mad Love'],
          },
          causesCheckpointAt: 5,
        },
      },
      {
        index: 5,
        description: "K9-17 Ripper's effect: detach Sue (material) to search K9-66a Jokul from deck.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH, STEP_TAGS.DETACH_MATERIAL],
        cards: [
          { name: "K9-17 'Ripper'",  role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'Vanquish Soul Hollie Sue', role: 'cost', fromZone: 'gy', toZone: 'gy'   },
          { name: 'K9-66a Jokul',    role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ["K9-17 'Ripper'"],
            description: "Ripper must be on field. Without Ripper, Jokul cannot be fetched and the K9 Xyz chain has no entry point.",
          },
          consumedResource: {
            card: 'K9-66a Jokul',
            toZone: CHECKPOINT_ZONES.HAND,
            downstreamDependency: "Jokul in hand is required to start the N.As.H. Knight chain. Jokul + second Jiaolong overlay into N.As.H. Knight at step 7.",
          },
          intermediateState: null,
          causesCheckpointAt: 7,
        },
      },
      {
        index: 6,
        description: "Special Summon K9-66a Jokul from hand. Special Summon second Vanquish Soul Jiaolong from hand (or via Start!/Stake). Jokul's effect: search K9-66b Lantern.",
        tags: [STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'K9-66a Jokul',       role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Vanquish Soul Jiaolong', role: 'target', fromZone: 'hand', toZone: 'field' },
          { name: 'K9-66b Lantern',     role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 7,
        description: "Overlay Jokul + Jiaolong (both suitable rank) → Xyz Summon N.As.H. Knight. Detach Jokul → Special Summon Number 104: Masquerade from Extra Deck.",
        tags: [STEP_TAGS.XYZ_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DETACH_MATERIAL, STEP_TAGS.SPECIAL_SUMMON],
        cards: [
          { name: 'K9-66a Jokul',               role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Vanquish Soul Jiaolong',       role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'N.As.H. Knight',              role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Number 104: Masquerade',      role: 'target',   fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['K9-66a Jokul', 'Vanquish Soul Jiaolong'],
            description: "Jokul (searched by Ripper) and a second Jiaolong (from hand) must both be on field. This is the gated entry to the N.As.H. → C104 chain.",
          },
          consumedResource: {
            card: 'K9-66a Jokul',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: "Jokul in GY: Lantern's SS effect returns Jokul from GY, which then overlays with Lantern into Vallon at step 9.",
          },
          intermediateState: {
            field: ['Rock of the Vanquisher', "K9-17 'Ripper'", 'N.As.H. Knight', 'Number 104: Masquerade'],
            gy: ['K9-66a Jokul', 'Vanquish Soul Jiaolong'],
            hand: ['K9-66b Lantern'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 8,
        description: "Overlay N.As.H. Knight ONTO Number 104: Masquerade via Chaos Xyz Evolution → CXyz N.As.Ch. Knight.",
        tags: [STEP_TAGS.XYZ_SUMMON, STEP_TAGS.ATTACH_MATERIAL],
        cards: [
          { name: 'N.As.H. Knight',         role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'CXyz N.As.Ch. Knight',   role: 'target',   fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 9,
        description: "Special Summon K9-66b Lantern from hand. Lantern's effect returns K9-66a Jokul from GY. Overlay Jokul + Lantern → Xyz Summon Vallon, the Super Psy Skyblaster.",
        tags: [STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.XYZ_SUMMON],
        cards: [
          { name: 'K9-66b Lantern',                   role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'K9-66a Jokul',                     role: 'target',    fromZone: 'gy',    toZone: 'field' },
          { name: 'Vallon, the Super Psy Skyblaster', role: 'target',    fromZone: 'extra',  toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 10,
        description: "CXyz N.As.Ch. Knight detaches N.As.H. Knight (material) to Special Summon Number C104: Umbral Horror Masquerade from Extra Deck. A Case for K9 fires from GY/S/T → sets K9-X Forced Release.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DETACH_MATERIAL, STEP_TAGS.SPECIAL_SUMMON, STEP_TAGS.SET],
        cards: [
          { name: 'CXyz N.As.Ch. Knight',              role: 'activator', fromZone: 'field', toZone: 'field' },
          { name: 'N.As.H. Knight',                    role: 'cost',      fromZone: 'gy',    toZone: 'gy'    },
          { name: 'Number C104: Umbral Horror Masquerade', role: 'target', fromZone: 'extra', toZone: 'field' },
          { name: 'K9-X Forced Release',               role: 'target',    fromZone: 'deck',  toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Rock of the Vanquisher', 'CXyz N.As.Ch. Knight', 'Number C104: Umbral Horror Masquerade', 'Vallon, the Super Psy Skyblaster'],
      gy: ['A Case for K9'],
      hand: ['K9-17 Izuna'],
      notes: "K9 endboard: C104 pops 1 card on field via A Case for K9 trigger. Vallon flips 1 card face-down (Book of Moon). Izuna in hand negates 1 monster effect. K9-X Forced Release set. Rock deploys on opponent's turn if alive. Trades Sue steal + Snow Devil for a harder, more brittle disruption lock.",
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Mad Love's search — Start! not fetched. Entire chain through Start! → Sue → Jiaolong → Ripper collapses.",
      },
      {
        afterStepIndex: 2,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Rock's GY recovery — DARK attribute (Mad Love) unavailable. Sue's hand gate at CP3 fails.",
      },
      {
        afterStepIndex: 5,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash Blossom or Ghost Belle negates Ripper's detach search. Ripper sits as a body but Jokul is never fetched. K9 chain cannot continue.",
      },
      {
        afterStepIndex: 4,
        interruptCategories: [INTERRUPT_CATEGORIES.HAND_TRAP, INTERRUPT_CATEGORIES.NEGATE_SUMMON],
        description: "Nibiru fires on the 5th summon (K9-17 Ripper). Board wiped and replaced with 3000/3000 Primal Being token. 6+ summons total required for this line — Nibiru is the primary risk.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.ANTI_SPECIAL_SUMMON,
        BREAKING_CATEGORIES.BOARD_WIPE,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
      ],
      namedCounters: [
        'Nibiru the Primal Being',
        'Ash Blossom & Joyous Spring',
        'Ghost Belle & Haunted Mansion',
        'Dark Ruler No More',
        'Droplet',
      ],
      notes: "K9 line gains: C104 pop, Vallon BOM, Izuna negate, harder overall lock. Loses: Sue steal, Snow Devil pop, Nibiru safety. Correct call only against decks without Nibiru. Board wipe before C104 resolves collapses the entire endboard simultaneously.",
    },
  },

  // ── Chimera ───────────────────────────────────────────────────────────────

  // Line A — Mirror Swordknight Pure 1-Card
  {
    id: 'chimera-line-a',
    archetypeId: 'chimera',
    name: 'Mirror Swordknight (Pure 1-Card)',
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: 'Normal Summon Mirror Swordknight. Mirror has no NS effect — it is summoned solely to use its Quick Effect tribute.',
        tags: [STEP_TAGS.NORMAL_SUMMON],
        cards: [
          { name: 'Mirror Swordknight', role: 'activator', fromZone: 'hand', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: 'Activate Mirror Swordknight Quick Effect — tribute it to Special Summon Big-Winged Berfomet from deck.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Mirror Swordknight',  role: 'cost',    fromZone: 'field', toZone: 'gy'    },
          { name: 'Big-Winged Berfomet', role: 'target',  fromZone: 'deck',  toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Mirror Swordknight',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Mirror in GY enables the Draw Phase loop — tributes itself again from GY to SS Big-Wing each turn.',
          },
          intermediateState: null,
          causesCheckpointAt: 4,
        },
      },
      {
        index: 2,
        description: "Big-Winged Berfomet SS effect — search Gazelle the King of Mythical Claws (Level 4 Beast) AND Chimera Fusion from deck. Locks into Fusion-only Extra Deck for the rest of the turn.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Gazelle the King of Mythical Claws', role: 'target', fromZone: 'deck', toZone: 'hand' },
          { name: 'Chimera Fusion',                     role: 'target', fromZone: 'deck', toZone: 'hand' },
        ],
        checkpoint: null,
      },
      {
        index: 3,
        description: 'Activate Chimera Fusion — Fusion Summon Chimera the King of Phantom Beasts using Gazelle (hand) + Big-Wing (field) as materials. CL order: CL1 Gazelle, CL2 Big-Wing, CL3 King. Resolving: King End Phase hand rip queues; Big-Wing GY effect SSs Mirror from GY (Illusion); Gazelle float searches Cornfield Coatl.',
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Chimera Fusion',                     role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Gazelle the King of Mythical Claws', role: 'material',  fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Big-Winged Berfomet',                role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Chimera the King of Phantom Beasts', role: 'target',    fromZone: 'extra', toZone: 'field' },
          { name: 'Mirror Swordknight',                 role: 'target',    fromZone: 'gy',    toZone: 'field' },
          { name: 'Cornfield Coatl',                    role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Chimera Fusion',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'CF in GY with Chimera FMB on field triggers GY recovery — add CF back to hand or banish to SS Gazelle + Berfomet.',
          },
          intermediateState: {
            field: ['Chimera the King of Phantom Beasts', 'Mirror Swordknight'],
            gy:    ['Chimera Fusion', 'Gazelle the King of Mythical Claws', 'Big-Winged Berfomet'],
            hand:  ['Cornfield Coatl'],
          },
          causesCheckpointAt: 4,
        },
      },
      {
        index: 4,
        description: 'Activate Cornfield Coatl — discard itself to search Mirror Swordknight from deck. Coatl now in GY (targeting negate live while Chimera FMB is on field).',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DISCARD, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Cornfield Coatl',    role: 'cost',   fromZone: 'hand', toZone: 'gy'   },
          { name: 'Mirror Swordknight', role: 'target', fromZone: 'deck', toZone: 'hand' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Chimera the King of Phantom Beasts'],
            description: 'Chimera the FMB name must be on field for Mirror and Coatl GY negates to be active.',
          },
          consumedResource: {
            card: 'Cornfield Coatl',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Coatl in GY enables targeting negate (banish from GY to negate and destroy targeting effect).',
          },
          intermediateState: {
            field: ['Chimera the King of Phantom Beasts', 'Mirror Swordknight'],
            gy:    ['Chimera Fusion', 'Gazelle the King of Mythical Claws', 'Big-Winged Berfomet', 'Cornfield Coatl'],
            hand:  ['Mirror Swordknight'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 5,
        description: 'Activate Chimera Fusion GY effect — Chimera FMB is on field, so add CF back to hand. Set CF in Spell/Trap Zone. End turn. End Phase: King hand rip fires.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SET],
        cards: [
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'gy',   toZone: 'hand'       },
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'hand', toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Chimera the King of Phantom Beasts', 'Mirror Swordknight (on field from Big-Wing GY trigger)'],
      gy:    ['Mirror Swordknight (monster negate)', 'Cornfield Coatl (targeting negate)'],
      hand:  ['Mirror Swordknight (searched by Coatl)'],
      notes: 'Set CF. Under 5 summons — Nibiru safe. End Phase King hand rip fires. Opponent Draw Phase: Mirror tributes from GY → SSs Big-Wing → searches Gazelle + CF. GY negates live as long as Chimera FMB name is on field.',
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash Blossom on Big-Wing's SS trigger search negates both Gazelle and CF adds. Big-Wing is a dead body with no follow-up.",
      },
      {
        afterStepIndex: 2,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_SPELL, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash Blossom on Chimera Fusion activation negates the Fusion Summon. King never reaches field. Skull Meister on Berfomet GY send trigger (if Berfomet sent) negates the send. CL ordering: King highest CL chain-blocks Ash and Skull Meister from hitting Berfomet.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.SPELL_TRAP_REMOVAL,
        BREAKING_CATEGORIES.GY_BANISH,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Droll & Lock Bird',
        'Cosmic Cyclone',
        'Macro Cosmos',
      ],
      notes: 'Nibiru-safe (4 summons). Set CF is the draw-phase loop engine — MST/Cosmic Cyclone breaks the loop. GY banish (Macro/Dimensional Fissure) kills Mirror and Coatl negates permanently.',
    },
  },

  // Line B — Nightmare Apprentice + 1 Discard (FS Line)
  {
    id: 'chimera-line-b',
    archetypeId: 'chimera-fiendsmith',
    name: 'Nightmare Apprentice + 1 Discard (FS)',
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: 'Discard 1 card to Special Summon Nightmare Apprentice from hand.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DISCARD, STEP_TAGS.SPECIAL_FROM_HAND],
        cards: [
          { name: 'Nightmare Apprentice', role: 'activator', fromZone: 'hand', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: 'Nightmare Apprentice SS effect — search Cornfield Coatl from deck.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Cornfield Coatl', role: 'target', fromZone: 'deck', toZone: 'hand' },
        ],
        checkpoint: null,
      },
      {
        index: 2,
        description: 'Activate Cornfield Coatl — discard itself to search Gazelle the King of Mythical Claws. Coatl is now in GY — targeting negate is already set up before any Fusion.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DISCARD, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Cornfield Coatl',                    role: 'cost',   fromZone: 'hand', toZone: 'gy'   },
          { name: 'Gazelle the King of Mythical Claws', role: 'target', fromZone: 'deck', toZone: 'hand' },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Cornfield Coatl',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Coatl in GY before Berfomet hits field means Imperm/Veiler targeting Berfomet will be negated and destroyed.',
          },
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 3,
        description: 'Normal Summon Gazelle — search Chimera Fusion from deck.',
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Gazelle the King of Mythical Claws', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Chimera Fusion',                     role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 4,
        description: 'Activate Chimera Fusion — Fusion Summon Berfomet the Mythical King using Gazelle + Nightmare Apprentice. CL1 Gazelle, CL2 Berfomet. Resolving: Berfomet sends Evil HERO Sinister Necrom to GY; Necrom banishes itself to SS Adusted Gold; Gazelle float searches Mirror Swordknight.',
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Chimera Fusion',                           role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Gazelle the King of Mythical Claws',       role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Nightmare Apprentice',                     role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'target', fromZone: 'extra', toZone: 'field' },
          { name: 'Evil HERO Sinister Necrom',                role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
          { name: 'Evil HERO Adusted Gold',                   role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'Mirror Swordknight',                       role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Chimera Fusion',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'CF in GY recovers to hand via GY effect — used to set CF for Draw Phase loop.',
          },
          intermediateState: {
            field: ['Berfomet the Mythical King of Phantom Beasts', 'Evil HERO Adusted Gold'],
            gy:    ['Chimera Fusion', 'Cornfield Coatl', 'Evil HERO Sinister Necrom'],
            hand:  ['Mirror Swordknight'],
          },
          causesCheckpointAt: 5,
        },
      },
      {
        index: 5,
        description: "CF GY effect — add CF back to hand. Link Adusted Gold into Fiendsmith's Requiem.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: 'Chimera Fusion',          role: 'activator', fromZone: 'gy',    toZone: 'hand'  },
          { name: 'Evil HERO Adusted Gold',  role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: "Fiendsmith's Requiem",    role: 'target',    fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Berfomet the Mythical King of Phantom Beasts'],
            description: 'Berfomet (Chimera FMB name) must be on field for CF GY recovery to activate.',
          },
          consumedResource: {
            card: 'Evil HERO Adusted Gold',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: "Adusted Gold as Requiem material enables the Fiendsmith engine chain: Requiem → Lacrima → Engraver → Sequence.",
          },
          intermediateState: null,
          causesCheckpointAt: 6,
        },
      },
      {
        index: 6,
        description: "Fiendsmith's Requiem tributes itself to Special Summon Lacrima the Crimson Tears. Lacrima sends Fiendsmith Engraver to GY.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_SUMMON, STEP_TAGS.SEND_TO_GY],
        cards: [
          { name: "Fiendsmith's Requiem",  role: 'cost',   fromZone: 'field', toZone: 'gy'    },
          { name: 'Lacrima the Crimson Tears', role: 'target', fromZone: 'deck', toZone: 'field' },
          { name: 'Fiendsmith Engraver',   role: 'target', fromZone: 'deck', toZone: 'gy'    },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ["Fiendsmith's Requiem"],
            description: "Requiem must be on field to tribute and SS Lacrima.",
          },
          consumedResource: {
            card: 'Fiendsmith Engraver',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Engraver in GY SSs itself at next step — returns Lurrie/Adusted Gold to deck as cost.',
          },
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 7,
        description: "Link Lacrima + Berfomet into Fiendsmith's Sequence. Sequence fuses into Fiendsmith's Lacrima using Adusted Gold + Requiem as deck materials. FS Lacrima SSs Lacrima (Tears) from GY.",
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.FUSION_SUMMON, STEP_TAGS.SPECIAL_FROM_GY],
        cards: [
          { name: 'Lacrima the Crimson Tears',     role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'material', fromZone: 'field', toZone: 'gy' },
          { name: "Fiendsmith's Sequence",         role: 'target',   fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 8,
        description: "Link Fiendsmith's Sequence + Lacrima (Tears) + FS Lacrima into A Bao A Qu, the Lightless Shadow.",
        tags: [STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: "Fiendsmith's Sequence",         role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Lacrima the Crimson Tears',     role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'A Bao A Qu, the Lightless Shadow', role: 'target', fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 9,
        description: 'A Bao A Qu effect — discard Mirror Swordknight (cost) to SS Mirror Swordknight from GY (A Bao banishes itself until End Phase). Mirror Swordknight tribute Quick Effect — tribute itself to SS Big-Winged Berfomet from deck.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DISCARD, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.SPECIAL_FROM_DECK],
        cards: [
          { name: 'Mirror Swordknight',  role: 'cost',   fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Mirror Swordknight',  role: 'target', fromZone: 'gy',    toZone: 'field' },
          { name: 'Big-Winged Berfomet', role: 'target', fromZone: 'deck',  toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['A Bao A Qu, the Lightless Shadow'],
            description: 'A Bao must be on field to activate discard cost and SS Mirror from GY.',
          },
          consumedResource: {
            card: 'Mirror Swordknight',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Mirror in GY at end of turn enables Draw Phase loop — tributes from GY to SS Big-Wing each turn.',
          },
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 10,
        description: 'Big-Wing searches Gazelle + CF. Activate CF — fuse Gazelle + Big-Wing → Chimera the King. CL1 Big-Wing, CL2 King. Big-Wing GY SSs Mirror from GY. CF GY → hand.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH, STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Gazelle the King of Mythical Claws', role: 'material',  fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Big-Winged Berfomet',                role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Chimera the King of Phantom Beasts', role: 'target',    fromZone: 'extra', toZone: 'field' },
          { name: 'Mirror Swordknight',                 role: 'target',    fromZone: 'gy',    toZone: 'field' },
          { name: 'Chimera Fusion',                     role: 'activator', fromZone: 'gy',    toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 11,
        description: 'Set Chimera Fusion. End Phase: A Bao A Qu returns to field from banished zone. King End Phase hand rip fires.',
        tags: [STEP_TAGS.SET],
        cards: [
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'hand', toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Chimera the King of Phantom Beasts', 'A Bao A Qu, the Lightless Shadow'],
      gy:    ['Mirror Swordknight (monster negate)', 'Cornfield Coatl (targeting negate)', 'Fiendsmith Engraver'],
      hand:  ['Mirror Swordknight', 'Chimera Fusion'],
      notes: 'Set CF. King hand rip at End Phase. A Bao pop (CF in hand as discard cost). Draw Phase loop via Mirror in GY. If Adusted Gold disrupted: fuse Berfomet + Mirror → Magnum the Reliever to bridge FS, draws 1 but loses set CF.',
    },

    chokePoints: [
      {
        afterStepIndex: 2,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash Blossom on Gazelle NS search — CF never accessed, combo stalls. Coatl in GY from step 2 blocks Imperm/Veiler targeting Gazelle.",
      },
      {
        afterStepIndex: 4,
        interruptCategories: [INTERRUPT_CATEGORIES.HAND_TRAP, INTERRUPT_CATEGORIES.NEGATE_EFFECT],
        description: "Ghost Belle on Necrom GY effect — Adusted Gold never hits field. FS engine collapses. Recovery: fuse Berfomet + Mirror → Magnum the Reliever.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.GY_BANISH,
        BREAKING_CATEGORIES.SPELL_TRAP_REMOVAL,
      ],
      namedCounters: [
        'Ghost Belle & Haunted Mansion',
        'Ash Blossom & Joyous Spring',
        'Droll & Lock Bird',
        'Nibiru the Primal Being',
      ],
      notes: 'Not Nibiru-safe. Ghost Belle on Necrom is the hardest hit — collapses FS engine entirely. Coatl in GY before Berfomet protects against Imperm/Veiler targeting Berfomet.',
    },
  },

  // Line C — Gazelle + Fiend/Illusion + 1 Discard (Full Endboard: King + Caesar + A Bao)
  {
    id: 'chimera-line-c',
    archetypeId: 'chimera-fiendsmith',
    name: 'Gazelle + Fiend/Illusion + Discard (Full Endboard)',
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: 'Normal Summon Gazelle — search Chimera Fusion from deck.',
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Gazelle the King of Mythical Claws', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Chimera Fusion',                     role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: 'Activate Chimera Fusion — fuse Gazelle + Fiend/Illusion from hand into Berfomet. CL1 Gazelle, CL2 Berfomet. Berfomet sends Necrom to GY; Necrom banishes to SS Adusted Gold; Gazelle searches Nightmare Apprentice.',
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Chimera Fusion',                           role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Gazelle the King of Mythical Claws',       role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'target', fromZone: 'extra', toZone: 'field' },
          { name: 'Evil HERO Sinister Necrom',                role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
          { name: 'Evil HERO Adusted Gold',                   role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'Nightmare Apprentice',                     role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Chimera Fusion',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'CF GY recovery funds the set CF for the Draw Phase loop.',
          },
          intermediateState: {
            field: ['Berfomet the Mythical King of Phantom Beasts', 'Evil HERO Adusted Gold'],
            gy:    ['Chimera Fusion', 'Evil HERO Sinister Necrom'],
            hand:  ['Nightmare Apprentice'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 2,
        description: "CF GY → hand. Link Adusted Gold → Requiem. Requiem tributes → Lacrima. Lacrima sends Engraver to GY. Requiem equips to Lacrima. Contact fuse Lacrima + Requiem → Necroquip Princess.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.LINK_SUMMON, STEP_TAGS.SPECIAL_SUMMON, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Chimera Fusion',          role: 'activator', fromZone: 'gy',    toZone: 'hand'  },
          { name: 'Evil HERO Adusted Gold',  role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: "Fiendsmith's Requiem",    role: 'target',    fromZone: 'extra', toZone: 'field' },
          { name: 'Lacrima the Crimson Tears', role: 'target',  fromZone: 'deck',  toZone: 'field' },
          { name: 'Fiendsmith Engraver',     role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
          { name: 'Necroquip Princess',      role: 'target',    fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 3,
        description: 'Discard 1 card to SS Nightmare Apprentice. Apprentice searches Coatl (or Mirror if Coatl was used earlier). Coatl discards to search Mirror — Necroquip draws 1 from Coatl send.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DISCARD, STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Nightmare Apprentice', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Cornfield Coatl',      role: 'target',    fromZone: 'deck', toZone: 'hand'  },
          { name: 'Cornfield Coatl',      role: 'cost',      fromZone: 'hand', toZone: 'gy'    },
          { name: 'Mirror Swordknight',   role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Cornfield Coatl',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Coatl in GY enables targeting negate. Its discard also triggers Necroquip Princess draw 1.',
          },
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 4,
        description: 'Xyz overlay Necroquip Princess (Level 6) + Berfomet (Level 6) into D/D/D Wave High King Caesar.',
        tags: [STEP_TAGS.XYZ_SUMMON],
        cards: [
          { name: 'Necroquip Princess',            role: 'material', fromZone: 'field', toZone: 'field' },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'material', fromZone: 'field', toZone: 'field' },
          { name: 'D/D/D Wave High King Caesar',   role: 'target',   fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 5,
        description: 'Engraver SSs from GY (returning Adusted Gold to deck). Link Engraver + Apprentice → Sequence. Sequence fuses into FS Lacrima (returns Tears + Requiem to deck as materials).',
        tags: [STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.LINK_SUMMON, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Fiendsmith Engraver',       role: 'activator', fromZone: 'gy',    toZone: 'field' },
          { name: 'Nightmare Apprentice',      role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: "Fiendsmith's Sequence",     role: 'target',    fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 6,
        description: 'FS Lacrima SSs Fiendsmith Engraver from GY. Link Sequence + Engraver + FS Lacrima into A Bao A Qu.',
        tags: [STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: 'Fiendsmith Engraver',         role: 'target',   fromZone: 'gy',    toZone: 'field' },
          { name: "Fiendsmith's Sequence",       role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'A Bao A Qu, the Lightless Shadow', role: 'target', fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 7,
        description: 'A Bao discards Mirror → SSs Mirror from GY (A Bao banishes itself). Mirror tributes → Big-Wing. Big-Wing searches Gazelle + CF. CF fuses Gazelle + Big-Wing → King. CL1 Big-Wing, CL2 King. Big-Wing GY SSs Mirror.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DISCARD, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.SPECIAL_FROM_DECK, STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Mirror Swordknight',                 role: 'cost',      fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Mirror Swordknight',                 role: 'target',    fromZone: 'gy',    toZone: 'field' },
          { name: 'Big-Winged Berfomet',                role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'Gazelle the King of Mythical Claws', role: 'material',  fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Chimera the King of Phantom Beasts', role: 'target',    fromZone: 'extra', toZone: 'field' },
          { name: 'Mirror Swordknight',                 role: 'target',    fromZone: 'gy',    toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 8,
        description: 'Set Chimera Fusion. End Phase: A Bao returns. King hand rip fires.',
        tags: [STEP_TAGS.SET],
        cards: [
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'gy', toZone: 'hand' },
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'hand', toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Chimera the King of Phantom Beasts', 'D/D/D Wave High King Caesar', 'A Bao A Qu, the Lightless Shadow'],
      gy:    ['Mirror Swordknight (monster negate)', 'Cornfield Coatl (targeting negate)', 'Fiendsmith Engraver'],
      hand:  ['Mirror Swordknight', 'Chimera Fusion'],
      notes: 'Full endboard: King hand rip + Caesar double SS negate + A Bao pop (CF cost) + Mirror GY negate + Coatl GY negate. Set CF for Draw Phase loop. If Nibiru before Caesar: extend with Engraver + Nibiru token → Sequence → A Bao.',
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Gazelle NS search negates CF access. Droll after first search locks further searches.",
      },
      {
        afterStepIndex: 3,
        interruptCategories: [INTERRUPT_CATEGORIES.HAND_TRAP, INTERRUPT_CATEGORIES.NEGATE_SUMMON],
        description: "Nibiru on 5th summon wipes board. Recovery path: Engraver + Nibiru token → Sequence → A Bao.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.BOARD_WIPE,
        BREAKING_CATEGORIES.GY_BANISH,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Ghost Belle & Haunted Mansion',
        'Nibiru the Primal Being',
        'Dark Ruler No More',
      ],
      notes: 'Not Nibiru-safe. Ghost Belle on Necrom collapses FS engine — fall back to pure Chimera endboard. Coatl in GY before Berfomet provides Imperm/Veiler protection.',
    },
  },

  // Line D — Gazelle + CF or Necrom + 1 Discard (FS Standard, Nibiru-safe version)
  {
    id: 'chimera-line-d',
    archetypeId: 'chimera-fiendsmith',
    name: 'Gazelle + CF/Necrom + Discard (FS Standard)',
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: 'Normal Summon Gazelle — search whichever is missing: Chimera Fusion or Evil HERO Sinister Necrom.',
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Gazelle the King of Mythical Claws', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Evil HERO Sinister Necrom',          role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: 'Activate CF — fuse Gazelle + Necrom into Berfomet. Berfomet sends Mirror Swordknight to GY (not Coatl — protects against Bystial and blocks Izuna → Lupis). Necrom banishes → SS Adusted Gold. Gazelle float searches Nightmare Apprentice.',
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Chimera Fusion',                           role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Gazelle the King of Mythical Claws',       role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Evil HERO Sinister Necrom',                role: 'material',  fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'target', fromZone: 'extra', toZone: 'field' },
          { name: 'Mirror Swordknight',                       role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
          { name: 'Evil HERO Adusted Gold',                   role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'Nightmare Apprentice',                     role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Mirror Swordknight',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Mirror in GY enables Draw Phase loop. Sending Mirror (not Coatl) specifically blocks Bystial from banishing Mirror and prevents Izuna accessing Lupis.',
          },
          intermediateState: {
            field: ['Berfomet the Mythical King of Phantom Beasts', 'Evil HERO Adusted Gold'],
            gy:    ['Chimera Fusion', 'Mirror Swordknight', 'Evil HERO Sinister Necrom'],
            hand:  ['Nightmare Apprentice'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 2,
        description: "CF GY → hand. Link Adusted Gold → Requiem. Requiem tributes → Lacrima. Lacrima sends Engraver to GY. Requiem equips to Lacrima. Contact fuse Lacrima + Requiem → Necroquip Princess.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.LINK_SUMMON, STEP_TAGS.SPECIAL_SUMMON, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Chimera Fusion',           role: 'activator', fromZone: 'gy',    toZone: 'hand'  },
          { name: 'Evil HERO Adusted Gold',   role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: "Fiendsmith's Requiem",     role: 'target',    fromZone: 'extra', toZone: 'field' },
          { name: 'Lacrima the Crimson Tears', role: 'target',   fromZone: 'deck',  toZone: 'field' },
          { name: 'Fiendsmith Engraver',      role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
          { name: 'Necroquip Princess',       role: 'target',    fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 3,
        description: 'Discard 1 → SS Apprentice → search Coatl. Coatl discards → search Mirror. Necroquip draws 1 from Coatl send.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.DISCARD, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Nightmare Apprentice', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Cornfield Coatl',      role: 'target',    fromZone: 'deck', toZone: 'hand'  },
          { name: 'Cornfield Coatl',      role: 'cost',      fromZone: 'hand', toZone: 'gy'    },
          { name: 'Mirror Swordknight',   role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Cornfield Coatl',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Coatl in GY activates targeting negate (banish to negate+destroy targeting effect while FMB on field).',
          },
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 4,
        description: 'Xyz overlay Necroquip Princess (Level 6) + Berfomet (Level 6) → D/D/D Wave High King Caesar.',
        tags: [STEP_TAGS.XYZ_SUMMON],
        cards: [
          { name: 'Necroquip Princess',          role: 'material', fromZone: 'field', toZone: 'field' },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'material', fromZone: 'field', toZone: 'field' },
          { name: 'D/D/D Wave High King Caesar', role: 'target',   fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 5,
        description: 'Engraver SSs from GY. Link Engraver + Apprentice → Sequence. Sequence → FS Lacrima (returns Tears + Requiem).',
        tags: [STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.LINK_SUMMON, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Fiendsmith Engraver',    role: 'activator', fromZone: 'gy',    toZone: 'field' },
          { name: 'Nightmare Apprentice',   role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: "Fiendsmith's Sequence",  role: 'target',    fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 6,
        description: 'FS Lacrima SSs Lacrima (Tears) from GY. Link Sequence + Tears + FS Lacrima → A Bao A Qu.',
        tags: [STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.LINK_SUMMON],
        cards: [
          { name: 'Lacrima the Crimson Tears',       role: 'target',   fromZone: 'gy',    toZone: 'field' },
          { name: "Fiendsmith's Sequence",           role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'A Bao A Qu, the Lightless Shadow', role: 'target',  fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 7,
        description: 'A Bao discards Mirror → SSs Mirror from GY. Mirror tributes → Big-Wing → searches Gazelle + CF → CF fuses Gazelle + Big-Wing → King. CL1 Big-Wing, CL2 King. Big-Wing GY SSs Mirror.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DISCARD, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Mirror Swordknight',                 role: 'cost',     fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Mirror Swordknight',                 role: 'target',   fromZone: 'gy',    toZone: 'field' },
          { name: 'Big-Winged Berfomet',                role: 'target',   fromZone: 'deck',  toZone: 'field' },
          { name: 'Gazelle the King of Mythical Claws', role: 'material', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Chimera the King of Phantom Beasts', role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Mirror Swordknight',                 role: 'target',   fromZone: 'gy',    toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 8,
        description: 'Set Chimera Fusion. End Phase: A Bao returns. King hand rip fires.',
        tags: [STEP_TAGS.SET],
        cards: [
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'gy',   toZone: 'hand'  },
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'hand', toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Chimera the King of Phantom Beasts', 'D/D/D Wave High King Caesar', 'A Bao A Qu, the Lightless Shadow'],
      gy:    ['Mirror Swordknight (monster negate)', 'Cornfield Coatl (targeting negate)', 'Fiendsmith Engraver'],
      hand:  ['Mirror Swordknight', 'Chimera Fusion'],
      notes: 'Nibiru-safe if stopped after Caesar (4 summons before Caesar). Berfomet sends Mirror specifically to counter Bystial and block Izuna → Lupis access. If Nibiru fires before Caesar: Engraver + Nibiru token → Sequence → A Bao.',
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Gazelle NS search stalls CF access.",
      },
      {
        afterStepIndex: 1,
        interruptCategories: [INTERRUPT_CATEGORIES.HAND_TRAP, INTERRUPT_CATEGORIES.NEGATE_EFFECT],
        description: "Ghost Belle on Necrom GY effect — Adusted Gold never hits field. Recovery: SS Apprentice, get Mirror, link into FS Moon → A Bao path.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.GY_BANISH,
        BREAKING_CATEGORIES.BOARD_WIPE,
      ],
      namedCounters: [
        'Ghost Belle & Haunted Mansion',
        'Ash Blossom & Joyous Spring',
        'Nibiru the Primal Being',
        'Dark Ruler No More',
      ],
      notes: 'Nibiru-safe before Caesar if timed correctly. Ghost Belle on Necrom is the hardest counter — collapses FS engine. Berfomet sending Mirror (not Coatl) is a deliberate choice to counter specific meta threats.',
    },
  },

  // Line F — Gazelle + Fiendsmith's Tract (FS Engine First, No Hand Rip)
  {
    id: 'chimera-line-f',
    archetypeId: 'chimera-fiendsmith',
    name: "Gazelle + Fiendsmith's Tract (FS Engine First)",
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: "Activate Fiendsmith's Tract — add Fabled Lurrie to hand, discard Lurrie. Lurrie SSs from GY. Link Lurrie → Requiem. Requiem tributes → Lacrima. Lacrima sends Engraver to GY. Engraver SSs (returning Lurrie to deck).",
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.LINK_SUMMON, STEP_TAGS.SPECIAL_SUMMON, STEP_TAGS.SEND_TO_GY],
        cards: [
          { name: "Fiendsmith's Tract",    role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Fabled Lurrie',         role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
          { name: "Fiendsmith's Requiem",  role: 'target',    fromZone: 'extra', toZone: 'field' },
          { name: 'Lacrima the Crimson Tears', role: 'target', fromZone: 'deck', toZone: 'field' },
          { name: 'Fiendsmith Engraver',   role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Fiendsmith Engraver',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Engraver in GY SSs at step 1 — returns Lurrie/Adusted Gold to deck and provides a body for Sequence.',
          },
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 1,
        description: 'Link Lacrima + Engraver → Sequence. Sequence fuses → FS Lacrima (returns Requiem + Lacrima to deck). FS Lacrima SSs Engraver from GY. Xyz Lacrima + Engraver → D/D/D Wave High King Caesar.',
        tags: [STEP_TAGS.LINK_SUMMON, STEP_TAGS.FUSION_SUMMON, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.XYZ_SUMMON],
        cards: [
          { name: 'Lacrima the Crimson Tears',     role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: 'Fiendsmith Engraver',           role: 'material', fromZone: 'field', toZone: 'gy'    },
          { name: "Fiendsmith's Sequence",         role: 'target',   fromZone: 'extra', toZone: 'field' },
          { name: 'Fiendsmith Engraver',           role: 'target',   fromZone: 'gy',    toZone: 'field' },
          { name: 'D/D/D Wave High King Caesar',   role: 'target',   fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 2,
        description: 'Normal Summon Gazelle → search Chimera Fusion. Activate CF — fuse Gazelle + Sequence → Berfomet. Berfomet sends Mirror Swordknight to GY. Gazelle float searches Cornfield Coatl.',
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.SEARCH, STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Gazelle the King of Mythical Claws',       role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Chimera Fusion',                           role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Gazelle the King of Mythical Claws',       role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: "Fiendsmith's Sequence",                    role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'target', fromZone: 'extra', toZone: 'field' },
          { name: 'Mirror Swordknight',                       role: 'target',    fromZone: 'deck',  toZone: 'gy'    },
          { name: 'Cornfield Coatl',                          role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Mirror Swordknight',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Mirror in GY enables Draw Phase loop — tributes from GY to SS Big-Wing each turn.',
          },
          intermediateState: {
            field: ['Berfomet the Mythical King of Phantom Beasts', 'D/D/D Wave High King Caesar'],
            gy:    ['Chimera Fusion', 'Mirror Swordknight', 'Fiendsmith Engraver'],
            hand:  ['Cornfield Coatl'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 3,
        description: 'Coatl discards itself to search Gazelle (for next-turn fusion follow-up). CF GY → hand. Set CF. End turn.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.DISCARD, STEP_TAGS.SEARCH, STEP_TAGS.SET],
        cards: [
          { name: 'Cornfield Coatl',                    role: 'cost',      fromZone: 'hand', toZone: 'gy'   },
          { name: 'Gazelle the King of Mythical Claws', role: 'target',    fromZone: 'deck', toZone: 'hand' },
          { name: 'Chimera Fusion',                     role: 'activator', fromZone: 'gy',   toZone: 'hand' },
          { name: 'Chimera Fusion',                     role: 'activator', fromZone: 'hand', toZone: 'field'},
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.FIELD,
            cards: ['Berfomet the Mythical King of Phantom Beasts'],
            description: 'Berfomet (Chimera FMB name) must be on field for CF GY recovery to activate.',
          },
          consumedResource: {
            card: 'Cornfield Coatl',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Coatl in GY enables targeting negate. Coatl searches Gazelle (not Mirror) here because Gazelle enables the next-turn CF fusion loop.',
          },
          intermediateState: {
            field: ['Berfomet the Mythical King of Phantom Beasts', 'D/D/D Wave High King Caesar', 'Chimera Fusion (set)'],
            gy:    ['Mirror Swordknight', 'Cornfield Coatl', 'Fiendsmith Engraver'],
            hand:  ['Gazelle the King of Mythical Claws'],
          },
          causesCheckpointAt: null,
        },
      },
    ],

    endboard: {
      field: ['Berfomet the Mythical King of Phantom Beasts', 'D/D/D Wave High King Caesar'],
      gy:    ['Mirror Swordknight (monster negate)', 'Cornfield Coatl (targeting negate)', 'Fiendsmith Engraver'],
      hand:  ['Gazelle the King of Mythical Claws'],
      notes: 'No hand rip (King not summoned). Coatl searches Gazelle for next-turn CF loop rather than Mirror. If opening with Engraver instead of Tract: NS Gazelle first to bait Ash/Droll before committing Engraver.',
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_SPELL, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Fiendsmith's Tract activation — FS engine never starts. Without Tract, use Engraver discard into Tract as fallback if available.",
      },
      {
        afterStepIndex: 2,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_SPELL, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Chimera Fusion activation — King/Berfomet never resolves, GY negates not set up.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.SPELL_TRAP_REMOVAL,
        BREAKING_CATEGORIES.GY_BANISH,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        "Fiendsmith's Tract",
        'Droll & Lock Bird',
        'Cosmic Cyclone',
      ],
      notes: 'No hand rip is the key weakness vs pure Chimera lines. Set CF is still the loop engine. Coatl searches Gazelle (not Mirror) — this is intentional for follow-up, not a suboptimal choice.',
    },
  },

  // Line G — Basic Pure Chimera (Gazelle + Mirror + 1 Discard, with Evolzar Lars)
  {
    id: 'chimera-line-g',
    archetypeId: 'chimera',
    name: 'Gazelle + Mirror + Discard (Pure with Lars)',
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: 'Normal Summon Gazelle — search Chimera Fusion.',
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Gazelle the King of Mythical Claws', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Chimera Fusion',                     role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: 'Activate CF — fuse Gazelle + Mirror Swordknight into Berfomet. CL1 Berfomet, CL2 Gazelle. Berfomet sends Master Tao to GY. Master Tao SSs Mirror from GY. Gazelle float searches Nightmare Apprentice.',
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Chimera Fusion',                           role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Gazelle the King of Mythical Claws',       role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Mirror Swordknight',                       role: 'material',  fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'target', fromZone: 'extra', toZone: 'field' },
          { name: 'Mirror Swordknight',                       role: 'target',    fromZone: 'gy',    toZone: 'field' },
          { name: 'Nightmare Apprentice',                     role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Mirror Swordknight',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Mirror in GY — but note: Mirror is revived to field via Master Tao in this line, not left in GY for negate. GY negate activates when Mirror returns to GY after tributing for Big-Wing.',
          },
          intermediateState: null,
          causesCheckpointAt: null,
        },
      },
      {
        index: 2,
        description: 'CF GY → hand. Discard 1 → SS Nightmare Apprentice → search Cornfield Coatl. Xyz overlay Nightmare Apprentice (Level 6) + Berfomet (Level 6) → Evolzar Lars.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.SEARCH, STEP_TAGS.XYZ_SUMMON],
        cards: [
          { name: 'Chimera Fusion',                           role: 'activator', fromZone: 'gy',    toZone: 'hand'  },
          { name: 'Nightmare Apprentice',                     role: 'activator', fromZone: 'hand',  toZone: 'field' },
          { name: 'Cornfield Coatl',                          role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
          { name: 'Nightmare Apprentice',                     role: 'material',  fromZone: 'field', toZone: 'field' },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'material', fromZone: 'field', toZone: 'field' },
          { name: 'Evolzar Lars',                             role: 'target',    fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 3,
        description: 'Mirror Swordknight (on field) Quick Effect — tribute itself to SS Big-Winged Berfomet from deck. Big-Wing searches Gazelle + CF. Activate CF — fuse Big-Wing + Gazelle → Chimera the King. CL1 Big-Wing, CL2 King.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK, STEP_TAGS.SEARCH, STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON],
        cards: [
          { name: 'Mirror Swordknight',                 role: 'cost',      fromZone: 'field', toZone: 'gy'    },
          { name: 'Big-Winged Berfomet',                role: 'target',    fromZone: 'deck',  toZone: 'field' },
          { name: 'Gazelle the King of Mythical Claws', role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
          { name: 'Chimera Fusion',                     role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Big-Winged Berfomet',                role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Gazelle the King of Mythical Claws', role: 'material',  fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Chimera the King of Phantom Beasts', role: 'target',    fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Mirror Swordknight',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Mirror in GY from tribute enables Draw Phase loop and monster negate (active as long as Chimera FMB is on field).',
          },
          intermediateState: {
            field: ['Chimera the King of Phantom Beasts', 'Evolzar Lars'],
            gy:    ['Chimera Fusion', 'Mirror Swordknight'],
            hand:  ['Cornfield Coatl'],
          },
          causesCheckpointAt: null,
        },
      },
      {
        index: 4,
        description: 'CF GY → hand. Set CF. End Phase: King hand rip fires. NOTE: Coatl is in hand in this line — its GY targeting negate is NOT active until Coatl reaches GY.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SET],
        cards: [
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'gy',   toZone: 'hand'  },
          { name: 'Chimera Fusion', role: 'activator', fromZone: 'hand', toZone: 'field' },
        ],
        checkpoint: null,
      },
    ],

    endboard: {
      field: ['Chimera the King of Phantom Beasts', 'Evolzar Lars'],
      gy:    ['Mirror Swordknight (monster negate)'],
      hand:  ['Cornfield Coatl (in hand, NOT in GY — targeting negate NOT active)'],
      notes: 'Set CF. Nibiru-safe (4 summons). Coatl is in hand — its GY negate is inactive. Master Tao GY effect SSs Mirror to field, enabling the Big-Wing pivot without losing the Chimera FMB name. Lars provides a pseudo-omni negate.',
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Gazelle NS search negates CF access.",
      },
      {
        afterStepIndex: 1,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_SPELL, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on CF activation negates the Fusion Summon. Master Tao never hits GY, Mirror never revives.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.SPELL_TRAP_REMOVAL,
        BREAKING_CATEGORIES.GY_BANISH,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Droll & Lock Bird',
        'Cosmic Cyclone',
        'Infinite Impermanence',
      ],
      notes: 'Nibiru-safe (4 summons). Coatl in hand is NOT a GY negate — opponent can target freely in this line until Coatl is discarded. Lars provides pseudo-omni negate to compensate.',
    },
  },

  // Line H — Gazelle + Frightfur Patchwork (Floodgate Pure, Chimera Frightfur)
  {
    id: 'chimera-line-h',
    archetypeId: 'chimera-frightfur',
    name: 'Gazelle + Frightfur Patchwork (Floodgate Pure)',
    valid_from: '2024-10-01',

    steps: [
      {
        index: 0,
        description: 'Normal Summon Gazelle → search CF. If Frightfur Patchwork in hand: activate Patchwork → search Edge Imp Chain + Polymerization.',
        tags: [STEP_TAGS.NORMAL_SUMMON, STEP_TAGS.SEARCH, STEP_TAGS.ACTIVATE_SPELL],
        cards: [
          { name: 'Gazelle the King of Mythical Claws', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Chimera Fusion',                     role: 'target',    fromZone: 'deck', toZone: 'hand'  },
          { name: 'Frightfur Patchwork',                role: 'activator', fromZone: 'hand', toZone: 'gy'    },
          { name: 'Edge Imp Chain',                     role: 'target',    fromZone: 'deck', toZone: 'hand'  },
          { name: 'Polymerization',                     role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 1,
        description: 'Activate CF — fuse Gazelle + Edge Imp Chain → Chimera the King. CL1 Gazelle, CL2 Imp, CL3 King. King hand rip queued. Gazelle float searches Nightmare Apprentice. Imp searches Frightfur Patchwork (as draw engine / next-turn CF material).',
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON, STEP_TAGS.SEARCH],
        cards: [
          { name: 'Chimera Fusion',                     role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Gazelle the King of Mythical Claws', role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Edge Imp Chain',                     role: 'material',  fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Chimera the King of Phantom Beasts', role: 'target',    fromZone: 'extra', toZone: 'field' },
          { name: 'Nightmare Apprentice',               role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
          { name: 'Frightfur Patchwork',                role: 'target',    fromZone: 'deck',  toZone: 'hand'  },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Chimera Fusion',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'CF GY effect used on opponent\'s Main Phase (the banish version) to SS Gazelle + Berfomet — this triggers the floodgate deployment chain.',
          },
          intermediateState: {
            field: ['Chimera the King of Phantom Beasts'],
            gy:    ['Chimera Fusion', 'Gazelle the King of Mythical Claws', 'Edge Imp Chain'],
            hand:  ['Nightmare Apprentice', 'Frightfur Patchwork', 'Polymerization'],
          },
          causesCheckpointAt: 5,
        },
      },
      {
        index: 2,
        description: 'CF GY → hand. Discard Patchwork → SS Nightmare Apprentice → search Cornfield Coatl. Coatl discards → search Mirror Swordknight.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_HAND, STEP_TAGS.SEARCH, STEP_TAGS.DISCARD],
        cards: [
          { name: 'Chimera Fusion',       role: 'activator', fromZone: 'gy',   toZone: 'hand'  },
          { name: 'Frightfur Patchwork',  role: 'cost',      fromZone: 'hand', toZone: 'gy'    },
          { name: 'Nightmare Apprentice', role: 'activator', fromZone: 'hand', toZone: 'field' },
          { name: 'Cornfield Coatl',      role: 'target',    fromZone: 'deck', toZone: 'hand'  },
          { name: 'Cornfield Coatl',      role: 'cost',      fromZone: 'hand', toZone: 'gy'    },
          { name: 'Mirror Swordknight',   role: 'target',    fromZone: 'deck', toZone: 'hand'  },
        ],
        checkpoint: null,
      },
      {
        index: 3,
        description: 'Activate Polymerization — fuse King (field) + Mirror Swordknight (hand) → Berfomet. Berfomet sends Master Tao to GY. Master Tao SSs Mirror from GY. Xyz Nightmare Apprentice (Level 6) + Berfomet (Level 6) → Evolzar Lars.',
        tags: [STEP_TAGS.ACTIVATE_SPELL, STEP_TAGS.FUSION_SUMMON, STEP_TAGS.SPECIAL_FROM_GY, STEP_TAGS.XYZ_SUMMON],
        cards: [
          { name: 'Polymerization',                           role: 'activator', fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Chimera the King of Phantom Beasts',       role: 'material',  fromZone: 'field', toZone: 'gy'    },
          { name: 'Mirror Swordknight',                       role: 'material',  fromZone: 'hand',  toZone: 'gy'    },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'target', fromZone: 'extra', toZone: 'field' },
          { name: 'Mirror Swordknight',                       role: 'target',    fromZone: 'gy',    toZone: 'field' },
          { name: 'Nightmare Apprentice',                     role: 'material',  fromZone: 'field', toZone: 'field' },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'material', fromZone: 'field', toZone: 'field' },
          { name: 'Evolzar Lars',                             role: 'target',    fromZone: 'extra', toZone: 'field' },
        ],
        checkpoint: null,
      },
      {
        index: 4,
        description: 'Mirror tributes → SS Big-Wing from deck. Big-Wing searches Gazelle + CF. Set 2 copies of CF. End turn. End Phase: King hand rip fires.',
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.SPECIAL_FROM_DECK, STEP_TAGS.SEARCH, STEP_TAGS.SET],
        cards: [
          { name: 'Mirror Swordknight',                 role: 'cost',   fromZone: 'field', toZone: 'gy'   },
          { name: 'Big-Winged Berfomet',                role: 'target', fromZone: 'deck',  toZone: 'field'},
          { name: 'Gazelle the King of Mythical Claws', role: 'target', fromZone: 'deck',  toZone: 'hand' },
          { name: 'Chimera Fusion',                     role: 'target', fromZone: 'deck',  toZone: 'hand' },
        ],
        checkpoint: {
          gateCondition: null,
          consumedResource: {
            card: 'Mirror Swordknight',
            toZone: CHECKPOINT_ZONES.GY,
            downstreamDependency: 'Mirror in GY for Draw Phase loop. Also: two CF set — second CF (GY banish effect) used on opponent\'s Main Phase to trigger Berfomet dump of floodgate.',
          },
          intermediateState: {
            field: ['Berfomet the Mythical King of Phantom Beasts', 'Lars', 'Big-Winged Berfomet', 'Chimera Fusion (set x2)'],
            gy:    ['Chimera Fusion (first copy)', 'Mirror Swordknight', 'Cornfield Coatl', 'King (for GY revival)'],
            hand:  ['Gazelle the King of Mythical Claws', 'Edge Imp Chain (from Big-Wing search via Berfomet GY)'],
          },
          causesCheckpointAt: 5,
        },
      },
      {
        index: 5,
        description: "OPPONENT'S MAIN PHASE: CF (GY banish effect — Chimera FMB on field/GY) banishes itself to SS Gazelle + Berfomet from deck/GY. CF (second set copy) fuses Gazelle + Big-Wing → Berfomet. Berfomet send effect dumps Barrier Statue of the Abyss to GY. Big-Wing GY float SSs Mirror. Mirror tributes → Big-Wing. Big-Wing searches Gazelle + CF. King GY banishes itself to SS Barrier Statue from GY as floodgate.",
        tags: [STEP_TAGS.ACTIVATE_EFFECT, STEP_TAGS.BANISH, STEP_TAGS.SPECIAL_SUMMON, STEP_TAGS.FUSION_SUMMON, STEP_TAGS.SEND_TO_GY],
        cards: [
          { name: 'Chimera Fusion',                           role: 'activator', fromZone: 'gy',    toZone: 'banished' },
          { name: 'Gazelle the King of Mythical Claws',       role: 'target',    fromZone: 'deck',  toZone: 'field'    },
          { name: 'Big-Winged Berfomet',                      role: 'target',    fromZone: 'deck',  toZone: 'field'    },
          { name: 'Berfomet the Mythical King of Phantom Beasts', role: 'target', fromZone: 'extra', toZone: 'field'   },
          { name: 'Barrier Statue of the Abyss',              role: 'target',    fromZone: 'deck',  toZone: 'gy'       },
          { name: 'Barrier Statue of the Abyss',              role: 'target',    fromZone: 'gy',    toZone: 'field'    },
        ],
        checkpoint: {
          gateCondition: {
            zone: CHECKPOINT_ZONES.GY,
            cards: ['Chimera the King of Phantom Beasts'],
            description: "King must be in GY to banish itself and SS the floodgate. King reaches GY after Berfomet contact-fused over it at step 3.",
          },
          consumedResource: {
            card: 'Chimera the King of Phantom Beasts',
            toZone: CHECKPOINT_ZONES.BANISHED,
            downstreamDependency: 'King banishes itself to SS any banished Beast/Fiend/Illusion — specifically SSs Barrier Statue from GY as the floodgate.',
          },
          intermediateState: {
            field: ['Berfomet the Mythical King of Phantom Beasts', 'Evolzar Lars', 'Barrier Statue of the Abyss'],
            gy:    ['Mirror Swordknight (monster negate)', 'Cornfield Coatl (targeting negate)'],
            hand:  ['Gazelle the King of Mythical Claws', 'Edge Imp Chain'],
          },
          causesCheckpointAt: null,
        },
      },
    ],

    endboard: {
      field: ['Berfomet the Mythical King of Phantom Beasts', 'Evolzar Lars', 'Barrier Statue of the Abyss (floodgate)'],
      gy:    ['Mirror Swordknight (monster negate)', 'Cornfield Coatl (targeting negate)', 'Chimera the King (revived Abyss, now banished)'],
      hand:  ['Gazelle the King of Mythical Claws', 'Edge Imp Chain'],
      notes: 'Floodgate (Barrier Statue) deployed on opponent\'s Main Phase. Two materials in hand (Gazelle + Imp) for Guardian Chimera follow-up if Abyss is removed. King GY banish effect is the floodgate trigger — King must reach GY before opponent\'s turn via Polymerization fuse at step 3.',
    },

    chokePoints: [
      {
        afterStepIndex: 0,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.HAND_TRAP],
        description: "Ash on Gazelle NS search negates CF access. Ash on Patchwork activation prevents Edge Imp + Poly search.",
      },
      {
        afterStepIndex: 4,
        interruptCategories: [INTERRUPT_CATEGORIES.NEGATE_EFFECT, INTERRUPT_CATEGORIES.DESTROY],
        description: "If CF GY banish is negated on opponent's Main Phase, the floodgate deployment chain never fires. Opponent needs GY effect negate (Ghost Belle) to stop this.",
      },
    ],

    weaknesses: {
      breakingCategories: [
        BREAKING_CATEGORIES.HAND_TRAP,
        BREAKING_CATEGORIES.GY_BANISH,
        BREAKING_CATEGORIES.SPELL_TRAP_REMOVAL,
        BREAKING_CATEGORIES.MONSTER_NEGATION,
      ],
      namedCounters: [
        'Ash Blossom & Joyous Spring',
        'Ghost Belle & Haunted Mansion',
        'Cosmic Cyclone',
        'Droll & Lock Bird',
      ],
      notes: 'Ghost Belle on CF GY banish (opponent Main Phase) prevents floodgate deployment. If Abyss is removed after deployment, Gazelle + Imp Chain in hand are the immediate Guardian Chimera follow-up. CF GY banish timing is critical — must fire during opponent\'s Main Phase.',
    },
  },
];
