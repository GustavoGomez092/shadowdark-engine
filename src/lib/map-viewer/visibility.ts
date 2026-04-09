/**
 * Raycasting Visibility Engine
 *
 * Computes visibility polygons from light sources against wall segments.
 * Based on the Red Blob Games / Nicky Case 2D visibility algorithm.
 */

import type { MapLayer, WallType } from '@/schemas/map.ts'
import type { WallSegment, MapLightSource } from '@/schemas/map-viewer.ts'

// ── Wall Segment Extraction ──

/** Wall types that block light */
function blocksLight(type: WallType): boolean {
  return type === 'wall' || type === 'secret_door' || type === 'window'
}

/**
 * Extract wall segments from map layers.
 * Deduplicates shared edges and merges collinear segments.
 * Run once per map load and cache the result.
 */
export function extractWallSegments(layers: MapLayer[], cellSize: number): WallSegment[] {
  // Collect raw segments, deduplicating shared edges
  const segSet = new Set<string>()
  const rawSegments: WallSegment[] = []

  for (const layer of layers) {
    if (!layer.visible) continue
    for (const cell of layer.cells) {
      const x0 = cell.x * cellSize
      const y0 = cell.y * cellSize
      const x1 = x0 + cellSize
      const y1 = y0 + cellSize

      const edges: Array<{ wall: WallType, seg: WallSegment }> = [
        { wall: cell.walls.north, seg: { x1: x0, y1: y0, x2: x1, y2: y0 } },
        { wall: cell.walls.east,  seg: { x1: x1, y1: y0, x2: x1, y2: y1 } },
        { wall: cell.walls.south, seg: { x1: x0, y1: y1, x2: x1, y2: y1 } },
        { wall: cell.walls.west,  seg: { x1: x0, y1: y0, x2: x0, y2: y1 } },
      ]

      // Diagonal walls
      if (cell.walls.diagTLBR && blocksLight(cell.walls.diagTLBR)) {
        edges.push({ wall: cell.walls.diagTLBR, seg: { x1: x0, y1: y0, x2: x1, y2: y1 } })
      }
      if (cell.walls.diagTRBL && blocksLight(cell.walls.diagTRBL)) {
        edges.push({ wall: cell.walls.diagTRBL, seg: { x1: x1, y1: y0, x2: x0, y2: y1 } })
      }

      for (const { wall, seg } of edges) {
        if (!blocksLight(wall)) continue
        // Normalize key: sort endpoints for dedup
        const key = seg.x1 <= seg.x2 || (seg.x1 === seg.x2 && seg.y1 <= seg.y2)
          ? `${seg.x1},${seg.y1},${seg.x2},${seg.y2}`
          : `${seg.x2},${seg.y2},${seg.x1},${seg.y1}`
        if (segSet.has(key)) continue
        segSet.add(key)
        rawSegments.push(seg)
      }
    }
  }

  return mergeCollinearSegments(rawSegments)
}

/**
 * Merge collinear wall segments that share an endpoint on the same axis.
 * Reduces segment count significantly for grid-based maps.
 */
