import { useState, useRef } from 'react'
import { dataRegistry } from '@/lib/data/registry.ts'
import { validateDataPack } from '@/lib/data/validator.ts'
import type { DataPackMeta } from '@/lib/data/types.ts'

export function DataPackManager() {
  const [packs, setPacks] = useState<DataPackMeta[]>(() => dataRegistry.getPacks())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function refreshPacks() {
    setPacks(dataRegistry.getPacks())
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccess(null)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string)
        const validation = validateDataPack(raw)

        if (!validation.valid) {
          setError(`Invalid data pack: ${validation.errors.slice(0, 3).join('; ')}${validation.errors.length > 3 ? ` (+${validation.errors.length - 3} more)` : ''}`)
          return
        }

        const result = dataRegistry.addPack(validation.pack!)
        if (result.success) {
          refreshPacks()
          const pack = validation.pack!
          const totalItems = Object.values(pack.data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
          setSuccess(`Added "${pack.name}" by ${pack.author} (${totalItems} items)`)
          setTimeout(() => setSuccess(null), 5000)
        } else {
          setError(result.error ?? 'Failed to add pack')
        }
      } catch {
        setError('Failed to parse JSON file')
      }

      // Reset file input
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsText(file)
  }

  function handleRemove(packId: string) {
    dataRegistry.removePack(packId)
    refreshPacks()
    setSuccess('Pack removed. Core data restored.')
    setTimeout(() => setSuccess(null), 3000)
  }

  function handleExport(packId: string) {
    const json = dataRegistry.exportPack(packId)
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${packId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Data summary
  const totalMonsters = dataRegistry.monsters.length
  const totalSpells = dataRegistry.spells.length
  const totalGear = dataRegistry.gear.length + dataRegistry.weapons.length + dataRegistry.armor.length
  const totalBackgrounds = dataRegistry.backgrounds.length

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-1 font-semibold">Data Packs</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Extend the game with custom monsters, spells, items, and more. Upload JSON data packs to add homebrew content.
      </p>

      {/* Current data summary */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium">{totalMonsters} monsters</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium">{totalSpells} spells</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium">{totalGear} items</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium">{totalBackgrounds} backgrounds</span>
        {packs.length > 0 && (
          <span className="rounded-full bg-primary/20 px-2.5 py-1 text-[10px] font-medium text-primary">{packs.length} custom pack{packs.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Upload */}
      <div className="mb-4">
        <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border py-6 hover:border-primary/50 hover:bg-accent/50 transition">
          <div className="text-center">
            <div className="text-2xl mb-1">📦</div>
            <p className="text-sm font-medium">Upload Data Pack</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">JSON file (.json)</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-lg bg-green-500/10 border border-green-500/20 p-2.5 text-xs text-green-400">
          {success}
        </div>
      )}

      {/* Installed packs */}
      {packs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Installed Packs</p>
          <div className="space-y-2">
            {packs.map(pack => {
              const totalItems = Object.values(pack.counts).reduce((sum, n) => sum + n, 0)
              const nonZeroCounts = Object.entries(pack.counts).filter(([, v]) => v > 0)

              return (
                <div key={pack.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <span className="font-semibold text-sm">{pack.name}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">v{pack.version} by {pack.author}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExport(pack.id)}
                        className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Export"
                      >Export</button>
                      <button
                        onClick={() => handleRemove(pack.id)}
                        className="rounded px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10"
                      >Remove</button>
                    </div>
                  </div>
                  {pack.description && (
                    <p className="text-[10px] text-muted-foreground mb-1">{pack.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {nonZeroCounts.map(([key, count]) => (
                      <span key={key} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary capitalize">
                        {count} {key}
                      </span>
                    ))}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground">{totalItems} total</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Example format */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Data Pack JSON format</summary>
        <pre className="mt-2 rounded-lg bg-secondary p-3 text-[10px] text-muted-foreground overflow-x-auto">{`{
  "id": "my-homebrew",
  "name": "My Homebrew Pack",
  "author": "Your Name",
  "version": "1.0",
  "description": "Custom monsters and spells",
  "data": {
    "monsters": [
      {
        "id": "custom-goblin-king",
        "name": "Goblin King",
        "level": 5,
        "ac": 15,
        "hp": 25,
        "attacks": [{ "name": "Crown Strike", "bonus": 4, "damage": "1d8+2", "range": "close" }],
        "movement": { "normal": "near" },
        "stats": { "STR": 14, "DEX": 12, "CON": 13, "INT": 10, "WIS": 8, "CHA": 16 },
        "alignment": "chaotic",
        "abilities": [{ "name": "Royal Command", "description": "..." }],
        "checksMorale": false,
        "tags": ["goblinoid", "leader"]
      }
    ],
    "spells": [],
    "weapons": [],
    "gear": []
  }
}`}</pre>
      </details>
    </div>
  )
}
