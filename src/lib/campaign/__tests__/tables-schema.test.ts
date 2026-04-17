import { describe, it, expect } from 'vitest'
import { RandomTableSchema, TableAttachmentSchema, validateCampaign } from '../schema.ts'

describe('TableAttachmentSchema', () => {
  it('validates a room attachment', () => {
    const result = TableAttachmentSchema.safeParse({ type: 'room', id: 'room-1' })
    expect(result.success).toBe(true)
  })

  it('validates a map attachment', () => {
    const result = TableAttachmentSchema.safeParse({ type: 'map', id: 'map-1' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid attachment type', () => {
    const result = TableAttachmentSchema.safeParse({ type: 'npc', id: 'npc-1' })
    expect(result.success).toBe(false)
  })
})

describe('RandomTableSchema', () => {
  it('validates a complete table', () => {
    const table = {
      id: 'tbl-1',
      name: 'Tavern Gossip',
      kind: 'event',
      diceExpression: '1d6',
      entries: [
        { roll: 1, description: 'The king is ill' },
        { roll: [2, 3] as [number, number], description: 'Bandits on the road' },
      ],
      attachments: [{ type: 'room', id: 'room-tavern' }],
    }
    const result = RandomTableSchema.safeParse(table)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('event')
      expect(result.data.attachments).toHaveLength(1)
    }
  })

  it('applies defaults for missing optional fields', () => {
    const result = RandomTableSchema.safeParse({ id: 'tbl-2' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('')
      expect(result.data.kind).toBe('encounter')
      expect(result.data.diceExpression).toBe('1d6')
      expect(result.data.entries).toEqual([])
      expect(result.data.attachments).toEqual([])
    }
  })

  it('rejects invalid kind', () => {
    const result = RandomTableSchema.safeParse({ id: 'tbl-3', kind: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('validates encounter entry with monsterIds and quantity', () => {
    const table = {
      id: 'tbl-4',
      name: 'Encounters',
      kind: 'encounter',
      diceExpression: '1d6',
      entries: [
        { roll: 1, description: 'Skeleton patrol', monsterIds: ['skeleton-1'], quantity: '1d4' },
      ],
      attachments: [],
    }
    const result = RandomTableSchema.safeParse(table)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.entries[0].monsterIds).toEqual(['skeleton-1'])
      expect(result.data.entries[0].quantity).toBe('1d4')
    }
  })

  it('validates custom kind with customKind label', () => {
    const table = {
      id: 'tbl-5',
      name: 'Weather',
      kind: 'custom',
      customKind: 'Weather',
      diceExpression: '1d8',
      entries: [],
      attachments: [],
    }
    const result = RandomTableSchema.safeParse(table)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customKind).toBe('Weather')
    }
  })

  it('allows extra fields via passthrough', () => {
    const table = {
      id: 'tbl-6',
      name: 'Test',
      kind: 'loot',
      diceExpression: '1d6',
      entries: [{ roll: 1, description: 'Gold', extraField: true }],
      attachments: [],
      futureField: 'hello',
    }
    const result = RandomTableSchema.safeParse(table)
    expect(result.success).toBe(true)
  })
})

describe('CampaignSchema with tables', () => {
  it('validates a campaign with tables field', () => {
    const result = validateCampaign({
      id: 'c-1',
      name: 'Test Campaign',
      tables: [
        {
          id: 'tbl-1',
          name: 'Gossip',
          kind: 'event',
          diceExpression: '1d6',
          entries: [{ roll: 1, description: 'Rumor' }],
          attachments: [],
        },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tables).toHaveLength(1)
      expect(result.data.tables[0].name).toBe('Gossip')
    }
  })

  it('defaults tables to empty array when missing', () => {
    const result = validateCampaign({ id: 'c-2', name: 'No Tables' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tables).toEqual([])
    }
  })
})
