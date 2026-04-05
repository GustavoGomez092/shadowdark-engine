/**
 * Procedural One-Shot Dungeon Generator
 * Inspired by watabou's One Page Dungeon and Dungeon.js
 *
 * Generates a complete dungeon map with rooms, corridors, doors,
 * and room numbers — written to the CampaignMap data model.
 */

import { generateId } from '@/lib/utils/id.ts'
import type { CampaignMap, MapCell, MapLayer, MapMarker, WallType } from '@/schemas/map.ts'
import type { TerrainType } from '@/schemas/map.ts'

// ── Seeded RNG (LCG — same approach as Dungeon.js) ──
function createRng(seed: number) {
  let s = seed & 0x7fffffff || 1
  return {
    next() { s = (48271 * s) % 2147483647; return (s & 0x7fffffff) / 2147483647 },
    nextInt(min: number, max: number) { return min + Math.floor(this.next() * (max - min + 1)) },
    pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)] },
    chance(p: number) { return this.next() < p },
  }
}

// ── Room and corridor types ──
interface Room {
  id: string
  x: number; y: number
  w: number; h: number
  connected: string[]
  isCorridorNode?: boolean
}

interface Door {
  x: number; y: number
  type: 'door' | 'arch' | 'secret_door'
  horizontal: boolean // true = door on horizontal wall (N/S)
}

export interface DungeonConfig {
  seed: number
  width: number
  height: number
  cellSize: number
  roomCount: number       // target number of rooms (3-20)
  roomMinSize: number     // min room dimension in cells (2-5)
  roomMaxSize: number     // max room dimension in cells (4-10)
  corridorWidth: number   // 1 or 2 cells wide
  density: 'sparse' | 'normal' | 'dense'
  addLoops: boolean       // add shortcut corridors between distant rooms
  addSecretRooms: boolean
  floorTerrain: TerrainType
  corridorTerrain: TerrainType
  waterChance: number     // 0-1, chance to add water features
}

export const DEFAULT_CONFIG: DungeonConfig = {
  seed: Date.now(),
  width: 40,
  height: 30,
  cellSize: 40,
  roomCount: 8,
  roomMinSize: 3,
  roomMaxSize: 7,
  corridorWidth: 1,
  density: 'normal',
  addLoops: true,
  addSecretRooms: true,
  floorTerrain: 'stone_floor',
  corridorTerrain: 'stone_floor',
  waterChance: 0.1,
}

