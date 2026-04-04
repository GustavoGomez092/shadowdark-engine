import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MONSTERS, getItemPackId, getPackColor } from '@/data/index.ts'
import { dataRegistry } from '@/lib/data/registry.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'
import { sortPackFirst } from '@/lib/data/sort.ts'
import { useSessionStore } from '@/stores/session-store.ts'
import type { MonsterDefinition } from '@/schemas/monsters.ts'
import { getAbilityModifier } from '@/schemas/reference.ts'
import { generateId } from '@/lib/utils/id.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'
import { createActionLog } from '@/lib/utils/action-log.ts'

export const Route = createFileRoute('/gm/monsters')({
  component: GMMonstersPage,
})

function GMMonstersPage() {
  useDataRegistry()
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number>(0)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showRandomEncounter, setShowRandomEncounter] = useState(false)
  const addMonster = useSessionStore(s => s.addMonster)
  const addChatMessage = useSessionStore(s => s.addChatMessage)
  const settings = useSessionStore(s => s.session?.settings)

  const monsterPacks = dataRegistry.getPacks().filter(p => p.enabled && p.counts.monsters > 0)

  const maxLevel = Math.max(...MONSTERS.map(m => m.level))
  let filtered = MONSTERS.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    if (levelFilter > 0 && m.level !== levelFilter) return false
    if (sourceFilter === 'core') {
      if (getItemPackId(m.id)) return false
    } else if (sourceFilter !== 'all') {
      if (getItemPackId(m.id) !== sourceFilter) return false
    }
    return true
  })
  if (settings?.showPackMonstersFirst) filtered = sortPackFirst(filtered)

  const [spawned, setSpawned] = useState<string | null>(null)
  const session = useSessionStore(s => s.session)
  const activeMonsters = session ? Object.values(session.activeMonsters).filter(m => !m.isDefeated) : []

  function spawnMonster(def: MonsterDefinition) {
    addMonster({
      id: generateId(),
      definitionId: def.id,
      name: def.name,
      currentHp: def.hp,
      maxHp: def.hp,
      conditions: [],
      isDefeated: false,
    })
    setSpawned(def.name)
    setTimeout(() => setSpawned(null), 2000)
    setTimeout(() => gmPeer.broadcastStateSync(), 50)
  }

  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monsters</h1>
          <p className="text-muted-foreground">Browse and spawn monsters into the session</p>
        </div>
        <button
          onClick={() => setShowRandomEncounter(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          🎲 Random Encounter
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search monsters..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setLevelFilter(0)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${levelFilter === 0 ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
          >
            All
          </button>
          {Array.from({ length: maxLevel }, (_, i) => i + 1).map(lv => (
            <button
              key={lv}
              onClick={() => setLevelFilter(lv)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${levelFilter === lv ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
            >
              {lv}
            </button>
          ))}
        </div>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Sources</option>
          <option value="core">Core Only</option>
          {monsterPacks.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.counts.monsters})</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} monsters</span>
      </div>

      {/* Spawn toast */}
      {spawned && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
          Spawned {spawned} into the session!
        </div>
      )}

      {/* Active monsters in session */}
      {activeMonsters.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-semibold">Active in Session ({activeMonsters.length})</h2>
          <div className="flex flex-wrap gap-2">
            {activeMonsters.map(m => (
              <span key={m.id} className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium">
                {m.name} <span className="text-muted-foreground">HP {m.currentHp}/{m.maxHp}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map(m => {
          const packColor = getPackColor(getItemPackId(m.id) ?? '')
          return (
          <div key={m.id} className="rounded-xl border border-border bg-card p-4" style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{m.name}</h2>
              <span className="text-sm text-muted-foreground">LV {m.level}</span>
            </div>
            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>AC {m.ac}</span>
              <span>HP {m.hp}</span>
            </div>
            <div className="mb-2 grid grid-cols-6 gap-1 text-center text-xs">
              {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map(stat => (
                <div key={stat}>
                  <div className="font-semibold text-muted-foreground">{stat}</div>
                  <div className="font-mono">{fmt(getAbilityModifier(m.stats[stat]))}</div>
                </div>
              ))}
            </div>
            <div className="mb-2 text-sm">
              {m.attacks.map((a, i) => (
                <span key={i}>{i > 0 && ', '}{a.name} {fmt(a.bonus)} ({a.damage})</span>
              ))}
            </div>
            <button
              onClick={() => spawnMonster(m)}
              className="mt-2 w-full rounded-lg bg-primary py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Spawn
            </button>
          </div>
          )
        })}
      </div>

      {/* Random Encounter Dialog */}
      {showRandomEncounter && (
        <RandomEncounterDialog
          onSpawn={(monsters, startEncounter) => {
            for (const m of monsters) {
              addMonster(m)
            }
            if (startEncounter) {
              addChatMessage(createActionLog(`Encounter started! ${monsters.length} foe${monsters.length > 1 ? 's' : ''} spawned`))
            }
            setSpawned(`${monsters.length} monsters`)
            setTimeout(() => setSpawned(null), 2000)
            setTimeout(() => gmPeer.broadcastStateSync(), 50)
            setShowRandomEncounter(false)
          }}
          onCancel={() => setShowRandomEncounter(false)}
        />
      )}
    </main>
  )
}

function RandomEncounterDialog({ onSpawn, onCancel }: {
  onSpawn: (monsters: import('@/schemas/monsters.ts').MonsterInstance[], startEncounter: boolean) => void
  onCancel: () => void
}) {
  const [minLevel, setMinLevel] = useState(1)
  const [maxLevel, setMaxLevel] = useState(3)
  const [minFoes, setMinFoes] = useState(1)
  const [maxFoes, setMaxFoes] = useState(4)
  const [selectedSources, setSelectedSources] = useState<Set<string>>(() => new Set(['core']))
  const [preview, setPreview] = useState<{ def: MonsterDefinition; instance: import('@/schemas/monsters.ts').MonsterInstance }[] | null>(null)

  const maxMonsterLevel = Math.max(...MONSTERS.map(m => m.level))
  const monsterPacks = dataRegistry.getPacks().filter(p => p.enabled && p.counts.monsters > 0)

  function toggleSource(id: string) {
    setSelectedSources(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedSources(new Set(['core', ...monsterPacks.map(p => p.id)]))
  }

  const allSelected = selectedSources.has('core') && monsterPacks.every(p => selectedSources.has(p.id))

  function generate() {
    let eligible = MONSTERS.filter(m => m.level >= minLevel && m.level <= maxLevel)
    // Filter by selected sources
    if (!allSelected) {
      eligible = eligible.filter(m => {
        const packId = getItemPackId(m.id)
        if (!packId) return selectedSources.has('core')
        return selectedSources.has(packId)
      })
    }
    if (eligible.length === 0) { setPreview([]); return }

    const count = minFoes + Math.floor(Math.random() * (maxFoes - minFoes + 1))
    const result: { def: MonsterDefinition; instance: import('@/schemas/monsters.ts').MonsterInstance }[] = []

    for (let i = 0; i < count; i++) {
      const def = eligible[Math.floor(Math.random() * eligible.length)]
      result.push({
        def,
        instance: {
          id: generateId(),
          definitionId: def.id,
          name: result.filter(r => r.def.id === def.id).length > 0
            ? `${def.name} ${result.filter(r => r.def.id === def.id).length + 1}`
            : def.name,
          currentHp: def.hp,
          maxHp: def.hp,
          conditions: [],
          isDefeated: false,
        },
      })
    }
    setPreview(result)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold mb-4">🎲 Random Encounter</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Min Level</label>
            <input type="number" value={minLevel} min={0} max={maxMonsterLevel}
              onChange={e => setMinLevel(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Max Level</label>
            <input type="number" value={maxLevel} min={minLevel} max={maxMonsterLevel}
              onChange={e => setMaxLevel(Math.max(minLevel, parseInt(e.target.value) || minLevel))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Min Foes</label>
            <input type="number" value={minFoes} min={1} max={20}
              onChange={e => setMinFoes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Max Foes</label>
            <input type="number" value={maxFoes} min={minFoes} max={20}
              onChange={e => setMaxFoes(Math.max(minFoes, parseInt(e.target.value) || minFoes))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {monsterPacks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">Monster Sources</label>
              <button
                onClick={allSelected ? () => setSelectedSources(new Set()) : selectAll}
                className="text-[10px] text-primary hover:underline"
              >{allSelected ? 'Deselect all' : 'Select all'}</button>
            </div>
            <div className="rounded-lg border border-input bg-background p-2 space-y-1">
              <label className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={selectedSources.has('core')}
                  onChange={() => toggleSource('core')}
                  className="rounded accent-primary"
                />
                <span>Core Monsters</span>
                <span className="ml-auto text-xs text-muted-foreground">{MONSTERS.filter(m => !getItemPackId(m.id)).length}</span>
              </label>
              {monsterPacks.map(p => (
                <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={selectedSources.has(p.id)}
                    onChange={() => toggleSource(p.id)}
                    className="rounded accent-primary"
                  />
                  {p.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
                  <span>{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{p.counts.monsters}</span>
                </label>
              ))}
            </div>
            {selectedSources.size === 0 && (
              <p className="mt-1 text-[10px] text-red-400">Select at least one source to generate encounters.</p>
            )}
          </div>
        )}

        <button
          onClick={generate}
          className="w-full rounded-lg border border-primary/30 bg-primary/10 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition mb-4"
        >
          🎲 Generate
        </button>

        {/* Preview */}
        {preview !== null && (
          <div className="mb-4">
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No monsters match the level range.</p>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">{preview.length} foes generated</p>
                  <button onClick={generate} className="text-[10px] text-primary hover:underline">Re-roll</button>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {preview.map(({ def, instance }) => {
                    const packColor = getPackColor(getItemPackId(def.id) ?? '')
                    return (
                    <div key={instance.id} className="rounded-lg border border-border/50 px-3 py-2 text-sm" style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}>
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold">{instance.name}</span>
                        <span className="text-xs text-muted-foreground">LV {def.level}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>HP {def.hp}</span>
                        <span>AC {def.ac}</span>
                        <span>{def.attacks.map(a => `${a.name} (${a.damage})`).join(', ')}</span>
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {preview && preview.length > 0 && (
            <>
              <button
                onClick={() => onSpawn(preview.map(p => p.instance), true)}
                className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                ⚔️ Spawn & Start Encounter ({preview.length})
              </button>
            </>
          )}
          <button
            onClick={onCancel}
            className="w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-accent transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
