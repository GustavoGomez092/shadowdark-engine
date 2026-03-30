import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SPELLS } from '@/data/index.ts'

export const Route = createFileRoute('/compendium/spells')({
  component: SpellsPage,
})

function SpellsPage() {
  const [classFilter, setClassFilter] = useState<'all' | 'wizard' | 'priest'>('all')
  const [tierFilter, setTierFilter] = useState<number>(0) // 0 = all

  const filtered = SPELLS.filter(s => {
    if (classFilter !== 'all' && s.class !== classFilter) return false
    if (tierFilter > 0 && s.tier !== tierFilter) return false
    return true
  })

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Spell Compendium</h1>
      <p className="mb-6 text-muted-foreground">{SPELLS.length} spells available</p>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(['all', 'wizard', 'priest'] as const).map(c => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                classFilter === c
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {[0, 1, 2, 3, 4, 5].map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tierFilter === t
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              {t === 0 ? 'All' : `Tier ${t}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map(spell => (
          <div key={spell.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{spell.name}</h2>
              <div className="flex gap-1.5">
                {spell.isFocus && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    Focus
                  </span>
                )}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  spell.class === 'wizard'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {spell.class === 'wizard' ? 'Wizard' : 'Priest'}
                </span>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Tier {spell.tier}</span>
              <span>Range: {spell.range}</span>
              <span>Duration: {spell.duration}{spell.durationValue ? ` (${spell.durationValue})` : ''}</span>
            </div>
            <p className="text-sm leading-relaxed">{spell.description}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No spells match the current filters.</p>
      )}
    </main>
  )
}
