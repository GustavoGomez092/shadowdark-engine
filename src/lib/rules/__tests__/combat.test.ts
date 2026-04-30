import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance, MonsterDefinition } from '@/schemas/monsters.ts'
import { rollInitiative, applyInitiativeRoll, autoRollMissing } from '../combat.ts'

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

  describe('rollInitiative', () => {
    it('builds a state in initiative phase with unrolled PC rows and one rolled monster row', () => {
      const pcs = [
        makeCharacter({ id: 'pc-1', name: 'Ralina', baseStats: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } as any }),
        makeCharacter({ id: 'pc-2', name: 'Jorbin' }),
      ]
      const monsters = [
        makeMonsterPair('goblin', 'Goblin', 13),
        makeMonsterPair('rat', 'Rat', 11),
      ]
      queueD20(15) // monster group roll uses highest DEX (13 -> +1)
      const before = Date.now()
      const state = rollInitiative(pcs, monsters)
      const after = Date.now()

      expect(state.phase).toBe('initiative')
      expect(state.combatants).toHaveLength(3) // 2 PCs + 1 monster group
      expect(state.initiativeOrder).toEqual([])
      expect(state.roundNumber).toBe(1)

      const pcRows = state.combatants.filter((c: any) => c.type === 'pc')
      expect(pcRows).toHaveLength(2)
      for (const r of pcRows) {
        expect(r.initiativeRoll).toBeUndefined()
      }

      const groupRow = state.combatants.find((c: any) => c.type === 'monster')!
      expect(groupRow.name).toBe('Monsters')
      expect(groupRow.initiativeRoll).toBe(15 + 1) // d20=15, +DEX mod 1
      expect(groupRow.initiativeBonus).toBe(1)

      expect(state.initiativeDeadline).toBeGreaterThanOrEqual(before + 29_000)
      expect(state.initiativeDeadline).toBeLessThanOrEqual(after + 31_000)
    })

    it('refuses to build state when there are no monsters', () => {
      expect(() => rollInitiative([makeCharacter()], [])).toThrow(/no monsters/i)
    })

    it('refuses to build state when there are no characters', () => {
      expect(() => rollInitiative([], [makeMonsterPair('rat', 'Rat')])).toThrow(/no characters/i)
    })
  })

  describe('applyInitiativeRoll', () => {
    it('sets the roll on the targeted combatant only', () => {
      const pcs = [makeCharacter({ id: 'pc-1' }), makeCharacter({ id: 'pc-2', name: 'Jorbin' })]
      queueD20(10) // monster group roll
      const state = rollInitiative(pcs, [makeMonsterPair('rat', 'Rat')])
      const pc1Row = state.combatants.find((c: any) => c.referenceId === 'pc-1')!

      const updated = applyInitiativeRoll(state, pc1Row.id, 17, false)

      const updatedRow = updated.combatants.find((c: any) => c.id === pc1Row.id)!
      expect(updatedRow.initiativeRoll).toBe(17)
      expect(updatedRow.initiativeRolledByAuto).toBe(false)
      const otherPcRow = updated.combatants.find((c: any) => c.referenceId === 'pc-2')!
      expect(otherPcRow.initiativeRoll).toBeUndefined()
    })

    it('marks auto-rolled when byAuto is true', () => {
      queueD20(10)
      const state = rollInitiative([makeCharacter()], [makeMonsterPair('rat', 'Rat')])
      const pcRow = state.combatants.find((c: any) => c.type === 'pc')!
      const updated = applyInitiativeRoll(state, pcRow.id, 9, true)
      const r = updated.combatants.find((c: any) => c.id === pcRow.id)!
      expect(r.initiativeRolledByAuto).toBe(true)
    })
  })

  describe('autoRollMissing', () => {
    it('rolls only for combatants with undefined initiative and marks them auto', () => {
      const pc1 = makeCharacter({ id: 'pc-1' })
      const pc2 = makeCharacter({ id: 'pc-2', name: 'Jorbin' })
      queueD20(10) // monster group
      let state = rollInitiative([pc1, pc2], [makeMonsterPair('rat', 'Rat')])
      const pc1Row = state.combatants.find((c: any) => c.referenceId === 'pc-1')!
      state = applyInitiativeRoll(state, pc1Row.id, 18, false)

      // pc-2 still missing — auto roll should fire for them only
      queueD20(7)
      const updated = autoRollMissing(state, [pc1, pc2])

      const pc2Row = updated.combatants.find((c: any) => c.referenceId === 'pc-2')!
      expect(pc2Row.initiativeRoll).toBe(7) // d20=7, DEX mod 0
      expect(pc2Row.initiativeRolledByAuto).toBe(true)
      const pc1RowAfter = updated.combatants.find((c: any) => c.referenceId === 'pc-1')!
      expect(pc1RowAfter.initiativeRoll).toBe(18)
      expect(pc1RowAfter.initiativeRolledByAuto).toBe(false)
    })

    it('uses advantage for characters with initiative_advantage talent', () => {
      const lucky = makeCharacter({
        id: 'pc-1',
        talents: [{
          id: 't1',
          source: 'level-up',
          level: 1,
          description: 'Initiative advantage',
          mechanic: { type: 'initiative_advantage' } as any,
        }] as any,
      })
      queueD20(10) // monster group
      const state = rollInitiative([lucky], [makeMonsterPair('rat', 'Rat')])
      // advantage rolls 2 d20s and keeps the higher
      queueD20(3, 19)
      const updated = autoRollMissing(state, [lucky])
      const row = updated.combatants.find((c: any) => c.type === 'pc')!
      expect(row.initiativeRoll).toBe(19) // higher of (3, 19)
    })
  })
})

export { makeCharacter, makeMonsterPair, queueD20, queueD4 }
