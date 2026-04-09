/**
 * Popular Decks Database
 *
 * Compact reference of the most popular Yu-Gi-Oh! archetypes used as
 * AI context during combo generation for unknown uploaded decks.
 *
 * Each entry:
 *   name      {string}    Archetype display name.
 *   starters  {string[]}  Key combo-starter card names (cards that begin the main lines).
 *   notes     {string}    Brief strategy note for the AI to understand the game plan.
 */

export const POPULAR_DECKS = [
  {
    name: 'Fiendsmith',
    starters: ['Fiendsmith Engraver', "Fiendsmith's Tract", "Fiendsmith's Sanct", 'Lacrima the Crimson Tears', 'Fabled Lurrie'],
    notes: 'Fiend-type combo engine. Engraver Normal Summon sends Sanct to GY. Lacrima searches engine cards.',
  },
  {
    name: 'Snake-Eye',
    starters: ['Snake-Eye Ash', 'Snake-Eye Oak', 'Diabellstar the Black Witch', 'Promethean Princess, Bestower of Flames', 'Original Sinful Spoils - Snake-Eye', 'Bonfire'],
    notes: 'FIRE monster combo deck. Ash and Oak are primary starters. Diabellstar searches Sinful Spoils.',
  },
  {
    name: 'Branded Despia',
    starters: ['Aluber the Jester of Despia', 'Fallen of Albaz', 'Branded Fusion', 'Despian Tragedy', 'Lubellion the Searing Dragon'],
    notes: 'Fusion-based grind deck. Branded Fusion is the key spell. Aluber searches Branded in High Spirits.',
  },
  {
    name: 'Yubel',
    starters: ['Yubel', 'Nightmare Throne', 'Samsara Lotus', 'The Leaking Chaos', 'Crimson Dragon'],
    notes: 'Yubel Spirit monster deck. Crimson Dragon and Nightmare Throne enable the Yubel engine.',
  },
  {
    name: 'Tenpai Dragon',
    starters: ['Tenpai Dragon Chundra', 'Tenpai Dragon Paidra', 'Tenpai Dragon Fadra', 'Sangen Summoning'],
    notes: 'FIRE Dragon Synchro deck focused on Crimson Dragon during battle phase. All Tenpai Dragons are 1-card starters.',
  },
  {
    name: 'Ryzeal',
    starters: ['Ryzeal Duplex', 'Ryzeal Cross', 'Ryzeal Link', 'Ryzeal Sting'],
    notes: 'Pendulum combo deck. Ryzeal monsters search each other and enable Pendulum Summons.',
  },
  {
    name: 'Swordsoul Tenyi',
    starters: ['Swordsoul of Mo Ye', 'Swordsoul of Taia', 'Incredible Ecclesia, the Virtuous', 'Tenyi Spirit - Adhara', 'Swordsoul Emergence'],
    notes: 'Wyrm Synchro deck. Mo Ye and Taia are primary starters. Tenyi monsters like Adhara are extenders. No true 1-card starters.',
  },
  {
    name: 'Labrynth',
    starters: ['Labrynth Chandraglier', 'Lovely Labrynth of the Silver Castle', 'Welcome Labrynth', 'Big Welcome Labrynth'],
    notes: 'Trap-heavy control deck. Chandraglier is the primary Normal Summon starter. Lovely Labrynth is the boss monster.',
  },
  {
    name: 'Sky Striker',
    starters: ['Sky Striker Mobilize - Engage!', 'Sky Striker Ace - Raye', 'Sky Striker Maneuver - Afterburners!', 'Sky Striker Mecha - Widow Anchor'],
    notes: 'Spell-based control deck. Engage is the key search spell. Raye is the primary monster.',
  },
  {
    name: 'Superheavy Samurai',
    starters: ['Superheavy Samurai Prodigy Wakaushi', 'Superheavy Samurai Soulpiercer', 'Superheavy Samurai Monk Big Benkei', 'Superheavy Samurai Scarecrow'],
    notes: 'Machine Synchro deck. Wakaushi is the primary 1-card starter. Deck runs no spells/traps.',
  },
  {
    name: 'Voiceless Voice',
    starters: ['Lo, the Prayers of the Voiceless Voice', 'Saffira, Dragon Queen of the Voiceless Voice', 'Sauravis, the Ancient and Ascended', 'Skull Guardian, the Prayed Invoker'],
    notes: 'Ritual monster deck. Lo searches Saffira. Saffira is the key Ritual boss.',
  },
  {
    name: 'Azamina',
    starters: ['Azamina Moa Regina', 'Azamina Sol Regina', 'Azamina Rhea Silveria', 'Malevolent Mech - Goku En'],
    notes: 'DARK combo deck. Moa Regina searches key pieces. Strong going-first strategy.',
  },
  {
    name: 'Vanquish Soul',
    starters: ['Vanquish Soul Razen', 'Vanquish Soul Caesar Valius', 'Vanquish Soul Heavy Borger', 'Vanquish Soul Dr. Mad Love'],
    notes: 'FIRE Warrior beat-down deck. Razen is the primary starter. Caesar Valius is the main boss.',
  },
  {
    name: 'Horus / Ishizu',
    starters: ['King\'s Sarcophagus', 'Imsety, Glory of Horus', 'Nephilaias', 'Keldo the Sacred Protector'],
    notes: 'Hand control deck using Horus monsters. King\'s Sarcophagus enables the Horus summon chain.',
  },
  {
    name: 'Kashtira',
    starters: ['Kashtira Fenrir', 'Kashtira Unicorn', 'Kashtira Arise-Heart', 'Pressured Planet Wraitsoth'],
    notes: 'Banish-zone locking deck. Fenrir is the primary starter and searches Unicorn.',
  },
  {
    name: 'Rescue-ACE',
    starters: ['Rescue-ACE Turbulence', 'Rescue-ACE Hydrant', 'Rescue-ACE Impulse', 'ALERT!'],
    notes: 'Trap-based control deck. Turbulence is the primary starter setting 4 traps from deck.',
  },
  {
    name: 'Tearlaments',
    starters: ['Tearlaments Scheiren', 'Tearlaments Reinoheart', 'Tearlaments Merrli', 'Keldo the Sacred Protector'],
    notes: 'Fusion mill deck. Scheiren and Reinoheart are the main starters. Ishizu cards provide mill consistency.',
  },
  {
    name: 'Spright',
    starters: ['Spright Blue', 'Spright Jet', 'Spright Elf', 'Spright Starter'],
    notes: 'Level/Rank/Link 2 combo deck. Blue searches key pieces. Elf is the main Link monster.',
  },
  {
    name: 'Purrely',
    starters: ['Purrely', 'Purrely Sleepy Memory', 'Purrely Happy Memory', 'My Friend Purrely'],
    notes: 'Xyz deck using Purrely monsters. Purrely + any Quick-Play spell starts the main combo line.',
  },
  {
    name: 'Gem-Knight',
    starters: ['Gem-Knight Quarzt', 'Gem-Knight Nepyriam', 'Gem-Knight Lady Lapis Lazuli', 'Brilliant Fusion'],
    notes: 'Fusion combo deck. Brilliant Fusion sends Gem-Knights to GY enabling OTK lines.',
  },
];

/**
 * Returns a compact string representation for use in AI prompts.
 * Keeps token usage minimal while giving the AI enough pattern context.
 *
 * @returns {string}
 */
export function popularDecksSummary() {
  return POPULAR_DECKS
    .map(d => `${d.name}: ${d.starters.slice(0, 4).join(', ')}`)
    .join('\n');
}