function mergeCollinearSegments(segments: WallSegment[]): WallSegment[] {
  // Group by orientation + axis position
  const horizontals = new Map<number, Array<[number, number]>>() // y -> [x1, x2] pairs
  const verticals = new Map<number, Array<[number, number]>>()   // x -> [y1, y2] pairs
  const diagonals: WallSegment[] = []

  for (const seg of segments) {
    if (seg.y1 === seg.y2) {
      // Horizontal
      const y = seg.y1
      if (!horizontals.has(y)) horizontals.set(y, [])
      const minX = Math.min(seg.x1, seg.x2)
      const maxX = Math.max(seg.x1, seg.x2)
      horizontals.get(y)!.push([minX, maxX])
    } else if (seg.x1 === seg.x2) {
      // Vertical
      const x = seg.x1
      if (!verticals.has(x)) verticals.set(x, [])
      const minY = Math.min(seg.y1, seg.y2)
      const maxY = Math.max(seg.y1, seg.y2)
      verticals.get(x)!.push([minY, maxY])
    } else {
      diagonals.push(seg)
    }
  }

  const merged: WallSegment[] = []

  // Merge horizontal segments on same Y
  for (const [y, spans] of horizontals) {
    spans.sort((a, b) => a[0] - b[0])
    let [curStart, curEnd] = spans[0]
    for (let i = 1; i < spans.length; i++) {
      const [start, end] = spans[i]
      if (start <= curEnd) {
        curEnd = Math.max(curEnd, end)
      } else {
        merged.push({ x1: curStart, y1: y, x2: curEnd, y2: y })
        curStart = start
        curEnd = end
      }
    }
    merged.push({ x1: curStart, y1: y, x2: curEnd, y2: y })
  }

  // Merge vertical segments on same X
  for (const [x, spans] of verticals) {
    spans.sort((a, b) => a[0] - b[0])
    let [curStart, curEnd] = spans[0]
    for (let i = 1; i < spans.length; i++) {
      const [start, end] = spans[i]
      if (start <= curEnd) {
        curEnd = Math.max(curEnd, end)
      } else {
        merged.push({ x1: x, y1: curStart, x2: x, y2: curEnd })
        curStart = start
        curEnd = end
      }
    }
    merged.push({ x1: x, y1: curStart, x2: x, y2: curEnd })
  }

  // Diagonals can't be easily merged
  merged.push(...diagonals)

  return merged
}

// ── Visibility Polygon Computation ──

interface Point {
  x: number
  y: number
}

const EPSILON = 0.0001

/**
 * Compute the visibility polygon from a point source against wall segments.
 * Returns polygon vertices in angle-sorted order (clockwise).
 */
export function computeVisibilityPolygon(
  origin: Point,
  radius: number,
  segments: WallSegment[],
): Point[] {
  // Filter to segments within range (spatial culling)
  const maxDist = radius * 1.5
  const nearSegments = segments.filter(seg => {
    // Quick bounding box check
    const minX = Math.min(seg.x1, seg.x2)
    const maxX = Math.max(seg.x1, seg.x2)
    const minY = Math.min(seg.y1, seg.y2)
    const maxY = Math.max(seg.y1, seg.y2)
    return !(maxX < origin.x - maxDist || minX > origin.x + maxDist ||
             maxY < origin.y - maxDist || minY > origin.y + maxDist)
  })

  // Add bounding box as clipping segments
  const bound: WallSegment[] = [
    { x1: origin.x - radius, y1: origin.y - radius, x2: origin.x + radius, y2: origin.y - radius },
    { x1: origin.x + radius, y1: origin.y - radius, x2: origin.x + radius, y2: origin.y + radius },
    { x1: origin.x + radius, y1: origin.y + radius, x2: origin.x - radius, y2: origin.y + radius },
    { x1: origin.x - radius, y1: origin.y + radius, x2: origin.x - radius, y2: origin.y - radius },
  ]
  const allSegments = [...nearSegments, ...bound]

  // Collect unique angles to all segment endpoints
  const angles: number[] = []
  const uniqueAngles = new Set<number>()

  for (const seg of allSegments) {
    for (const p of [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }]) {
      const angle = Math.atan2(p.y - origin.y, p.x - origin.x)
      // Cast 3 rays per endpoint: at the angle, and slightly offset
      for (const a of [angle - EPSILON, angle, angle + EPSILON]) {
        // Round to avoid floating point duplicates
        const rounded = Math.round(a * 1000000) / 1000000
        if (!uniqueAngles.has(rounded)) {
          uniqueAngles.add(rounded)
          angles.push(a)
        }
      }
    }
  }

  angles.sort((a, b) => a - b)

  // Cast ray at each angle, find closest intersection
  const points: Array<{ angle: number, point: Point }> = []

  for (const angle of angles) {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)

    // Ray from origin in direction (dx, dy)
    let closestDist = Infinity
    let closestPoint: Point | null = null

    for (const seg of allSegments) {
      const hit = raySegmentIntersection(
        origin.x, origin.y, dx, dy,
        seg.x1, seg.y1, seg.x2, seg.y2,
      )
      if (hit && hit.dist < closestDist) {
        closestDist = hit.dist
        closestPoint = hit.point
      }
    }

    if (closestPoint) {
      points.push({ angle, point: closestPoint })
    }
  }

  // Sort by angle and return polygon vertices
  points.sort((a, b) => a.angle - b.angle)
  return points.map(p => p.point)
}

