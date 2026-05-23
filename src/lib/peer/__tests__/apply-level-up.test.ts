import { describe, it, expect } from 'vitest'
import type { Character } from '@/schemas/character.ts'
import { applyPlayerLevelUp } from '../apply-level-up.ts'

// The session store uses Immer, which deep-freezes state. Simulate that here so
// the test reproduces the real "caster can't level up" crash: pushing onto a
// frozen knownSpells array throws.
function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(deepFreeze)
    Object.freeze(obj)
  }
  return obj
}

function makeWizard(): Character {
  const baseStats = { STR: 10, DEX: 10, CON: 10, INT: 12, WIS: 10, CHA: 10 }
  return deepFreeze({
    id: 'w1', playerId: 'p1', name: 'Mage', ancestry: 'human', class: 'wizard',
    level: 1, xp: 10, alignment: 'neutral', background: 'scholar', title: 'Apprentice',
    languages: ['Common'], baseStats, statModifications: [], maxHp: 4, currentHp: 4,
    isDying: false, inventory: { items: [], coins: { gp: 0, sp: 0, cp: 0 } },
    spells: { knownSpells: [{ spellId: 'magic-missile', isAvailable: true, source: 'class', hasAdvantage: false }], penances: [] },
    conditions: [], talents: [], ancestryTraitUsed: false, hasLuckToken: false,
    weaponMasteries: [], notes: '',
    computed: {
      effectiveStats: baseStats, modifiers: { STR: 0, DEX: 0, CON: 0, INT: 1, WIS: 0, CHA: 0 },
      ac: 10, gearSlots: 10, usedGearSlots: 0, meleeAttackBonus: 0, rangedAttackBonus: 0, spellCheckBonus: 1,
    },
  } as Character)
}

describe('applyPlayerLevelUp', () => {
  it('levels up a caster and adds chosen spells without mutating frozen state', () => {
    const wizard = makeWizard()
    const updated = applyPlayerLevelUp(wizard, { hpRoll: 3, newSpellIds: ['sleep', 'fog'] })

    expect(updated.level).toBe(2)
    expect(updated.spells.knownSpells.map(s => s.spellId)).toEqual(['magic-missile', 'sleep', 'fog'])
    // original frozen state is untouched
    expect(wizard.spells.knownSpells).toHaveLength(1)
  })

  it('levels up a martial with no new spells', () => {
    const wizard = makeWizard()
    const updated = applyPlayerLevelUp(wizard, { hpRoll: 2 })
    expect(updated.level).toBe(2)
    expect(updated.spells.knownSpells).toHaveLength(1)
  })

  it('applies stat increases from a talent', () => {
    const wizard = makeWizard()
    const updated = applyPlayerLevelUp(wizard, { hpRoll: 1, statIncreases: [{ stat: 'INT', amount: 2 }] })
    expect(updated.computed.effectiveStats.INT).toBe(14)
  })
})
