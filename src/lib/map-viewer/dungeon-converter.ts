/**
 * Converts watabou DungeonMapData (rects/doors) into cell-based MapLayer format
 * so it can be rendered by the map viewer and used for fog-of-war raycasting.
 */

import type { DungeonMapData, MapCell, MapLayer, WallType, CampaignMap } from '@/schemas/map.ts'
import { generateId } from '@/lib/utils/id.ts'

/** Watabou door types → our wall types */
function doorTypeToWall(type: number): WallType {
  switch (type) {
    case 0: return 'door'     // regular door
    case 1: return 'arch'     // archway
    case 2: return 'secret_door'
    case 3: return 'arch'     // entrance (open)
    case 5: return 'door'     // boss door
    case 7: return 'door'     // barred door
    case 8: return 'arch'     // stairs down (open passage)
    case 9: return 'arch'     // steps (open passage)
    default: return 'door'
  }
}

/**
 * Convert a CampaignMap's dungeonData into cell-based layers.
 * Returns a new CampaignMap with populated layers, or the original if no conversion needed.
 */
export function ensureMapHasCells(map: CampaignMap): CampaignMap {
  // Already has cells? No conversion needed
  const cellCount = map.layers.reduce((sum, l) => sum + l.cells.length, 0)
  if (cellCount > 0) return map

  // No dungeonData to convert from? Return as-is
  if (!map.dungeonData || !map.dungeonData.rects || map.dungeonData.rects.length === 0) return map

  const { cells, width, height } = convertDungeonDataToCells(map.dungeonData)

  const layer: MapLayer = {
    id: generateId(),
    name: 'Dungeon',
    visible: true,
    locked: false,
    cells,
  }

  return {
    ...map,
    width,
    height,
    cellSize: map.cellSize || 30,
    layers: [layer],
    labels: map.labels.length > 0 ? map.labels : [],
    markers: map.markers.length > 0 ? map.markers : [],
  }
}

function convertDungeonDataToCells(data: DungeonMapData): { cells: MapCell[], width: number, height: number } {
  const rects = data.rects
  const doors = data.doors

  // Find coordinate bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const r of rects) {
    if (r.x < minX) minX = r.x
    if (r.x + r.w > maxX) maxX = r.x + r.w
    if (r.y < minY) minY = r.y
    if (r.y + r.h > maxY) maxY = r.y + r.h
  }

  // Add padding
  const pad = 2
  const offsetX = -minX + pad
  const offsetY = -minY + pad
  const width = maxX - minX + pad * 2
  const height = maxY - minY + pad * 2

  // Build a boolean grid: true = floor
  const grid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false))

  for (const r of rects) {
    if (r.hidden) continue
    for (let dy = 0; dy < r.h; dy++) {
      for (let dx = 0; dx < r.w; dx++) {
        const gx = r.x + dx + offsetX
        const gy = r.y + dy + offsetY
        if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
          grid[gy][gx] = true
        }
      }
    }
  }

  // Build door lookup: "x,y,dir" → wall type
  // Door position is in dungeon coordinates; dir indicates which wall the door is on
  const doorMap = new Map<string, WallType>()
  for (const door of doors) {
    const gx = door.x + offsetX
    const gy = door.y + offsetY
    const wallType = doorTypeToWall(door.type)

    if (door.dir) {
      // dir indicates the direction the door faces
      // dir.y=-1 means door on north wall of cell
      // dir.y=1 means door on south wall
      // dir.x=-1 means door on west wall
      // dir.x=1 means door on east wall
      if (door.dir.y === -1) doorMap.set(`${gx},${gy},north`, wallType)
      else if (door.dir.y === 1) doorMap.set(`${gx},${gy},south`, wallType)
      else if (door.dir.x === -1) doorMap.set(`${gx},${gy},west`, wallType)
      else if (door.dir.x === 1) doorMap.set(`${gx},${gy},east`, wallType)
    } else {
      // No direction — place door on any wall edge that borders void
      doorMap.set(`${gx},${gy},any`, wallType)
    }
  }

  // Create cells with walls
  const cells: MapCell[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grid[y][x]) continue

      const n = y > 0 && grid[y - 1][x]
      const s = y < height - 1 && grid[y + 1][x]
      const e = x < width - 1 && grid[y][x + 1]
      const w = x > 0 && grid[y][x - 1]

      // Default walls: wall if neighbor is void, none if neighbor is floor
      let wallN: WallType = n ? 'none' : 'wall'
      let wallS: WallType = s ? 'none' : 'wall'
      let wallE: WallType = e ? 'none' : 'wall'
      let wallW: WallType = w ? 'none' : 'wall'

      // Apply door overrides
      const doorN = doorMap.get(`${x},${y},north`)
      const doorS = doorMap.get(`${x},${y},south`)
      const doorE = doorMap.get(`${x},${y},east`)
      const doorW = doorMap.get(`${x},${y},west`)
      const doorAny = doorMap.get(`${x},${y},any`)

      if (doorN) wallN = doorN
      if (doorS) wallS = doorS
      if (doorE) wallE = doorE
      if (doorW) wallW = doorW

      // "any" direction: apply to first wall edge found
      if (doorAny) {
        if (wallN === 'wall') wallN = doorAny
        else if (wallS === 'wall') wallS = doorAny
        else if (wallE === 'wall') wallE = doorAny
        else if (wallW === 'wall') wallW = doorAny
      }

      cells.push({
        x, y,
        terrain: 'stone_floor',
        walls: { north: wallN, east: wallE, south: wallS, west: wallW },
        features: [],
      })
    }
  }

  return { cells, width, height }
}
