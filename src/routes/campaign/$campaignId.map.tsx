import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
// @ts-nocheck
import DungeonApp from '@/lib/dungeon-renderer/App.js'
import style from '@/lib/dungeon-renderer/Style.js'
import Blueprint from '@/lib/dungeon-renderer/Blueprint.js'

export const Route = createFileRoute('/campaign/$campaignId/map')({
  component: MapEditorPage,
})

function MapEditorPage() {
  const campaign = useCampaignStore(s => s.campaign)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [seed, setSeed] = useState(Math.floor(Math.random() * 2147483647))
  const [palette, setPalette] = useState('default')
  const [showGrid, setShowGrid] = useState(true)
  const [showSecrets, setShowSecrets] = useState(false)
  const [showWater, setShowWater] = useState(true)
  const [showProps, setShowProps] = useState(true)
  const [showNotes, setShowNotes] = useState(true)
  const [showConnectors, setShowConnectors] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [bwMode, setBwMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [title, setTitle] = useState('')

  // Initialize the dungeon app once the canvas is mounted
  const initApp = useCallback(async () => {
    if (!canvasRef.current || !containerRef.current) return
    if (appRef.current) return // already initialized

    setLoading(true)

    // Size the canvas to fill the container
    const rect = containerRef.current.getBoundingClientRect()
    canvasRef.current.style.width = rect.width + 'px'
    canvasRef.current.style.height = rect.height + 'px'

    // Apply style settings
    style.setPalette(palette)
    style.gridMode = showGrid ? 'dashed' : 'hidden'
    style.showSecrets = showSecrets

    const app = new DungeonApp(canvasRef.current, { seed })
    appRef.current = app

    try {
      await app.init()
      setGenerated(true)
      setTitle(app.dungeon?.story?.name || '')
    } catch (e) {
      console.error('Dungeon init failed:', e)
    }
    setLoading(false)
  }, [])

  // Handle window resize
  useEffect(() => {
    function handleResize() {
      if (!appRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      appRef.current.resize(rect.width, rect.height)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Generate new dungeon
  function handleGenerate() {
    if (!appRef.current) return
    appRef.current.blueprint = new Blueprint(seed, [])
    appRef.current.generate()
    setTitle(appRef.current.dungeon?.story?.name || '')
    setGenerated(true)
  }

  // Reroll seed and generate
  function handleReroll() {
    const newSeed = Math.floor(Math.random() * 2147483647)
    setSeed(newSeed)
    if (!appRef.current) return
    appRef.current.blueprint = new Blueprint(newSeed, [])
    appRef.current.generate()
    setTitle(appRef.current.dungeon?.story?.name || '')
  }

  // Update a single visual option and re-render
  function toggle(key: string, value: any) {
    const app = appRef.current
    if (!app) return
    switch (key) {
      case 'palette': setPalette(value); style.setPalette(value); break
      case 'grid': setShowGrid(value); style.gridMode = value ? 'dashed' : 'hidden'; break
      case 'secrets':
        setShowSecrets(value); style.showSecrets = value
        if (app.planner) {
          for (const r of app.planner.getSecrets()) r.hidden = !value
        }
        if (app.dungeon) app.dungeon.populateNotes()
        break
      case 'water': setShowWater(value); style.showWater = value; break
      case 'props': setShowProps(value); style.showProps = value; break
      case 'notes': setShowNotes(value); style.showNotes = value; break
      case 'connectors': setShowConnectors(value); style.showConnectors = value; break
      case 'autoRotate':
        setAutoRotate(value); style.autoRotate = value
        if (!value) style.rotation = 0
        break
      case 'bw': setBwMode(value); style.bw = value; break
    }
    style.save()
    app.draw()
  }

  // Export PNG
  function handleExportPNG() {
    if (!canvasRef.current) return
    const a = document.createElement('a')
    a.href = canvasRef.current.toDataURL('image/png')
    a.download = `${(title || 'dungeon').toLowerCase().replace(/\s+/g, '_')}.png`
    a.click()
  }

  // Export JSON
  function handleExportJSON() {
    if (!appRef.current?.dungeon) return
    const data = appRef.current.dungeon.getData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(title || 'dungeon').toLowerCase().replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Print
  function handlePrint() {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>${title || 'Dungeon'}</title>
      <style>@media print{body{margin:0}img{max-width:100%}}body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:white}img{max-width:95vw;max-height:95vh}</style>
      </head><body><img src="${dataUrl}"/><script>setTimeout(()=>window.print(),500)</script></body></html>`)
    win.document.close()
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Enter') { handleReroll(); e.preventDefault() }
      if (e.key === ' ') {
        // Re-roll notes only (same dungeon structure)
        if (appRef.current?.dungeon) {
          appRef.current.dungeon.populateNotes()
          appRef.current.renderer.noteOverrides.clear()
          appRef.current.draw()
        }
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!campaign) return null

  return (
    <main className="flex flex-col h-[calc(100vh-120px)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-card/50 px-3 py-1.5 text-xs">
        {/* Generation */}
        <div className="flex items-center gap-1">
          <input type="number" value={seed} onChange={e => setSeed(parseInt(e.target.value) || 0)}
            className="w-20 rounded border border-input bg-background px-1 py-0.5 text-center outline-none font-mono text-[10px]" />
          <button onClick={handleGenerate} disabled={loading}
            className="rounded bg-primary px-2 py-1 font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50">
            Generate
          </button>
          <button onClick={handleReroll} disabled={loading}
            className="rounded border border-border px-1.5 py-1 hover:bg-accent transition">
            New
          </button>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Palette */}
        <select value={palette} onChange={e => toggle('palette', e.target.value)}
          className="rounded border border-input bg-background px-1 py-0.5 outline-none text-[10px]">
          <option value="default">Default</option>
          <option value="ancient">Ancient</option>
          <option value="light">Light</option>
          <option value="modern">Modern</option>
          <option value="link">Link</option>
        </select>

        <div className="w-px h-4 bg-border" />

        {/* Toggles */}
        <label className="flex items-center gap-0.5 cursor-pointer" title="Grid (G)">
          <input type="checkbox" checked={showGrid} onChange={e => toggle('grid', e.target.checked)} className="rounded h-3 w-3" /><span>Grid</span>
        </label>
        <label className="flex items-center gap-0.5 cursor-pointer" title="Water (W)">
          <input type="checkbox" checked={showWater} onChange={e => toggle('water', e.target.checked)} className="rounded h-3 w-3" /><span>Water</span>
        </label>
        <label className="flex items-center gap-0.5 cursor-pointer" title="Props (P)">
          <input type="checkbox" checked={showProps} onChange={e => toggle('props', e.target.checked)} className="rounded h-3 w-3" /><span>Props</span>
        </label>
        <label className="flex items-center gap-0.5 cursor-pointer" title="Notes (N)">
          <input type="checkbox" checked={showNotes} onChange={e => toggle('notes', e.target.checked)} className="rounded h-3 w-3" /><span>Notes</span>
        </label>
        <label className="flex items-center gap-0.5 cursor-pointer" title="Secrets (H)">
          <input type="checkbox" checked={showSecrets} onChange={e => toggle('secrets', e.target.checked)} className="rounded h-3 w-3" /><span>Secrets</span>
        </label>
        <label className="flex items-center gap-0.5 cursor-pointer" title="Connectors (C)">
          <input type="checkbox" checked={showConnectors} onChange={e => toggle('connectors', e.target.checked)} className="rounded h-3 w-3" /><span>Lines</span>
        </label>
        <label className="flex items-center gap-0.5 cursor-pointer" title="Auto-rotate (R)">
          <input type="checkbox" checked={autoRotate} onChange={e => toggle('autoRotate', e.target.checked)} className="rounded h-3 w-3" /><span>Rotate</span>
        </label>
        <label className="flex items-center gap-0.5 cursor-pointer" title="B&W mode (M)">
          <input type="checkbox" checked={bwMode} onChange={e => toggle('bw', e.target.checked)} className="rounded h-3 w-3" /><span>B&W</span>
        </label>

        <div className="flex-1" />

        {/* Export */}
        {generated && (
          <div className="flex items-center gap-1">
            <button onClick={handleExportPNG} className="rounded border border-border px-1.5 py-0.5 hover:bg-accent transition">PNG</button>
            <button onClick={handleExportJSON} className="rounded border border-border px-1.5 py-0.5 hover:bg-accent transition">JSON</button>
            <button onClick={handlePrint} className="rounded border border-border px-1.5 py-0.5 hover:bg-accent transition">Print</button>
          </div>
        )}
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative bg-[#F8F8F4]">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onContextMenu={e => e.preventDefault()}
        />
        {!generated && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-semibold text-[#222022] mb-2">Dungeon Map Generator</p>
              <p className="text-sm text-[#222022]/60 mb-4">Generate a one-page dungeon with rooms, corridors, and notes</p>
              <button onClick={initApp} disabled={loading}
                className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
                Generate Dungeon
              </button>
              <p className="mt-3 text-xs text-muted-foreground">Press ENTER for new dungeon · SPACE to re-roll notes · Drag note boxes to reposition</p>
            </div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Generating...</p>
          </div>
        )}
      </div>
    </main>
  )
}
