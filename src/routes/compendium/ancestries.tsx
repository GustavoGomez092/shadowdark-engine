import { createFileRoute } from '@tanstack/react-router'
import { ANCESTRIES, getItemPackId, getPackColor } from '@/data/index.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'
import { sortPackFirst } from '@/lib/data/sort.ts'
import { useSessionStore } from '@/stores/session-store.ts'

export const Route = createFileRoute('/compendium/ancestries')({
  component: AncestriesPage,
})

function AncestriesPage() {
  useDataRegistry()
  const settings = useSessionStore(s => s.session?.settings)
  let ancestries = [...ANCESTRIES]
  if (settings?.showPackMonstersFirst) ancestries = sortPackFirst(ancestries)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Ancestries</h1>
      <p className="mb-6 text-muted-foreground">The six playable ancestries of ShadowDark</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ancestries.map(a => {
          const packColor = getPackColor(getItemPackId(a.id) ?? '')
          return (
          <div key={a.id} className="rounded-xl border border-border bg-card p-5" style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}>
            <h2 className="mb-1 text-xl font-bold">{a.name}</h2>
            <p className="mb-3 text-sm font-medium text-primary">{a.traitName}</p>
            <p className="mb-4 text-sm leading-relaxed">{a.traitDescription}</p>
            <div className="flex flex-wrap gap-1.5">
              {a.languages.map(lang => (
                <span key={lang} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium">
                  {lang}
                </span>
              ))}
            </div>
          </div>
          )
        })}
      </div>
    </main>
  )
}
