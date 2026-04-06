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

const PROP_TYPES = ['altar', 'barrel', 'boulder', 'box', 'chest', 'dais', 'smalldais', 'fountain', 'sarcophagus', 'statue', 'tapestry', 'throne', 'well']

function MapEditorPage() {
  const campaign = useCampaignStore(s => s.campaign)
  const updateCampaignMeta = useCampaignStore(s => s.updateMeta)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Generation state
  const [seed, setSeed] = useState(Math.floor(Math.random() * 2147483647))
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  // Visual toggles
  const [toggles, setToggles] = useState({
    title: true, grid: true, water: true, props: true,
    notes: true, secrets: false, connectors: false,
    autoRotate: true, bw: false,
  })
  const [palette, setPalette] = useState('default')

  // Editor state
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [selectedDoor, setSelectedDoor] = useState<any>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingStory, setEditingStory] = useState('')
  const [editorPanel, setEditorPanel] = useState<'none' | 'room' | 'door' | 'dungeon'>('none')
  const [placingProp, setPlacingProp] = useState<string | null>(null)
  const [selectedProp, setSelectedProp] = useState<any>(null)
  const [propScale, setPropScale] = useState(0.6)
  const [propRotation, setPropRotation] = useState(0)
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  // Init app
  const initApp = useCallback(async () => {
    if (!canvasRef.current || !containerRef.current) return
    if (appRef.current) return
    setLoading(true)
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

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (!appRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      appRef.current.resize(rect.width, rect.height)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // New dungeon
  async function handleNew() {
    const newSeed = Math.floor(Math.random() * 2147483647)
    setSeed(newSeed)
    if (!appRef.current) { await initApp(); return }
    appRef.current._resize()
    appRef.current.blueprint = new Blueprint(newSeed, [])
    appRef.current.renderer.noteOverrides.clear()
    appRef.current.generate()
    setEditingTitle(appRef.current.dungeon?.story?.name || '')
    setEditingStory(appRef.current.dungeon?.story?.hook || '')
    setSelectedRoom(null); setSelectedDoor(null); setEditorPanel('none')
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

  // Canvas click — place prop or select room/door
  function handleCanvasClick(e: React.MouseEvent) {
    const app = appRef.current; if (!app) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const cssX = e.clientX - rect.left
    const cssY = e.clientY - rect.top
    const grid = app.cssToGrid(cssX, cssY)
    if (!grid) return

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

    // If a room is selected, check if clicking a prop within it
    if (selectedRoom) {
      const prop = app.findPropAt(selectedRoom, grid.gx + 0.5, grid.gy + 0.5)
      if (prop) {
        setSelectedProp(prop)
        setPropScale(prop.scale)
        setPropRotation(prop.rotation)
        return
      }
    }

    // Check door first
    const door = app.findDoorAt(grid.gx, grid.gy)
    if (door) {
      setSelectedDoor(door); setSelectedRoom(null); setSelectedProp(null); setEditorPanel('door'); setPlacingProp(null)
      return
    }
    const room = app.findRoomAt(grid.gx, grid.gy)
    if (room) {
      setSelectedRoom(room); setSelectedDoor(null); setSelectedProp(null); setEditorPanel('room'); setPlacingProp(null)
      return
    }
    setSelectedRoom(null); setSelectedDoor(null); setSelectedProp(null); setEditorPanel('none'); setPlacingProp(null)
  }

  // Save dungeon state to campaign
  function handleSave() {
    const app = appRef.current; if (!app) return
    const data = app.serialize()
    if (!data) return
    // Store as campaign metadata (for now, save to localStorage with campaign ID)
    try {
      const key = `shadowdark:dungeon:${campaign?.id}`
      localStorage.setItem(key, JSON.stringify(data))
    } catch {}
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Enter') { handleNew(); e.preventDefault() }
      if (e.key === 'Escape') { setEditorPanel('none'); setSelectedRoom(null); setSelectedDoor(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
            className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-[10px] text-center outline-none font-mono" title="Seed" />

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

          {generated && (
            <div className="flex items-center gap-1">
              <button onClick={() => setEditorPanel(editorPanel === 'dungeon' ? 'none' : 'dungeon')}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition ${editorPanel === 'dungeon' ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-border hover:bg-accent'}`}>
                Edit Info
              </button>
              <button onClick={handleSave} className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition">Save</button>
              <button onClick={exportPNG} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">PNG</button>
              <button onClick={exportJSON} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">JSON</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-hidden relative bg-[#F8F8F4]">
          <canvas ref={canvasRef} className="w-full h-full" onContextMenu={e => e.preventDefault()}
            onClick={handleCanvasClick} style={{ cursor: placingProp ? 'crosshair' : 'default' }} />
          {!generated && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-[#222022] mb-2">Dungeon Map</p>
                <p className="text-sm text-[#222022]/60 mb-4">Generate and edit a one-page dungeon</p>
                <button onClick={initApp} className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
                  Generate
                </button>
                <p className="mt-3 text-[10px] text-muted-foreground">Click rooms/doors to edit · Drag note boxes to reposition</p>
              </div>
            </div>
          )}
        </div>

        {/* Editor Panel (right sidebar) */}
        {editorPanel !== 'none' && generated && (
          <div className="w-72 border-l border-border bg-card overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editorPanel === 'dungeon' ? 'Dungeon Info' : editorPanel === 'room' ? 'Room' : 'Door'}
              </h3>
              <button onClick={() => { setEditorPanel('none'); setSelectedRoom(null); setSelectedDoor(null) }}
                className="text-xs text-muted-foreground hover:text-foreground">&times;</button>
            </div>

            {/* Dungeon info editor */}
            {editorPanel === 'dungeon' && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Title</label>
                  <input value={editingTitle} onChange={e => { setEditingTitle(e.target.value); appRef.current?.setTitle(e.target.value) }}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Story Hook</label>
                  <textarea value={editingStory} onChange={e => { setEditingStory(e.target.value); appRef.current?.setStoryHook(e.target.value) }}
                    rows={4} className={inputCls + " resize-y"} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Rooms</label>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {appRef.current?.getVisibleRooms()?.map((room: any, i: number) => (
                      <button key={i} onClick={() => { setSelectedRoom(room); setSelectedDoor(null); setEditorPanel('room') }}
                        className="w-full text-left rounded-lg border border-border/50 px-2 py-1 text-[11px] hover:bg-accent transition">
                        <span className="font-medium">Room {i + 1}</span>
                        <span className="text-muted-foreground ml-1">({room.w}×{room.h})</span>
                        {room.desc && <p className="text-[10px] text-muted-foreground truncate">{room.desc}</p>}
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
                  <textarea value={selectedRoom.desc || ''} onChange={e => { appRef.current?.setRoomDesc(selectedRoom, e.target.value); refresh() }}
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

                  {/* Existing props list */}
                  {selectedRoom.props?.length > 0 && (
                    <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                      {selectedRoom.props.map((prop: any, i: number) => (
                        <div key={i} onClick={() => { setSelectedProp(prop); setPropScale(prop.scale); setPropRotation(prop.rotation) }}
                          className={`flex items-center justify-between rounded border px-1.5 py-0.5 text-[10px] cursor-pointer transition ${
                            selectedProp === prop ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 hover:bg-accent'
                          }`}>
                          <span className="capitalize font-medium">{prop.type}</span>
                          <span className="text-muted-foreground">s:{prop.scale.toFixed(1)} r:{Math.round(prop.rotation * 180 / Math.PI)}°</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected prop editor */}
                  {selectedProp && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 mb-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold capitalize">{selectedProp.type}</span>
                        <button onClick={() => { appRef.current?.removeProp(selectedRoom, selectedProp); setSelectedProp(null); refresh() }}
                          className="text-[9px] text-red-400 hover:underline">Delete</button>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">Scale: {propScale.toFixed(2)}</label>
                        <input type="range" min={0.1} max={3} step={0.05} value={propScale}
                          onChange={e => { const v = parseFloat(e.target.value); setPropScale(v); appRef.current?.updateProp(selectedProp, { scale: v }) }}
                          className="w-full accent-primary h-1" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">Rotation: {Math.round(propRotation * 180 / Math.PI)}°</label>
                        <input type="range" min={0} max={6.28} step={0.1} value={propRotation}
                          onChange={e => { const v = parseFloat(e.target.value); setPropRotation(v); appRef.current?.updateProp(selectedProp, { rotation: v }) }}
                          className="w-full accent-primary h-1" />
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
                  {!placingProp && (
                    <div className="mb-1">
                      <div className="flex gap-2 mb-1">
                        <div className="flex-1">
                          <label className="text-[9px] text-muted-foreground">Size: {propScale.toFixed(1)}</label>
                          <input type="range" min={0.1} max={3} step={0.05} value={propScale} onChange={e => setPropScale(parseFloat(e.target.value))}
                            className="w-full accent-primary h-1" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-muted-foreground">Angle: {Math.round(propRotation * 180 / Math.PI)}°</label>
                          <input type="range" min={0} max={6.28} step={0.1} value={propRotation} onChange={e => setPropRotation(parseFloat(e.target.value))}
                            className="w-full accent-primary h-1" />
                        </div>
                      </div>
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
                <button onClick={() => { appRef.current?.removeDoor(selectedDoor); setSelectedDoor(null); setEditorPanel('none') }}
                  className="w-full rounded-lg border border-red-500/30 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition">
                  Remove Door
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
