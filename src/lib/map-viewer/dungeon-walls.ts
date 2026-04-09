/**
 * Extract wall segments from a DungeonApp's dungeon data for fog-of-war raycasting.
 *
 * Uses the EXACT same geometry as DungeonRenderer:
 * - Room floors: room rect shrunk by 1 grid unit on each side (rooms with both dims > 2)
 * - Corridors (any dim <= 2): full rect (they ARE the passage)
 * - Door cells: single cell at door position, bridges the 1-unit gap between rooms/corridors
 * - Walls: boundary edges where floor meets non-floor
 */

import type { WallSegment } from '@/schemas/map-viewer.ts'

/**
 * Extract wall segments from a DungeonApp instance.
 * Returns segments in grid-unit coordinates.
 */
export function extractDungeonWallSegments(app: any): WallSegment[] {
  const dungeon = app?.dungeon
  if (!dungeon) return []

  const rooms = dungeon.rooms?.filter((r: any) => !r.hidden) ?? []
  const doors = dungeon.doors ?? []

  // Build the floor grid using the renderer's exact geometry:
  // - Large rooms (both dims > 2): interior shrunk by 1 (matches _getRoomPoly)
  // - Small rooms / corridors (any dim <= 2): full rect (passage cells)
  // - Door cells: at door position (matches _getDoorPoly)
  const floor = new Set<string>()

  for (const room of rooms) {
    if (room.w > 2 && room.h > 2) {
      // Large room: floor = interior shrunk by 1 on each side
      // This matches DungeonRenderer._getRoomPoly: (room.x+1, room.y+1, room.w-2, room.h-2)
      for (let dy = 1; dy < room.h - 1; dy++)
        for (let dx = 1; dx < room.w - 1; dx++)
          floor.add(`${room.x + dx},${room.y + dy}`)
    } else {
      // Corridor: use full rect
      for (let dy = 0; dy < room.h; dy++)
        for (let dx = 0; dx < room.w; dx++)
          floor.add(`${room.x + dx},${room.y + dy}`)
    }
  }

  // Door cells bridge the gap between shrunk room interiors and corridors
  // This matches DungeonRenderer._getDoorPoly: single cell at (door.x, door.y)
  for (const door of doors) {
    floor.add(`${door.x},${door.y}`)
  }

  // Extract wall segments: edges where floor meets non-floor
  const segSet = new Set<string>()
  const segments: WallSegment[] = []

  for (const cellKey of floor) {
    const [cx, cy] = cellKey.split(',').map(Number)
    const edges = [
      { nx: cx, ny: cy - 1, x1: cx, y1: cy, x2: cx + 1, y2: cy },         // north
      { nx: cx + 1, ny: cy, x1: cx + 1, y1: cy, x2: cx + 1, y2: cy + 1 }, // east
      { nx: cx, ny: cy + 1, x1: cx, y1: cy + 1, x2: cx + 1, y2: cy + 1 }, // south
      { nx: cx - 1, ny: cy, x1: cx, y1: cy, x2: cx, y2: cy + 1 },         // west
    ]
    for (const edge of edges) {
      if (floor.has(`${edge.nx},${edge.ny}`)) continue // neighbor is floor, no wall
      const k = `${edge.x1},${edge.y1},${edge.x2},${edge.y2}`
      if (segSet.has(k)) continue
      segSet.add(k)
      segments.push({ x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2 })
    }
  }

  return mergeCollinear(segments)
}

/** Merge collinear segments sharing an endpoint */
function mergeCollinear(segments: WallSegment[]): WallSegment[] {
  const horizontals = new Map<number, Array<[number, number]>>()
  const verticals = new Map<number, Array<[number, number]>>()

  for (const seg of segments) {
    if (seg.y1 === seg.y2) {
      const y = seg.y1
      if (!horizontals.has(y)) horizontals.set(y, [])
      horizontals.get(y)!.push([Math.min(seg.x1, seg.x2), Math.max(seg.x1, seg.x2)])
    } else if (seg.x1 === seg.x2) {
      const x = seg.x1
      if (!verticals.has(x)) verticals.set(x, [])
      verticals.get(x)!.push([Math.min(seg.y1, seg.y2), Math.max(seg.y1, seg.y2)])
    }
  }

  const merged: WallSegment[] = []

  for (const [y, spans] of horizontals) {
    spans.sort((a, b) => a[0] - b[0])
    let [s, e] = spans[0]
    for (let i = 1; i < spans.length; i++) {
      if (spans[i][0] <= e) { e = Math.max(e, spans[i][1]) }
      else { merged.push({ x1: s, y1: y, x2: e, y2: y }); s = spans[i][0]; e = spans[i][1] }
    }
    merged.push({ x1: s, y1: y, x2: e, y2: y })
  }

  for (const [x, spans] of verticals) {
    spans.sort((a, b) => a[0] - b[0])
    let [s, e] = spans[0]
    for (let i = 1; i < spans.length; i++) {
      if (spans[i][0] <= e) { e = Math.max(e, spans[i][1]) }
      else { merged.push({ x1: x, y1: s, x2: x, y2: e }); s = spans[i][0]; e = spans[i][1] }
    }
    merged.push({ x1: x, y1: s, x2: x, y2: e })
  }

  return merged
}
