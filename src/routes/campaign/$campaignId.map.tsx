import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { createEmptyMap } from '@/lib/campaign/defaults.ts'
import { generateId } from '@/lib/utils/id.ts'
import { openPrintExport, openGMPrint, PAPER_SIZES } from '@/lib/dungeon-renderer/print-export.ts'
import type { PrintOptions, GMPrintOptions } from '@/lib/dungeon-renderer/print-export.ts'
// @ts-nocheck
import DungeonApp from '@/lib/dungeon-renderer/App.js'
import style from '@/lib/dungeon-renderer/Style.js'
import Blueprint from '@/lib/dungeon-renderer/Blueprint.js'

export const Route = createFileRoute('/campaign/$campaignId/map')({
  component: MapEditorPage,
})

const DOOR_TYPES = [
  { value: 0, label: 'Regular' },
  { value: 1, label: 'Archway' },
  { value: 2, label: 'Secret' },
  { value: 3, label: 'Entrance' },
  { value: 4, label: 'Locked' },
  { value: 5, label: 'Boss Gate' },
  { value: 7, label: 'Barred' },
  { value: 8, label: 'Stairs Down' },
  { value: 9, label: 'Steps' },
]

const PROP_TYPES = ['altar', 'barrel', 'boulder', 'box', 'chest', 'dais', 'smalldais', 'fountain', 'sarcophagus', 'statue', 'throne', 'well']

// ── Drag-to-reorder Props List (native HTML5 drag) ──

function SortablePropsList({ props, selectedProp, onSelect, onReorder }: { props: any[]; selectedProp: any; onSelect: (p: any) => void; onReorder: (from: number, to: number) => void }) {
  const dragIdx = useRef<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  return (
    <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
      {props.map((prop: any, i: number) => (
        <div key={i}
          draggable
          onDragStart={() => { dragIdx.current = i }}
          onDragOver={e => { e.preventDefault(); setOverIdx(i) }}
          onDragLeave={() => { if (overIdx === i) setOverIdx(null) }}
          onDrop={e => { e.preventDefault(); if (dragIdx.current !== null && dragIdx.current !== i) onReorder(dragIdx.current, i); dragIdx.current = null; setOverIdx(null) }}
          onDragEnd={() => { dragIdx.current = null; setOverIdx(null) }}
          onClick={() => onSelect(prop)}
          className={`flex items-center justify-between rounded border px-1.5 py-0.5 text-[10px] cursor-pointer transition ${
            selectedProp === prop ? 'border-primary bg-primary/10 text-primary'
            : overIdx === i ? 'border-primary/50 bg-primary/5'
            : 'border-border/50 hover:bg-accent'
          }`}>
          <div className="flex items-center gap-1">
            <span className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground select-none">⠿</span>
            <span className="capitalize font-medium">{prop.type}</span>
          </div>
          <span className="text-muted-foreground">s:{(prop.scale ?? 0.6).toFixed(1)} r:{Math.round((prop.rotation ?? 0) * 180 / Math.PI)}°</span>
        </div>
      ))}
    </div>
  )
}

