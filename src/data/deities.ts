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
  {
    id: 'the-lost',
    name: 'The Lost',
    alignment: 'neutral',
    domain: 'Mystery, forbidden knowledge',
    description: 'Two of The Nine are lost to the ages, their names expunged from history and memory. Yet their whispered legend lingers on in ancient, forbidden texts and secret, deep places...',
  },

  // ==================== NORD DEITIES (Cursed Scroll 3) ====================
  {
    id: 'odin',
    name: 'Odin',
    alignment: 'lawful',
    domain: 'Strength, cleverness, war',
    description: 'The Allfather. Odin the One-Eyed values strength and cleverness. His twin ravens wing through the night, spying on dreams and memories. Worthy warriors are brought to Valhalla.',
  },
  {
    id: 'freya',
    name: 'Freya',
    alignment: 'neutral',
    domain: 'Love, hatred, prophecy',
    description: 'The goddess of love and hatred. The Queen of Shield Maidens whose valkyries carry worthy souls to the Great Feast. The First Seer who places her omens in bones, blood, and entrails.',
  },
  {
    id: 'loki',
    name: 'Loki',
    alignment: 'chaotic',
    domain: 'Deception, wit, trickery',
    description: 'The Deceiver who wins with wit and wile. The wolf who disguises himself as a sheep. Loki is glib and infuriating; his words cut like steel, and his laughter howls like a gale.',
  },

  // ==================== PATRONS (Cursed Scroll 1) ====================
  {
    id: 'almazzat',
    name: 'Almazzat',
    alignment: 'chaotic',
    domain: 'Demons, time, conquest',
    description: 'A wolf-headed arch-demon with six eyes and six horns. Almazzat seeks to wrest the Sands of the Ages from his father, Kytheros.',
  },
  {
    id: 'kytheros',
    name: 'Kytheros',
    alignment: 'neutral',
    domain: 'Time, destiny, fate',
    description: 'The Lord of Time who sees all possible futures. Kytheros seeks the fulfillment of all destinies as they were meant to be.',
  },
  {
    id: 'mugdulblub',
    name: 'Mugdulblub',
    alignment: 'chaotic',
    domain: 'Ooze, dissolution, void',
    description: 'The Elder Ooze that leaks between the cracks in memory and the darkness between the stars. Mugdulblub seeks the dissolution of all physical form.',
  },
  {
    id: 'the-willowman',
    name: 'The Willowman',
    alignment: 'chaotic',
    domain: 'Fear, nightmares, forests',
    description: 'A ghostly, elongated being who stalks misty forests and watches from the edge of nightmares. The Willowman seeks fear.',
  },
  {
    id: 'titania',
    name: 'Titania',
    alignment: 'neutral',
    domain: 'Fey, mischief, beauty',
    description: 'The fickle Queen of the Fey who views all of existence as a whimsical dream with hidden meaning and poignant drama. Titania seeks mischief, beauty, and artistry.',
  },
];

export function getDeity(id: string): DeityDefinition | undefined {
  return DEITIES.find(d => d.id === id);
}

export function getDeitiesByAlignment(alignment: string): DeityDefinition[] {
  return DEITIES.filter(d => d.alignment === alignment);
}
