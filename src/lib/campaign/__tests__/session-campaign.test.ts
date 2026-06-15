import { describe, it, expect } from 'vitest'
import { adventureStoreToGameStore, mergeStores, filterCampaignMonsters } from '../session-campaign.ts'
import type { AdventureStore } from '@/schemas/campaign.ts'
import type { GameStore } from '@/schemas/stores.ts'
import type { MonsterDefinition } from '@/schemas/monsters.ts'

function advStore(over: Partial<AdventureStore> = {}): AdventureStore {
  return { id: 's1', name: 'Tienda', description: 'desc', storeType: 'general', items: [], keeperName: 'Bo', keeperAncestry: 'halfling', roomId: 'r1', npcId: 'n1', ...over }
}

describe('adventureStoreToGameStore', () => {
  it('maps an adventure store to a session GameStore, inactive by default', () => {
    const g = adventureStoreToGameStore(advStore())
    expect(g.id).toBe('s1')
    expect(g.name).toBe('Tienda')
    expect(g.storeType).toBe('general')
    expect(g.keeperName).toBe('Bo')
    expect(g.isActive).toBe(false) // GM toggles visibility
    expect('roomId' in g).toBe(false) // editor-only fields dropped
  })
})

describe('mergeStores', () => {
  it('appends incoming stores that are not already present by id', () => {
    const existing: GameStore[] = [{ id: 's1', name: 'Old', description: '', storeType: 'general', items: [], isActive: true }]
    const incoming: GameStore[] = [
      { id: 's1', name: 'New', description: '', storeType: 'general', items: [], isActive: false },
      { id: 's2', name: 'Fresh', description: '', storeType: 'tavern', items: [], isActive: false },
    ]
    const merged = mergeStores(existing, incoming)
    expect(merged.map(s => s.id)).toEqual(['s1', 's2'])
    expect(merged.find(s => s.id === 's1')!.name).toBe('Old') // existing preserved, not overwritten
  })
})

describe('filterCampaignMonsters', () => {
  const def = (id: string): MonsterDefinition => ({ id, name: id } as MonsterDefinition)
  it('returns only the global monsters whose id is in the campaign content, plus campaign-only monsters', () => {
    const global = [def('goblin'), def('skeleton')]
    const campaign = [def('skeleton'), def('cult-leader')] // skeleton overlaps, cult-leader is campaign-only
    const result = filterCampaignMonsters(global, campaign)
    expect(result.map(m => m.id).sort()).toEqual(['cult-leader', 'skeleton'])
  })
  it('returns empty when the campaign defines no monsters', () => {
    expect(filterCampaignMonsters([def('goblin')], [])).toEqual([])
  })
})
