import { describe, it, expect, beforeEach } from 'vitest'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import type { RandomTable, TableAttachment } from '@/schemas/campaign.ts'

function makeTable(overrides: Partial<RandomTable> = {}): RandomTable {
  return {
    id: `tbl-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Table',
    kind: 'encounter',
    diceExpression: '1d6',
    entries: [],
    attachments: [],
    ...overrides,
  }
}

describe('Campaign Store — Tables', () => {
  beforeEach(() => {
    useCampaignStore.setState({ campaign: null })
    useCampaignStore.getState().createCampaign('Test Campaign', 'Tester')
  })

  it('addTable pushes to campaign.tables', () => {
    const table = makeTable({ name: 'Gossip' })
    useCampaignStore.getState().addTable(table)
    const tables = useCampaignStore.getState().campaign!.tables
    expect(tables).toHaveLength(1)
    expect(tables[0].name).toBe('Gossip')
  })

  it('updateTable modifies the correct table by ID', () => {
    const table = makeTable({ id: 'tbl-update', name: 'Before' })
    useCampaignStore.getState().addTable(table)
    useCampaignStore.getState().updateTable('tbl-update', t => { t.name = 'After' })
    const updated = useCampaignStore.getState().campaign!.tables.find(t => t.id === 'tbl-update')
    expect(updated!.name).toBe('After')
  })

  it('removeTable filters out the correct table', () => {
    const t1 = makeTable({ id: 'tbl-keep', name: 'Keep' })
    const t2 = makeTable({ id: 'tbl-remove', name: 'Remove' })
    useCampaignStore.getState().addTable(t1)
    useCampaignStore.getState().addTable(t2)
    useCampaignStore.getState().removeTable('tbl-remove')
    const tables = useCampaignStore.getState().campaign!.tables
    expect(tables).toHaveLength(1)
    expect(tables[0].id).toBe('tbl-keep')
  })

  it('attachTable pushes to attachments array', () => {
    const table = makeTable({ id: 'tbl-attach' })
    useCampaignStore.getState().addTable(table)
    const attachment: TableAttachment = { type: 'room', id: 'room-1' }
    useCampaignStore.getState().attachTable('tbl-attach', attachment)
    const t = useCampaignStore.getState().campaign!.tables.find(t => t.id === 'tbl-attach')
    expect(t!.attachments).toHaveLength(1)
    expect(t!.attachments[0]).toEqual({ type: 'room', id: 'room-1' })
  })

  it('detachTable removes matching attachment', () => {
    const table = makeTable({
      id: 'tbl-detach',
      attachments: [
        { type: 'room', id: 'room-1' },
        { type: 'map', id: 'map-1' },
      ],
    })
    useCampaignStore.getState().addTable(table)
    useCampaignStore.getState().detachTable('tbl-detach', { type: 'room', id: 'room-1' })
    const t = useCampaignStore.getState().campaign!.tables.find(t => t.id === 'tbl-detach')
    expect(t!.attachments).toHaveLength(1)
    expect(t!.attachments[0]).toEqual({ type: 'map', id: 'map-1' })
  })

  it('attachTable does not duplicate same attachment', () => {
    const table = makeTable({ id: 'tbl-nodup' })
    useCampaignStore.getState().addTable(table)
    const attachment: TableAttachment = { type: 'room', id: 'room-1' }
    useCampaignStore.getState().attachTable('tbl-nodup', attachment)
    useCampaignStore.getState().attachTable('tbl-nodup', attachment)
    const t = useCampaignStore.getState().campaign!.tables.find(t => t.id === 'tbl-nodup')
    expect(t!.attachments).toHaveLength(1)
  })
})
