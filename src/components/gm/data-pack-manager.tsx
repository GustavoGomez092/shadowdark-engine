import { useState, useRef, useCallback } from 'react'
import { dataRegistry } from '@/lib/data/registry.ts'
import { validateDataPack } from '@/lib/data/validator.ts'
import type { DataPackMeta } from '@/lib/data/types.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'

export function DataPackManager() {
  useDataRegistry()
  const packs = dataRegistry.getPacks()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [expandedPack, setExpandedPack] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  function processFile(file: File) {
    setError(null)
    setSuccess(null)
    setWarnings([])

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string)
        const validation = validateDataPack(raw)

        if (!validation.valid) {
          setError(`Invalid data pack: ${validation.errors.slice(0, 5).join('; ')}${validation.errors.length > 5 ? ` (+${validation.errors.length - 5} more)` : ''}`)
          return
        }

        const result = dataRegistry.addPack(validation.pack!)
        if (result.success) {
          const pack = validation.pack!
          const totalItems = Object.values(pack.data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
          setSuccess(`Added "${pack.name}" by ${pack.author} (${totalItems} items)`)
          if (result.warnings) setWarnings(result.warnings)
          setTimeout(() => { setSuccess(null); setWarnings([]) }, 8000)
        } else {
          setError(result.error ?? 'Failed to add pack')
        }
      } catch {
        setError('Failed to parse JSON file')
      }

      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsText(file)
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.json')) {
      processFile(file)
    } else if (file) {
      setError('Only .json files are supported')
    }
  }, [])

  function handleRemove(packId: string) {
    dataRegistry.removePack(packId)
    setSuccess('Pack removed. Core data restored.')
    setWarnings([])
    setTimeout(() => setSuccess(null), 3000)
  }

  function handleToggle(packId: string) {
    dataRegistry.togglePack(packId)
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

  function getPackContents(packId: string) {
    const pack = dataRegistry.getPackById(packId)
    if (!pack) return null
    const sections: { key: string; items: { id: string; name: string; detail?: string }[] }[] = []
    if (pack.data.monsters?.length) sections.push({ key: 'Monsters', items: pack.data.monsters.map(m => ({ id: m.id, name: m.name, detail: `Lv${m.level}` })) })
    if (pack.data.spells?.length) sections.push({ key: 'Spells', items: pack.data.spells.map(s => ({ id: s.id, name: s.name, detail: `T${s.tier} ${s.class}` })) })
    if (pack.data.weapons?.length) sections.push({ key: 'Weapons', items: pack.data.weapons.map(w => ({ id: w.id, name: w.name, detail: w.damage })) })
    if (pack.data.armor?.length) sections.push({ key: 'Armor', items: pack.data.armor.map(a => ({ id: a.id, name: a.name, detail: `AC ${a.acBase}` })) })
    if (pack.data.gear?.length) sections.push({ key: 'Gear', items: pack.data.gear.map(g => ({ id: g.id, name: g.name })) })
    if (pack.data.backgrounds?.length) sections.push({ key: 'Backgrounds', items: pack.data.backgrounds.map(b => ({ id: b.id, name: b.name })) })
    if (pack.data.ancestries?.length) sections.push({ key: 'Ancestries', items: pack.data.ancestries.map(a => ({ id: a.id, name: a.name })) })
    if (pack.data.classes?.length) sections.push({ key: 'Classes', items: pack.data.classes.map(c => ({ id: c.id, name: c.name })) })
    if (pack.data.deities?.length) sections.push({ key: 'Deities', items: pack.data.deities.map(d => ({ id: d.id, name: d.name })) })
    if (pack.data.languages?.length) sections.push({ key: 'Languages', items: pack.data.languages.map(l => ({ id: l.id, name: l.name })) })
    return sections
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

      {/* Upload / Drop Zone */}
      <div
        className="mb-4"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <label className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed py-6 transition ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
        }`}>
          <div className="text-center pointer-events-none">
            <div className="text-2xl mb-1">{isDragging ? '\u2193' : '+'}</div>
            <p className="text-sm font-medium">{isDragging ? 'Drop to import' : 'Upload Data Pack'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Drag & drop or click to browse (.json)</p>
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
      {warnings.length > 0 && (
        <div className="mb-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2.5 text-xs text-yellow-400">
          <p className="font-medium mb-1">Overrides detected:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
            {warnings.length > 5 && <li>+{warnings.length - 5} more</li>}
          </ul>
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
              const isExpanded = expandedPack === pack.id
              const contents = isExpanded ? getPackContents(pack.id) : null

              return (
                <div key={pack.id} className={`rounded-lg border p-3 ${pack.enabled ? 'border-border' : 'border-border/50 opacity-60'}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(pack.id)}
                        className={`relative w-8 h-4 rounded-full transition-colors ${pack.enabled ? 'bg-primary' : 'bg-muted'}`}
                        title={pack.enabled ? 'Disable pack' : 'Enable pack'}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${pack.enabled ? 'translate-x-4' : ''}`} />
                      </button>
                      <div className="flex items-center gap-1.5">
                        {pack.color && (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: pack.color }}
                            title={`Pack color: ${pack.color}`}
                          />
                        )}
                        <span className="font-semibold text-sm">{pack.name}</span>
                        <span className="ml-1 text-[10px] text-muted-foreground">v{pack.version} by {pack.author}</span>
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          <label
                            className={`relative inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer border transition-colors ${pack.color ? 'border-border' : 'border-dashed border-muted-foreground/40'}`}
                            style={pack.color ? { backgroundColor: pack.color + '33' } : undefined}
                            title="Set pack color"
                          >
                            <input
                              type="color"
                              value={pack.color || '#888888'}
                              onChange={(e) => dataRegistry.setPackColor(pack.id, e.target.value)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: pack.color || '#888888', opacity: pack.color ? 1 : 0.3 }}
                            />
                          </label>
                          {pack.color && (
                            <button
                              onClick={() => dataRegistry.setPackColor(pack.id, undefined)}
                              className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent"
                              title="Clear pack color"
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                        className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent"
                      >{isExpanded ? 'Hide' : 'Preview'}</button>
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
                    <p className="text-[10px] text-muted-foreground mb-1 ml-10">{pack.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 ml-10">
                    {nonZeroCounts.map(([key, count]) => (
                      <span key={key} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary capitalize">
                        {count} {key}
                      </span>
                    ))}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground">{totalItems} total</span>
                  </div>

                  {/* Content preview */}
                  {isExpanded && contents && (
                    <div className="mt-2 ml-10 space-y-2 border-t border-border/50 pt-2">
                      {contents.map(section => (
                        <div key={section.key}>
                          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{section.key}</p>
                          <div className="flex flex-wrap gap-1">
                            {section.items.map(item => (
                              <span key={item.id} className="rounded bg-secondary px-1.5 py-0.5 text-[9px]">
                                {item.name}{item.detail ? ` (${item.detail})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
