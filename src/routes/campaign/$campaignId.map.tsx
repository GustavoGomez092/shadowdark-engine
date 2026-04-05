import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { createEmptyMap } from '@/lib/campaign/defaults.ts'
import { MapCanvas, exportMapAsPNG } from '@/components/campaign/map/map-canvas.tsx'
import type { MapTool } from '@/components/campaign/map/map-canvas.tsx'
import type { TerrainType, WallType, CampaignMap } from '@/schemas/map.ts'

export const Route = createFileRoute('/campaign/$campaignId/map')({
  component: MapEditorPage,
})

const TERRAIN_OPTIONS: { type: TerrainType; label: string; color: string }[] = [
  { type: 'stone_floor', label: 'Stone Floor', color: '#d4d0c8' },
  { type: 'stone_wall', label: 'Stone Wall', color: '#5a5a5a' },
  { type: 'cave_floor', label: 'Cave Floor', color: '#a89880' },
  { type: 'cave_wall', label: 'Cave Wall', color: '#6b5e50' },
  { type: 'dirt', label: 'Dirt', color: '#8b7355' },
  { type: 'wooden_floor', label: 'Wood Floor', color: '#c4a265' },
  { type: 'grass', label: 'Grass', color: '#6b8e4e' },
  { type: 'water', label: 'Water', color: '#4a90c4' },
  { type: 'deep_water', label: 'Deep Water', color: '#2c5f8a' },
]

const TOOL_OPTIONS: { tool: MapTool; label: string; icon: string }[] = [
  { tool: 'select', label: 'Select', icon: '↖' },
  { tool: 'floor', label: 'Paint', icon: '🖌' },
  { tool: 'wall', label: 'Walls', icon: '▬' },
  { tool: 'door', label: 'Door', icon: '🚪' },
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
  const [showGrid, setShowGrid] = useState(true)
  const [gridDistanceFt, setGridDistanceFt] = useState(5)
  const [showNewMapDialog, setShowNewMapDialog] = useState(false)
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
          <button onClick={() => setShowNewMapDialog(true)} className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
            Create First Map
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-[calc(100vh-120px)]">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/50 px-3 py-2">
        {/* Map selector */}
        <select
          value={selectedMapId ?? ''}
          onChange={e => setSelectedMapId(e.target.value)}
          className="rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none"
        >
          {campaign.maps.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button onClick={() => setShowNewMapDialog(true)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">+ New</button>

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

        {/* Terrain selector (when paint tool active) */}
        {activeTool === 'floor' && (
          <div className="flex gap-0.5 items-center">
            {TERRAIN_OPTIONS.map(t => (
              <button
                key={t.type}
                onClick={() => setActiveTerrainType(t.type)}
                title={t.label}
                className={`h-6 w-6 rounded transition ${activeTerrainType === t.type ? 'ring-2 ring-primary' : 'ring-1 ring-border'}`}
                style={{ backgroundColor: t.color }}
              />
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
        {activeTool === 'wall' && 'Click a cell to toggle walls. Alt+drag to pan.'}
        {activeTool === 'door' && 'Click a cell to place doors on all edges.'}
        {activeTool === 'eraser' && 'Click/drag to erase cells.'}
        {activeTool === 'marker' && 'Click to place/remove room number markers.'}
        {activeTool === 'select' && 'Click and drag to select. Alt+drag to pan.'}
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
    </main>
  )
}
