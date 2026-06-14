import { useMemo, useState } from 'react'
import type { Character } from '@/schemas/character.ts'
import { readCampaign, listSavedCampaigns } from '@/stores/campaign-store.ts'
import { npcToCharacter } from '@/lib/character/npc-to-character.ts'

interface Props {
  onClose: () => void
  onAdd: (characters: Character[]) => void
}

/**
 * Pick a saved campaign and add one or more of its adventure NPCs into the
 * session as controllable NPC-characters. Sessions aren't linked to a campaign,
 * so the GM chooses the source campaign here.
 */
export function AddNpcDialog({ onClose, onAdd }: Props) {
  const campaigns = useMemo(() => listSavedCampaigns(), [])
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const npcs = useMemo(() => {
    if (!campaignId) return []
    return readCampaign(campaignId)?.adventure.npcs ?? []
  }, [campaignId])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAdd() {
    const chars = npcs.filter(n => selected.has(n.id)).map(npcToCharacter)
    if (chars.length) onAdd(chars)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add NPC from Campaign</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No saved campaigns found. Create or import a campaign first.</p>
        ) : (
          <>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Campaign</label>
            <select
              value={campaignId}
              onChange={e => { setCampaignId(e.target.value); setSelected(new Set()) }}
              className="mb-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label className="mb-1 block text-xs font-semibold text-muted-foreground">NPCs ({npcs.length})</label>
            {npcs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">This campaign has no NPCs.</p>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {npcs.map(n => (
                  <label key={n.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-2 hover:bg-accent">
                    <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggle(n.id)} className="mt-1" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{n.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        <span className="capitalize">{n.ancestry}</span>
                        {n.stats?.hp != null ? ` · CA ${n.stats.ac ?? '—'} · PG ${n.stats.hp}` : ''}
                        {n.role ? ` · ${n.role}` : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={selected.size === 0}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                Add {selected.size > 0 ? `(${selected.size})` : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
