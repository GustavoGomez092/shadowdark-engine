// ── Campaign Map ──

export interface CampaignMap {
  id: string
  name: string
  width: number
  height: number
  cellSize: number
  /** Wall thickness in pixels for export (default 4) */
  wallThickness?: number
  /** Wall render style for export */
  wallStyle?: WallStyle
  layers: MapLayer[]
  labels: MapLabel[]
  markers: MapMarker[]
}

export type WallStyle = 'line' | 'double' | 'stone' | 'brick'

export interface MapLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  cells: MapCell[]
}

export interface MapCell {
  x: number
  y: number
  terrain: TerrainType
  walls: WallConfig
  features: CellFeature[]
  /**
   * Split the cell diagonally into two terrain halves.
   * 'TLBR' splits from top-left to bottom-right:
   *   - top-left triangle uses `terrain`, bottom-right uses `splitTerrain`
   * 'TRBL' splits from top-right to bottom-left:
   *   - top-right triangle uses `terrain`, bottom-left uses `splitTerrain`
   */
  split?: 'TLBR' | 'TRBL'
  /** Terrain for the second half when split is set */
  splitTerrain?: TerrainType
}

export type TerrainType =
  | 'stone_floor' | 'stone_wall' | 'dirt' | 'water'
  | 'deep_water' | 'cave_floor' | 'cave_wall'
  | 'wooden_floor' | 'grass' | 'void'
  | 'sand' | 'cobblestone' | 'marble' | 'mud' | 'lava'
  | 'ice' | 'tiles'

export interface WallConfig {
  north: WallType
  east: WallType
  south: WallType
  west: WallType
  /** Diagonal from top-left to bottom-right */
  diagTLBR?: WallType
  /** Diagonal from top-right to bottom-left */
  diagTRBL?: WallType
}

export type WallType = 'none' | 'wall' | 'door' | 'secret_door' | 'arch' | 'bars' | 'window'

export type FurnitureVariant =
  | 'table' | 'chair' | 'chest' | 'barrel' | 'crate'
  | 'column' | 'statue' | 'altar' | 'fireplace' | 'forge'
  | 'bookshelf' | 'bed' | 'throne' | 'fountain' | 'well'
  | 'sarcophagus' | 'rubble' | 'pillar' | 'lever' | 'torch_sconce'
  | 'rug' | 'cauldron' | 'cage' | 'pit'

export type CellFeature =
  | { type: 'furniture'; variant: FurnitureVariant | string }
  | { type: 'trap'; trapId: string }
  | { type: 'stairs'; direction: 'up' | 'down' }
  | { type: 'entry' }
  | { type: 'exit' }
  | { type: 'custom'; icon: string; label: string }

export interface MapLabel {
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  color: string
}

export type MapMarkerType = 'room_number' | 'monster' | 'npc' | 'treasure' | 'trap' | 'note'

export interface MapMarker {
  id: string
  x: number
  y: number
  type: MapMarkerType
  label: string
  linkedId?: string
}
