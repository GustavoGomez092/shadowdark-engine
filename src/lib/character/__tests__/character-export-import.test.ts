import { describe, it, expect } from 'vitest'
import type { Character } from '@/schemas/character.ts'
import { computeEffectiveStats } from '@/lib/rules/character.ts'
import { exportCharacter, characterFilename } from '../export.ts'
import { parseCharacterImport } from '../import.ts'

function makeFullCharacter(overrides: Partial<Character> = {}): Character {
  const baseStats = { STR: 14, DEX: 12, CON: 13, INT: 8, WIS: 10, CHA: 9 }
  return {
    id: 'src-id',
    playerId: 'player-7',
    name: 'Thorin the Bold',
    ancestry: 'dwarf',
    class: 'fighter',
    level: 3,
    xp: 5,
    alignment: 'lawful',
    background: 'soldier',
    deity: undefined,
    title: 'Veteran',
    languages: ['Common', 'Dwarvish'],
    baseStats,
    statModifications: [
      { id: 'm1', stat: 'STR', amount: 2, source: 'talent:t1', permanent: true },
    ],
    maxHp: 24,
    currentHp: 9,
    isDying: true,
    deathTimer: { totalRounds: 3, roundsRemaining: 1, startedAt: 123 },
    inventory: {
      items: [
        {
          id: 'i1', definitionId: 'longsword', name: 'Longsword', category: 'weapon',
          slots: 1, quantity: 1, equipped: true, isIdentified: true,
        },
        {
          id: 'i2', definitionId: 'made-up-relic', name: 'Mystery Relic', category: 'magic_item',
          slots: 1, quantity: 1, equipped: false, isIdentified: false,
        },
      ],
      coins: { gp: 50, sp: 0, cp: 0 },
    },
    spells: {
      knownSpells: [
        { spellId: 'magic-missile', isAvailable: true, source: 'class', hasAdvantage: true },
        { spellId: 'not-a-real-spell', isAvailable: true, source: 'scroll', hasAdvantage: false },
      ],
      activeFocusSpell: { spellId: 'magic-missile', castAt: 1, roundsCast: 2 },
      penances: [],
    },
    conditions: [
      { id: 'c1', condition: 'poisoned', source: 'trap', appliedAt: 1 },
    ],
    talents: [
      { id: 't1', levelGained: 3, rollResult: 8, mechanic: { type: 'stat_bonus', stats: ['STR'], amount: 2 }, description: '+2 STR' },
    ],
    ancestryTraitUsed: true,
    hasLuckToken: true,
    weaponMasteries: ['longsword'],
    notes: 'Kept the Grit ability at creation.',
    computed: {
      effectiveStats: baseStats,
      modifiers: { STR: 2, DEX: 1, CON: 1, INT: -1, WIS: 0, CHA: 0 },
      ac: 16, gearSlots: 16, usedGearSlots: 2, meleeAttackBonus: 2, rangedAttackBonus: 1,
    },
    ...overrides,
  } as Character
}

describe('exportCharacter', () => {
  it('wraps the character in a versioned envelope', () => {
    const env = exportCharacter(makeFullCharacter())
    expect(env.format).toBe('shadowdark-character-v1')
    expect(env.character.name).toBe('Thorin the Bold')
    expect(typeof env.exportedAt).toBe('number')
    expect(typeof env.engineVersion).toBe('string')
  })
})

describe('characterFilename', () => {
  it('produces a safe, descriptive filename', () => {
    const name = characterFilename(makeFullCharacter())
    expect(name).toMatch(/^thorin-the-bold.*\.json$/)
    expect(name).not.toMatch(/\s/)
  })
})

describe('parseCharacterImport', () => {
  it('accepts a valid export envelope and keeps progression', () => {
    const env = exportCharacter(makeFullCharacter())
    const result = parseCharacterImport(env)
    expect(result.valid).toBe(true)
    expect(result.character?.level).toBe(3)
    expect(result.character?.xp).toBe(5)
    expect(result.character?.inventory.items).toHaveLength(2)
    expect(result.character?.talents).toHaveLength(1)
    expect(result.character?.notes).toBe('Kept the Grit ability at creation.')
  })

  it('assigns a new id and clears playerId', () => {
    const env = exportCharacter(makeFullCharacter())
    const result = parseCharacterImport(env)
    expect(result.character?.id).toBeTruthy()
    expect(result.character?.id).not.toBe('src-id')
    expect(result.character?.playerId).toBe('')
  })

  it('resets transient combat state', () => {
    const result = parseCharacterImport(exportCharacter(makeFullCharacter()))
    const c = result.character!
    expect(c.currentHp).toBe(c.maxHp)
    expect(c.isDying).toBe(false)
    expect(c.deathTimer).toBeUndefined()
    expect(c.conditions).toEqual([])
    expect(c.spells.activeFocusSpell).toBeUndefined()
    expect(c.hasLuckToken).toBe(false)
  })

  it('preserves permanent stat modifications and effective stats', () => {
    const result = parseCharacterImport(exportCharacter(makeFullCharacter()))
    const c = result.character!
    expect(c.statModifications.find(m => m.stat === 'STR')?.amount).toBe(2)
    expect(c.computed.effectiveStats).toEqual(computeEffectiveStats(c))
    expect(c.computed.effectiveStats.STR).toBe(16) // base 14 + 2 permanent mod
  })

  it('warns about spells not found in installed data packs but still imports', () => {
    const result = parseCharacterImport(exportCharacter(makeFullCharacter()))
    expect(result.valid).toBe(true)
    expect(result.warnings?.some(w => w.includes('not-a-real-spell'))).toBe(true)
    expect(result.character?.spells.knownSpells).toHaveLength(2)
  })

  it('accepts a raw character object without an envelope', () => {
    const result = parseCharacterImport(makeFullCharacter())
    expect(result.valid).toBe(true)
    expect(result.character?.name).toBe('Thorin the Bold')
  })

  it('rejects an object that is not a character', () => {
    const result = parseCharacterImport({ format: 'shadowdark-character-v1', character: { nope: true } })
    expect(result.valid).toBe(false)
    expect(result.errors && result.errors.length).toBeGreaterThan(0)
  })

  it('rejects a wrong format string', () => {
    const result = parseCharacterImport({ format: 'something-else', exportedAt: 1, character: makeFullCharacter() })
    expect(result.valid).toBe(false)
  })
})
