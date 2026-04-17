import { describe, it, expect } from 'vitest'
import { migrateRandomEncounters } from '../schema.ts'

describe('migrateRandomEncounters', () => {
  it('migrates old randomEncounters to tables with kind=encounter', () => {
    const data: Record<string, unknown> = {
      id: 'c-1',
      name: 'Old Campaign',
      adventure: {
        randomEncounters: [
          {
            id: 'enc-1',
            name: 'Forest Encounters',
            diceExpression: '1d6',
            entries: [
              { roll: 1, description: 'Wolves', monsterIds: ['wolf-1'], quantity: '1d4' },
              { roll: [2, 3] as [number, number], description: 'Nothing happens' },
            ],
          },
        ],
        rooms: [],
        npcs: [],
        stores: [],
      },
    }

    const result = migrateRandomEncounters(data)

    expect(result.tables).toBeDefined()
    const tables = result.tables as Record<string, unknown>[]
    expect(tables).toHaveLength(1)
    expect(tables[0].kind).toBe('encounter')
    expect(tables[0].attachments).toEqual([])
    expect(tables[0].name).toBe('Forest Encounters')
    expect(tables[0].id).toBe('enc-1')

    const adv = result.adventure as Record<string, unknown>
    expect(adv.randomEncounters).toBeUndefined()
  })

  it('preserves existing tables field', () => {
    const data: Record<string, unknown> = {
      id: 'c-2',
      name: 'New Campaign',
      tables: [
        { id: 'tbl-1', name: 'Gossip', kind: 'event', diceExpression: '1d6', entries: [], attachments: [] },
      ],
      adventure: {
        randomEncounters: [
          { id: 'enc-old', name: 'Old Table', diceExpression: '1d6', entries: [] },
        ],
        rooms: [],
      },
    }

    const result = migrateRandomEncounters(data)
    const tables = result.tables as Record<string, unknown>[]
    expect(tables).toHaveLength(1)
    expect(tables[0].id).toBe('tbl-1')
  })

  it('handles empty randomEncounters', () => {
    const data: Record<string, unknown> = {
      id: 'c-3',
      adventure: { randomEncounters: [], rooms: [] },
    }

    const result = migrateRandomEncounters(data)
    expect(result.tables).toBeUndefined()
    const adv = result.adventure as Record<string, unknown>
    expect(adv.randomEncounters).toBeUndefined()
  })

  it('handles campaign with no adventure field', () => {
    const data: Record<string, unknown> = { id: 'c-4', name: 'No Adventure' }
    const result = migrateRandomEncounters(data)
    expect(result.tables).toBeUndefined()
  })
})
