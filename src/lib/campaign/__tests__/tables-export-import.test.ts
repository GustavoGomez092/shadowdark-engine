import { describe, it, expect } from 'vitest'
import type { Campaign, RandomTable } from '@/schemas/campaign.ts'
import { exportAdventureDocument } from '../export.ts'
import { parseCampaignFile } from '../import.ts'

function makeCampaignWithTables(tables: RandomTable[]): Campaign {
  return {
    id: 'campaign-tables-001',
    name: 'Tables Test Campaign',
    author: 'Test',
    version: '1.0',
    description: '',
    createdAt: 1700000000000,
    updatedAt: 1700100000000,
    content: {
      monsters: [{
        id: 'goblin',
        name: 'Goblin',
        level: 1,
        ac: 11,
        hp: 5,
        attacks: [{ name: 'Dagger', bonus: 1, damage: '1d4', range: 'close' as const }],
        movement: { normal: 'near' as const },
        stats: { STR: 8, DEX: 14, CON: 8, INT: 8, WIS: 8, CHA: 8 },
        alignment: 'chaotic' as const,
        abilities: [],
        checksMorale: true,
        tags: [],
      }],
    },
    tables,
    adventure: {
      hook: '',
      overview: '',
      targetLevel: [1, 3],
      rooms: [
        { id: 'room-1', number: 1, name: 'Entry Hall', description: '', gmNotes: '', monsterIds: [], treasure: '', traps: [], connections: [] },
      ],
      npcs: [],
      stores: [],
    },
    lore: { chapters: [] },
    maps: [
      { id: 'map-1', name: 'Level 1', seed: 42, createdAt: 1700000000000, updatedAt: 1700000000000, width: 30, height: 20, cellSize: 40, layers: [], labels: [], markers: [] },
    ],
  }
}

