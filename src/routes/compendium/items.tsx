import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { WEAPONS, ARMOR, GEAR, getItemPackId, getPackColor } from '@/data/index.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'
import { sortPackFirst } from '@/lib/data/sort.ts'
import { useSessionStore } from '@/stores/session-store.ts'

export const Route = createFileRoute('/compendium/items')({
  component: ItemsPage,
})

type Tab = 'weapons' | 'armor' | 'gear'

function ItemsPage() {
  useDataRegistry()
  const [tab, setTab] = useState<Tab>('weapons')
  const [search, setSearch] = useState('')
  const settings = useSessionStore(s => s.session?.settings)

  const q = search.toLowerCase()

  let filteredWeapons = WEAPONS.filter(w => !q || w.name.toLowerCase().includes(q) || w.properties.some(p => p.includes(q)))
  let filteredArmor = ARMOR.filter(a => !q || a.name.toLowerCase().includes(q))
  let filteredGear = GEAR.filter(g => !q || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
  if (settings?.showPackItemsFirst) {
    filteredWeapons = sortPackFirst(filteredWeapons)
    filteredArmor = sortPackFirst(filteredArmor)
    filteredGear = sortPackFirst(filteredGear)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Equipment & Items</h1>
      <p className="mb-6 text-muted-foreground">Weapons, armor, and adventuring gear</p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(['weapons', 'armor', 'gear'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </div>

      {tab === 'weapons' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredWeapons.map(w => {
            const packColor = getPackColor(getItemPackId(w.id) ?? '')
            return (
            <div key={w.id} className="rounded-lg border border-border bg-card p-3" style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}>
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{w.name}</span>
                <span className="text-sm text-muted-foreground">{formatCost(w.cost)} · {w.slots} slot{w.slots !== 1 ? 's' : ''}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                <span>Damage: <span className="text-foreground font-mono">{w.damage}{w.versatileDamage ? `/${w.versatileDamage}` : ''}</span></span>
                <span className="capitalize">{w.type}</span>
                <span className="capitalize">Range: {w.range}</span>
              </div>
              {w.properties.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {w.properties.map(p => (
                    <span key={p} className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{p.replace('_', '-')}</span>
                  ))}
                </div>
              )}
            </div>
            )
          })}
          {filteredWeapons.length === 0 && <p className="col-span-2 py-8 text-center text-muted-foreground">No weapons match your search.</p>}
        </div>
      )}

      {tab === 'armor' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredArmor.map(a => {
            const packColor = getPackColor(getItemPackId(a.id) ?? '')
            return (
            <div key={a.id} className="rounded-lg border border-border bg-card p-3" style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}>
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{a.name}</span>
                <span className="text-sm text-muted-foreground">{formatCost(a.cost)} · {a.slots} slot{a.slots !== 1 ? 's' : ''}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                <span>AC: <span className="text-foreground font-mono">{a.type === 'shield' ? '+2' : a.acBase}{a.addDex ? ' + DEX' : ''}</span></span>
                {a.isMithral && <span className="text-purple-400">Mithral</span>}
              </div>
              {(a.stealthPenalty || a.swimPenalty !== 'none') && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {a.stealthPenalty && <span className="rounded-full bg-red-500/10 text-red-400 px-2 py-0.5 text-xs">Stealth disadv.</span>}
                  {a.swimPenalty === 'disadvantage' && <span className="rounded-full bg-red-500/10 text-red-400 px-2 py-0.5 text-xs">Swim disadv.</span>}
                  {a.swimPenalty === 'cannot' && <span className="rounded-full bg-red-500/10 text-red-400 px-2 py-0.5 text-xs">Cannot swim</span>}
                </div>
              )}
            </div>
            )
          })}
          {filteredArmor.length === 0 && <p className="col-span-2 py-8 text-center text-muted-foreground">No armor matches your search.</p>}
        </div>
      )}

      {tab === 'gear' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredGear.map(g => {
            const packColor = getPackColor(getItemPackId(g.id) ?? '')
            return (
            <div key={g.id} className="rounded-lg border border-border bg-card p-3" style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}>
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{g.name}</span>
                <span className="text-sm text-muted-foreground">{formatCost(g.cost)} · {g.slots} slot{g.slots !== 1 ? 's' : ''}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
            </div>
            )
          })}
          {filteredGear.length === 0 && <p className="col-span-2 py-8 text-center text-muted-foreground">No gear matches your search.</p>}
        </div>
      )}
    </main>
  )
}

function formatCost(gp: number): string {
  if (gp >= 1) return `${gp} gp`
  if (gp >= 0.1) return `${Math.round(gp * 10)} sp`
  return `${Math.round(gp * 100)} cp`
}
