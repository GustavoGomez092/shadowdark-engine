/**
 * GMMapViewer - Game Master's map viewer widget.
 *
 * - Uses DungeonRenderer for beautiful map display
 * - Click-drag to move tokens
 * - Cmd/Ctrl+drag to pan the map
 * - +/- buttons for zoom
 * - Two-step token placement: click "+" then click map
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { CampaignMap } from '@/schemas/map.ts'
import type { MapToken, MapLightSource, WallSegment, MapViewerState } from '@/schemas/map-viewer.ts'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance } from '@/schemas/monsters.ts'
import type { LightState } from '@/schemas/light.ts'
import { MapRenderer, type MapViewport } from './map-renderer.tsx'
import { extractDungeonWallSegments } from '@/lib/map-viewer/dungeon-walls.ts'
import { ensureMapHasCells } from '@/lib/map-viewer/dungeon-converter.ts'
import { generateId } from '@/lib/utils/id.ts'
import { getHpStatus } from '@/schemas/session.ts'

const DEFAULT_ZOOM = 4
const TOKEN_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

interface Props {
  campaignMaps: CampaignMap[]
  characters: Record<string, Character>
  monsters: Record<string, MonsterInstance>
  lightState: LightState
  mapViewerState: MapViewerState
  onStateChange: (state: MapViewerState) => void
  onTokenMove?: (tokenId: string, gridX: number, gridY: number) => void
}

// Pending token to be placed on next map click
interface PendingToken {
  type: 'character' | 'monster'
  referenceId: string
  name: string
  color: string
  hpStatus?: string
}

export function GMMapViewer({
  campaignMaps, characters, monsters, lightState,
  mapViewerState, onStateChange, onTokenMove,
}: Props) {
  const [viewport, setViewport] = useState<MapViewport>({ offsetX: 0, offsetY: 0, zoom: DEFAULT_ZOOM })
  const [showPlayerView, setShowPlayerView] = useState(false)
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [pendingToken, setPendingToken] = useState<PendingToken | null>(null)
  const [panMode, setPanMode] = useState(false)

  const activeMapRaw = campaignMaps.find(m => m.id === mapViewerState.activeMapId) ?? null
  const activeMap = useMemo(() => activeMapRaw ? ensureMapHasCells(activeMapRaw) : null, [activeMapRaw])

  // Wall segments extracted from the live dungeon (watabou grid coordinates)
  // These are populated after DungeonApp initializes via a ref callback
  const [wallSegments, setWallSegments] = useState<WallSegment[]>([])
  const onDungeonReady = useCallback((app: any) => {
    setWallSegments(extractDungeonWallSegments(app))
  }, [])

  // Derive light sources from tokens + light timers (in grid coordinates)
  const lightSources: MapLightSource[] = useMemo(() => {
    const sources: MapLightSource[] = []
    for (const timer of lightState.timers) {
      if (!timer.isActive || timer.isExpired) continue
      const token = mapViewerState.tokens.find(t => t.referenceId === timer.carrierId)
      if (!token) continue
      // Radius in grid units (not pixels)
      const radiusCells = timer.range === 'double_near' ? 6 : 3
      sources.push({
        x: token.gridX + 0.5,
        y: token.gridY + 0.5,
        radius: radiusCells,
        intensity: 1.0,
      })
    }
    return sources
  }, [lightState.timers, mapViewerState.tokens])

  const exploredCells = useMemo(() => new Set(mapViewerState.exploredCells), [mapViewerState.exploredCells])

  // ── Map Selection ──
  function handleSelectMap(mapId: string) {
    if (!mapId) {
      onStateChange({ ...mapViewerState, activeMapId: null, tokens: [], exploredCells: [] })
      return
    }
    if (mapId === mapViewerState.activeMapId) return
    // Start fresh — no auto-tokens, user places them via click
    onStateChange({ activeMapId: mapId, tokens: [], exploredCells: [] })
    setViewport({ offsetX: 0, offsetY: 0, zoom: DEFAULT_ZOOM })
    setPendingToken(null)
  }

  // Reset zoom when map changes
  const lastMapId = useRef<string | null>(null)
  useEffect(() => {
    if (activeMap && activeMap.id !== lastMapId.current) {
      lastMapId.current = activeMap.id
      setViewport({ offsetX: 0, offsetY: 0, zoom: DEFAULT_ZOOM })
    }
  }, [activeMap])

  // ── Token Placement (two-step: click "+" then click map) ──
  function startPlacingCharacter(charId: string) {
    const char = characters[charId]
    if (!char) return
    if (mapViewerState.tokens.some(t => t.referenceId === charId)) return
    const colorIdx = mapViewerState.tokens.length % TOKEN_COLORS.length
    setPanMode(false)
    setPendingToken({
      type: 'character',
      referenceId: charId,
      name: char.name,
      color: TOKEN_COLORS[colorIdx],
      hpStatus: getHpStatus(char.currentHp, char.maxHp, char.isDying),
    })
  }

  function startPlacingMonster(monsterId: string) {
    const monster = monsters[monsterId]
    if (!monster) return
    setPanMode(false)
    setPendingToken({
      type: 'monster',
      referenceId: monsterId,
      name: monster.name,
      color: '#ef4444',
      hpStatus: getHpStatus(monster.currentHp, monster.maxHp, false),
    })
  }

  function cancelPlacement() {
    setPendingToken(null)
  }

  // Called by MapRenderer when user clicks on the map
  function handleMapClick(gridX: number, gridY: number) {
    if (pendingToken) {
      // Place the pending token at the clicked position
      const token: MapToken = {
        id: generateId(),
        type: pendingToken.type,
        referenceId: pendingToken.referenceId,
        name: pendingToken.name,
        gridX,
        gridY,
        color: pendingToken.color,
        size: 1,
        visible: true,
        hpStatus: pendingToken.hpStatus as any,
      }
      onStateChange({
        ...mapViewerState,
        tokens: [...mapViewerState.tokens, token],
      })
      setPendingToken(null)
    }
  }

  // ── Token Management ──
  function removeToken(tokenId: string) {
    onStateChange({
      ...mapViewerState,
      tokens: mapViewerState.tokens.filter(t => t.id !== tokenId),
    })
    if (selectedTokenId === tokenId) setSelectedTokenId(null)
  }

  function toggleTokenVisibility(tokenId: string) {
    onStateChange({
      ...mapViewerState,
      tokens: mapViewerState.tokens.map(t =>
        t.id === tokenId ? { ...t, visible: !t.visible } : t
      ),
    })
  }

  const handleTokenDragEnd = useCallback((tokenId: string, gridX: number, gridY: number) => {
    onStateChange({
      ...mapViewerState,
      tokens: mapViewerState.tokens.map(t =>
        t.id === tokenId ? { ...t, gridX, gridY } : t
      ),
    })
    onTokenMove?.(tokenId, gridX, gridY)
  }, [mapViewerState, onStateChange, onTokenMove])

  // ── Zoom controls (MapRenderer handles centering internally) ──
  function zoomIn() {
    setViewport(v => ({ ...v, zoom: Math.min(8, v.zoom * 1.3) }))
  }
  function zoomOut() {
    setViewport(v => ({ ...v, zoom: Math.max(0.25, v.zoom / 1.3) }))
  }

  // Characters / monsters not yet on the map
  const unmappedCharacters = Object.entries(characters).filter(
    ([id]) => !mapViewerState.tokens.some(t => t.referenceId === id)
  )
  const unmappedMonsters = Object.entries(monsters).filter(
    ([id]) => !mapViewerState.tokens.some(t => t.referenceId === id && t.type === 'monster')
  )

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-zinc-800 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-xs">{collapsed ? '\u25B6' : '\u25BC'}</span>
          <span className="text-sm font-medium text-zinc-200">Map Viewer</span>
          {activeMap && <span className="text-xs text-zinc-500">{activeMap.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {activeMap && (
            <label className="flex items-center gap-1 text-xs text-zinc-400" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={showPlayerView}
                onChange={e => setShowPlayerView(e.target.checked)}
                className="w-3 h-3"
              />
              Player view
            </label>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          {/* Map Selector */}
          <div className="px-3 py-2 border-b border-zinc-700 flex items-center gap-2">
            <select
              value={mapViewerState.activeMapId || ''}
              onChange={e => handleSelectMap(e.target.value)}
              className="bg-zinc-800 text-zinc-200 text-sm rounded px-2 py-1 flex-1 border border-zinc-600"
            >
              <option value="">-- No Map --</option>
              {campaignMaps.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Pending placement banner */}
          {pendingToken && (
            <div className="px-3 py-1.5 bg-amber-500/20 border-b border-amber-500/30 flex items-center justify-between">
              <span className="text-xs text-amber-300">Click on the map to place <strong>{pendingToken.name}</strong></span>
              <button
                className="text-xs text-amber-400 hover:text-amber-200 underline"
                onClick={cancelPlacement}
              >Cancel</button>
            </div>
          )}

          {activeMap ? (
            <div className="relative h-[400px]">
              {/* Canvas — fills the whole area */}
              <div className="absolute inset-0">
                <MapRenderer
                  mapData={activeMap}
                  tokens={mapViewerState.tokens}
                  wallSegments={wallSegments}
                  lightSources={lightSources}
                  exploredCells={exploredCells}
                  fogMode={showPlayerView ? 'player' : 'none'}
                  viewport={viewport}
                  onViewportChange={setViewport}
                  onTokenDragEnd={handleTokenDragEnd}
                  onTokenClick={setSelectedTokenId}
                  onMapClick={handleMapClick}
                  selectedTokenId={selectedTokenId}
                  placingToken={!!pendingToken}
                  panMode={panMode}
                  onDungeonReady={onDungeonReady}
                />
              </div>

              {/* Zoom + pan controls — top left */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                <button
                  className="w-7 h-7 rounded bg-zinc-800/90 border border-zinc-600 text-zinc-200 text-lg font-bold hover:bg-zinc-700 flex items-center justify-center"
                  onClick={zoomIn}
                  title="Zoom in"
                >+</button>
                <button
                  className="w-7 h-7 rounded bg-zinc-800/90 border border-zinc-600 text-zinc-200 text-lg font-bold hover:bg-zinc-700 flex items-center justify-center"
                  onClick={zoomOut}
                  title="Zoom out"
                >&minus;</button>
                <button
                  className={`w-7 h-7 rounded border text-sm flex items-center justify-center transition-colors ${
                    panMode
                      ? 'bg-blue-600/90 border-blue-400 text-white'
                      : 'bg-zinc-800/90 border-zinc-600 text-zinc-200 hover:bg-zinc-700'
                  }`}
                  onClick={() => setPanMode(!panMode)}
                  title={panMode ? 'Pan mode (active) — click to disable' : 'Pan mode — click-drag to pan'}
                >{'\u270B'}</button>
              </div>

              {/* Sidebar: Token Palette — overlays on the right */}
              <div className="absolute top-0 right-0 w-48 h-full border-l border-zinc-700 bg-zinc-900/95 backdrop-blur-sm overflow-y-auto z-10">
                {/* Tokens on map */}
                <div className="px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-800">Tokens on Map</div>
                {mapViewerState.tokens.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-zinc-500 italic">No tokens placed</div>
                ) : (
                  mapViewerState.tokens.map(token => (
                    <div
                      key={token.id}
                      className={`flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-zinc-700/50 ${
                        token.id === selectedTokenId ? 'bg-zinc-700' : ''
                      }`}
                      onClick={() => setSelectedTokenId(token.id)}
                    >
                      <span
                        className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: token.color }}
                      />
                      <span className="flex-1 truncate text-zinc-200">{token.name}</span>
                      <button
                        className="text-zinc-500 hover:text-zinc-300 px-0.5"
                        onClick={e => { e.stopPropagation(); toggleTokenVisibility(token.id) }}
                        title={token.visible ? 'Hide from players' : 'Show to players'}
                      >
                        {token.visible ? '\u{1F441}' : '\u{1F6AB}'}
                      </button>
                      <button
                        className="text-zinc-500 hover:text-red-400 px-0.5"
                        onClick={e => { e.stopPropagation(); removeToken(token.id) }}
                        title="Remove token"
                      >
                        {'×'}
                      </button>
                    </div>
                  ))
                )}

                {/* Add characters — click "+" to start placement */}
                {unmappedCharacters.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-800 mt-1">Add Character</div>
                    {unmappedCharacters.map(([id, char]) => (
                      <button
                        key={id}
                        className={`flex items-center gap-1 px-2 py-1 text-xs w-full text-left ${
                          pendingToken?.referenceId === id ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-300 hover:bg-zinc-700/50'
                        }`}
                        onClick={() => startPlacingCharacter(id)}
                      >
                        <span className="text-green-400 font-bold">+</span>
                        <span className="truncate">{char.name}</span>
                        <span className="text-zinc-500 ml-auto">{char.class} {char.level}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Add monsters */}
                {unmappedMonsters.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-800 mt-1">Add Monster</div>
                    {unmappedMonsters.map(([id, monster]) => (
                      <button
                        key={id}
                        className={`flex items-center gap-1 px-2 py-1 text-xs w-full text-left ${
                          pendingToken?.referenceId === id ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-300 hover:bg-zinc-700/50'
                        }`}
                        onClick={() => startPlacingMonster(id)}
                      >
                        <span className="text-red-400 font-bold">+</span>
                        <span className="truncate">{monster.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-zinc-500 text-sm">
              Select a campaign map to display
            </div>
          )}
        </div>
      )}
    </div>
  )
}
