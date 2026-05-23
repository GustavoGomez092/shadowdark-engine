import { describe, it, expect } from 'vitest'
import type { Character } from '@/schemas/character.ts'
import { applyCharacterUpdate } from '../apply-character-update.ts'

function makeCharacter(notes = ''): Character {
  return {
    id: 'pc-1', playerId: 'player-1', name: 'Ralina', ancestry: 'human', class: 'thief',
    level: 1, xp: 0, alignment: 'neutral', background: 'urchin', title: 'Rogue',
    languages: ['Common'],
    baseStats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    statModifications: [], maxHp: 6, currentHp: 6, isDying: false,
    inventory: { items: [], coins: { gp: 0, sp: 0, cp: 0 } },
    spells: { knownSpells: [], penances: [] }, conditions: [], talents: [],
    ancestryTraitUsed: false, hasLuckToken: false, weaponMasteries: [], notes,
    computed: {
      effectiveStats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
      ac: 10, gearSlots: 10, usedGearSlots: 0, meleeAttackBonus: 0, rangedAttackBonus: 0,
    },
  } as Character
}

describe('applyCharacterUpdate', () => {
  it('updates notes when provided', () => {
    const char = makeCharacter('old')
    applyCharacterUpdate(char, { notes: 'Took Magic Missile at level 3' })
    expect(char.notes).toBe('Took Magic Missile at level 3')
  })

  it('allows clearing notes to an empty string', () => {
    const char = makeCharacter('something')
    applyCharacterUpdate(char, { notes: '' })
    expect(char.notes).toBe('')
  })

  it('leaves notes untouched when not present in the update', () => {
    const char = makeCharacter('keep me')
    applyCharacterUpdate(char, {})
    expect(char.notes).toBe('keep me')
  })
})
