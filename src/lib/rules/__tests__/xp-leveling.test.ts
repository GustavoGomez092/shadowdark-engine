import { describe, it, expect } from 'vitest'
import type { Character, AppliedTalent } from '@/schemas/character.ts'
import { levelUpCharacter, computeEffectiveStats, gainsTalentAtLevel } from '../character.ts'
import { awardXP, awardTreasureXP, canLevelUp, getXpToNextLevel, getXPProgress, distributeEncounterRewards } from '../xp.ts'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const baseStats = { STR: 12, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
  return {
    id: 'pc-1',
    playerId: 'player-1',
    name: 'Ralina',
    ancestry: 'human',
    class: 'fighter',
    level: 2,
    xp: 20,
    alignment: 'neutral',
    background: 'soldier',
    title: 'Squire',
    languages: ['Common'],
    baseStats,
    statModifications: [],
    maxHp: 12,
    currentHp: 12,
    isDying: false,
    inventory: { items: [], coins: { gp: 0, sp: 0, cp: 0 } },
    spells: { knownSpells: [], penances: [] },
    conditions: [],
    talents: [],
    ancestryTraitUsed: false,
    hasLuckToken: false,
    weaponMasteries: [],
    notes: '',
    computed: {
      effectiveStats: baseStats,
      modifiers: { STR: 1, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
      ac: 10, gearSlots: 12, usedGearSlots: 0,
      meleeAttackBonus: 1, rangedAttackBonus: 0,
    },
    ...overrides,
  } as Character
}

const statBonusTalent: AppliedTalent = {
  id: 'talent-1',
  levelGained: 3,
  rollResult: 8,
  mechanic: { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON'], amount: 2 },
  description: '+2 to STR, DEX, or CON stat',
  choices: { stat: 'STR' },
}

describe('levelUpCharacter — stat increases', () => {
  it('raises the chosen effective stat by the talent amount', () => {
    const char = makeCharacter() // STR 12
    const leveled = levelUpCharacter(char, 5, statBonusTalent, [{ stat: 'STR', amount: 2 }])

    expect(leveled.computed.effectiveStats.STR).toBe(14)
  })

  it('records the increase as a permanent stat modification so it survives a rest', () => {
    const char = makeCharacter()
    const leveled = levelUpCharacter(char, 5, statBonusTalent, [{ stat: 'STR', amount: 2 }])

    const mod = leveled.statModifications.find(m => m.stat === 'STR')
    expect(mod).toBeDefined()
    expect(mod?.amount).toBe(2)
    expect(mod?.permanent).toBe(true)
  })

  it('applies a multi-stat distribution (+1/+1)', () => {
    const char = makeCharacter() // STR 12, DEX 10
    const leveled = levelUpCharacter(char, 5, statBonusTalent, [
      { stat: 'STR', amount: 1 },
      { stat: 'DEX', amount: 1 },
    ])

    expect(leveled.computed.effectiveStats.STR).toBe(13)
    expect(leveled.computed.effectiveStats.DEX).toBe(11)
  })

  it('leaves stats unchanged when no increases are passed', () => {
    const char = makeCharacter()
    const leveled = levelUpCharacter(char, 5)

    expect(leveled.computed.effectiveStats).toEqual(computeEffectiveStats(char))
  })
})

// Characterization tests: lock the Shadowdark rules already implemented in xp.ts
// and character.ts against the manual (level x 10 XP, reset to 0, talents at
// 1/3/5/7/9, HP die on level up, treasure XP 0/1/3/10).
describe('XP thresholds and progress', () => {
  it('requires current level x 10 XP to level up', () => {
    expect(getXpToNextLevel(makeCharacter({ level: 1, xp: 0 }))).toBe(10)
    expect(getXpToNextLevel(makeCharacter({ level: 3, xp: 0 }))).toBe(30)
    expect(canLevelUp(makeCharacter({ level: 3, xp: 29 }))).toBe(false)
    expect(canLevelUp(makeCharacter({ level: 3, xp: 30 }))).toBe(true)
  })

  it('caps at level 10 — never ready to level up with surplus XP', () => {
    expect(canLevelUp(makeCharacter({ level: 10, xp: 999 }))).toBe(false)
    expect(getXpToNextLevel(makeCharacter({ level: 10, xp: 5 }))).toBe(0)
    expect(getXPProgress(makeCharacter({ level: 10, xp: 5 }))).toEqual({ current: 5, needed: 0, percent: 100 })
  })

  it('reports progress toward the next level', () => {
    expect(getXPProgress(makeCharacter({ level: 2, xp: 10 }))).toEqual({ current: 10, needed: 20, percent: 50 })
  })

  it('awards flat and treasure XP', () => {
    expect(awardXP(makeCharacter({ xp: 5 }), 3).xp).toBe(8)
    expect(awardTreasureXP(makeCharacter({ xp: 0 }), 'poor').xp).toBe(0)
    expect(awardTreasureXP(makeCharacter({ xp: 0 }), 'normal').xp).toBe(1)
    expect(awardTreasureXP(makeCharacter({ xp: 0 }), 'fabulous').xp).toBe(3)
    expect(awardTreasureXP(makeCharacter({ xp: 0 }), 'legendary').xp).toBe(10)
  })
})

describe('levelUpCharacter — core progression', () => {
  it('increments level, resets XP to 0, and adds the HP roll to max HP', () => {
    const char = makeCharacter({ level: 2, xp: 25, maxHp: 12, currentHp: 12 })
    const leveled = levelUpCharacter(char, 6) // CON 10 => +0
    expect(leveled.level).toBe(3)
    expect(leveled.xp).toBe(0)
    expect(leveled.maxHp).toBe(18)
  })

  it('grants talent rolls only at levels 1, 3, 5, 7, 9', () => {
    expect([1, 3, 5, 7, 9].every(gainsTalentAtLevel)).toBe(true)
    expect([2, 4, 6, 8, 10].some(gainsTalentAtLevel)).toBe(false)
  })
})

describe('distributeEncounterRewards', () => {
  it('gives full XP to each character and reports who can level up', () => {
    const a = makeCharacter({ id: 'a', level: 1, xp: 8 })
    const b = makeCharacter({ id: 'b', level: 1, xp: 0 })
    const { updated, levelUps } = distributeEncounterRewards([a, b], 'fabulous', 0, 5) // +3 XP each
    expect(updated.map(c => c.xp)).toEqual([11, 3])
    expect(updated.every(c => c.inventory.coins.gp >= 5)).toBe(true)
    expect(levelUps).toEqual(['a']) // a reaches 11 >= 10 threshold; b at 3 does not
  })
})
