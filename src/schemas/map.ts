// ── Dungeon Map (serialized from dungeon engine) ──

export interface CampaignMap {
  id: string
  name: string
  seed: number
  createdAt: number
  updatedAt: number
  /** Serialized dungeon data from App.serialize() */
  dungeonData: DungeonMapData | null
}

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
