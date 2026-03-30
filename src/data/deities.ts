import type { DeityDefinition } from '@/schemas/reference.ts';

export const DEITIES: DeityDefinition[] = [
  {
    id: 'saint-terragnis',
    name: 'Saint Terragnis',
    alignment: 'lawful',
    domain: 'Righteousness, justice',
    description: 'Patron of most lawful humans. A legendary knight and the embodiment of righteousness and justice.',
  },
  {
    id: 'madeera',
    name: 'Madeera the Covenant',
    alignment: 'lawful',
    domain: 'Law, reality',
    description: 'The first manifestation of Law. Carries every law of reality (the Covenant) written on her skin.',
  },
  {
    id: 'gede',
    name: 'Gede',
    alignment: 'neutral',
    domain: 'Feasts, mirth, wilds',
    description: 'God of feasts, mirth, and the wilds. Usually peaceful, but primal storms rage when angered. Many elves and halflings worship her.',
  },
  {
    id: 'ord',
    name: 'Ord',
    alignment: 'neutral',
    domain: 'Magic, knowledge, secrets',
    description: 'The Unbending, the Wise, the Secret-Keeper. God of magic, knowledge, secrets, and equilibrium.',
  },
  {
    id: 'memnon',
    name: 'Memnon',
    alignment: 'chaotic',
    domain: 'Chaos, ambition',
    description: "The first manifestation of Chaos. Madeera's twin, a red-maned leonine being with the ambition to rend the Covenant from his sister's skin.",
  },
  {
    id: 'shune',
    name: 'Shune the Vile',
    alignment: 'chaotic',
    domain: 'Arcane secrets, sorcery',
    description: 'Whispers arcane secrets to sorcerers and witches. Schemes to displace Ord and control all magic.',
  },
  {
    id: 'ramlaat',
    name: 'Ramlaat',
    alignment: 'chaotic',
    domain: 'War, barbarism',
    description: 'The Pillager, the Barbaric, the Horde. Many orcs worship him. Blood Rite prophecy: only the strongest survive a coming doom.',
  },
];

export function getDeity(id: string): DeityDefinition | undefined {
  return DEITIES.find(d => d.id === id);
}

export function getDeitiesByAlignment(alignment: string): DeityDefinition[] {
  return DEITIES.filter(d => d.alignment === alignment);
}