// ── Main Generator ──
export function generateDungeon(config: DungeonConfig): CampaignMap {
  const rng = createRng(config.seed)
  const { width, height } = config
  const padding = 2 // cells of padding around edges

  // Grid: 0=void, 1=floor, 2=corridor
  const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(0))
  const rooms: Room[] = []
  const doors: Door[] = []

  // ── Phase 1: Place rooms ──
  const maxAttempts = config.roomCount * 20
  let attempts = 0

  while (rooms.length < config.roomCount && attempts < maxAttempts) {
    attempts++
    const w = rng.nextInt(config.roomMinSize, config.roomMaxSize)
    const h = rng.nextInt(config.roomMinSize, config.roomMaxSize)
    // Make some rooms odd-sized for variety
    const rw = rng.chance(0.3) ? w | 1 : w
    const rh = rng.chance(0.3) ? h | 1 : h

    const x = rng.nextInt(padding, width - rw - padding)
    const y = rng.nextInt(padding, height - rh - padding)

    // Check overlap with existing rooms (with 1-cell spacing)
    const spacing = config.density === 'dense' ? 1 : config.density === 'sparse' ? 3 : 2
    let overlaps = false
    for (const room of rooms) {
      if (x < room.x + room.w + spacing && x + rw + spacing > room.x &&
          y < room.y + room.h + spacing && y + rh + spacing > room.y) {
        overlaps = true
        break
      }
    }
    if (overlaps) continue

    rooms.push({ id: generateId(), x, y, w: rw, h: rh, connected: [] })

    // Carve room into grid
    for (let ry = y; ry < y + rh; ry++) {
      for (let rx = x; rx < x + rw; rx++) {
        grid[ry][rx] = 1
      }
    }
  }

  if (rooms.length < 2) {
    // Fallback: ensure at least 2 rooms
    rooms.push({ id: generateId(), x: 3, y: 3, w: 5, h: 4, connected: [] })
    rooms.push({ id: generateId(), x: 15, y: 10, w: 4, h: 5, connected: [] })
    for (const r of rooms) {
      for (let ry = r.y; ry < r.y + r.h; ry++)
        for (let rx = r.x; rx < r.x + r.w; rx++)
          if (ry >= 0 && ry < height && rx >= 0 && rx < width) grid[ry][rx] = 1
    }
  }

  // ── Phase 2: Build spanning tree of corridors ──
  // Sort rooms by position for deterministic tree
  const sortedRooms = [...rooms].sort((a, b) => (a.x + a.y * 100) - (b.x + b.y * 100))
  const connected = new Set<string>([sortedRooms[0].id])
  const unconnected = new Set<string>(sortedRooms.slice(1).map(r => r.id))

  while (unconnected.size > 0) {
    let bestDist = Infinity
    let bestFrom: Room | null = null
    let bestTo: Room | null = null

    // Find closest unconnected room to any connected room
    for (const cid of connected) {
      const from = rooms.find(r => r.id === cid)!
      for (const uid of unconnected) {
        const to = rooms.find(r => r.id === uid)!
        const cx1 = from.x + from.w / 2, cy1 = from.y + from.h / 2
        const cx2 = to.x + to.w / 2, cy2 = to.y + to.h / 2
        const dist = Math.abs(cx1 - cx2) + Math.abs(cy1 - cy2) // Manhattan
        if (dist < bestDist) {
          bestDist = dist
          bestFrom = from
          bestTo = to
        }
      }
    }

    if (!bestFrom || !bestTo) break

    // Connect with L-shaped corridor
    carveCorridor(grid, bestFrom, bestTo, config.corridorWidth, width, height, rng, doors)
    bestFrom.connected.push(bestTo.id)
    bestTo.connected.push(bestFrom.id)
    connected.add(bestTo.id)
    unconnected.delete(bestTo.id)
  }

  // ── Phase 3: Add loop corridors (shortcuts) ──
  if (config.addLoops && rooms.length > 4) {
    const loopCount = rng.nextInt(1, Math.min(3, Math.floor(rooms.length / 3)))
    for (let i = 0; i < loopCount; i++) {
      const a = rng.pick(rooms)
      const b = rng.pick(rooms)
      if (a.id === b.id) continue
      if (a.connected.includes(b.id)) continue
      carveCorridor(grid, a, b, config.corridorWidth, width, height, rng, doors)
      a.connected.push(b.id)
      b.connected.push(a.id)
    }
  }

  // ── Phase 4: Add secret room ──
  if (config.addSecretRooms && rooms.length > 3 && rng.chance(0.6)) {
    const parent = rng.pick(rooms)
    const sw = rng.nextInt(2, 3), sh = rng.nextInt(2, 3)
    const dirs = [
      { x: parent.x - sw - 1, y: parent.y },
      { x: parent.x + parent.w + 1, y: parent.y },
      { x: parent.x, y: parent.y - sh - 1 },
      { x: parent.x, y: parent.y + parent.h + 1 },
    ].filter(d => d.x >= 1 && d.y >= 1 && d.x + sw < width - 1 && d.y + sh < height - 1)

    if (dirs.length > 0) {
      const pos = rng.pick(dirs)
      let canPlace = true
      for (let ry = pos.y; ry < pos.y + sh; ry++)
        for (let rx = pos.x; rx < pos.x + sw; rx++)
          if (grid[ry]?.[rx] !== 0) canPlace = false

      if (canPlace) {
        for (let ry = pos.y; ry < pos.y + sh; ry++)
          for (let rx = pos.x; rx < pos.x + sw; rx++)
            grid[ry][rx] = 1
        rooms.push({ id: generateId(), x: pos.x, y: pos.y, w: sw, h: sh, connected: [parent.id] })
        // Secret door between parent and secret room
        const dx = pos.x > parent.x ? parent.x + parent.w : pos.x === parent.x ? pos.x : pos.x + sw
        const dy = pos.y > parent.y ? parent.y + parent.h : pos.y === parent.y ? pos.y : pos.y + sh
        const cx = Math.max(Math.min(parent.x + parent.w - 1, pos.x + sw - 1), Math.max(parent.x, pos.x))
        const cy = Math.max(Math.min(parent.y + parent.h - 1, pos.y + sh - 1), Math.max(parent.y, pos.y))
        // Carve 1-cell connection
        if (dx >= 0 && dx < width && dy >= 0 && dy < height) grid[dy][dx] = 2
        doors.push({ x: cx, y: cy, type: 'secret_door', horizontal: pos.y !== parent.y })
      }
    }
  }

  // ── Phase 5: Add water features ──
  if (config.waterChance > 0) {
    for (const room of rooms) {
      if (!rng.chance(config.waterChance)) continue
      // Flood part of the room with water
      const waterCells = Math.floor(room.w * room.h * (0.2 + rng.next() * 0.4))
      let placed = 0
      const cx = room.x + Math.floor(room.w / 2), cy = room.y + Math.floor(room.h / 2)
      // BFS from center
      const queue = [[cx, cy]]
      const visited = new Set<string>()
      while (queue.length > 0 && placed < waterCells) {
        const [qx, qy] = queue.shift()!
        const key = `${qx},${qy}`
        if (visited.has(key)) continue
        visited.add(key)
        if (qx < room.x || qx >= room.x + room.w || qy < room.y || qy >= room.y + room.h) continue
        if (grid[qy][qx] !== 1) continue
        grid[qy][qx] = 3 // water
        placed++
        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
        for (const [ddx, ddy] of dirs) {
          if (rng.chance(0.7)) queue.push([qx + ddx, qy + ddy])
        }
      }
    }
  }

  // ── Phase 6: Convert grid to CampaignMap ──
  const cells: MapCell[] = []
  const markers: MapMarker[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = grid[y][x]
      if (val === 0) continue

      const terrain: TerrainType = val === 3 ? 'water' : val === 2 ? config.corridorTerrain : config.floorTerrain

      // Detect walls: a wall exists on an edge if the neighbor is void (0)
      const n = y > 0 ? grid[y - 1][x] : 0
      const s = y < height - 1 ? grid[y + 1][x] : 0
      const e = x < width - 1 ? grid[y][x + 1] : 0
      const w = x > 0 ? grid[y][x - 1] : 0

      const wallN: WallType = n === 0 ? 'wall' : 'none'
      const wallS: WallType = s === 0 ? 'wall' : 'none'
      const wallE: WallType = e === 0 ? 'wall' : 'none'
      const wallW: WallType = w === 0 ? 'wall' : 'none'

      cells.push({
        x, y, terrain,
        walls: { north: wallN, east: wallE, south: wallS, west: wallW },
        features: [],
      })
    }
  }

  // Apply doors — replace wall segments with door/arch/secret_door
  for (const door of doors) {
    const cell = cells.find(c => c.x === door.x && c.y === door.y)
    if (!cell) continue
    if (door.horizontal) {
      if (cell.walls.north === 'wall') cell.walls.north = door.type
      else if (cell.walls.south === 'wall') cell.walls.south = door.type
    } else {
      if (cell.walls.west === 'wall') cell.walls.west = door.type
      else if (cell.walls.east === 'wall') cell.walls.east = door.type
    }
  }

  // Add room number markers
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i]
    if (room.w <= 1 || room.h <= 1) continue
    markers.push({
      id: generateId(),
      x: (room.x + room.w / 2) * config.cellSize,
      y: (room.y + room.h / 2) * config.cellSize,
      type: 'room_number',
      label: String(i + 1),
    })
  }

  // Build the map
  const layer: MapLayer = {
    id: generateId(),
    name: 'Base',
    visible: true,
    locked: false,
    cells,
  }

  return {
    id: generateId(),
    name: `Generated Dungeon #${config.seed % 10000}`,
    width,
    height,
    cellSize: config.cellSize,
    wallThickness: 5,
    wallStyle: 'stone',
    layers: [layer],
    labels: [],
    markers,
  }
}

