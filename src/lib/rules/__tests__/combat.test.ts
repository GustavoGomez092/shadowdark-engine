import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance, MonsterDefinition } from '@/schemas/monsters.ts'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const baseStats = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
  return {
    id: overrides.id ?? 'pc-1',
    playerId: 'player-1',
    name: overrides.name ?? 'Ralina',
    ancestry: 'human',
    class: 'thief',
    level: 1,
    xp: 0,
    alignment: 'neutral',
    background: 'urchin',
    title: 'Rogue',
    languages: ['Common'],
    baseStats,
    statModifications: [],
    maxHp: 6,
    currentHp: 6,
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
      modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
      ac: 10, gearSlots: 10, usedGearSlots: 0,
      meleeAttackBonus: 0, rangedAttackBonus: 0,
    },
    ...overrides,
  } as Character
}

function makeMonsterPair(id: string, name: string, dex = 10): { instance: MonsterInstance; definition: MonsterDefinition } {
  const definition: MonsterDefinition = {
    id, name, level: 1, ac: 12, hp: 5,
    attacks: [{ name: 'Bite', bonus: 0, damage: '1d4', range: 'close' }],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: dex, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: [],
  }
  const instance: MonsterInstance = {
    id: `${id}-instance`, definitionId: id, name,
    currentHp: 5, maxHp: 5, conditions: [],
    rangeBand: 'near', isDefeated: false,
  }
  return { instance, definition }
}

// Stub Math.random so dice are deterministic. Each call returns next array element.
let randomQueue: number[] = []
beforeEach(() => {
  randomQueue = []
  vi.spyOn(Math, 'random').mockImplementation(() => {
    if (randomQueue.length === 0) return 0.5
    return randomQueue.shift()!
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

// Helper: queue a d20 result. value 1-20 -> Math.random returning (value-1)/20.
function queueD20(...values: number[]) {
  for (const v of values) randomQueue.push((v - 1) / 20 + 0.0001)
}
// Helper: queue a d4 result.
function queueD4(...values: number[]) {
  for (const v of values) randomQueue.push((v - 1) / 4 + 0.0001)
}

describe('combat rules', () => {
  it('test scaffolding works', () => {
    queueD20(15)
    expect(Math.floor(Math.random() * 20) + 1).toBe(15)
  })
})

export { makeCharacter, makeMonsterPair, queueD20, queueD4 }
