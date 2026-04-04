import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MONSTERS, getItemPackId, getPackColor } from '@/data/index.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'
import { sortPackFirst } from '@/lib/data/sort.ts'
import { getAbilityModifier } from '@/schemas/reference.ts'
import type { MonsterDefinition } from '@/schemas/monsters.ts'
import { useSessionStore } from '@/stores/session-store.ts'

export const Route = createFileRoute('/compendium/monsters')({
  component: MonstersReferencePage,
})

function MonstersReferencePage() {
  useDataRegistry()
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number>(0) // 0 = all
  const settings = useSessionStore(s => s.session?.settings)

  let filtered = MONSTERS.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    if (levelFilter > 0 && m.level !== levelFilter) return false
    return true
  })
  if (settings?.showPackMonstersFirst) filtered = sortPackFirst(filtered)

  const maxLevel = Math.max(...MONSTERS.map(m => m.level))

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Monster Reference</h1>
      <p className="mb-6 text-muted-foreground">{MONSTERS.length} creatures</p>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search monsters..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(Number(e.target.value))}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value={0}>All Levels</option>
          {Array.from({ length: maxLevel }, (_, i) => i + 1).map(l => (
            <option key={l} value={l}>Level {l}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map(m => (
          <MonsterCard key={m.id} monster={m} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No monsters match the current filters.</p>
      )}
    </main>
  )
}

function MonsterCard({ monster: m }: { monster: MonsterDefinition }) {
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  const packColor = getPackColor(getItemPackId(m.id) ?? '')

  return (
    <div className="rounded-xl border border-border bg-card p-4" style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{m.name}</h2>
        <span className="text-sm text-muted-foreground">LV {m.level}</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>AC {m.ac}{m.acSource ? ` (${m.acSource})` : ''}</span>
        <span>HP {m.hp}</span>
        <span className="capitalize">
          MV {m.movement.double ? 'double ' : ''}{m.movement.normal}
          {m.movement.fly ? ` (fly)` : ''}
          {m.movement.swim ? ` (swim)` : ''}
          {m.movement.climb ? ` (climb)` : ''}
          {m.movement.burrow ? ` (burrow)` : ''}
        </span>
        <span className="capitalize">AL {m.alignment.charAt(0).toUpperCase()}</span>
      </div>

      <div className="mb-3 grid grid-cols-6 gap-1 text-center text-xs">
        {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map(stat => (
          <div key={stat}>
            <div className="font-semibold text-muted-foreground">{stat}</div>
            <div className="font-mono">{fmt(getAbilityModifier(m.stats[stat]))}</div>
          </div>
        ))}
      </div>

      <div className="mb-2 space-y-1 text-sm">
        {m.attacks.map((a, i) => (
          <div key={i}>
            <span className="font-medium">{a.multiattack && a.multiattack > 1 ? `${a.multiattack} ` : ''}{a.name}</span>
            {' '}{fmt(a.bonus)} ({a.damage})
            {a.specialEffect && <span className="text-muted-foreground"> — {a.specialEffect}</span>}
          </div>
        ))}
      </div>

      {m.abilities.length > 0 && (
        <div className="border-t border-border/50 pt-2 text-sm">
          {m.abilities.map((a, i) => (
            <p key={i} className="mb-1">
              <span className="font-semibold">{a.name}.</span>{' '}
              <span className="text-muted-foreground">{a.description}</span>
            </p>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {m.tags.map(tag => (
          <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
