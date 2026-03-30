import type { ClassDefinition } from '@/schemas/character.ts';

export const CLASSES: ClassDefinition[] = [
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'Masters of weapons and armor, fighters excel in physical combat.',
    hitDie: 'd8',
    weaponProficiencies: ['all'],
    armorProficiencies: ['leather', 'chainmail', 'plate', 'shield', 'mithral_chainmail'],
    features: [
      {
        name: 'Hauler',
        level: 1,
        description: 'Add your CON modifier (if positive) to your gear slot capacity.',
        mechanic: { type: 'hauler' },
      },
      {
        name: 'Grit',
        level: 1,
        description: 'Choose STR or DEX. You have advantage on checks of that type to overcome an opposing force.',
        mechanic: { type: 'grit', stat: 'STR' }, // default, player chooses
      },
      {
        name: 'Weapon Mastery',
        level: 1,
        description: 'Choose one weapon type. Gain +1 to attack and damage with that type, plus half your level (rounded down).',
        mechanic: { type: 'weapon_mastery', bonus: 1 },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain Weapon Mastery with one additional weapon type', mechanic: { type: 'weapon_mastery_extra' } },
      { roll: [3, 6], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, or CON stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON'], amount: 2 } },
      { roll: [10, 11], description: 'Choose one kind of armor. +1 AC from that armor.', mechanic: { type: 'armor_mastery' } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'priest',
    name: 'Priest',
    description: 'Divine spellcasters devoted to their deity, priests heal allies and smite foes.',
    hitDie: 'd6',
    weaponProficiencies: ['club', 'crossbow', 'dagger', 'mace', 'longsword', 'staff', 'warhammer'],
    armorProficiencies: ['leather', 'chainmail', 'plate', 'shield', 'mithral_chainmail'],
    features: [
      {
        name: 'Turn Undead',
        level: 1,
        description: 'You know the Turn Undead spell for free. It does not count toward your number of known spells.',
        mechanic: { type: 'turn_undead' },
      },
      {
        name: 'Spellcasting',
        level: 1,
        description: 'You can cast priest spells using your WIS modifier.',
        mechanic: { type: 'spellcasting', stat: 'WIS' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain advantage on casting one spell you know', mechanic: { type: 'spell_advantage' } },
      { roll: [3, 6], description: '+1 to melee or ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 0 } },
      { roll: [7, 9], description: '+1 to priest spellcasting checks', mechanic: { type: 'spellcasting_bonus', amount: 1 } },
      { roll: [10, 11], description: '+2 to STR or WIS stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'WIS'], amount: 2 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
    spellcasting: { stat: 'WIS', spellList: 'priest' },
    spellsKnownByLevel: [
      [2, 0, 0, 0, 0], // Level 1: 2 tier-1
      [3, 0, 0, 0, 0], // Level 2
      [3, 1, 0, 0, 0], // Level 3
      [3, 2, 0, 0, 0], // Level 4
      [3, 2, 1, 0, 0], // Level 5
      [3, 2, 2, 0, 0], // Level 6
      [3, 3, 2, 1, 0], // Level 7
      [3, 3, 2, 2, 0], // Level 8
      [3, 3, 2, 2, 1], // Level 9
      [3, 3, 3, 2, 2], // Level 10
    ],
  },
  {
    id: 'thief',
    name: 'Thief',
    description: 'Cunning and stealthy, thieves excel at finding traps, picking locks, and striking from the shadows.',
    hitDie: 'd4',
    weaponProficiencies: ['club', 'crossbow', 'dagger', 'shortbow', 'shortsword'],
    armorProficiencies: ['leather', 'mithral_chainmail'],
    features: [
      {
        name: 'Backstab',
        level: 1,
        description: 'If you hit a creature unaware of your attack, deal an extra weapon die of damage. Add additional weapon dice equal to half your level (rounded down).',
        mechanic: { type: 'backstab', extraDice: 1 },
      },
      {
        name: 'Thievery',
        level: 1,
        description: 'You are adept at thieving skills. You have advantage on checks for climbing, sneaking, hiding, applying disguises, finding and disabling traps, and delicate tasks such as picking pockets and opening locks.',
        mechanic: { type: 'thievery', skills: ['climbing', 'sneaking', 'hiding', 'disguises', 'traps', 'delicate_tasks'] },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain advantage on initiative rolls', mechanic: { type: 'initiative_advantage' } },
      { roll: [3, 5], description: 'Backstab deals +1 dice of damage', mechanic: { type: 'backstab_extra_dice', amount: 1 } },
      { roll: [6, 9], description: '+2 to STR, DEX, or CHA stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CHA'], amount: 2 } },
      { roll: [10, 11], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'wizard',
    name: 'Wizard',
    description: 'Arcane spellcasters who wield powerful magic through study and intellect.',
    hitDie: 'd4',
    weaponProficiencies: ['dagger', 'staff'],
    armorProficiencies: ['none'],
    features: [
      {
        name: 'Spellcasting',
        level: 1,
        description: 'You can cast wizard spells using your INT modifier.',
        mechanic: { type: 'spellcasting', stat: 'INT' },
      },
      {
        name: 'Learning Spells',
        level: 1,
        description: 'You can permanently learn a wizard spell from a spell scroll by studying it for a day and succeeding on a DC 15 INT check. The scroll is consumed whether you succeed or fail.',
        mechanic: { type: 'scroll_learning' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Make one random magic item (see GM Guide)', mechanic: { type: 'make_magic_item' } },
      { roll: [3, 7], description: '+2 to INT stat or +1 to wizard spellcasting checks', mechanic: { type: 'spellcasting_bonus', amount: 1 } },
      { roll: [8, 9], description: 'Gain advantage on casting one spell you know', mechanic: { type: 'spell_advantage' } },
      { roll: [10, 11], description: 'Learn one additional wizard spell of any tier you know', mechanic: { type: 'learn_spell' } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
    spellcasting: { stat: 'INT', spellList: 'wizard' },
    spellsKnownByLevel: [
      [3, 0, 0, 0, 0], // Level 1: 3 tier-1
      [4, 0, 0, 0, 0], // Level 2
      [4, 1, 0, 0, 0], // Level 3
      [4, 2, 0, 0, 0], // Level 4
      [4, 2, 1, 0, 0], // Level 5
      [4, 3, 2, 0, 0], // Level 6
      [4, 3, 2, 1, 0], // Level 7
      [4, 4, 2, 2, 0], // Level 8
      [4, 4, 3, 2, 1], // Level 9
      [4, 4, 4, 2, 2], // Level 10
    ],
  },

  // ==================== EXPANSION CLASSES ====================

  {
    id: 'bard',
    name: 'Bard',
    description: 'Bards are welcome wanderers and wise advisors; it is their task to protect and share knowledge handed down through the ages.',
    hitDie: 'd6',
    weaponProficiencies: ['staff', 'spear', 'dagger', 'crossbow', 'mace', 'shortsword', 'shortbow'],
    armorProficiencies: ['chainmail', 'leather', 'shield'],
    features: [
      {
        name: 'Bardic Arts',
        level: 1,
        description: "You're trained in oration, performing arts, lore, and diplomacy. You have advantage on related checks.",
        mechanic: { type: 'bardic_arts', skills: ['oration', 'performing_arts', 'lore', 'diplomacy'] },
      },
      {
        name: 'Presence',
        level: 1,
        description: 'Make a DC 12 CHA check to Inspire (one target in near gains a luck token) or Fascinate (focus: transfix all chosen targets of level 4 or less within near).',
        mechanic: { type: 'presence', description: 'DC 12 CHA check: Inspire or Fascinate' },
      },
      {
        name: 'Magical Dabbler',
        level: 1,
        description: 'You can activate spell scrolls and wands using Charisma as your spellcasting stat. If you critically fail, roll a wizard mishap.',
        mechanic: { type: 'magical_dabbler', stat: 'CHA' },
      },
      {
        name: 'Prolific',
        level: 1,
        description: 'Add 1d6 to your learning rolls. Groups carousing with 1 or more bards add 1d6 to their rolls.',
        mechanic: { type: 'prolific' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain advantage on casting one scroll/wand you use', mechanic: { type: 'spell_advantage' } },
      { roll: [3, 6], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, CON, INT, WIS, or CHA stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], amount: 2 } },
      { roll: [10, 11], description: '+1 to Magical Dabbler rolls OR Improved Presence DC (can only take each once)', mechanic: { type: 'magical_dabbler_bonus', amount: 1 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'ranger',
    name: 'Ranger',
    description: 'Skilled trackers, stealthy wanderers, and peerless warriors who call the wilds their home.',
    hitDie: 'd8',
    weaponProficiencies: ['staff', 'spear', 'dagger', 'longbow', 'shortsword', 'shortbow', 'longsword'],
    armorProficiencies: ['chainmail', 'leather'],
    features: [
      {
        name: 'Wayfinder',
        level: 1,
        description: 'You have advantage on checks associated with navigation, tracking, bushcraft, stealth, and wild animals.',
        mechanic: { type: 'wayfinder', skills: ['navigation', 'tracking', 'bushcraft', 'stealth', 'wild_animals'] },
      },
      {
        name: 'Herbalism',
        level: 1,
        description: 'Make an INT check to prepare an herbal remedy: Salve (DC 11, heals 1 HP), Stimulant (DC 12, can\'t be surprised 10 rounds), Foebane (DC 13, ADV on attacks vs one creature type), Restorative (DC 14, ends poison/disease), Curative (DC 15, as Potion of Healing). Unused remedies expire in 3 rounds.',
        mechanic: { type: 'herbalism', stat: 'INT' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain advantage on Herbalism checks', mechanic: { type: 'herbalism_advantage' } },
      { roll: [3, 6], description: '+1 to melee or ranged attacks and damage', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, INT, or WIS stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'INT', 'WIS'], amount: 2 } },
      { roll: [10, 11], description: 'Increase one weapon damage die by one step', mechanic: { type: 'increased_weapon_damage' } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'warlock',
    name: 'Warlock',
    description: 'Howling warriors with sharpened teeth, wild-eyed doomspeakers preaching of The Dissolution, and cloaked lore-hunters bearing the hidden Mark of Shune.',
    hitDie: 'd6',
    weaponProficiencies: ['dagger', 'crossbow', 'mace', 'club', 'longsword'],
    armorProficiencies: ['chainmail', 'leather', 'shield'],
    features: [
      {
        name: 'Patron',
        level: 1,
        description: 'Choose a patron to serve. Your patron is the source of your supernatural gifts. If your patron is displeased with you, it can withhold its gifts.',
        mechanic: { type: 'patron', description: 'Choose a patron; source of supernatural gifts' },
      },
      {
        name: 'Patron Boon',
        level: 1,
        description: 'At 1st level, you gain a random Patron Boon talent based on your chosen patron. Whenever you gain a new talent roll, you may choose to roll on your Patron Boon table.',
        mechanic: { type: 'patron_boon' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Roll on your Patron Boon table', mechanic: { type: 'patron_boon_roll' } },
      { roll: [3, 6], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, CON, INT, WIS, or CHA stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], amount: 2 } },
      { roll: [10, 11], description: '+1 to damage rolls', mechanic: { type: 'damage_bonus', amount: 1 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'witch',
    name: 'Witch',
    description: 'Cackling crones stooped over cauldrons, chanting shamans smeared in blood and clay, and outcast maidens with milky eyes that see portents and secrets.',
    hitDie: 'd4',
    weaponProficiencies: ['staff', 'dagger'],
    armorProficiencies: ['leather'],
    features: [
      {
        name: 'Spellcasting',
        level: 1,
        description: 'You can cast witch spells using your CHA modifier. The DC is 10 + the spell\'s tier. On a natural 1, roll on the Diabolical Mishap table.',
        mechanic: { type: 'spellcasting', stat: 'CHA' },
      },
      {
        name: 'Familiar',
        level: 1,
        description: 'You have a small animal (raven, rat, frog, etc.) who serves you loyally and can speak Common. Your familiar can be the source of spells you cast. If it dies, you can restore it by permanently sacrificing 1d4 HP.',
        mechanic: { type: 'familiar' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain advantage on casting one spell you know', mechanic: { type: 'spell_advantage' } },
      { roll: [3, 7], description: '+1 to witch spellcasting checks', mechanic: { type: 'spellcasting_bonus', amount: 1 } },
      { roll: [8, 9], description: 'Learn one additional witch spell of any tier you know', mechanic: { type: 'learn_spell' } },
      { roll: [10, 11], description: '+2 to INT or CHA stat', mechanic: { type: 'stat_bonus', stats: ['INT', 'CHA'], amount: 2 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
    spellcasting: { stat: 'CHA', spellList: 'witch' },
    spellsKnownByLevel: [
      [3, 0, 0, 0, 0], // Level 1
      [4, 0, 0, 0, 0], // Level 2
      [4, 1, 0, 0, 0], // Level 3
      [4, 2, 0, 0, 0], // Level 4
      [4, 2, 1, 0, 0], // Level 5
      [4, 3, 2, 0, 0], // Level 6
      [4, 3, 2, 1, 0], // Level 7
      [4, 4, 2, 2, 0], // Level 8
      [4, 4, 3, 2, 1], // Level 9
      [4, 4, 4, 2, 2], // Level 10
    ],
  },
  {
    id: 'knight-of-st-ydris',
    name: 'Knight of St. Ydris',
    description: 'Cursed knights who walk the path of St. Ydris the Unholy, the Possessed. They embrace the darkness in order to fight it, cleansing evil with a flurry of steel and forbidden sorcery.',
    hitDie: 'd6',
    weaponProficiencies: ['all_melee', 'crossbow'],
    armorProficiencies: ['leather', 'chainmail', 'plate', 'shield', 'mithral_chainmail'],
    features: [
      {
        name: 'Demonic Possession',
        level: 1,
        description: '3/day, gain a +1 bonus to your damage rolls that lasts 3 rounds. In addition, add half your level to the damage bonus (round down).',
        mechanic: { type: 'demonic_possession', usesPerDay: 3, damageBonus: 1, rounds: 3 },
      },
      {
        name: 'Spellcasting',
        level: 3,
        description: 'Starting at level 3, you can cast witch spells using your CHA modifier. On a natural 1, roll on the Diabolical Mishap table.',
        mechanic: { type: 'spellcasting', stat: 'CHA' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain advantage on casting one spell you know', mechanic: { type: 'spell_advantage' } },
      { roll: [3, 6], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+1 to witch spellcasting checks', mechanic: { type: 'spellcasting_bonus', amount: 1 } },
      { roll: [10, 11], description: '+2 to STR, CON, or CHA stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'CON', 'CHA'], amount: 2 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
    spellcasting: { stat: 'CHA', spellList: 'witch' },
    spellsKnownByLevel: [
      [0, 0, 0, 0, 0], // Level 1: no spells yet
      [0, 0, 0, 0, 0], // Level 2: no spells yet
      [1, 0, 0, 0, 0], // Level 3
      [2, 0, 0, 0, 0], // Level 4
      [3, 0, 0, 0, 0], // Level 5
      [3, 1, 0, 0, 0], // Level 6
      [3, 2, 0, 0, 0], // Level 7
      [3, 3, 0, 0, 0], // Level 8
      [3, 3, 1, 0, 0], // Level 9
      [3, 3, 2, 0, 0], // Level 10
    ],
  },
  {
    id: 'seer',
    name: 'Seer',
    description: 'Baleful diviners who reek of smoke and blood. They untangle the whispers of the gods by reading the runes, the bones, and the stars. Their knowledge of fate allows them to bend it.',
    hitDie: 'd6',
    weaponProficiencies: ['spear', 'dagger', 'stave'],
    armorProficiencies: ['leather'],
    features: [
      {
        name: 'Spellcasting',
        level: 1,
        description: 'You can cast seer spells using your WIS modifier. The DC is 10 + the spell\'s tier. On a natural 1, you must complete Seer Penance.',
        mechanic: { type: 'spellcasting', stat: 'WIS' },
      },
      {
        name: 'Omen',
        level: 1,
        description: '3/day, make a DC 9 WIS check. On a success, gain a luck token (you can\'t have more than one at a time).',
        mechanic: { type: 'omen', usesPerDay: 3, dc: 9 },
      },
      {
        name: 'Destined',
        level: 1,
        description: 'Whenever you use a luck token, add 1d6 to the roll.',
        mechanic: { type: 'destined' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain advantage on casting one spell you know', mechanic: { type: 'spell_advantage' } },
      { roll: [3, 6], description: '+1 to seer spellcasting checks', mechanic: { type: 'spellcasting_bonus', amount: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, CON, INT, WIS, or CHA stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], amount: 2 } },
      { roll: [10, 11], description: 'Learn one additional seer spell of any tier you know', mechanic: { type: 'learn_spell' } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
    spellcasting: { stat: 'WIS', spellList: 'seer' },
    spellsKnownByLevel: [
      [1, 0, 0, 0, 0], // Level 1
      [2, 0, 0, 0, 0], // Level 2
      [2, 1, 0, 0, 0], // Level 3
      [2, 2, 0, 0, 0], // Level 4
      [2, 2, 1, 0, 0], // Level 5
      [2, 2, 2, 0, 0], // Level 6
      [2, 2, 2, 1, 0], // Level 7
      [2, 2, 2, 2, 0], // Level 8
      [2, 2, 2, 2, 1], // Level 9
      [2, 2, 2, 2, 2], // Level 10
    ],
  },
  {
    id: 'basilisk-warrior',
    name: 'Basilisk Warrior',
    description: 'Blazing-eyed warriors who coat their skin in mud and stone. Their ancient combat style mimics the basilisk\'s regal poise and ferocious strikes.',
    hitDie: 'd8',
    weaponProficiencies: ['spear', 'dagger', 'boomerang', 'club', 'spear-thrower'],
    armorProficiencies: ['none'], // Stone Skin provides natural AC
    features: [
      {
        name: 'Stone Skin',
        level: 1,
        description: 'Add 2 + half your level (round down) to your AC. You have advantage on checks to hide in natural environments.',
        mechanic: { type: 'stone_skin', acBonus: 2 },
      },
      {
        name: 'Basilisk Blood',
        level: 1,
        description: 'You have advantage on CON checks to avoid harmful maladies, poisons, or afflictions.',
        mechanic: { type: 'basilisk_blood' },
      },
      {
        name: 'Petrifying Gaze',
        level: 1,
        description: 'One creature of your level or less that meets your gaze must pass a DC 15 CON check or be petrified for 1d4 rounds. Uses per day equal to your CON modifier (minimum 1).',
        mechanic: { type: 'petrifying_gaze', dc: 15 },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Gain +1 AC (natural armor improvement)', mechanic: { type: 'ac_bonus', amount: 1 } },
      { roll: [3, 6], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, CON, or WIS stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON', 'WIS'], amount: 2 } },
      { roll: [10, 11], description: '+1 to damage rolls', mechanic: { type: 'damage_bonus', amount: 1 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'desert-rider',
    name: 'Desert Rider',
    description: 'Howling barbarians thundering across the sand on wild horses, elven spies wielding curved blades atop silvery camels, or bandits wrapped in colorful silks racing on sleek, desert stallions.',
    hitDie: 'd8',
    weaponProficiencies: ['pike', 'javelin', 'spear', 'dagger', 'scimitar', 'whip', 'club', 'shortbow', 'longsword'],
    armorProficiencies: ['leather', 'shield'],
    features: [
      {
        name: 'Charge',
        level: 1,
        description: '3/day, you can charge into combat by moving at least near before attacking. Each time you do this, your melee attacks deal double damage that round.',
        mechanic: { type: 'charge', usesPerDay: 3 },
      },
      {
        name: 'Mount',
        level: 1,
        description: 'You have a common camel or horse that comes when you call and never spooks. While riding, you both get a bonus to AC equal to half your level (round down). Your mount has additional levels equal to half your level (round down).',
        mechanic: { type: 'mount' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Your mount gains +2 to attack and damage', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [3, 6], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, CON, or CHA stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON', 'CHA'], amount: 2 } },
      { roll: [10, 11], description: '+1 to damage rolls', mechanic: { type: 'damage_bonus', amount: 1 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'pit-fighter',
    name: 'Pit Fighter',
    description: 'Blood-soaked warriors circling each other in a roaring arena, scarred desert bandits dueling for the right to lead their gang, or brash tavern brawlers who never turn down a challenge.',
    hitDie: 'd8',
    weaponProficiencies: ['all'],
    armorProficiencies: ['leather', 'shield'],
    features: [
      {
        name: 'Flourish',
        level: 1,
        description: '3/day, regain 1d6 hit points when you hit an enemy with a melee attack.',
        mechanic: { type: 'flourish', usesPerDay: 3 },
      },
      {
        name: 'Relentless',
        level: 1,
        description: '3/day, when you are reduced to 0 HP, make a DC 18 CON check. On a success, you instead go to 1 HP.',
        mechanic: { type: 'relentless', usesPerDay: 3, dc: 18 },
      },
      {
        name: 'Implacable',
        level: 1,
        description: 'You have advantage on Constitution checks to resist injury, poison, or endure extreme environments.',
        mechanic: { type: 'implacable' },
      },
      {
        name: 'Last Stand',
        level: 1,
        description: 'You get up from dying with 1 hit point on a natural d20 roll of 18-20.',
        mechanic: { type: 'last_stand', threshold: 18 },
      },
    ],
    talentTable: [
      { roll: 2, description: '+1 to melee attacks', mechanic: { type: 'melee_attack_bonus', amount: 1 } },
      { roll: [3, 6], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, CON, or CHA stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON', 'CHA'], amount: 2 } },
      { roll: [10, 11], description: '+1 to damage rolls', mechanic: { type: 'damage_bonus', amount: 1 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'sea-wolf',
    name: 'Sea Wolf',
    description: 'Seafaring raiders who prowl the isles for plunder in dragonheaded longboats. When the warhorn sounds, they become fierce berserkers and shield maidens who hope to please their gods with a brave death.',
    hitDie: 'd8',
    weaponProficiencies: ['handaxe', 'greataxe', 'spear', 'dagger', 'longbow', 'longsword'],
    armorProficiencies: ['chainmail', 'leather', 'shield'],
    features: [
      {
        name: 'Seafarer',
        level: 1,
        description: 'You have advantage on checks related to navigating and crewing boats.',
        mechanic: { type: 'seafarer' },
      },
      {
        name: 'Old Gods',
        level: 1,
        description: 'Each day, your purpose aligns with one of the Old Gods. Choose after rest: Odin (regain 1d4 HP on kill), Freya (luck token + 1d6 bonus when used), or Loki (advantage on lie/sneak/hide checks).',
        mechanic: { type: 'old_gods' },
      },
      {
        name: 'Shield Wall',
        level: 1,
        description: 'If you wield a shield, you can use your action to take a defensive stance. Your AC becomes 20 during this time.',
        mechanic: { type: 'shield_wall', ac: 20 },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Go Berserk (special ability)', mechanic: { type: 'go_berserk' } },
      { roll: [3, 6], description: '+1 to melee and ranged attacks', mechanic: { type: 'attack_bonus', melee: 1, ranged: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, CON, or WIS stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON', 'WIS'], amount: 2 } },
      { roll: [10, 11], description: '+1 to damage rolls', mechanic: { type: 'damage_bonus', amount: 1 } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
  {
    id: 'ras-godai',
    name: 'Ras-Godai',
    description: 'Black-clad assassins who train from childhood inside a hidden desert monastery. They gain their sorcerous powers from a legendary black lotus flower that was given to them by a demon.',
    hitDie: 'd6',
    weaponProficiencies: ['spear', 'dagger', 'scimitar', 'blowgun', 'bolas', 'razor-chain', 'shuriken'],
    armorProficiencies: ['leather'],
    features: [
      {
        name: 'Smoke Step',
        level: 1,
        description: '3/day, teleport to a location you can see within near. This does not use your action.',
        mechanic: { type: 'smoke_step', usesPerDay: 3 },
      },
      {
        name: 'Black Lotus',
        level: 1,
        description: 'You earned the right to eat a petal of the fabled black lotus flower and survived. Roll one talent on the Black Lotus Talents table.',
        mechanic: { type: 'black_lotus' },
      },
      {
        name: 'Trained Assassin',
        level: 1,
        description: 'You have advantage on checks to sneak and hide. Your attacks deal double damage against targets that are unaware of your presence.',
        mechanic: { type: 'trained_assassin' },
      },
    ],
    talentTable: [
      { roll: 2, description: 'Roll an additional Black Lotus talent', mechanic: { type: 'additional_black_lotus' } },
      { roll: [3, 6], description: '+1 to melee attacks', mechanic: { type: 'melee_attack_bonus', amount: 1 } },
      { roll: [7, 9], description: '+2 to STR, DEX, CON, or CHA stat', mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON', 'CHA'], amount: 2 } },
      { roll: [10, 11], description: 'Gain an additional use of Smoke Step per day', mechanic: { type: 'additional_smoke_step' } },
      { roll: 12, description: 'Choose a talent or +2 points to distribute to stats', mechanic: { type: 'choose_talent_or_stats' } },
    ],
  },
];

export function getClass(id: string): ClassDefinition | undefined {
  return CLASSES.find(c => c.id === id);
}
