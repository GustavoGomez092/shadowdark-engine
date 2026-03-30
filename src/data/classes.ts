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
];

export function getClass(id: string): ClassDefinition | undefined {
  return CLASSES.find(c => c.id === id);
}
