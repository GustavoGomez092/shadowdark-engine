import { describe, it, expect } from 'vitest'
import type { TalentMechanic } from '@/schemas/character.ts'
import { deriveStatIncreases } from '../talent-stats.ts'

describe('deriveStatIncreases', () => {
  it('auto-applies a stat_bonus that allows only one stat (no choice)', () => {
    const mechanic: TalentMechanic = { type: 'stat_bonus', stats: ['STR'], amount: 2 }
    const result = deriveStatIncreases({
      mechanic, chooseTalentMode: null, selectedStat: null, statDistribution: {},
    })
    expect(result).toEqual([{ stat: 'STR', amount: 2 }])
  })

  it('uses the selected stat for a multi-option stat_bonus', () => {
    const mechanic: TalentMechanic = { type: 'stat_bonus', stats: ['STR', 'DEX', 'CON'], amount: 2 }
    const result = deriveStatIncreases({
      mechanic, chooseTalentMode: null, selectedStat: 'DEX', statDistribution: {},
    })
    expect(result).toEqual([{ stat: 'DEX', amount: 2 }])
  })

  it('returns nothing for a multi-option stat_bonus with no selection', () => {
    const mechanic: TalentMechanic = { type: 'stat_bonus', stats: ['STR', 'DEX'], amount: 2 }
    const result = deriveStatIncreases({
      mechanic, chooseTalentMode: null, selectedStat: null, statDistribution: {},
    })
    expect(result).toEqual([])
  })

  it('distributes points for choose_talent_or_stats in stats mode', () => {
    const mechanic: TalentMechanic = { type: 'choose_talent_or_stats' }
    const result = deriveStatIncreases({
      mechanic, chooseTalentMode: 'stats', selectedStat: null,
      statDistribution: { STR: 1, WIS: 1, DEX: 0 },
    })
    expect(result).toEqual(
      expect.arrayContaining([
        { stat: 'STR', amount: 1 },
        { stat: 'WIS', amount: 1 },
      ]),
    )
    expect(result).toHaveLength(2)
  })

  it('resolves a stat_bonus talent picked in choose_talent_or_stats talent mode', () => {
    const mechanic: TalentMechanic = { type: 'choose_talent_or_stats' }
    const chosenTalentMechanic: TalentMechanic = { type: 'stat_bonus', stats: ['STR', 'CHA'], amount: 2 }
    const result = deriveStatIncreases({
      mechanic, chooseTalentMode: 'talent', chosenTalentMechanic,
      selectedStat: 'CHA', statDistribution: {},
    })
    expect(result).toEqual([{ stat: 'CHA', amount: 2 }])
  })

  it('returns nothing for a non-stat talent picked in talent mode', () => {
    const mechanic: TalentMechanic = { type: 'choose_talent_or_stats' }
    const chosenTalentMechanic: TalentMechanic = { type: 'attack_bonus', melee: 1, ranged: 1 }
    const result = deriveStatIncreases({
      mechanic, chooseTalentMode: 'talent', chosenTalentMechanic,
      selectedStat: null, statDistribution: {},
    })
    expect(result).toEqual([])
  })

  it('returns nothing for an unrelated mechanic', () => {
    const mechanic: TalentMechanic = { type: 'armor_mastery' }
    const result = deriveStatIncreases({
      mechanic, chooseTalentMode: null, selectedStat: null, statDistribution: {},
    })
    expect(result).toEqual([])
  })
})
