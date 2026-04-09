/**
 * Shared map rendering utilities.
 * Extracted from map-canvas.tsx for reuse in the map viewer.
 */

import type { TerrainType, WallType, MapCell, MapLabel, MapMarker } from '@/schemas/map.ts'

// ── Color Constants ──

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  stone_floor: '#d4d0c8',
  stone_wall: '#5a5a5a',
  dirt: '#8b7355',
  water: '#4a90c4',
  deep_water: '#2c5f8a',
  cave_floor: '#a89880',
  cave_wall: '#6b5e50',
  wooden_floor: '#c4a265',
  grass: '#6b8e4e',
  void: '#1a1a1a',
  sand: '#d4b87a',
  cobblestone: '#9a9a8e',
  marble: '#e8e4df',
  mud: '#6b5a3e',
  lava: '#d44400',
  ice: '#c8e4f0',
  tiles: '#b8b0a0',
}

// Darker versions for dimmed/explored areas
export const TERRAIN_COLORS_DIM: Record<TerrainType, string> = {
  stone_floor: '#4a4840',
  stone_wall: '#2a2a2a',
  dirt: '#3d3225',
  water: '#1f3e54',
  deep_water: '#132a3d',
  cave_floor: '#4a4338',
  cave_wall: '#302a24',
  wooden_floor: '#54462a',
  grass: '#2f3f22',
  void: '#0a0a0a',
  sand: '#5c5035',
  cobblestone: '#42423e',
  marble: '#64625e',
  mud: '#2f251a',
  lava: '#5c1c00',
  ice: '#566468',
  tiles: '#504c44',
}

export const WALL_COLOR = '#2a2a2a'
export const DOOR_COLOR = '#8b6914'
export const SECRET_DOOR_COLOR = '#6a4c93'
export const WINDOW_COLOR = '#5b9bd5'
export const GRID_COLOR = 'rgba(100, 100, 100, 0.3)'
export const BG_COLOR = '#0b0f14'

export const FURNITURE_ICONS: Record<string, string> = {
  table: '\u{1FA91}', chair: '\u{1F4BA}', chest: '\u{1F4E6}', barrel: '\u{1F6E2}', crate: '\u{1F4E6}',
  column: '\u{1F3DB}', statue: '\u{1F5FF}', altar: '\u26EA', fireplace: '\u{1F525}', forge: '\u2692',
  bookshelf: '\u{1F4DA}', bed: '\u{1F6CF}', throne: '\u{1F451}', fountain: '\u26F2', well: '\u{1FAA3}',
  sarcophagus: '\u26B0', rubble: '\u{1FAA8}', pillar: '\u{1F3DB}', lever: '\u{1F527}', torch_sconce: '\u{1F525}',
  rug: '\u{1F7EB}', cauldron: '\u{1FAD5}', cage: '\u{1F532}', pit: '\u26AB',
}

// ── Drawing Functions ──

