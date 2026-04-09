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
import type { LightState } from '@/schemas/light.ts'
import type { CampaignMap } from '@/schemas/map.ts'
import { MapRenderer, type MapViewport } from './map-renderer.tsx'
import { extractDungeonWallSegments } from '@/lib/map-viewer/dungeon-walls.ts'

const DEFAULT_ZOOM = 4

interface Props {
  mapView: PlayerMapViewState
  lightState: LightState
  myCharacterId?: string
}

export function PlayerMapViewer({ mapView, lightState, myCharacterId }: Props) {
  const [viewport, setViewport] = useState<MapViewport>({ offsetX: 0, offsetY: 0, zoom: DEFAULT_ZOOM })
  const [collapsed, setCollapsed] = useState(false)

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

  // Derive light sources from tokens + light timers (in grid coordinates)
  const lightSources: MapLightSource[] = useMemo(() => {
    const sources: MapLightSource[] = []
    for (const timer of lightState.timers) {
      if (!timer.isActive || timer.isExpired) continue
      const token = mapView.tokens.find(t => t.referenceId === timer.carrierId)
      if (!token) continue
      const radiusCells = timer.range === 'double_near' ? 6 : 3
      sources.push({
        x: token.gridX + 0.5,
        y: token.gridY + 0.5,
        radius: radiusCells,
        intensity: 1.0,
      })
    }
    return sources
  }, [lightState.timers, mapView.tokens])

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
              wallSegments={wallSegments}
              lightSources={lightSources}
              exploredCells={exploredCells}
              fogMode="player"
              viewport={viewport}
              onViewportChange={setViewport}
              onDungeonReady={onDungeonReady}
              centerOnTokenRef={myCharacterId}
              playerView
            />
          </div>

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
