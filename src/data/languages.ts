import type { LanguageDefinition } from '@/schemas/reference.ts';

export const LANGUAGES: LanguageDefinition[] = [
  { id: 'common', name: 'Common', rarity: 'common', typicalSpeakers: 'Humanoids' },
  { id: 'dwarvish', name: 'Dwarvish', rarity: 'common', typicalSpeakers: 'Dwarves' },
  { id: 'elvish', name: 'Elvish', rarity: 'common', typicalSpeakers: 'Elves' },
  { id: 'giant', name: 'Giant', rarity: 'common', typicalSpeakers: 'Giants' },
  { id: 'goblin', name: 'Goblin', rarity: 'common', typicalSpeakers: 'Goblinoids' },
  { id: 'merran', name: 'Merran', rarity: 'common', typicalSpeakers: 'Aquatic folk' },
  { id: 'orcish', name: 'Orcish', rarity: 'common', typicalSpeakers: 'Orcs' },
  { id: 'reptilian', name: 'Reptilian', rarity: 'common', typicalSpeakers: 'Reptile folk' },
  { id: 'sylvan', name: 'Sylvan', rarity: 'common', typicalSpeakers: 'Fey folk' },
  { id: 'thanian', name: 'Thanian', rarity: 'common', typicalSpeakers: 'Beast folk' },
  { id: 'celestial', name: 'Celestial', rarity: 'rare', typicalSpeakers: 'Angels' },
  { id: 'diabolic', name: 'Diabolic', rarity: 'rare', typicalSpeakers: 'Demons' },
  { id: 'draconic', name: 'Draconic', rarity: 'rare', typicalSpeakers: 'Dragons' },
  { id: 'primordial', name: 'Primordial', rarity: 'rare', typicalSpeakers: 'Elder things' },
];

export const COMMON_LANGUAGES = LANGUAGES.filter(l => l.rarity === 'common');
export const RARE_LANGUAGES = LANGUAGES.filter(l => l.rarity === 'rare');

export function getLanguage(id: string): LanguageDefinition | undefined {
  return LANGUAGES.find(l => l.id === id);
}
