// ── Terrain & Wall Types ──

export type TerrainType =
  | 'stone_floor' | 'stone_wall' | 'dirt' | 'water' | 'deep_water'
  | 'cave_floor' | 'cave_wall' | 'wooden_floor' | 'grass' | 'void'
  | 'sand' | 'cobblestone' | 'marble' | 'mud' | 'lava' | 'ice' | 'tiles'

export type WallType = 'none' | 'wall' | 'door' | 'secret_door' | 'window' | 'arch'

// ── Cell Features ──

export interface CellFeature {
  type: 'stairs' | 'entry' | 'exit' | 'trap' | 'furniture'
  direction?: 'up' | 'down'
  variant?: string
}

// ── Map Cell ──

export interface MapCell {
  x: number
  y: number
  terrain: TerrainType
  walls: {
    north: WallType
    east: WallType
    south: WallType
    west: WallType
    diagTLBR?: WallType
    diagTRBL?: WallType
  }
  features: CellFeature[]
  split?: 'TLBR' | 'TRBL'
  splitTerrain?: TerrainType
}

// ── Map Layer ──

export interface MapLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  cells: MapCell[]
}

// ── Labels & Markers ──

export interface MapLabel {
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  color?: string
}

export type MarkerType = 'room_number' | 'monster' | 'npc' | 'treasure' | 'trap' | 'note'

export interface MapMarker {
  id: string
  x: number
  y: number
  type: MarkerType
  label: string
}

// ── Campaign Map (grid-based) ──

export interface CampaignMap {
  id: string
  name: string
  seed?: number
  createdAt?: number
  updatedAt?: number
  /** Grid-based map fields */
  width: number
  height: number
  cellSize: number
  wallThickness?: number
  wallStyle?: string
  layers: MapLayer[]
  labels: MapLabel[]
  markers: MapMarker[]
  /** Legacy: serialized dungeon data from watabou renderer */
  dungeonData?: DungeonMapData | null
}

// ── Dungeon Map (serialized from dungeon engine) ──

/** The full serialized state of a dungeon — rooms, doors, notes, story, editor settings */
export interface DungeonMapData {
  version: string
  title: string
  story: string
  rects: DungeonRect[]
  doors: DungeonDoor[]
  notes: DungeonNote[]
  columns: { x: number, y: number }[]
  water: unknown[]
  editorState?: {
    noteOverrides: Record<string, { x: number, y: number }>
    rotation: number
    palette: string
    showGrid: boolean
    showWater: boolean
    showProps: boolean
    showNotes: boolean
    showSecrets: boolean
    showTitle: boolean
    bw: boolean
  }
}

export interface DungeonRect {
  x: number
  y: number
  w: number
  h: number
  rotunda?: boolean
  hidden?: boolean
  ending?: boolean
}

export interface DungeonDoor {
  x: number
  y: number
  dir: { x: number, y: number } | null
  type: number
}

export interface DungeonNote {
  text: string
  ref: string
  pos: { x: number, y: number }
}
