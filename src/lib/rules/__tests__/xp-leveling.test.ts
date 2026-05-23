import { describe, it, expect } from 'vitest'
import type { Character, AppliedTalent } from '@/schemas/character.ts'
import { levelUpCharacter, computeEffectiveStats } from '../character.ts'

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
