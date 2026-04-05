import { useState } from 'react'
import type { AdventureNPC } from '@/schemas/campaign.ts'

interface Props {
  npc: AdventureNPC
  onSave: (npc: AdventureNPC) => void
  onCancel: () => void
}

export function NPCEditor({ npc: initial, onSave, onCancel }: Props) {
  const [n, setN] = useState<AdventureNPC>({ ...initial })
  const update = <K extends keyof AdventureNPC>(k: K, v: AdventureNPC[K]) => setN(p => ({ ...p, [k]: v }))
  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{initial.name ? `Edit: ${initial.name}` : 'New NPC'}</h2>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name *</label>
              <input type="text" value={n.name} onChange={e => update('name', e.target.value)} placeholder="e.g., Father Gabel" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ancestry</label>
              <input type="text" value={n.ancestry} onChange={e => update('ancestry', e.target.value)} placeholder="e.g., human, elf" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Role</label>
            <input type="text" value={n.role} onChange={e => update('role', e.target.value)} placeholder="e.g., shopkeeper, quest giver, villain" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
            <textarea value={n.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Physical appearance and context..." className={inputCls + " resize-y"} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Personality</label>
            <textarea value={n.personality} onChange={e => update('personality', e.target.value)} rows={2} placeholder="Mannerisms, motivations, quirks..." className={inputCls + " resize-y"} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Portrait Prompt (for AI)</label>
            <input type="text" value={n.portraitPrompt ?? ''} onChange={e => update('portraitPrompt', e.target.value || undefined)} placeholder="Brief visual description for AI generation" className={inputCls} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={() => onSave(n)} disabled={!n.name.trim()} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">Save NPC</button>
        </div>
      </div>
    </div>
  )
}