function MapEditorPage() {
  const campaign = useCampaignStore(s => s.campaign)
  const addMap = useCampaignStore(s => s.addMap)
  const updateMap = useCampaignStore(s => s.updateMap)
  const removeMap = useCampaignStore(s => s.removeMap)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Generation state
  const [seed, setSeed] = useState(Math.floor(Math.random() * 2147483647))
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  // Current map tracking
  const [currentMapId, setCurrentMapId] = useState<string | null>(null)

  // Print settings
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [showGMPrintDialog, setShowGMPrintDialog] = useState(false)
  const [gmPrintSettings, setGMPrintSettings] = useState<GMPrintOptions>({
    paperSize: 'letter', orientation: 'landscape', margin: 0.5,
    showConnectors: true, showSecrets: true, bw: false,
  })
  const [printSettings, setPrintSettings] = useState<PrintOptions>({
    paperSize: 'letter', orientation: 'portrait', gridScale: 0.5, margin: 0.5, title: '',
  })

  // Visual toggles
  const [toggles, setToggles] = useState({
    title: true, grid: true, water: true, props: true,
    notes: true, secrets: false, connectors: false,
    autoRotate: false, bw: false,
  })
  const [palette, setPalette] = useState('default')

  // Editor state
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [selectedDoor, setSelectedDoor] = useState<any>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingStory, setEditingStory] = useState('')
  const [editorPanel, setEditorPanel] = useState<'none' | 'room' | 'door' | 'dungeon' | 'maps'>('none')
  const [placingProp, setPlacingProp] = useState<string | null>(null)
  const repositioningProp = false // kept for cursor logic
  const [selectedProp, setSelectedProp] = useState<any>(null)
  const [propScale, setPropScale] = useState(0.6)
  const [propRotation, setPropRotation] = useState(0)
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  // Clear selection without closing persistent panels (dungeon info, maps)
  const clearSelection = () => {
    setSelectedRoom(null); setSelectedDoor(null); setSelectedProp(null)
    if (editorPanel === 'room' || editorPanel === 'door') setEditorPanel('none')
  }

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1)
  const prevZoomRef = useRef(1)
  const [panMode, setPanMode] = useState(false)
  const isPanningRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<'select' | 'drawRoom' | 'path' | 'eraser'>('select')
  const [drawStart, setDrawStart] = useState<{ gx: number, gy: number } | null>(null)
  const [drawEnd, setDrawEnd] = useState<{ gx: number, gy: number } | null>(null)
  const [drawPreview, setDrawPreview] = useState<{ left: number, top: number, width: number, height: number, rotation: number } | null>(null)

  // Path tool state
  const [pathPoints, setPathPoints] = useState<{ gx: number, gy: number }[]>([])
  const [pathCursor, setPathCursor] = useState<{ gx: number, gy: number } | null>(null)

  // Init app
  const initApp = useCallback(async () => {
    if (!canvasRef.current || !containerRef.current) return
    if (appRef.current) return
    setLoading(true)
    // Sync Style defaults before first render
    style.autoRotate = false
    style.rotation = 0
    style.showConnectors = false
    const rect = containerRef.current.getBoundingClientRect()
    canvasRef.current.style.width = rect.width + 'px'
    canvasRef.current.style.height = rect.height + 'px'
    const app = new DungeonApp(canvasRef.current, { seed })
    appRef.current = app
    try {
      await app.init()
      setGenerated(true)
      setEditingTitle(app.dungeon?.story?.name || '')
      setEditingStory(app.dungeon?.story?.hook || '')
    } catch (e) { console.error('Init failed:', e) }
    setLoading(false)
  }, [])

  // Auto-load latest saved dungeon map on mount (skip grid-only maps)
  const autoLoaded = useRef(false)
  useEffect(() => {
    if (autoLoaded.current || !campaign) return
    autoLoaded.current = true

    const dungeonMaps = campaign.maps.filter(m => m.dungeonData)
    if (dungeonMaps.length > 0) {
      const latest = [...dungeonMaps].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
      handleLoadMap(latest.id)
    } else if (campaign.maps.length > 0) {
      // Has maps but no dungeon maps — show maps panel
      setEditorPanel('maps')
    }
    // No maps at all — show empty state with Generate button
  }, [campaign])

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (!appRef.current || !containerRef.current || !canvasRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = rect.width * zoom
      const h = rect.height * zoom
      const canvas = canvasRef.current
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      appRef.current.renderer.noteOverrides.clear()
      appRef.current.draw()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [zoom])

  // Re-render at zoom resolution (debounced)
  useEffect(() => {
    if (!appRef.current || !containerRef.current || !canvasRef.current || !generated) return
    const timer = setTimeout(() => {
      const rect = containerRef.current!.getBoundingClientRect()
      const scroller = scrollContainerRef.current!
      const canvas = canvasRef.current!
      const dpr = window.devicePixelRatio || 1
      const prevZ = prevZoomRef.current
      const w = rect.width * zoom
      const h = rect.height * zoom

      // Compute center point in map-space before resize
      const centerX = (scroller.scrollLeft + rect.width / 2) / (rect.width * prevZ)
      const centerY = (scroller.scrollTop + rect.height / 2) / (rect.height * prevZ)

      // Set canvas backing store and CSS size directly (don't call _resize — it reads parent size and overrides zoom)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      appRef.current!.draw()

      // Adjust scroll to keep the same center point
      scroller.scrollLeft = centerX * w - rect.width / 2
      scroller.scrollTop = centerY * h - rect.height / 2

      prevZoomRef.current = zoom
    }, 100)
    return () => clearTimeout(timer)
  }, [zoom, generated])

  // New dungeon (random seed)
  async function handleNew() {
    const newSeed = Math.floor(Math.random() * 2147483647)
    setSeed(newSeed)
    generateFromSeed(newSeed)
  }

  // Load dungeon from specific seed
  function loadSeed() {
    generateFromSeed(seed)
  }

  async function generateFromSeed(s: number) {
    if (!appRef.current) { await initApp(); return }
    appRef.current.pushUndo()
    appRef.current._resize()
    appRef.current.blueprint = new Blueprint(s, [])
    appRef.current.renderer.noteOverrides.clear()
    appRef.current.generate()
    setEditingTitle(appRef.current.dungeon?.story?.name || '')
    setEditingStory(appRef.current.dungeon?.story?.hook || '')
    clearSelection()
    setGenerated(true)
  }

  // Toggle visual option
  function toggle(key: string) {
    const app = appRef.current; if (!app) return
    const newVal = !(toggles as any)[key]
    setToggles(prev => ({ ...prev, [key]: newVal }))
    switch (key) {
      case 'title': style.showTitle = newVal; break
      case 'grid': style.gridMode = newVal ? 'dashed' : 'hidden'; break
      case 'water': style.showWater = newVal; break
      case 'props': style.showProps = newVal; break
      case 'notes': style.showNotes = newVal; break
      case 'secrets':
        style.showSecrets = newVal
        if (app.planner) for (const r of app.planner.getSecrets()) r.hidden = !newVal
        if (app.dungeon) app.dungeon.populateNotes()
        break
      case 'connectors': style.showConnectors = newVal; break
      case 'autoRotate': style.autoRotate = newVal; if (!newVal) style.rotation = 0; break
      case 'bw': style.bw = newVal; break
    }
    style.save(); app.draw()
  }

  // Convert mouse event to grid coordinates
  function eventToGrid(e: React.MouseEvent) {
    const app = appRef.current; if (!app) return null
    const rect = canvasRef.current!.getBoundingClientRect()
    return app.cssToGrid(e.clientX - rect.left, e.clientY - rect.top)
  }

  // Canvas click — select tool interactions
  function handleCanvasClick(e: React.MouseEvent) {
    const app = appRef.current; if (!app) return
    const grid = eventToGrid(e)
    if (!grid) return

    // Path tool — click to add waypoints, double-click to finish
    if (activeTool === 'path') {
      setPathPoints(prev => [...prev, { gx: grid.gx, gy: grid.gy }])
      return
    }

    // Eraser tool — click to delete room or door
    if (activeTool === 'eraser') {
      const door = app.findDoorAt(grid.gx, grid.gy)
      if (door) { app.removeDoor(door); refresh(); return }
      const room = app.findRoomAt(grid.gx, grid.gy)
      if (room) { app.removeEditorRoom(room); refresh(); return }
      return
    }

    // Prop placement mode — place at clicked grid position
    if (placingProp && selectedRoom) {
      const newProp = app.addRoomProp(selectedRoom, placingProp, grid.gx - selectedRoom.x + 0.5, grid.gy - selectedRoom.y + 0.5, propScale, propRotation)
      setPlacingProp(null)
      setSelectedProp(newProp)
      setPropScale(newProp.scale)
      setPropRotation(newProp.rotation)
      refresh()
      return
    }

    // Reposition mode — move selected prop to clicked position
    if (repositioningProp && selectedProp && selectedRoom) {
      app.updateProp(selectedProp, { x: grid.gx + 0.5, y: grid.gy + 0.5 })
           refresh()
      return
    }

    // If a room is selected, check if clicking a prop within it
    if (selectedRoom) {
      const prop = app.findPropAt(selectedRoom, grid.gx + 0.5, grid.gy + 0.5)
      if (prop) {
        setSelectedProp(prop)
        setPropScale(prop.scale ?? 0.6)
        setPropRotation(prop.axis ? Math.atan2(prop.axis.y, prop.axis.x) : (prop.rotation ?? 0))
        return
      }
    }

    // Check door first
    const door = app.findDoorAt(grid.gx, grid.gy)
    if (door) {
      setSelectedDoor(door); setSelectedRoom(null); setSelectedProp(null); setEditorPanel('door'); setPlacingProp(null);
      return
    }
    const room = app.findRoomAt(grid.gx, grid.gy)
    if (room) {
      setSelectedRoom(room); setSelectedDoor(null); setSelectedProp(null); setEditorPanel('room'); setPlacingProp(null);
      return
    }
    clearSelection(); setPlacingProp(null);
  }

  // Compute draw preview rectangle in CSS coordinates
  function updateDrawPreview(start: { gx: number, gy: number }, end: { gx: number, gy: number }) {
    const app = appRef.current; if (!app) { setDrawPreview(null); return }
    const x1 = Math.min(start.gx, end.gx)
    const y1 = Math.min(start.gy, end.gy)
    const x2 = Math.max(start.gx, end.gx) + 1
    const y2 = Math.max(start.gy, end.gy) + 1
    const topLeft = app.gridToCSS(x1, y1)
    const botRight = app.gridToCSS(x2, y2)
    if (!topLeft || !botRight) { setDrawPreview(null); return }
    const rotation = app.getRotation()
    // Compute rotated width/height using cell size
    const cellCSS = app.getGridCellCSS()
    const w = (x2 - x1) * cellCSS
    const h = (y2 - y1) * cellCSS
    setDrawPreview({ left: topLeft.cssX, top: topLeft.cssY, width: w, height: h, rotation })
  }

  // Draw room tool — mousedown starts, mousemove updates preview, mouseup finalizes
  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (activeTool !== 'drawRoom' || e.button !== 0) return
    const grid = eventToGrid(e)
    if (!grid) return
    setDrawStart(grid)
    setDrawEnd(grid)
    updateDrawPreview(grid, grid)
  }
  function handleCanvasMouseMove(e: React.MouseEvent) {
    // Path cursor tracking
    if (activeTool === 'path' && pathPoints.length > 0) {
      const grid = eventToGrid(e)
      if (grid) setPathCursor(grid)
    }
    if (activeTool !== 'drawRoom' || !drawStart) return
    const grid = eventToGrid(e)
    if (grid) {
      setDrawEnd(grid)
      updateDrawPreview(drawStart, grid)
    }
  }
  function handleCanvasMouseUp(e: React.MouseEvent) {
    if (activeTool !== 'drawRoom' || !drawStart || !drawEnd) return
    const app = appRef.current; if (!app) return
    const x1 = Math.min(drawStart.gx, drawEnd.gx)
    const y1 = Math.min(drawStart.gy, drawEnd.gy)
    const x2 = Math.max(drawStart.gx, drawEnd.gx)
    const y2 = Math.max(drawStart.gy, drawEnd.gy)
    const w = x2 - x1 + 1
    const h = y2 - y1 + 1
    if (w >= 3 && h >= 3) {
      const room = app.addRoom(x1, y1, w, h)
      if (room) {
        setSelectedRoom(room); setEditorPanel('room')
      }
    }
    setDrawStart(null); setDrawEnd(null); setDrawPreview(null)
  }

  // Path tool — finalize on double-click or Enter
  function finalizePath(_e?: React.MouseEvent) {
    const app = appRef.current; if (!app) return
    if (pathPoints.length < 2) { setPathPoints([]); setPathCursor(null); return }
    app.createPath(pathPoints.map(p => ({ x: p.gx, y: p.gy })))
    setPathPoints([]); setPathCursor(null)
  }

  // Convert a grid point to CSS coordinates for the path overlay
  function gridPointToCSS(gx: number, gy: number) {
    const app = appRef.current; if (!app) return null
    return app.gridToCSS(gx + 0.5, gy + 0.5) // center of cell
  }

  // Save current dungeon to campaign maps
  function handleSave() {
    const app = appRef.current; if (!app || !campaign) return
    const data = app.serialize()
    if (!data) return
    const mapName = editingTitle || 'Untitled Map'

    if (currentMapId) {
      // Update existing map
      updateMap(currentMapId, m => {
        m.name = mapName
        m.seed = seed
        m.updatedAt = Date.now()
        m.dungeonData = data
      })
    } else {
      // Save as new map
      const newMap = createEmptyMap(mapName, seed)
      newMap.dungeonData = data
      addMap(newMap)
      setCurrentMapId(newMap.id)
    }
  }

  // Load a saved map
  async function handleLoadMap(mapId: string) {
    const map = campaign?.maps.find(m => m.id === mapId)
    if (!map) return
    if (!map.dungeonData) {
      // Legacy grid-only map — skip (no longer supported)
      return
    }

    // Dungeon map — load in dungeon renderer
    if (!appRef.current) {
      await initApp()
    }
    if (!appRef.current) return

    setSeed(map.seed ?? 0)
    appRef.current.loadFromSave(map.dungeonData)
    setCurrentMapId(map.id)
    setEditingTitle(appRef.current.dungeon?.story?.name || map.name)
    setEditingStory(appRef.current.dungeon?.story?.hook || '')
    clearSelection()
    setGenerated(true)
    refresh()
  }

  // Delete a saved map
  function handleDeleteMap(mapId: string) {
    removeMap(mapId)
    if (currentMapId === mapId) setCurrentMapId(null)
  }

  // Export
  function exportPNG() {
    if (!canvasRef.current) return
    const a = document.createElement('a'); a.href = canvasRef.current.toDataURL('image/png')
    a.download = `${(editingTitle || 'dungeon').toLowerCase().replace(/\s+/g, '_')}.png`; a.click()
  }
  function exportJSON() {
    const data = appRef.current?.getData(); if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${(editingTitle || 'dungeon').toLowerCase().replace(/\s+/g, '_')}.json`; a.click()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Undo: Ctrl/Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        if (appRef.current?.undo()) {
          clearSelection()
          setEditingTitle(appRef.current.dungeon?.story?.name || '')
          setEditingStory(appRef.current.dungeon?.story?.hook || '')
          refresh()
        }
        return
      }
      // Redo: Ctrl/Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (appRef.current?.redo()) {
          clearSelection()
          setEditingTitle(appRef.current.dungeon?.story?.name || '')
          setEditingStory(appRef.current.dungeon?.story?.hook || '')
          refresh()
        }
        return
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Enter' && activeTool === 'path' && pathPoints.length >= 2) { e.preventDefault(); finalizePath(); return }
      if (e.key === 'Backspace' && activeTool === 'path' && pathPoints.length > 0) { e.preventDefault(); setPathPoints(prev => prev.slice(0, -1)); return }
      if (e.key === 'Escape') { setEditorPanel('none'); setSelectedRoom(null); setSelectedDoor(null); setActiveTool('select'); setPathPoints([]); setPathCursor(null); setDrawStart(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Alt+Scroll zoom — native listener with { passive: false } so preventDefault stops scrolling
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.altKey) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      setZoom(z => Math.max(0.5, Math.min(5, z + delta * z)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  if (!campaign) return null

  const inputCls = "w-full rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"

  return (
    <main className="flex flex-col h-[calc(100vh-120px)]">
      {/* Toolbar */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-3 py-1.5">
        <div className="flex items-center gap-2">
          <button onClick={handleNew} disabled={loading}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50">
            {loading ? '...' : 'New'}
          </button>
          <input type="number" value={seed} onChange={e => setSeed(parseInt(e.target.value) || 0)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); loadSeed() } }}
            className="w-28 rounded-lg border border-input bg-background px-2 py-1 text-[10px] text-center outline-none font-mono" title="Seed — press Load or Enter to generate" />
          <button onClick={loadSeed} disabled={loading}
            className="rounded-lg border border-border px-2 py-1.5 text-[10px] font-medium hover:bg-accent transition disabled:opacity-50">
            Load
          </button>

          <div className="w-px h-5 bg-border" />

          <select value={palette} onChange={e => { setPalette(e.target.value); style.setPalette(e.target.value); style.save(); appRef.current?.draw() }}
            className="rounded-lg border border-input bg-background px-1.5 py-1 text-xs outline-none">
            <option value="default">Default</option>
            <option value="ancient">Ancient</option>
            <option value="light">Light</option>
            <option value="modern">Modern</option>
            <option value="link">Link</option>
          </select>

          <div className="flex gap-0.5 flex-wrap">
            {Object.entries(toggles).map(([key, val]) => (
              <button key={key} onClick={() => toggle(key)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition capitalize ${
                  val ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-transparent hover:text-foreground'
                }`}>
                {key === 'autoRotate' ? 'Rotate' : key === 'bw' ? 'B&W' : key}
              </button>
            ))}
          </div>

          {generated && toggles.water && (
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-muted-foreground">Water:</span>
              <input type="range" min={0} max={1} step={0.1}
                defaultValue={0}
                onChange={e => {
                  const level = parseFloat(e.target.value)
                  appRef.current?.setWaterLevel(level)
                }}
                className="w-16 accent-primary" />
            </div>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <button onClick={() => setEditorPanel(editorPanel === 'maps' ? 'none' : 'maps')}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${editorPanel === 'maps' ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-border hover:bg-accent'}`}>
              Maps {campaign?.maps.length ? `(${campaign.maps.length})` : ''}
            </button>
            {generated && (
              <>
                <button onClick={() => setEditorPanel(editorPanel === 'dungeon' ? 'none' : 'dungeon')}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition ${editorPanel === 'dungeon' ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-border hover:bg-accent'}`}>
                  Edit Info
                </button>
                <button onClick={handleSave} className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition">
                  {currentMapId ? 'Save' : 'Save As New'}
                </button>
                <button onClick={exportPNG} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">PNG</button>
                <button onClick={exportJSON} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">JSON</button>
                <button onClick={() => { setPrintSettings(p => ({ ...p, title: editingTitle || 'Dungeon Map' })); setShowPrintDialog(true) }}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">Print</button>
                <button onClick={() => setShowGMPrintDialog(true)}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">GM Print</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area — dungeon canvas */}
        <div ref={containerRef} className="flex-1 relative bg-[#F8F8F4]">
          <div ref={scrollContainerRef} className="absolute inset-0 overflow-auto"
            onMouseDown={e => {
              if (panMode || e.button === 1 || (e.button === 0 && e.altKey)) {
                isPanningRef.current = true
                e.preventDefault()
                return
              }
              handleCanvasMouseDown(e)
            }}
            onMouseMove={e => {
              if (isPanningRef.current && scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft -= e.movementX
                scrollContainerRef.current.scrollTop -= e.movementY
                return
              }
              handleCanvasMouseMove(e)
            }}
            onMouseUp={e => {
              isPanningRef.current = false
              handleCanvasMouseUp(e)
            }}
            onMouseLeave={() => { isPanningRef.current = false }}
            style={{ cursor: panMode ? (isPanningRef.current ? 'grabbing' : 'grab')
              : activeTool === 'drawRoom' ? 'crosshair'
              : activeTool === 'path' ? 'crosshair'
              : activeTool === 'eraser' ? 'pointer'
              : (placingProp || repositioningProp) ? 'crosshair' : 'default' }}
          >
            <canvas ref={canvasRef} onContextMenu={e => e.preventDefault()}
              onClick={e => { if (!panMode) handleCanvasClick(e) }}
              onDoubleClick={e => { if (activeTool === 'path') finalizePath(e) }} />
            {/* Draw room preview overlay */}
            {drawPreview && drawStart && drawEnd && (
              <div className="pointer-events-none absolute" style={{
                left: drawPreview.left + 'px', top: drawPreview.top + 'px',
                width: drawPreview.width + 'px', height: drawPreview.height + 'px',
                transform: `rotate(${drawPreview.rotation}rad)`, transformOrigin: '0 0',
                border: '2px dashed',
                borderColor: (Math.abs(drawEnd.gx - drawStart.gx) + 1 >= 3 && Math.abs(drawEnd.gy - drawStart.gy) + 1 >= 3)
                  ? 'hsl(var(--primary))' : 'hsl(0 60% 50%)',
                backgroundColor: (Math.abs(drawEnd.gx - drawStart.gx) + 1 >= 3 && Math.abs(drawEnd.gy - drawStart.gy) + 1 >= 3)
                  ? 'hsla(var(--primary) / 0.1)' : 'hsla(0 60% 50% / 0.1)',
                borderRadius: '4px',
              }}>
                <span className="absolute -top-5 left-1 text-[10px] font-semibold px-1 rounded"
                  style={{ color: (Math.abs(drawEnd.gx - drawStart.gx) + 1 >= 3 && Math.abs(drawEnd.gy - drawStart.gy) + 1 >= 3)
                    ? 'hsl(var(--primary))' : 'hsl(0 60% 50%)',
                    backgroundColor: 'hsl(var(--card) / 0.9)' }}>
                  {Math.abs(drawEnd.gx - drawStart.gx) + 1} × {Math.abs(drawEnd.gy - drawStart.gy) + 1}
                </span>
              </div>
            )}
            {/* Path tool preview overlay */}
            {activeTool === 'path' && pathPoints.length > 0 && (() => {
              const allPts = [...pathPoints, ...(pathCursor ? [pathCursor] : [])]
              // Expand to axis-aligned segments with corners
              const expanded: { gx: number, gy: number }[] = []
              for (let i = 0; i < allPts.length; i++) {
                expanded.push(allPts[i])
                if (i < allPts.length - 1) {
                  const a = allPts[i], b = allPts[i + 1]
                  if (a.gx !== b.gx && a.gy !== b.gy) expanded.push({ gx: b.gx, gy: a.gy })
                }
              }
              const cssPoints = expanded.map(p => gridPointToCSS(p.gx, p.gy)).filter(Boolean) as { cssX: number, cssY: number }[]
              if (cssPoints.length < 1) return null
              const dotPoints = allPts.map(p => gridPointToCSS(p.gx, p.gy)).filter(Boolean) as { cssX: number, cssY: number }[]
              return (
                <svg className="pointer-events-none absolute inset-0" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Path lines */}
                  {cssPoints.length >= 2 && (
                    <polyline
                      points={cssPoints.map(p => `${p.cssX},${p.cssY}`).join(' ')}
                      fill="none" stroke="#EAB308" strokeWidth="3" strokeDasharray={pathCursor ? '6 3' : 'none'}
                      strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {/* Waypoint dots */}
                  {dotPoints.map((p, i) => {
                    const isStart = i === 0
                    const isEnd = i === dotPoints.length - 1 && !pathCursor
                    const isCursor = pathCursor && i === dotPoints.length - 1
                    return (
                      <circle key={i} cx={p.cssX} cy={p.cssY}
                        r={isStart ? 5 : 4}
                        fill={isCursor ? 'transparent' : isStart ? '#22C55E' : isEnd ? '#EF4444' : '#22D3EE'}
                        stroke={isCursor ? '#EAB308' : 'white'} strokeWidth={isCursor ? 2 : 1.5} />
                    )
                  })}
                </svg>
              )
            })()}
          </div>

          {/* Floating toolbar */}
          {generated && (
            <div className="absolute left-3 top-3 flex flex-col gap-1 rounded-xl border border-border bg-card/90 backdrop-blur-sm p-1.5 shadow-lg z-10">
              {/* Tool selection */}
              <button onClick={() => { setActiveTool('select'); setDrawStart(null); setPathPoints([]); setPathCursor(null) }} title="Select (click rooms/doors)"
                className={`rounded-lg w-8 h-8 flex items-center justify-center text-sm transition ${activeTool === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1l5.5 14 2.2-5.3L14 7.5z"/></svg>
              </button>
              <button onClick={() => { setActiveTool('drawRoom'); setPanMode(false); setPathPoints([]); setPathCursor(null) }} title="Draw room (click and drag)"
                className={`rounded-lg w-8 h-8 flex items-center justify-center text-xs font-bold transition ${activeTool === 'drawRoom' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="1"/></svg>
              </button>
              <button onClick={() => { setActiveTool('path'); setPanMode(false); setDrawStart(null); setPathPoints([]); setPathCursor(null) }} title="Path tool (click waypoints, Enter/double-click to finish)"
                className={`rounded-lg w-8 h-8 flex items-center justify-center text-xs transition ${activeTool === 'path' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,12 2,4 8,4 8,10 14,10"/><circle cx="2" cy="12" r="1.5" fill="currentColor"/><circle cx="14" cy="10" r="1.5" fill="currentColor"/></svg>
              </button>
              <button onClick={() => { setActiveTool('eraser'); setPanMode(false); setDrawStart(null); setPathPoints([]); setPathCursor(null) }} title="Eraser (click rooms/doors to delete)"
                className={`rounded-lg w-8 h-8 flex items-center justify-center text-xs transition ${activeTool === 'eraser' ? 'bg-red-500 text-white' : 'hover:bg-accent'}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 14h12M4.5 11.5L11 5l-2-2L2.5 9.5 4.5 11.5z"/><path d="M11 5l2.5-2.5-2-2L9 3"/></svg>
              </button>
              <div className="w-full h-px bg-border" />
              {/* Zoom controls */}
              <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} title="Zoom in"
                className="rounded-lg w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-accent transition">+</button>
              <button onClick={() => setZoom(1)} title="Reset zoom"
                className="rounded-lg w-8 h-8 flex items-center justify-center text-[9px] font-medium hover:bg-accent transition">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} title="Zoom out"
                className="rounded-lg w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-accent transition">−</button>
              <div className="w-full h-px bg-border" />
              <button onClick={() => { setPanMode(!panMode); if (!panMode) setActiveTool('select') }} title="Pan mode (hold to drag)"
                className={`rounded-lg w-8 h-8 flex items-center justify-center text-sm transition ${panMode ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                ✋
              </button>
            </div>
          )}

          {/* Tool status indicator */}
          {activeTool === 'path' && (
            <div className="absolute left-14 top-3 rounded-lg border border-primary/40 bg-card/90 backdrop-blur-sm px-3 py-1.5 text-[10px] font-medium z-10">
              {pathPoints.length === 0
                ? <span className="text-muted-foreground">Click to place start point</span>
                : <span className="text-primary">{pathPoints.length} point{pathPoints.length > 1 ? 's' : ''} — Enter or double-click to finish · Backspace to undo point</span>}
            </div>
          )}
          {activeTool === 'eraser' && (
            <div className="absolute left-14 top-3 rounded-lg border border-red-500/40 bg-card/90 backdrop-blur-sm px-3 py-1.5 text-[10px] font-medium text-red-400 z-10">
              Click a room or door to delete it
            </div>
          )}

          {!generated && !loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-lg font-semibold text-[#222022] mb-2">Dungeon Map</p>
                <p className="text-sm text-[#222022]/60 mb-4">Generate and edit a one-page dungeon</p>
                <button onClick={initApp} className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
                  Generate
                </button>
                <p className="mt-3 text-[10px] text-muted-foreground">Alt+Scroll to zoom · ✋ button or Alt+drag to pan</p>
              </div>
            </div>
          )}
        </div>

        {/* Editor Panel (right sidebar) */}
        {editorPanel !== 'none' && (generated || editorPanel === 'maps') && (
          <div className="w-72 border-l border-border bg-card overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editorPanel === 'dungeon' ? 'Dungeon Info' : editorPanel === 'room' ? 'Room' : editorPanel === 'maps' ? 'Saved Maps' : 'Door'}
              </h3>
              <button onClick={() => { setEditorPanel('none'); setSelectedRoom(null); setSelectedDoor(null) }}
                className="text-xs text-muted-foreground hover:text-foreground">&times;</button>
            </div>

            {/* Dungeon info editor */}
            {editorPanel === 'dungeon' && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Title</label>
                  <input value={editingTitle} onFocus={() => appRef.current?.pushUndo()}
                    onChange={e => { setEditingTitle(e.target.value); appRef.current?.setTitle(e.target.value) }}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Story Hook</label>
                  <textarea value={editingStory} onFocus={() => appRef.current?.pushUndo()}
                    onChange={e => { setEditingStory(e.target.value); appRef.current?.setStoryHook(e.target.value) }}
                    rows={4} className={inputCls + " resize-y"} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Font Sizes</label>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Title', key: 'fontTitle' },
                      { label: 'Story', key: 'fontStory' },
                      { label: 'Notes', key: 'fontNotes' },
                    ].map(({ label, key }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground w-10">{label}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { (style as any)[key].size = Math.max(8, (style as any)[key].size - 2); appRef.current?.draw(); refresh() }}
                            className="rounded w-5 h-5 flex items-center justify-center text-[10px] border border-border hover:bg-accent transition">−</button>
                          <span className="text-[10px] font-mono w-6 text-center">{(style as any)[key]?.size}</span>
                          <button onClick={() => { (style as any)[key].size = Math.min(96, (style as any)[key].size + 2); appRef.current?.draw(); refresh() }}
                            className="rounded w-5 h-5 flex items-center justify-center text-[10px] border border-border hover:bg-accent transition">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Rooms</label>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {appRef.current?.getVisibleRooms()?.filter((room: any) => room.note || room.desc || (room.w > 3 && room.h > 3)).map((room: any, i: number) => (
                      <button key={i} onClick={() => { setSelectedRoom(room); setSelectedDoor(null); setEditorPanel('room') }}
                        className="w-full text-left rounded-lg border border-border/50 px-2 py-1 text-[11px] hover:bg-accent transition">
                        <span className="font-medium">{room.note?.symb ? `Room ${room.note.symb}` : `Room ${i + 1}`}</span>
                        <span className="text-muted-foreground ml-1">({room.w}×{room.h})</span>
                        {(room.desc || room.note?.text) && <p className="text-[10px] text-muted-foreground truncate">{room.desc || room.note?.text}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Room editor */}
            {editorPanel === 'room' && selectedRoom && (
              <>
                <div className="text-xs text-muted-foreground">
                  Position: ({selectedRoom.x}, {selectedRoom.y}) · Size: {selectedRoom.w}×{selectedRoom.h}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Description</label>
                  <textarea value={selectedRoom.desc || selectedRoom.note?.text || ''} onFocus={() => appRef.current?.pushUndo()}
                    onChange={e => {
                      const val = e.target.value
                      selectedRoom.desc = val
                      if (selectedRoom.note) selectedRoom.note.text = val
                      appRef.current?.draw()
                      refresh()
                      // Auto-save to campaign store
                      if (currentMapId) handleSave()
                    }}
                    rows={3} placeholder="Room description..." className={inputCls + " resize-y"} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Shape</label>
                  <div className="flex gap-1">
                    <button onClick={() => { appRef.current?.toggleRoom(selectedRoom, 'round'); refresh() }}
                      className={`rounded-full px-2 py-0.5 text-[10px] transition ${selectedRoom.round ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-transparent'}`}>
                      Round
                    </button>
                    <button onClick={() => { appRef.current?.toggleRoom(selectedRoom, 'columns'); refresh() }}
                      className={`rounded-full px-2 py-0.5 text-[10px] transition ${selectedRoom.columns ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-transparent'}`}>
                      Columns
                    </button>
                    <button onClick={() => { appRef.current?.toggleRoom(selectedRoom, 'hidden'); refresh() }}
                      className={`rounded-full px-2 py-0.5 text-[10px] transition ${selectedRoom.hidden ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-secondary text-muted-foreground border border-transparent'}`}>
                      Hidden
                    </button>
                  </div>
                </div>
                {/* Props management */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Props ({selectedRoom.props?.length || 0})</label>
                    <button onClick={() => { appRef.current?.clearRoomProps(selectedRoom); setSelectedProp(null); refresh() }}
                      className="text-[10px] text-red-400 hover:underline">Clear All</button>
                  </div>

                  {/* Sortable props list — drag to reorder, order = z-index */}
                  {selectedRoom.props?.length > 0 && (
                    <SortablePropsList
                      props={selectedRoom.props}
                      selectedProp={selectedProp}
                      onSelect={(prop: any) => { setSelectedProp(prop); setPropScale(prop.scale ?? 0.6); setPropRotation(prop.axis ? Math.atan2(prop.axis.y, prop.axis.x) : (prop.rotation ?? 0)); }}
                      onReorder={(from: number, to: number) => { appRef.current?.reorderProps(selectedRoom, from, to); refresh(); }}
                    />
                  )}

                  {/* Selected prop editor */}
                  {selectedProp && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 mb-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold capitalize">{selectedProp.type}</span>
                        <button onClick={() => { appRef.current?.removeProp(selectedRoom, selectedProp); setSelectedProp(null);; refresh() }}
                          className="text-[9px] text-red-400 hover:underline">Delete</button>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">Position</label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground">X</span>
                          <input type="number" step={0.5}
                            value={parseFloat((selectedProp.pos?.x ?? 0).toFixed(1))}
                            onFocus={() => appRef.current?.pushUndo()}
                            onChange={e => { const v = parseFloat(e.target.value) || 0; appRef.current?.updateProp(selectedProp, { x: v }); refresh() }}
                            className="w-14 rounded border border-input bg-background px-1.5 py-0.5 text-[10px] text-center outline-none focus:ring-1 focus:ring-ring" />
                          <span className="text-[9px] text-muted-foreground">Y</span>
                          <input type="number" step={0.5}
                            value={parseFloat((selectedProp.pos?.y ?? 0).toFixed(1))}
                            onFocus={() => appRef.current?.pushUndo()}
                            onChange={e => { const v = parseFloat(e.target.value) || 0; appRef.current?.updateProp(selectedProp, { y: v }); refresh() }}
                            className="w-14 rounded border border-input bg-background px-1.5 py-0.5 text-[10px] text-center outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">Scale: {propScale.toFixed(2)}</label>
                        <input type="range" min={0.1} max={3} step={0.05} value={propScale}
                          onPointerDown={() => appRef.current?.pushUndo()}
                          onChange={e => { const v = parseFloat(e.target.value); setPropScale(v); appRef.current?.updateProp(selectedProp, { scale: v }) }}
                          className="w-full accent-primary h-1" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">Rotation</label>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min={-360} max={360} step={1}
                            value={Math.round(propRotation * 180 / Math.PI)}
                            onFocus={() => appRef.current?.pushUndo()}
                            onChange={e => { const deg = Math.max(-360, Math.min(360, parseInt(e.target.value) || 0)); const v = deg * Math.PI / 180; setPropRotation(v); appRef.current?.updateProp(selectedProp, { rotation: v }) }}
                            className="w-14 rounded border border-input bg-background px-1.5 py-0.5 text-[10px] text-center outline-none focus:ring-1 focus:ring-ring" />
                          <span className="text-[9px] text-muted-foreground">°</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">Type</label>
                        <select value={selectedProp.type} onChange={e => { appRef.current?.updateProp(selectedProp, { type: e.target.value }); refresh() }}
                          className="w-full rounded border border-input bg-background px-1 py-0.5 text-[10px] outline-none capitalize">
                          {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Place new prop */}
                  {placingProp && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-1 mb-1 text-[10px] text-amber-400">
                      Click on the map to place <span className="font-semibold">{placingProp}</span> (scale: {propScale.toFixed(1)})
                      <button onClick={() => setPlacingProp(null)} className="ml-2 text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {PROP_TYPES.map(type => (
                      <button key={type} onClick={() => setPlacingProp(type)}
                        className={`rounded border px-1.5 py-0.5 text-[9px] transition capitalize ${
                          placingProp === type ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                        }`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <button onClick={() => {
                    appRef.current?.removeEditorRoom(selectedRoom)
                    clearSelection()
                  }}
                    className="w-full rounded-lg border border-red-500/30 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition">
                    Delete Room
                  </button>
                </div>
              </>
            )}

            {/* Door editor */}
            {editorPanel === 'door' && selectedDoor && (
              <>
                <div className="text-xs text-muted-foreground">
                  Position: ({selectedDoor.x}, {selectedDoor.y})
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Door Type</label>
                  <select value={selectedDoor.type} onChange={e => {
                    appRef.current?.setDoorType(selectedDoor, parseInt(e.target.value))
                    refresh()
                  }} className={inputCls}>
                    {DOOR_TYPES.map(dt => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => { appRef.current?.removeDoor(selectedDoor); clearSelection() }}
                  className="w-full rounded-lg border border-red-500/30 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition">
                  Remove Door
                </button>
              </>
            )}

            {/* Maps panel */}
            {editorPanel === 'maps' && (
              <>
                <button onClick={handleSave}
                  className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition">
                  {currentMapId ? 'Save Current Map' : 'Save As New Map'}
                </button>
                {currentMapId && (
                  <button onClick={() => { setCurrentMapId(null) }}
                    className="w-full rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent transition">
                    Detach (Save next as new)
                  </button>
                )}
                <div className="pt-1 border-t border-border">
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-2">
                    {campaign?.maps.length ? `${campaign.maps.length} saved map${campaign.maps.length > 1 ? 's' : ''}` : 'No saved maps'}
                  </label>
                  <div className="space-y-1.5">
                    {campaign?.maps.map(m => (
                      <div key={m.id} className={`rounded-lg border p-2 transition ${
                        m.id === currentMapId ? 'border-primary/40 bg-primary/5' : 'border-border/50 hover:border-border'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium truncate flex-1">{m.name}</span>
                          {m.id === currentMapId && <span className="text-[9px] text-primary font-semibold ml-1">CURRENT</span>}
                        </div>
                        <div className="text-[9px] text-muted-foreground mb-1.5">
                          {m.dungeonData ? `Seed: ${m.seed} · ` : 'Grid map · '}{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : ''}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleLoadMap(m.id)}
                            className="flex-1 rounded border border-border py-1 text-[10px] font-medium hover:bg-accent transition">
                            {m.dungeonData ? 'Load' : 'Select'}
                          </button>
                          <button onClick={() => handleDeleteMap(m.id)}
                            className="rounded border border-red-500/30 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 transition">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* Print Settings Dialog */}
      {showPrintDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPrintDialog(false)}>
          <div className="w-80 rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold">Print Map</h3>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Paper Size</label>
              <select value={printSettings.paperSize} onChange={e => setPrintSettings(p => ({ ...p, paperSize: e.target.value as PrintOptions['paperSize'] }))}
                className={inputCls}>
                {Object.entries(PAPER_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Orientation</label>
              <div className="flex gap-2">
                {(['portrait', 'landscape'] as const).map(o => (
                  <button key={o} onClick={() => setPrintSettings(p => ({ ...p, orientation: o }))}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition capitalize ${
                      printSettings.orientation === o ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-border hover:bg-accent'
                    }`}>{o}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Scale (inches per square): {printSettings.gridScale}"</label>
              <input type="range" min={0.125} max={2} step={0.125} value={printSettings.gridScale}
                onChange={e => setPrintSettings(p => ({ ...p, gridScale: parseFloat(e.target.value) }))}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>1/8"</span><span>1/2"</span><span>1"</span><span>1.5"</span><span>2"</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Margin: {printSettings.margin}"</label>
              <input type="range" min={0.25} max={1} step={0.25} value={printSettings.margin}
                onChange={e => setPrintSettings(p => ({ ...p, margin: parseFloat(e.target.value) }))}
                className="w-full accent-primary" />
            </div>

            <div className="text-[10px] text-muted-foreground">
              {(() => {
                const paper = PAPER_SIZES[printSettings.paperSize]
                const pw = printSettings.orientation === 'landscape' ? paper.h : paper.w
                const ph = printSettings.orientation === 'landscape' ? paper.w : paper.h
                const printW = pw - printSettings.margin * 2
                const printH = ph - printSettings.margin * 2
                const rect = appRef.current?.dungeon?.getRect()
                if (!rect) return null
                const pxPerSq = printSettings.gridScale * 96
                const mapW = (rect.w + 4) * pxPerSq
                const mapH = (rect.h + 4) * pxPerSq
                const cols = Math.max(1, Math.ceil(mapW / (printW * 96)))
                const rows = Math.max(1, Math.ceil(mapH / (printH * 96)))
                return `Map: ${rect.w}×${rect.h} squares → ${cols}×${rows} pages (${cols * rows} total)`
              })()}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowPrintDialog(false)}
                className="flex-1 rounded-lg border border-border py-2 text-xs font-medium hover:bg-accent transition">Cancel</button>
              <button onClick={() => { setShowPrintDialog(false); openPrintExport(appRef.current, style, printSettings) }}
                className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition">Open Print View</button>
            </div>
          </div>
        </div>
      )}

      {/* GM Print Settings Dialog */}
      {showGMPrintDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowGMPrintDialog(false)}>
          <div className="w-80 rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold">GM Print</h3>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Paper Size</label>
              <select value={gmPrintSettings.paperSize} onChange={e => setGMPrintSettings(p => ({ ...p, paperSize: e.target.value as GMPrintOptions['paperSize'] }))}
                className={inputCls}>
                {Object.entries(PAPER_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Orientation</label>
              <div className="flex gap-2">
                {(['portrait', 'landscape'] as const).map(o => (
                  <button key={o} onClick={() => setGMPrintSettings(p => ({ ...p, orientation: o }))}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition capitalize ${
                      gmPrintSettings.orientation === o ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-border hover:bg-accent'
                    }`}>{o}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Margin: {gmPrintSettings.margin}"</label>
              <input type="range" min={0.25} max={1} step={0.25} value={gmPrintSettings.margin}
                onChange={e => setGMPrintSettings(p => ({ ...p, margin: parseFloat(e.target.value) }))}
                className="w-full accent-primary" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-2">Options</label>
              <div className="space-y-2">
                {([
                  { key: 'showSecrets' as const, label: 'Show Secret Rooms' },
                  { key: 'showConnectors' as const, label: 'Show Connectors' },
                  { key: 'bw' as const, label: 'Black & White' },
                ]).map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={gmPrintSettings[opt.key]}
                      onChange={e => setGMPrintSettings(p => ({ ...p, [opt.key]: e.target.checked }))}
                      className="accent-primary" />
                    <span className="text-xs">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowGMPrintDialog(false)}
                className="flex-1 rounded-lg border border-border py-2 text-xs font-medium hover:bg-accent transition">Cancel</button>
              <button onClick={() => { setShowGMPrintDialog(false); openGMPrint(appRef.current, style, editingTitle || 'Dungeon Map', gmPrintSettings) }}
                className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition">Open GM Print</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