describe('tables export/import round-trip', () => {
  it('round-trips tables of every kind', () => {
    const tables: RandomTable[] = [
      { id: 'tbl-enc', name: 'Random Encounters', kind: 'encounter', diceExpression: '1d6', entries: [{ roll: 1, description: 'Goblins', monsterIds: ['goblin'], quantity: '1d4' }], attachments: [] },
      { id: 'tbl-loot', name: 'Treasure Hoard', kind: 'loot', diceExpression: '1d8', entries: [{ roll: [1, 2] as [number, number], description: '10 gold coins' }], attachments: [] },
      { id: 'tbl-event', name: 'Tavern Gossip', kind: 'event', diceExpression: '1d6', entries: [{ roll: 1, description: 'The king is ill' }], attachments: [] },
      { id: 'tbl-custom', name: 'Weather', kind: 'custom', customKind: 'Weather', diceExpression: '1d4', entries: [{ roll: 1, description: 'Rain' }], attachments: [] },
    ]
    const campaign = makeCampaignWithTables(tables)
    const doc = exportAdventureDocument(campaign)
    const result = parseCampaignFile(doc)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.tables).toHaveLength(4)
    expect(result.campaign.tables[0].kind).toBe('encounter')
    expect(result.campaign.tables[1].kind).toBe('loot')
    expect(result.campaign.tables[2].kind).toBe('event')
    expect(result.campaign.tables[3].kind).toBe('custom')
    expect(result.campaign.tables[3].customKind).toBe('Weather')
  })

  it('preserves attachments through round-trip', () => {
    const tables: RandomTable[] = [
      {
        id: 'tbl-attached',
        name: 'Room Events',
        kind: 'event',
        diceExpression: '1d6',
        entries: [{ roll: 1, description: 'Noise' }],
        attachments: [
          { type: 'room', id: 'room-1' },
          { type: 'map', id: 'map-1' },
        ],
      },
    ]
    const campaign = makeCampaignWithTables(tables)
    const doc = exportAdventureDocument(campaign)
    const result = parseCampaignFile(doc)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.tables[0].attachments).toHaveLength(2)
    expect(result.campaign.tables[0].attachments[0]).toEqual({ type: 'room', id: 'room-1' })
    expect(result.campaign.tables[0].attachments[1]).toEqual({ type: 'map', id: 'map-1' })
  })

  it('preserves entry fields through round-trip', () => {
    const tables: RandomTable[] = [
      {
        id: 'tbl-entries',
        name: 'Encounters',
        kind: 'encounter',
        diceExpression: '1d6',
        entries: [
          { roll: 1, description: 'Goblins', monsterIds: ['goblin'], quantity: '1d4+1' },
          { roll: [2, 3] as [number, number], description: 'Nothing' },
          { roll: 4, description: 'Trap' },
        ],
        attachments: [],
      },
    ]
    const campaign = makeCampaignWithTables(tables)
    const doc = exportAdventureDocument(campaign)
    const result = parseCampaignFile(doc)

    expect(result.success).toBe(true)
    if (!result.success) return
    const entries = result.campaign.tables[0].entries
    expect(entries).toHaveLength(3)
    expect(entries[0].monsterIds).toEqual(['goblin'])
    expect(entries[0].quantity).toBe('1d4+1')
    expect(entries[1].roll).toEqual([2, 3])
    expect(entries[2].roll).toBe(4)
  })

  it('imports old-format JSON with adventure.randomEncounters', () => {
    const oldFormat = {
      id: 'old-001',
      name: 'Old Campaign',
      adventure: {
        hook: 'An old hook',
        overview: '',
        targetLevel: [1, 3],
        rooms: [],
        randomEncounters: [
          {
            id: 'enc-old',
            name: 'Old Encounters',
            diceExpression: '1d6',
            entries: [
              { roll: 1, description: 'Skeletons', monsterIds: ['skeleton-1'], quantity: '1d4' },
              { roll: [2, 3] as [number, number], description: 'Empty corridor' },
            ],
          },
        ],
        npcs: [],
        stores: [],
      },
    }

    const result = parseCampaignFile(oldFormat)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.tables).toHaveLength(1)
    expect(result.campaign.tables[0].kind).toBe('encounter')
    expect(result.campaign.tables[0].name).toBe('Old Encounters')
    expect(result.campaign.tables[0].attachments).toEqual([])
    expect(result.campaign.tables[0].entries).toHaveLength(2)
    expect(result.campaign.tables[0].entries[0].monsterIds).toEqual(['skeleton-1'])
  })

  it('imports new-format JSON with tables directly', () => {
    const newFormat = {
      id: 'new-001',
      name: 'New Campaign',
      tables: [
        { id: 'tbl-1', name: 'Gossip', kind: 'event', diceExpression: '1d6', entries: [{ roll: 1, description: 'Rumor' }], attachments: [] },
      ],
      adventure: { hook: '', overview: '', targetLevel: [1, 3], rooms: [], npcs: [], stores: [] },
    }

    const result = parseCampaignFile(newFormat)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.tables).toHaveLength(1)
    expect(result.campaign.tables[0].kind).toBe('event')
  })

  it('drops orphaned attachments on import', () => {
    const campaign = makeCampaignWithTables([
      {
        id: 'tbl-orphan',
        name: 'Orphan Test',
        kind: 'event',
        diceExpression: '1d6',
        entries: [{ roll: 1, description: 'Test' }],
        attachments: [
          { type: 'room', id: 'room-1' },
          { type: 'room', id: 'room-99' },
          { type: 'map', id: 'map-1' },
          { type: 'map', id: 'map-99' },
        ],
      },
    ])

    const doc = exportAdventureDocument(campaign)
    const result = parseCampaignFile(doc)

    expect(result.success).toBe(true)
    if (!result.success) return
    const attachments = result.campaign.tables[0].attachments
    expect(attachments).toHaveLength(2)
    expect(attachments[0]).toEqual({ type: 'room', id: 'room-1' })
    expect(attachments[1]).toEqual({ type: 'map', id: 'map-1' })
  })
})