export function drawWallLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  type: WallType, cellSize: number, zoom: number,
) {
  if (type === 'none' || !type) return
  ctx.strokeStyle = type === 'door' ? DOOR_COLOR : type === 'secret_door' ? SECRET_DOOR_COLOR : type === 'window' ? WINDOW_COLOR : WALL_COLOR
  if (type === 'secret_door') ctx.setLineDash([4, 4])
  else ctx.setLineDash([])

  if (type === 'window') {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    const gap = cellSize * 0.2
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = dx / len * gap, ny = dy / len * gap
    ctx.strokeStyle = WALL_COLOR; ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx - nx, my - ny); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(mx + nx, my + ny); ctx.lineTo(x2, y2); ctx.stroke()
    ctx.strokeStyle = WINDOW_COLOR
    const prevLW = ctx.lineWidth
    ctx.lineWidth = Math.max(1, 1.5 * zoom)
    ctx.beginPath(); ctx.moveTo(mx - nx, my - ny); ctx.lineTo(mx + nx, my + ny); ctx.stroke()
    ctx.lineWidth = prevLW
  } else {
    // Polygon-fill wall: filled quad between parallel lines
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ext = 1.5 * zoom
    const ex1 = x1 - (dx / len) * ext, ey1 = y1 - (dy / len) * ext
    const ex2 = x2 + (dx / len) * ext, ey2 = y2 + (dy / len) * ext
    const thick = Math.max(2, 3 * zoom) / 2
    const wnx = -(dy / len) * thick, wny = (dx / len) * thick

    ctx.fillStyle = WALL_COLOR
    ctx.beginPath()
    ctx.moveTo(ex1 + wnx, ey1 + wny)
    ctx.lineTo(ex2 + wnx, ey2 + wny)
    ctx.lineTo(ex2 - wnx, ey2 - wny)
    ctx.lineTo(ex1 - wnx, ey1 - wny)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#111'
    ctx.lineWidth = 0.5
    ctx.setLineDash(type === 'secret_door' ? [4, 4] : [])
    ctx.beginPath()
    ctx.moveTo(ex1 + wnx, ey1 + wny); ctx.lineTo(ex2 + wnx, ey2 + wny)
    ctx.moveTo(ex1 - wnx, ey1 - wny); ctx.lineTo(ex2 - wnx, ey2 - wny)
    ctx.stroke()
    ctx.setLineDash([])

    if (type === 'door') {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      ctx.fillStyle = DOOR_COLOR
      ctx.fillRect(mx - 3 * zoom, my - 3 * zoom, 6 * zoom, 6 * zoom)
    }
  }
}

/** Draw a single terrain cell (handles diagonal splits) */
export function drawTerrainCell(
  ctx: CanvasRenderingContext2D,
  cell: MapCell,
  px: number, py: number, cellSize: number,
  colorMap: Record<TerrainType, string> = TERRAIN_COLORS,
) {
  if (cell.split && cell.splitTerrain) {
    const t1 = colorMap[cell.terrain] || colorMap.void
    const t2 = colorMap[cell.splitTerrain] || colorMap.void
    if (cell.split === 'TLBR') {
      ctx.fillStyle = t1; ctx.beginPath()
      ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); ctx.lineTo(px, py + cellSize); ctx.closePath(); ctx.fill()
      ctx.fillStyle = t2; ctx.beginPath()
      ctx.moveTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); ctx.lineTo(px, py + cellSize); ctx.closePath(); ctx.fill()
    } else {
      ctx.fillStyle = t1; ctx.beginPath()
      ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); ctx.closePath(); ctx.fill()
      ctx.fillStyle = t2; ctx.beginPath()
      ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py + cellSize); ctx.lineTo(px, py + cellSize); ctx.closePath(); ctx.fill()
    }
  } else {
    ctx.fillStyle = colorMap[cell.terrain] || colorMap.void
    ctx.fillRect(px, py, cellSize, cellSize)
  }
}

/** Draw cell features (stairs, entry/exit, traps, furniture) */
export function drawCellFeatures(
  ctx: CanvasRenderingContext2D,
  cell: MapCell,
  px: number, py: number, cellSize: number,
) {
  for (const feature of cell.features) {
    if (feature.type === 'stairs') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(px + cellSize * 0.2, py + cellSize * 0.2, cellSize * 0.6, cellSize * 0.6)
      ctx.fillStyle = '#fff'
      ctx.font = `${cellSize * 0.3}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(feature.direction === 'up' ? '\u2191' : '\u2193', px + cellSize / 2, py + cellSize / 2)
    } else if (feature.type === 'entry' || feature.type === 'exit') {
      ctx.strokeStyle = feature.type === 'entry' ? '#22c55e' : '#ef4444'
      ctx.lineWidth = 2
      ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4)
    } else if (feature.type === 'trap') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'
      ctx.fillRect(px, py, cellSize, cellSize)
    } else if (feature.type === 'furniture' && feature.variant) {
      const icon = FURNITURE_ICONS[feature.variant] || '?'
      ctx.font = `${cellSize * 0.55}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(icon, px + cellSize / 2, py + cellSize / 2)
    }
  }
}

