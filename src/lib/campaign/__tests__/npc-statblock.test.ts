import { describe, it, expect } from 'vitest'
import { ensureNpcStats } from '../npc-statblock.ts'

describe('ensureNpcStats', () => {
  it('returns complete sensible defaults when given nothing', () => {
    const s = ensureNpcStats()
    expect(s.level).toBe(1)
    expect(s.ac).toBe(12)
    expect(s.hp).toBe(6)
    expect(s.alignment).toBe('neutral')
    expect(s.movement).toEqual({ normal: 'near' })
    expect(s.stats).toEqual({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 })
    expect(s.attacks).toEqual([])
    expect(s.abilities).toEqual([])
  })

  it('preserves provided top-level fields and fills the rest', () => {
    const s = ensureNpcStats({ ac: 15, hp: 20, alignment: 'lawful' })
    expect(s.ac).toBe(15)
    expect(s.hp).toBe(20)
    expect(s.alignment).toBe('lawful')
    expect(s.level).toBe(1) // default still filled
  })

  it('merges partial ability scores over the defaults', () => {
    const s = ensureNpcStats({ stats: { STR: 16, DEX: 14 } as never })
    expect(s.stats).toEqual({ STR: 16, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 })
  })

  it('keeps provided attacks and abilities verbatim', () => {
    const attacks = [{ name: 'Bite', bonus: 3, damage: '1d8', range: 'close' as const }]
    const abilities = [{ name: 'Regenerate', description: 'Heals 2 HP.' }]
    const s = ensureNpcStats({ attacks, abilities })
    expect(s.attacks).toEqual(attacks)
    expect(s.abilities).toEqual(abilities)
  })

  it('keeps a provided movement value', () => {
    expect(ensureNpcStats({ movement: { normal: 'none' } }).movement).toEqual({ normal: 'none' })
  })
})
