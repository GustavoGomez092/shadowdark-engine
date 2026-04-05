import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { createEmptyMap } from '@/lib/campaign/defaults.ts'
import { MapCanvas, exportMapAsPNG } from '@/components/campaign/map/map-canvas.tsx'
import type { MapTool } from '@/components/campaign/map/map-canvas.tsx'
import type { TerrainType, WallType, WallStyle, CampaignMap } from '@/schemas/map.ts'
import { generateDungeon, DEFAULT_CONFIG } from '@/lib/campaign/dungeon-generator.ts'
import type { DungeonConfig } from '@/lib/campaign/dungeon-generator.ts'

export const Route = createFileRoute('/campaign/$campaignId/map')({
  component: MapEditorPage,
})

const TERRAIN_OPTIONS: { type: TerrainType; label: string; color: string }[] = [
  { type: 'stone_floor', label: 'Stone', color: '#d4d0c8' },
  { type: 'stone_wall', label: 'Wall', color: '#5a5a5a' },
  { type: 'cave_floor', label: 'Cave', color: '#a89880' },
  { type: 'cave_wall', label: 'Rock', color: '#6b5e50' },
  { type: 'dirt', label: 'Dirt', color: '#8b7355' },
  { type: 'sand', label: 'Sand', color: '#d4b87a' },
  { type: 'mud', label: 'Mud', color: '#6b5a3e' },
  { type: 'wooden_floor', label: 'Wood', color: '#c4a265' },
  { type: 'cobblestone', label: 'Cobble', color: '#9a9a8e' },
  { type: 'marble', label: 'Marble', color: '#e8e4df' },
  { type: 'tiles', label: 'Tiles', color: '#b8b0a0' },
  { type: 'grass', label: 'Grass', color: '#6b8e4e' },
  { type: 'water', label: 'Water', color: '#4a90c4' },
  { type: 'deep_water', label: 'Deep', color: '#2c5f8a' },
  { type: 'lava', label: 'Lava', color: '#d44400' },
  { type: 'ice', label: 'Ice', color: '#c8e4f0' },
]

const FURNITURE_OPTIONS: { variant: string; label: string; icon: string }[] = [
  { variant: 'table', label: 'Table', icon: '🪑' },
  { variant: 'chair', label: 'Chair', icon: '💺' },
  { variant: 'chest', label: 'Chest', icon: '📦' },
  { variant: 'barrel', label: 'Barrel', icon: '🛢' },
  { variant: 'column', label: 'Column', icon: '🏛' },
  { variant: 'statue', label: 'Statue', icon: '🗿' },
  { variant: 'altar', label: 'Altar', icon: '⛪' },
  { variant: 'fireplace', label: 'Fire', icon: '🔥' },
  { variant: 'bookshelf', label: 'Books', icon: '📚' },
  { variant: 'bed', label: 'Bed', icon: '🛏' },
  { variant: 'throne', label: 'Throne', icon: '👑' },
  { variant: 'fountain', label: 'Fountain', icon: '⛲' },
  { variant: 'well', label: 'Well', icon: '🪣' },
  { variant: 'sarcophagus', label: 'Coffin', icon: '⚰' },
  { variant: 'rubble', label: 'Rubble', icon: '🪨' },
  { variant: 'cage', label: 'Cage', icon: '🔲' },
  { variant: 'cauldron', label: 'Cauldron', icon: '🫕' },
  { variant: 'lever', label: 'Lever', icon: '🔧' },
  { variant: 'pit', label: 'Pit', icon: '⚫' },
  { variant: 'rug', label: 'Rug', icon: '🟫' },
]

const TOOL_OPTIONS: { tool: MapTool; label: string; icon: string }[] = [
  { tool: 'select', label: 'Select', icon: '↖' },
  { tool: 'floor', label: 'Paint', icon: '🖌' },
  { tool: 'bucket', label: 'Fill', icon: '🪣' },
  { tool: 'wall', label: 'Walls', icon: '▬' },
  { tool: 'door', label: 'Door', icon: '🚪' },
  { tool: 'window', label: 'Window', icon: '▫' },
  { tool: 'diagonal', label: 'Diagonal', icon: '╲' },
  { tool: 'split', label: 'Split', icon: '◤' },
  { tool: 'furniture', label: 'Objects', icon: '🏛' },
  { tool: 'eraser', label: 'Eraser', icon: '✕' },
  { tool: 'marker', label: 'Room #', icon: '#' },
]