/**
 * Ray-segment intersection.
 * Ray: origin + t * direction
 * Segment: p1 + u * (p2 - p1), u in [0, 1]
 */
function raySegmentIntersection(
  ox: number, oy: number,
  dx: number, dy: number,
  sx1: number, sy1: number,
  sx2: number, sy2: number,
): { point: Point, dist: number } | null {
  const sdx = sx2 - sx1
  const sdy = sy2 - sy1

  const denom = dx * sdy - dy * sdx
  if (Math.abs(denom) < 1e-10) return null // parallel

  const t = ((sx1 - ox) * sdy - (sy1 - oy) * sdx) / denom
  const u = ((sx1 - ox) * dy - (sy1 - oy) * dx) / denom

  if (t < 0 || u < 0 || u > 1) return null

  return {
    point: { x: ox + t * dx, y: oy + t * dy },
    dist: t,
  }
}

// ── Cell Visibility from Polygon ──

/**
 * Determine which cells are visible given a visibility polygon.
 * Tests each cell center against the polygon.
 */
export function getVisibleCells(
  polygon: Point[],
  cellSize: number,
  mapWidth: number,
  mapHeight: number,
): Set<string> {
  if (polygon.length < 3) return new Set()

  // Compute bounding box of polygon
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of polygon) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }

  // Convert to cell range
  const cellMinX = Math.max(0, Math.floor(minX / cellSize))
  const cellMaxX = Math.min(mapWidth - 1, Math.floor(maxX / cellSize))
  const cellMinY = Math.max(0, Math.floor(minY / cellSize))
  const cellMaxY = Math.min(mapHeight - 1, Math.floor(maxY / cellSize))

  const visible = new Set<string>()

  for (let cy = cellMinY; cy <= cellMaxY; cy++) {
    for (let cx = cellMinX; cx <= cellMaxX; cx++) {
      // Test cell center
      const px = (cx + 0.5) * cellSize
      const py = (cy + 0.5) * cellSize
      if (pointInPolygon(px, py, polygon)) {
        visible.add(`${cx},${cy}`)
      }
    }
  }

  return visible
}

/** Point-in-polygon test using ray casting */
function pointInPolygon(px: number, py: number, polygon: Point[]): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

// ── Combined Visibility from Multiple Light Sources ──

export interface VisibilityResult {
  litCells: Set<string>
  polygons: Array<{ polygon: Point[], source: MapLightSource }>
}

/**
 * Compute combined visibility from multiple light sources.
 * Returns the union of all lit cells and individual polygons for rendering.
 */
export function computeCombinedVisibility(
  sources: MapLightSource[],
  segments: WallSegment[],
  cellSize: number,
  mapWidth: number,
  mapHeight: number,
): VisibilityResult {
  const litCells = new Set<string>()
  const polygons: Array<{ polygon: Point[], source: MapLightSource }> = []

  for (const source of sources) {
    const polygon = computeVisibilityPolygon(
      { x: source.x, y: source.y },
      source.radius,
      segments,
    )
    const cells = getVisibleCells(polygon, cellSize, mapWidth, mapHeight)
    for (const cell of cells) litCells.add(cell)
    polygons.push({ polygon, source })
  }

  return { litCells, polygons }
}
