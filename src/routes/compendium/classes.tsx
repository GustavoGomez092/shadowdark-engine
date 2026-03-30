import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CLASSES } from '@/data/index.ts'
import type { ClassDefinition } from '@/schemas/character.ts'

export const Route = createFileRoute('/compendium/classes')({
  component: ClassesPage,
})

function ClassesPage() {
  const [selected, setSelected] = useState<string>('fighter')
  const cls = CLASSES.find(c => c.id === selected)!

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Classes</h1>
      <p className="mb-6 text-muted-foreground">The four adventuring classes</p>

      <div className="mb-6 flex gap-1 rounded-lg border border-border p-1 w-fit">
        {CLASSES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              selected === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <ClassDetail cls={cls} />
    </main>
  )
}

function ClassDetail({ cls }: { cls: ClassDefinition }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-2xl font-bold">{cls.name}</h2>
        <p className="mb-4 text-muted-foreground">{cls.description}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hit Die</h3>
            <p className="text-lg font-bold">{cls.hitDie}</p>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weapons</h3>
            <p className="text-sm">{cls.weaponProficiencies.join(', ')}</p>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Armor</h3>
            <p className="text-sm capitalize">{cls.armorProficiencies.join(', ').replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-lg font-semibold">Class Features</h3>
        <div className="space-y-3">
          {cls.features.map(f => (
            <div key={f.name}>
              <h4 className="font-semibold">{f.name}</h4>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-lg font-semibold">Talent Table (2d6)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-semibold w-20">Roll</th>
              <th className="pb-2 font-semibold">Effect</th>
            </tr>
          </thead>
          <tbody>
            {cls.talentTable.map((t, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono">
                  {Array.isArray(t.roll) ? `${t.roll[0]}-${t.roll[1]}` : t.roll}
                </td>
                <td className="py-2">{t.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cls.spellsKnownByLevel && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-lg font-semibold">Spells Known by Level</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-semibold">Level</th>
                  {[1, 2, 3, 4, 5].map(t => (
                    <th key={t} className="pb-2 pr-4 font-semibold text-center">Tier {t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cls.spellsKnownByLevel.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 pr-4 font-medium">{i + 1}</td>
                    {row.map((count, j) => (
                      <td key={j} className="py-1.5 pr-4 text-center">
                        {count > 0 ? count : <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
