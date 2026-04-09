import type { HpStatus } from './session.ts'
import type { DungeonMapData } from './map.ts'

// ── Token Representation ──

export interface MapToken {
  id: string
  type: 'character' | 'monster'
  referenceId: string        // character ID or monster instance ID
  name: string
  gridX: number
  gridY: number
  color: string              // ring color (e.g. '#3b82f6')
  size: number               // 1 = 1 cell, 2 = 2x2
  visible: boolean           // GM can hide tokens from players
  hpStatus?: HpStatus
}

// ── Wall Segment (for raycasting) ──

export interface WallSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

// ── Light Source (for visibility computation) ──

export interface MapLightSource {
  x: number                  // pixel center
  y: number
  radius: number             // pixels
  color?: string             // default warm yellow
  intensity: number          // 0-1
}

// ── Player-visible Map State (sent via P2P) ──

export interface PlayerMapViewState {
  mapId: string
  dungeonData: DungeonMapData   // full dungeon for DungeonApp rendering
  seed: number
  tokens: MapToken[]            // only tokens visible to this player
}

// ── GM-side Map Viewer State (persisted in session) ──

export interface MapViewerState {
  activeMapId: string | null
  tokens: MapToken[]
  exploredCells: string[]       // cumulative "x,y" keys
}
