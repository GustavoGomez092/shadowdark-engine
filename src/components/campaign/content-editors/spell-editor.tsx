import { useState } from 'react'
import { generateId } from '@/lib/utils/id.ts'
import type { SpellDefinition } from '@/schemas/spells.ts'

export function createEmptySpell(): SpellDefinition {
  return {
    id: generateId(),
    name: '',
    tier: 1 as 1,
    class: 'wizard',
    range: 'near',
    duration: 'instant',
    isFocus: false,
    description: '',
    effects: [],
  }
}

interface Props {
  spell: SpellDefinition
  onSave: (spell: SpellDefinition) => void
  onCancel: () => void
}

export function SpellEditor({ spell: initial, onSave, onCancel }: Props) {
  const [s, setS] = useState<SpellDefinition>({ ...initial, effects: initial.effects.map(e => ({ ...e })) })

  function update<K extends keyof SpellDefinition>(key: K, value: SpellDefinition[K]) {
    setS(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{initial.name ? `Edit: ${initial.name}` : 'New Spell'}</h2>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name *</label>
              <input type="text" value={s.name} onChange={e => update('name', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tier (1-5)</label>
              <input type="number" value={s.tier} min={1} max={5} onChange={e => update('tier', Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) as 1)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Class</label>
              <select value={s.class} onChange={e => update('class', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
                <option value="wizard">Wizard</option>
                <option value="priest">Priest</option>
                <option value="witch">Witch</option>
                <option value="seer">Seer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Range</label>
              <select value={s.range} onChange={e => update('range', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
                <option value="self">Self</option>
                <option value="touch">Touch</option>
                <option value="close">Close</option>
                <option value="near">Near</option>
                <option value="far">Far</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Duration</label>
              <select value={s.duration} onChange={e => update('duration', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
                <option value="instant">Instant</option>
                <option value="rounds">Rounds</option>
                <option value="focus">Focus</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="permanent">Permanent</option>
                <option value="special">Special</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.isFocus} onChange={e => update('isFocus', e.target.checked)} className="rounded" />
            Requires Focus (concentration)
          </label>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description *</label>
            <textarea value={s.description} onChange={e => update('description', e.target.value)}
              rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y" />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={() => onSave(s)} disabled={!s.name.trim()} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">Save Spell</button>
        </div>
      </div>
    </div>
  )
}
