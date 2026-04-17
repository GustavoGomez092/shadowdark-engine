import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale.ts'
import type { RandomTable, RandomTableEntry, TableKind, TableAttachment } from '@/schemas/campaign.ts'
import type { AdventureRoom } from '@/schemas/campaign.ts'
import type { CampaignMap } from '@/schemas/map.ts'

interface Props {
  table: RandomTable
  rooms: AdventureRoom[]
  maps: CampaignMap[]
  onSave: (table: RandomTable) => void
  onCancel: () => void
}

const KIND_OPTIONS: { value: TableKind; labelKey: string }[] = [
  { value: 'encounter', labelKey: 'campaign.tables.kind.encounter' },
  { value: 'loot', labelKey: 'campaign.tables.kind.loot' },
  { value: 'event', labelKey: 'campaign.tables.kind.event' },
  { value: 'custom', labelKey: 'campaign.tables.kind.custom' },
]

export function TableEditor({ table: initial, rooms, maps, onSave, onCancel }: Props) {
  const { t } = useLocale()
  const [tbl, setTbl] = useState<RandomTable>({
    ...initial,
    entries: initial.entries.map(e => ({ ...e })),
    attachments: initial.attachments.map(a => ({ ...a })),
  })

  function addEntry() {
    const nextRoll = tbl.entries.length > 0
      ? Math.max(...tbl.entries.map(e => typeof e.roll === 'number' ? e.roll : e.roll[1])) + 1
      : 1
    setTbl(prev => ({
      ...prev,
      entries: [...prev.entries, { roll: nextRoll, description: '' }],
    }))
  }

  function updateEntry(index: number, updates: Partial<RandomTableEntry>) {
    setTbl(prev => {
      const entries = [...prev.entries]
      entries[index] = { ...entries[index], ...updates }
      return { ...prev, entries }
    })
  }

  function removeEntry(index: number) {
    setTbl(prev => ({ ...prev, entries: prev.entries.filter((_, i) => i !== index) }))
  }

  function addAttachment(attachment: TableAttachment) {
    const exists = tbl.attachments.some(a => a.type === attachment.type && a.id === attachment.id)
    if (!exists) {
      setTbl(prev => ({ ...prev, attachments: [...prev.attachments, attachment] }))
    }
  }

  function removeAttachment(index: number) {
    setTbl(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }))
  }

  function getAttachmentLabel(a: TableAttachment): string {
    if (a.type === 'room') {
      const room = rooms.find(r => r.id === a.id)
      return room ? `#${room.number} ${room.name}` : 'Unknown room'
    }
    const map = maps.find(m => m.id === a.id)
    return map ? map.name : 'Unknown map'
  }

  const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
  const isEncounter = tbl.kind === 'encounter'
  const isCustom = tbl.kind === 'custom'

  const attachedRoomIds = new Set(tbl.attachments.filter(a => a.type === 'room').map(a => a.id))
  const attachedMapIds = new Set(tbl.attachments.filter(a => a.type === 'map').map(a => a.id))
  const availableRooms = rooms.filter(r => !attachedRoomIds.has(r.id))
  const availableMaps = maps.filter(m => !attachedMapIds.has(m.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{initial.name || t('campaign.tables.new')}</h2>

        <div className="space-y-4">
          {/* Name + Kind */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.name')}</label>
              <input type="text" value={tbl.name} onChange={e => setTbl(prev => ({ ...prev, name: e.target.value }))} placeholder="Table name" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.kind')}</label>
              <select value={tbl.kind} onChange={e => setTbl(prev => ({ ...prev, kind: e.target.value as TableKind }))} className={inputCls}>
                {KIND_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom kind label */}
          {isCustom && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.customKind')}</label>
              <input type="text" value={tbl.customKind ?? ''} onChange={e => setTbl(prev => ({ ...prev, customKind: e.target.value || undefined }))} placeholder="e.g., Weather, Gossip" className={inputCls} />
            </div>
          )}

          {/* Dice Expression */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.dice')}</label>
            <input type="text" value={tbl.diceExpression} onChange={e => setTbl(prev => ({ ...prev, diceExpression: e.target.value }))} placeholder="e.g., 1d6, 2d6" className={inputCls} />
          </div>

          {/* Attachments */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.attachments')}</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tbl.attachments.length === 0 && (
                <span className="text-xs text-muted-foreground">{t('campaign.tables.global')}</span>
              )}
              {tbl.attachments.map((a, i) => (
                <span key={`${a.type}-${a.id}`} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{a.type}</span>
                  {getAttachmentLabel(a)}
                  <button onClick={() => removeAttachment(i)} className="ml-0.5 text-red-400 hover:text-red-300">&times;</button>
                </span>
              ))}
            </div>
            {(availableRooms.length > 0 || availableMaps.length > 0) && (
              <select
                value=""
                onChange={e => {
                  const [type, id] = e.target.value.split(':')
                  if (type && id) addAttachment({ type: type as 'room' | 'map', id })
                }}
                className={inputCls}
              >
                <option value="">{t('campaign.tables.editor.attachTo')}</option>
                {availableRooms.length > 0 && (
                  <optgroup label="Rooms">
                    {availableRooms.map(r => (
                      <option key={r.id} value={`room:${r.id}`}>#{r.number} {r.name}</option>
                    ))}
                  </optgroup>
                )}
                {availableMaps.length > 0 && (
                  <optgroup label="Maps">
                    {availableMaps.map(m => (
                      <option key={m.id} value={`map:${m.id}`}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          {/* Entries */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.entries')}</label>
              <button onClick={addEntry} className="text-xs text-primary hover:underline">+ {t('campaign.tables.editor.addEntry')}</button>
            </div>
            <div className="space-y-2">
              {tbl.entries.map((entry, i) => (
                <div key={i} className="flex gap-2 items-start rounded-lg border border-border/50 p-2">
                  <div className="w-14 shrink-0">
                    <input
                      type="number"
                      value={typeof entry.roll === 'number' ? entry.roll : entry.roll[0]}
                      onChange={e => updateEntry(i, { roll: parseInt(e.target.value) || 1 })}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-center text-sm font-bold outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={entry.description}
                      onChange={e => updateEntry(i, { description: e.target.value })}
                      placeholder={t('campaign.tables.editor.description')}
                      rows={2}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none resize-y"
                    />
                    {isEncounter && (
                      <input
                        type="text"
                        value={entry.quantity ?? ''}
                        onChange={e => updateEntry(i, { quantity: e.target.value || undefined })}
                        placeholder={`${t('campaign.tables.editor.quantity')} (e.g., 1d4+1)`}
                        className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none"
                      />
                    )}
                  </div>
                  <button onClick={() => removeEntry(i)} className="shrink-0 text-xs text-red-400 hover:text-red-300 mt-1">X</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={() => onSave(tbl)} disabled={!tbl.name.trim()} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">Save Table</button>
        </div>
      </div>
    </div>
  )
}
