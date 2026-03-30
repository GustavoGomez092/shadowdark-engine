import type { AbilityScore, AbilityScores, AbilityModifiers } from '@/schemas/character.ts';
import { getAbilityModifier } from '@/schemas/reference.ts';

export const ABILITY_SCORES: AbilityScore[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export function calculateModifiers(stats: AbilityScores): AbilityModifiers {
  const modifiers = {} as AbilityModifiers;
  for (const stat of ABILITY_SCORES) {
    modifiers[stat] = getAbilityModifier(stats[stat]);
  }
  return modifiers;
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function calculateAC(
  armorAcBase: number | null,
  armorAddsDex: boolean,
  dexMod: number,
  shieldEquipped: boolean,
  bonuses: number = 0
): number {
  const baseAC = armorAcBase ?? (10 + dexMod); // unarmored = 10 + DEX
  const ac = armorAddsDex ? baseAC + dexMod : baseAC;
  const shield = shieldEquipped ? 2 : 0;
  return ac + shield + bonuses;
}

export function calculateGearSlots(
  strScore: number,
  conMod: number,
  isFighter: boolean
): number {
  const base = Math.max(strScore, 10);
  const haulerBonus = isFighter && conMod > 0 ? conMod : 0;
  return base + haulerBonus;
}