/** Draw walls for a single cell */
export function drawCellWalls(
  ctx: CanvasRenderingContext2D,
  cell: MapCell,
  px: number, py: number, cellSize: number, zoom: number,
) {
  drawWallLine(ctx, px, py, px + cellSize, py, cell.walls.north, cellSize, zoom)
  drawWallLine(ctx, px + cellSize, py, px + cellSize, py + cellSize, cell.walls.east, cellSize, zoom)
  drawWallLine(ctx, px, py + cellSize, px + cellSize, py + cellSize, cell.walls.south, cellSize, zoom)
  drawWallLine(ctx, px, py, px, py + cellSize, cell.walls.west, cellSize, zoom)
  if (cell.walls.diagTLBR && cell.walls.diagTLBR !== 'none') {
    drawWallLine(ctx, px, py, px + cellSize, py + cellSize, cell.walls.diagTLBR, cellSize, zoom)
  }
  if (cell.walls.diagTRBL && cell.walls.diagTRBL !== 'none') {
    drawWallLine(ctx, px + cellSize, py, px, py + cellSize, cell.walls.diagTRBL, cellSize, zoom)
  }
}

/** Draw grid lines */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  offsetX: number, offsetY: number,
  mapWidth: number, mapHeight: number, cellSize: number,
) {
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 0.5
  for (let x = 0; x <= mapWidth; x++) {
    const px = offsetX + x * cellSize
    ctx.beginPath(); ctx.moveTo(px, offsetY); ctx.lineTo(px, offsetY + mapHeight * cellSize); ctx.stroke()
  }
  for (let y = 0; y <= mapHeight; y++) {
    const py = offsetY + y * cellSize
    ctx.beginPath(); ctx.moveTo(offsetX, py); ctx.lineTo(offsetX + mapWidth * cellSize, py); ctx.stroke()
  }
}

/** Draw map labels */
export function drawLabels(
  ctx: CanvasRenderingContext2D,
  labels: MapLabel[],
  offsetX: number, offsetY: number, zoom: number,
) {
  for (const label of labels) {
    ctx.fillStyle = label.color || '#ffffff'
    ctx.font = `bold ${label.fontSize * zoom}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label.text, offsetX + label.x * zoom, offsetY + label.y * zoom)
  }
}

/** Draw map markers */
export function drawMarkers(
  ctx: CanvasRenderingContext2D,
  markers: MapMarker[],
  offsetX: number, offsetY: number, zoom: number,
) {
  for (const marker of markers) {
    const mx = offsetX + marker.x * zoom
    const my = offsetY + marker.y * zoom
    const r = 12 * zoom

    if (marker.type === 'room_number') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${10 * zoom}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(marker.label, mx, my)
    } else {
      const colors: Record<string, string> = { monster: '#ef4444', npc: '#a855f7', treasure: '#f59e0b', trap: '#ef4444', note: '#3b82f6' }
      ctx.fillStyle = colors[marker.type] || '#888'
      ctx.beginPath(); ctx.arc(mx, my, r * 0.7, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `${8 * zoom}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(marker.label.slice(0, 3), mx, my)
    }
  }
}

// ── Coordinate Utilities ──

export function screenToGrid(
  clientX: number, clientY: number,
  canvasRect: DOMRect,
  offsetX: number, offsetY: number,
  cellSize: number, zoom: number,
): { gx: number; gy: number } {
  const x = clientX - canvasRect.left
  const y = clientY - canvasRect.top
  const scaledCellSize = cellSize * zoom
  return {
    gx: Math.floor((x - offsetX) / scaledCellSize),
    gy: Math.floor((y - offsetY) / scaledCellSize),
  }
}

export function gridToScreen(
  gx: number, gy: number,
  offsetX: number, offsetY: number,
  cellSize: number, zoom: number,
): { px: number; py: number } {
  return {
    px: offsetX + gx * cellSize * zoom,
    py: offsetY + gy * cellSize * zoom,
  }
}
