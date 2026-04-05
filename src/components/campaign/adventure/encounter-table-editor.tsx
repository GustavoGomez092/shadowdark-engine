import { useState } from 'react'
import { generateId } from '@/lib/utils/id.ts'
import type { RandomEncounterTable, RandomEncounterEntry } from '@/schemas/campaign.ts'

interface Props {
  table: RandomEncounterTable
  onSave: (table: RandomEncounterTable) => void
  onCancel: () => void
}

export function EncounterTableEditor({ table: initial, onSave, onCancel }: Props) {
  const [t, setT] = useState<RandomEncounterTable>({
    ...initial,
    entries: initial.entries.map(e => ({ ...e })),
  })

  function addEntry() {
    const nextRoll = t.entries.length > 0 ? Math.max(...t.entries.map(e => typeof e.roll === 'number' ? e.roll : e.roll[1])) + 1 : 1
    setT(prev => ({
      ...prev,
      entries: [...prev.entries, { roll: nextRoll, description: '' }],
    }))
  }

  function updateEntry(index: number, updates: Partial<RandomEncounterEntry>) {
    setT(prev => {
      const entries = [...prev.entries]
      entries[index] = { ...entries[index], ...updates }
      return { ...prev, entries }
    })
  }

  function removeEntry(index: number) {
    setT(prev => ({ ...prev, entries: prev.entries.filter((_, i) => i !== index) }))
  }

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{initial.name || 'New Encounter Table'}</h2>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Table Name</label>
              <input type="text" value={t.name} onChange={e => setT(prev => ({ ...prev, name: e.target.value }))} placeholder="Random Encounters" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Dice Expression</label>
              <input type="text" value={t.diceExpression} onChange={e => setT(prev => ({ ...prev, diceExpression: e.target.value }))} placeholder="e.g., 1d6, 2d6" className={inputCls} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Entries</label>
              <button onClick={addEntry} className="text-xs text-primary hover:underline">+ Add Entry</button>
            </div>
            <div className="space-y-2">
              {t.entries.map((entry, i) => (
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
                      placeholder="What happens on this roll..."
                      rows={2}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none resize-y"
                    />
                    <input
                      type="text"
                      value={entry.quantity ?? ''}
                      onChange={e => updateEntry(i, { quantity: e.target.value || undefined })}
                      placeholder="Quantity (e.g., 1d4+1)"
                      className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none"
                    />
                  </div>
                  <button onClick={() => removeEntry(i)} className="shrink-0 text-xs text-red-400 hover:text-red-300 mt-1">X</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={() => onSave(t)} disabled={!t.name.trim()} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">Save Table</button>
        </div>
      </div>
    </div>
  )
}
