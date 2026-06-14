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

// ── Lighting Settings (GM-controlled, synced to players) ──

export interface MapLightingSettings {
  intensity: number   // radius multiplier (>= 1): 1 = each light's base radius, higher = wider
  darkness: number    // 0-1, opacity of the unlit darkness/fog fill
  flicker: boolean    // animate a subtle torch flicker on lit areas
}

// Light radius multiplier range. The base radius (1x) is the minimum; intensity
// only expands the lit area outward from there.
export const LIGHT_INTENSITY_MIN = 1
export const LIGHT_INTENSITY_MAX = 3

export const DEFAULT_LIGHTING: MapLightingSettings = {
  intensity: LIGHT_INTENSITY_MIN,
  darkness: 1,
  flicker: true,
}

// ── Player-visible Map State (sent via P2P) ──

export interface PlayerMapViewState {
  mapId: string
  dungeonData: DungeonMapData   // full dungeon for DungeonApp rendering
  seed: number
  tokens: MapToken[]            // only tokens visible to this player
  lighting?: MapLightingSettings // GM lighting settings (defaults applied if absent)
}

// ── GM-side Map Viewer State (persisted in session) ──

export interface MapViewerState {
  activeMapId: string | null
  tokens: MapToken[]
  exploredCells: string[]       // cumulative "x,y" keys
  lighting?: MapLightingSettings // GM lighting settings (defaults applied if absent)
}