// ── Corridor Carving ──
function carveCorridor(
  grid: number[][], from: Room, to: Room,
  corridorWidth: number, mapW: number, mapH: number,
  rng: ReturnType<typeof createRng>, doors: Door[],
) {
  // L-shaped corridor: horizontal then vertical (or vice versa)
  const fx = from.x + Math.floor(from.w / 2)
  const fy = from.y + Math.floor(from.h / 2)
  const tx = to.x + Math.floor(to.w / 2)
  const ty = to.y + Math.floor(to.h / 2)

  const horizontalFirst = rng.chance(0.5)

  if (horizontalFirst) {
    carveHLine(grid, fx, tx, fy, corridorWidth, mapW, mapH)
    carveVLine(grid, fy, ty, tx, corridorWidth, mapW, mapH)
  } else {
    carveVLine(grid, fy, ty, fx, corridorWidth, mapW, mapH)
    carveHLine(grid, fx, tx, ty, corridorWidth, mapW, mapH)
  }

  // Place doors at room edges
  const fromEdgeX = fx < tx ? from.x + from.w : from.x - 1
  const fromEdgeY = fy < ty ? from.y + from.h : from.y - 1
  if (horizontalFirst) {
    if (fromEdgeX >= 0 && fromEdgeX < mapW && fy >= 0 && fy < mapH && grid[fy][fromEdgeX] !== 0) {
      doors.push({ x: fromEdgeX, y: fy, type: rng.chance(0.3) ? 'arch' : 'door', horizontal: false })
    }
  } else {
    if (fx >= 0 && fx < mapW && fromEdgeY >= 0 && fromEdgeY < mapH && grid[fromEdgeY][fx] !== 0) {
      doors.push({ x: fx, y: fromEdgeY, type: rng.chance(0.3) ? 'arch' : 'door', horizontal: true })
    }
  }
}

function carveHLine(grid: number[][], x1: number, x2: number, y: number, w: number, mapW: number, mapH: number) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2)
  for (let x = minX; x <= maxX; x++) {
    for (let dy = 0; dy < w; dy++) {
      const cy = y + dy
      if (x >= 0 && x < mapW && cy >= 0 && cy < mapH && grid[cy][x] === 0) {
        grid[cy][x] = 2
      }
    }
  }
}

function carveVLine(grid: number[][], y1: number, y2: number, x: number, w: number, mapW: number, mapH: number) {
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2)
  for (let y = minY; y <= maxY; y++) {
    for (let dx = 0; dx < w; dx++) {
      const cx = x + dx
      if (cx >= 0 && cx < mapW && y >= 0 && y < mapH && grid[y][cx] === 0) {
        grid[y][cx] = 2
      }
    }
  }
}
