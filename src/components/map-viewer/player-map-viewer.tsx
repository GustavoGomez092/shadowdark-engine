/**
 * PlayerMapViewer - Player's map viewer with fog of war.
 *
 * Uses the same DungeonApp renderer as the GM view.
 * Read-only: no token manipulation, no sidebar.
 * Fog of war based on light sources from the player's character.
 */

import { useState, useMemo, useCallback } from 'react'
import type { PlayerMapViewState, MapLightSource } from '@/schemas/map-viewer.ts'
import type { WallSegment } from '@/schemas/map-viewer.ts'
import { DEFAULT_LIGHTING, LIGHT_INTENSITY_MIN } from '@/schemas/map-viewer.ts'
import type { LightState } from '@/schemas/light.ts'
import type { PlayerTokenMoveSettings } from '@/schemas/session.ts'
import { DEFAULT_PLAYER_TOKEN_MOVE } from '@/schemas/session.ts'
import type { CampaignMap } from '@/schemas/map.ts'
import { MapRenderer, type MapViewport } from './map-renderer.tsx'
import { extractDungeonWallSegments, extractColumnOccluders } from '@/lib/map-viewer/dungeon-walls.ts'

const DEFAULT_ZOOM = 4

interface Props {
  mapView: PlayerMapViewState
  lightState: LightState
  myCharacterId?: string
  activeCombatantId?: string | null
  /** Movement rules synced from the GM */
  moveSettings?: PlayerTokenMoveSettings
  /** Action pips already spent this turn (moves + rolls), tracked by the player route */
  actionsUsed?: number
  /** Send a move of the player's own token to the GM (one move action) */
  onMoveToken?: (gridX: number, gridY: number) => void
  /** End the player's turn */
  onEndTurn?: () => void
}

