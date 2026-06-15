import { describe, it, expect } from 'vitest'
import { lightTorch, lightLantern, lightCampfire } from '../light-actions.ts'
import type { Character } from '@/schemas/character.ts'
import type { LightState } from '@/schemas/light.ts'

function char(items: { id: string; name: string }[]): Character {
  return {
    id: 'doffin', playerId: '', name: 'Doffin', ancestry: 'halfling', class: 'fighter', level: 1, xp: 0,
    alignment: 'neutral', background: '', title: '', languages: [], baseStats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    statModifications: [], maxHp: 4, currentHp: 4, isDying: false,
    inventory: { items: items.map(i => ({ id: i.id, definitionId: i.id, name: i.name, category: 'gear', slots: 1, quantity: 1, equipped: false, isIdentified: true })), coins: { gp: 0, sp: 0, cp: 0 } },
    spells: { knownSpells: [], penances: [] } as Character['spells'],
    conditions: [], talents: [], ancestryTraitUsed: false, hasLuckToken: false, weaponMasteries: [], notes: '',
    computed: undefined as unknown as Character['computed'],
  }
}
const light: LightState = { timers: [], isInDarkness: true, isPaused: false }

describe('light-actions', () => {
  it('lightTorch consumes the torch and adds a per-bearer torch timer', () => {
    const c = char([{ id: 'torch1', name: 'Antorcha' }])
    const r = lightTorch(c, light, 'torch1', 3_600_000, 1000)
    expect(r.character.inventory.items.find(i => i.id === 'torch1')).toBeUndefined() // consumed
    expect(r.light.timers).toHaveLength(1)
    expect(r.light.timers[0]).toMatchObject({ carrierId: 'doffin', type: 'torch', startedAt: 1000 })
    expect(r.light.isInDarkness).toBe(false)
  })

  it('lightLantern consumes the oil flask but keeps the lantern, adds a lantern timer', () => {
    const c = char([{ id: 'lantern1', name: 'Linterna' }, { id: 'oil1', name: 'Frasco de Aceite' }])
    const r = lightLantern(c, light, 'oil1', 3_600_000, 1000)
    expect(r.character.inventory.items.map(i => i.id)).toEqual(['lantern1']) // oil gone, lantern stays
    expect(r.light.timers[0]).toMatchObject({ carrierId: 'doffin', type: 'lantern', range: 'double_near' })
  })

  it('lightCampfire consumes the given torches and appends a campfire timer (not per-bearer reset)', () => {
    const c = char([{ id: 't1', name: 'Antorcha' }, { id: 't2', name: 'Antorcha' }, { id: 't3', name: 'Antorcha' }])
    const r = lightCampfire(c, light, ['t1', 't2', 't3'], 28_800_000, 1000)
    expect(r.character.inventory.items).toHaveLength(0)
    expect(r.light.timers[0]).toMatchObject({ carrierId: 'doffin', type: 'campfire' })
  })

  it('two bearers lighting torches keep separate timers', () => {
    const a = lightTorch(char([{ id: 'tA', name: 'Antorcha' }]), light, 'tA', 3_600_000, 1000)
    const wrenna = { ...char([{ id: 'tB', name: 'Antorcha' }]), id: 'wrenna' }
    const b = lightTorch(wrenna, a.light, 'tB', 3_600_000, 2000)
    expect(b.light.timers.map(t => t.carrierId).sort()).toEqual(['doffin', 'wrenna'])
  })
})
