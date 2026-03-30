import type { Character } from '@/schemas/character.ts'
import type { TreasureQuality } from '@/schemas/reference.ts'
import { TREASURE_XP, XP_THRESHOLDS } from '@/schemas/reference.ts'

export function awardTreasureXP(character: Character, quality: TreasureQuality): Character {
  const xpGain = TREASURE_XP[quality]
  return { ...character, xp: character.xp + xpGain }
}

export function awardXP(character: Character, amount: number): Character {
  return { ...character, xp: character.xp + amount }
}

export function canLevelUp(character: Character): boolean {
  if (character.level >= 10) return false
  const threshold = XP_THRESHOLDS[character.level]
  return threshold !== undefined && character.xp >= threshold
}

export function getXPProgress(character: Character): { current: number; needed: number; percent: number } {
  if (character.level >= 10) return { current: character.xp, needed: 0, percent: 100 }
  const needed = XP_THRESHOLDS[character.level] ?? 0
  return {
    current: character.xp,
    needed,
    percent: needed > 0 ? Math.min(100, (character.xp / needed) * 100) : 0,
  }
}

export function getXpToNextLevel(character: Character): number {
  if (character.level >= 10) return 0
  const threshold = XP_THRESHOLDS[character.level] ?? 0
  return Math.max(0, threshold - character.xp)
}

/** Generate gold reward based on average party level */
export function generateGoldReward(avgPartyLevel: number): number {
  return Math.floor(Math.random() * 10 * avgPartyLevel) + 5
}

/** Check if a random encounter has treasure (50% chance) */
export function rollForTreasure(): boolean {
  return Math.random() >= 0.5
}

/** Distribute rewards to all party characters. Returns updated characters and list of level-up IDs. */
export function distributeEncounterRewards(
  characters: Character[],
  quality: TreasureQuality,
  bonusXP: number,
  goldPerCharacter: number,
): { updated: Character[]; levelUps: string[] } {
  const xpGain = TREASURE_XP[quality] + bonusXP
  const levelUps: string[] = []

  const updated = characters.map(c => {
    const newXp = c.xp + xpGain
    const newGp = c.inventory.coins.gp + goldPerCharacter
    const threshold = XP_THRESHOLDS[c.level] ?? Infinity

    if (newXp >= threshold && c.level < 10) {
      levelUps.push(c.id)
    }

    return {
      ...c,
      xp: newXp,
      inventory: {
        ...c.inventory,
        coins: { ...c.inventory.coins, gp: newGp },
      },
    }
  })

  return { updated, levelUps }
}
