import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { createEmptyTable } from '@/lib/campaign/defaults.ts'
import { TableEditor } from '@/components/campaign/tables/table-editor.tsx'
import type { RandomTable, TableKind } from '@/schemas/campaign.ts'

export const Route = createFileRoute('/campaign/$campaignId/tables')({
  component: TablesPage,
})

const KIND_COLORS: Record<TableKind, string> = {
  encounter: 'bg-red-500/20 text-red-400',
  loot: 'bg-amber-500/20 text-amber-400',
  event: 'bg-blue-500/20 text-blue-400',
  custom: 'bg-purple-500/20 text-purple-400',
}

function TablesPage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const addTable = useCampaignStore(s => s.addTable)
  const updateTable = useCampaignStore(s => s.updateTable)
  const removeTable = useCampaignStore(s => s.removeTable)

  const [editingTable, setEditingTable] = useState<RandomTable | null>(null)
  const [kindFilter, setKindFilter] = useState<TableKind | 'all'>('all')

  if (!campaign) return null

  const tables = campaign.tables ?? []
  const filtered = kindFilter === 'all' ? tables : tables.filter(t => t.kind === kindFilter)

  function saveTable(table: RandomTable) {
    const exists = tables.find(t => t.id === table.id)
    if (exists) updateTable(table.id, t => Object.assign(t, table))
    else addTable(table)
    setEditingTable(null)
  }

  function handleDelete(id: string) {
    if (confirm(t('campaign.tables.deleteConfirm'))) {
      removeTable(id)
    }
  }

  function getKindLabel(table: RandomTable): string {
    if (table.kind === 'custom' && table.customKind) return table.customKind
    return t(`campaign.tables.kind.${table.kind}`)
  }

  function getAttachmentSummary(table: RandomTable): string {
    if (table.attachments.length === 0) return t('campaign.tables.global')
    return table.attachments.map(a => {
      if (a.type === 'room') {
        const room = campaign!.adventure.rooms.find(r => r.id === a.id)
        return room ? `#${room.number} ${room.name}` : 'Unknown room'
      }
      if (a.type === 'map') {
        const map = campaign!.maps.find(m => m.id === a.id)
        return map ? map.name : 'Unknown map'
      }
      return ''
    }).filter(Boolean).join(', ')
  }

  const kinds: (TableKind | 'all')[] = ['all', 'encounter', 'loot', 'event', 'custom']

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-4 text-2xl font-bold">{t('campaign.tables.title')}</h1>

      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {kinds.map(k => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                kindFilter === k
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {k === 'all' ? t('campaign.tables.filterAll') : t(`campaign.tables.kind.${k}`)}
              {k !== 'all' && ` (${tables.filter(t => t.kind === k).length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditingTable(createEmptyTable(kindFilter === 'all' ? 'encounter' : kindFilter))}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          + {t('campaign.tables.new')}
        </button>
      </div>

      {/* Table list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">{t('campaign.tables.empty')}</p>
          <button
            onClick={() => setEditingTable(createEmptyTable('encounter'))}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            + {t('campaign.tables.new')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(table => (
            <div
              key={table.id}
              onClick={() => setEditingTable(table)}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-border/80 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{table.name || 'Unnamed Table'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_COLORS[table.kind]}`}>
                    {getKindLabel(table)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {table.diceExpression} · {table.entries.length} entries · {getAttachmentSummary(table)}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(table.id) }}
                className="shrink-0 text-xs text-red-400 hover:text-red-300 ml-3"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editingTable && (
        <TableEditor
          table={editingTable}
          rooms={campaign.adventure.rooms}
          maps={campaign.maps}
          onSave={saveTable}
          onCancel={() => setEditingTable(null)}
        />
      )}
    </main>
  )
}