export function PlayerMapViewer({ mapView, lightState, myCharacterId, activeCombatantId, moveSettings, actionsUsed = 0, onMoveToken, onEndTurn }: Props) {
  const [viewport, setViewport] = useState<MapViewport>({ offsetX: 0, offsetY: 0, zoom: DEFAULT_ZOOM })
  const [collapsed, setCollapsed] = useState(false)

  // ── Self-move action economy ──
  // The budget (moves + rolls) is tracked by the player route; we just enforce it here.
  const s = moveSettings ?? DEFAULT_PLAYER_TOKEN_MOVE
  const isMyTurn = !!activeCombatantId && activeCombatantId === myCharacterId
  const selfMoveAllowed = !!myCharacterId && s.enabled && (!s.activeTurnOnly || isMyTurn)
  const budgetActive = isMyTurn // action economy applies on the player's turn
  const canMove = selfMoveAllowed && (!budgetActive || actionsUsed < s.actionsPerTurn)

  const handleSelfMove = useCallback((tokenId: string, gx: number, gy: number) => {
    const token = mapView.tokens.find(t => t.id === tokenId)
    if (!token || token.referenceId !== myCharacterId) return
    const dist = Math.max(Math.abs(gx - token.gridX), Math.abs(gy - token.gridY))
    if (dist < 1 || dist > s.moveDistance) return // out of range — token snaps back on next sync
    onMoveToken?.(gx, gy) // the route's send wrapper spends the action pip
  }, [mapView.tokens, myCharacterId, s.moveDistance, onMoveToken])

  // Build a CampaignMap-shaped object for MapRenderer
  const mapData: CampaignMap = useMemo(() => ({
    id: mapView.mapId,
    name: '',
    width: 40,
    height: 30,
    cellSize: 30,
    layers: [],
    labels: [],
    markers: [],
    dungeonData: mapView.dungeonData,
    seed: mapView.seed,
  }), [mapView.mapId, mapView.dungeonData, mapView.seed])

  // Wall segments + light sources populated after DungeonApp init
  const [wallSegments, setWallSegments] = useState<WallSegment[]>([])

  const onDungeonReady = useCallback((app: any) => {
    setWallSegments(extractDungeonWallSegments(app))
  }, [])

  // Pillars (colonnade columns) occlude torchlight just like walls do
  const wallSegmentsWithPillars = useMemo(
    () => [...wallSegments, ...extractColumnOccluders(mapView.dungeonData?.columns)],
    [wallSegments, mapView.dungeonData],
  )

  // Lighting settings synced from the GM (defaults applied if absent)
  const lighting = mapView.lighting ?? DEFAULT_LIGHTING
  // Radius multiplier — base radius (1x) is the floor; intensity only widens the light
  const radiusScale = Math.max(LIGHT_INTENSITY_MIN, lighting.intensity)
  // Flicker defaults on when the field is absent (older sessions)
  const flicker = lighting.flicker !== false

  // Derive light sources from tokens + light timers (in grid coordinates)
  const lightSources: MapLightSource[] = useMemo(() => {
    const sources: MapLightSource[] = []
    for (const timer of lightState.timers) {
      if (!timer.isActive || timer.isExpired) continue
      const token = mapView.tokens.find(t => t.referenceId === timer.carrierId)
      if (!token) continue
      // Base radius widened by the intensity multiplier; walls still occlude via raycasting.
      const radiusCells = (timer.range === 'double_near' ? 6 : 3) * radiusScale
      sources.push({
        x: token.gridX + 0.5,
        y: token.gridY + 0.5,
        radius: radiusCells,
        intensity: 1.0,
      })
    }
    return sources
  }, [lightState.timers, mapView.tokens, radiusScale])

  const exploredCells = useMemo(() => new Set<string>(), [])

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
      <div
        className="flex items-center justify-between px-3 py-2 bg-zinc-800 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-xs">{collapsed ? '\u25B6' : '\u25BC'}</span>
          <span className="text-sm font-medium text-zinc-200">Dungeon Map</span>
        </div>
        {lightSources.length > 0 && (
          <span className="text-xs text-amber-400">{lightSources.length} light source{lightSources.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {!collapsed && (
        <div className="relative h-[400px]">
          <div className="absolute inset-0">
            <MapRenderer
              mapData={mapData}
              tokens={mapView.tokens}
              wallSegments={wallSegmentsWithPillars}
              lightSources={lightSources}
              exploredCells={exploredCells}
              fogMode="player"
              darknessOpacity={lighting.darkness}
              flicker={flicker}
              viewport={viewport}
              onViewportChange={setViewport}
              onDungeonReady={onDungeonReady}
              centerOnTokenRef={myCharacterId}
              activeCombatantId={activeCombatantId}
              onTokenDragEnd={canMove ? handleSelfMove : undefined}
              draggableTokenRefId={myCharacterId}
              playerView
            />
          </div>

          {/* Self-move action tracker */}
          {selfMoveAllowed && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-zinc-900/90 border border-zinc-600 rounded px-2 py-1 text-xs select-none">
              <span className="text-amber-300 font-medium">{isMyTurn ? 'Tu turno' : 'Mover'}</span>
              {budgetActive ? (
                <span className="flex gap-1 items-center">
                  {Array.from({ length: s.actionsPerTurn }).map((_, i) => (
                    <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < actionsUsed ? 'bg-zinc-600' : 'bg-emerald-400'}`} title="Cada acción (mover o tirar dados) gasta una ficha" />
                  ))}
                  <span className="text-zinc-400 ml-1">arrastra · ≤{s.moveDistance}</span>
                  <button
                    onClick={() => onEndTurn?.()}
                    className="ml-1 px-1.5 py-0.5 rounded border border-amber-500 text-amber-300 hover:bg-amber-500/20"
                    title="Termina tu turno"
                  >Terminar turno</button>
                </span>
              ) : (
                <span className="text-zinc-400">arrastra tu ficha · ≤{s.moveDistance} casillas</span>
              )}
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            <button
              className="w-7 h-7 rounded bg-zinc-800/90 border border-zinc-600 text-zinc-200 text-lg font-bold hover:bg-zinc-700 flex items-center justify-center"
              onClick={() => setViewport(v => ({ ...v, zoom: Math.min(8, v.zoom * 1.3) }))}
            >+</button>
            <button
              className="w-7 h-7 rounded bg-zinc-800/90 border border-zinc-600 text-zinc-200 text-lg font-bold hover:bg-zinc-700 flex items-center justify-center"
              onClick={() => setViewport(v => ({ ...v, zoom: Math.max(0.25, v.zoom / 1.3) }))}
            >&minus;</button>
          </div>
        </div>
      )}
    </div>
  )
}