const SIZE_PRESETS = [
  { label: 'Small (20×15)', w: 20, h: 15 },
  { label: 'Medium (30×20)', w: 30, h: 20 },
  { label: 'Large (40×30)', w: 40, h: 30 },
  { label: 'Huge (60×40)', w: 60, h: 40 },
]

function MapEditorPage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const addMap = useCampaignStore(s => s.addMap)
  const updateMap = useCampaignStore(s => s.updateMap)
  const removeMap = useCampaignStore(s => s.removeMap)

  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<MapTool>('floor')
  const [activeTerrainType, setActiveTerrainType] = useState<TerrainType>('stone_floor')
  const [activeWallType, setActiveWallType] = useState<WallType>('wall')
  const [activeFurniture, setActiveFurniture] = useState('column')
  const [showGrid, setShowGrid] = useState(true)
  const [gridDistanceFt, setGridDistanceFt] = useState(5)
  const [showNewMapDialog, setShowNewMapDialog] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [newMapWidth, setNewMapWidth] = useState(30)
  const [newMapHeight, setNewMapHeight] = useState(20)

  useEffect(() => {
    if (campaign && campaign.maps.length > 0 && !selectedMapId) {
      setSelectedMapId(campaign.maps[0].id)
    }
  }, [campaign, selectedMapId])

  if (!campaign) return null

  const selectedMap = campaign.maps.find(m => m.id === selectedMapId) ?? null

  function handleCreateMap() {
    const map = createEmptyMap(newMapName || 'Dungeon Map')
    map.width = newMapWidth
    map.height = newMapHeight
    addMap(map)
    setSelectedMapId(map.id)
    setShowNewMapDialog(false)
    setNewMapName('')
  }

  function handleMapChange(updater: (m: CampaignMap) => void) {
    if (!selectedMapId) return
    updateMap(selectedMapId, updater)
  }

  function handleExportPNG() {
    if (!selectedMap) return
    const dataUrl = exportMapAsPNG(selectedMap, 2)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${selectedMap.name.toLowerCase().replace(/\s+/g, '-')}-map.png`
    a.click()
  }

  function handlePrintMap() {
    if (!selectedMap) return
    const dataUrl = exportMapAsPNG(selectedMap, 3)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>${selectedMap.name} - Print</title>
      <style>
        @media print { body { margin: 0; } img { max-width: 100%; page-break-inside: avoid; } }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: white; }
        img { max-width: 95vw; max-height: 95vh; }
      </style></head>
      <body><img src="${dataUrl}" /><script>setTimeout(() => window.print(), 500)</script></body></html>
    `)
    printWindow.document.close()
  }

  // No maps state
  if (campaign.maps.length === 0 && !showNewMapDialog) {
    return (
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold">{t('campaign.nav.map')}</h1>
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-lg text-muted-foreground">No maps yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a dungeon map for your adventure</p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setShowNewMapDialog(true)} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
              Create Empty Map
            </button>
            <button onClick={() => setShowGenerator(true)} className="rounded-lg border border-primary/30 bg-primary/10 px-6 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition">
              Generate Dungeon
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-[calc(100vh-120px)]">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/50 px-3 py-2">
        {/* Map selector + rename */}
        {campaign.maps.length > 1 ? (
          <select
            value={selectedMapId ?? ''}
            onChange={e => setSelectedMapId(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none max-w-[120px]"
          >
            {campaign.maps.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        ) : null}
        {selectedMap && (
          <input
            type="text"
            value={selectedMap.name}
            onChange={e => updateMap(selectedMap.id, m => { m.name = e.target.value })}
            className="rounded-lg border border-input bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-1 focus:ring-ring w-36"
          />
        )}
        <button onClick={() => setShowNewMapDialog(true)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">+ New</button>
        <button onClick={() => setShowGenerator(true)} className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition">Generate</button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Tools */}
        <div className="flex gap-0.5 rounded-lg border border-border p-0.5">
          {TOOL_OPTIONS.map(t => (
            <button
              key={t.tool}
              onClick={() => setActiveTool(t.tool)}
              title={t.label}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                activeTool === t.tool ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Terrain selector (when paint or fill tool active) */}
        {(activeTool === 'floor' || activeTool === 'bucket' || activeTool === 'split') && (
          <div className="flex gap-1 items-center flex-wrap">
            {TERRAIN_OPTIONS.map(t => (
              <button
                key={t.type}
                onClick={() => setActiveTerrainType(t.type)}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${activeTerrainType === t.type ? 'ring-2 ring-primary bg-primary/10 text-primary' : 'ring-1 ring-border text-muted-foreground hover:text-foreground'}`}
              >
                <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Furniture selector (when furniture tool active) */}
        {activeTool === 'furniture' && (
          <div className="flex gap-0.5 items-center flex-wrap">
            {FURNITURE_OPTIONS.map(f => (
              <button
                key={f.variant}
                onClick={() => setActiveFurniture(f.variant)}
                title={f.label}
                className={`h-7 w-7 rounded text-sm transition flex items-center justify-center ${activeFurniture === f.variant ? 'ring-2 ring-primary bg-primary/10' : 'ring-1 ring-border hover:bg-accent'}`}
              >
                {f.icon}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Grid controls */}
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="rounded" />
          Grid
        </label>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">1sq=</span>
          <input type="number" value={gridDistanceFt} onChange={e => setGridDistanceFt(parseInt(e.target.value) || 5)} min={1} max={30}
            className="w-10 rounded border border-input bg-background px-1 py-0.5 text-xs text-center outline-none" />
          <span className="text-muted-foreground">ft</span>
        </div>

        {/* Wall style for export */}
        <select
          value={selectedMap?.wallStyle ?? 'double'}
          onChange={e => selectedMap && updateMap(selectedMap.id, m => { m.wallStyle = e.target.value as WallStyle })}
          className="rounded border border-input bg-background px-1 py-0.5 text-[10px] outline-none"
          title="Wall style (export)"
        >
          <option value="line">Thin</option>
          <option value="double">Double</option>
          <option value="stone">Stone</option>
          <option value="brick">Brick</option>
        </select>
        <div className="flex items-center gap-0.5 text-[10px]">
          <span className="text-muted-foreground">W:</span>
          <input
            type="number"
            value={selectedMap?.wallThickness ?? 4}
            onChange={e => selectedMap && updateMap(selectedMap.id, m => { m.wallThickness = parseInt(e.target.value) || 4 })}
            min={1} max={12}
            className="w-8 rounded border border-input bg-background px-0.5 py-0.5 text-[10px] text-center outline-none"
            title="Wall thickness (export)"
          />
        </div>

        {/* Export */}
        <button onClick={handleExportPNG} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">PNG</button>
        <button onClick={handlePrintMap} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">Print</button>
        {selectedMapId && (
          <button onClick={() => { removeMap(selectedMapId); setSelectedMapId(campaign.maps.find(m => m.id !== selectedMapId)?.id ?? null) }}
            className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition">Delete</button>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        {selectedMap ? (
          <MapCanvas
            map={selectedMap}
            onMapChange={handleMapChange}
            activeTool={activeTool}
            activeTerrainType={activeTerrainType}
            activeWallType={activeWallType}
            activeFurniture={activeFurniture}
            showGrid={showGrid}
            gridDistanceFt={gridDistanceFt}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Select a map</div>
        )}
      </div>

      {/* Tip bar */}
      <div className="border-t border-border bg-card/30 px-3 py-1 text-[10px] text-muted-foreground">
        {activeTool === 'floor' && 'Click/drag to paint terrain. Alt+drag or middle-click to pan. Scroll to zoom.'}
        {activeTool === 'bucket' && 'Click to flood-fill a region with terrain. Walls act as boundaries.'}
        {activeTool === 'wall' && 'Click near a cell edge to place walls. Drag to paint walls continuously.'}
        {activeTool === 'door' && 'Click near a cell edge to place a door. Drag to place doors continuously.'}
        {activeTool === 'window' && 'Click near a cell edge to place a window. Drag to place windows continuously.'}
        {activeTool === 'diagonal' && 'Click to place a diagonal wall (╲ or ╱ based on click position). Drag to place continuously.'}
        {activeTool === 'split' && 'Click to split a cell diagonally into two terrains. Select terrain for the second half from the palette.'}
        {activeTool === 'furniture' && 'Click to place/remove furniture. Select object type from the palette.'}
        {activeTool === 'eraser' && 'Click/drag to erase cells.'}
        {activeTool === 'marker' && 'Click to place/remove room number markers.'}
        {activeTool === 'select' && 'Click and drag to select. Alt+drag to pan.'}
        {' · Undo: Ctrl/Cmd+Z · Redo: Ctrl/Cmd+Shift+Z'}
      </div>

      {/* New Map Dialog */}
      {showNewMapDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4">New Map</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Map Name</label>
                <input type="text" value={newMapName} onChange={e => setNewMapName(e.target.value)} placeholder="Dungeon Map"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-muted-foreground">Size Presets</label>
                <div className="flex flex-wrap gap-2">
                  {SIZE_PRESETS.map(p => (
                    <button key={p.label} onClick={() => { setNewMapWidth(p.w); setNewMapHeight(p.h) }}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition ${newMapWidth === p.w && newMapHeight === p.h ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Width (cells)</label>
                  <input type="number" value={newMapWidth} onChange={e => setNewMapWidth(parseInt(e.target.value) || 20)} min={5} max={100}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Height (cells)</label>
                  <input type="number" value={newMapHeight} onChange={e => setNewMapHeight(parseInt(e.target.value) || 15)} min={5} max={100}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setShowNewMapDialog(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
              <button onClick={handleCreateMap} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">Create Map</button>
            </div>
          </div>
        </div>
      )}

      {/* Dungeon Generator Dialog */}
      {showGenerator && (
        <DungeonGeneratorDialog
          onGenerate={(map) => {
            addMap(map)
            setSelectedMapId(map.id)
            setShowGenerator(false)
          }}
          onCancel={() => setShowGenerator(false)}
        />
      )}
    </main>
  )
}

function DungeonGeneratorDialog({ onGenerate, onCancel }: {
  onGenerate: (map: CampaignMap) => void
  onCancel: () => void
}) {
  const [config, setConfig] = useState<DungeonConfig>({ ...DEFAULT_CONFIG, seed: Math.floor(Math.random() * 99999999) })
  const [preview, setPreview] = useState<CampaignMap | null>(null)

  function update<K extends keyof DungeonConfig>(key: K, value: DungeonConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setPreview(null)
  }

  function handleGenerate() {
    const map = generateDungeon(config)
    setPreview(map)
  }

  function handleAccept() {
    const map = preview ?? generateDungeon(config)
    onGenerate(map)
  }

  function handleReroll() {
    setConfig(prev => ({ ...prev, seed: Math.floor(Math.random() * 99999999) }))
    setPreview(null)
  }

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-1">Dungeon Generator</h2>
        <p className="text-xs text-muted-foreground mb-4">Generate a random dungeon layout with rooms and corridors</p>

        <div className="space-y-4">
          {/* Seed */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Seed</label>
              <input type="number" value={config.seed} onChange={e => update('seed', parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <button onClick={handleReroll} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition">Reroll</button>
          </div>

          {/* Map size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Width (cells)</label>
              <input type="number" value={config.width} onChange={e => update('width', parseInt(e.target.value) || 30)} min={15} max={80} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Height (cells)</label>
              <input type="number" value={config.height} onChange={e => update('height', parseInt(e.target.value) || 20)} min={15} max={60} className={inputCls} />
            </div>
          </div>

          {/* Room settings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rooms</label>
              <input type="number" value={config.roomCount} onChange={e => update('roomCount', parseInt(e.target.value) || 6)} min={2} max={25} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Min Size</label>
              <input type="number" value={config.roomMinSize} onChange={e => update('roomMinSize', parseInt(e.target.value) || 3)} min={2} max={6} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Max Size</label>
              <input type="number" value={config.roomMaxSize} onChange={e => update('roomMaxSize', parseInt(e.target.value) || 7)} min={3} max={12} className={inputCls} />
            </div>
          </div>

          {/* Density & options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Density</label>
              <select value={config.density} onChange={e => update('density', e.target.value as DungeonConfig['density'])} className={inputCls}>
                <option value="sparse">Sparse</option>
                <option value="normal">Normal</option>
                <option value="dense">Dense</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Corridor Width</label>
              <select value={config.corridorWidth} onChange={e => update('corridorWidth', parseInt(e.target.value))} className={inputCls}>
                <option value={1}>1 Cell</option>
                <option value={2}>2 Cells</option>
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={config.addLoops} onChange={e => update('addLoops', e.target.checked)} className="rounded" />
              Loop corridors
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={config.addSecretRooms} onChange={e => update('addSecretRooms', e.target.checked)} className="rounded" />
              Secret rooms
            </label>
          </div>

          {/* Water */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Water ({Math.round(config.waterChance * 100)}%)</label>
            <input type="range" value={config.waterChance} onChange={e => update('waterChance', parseFloat(e.target.value))} min={0} max={0.5} step={0.05}
              className="w-full accent-primary" />
          </div>

          {/* Preview info */}
          {preview && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              Generated: {preview.layers[0].cells.length} cells, {preview.markers.length} rooms
              <span className="ml-2 text-primary font-medium">Ready to add</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={handleGenerate} className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition">
            {preview ? 'Regenerate' : 'Preview'}
          </button>
          <button onClick={handleAccept} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
            {preview ? 'Add to Campaign' : 'Generate & Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
