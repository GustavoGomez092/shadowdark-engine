import type { TitleDefinition } from '@/schemas/reference.ts';

export const TITLES: TitleDefinition[] = [
  // Fighter
  { class: 'fighter', alignment: 'lawful', levelRange: [1, 2], title: 'Squire' },
  { class: 'fighter', alignment: 'lawful', levelRange: [3, 4], title: 'Cavalier' },
  { class: 'fighter', alignment: 'lawful', levelRange: [5, 6], title: 'Knight' },
  { class: 'fighter', alignment: 'lawful', levelRange: [7, 8], title: 'Thane' },
  { class: 'fighter', alignment: 'lawful', levelRange: [9, 10], title: 'Lord' },
  { class: 'fighter', alignment: 'chaotic', levelRange: [1, 2], title: 'Knave' },
  { class: 'fighter', alignment: 'chaotic', levelRange: [3, 4], title: 'Bandit' },
  { class: 'fighter', alignment: 'chaotic', levelRange: [5, 6], title: 'Slayer' },
  { class: 'fighter', alignment: 'chaotic', levelRange: [7, 8], title: 'Reaver' },
  { class: 'fighter', alignment: 'chaotic', levelRange: [9, 10], title: 'Warlord' },
  { class: 'fighter', alignment: 'neutral', levelRange: [1, 2], title: 'Warrior' },
  { class: 'fighter', alignment: 'neutral', levelRange: [3, 4], title: 'Barbarian' },
  { class: 'fighter', alignment: 'neutral', levelRange: [5, 6], title: 'Battlerager' },
  { class: 'fighter', alignment: 'neutral', levelRange: [7, 8], title: 'Warchief' },
  { class: 'fighter', alignment: 'neutral', levelRange: [9, 10], title: 'Chieftain' },

  // Priest
  { class: 'priest', alignment: 'lawful', levelRange: [1, 2], title: 'Acolyte' },
  { class: 'priest', alignment: 'lawful', levelRange: [3, 4], title: 'Crusader' },
  { class: 'priest', alignment: 'lawful', levelRange: [5, 6], title: 'Templar' },
  { class: 'priest', alignment: 'lawful', levelRange: [7, 8], title: 'Champion' },
  { class: 'priest', alignment: 'lawful', levelRange: [9, 10], title: 'Paladin' },
  { class: 'priest', alignment: 'chaotic', levelRange: [1, 2], title: 'Initiate' },
  { class: 'priest', alignment: 'chaotic', levelRange: [3, 4], title: 'Zealot' },
  { class: 'priest', alignment: 'chaotic', levelRange: [5, 6], title: 'Cultist' },
  { class: 'priest', alignment: 'chaotic', levelRange: [7, 8], title: 'Scourge' },
  { class: 'priest', alignment: 'chaotic', levelRange: [9, 10], title: 'Chaos Knight' },
  { class: 'priest', alignment: 'neutral', levelRange: [1, 2], title: 'Seeker' },
  { class: 'priest', alignment: 'neutral', levelRange: [3, 4], title: 'Invoker' },
  { class: 'priest', alignment: 'neutral', levelRange: [5, 6], title: 'Haruspex' },
  { class: 'priest', alignment: 'neutral', levelRange: [7, 8], title: 'Mystic' },
  { class: 'priest', alignment: 'neutral', levelRange: [9, 10], title: 'Oracle' },

  // Thief
  { class: 'thief', alignment: 'lawful', levelRange: [1, 2], title: 'Footpad' },
  { class: 'thief', alignment: 'lawful', levelRange: [3, 4], title: 'Burglar' },
  { class: 'thief', alignment: 'lawful', levelRange: [5, 6], title: 'Rook' },
  { class: 'thief', alignment: 'lawful', levelRange: [7, 8], title: 'Underboss' },
  { class: 'thief', alignment: 'lawful', levelRange: [9, 10], title: 'Boss' },
  { class: 'thief', alignment: 'chaotic', levelRange: [1, 2], title: 'Thug' },
  { class: 'thief', alignment: 'chaotic', levelRange: [3, 4], title: 'Cutthroat' },
  { class: 'thief', alignment: 'chaotic', levelRange: [5, 6], title: 'Shadow' },
  { class: 'thief', alignment: 'chaotic', levelRange: [7, 8], title: 'Assassin' },
  { class: 'thief', alignment: 'chaotic', levelRange: [9, 10], title: 'Wraith' },
  { class: 'thief', alignment: 'neutral', levelRange: [1, 2], title: 'Robber' },
  { class: 'thief', alignment: 'neutral', levelRange: [3, 4], title: 'Outlaw' },
  { class: 'thief', alignment: 'neutral', levelRange: [5, 6], title: 'Rogue' },
  { class: 'thief', alignment: 'neutral', levelRange: [7, 8], title: 'Renegade' },
  { class: 'thief', alignment: 'neutral', levelRange: [9, 10], title: 'Bandit King' },

  // Wizard
  { class: 'wizard', alignment: 'lawful', levelRange: [1, 2], title: 'Apprentice' },
  { class: 'wizard', alignment: 'lawful', levelRange: [3, 4], title: 'Conjurer' },
  { class: 'wizard', alignment: 'lawful', levelRange: [5, 6], title: 'Arcanist' },
  { class: 'wizard', alignment: 'lawful', levelRange: [7, 8], title: 'Mage' },
  { class: 'wizard', alignment: 'lawful', levelRange: [9, 10], title: 'Archmage' },
  { class: 'wizard', alignment: 'chaotic', levelRange: [1, 2], title: 'Adept' },
  { class: 'wizard', alignment: 'chaotic', levelRange: [3, 4], title: 'Channeler' },
  { class: 'wizard', alignment: 'chaotic', levelRange: [5, 6], title: 'Witch' },
  { class: 'wizard', alignment: 'chaotic', levelRange: [7, 8], title: 'Diabolist' },
  { class: 'wizard', alignment: 'chaotic', levelRange: [9, 10], title: 'Sorcerer' },
  { class: 'wizard', alignment: 'neutral', levelRange: [1, 2], title: 'Shaman' },
  { class: 'wizard', alignment: 'neutral', levelRange: [3, 4], title: 'Seer' },
  { class: 'wizard', alignment: 'neutral', levelRange: [5, 6], title: 'Warden' },
  { class: 'wizard', alignment: 'neutral', levelRange: [7, 8], title: 'Sage' },
  { class: 'wizard', alignment: 'neutral', levelRange: [9, 10], title: 'Druid' },
];

export function getTitle(characterClass: string, alignment: string, level: number): string {
  const entry = TITLES.find(
    t => t.class === characterClass && t.alignment === alignment && level >= t.levelRange[0] && level <= t.levelRange[1]
  );
  return entry?.title ?? 'Adventurer';
}
