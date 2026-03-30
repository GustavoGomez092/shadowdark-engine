import type { AncestryDefinition } from '@/schemas/character.ts';

export const ANCESTRIES: AncestryDefinition[] = [
  {
    id: 'dwarf',
    name: 'Dwarf',
    traitName: 'Stout',
    traitDescription: 'Start with +2 HP. Roll hit points per level with advantage.',
    mechanics: [
      { type: 'bonus_hp', value: 2 },
      { type: 'advantage_hp_roll' },
    ],
    languages: ['Common', 'Dwarvish'],
  },
  {
    id: 'elf',
    name: 'Elf',
    traitName: 'Farsight',
    traitDescription: '+1 bonus to attack rolls with ranged weapons OR +1 bonus to spellcasting checks (choose one).',
    mechanics: [
      { type: 'bonus_ranged_attack', value: 1, isChoice: true, choiceGroup: 'farsight' },
      { type: 'bonus_spellcasting', value: 1, isChoice: true, choiceGroup: 'farsight' },
    ],
    languages: ['Common', 'Elvish', 'Sylvan'],
  },
  {
    id: 'goblin',
    name: 'Goblin',
    traitName: 'Keen Senses',
    traitDescription: "You can't be surprised.",
    mechanics: [
      { type: 'cannot_be_surprised' },
    ],
    languages: ['Common', 'Goblin'],
  },
  {
    id: 'halfling',
    name: 'Halfling',
    traitName: 'Stealthy',
    traitDescription: 'Once per day, you become invisible for 3 rounds.',
    mechanics: [
      { type: 'invisibility_1day', duration: 3, usesPerDay: 1 },
    ],
    languages: ['Common'],
  },
  {
    id: 'half-orc',
    name: 'Half-Orc',
    traitName: 'Mighty',
    traitDescription: '+1 bonus to attack and damage rolls with melee weapons.',
    mechanics: [
      { type: 'bonus_melee_attack', value: 1 },
      { type: 'bonus_melee_damage', value: 1 },
    ],
    languages: ['Common', 'Orcish'],
  },
  {
    id: 'human',
    name: 'Human',
    traitName: 'Ambitious',
    traitDescription: 'Gain one additional talent roll at 1st level.',
    mechanics: [
      { type: 'extra_talent_level1' },
    ],
    languages: ['Common'], // +1 additional common language (chosen at creation)
  },
];

export function getAncestry(id: string): AncestryDefinition | undefined {
  return ANCESTRIES.find(a => a.id === id);
}
