export type DangerLevel = 'unsafe' | 'risky' | 'deadly';
export type RangeCategory = 'close' | 'near' | 'far';
export type Alignment = 'lawful' | 'neutral' | 'chaotic';

// ShadowDark ability modifier table (CORRECT values from PDF)
// 1-3: -4, 4-5: -3, 6-7: -2, 8-9: -1, 10-11: 0,
// 12-13: +1, 14-15: +2, 16-17: +3, 18+: +4
export function getAbilityModifier(score: number): number {
  if (score <= 3) return -4;
  if (score <= 5) return -3;
  if (score <= 7) return -2;
  if (score <= 9) return -1;
  if (score <= 11) return 0;
  if (score <= 13) return 1;
  if (score <= 15) return 2;
  if (score <= 17) return 3;
  return 4; // 18+
}

// Difficulty Classes
export const DC = {
  EASY: 9,
  NORMAL: 12,
  HARD: 15,
  EXTREME: 18,
} as const;

// XP thresholds by level (XP resets on level up)
export const XP_THRESHOLDS: Record<number, number> = {
  1: 10, 2: 20, 3: 30, 4: 40, 5: 50,
  6: 60, 7: 70, 8: 80, 9: 90, 10: 100,
};

// Levels that grant a talent roll
export const TALENT_LEVELS = [1, 3, 5, 7, 9] as const;

// Encounter check intervals (crawling rounds between checks)
export const ENCOUNTER_CHECK_INTERVALS: Record<DangerLevel, number> = {
  unsafe: 3,
  risky: 2,
  deadly: 1,
};

// Starting distance table (1d6)
export function getStartingDistance(roll: number): RangeCategory {
  if (roll === 1) return 'close';
  if (roll <= 4) return 'near';
  return 'far';
}

// Encounter activity table (2d6)
export function getEncounterActivity(roll: number): string {
  if (roll <= 4) return 'Hunting';
  if (roll <= 6) return 'Eating';
  if (roll <= 8) return 'Building/nesting';
  if (roll <= 10) return 'Socializing/playing';
  if (roll === 11) return 'Guarding';
  return 'Sleeping';
}

// Reaction table (2d6 + CHA mod)
export type EncounterReaction = 'hostile' | 'suspicious' | 'neutral' | 'curious' | 'friendly';

export function getEncounterReaction(total: number): EncounterReaction {
  if (total <= 6) return 'hostile';
  if (total <= 8) return 'suspicious';
  if (total === 9) return 'neutral';
  if (total <= 11) return 'curious';
  return 'friendly';
}

// Priest penance sacrifice values by spell tier
export const PENANCE_VALUES: Record<number, number> = {
  1: 5, 2: 20, 3: 40, 4: 90, 5: 150,
};

// Spell DC = 10 + tier
export function getSpellDC(tier: number): number {
  return 10 + tier;
}

// Treasure XP values
export const TREASURE_XP = {
  poor: 0,
  normal: 1,
  fabulous: 3,
  legendary: 10,
} as const;

export type TreasureQuality = keyof typeof TREASURE_XP;

// Potion healing by level
export function getPotionHealing(level: number): string {
  if (level <= 3) return '1d6';
  if (level <= 6) return '2d8';
  if (level <= 9) return '3d10';
  return '4d12';
}

// Random table types
export interface RandomTable {
  id: string;
  name: string;
  description: string;
  diceExpression: string;
  entries: RandomTableEntry[];
}

export interface RandomTableEntry {
  roll: number | [number, number];
  result: string;
  subTable?: RandomTable;
}

// Language definitions
export interface LanguageDefinition {
  id: string;
  name: string;
  rarity: 'common' | 'rare';
  typicalSpeakers: string;
}

// Background definition
export interface BackgroundDefinition {
  id: string;
  name: string;
  description: string;
}

// Deity definition
export interface DeityDefinition {
  id: string;
  name: string;
  alignment: Alignment;
  domain: string;
  description: string;
}

// Title definition
export interface TitleDefinition {
  class: string;
  alignment: Alignment;
  levelRange: [number, number];
  title: string;
}
