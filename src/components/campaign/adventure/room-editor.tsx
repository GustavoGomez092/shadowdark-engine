import { useState } from 'react'
import type { AdventureRoom, TrapDefinition } from '@/schemas/campaign.ts'
import { createEmptyTrap } from '@/lib/campaign/defaults.ts'

interface Props {
  room: AdventureRoom
  monsterNames: { id: string; name: string }[]
  onSave: (room: AdventureRoom) => void
  onCancel: () => void
}

export function RoomEditor({ room: initial, monsterNames, onSave, onCancel }: Props) {
  const [r, setR] = useState<AdventureRoom>({
    ...initial,
    monsterIds: [...initial.monsterIds],
    traps: initial.traps.map(t => ({ ...t })),
    connections: [...initial.connections],
  })

  function update<K extends keyof AdventureRoom>(key: K, value: AdventureRoom[K]) {
    setR(prev => ({ ...prev, [key]: value }))
  }

  function addTrap() {
    setR(prev => ({ ...prev, traps: [...prev.traps, createEmptyTrap()] }))
  }

  function updateTrap(index: number, updates: Partial<TrapDefinition>) {
    setR(prev => {
      const traps = [...prev.traps]
      traps[index] = { ...traps[index], ...updates }
      return { ...prev, traps }
    })
  }

  function removeTrap(index: number) {
    setR(prev => ({ ...prev, traps: prev.traps.filter((_, i) => i !== index) }))
  }

  function toggleMonster(monsterId: string) {
    setR(prev => ({
      ...prev,
      monsterIds: prev.monsterIds.includes(monsterId)
        ? prev.monsterIds.filter(id => id !== monsterId)
        : [...prev.monsterIds, monsterId],
    }))
  }

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">Room #{r.number}: {r.name || 'Unnamed'}</h2>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Room Number</label>
              <input type="number" value={r.number} onChange={e => update('number', parseInt(e.target.value) || 1)} min={1} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Room Name *</label>
              <input type="text" value={r.name} onChange={e => update('name', e.target.value)} placeholder="e.g., Foyer, Library" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description (read-aloud text)</label>
            <textarea value={r.description} onChange={e => update('description', e.target.value)} rows={4} placeholder="What the players see and hear when entering..." className={inputCls + " resize-y"} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">GM Notes (private)</label>
            <textarea value={r.gmNotes} onChange={e => update('gmNotes', e.target.value)} rows={3} placeholder="Hidden information, DCs, triggers..." className={inputCls + " resize-y"} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Treasure</label>
            <input type="text" value={r.treasure} onChange={e => update('treasure', e.target.value)} placeholder="e.g., 2d6 gp, potion of healing" className={inputCls} />
          </div>

          {/* Monsters */}
          {monsterNames.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Monsters in Room</label>
              <div className="flex flex-wrap gap-1.5">
                {monsterNames.map(m => (
                  <button
                    key={m.id}
                    onClick={() => toggleMonster(m.id)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      r.monsterIds.includes(m.id)
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Traps */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Traps</label>
              <button onClick={addTrap} className="text-xs text-primary hover:underline">+ Add Trap</button>
            </div>
            {r.traps.map((trap, i) => (
              <div key={trap.id} className="mb-2 rounded-lg border border-border/50 p-3 space-y-2">
                <div className="flex gap-2">
                  <input type="text" value={trap.name} onChange={e => updateTrap(i, { name: e.target.value })} placeholder="Trap name" className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
                  <button onClick={() => removeTrap(i)} className="text-xs text-red-400">Remove</button>
                </div>
                <textarea value={trap.description} onChange={e => updateTrap(i, { description: e.target.value })} placeholder="Description" rows={2} className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none resize-y" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div><label className="text-[10px] text-muted-foreground">Detect DC</label><input type="number" value={trap.detectionDC} onChange={e => updateTrap(i, { detectionDC: parseInt(e.target.value) || 12 })} className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none" /></div>
                  <div><label className="text-[10px] text-muted-foreground">Disarm DC</label><input type="number" value={trap.disarmDC} onChange={e => updateTrap(i, { disarmDC: parseInt(e.target.value) || 12 })} className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none" /></div>
                  <div className="col-span-2"><label className="text-[10px] text-muted-foreground">Damage</label><input type="text" value={trap.damage ?? ''} onChange={e => updateTrap(i, { damage: e.target.value || undefined })} placeholder="e.g., 1d6" className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={() => onSave(r)} disabled={!r.name.trim()} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">Save Room</button>
        </div>
      </div>
    </div>
  )
}
