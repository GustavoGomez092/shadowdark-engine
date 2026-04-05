import { useRef, useEffect, useState, useCallback } from 'react'
import type { CampaignMap, MapCell, TerrainType, WallType, MapLabel, MapMarker } from '@/schemas/map.ts'
import { generateId } from '@/lib/utils/id.ts'

// ── Terrain Colors (editor view) ──
const TERRAIN_COLORS: Record<TerrainType, string> = {
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

// ── Polished export colors (for print/PNG) ──
const EXPORT_TERRAIN_COLORS: Record<TerrainType, string> = {
  stone_floor: '#ffffff',
  stone_wall: '#3a3a3a',
  dirt: '#c4a87a',
  water: '#a8d4f0',
  deep_water: '#7ab8e0',
  cave_floor: '#e8ddd0',
  cave_wall: '#5a5048',
  wooden_floor: '#dcc8a0',
  grass: '#c8e0a8',
  void: '#f5f5f5',
  sand: '#f0e0b8',
  cobblestone: '#d0d0c8',
  marble: '#f0ece8',
  mud: '#a08868',
  lava: '#ff6030',
  ice: '#e0f0f8',
  tiles: '#e0d8c8',
}

// ── Furniture icons (for editor) ──
const FURNITURE_ICONS: Record<string, string> = {
  table: '🪑', chair: '💺', chest: '📦', barrel: '🛢', crate: '📦',
  column: '🏛', statue: '🗿', altar: '⛪', fireplace: '🔥', forge: '⚒',
  bookshelf: '📚', bed: '🛏', throne: '👑', fountain: '⛲', well: '🪣',
  sarcophagus: '⚰', rubble: '🪨', pillar: '🏛', lever: '🔧', torch_sconce: '🔥',
  rug: '🟫', cauldron: '🫕', cage: '🔲', pit: '⚫',
}

const WALL_COLOR = '#2a2a2a'
const DOOR_COLOR = '#8b6914'
const SECRET_DOOR_COLOR = '#6a4c93'
const WINDOW_COLOR = '#5b9bd5'
const GRID_COLOR = 'rgba(100, 100, 100, 0.3)'

export type MapTool = 'select' | 'floor' | 'bucket' | 'wall' | 'door' | 'window' | 'diagonal' | 'split' | 'furniture' | 'eraser' | 'label' | 'marker'

interface Props {
  map: CampaignMap
  onMapChange: (updater: (m: CampaignMap) => void) => void
  activeTool: MapTool
  activeTerrainType: TerrainType
  activeWallType: WallType
  activeFurniture: string
  showGrid: boolean
  gridDistanceFt: number
}

interface Viewport {
  offsetX: number
  offsetY: number
  zoom: number
}

// ── Undo/Redo History ──
const MAX_HISTORY = 80

export function MapCanvas({ map, onMapChange, activeTool, activeTerrainType, activeWallType, activeFurniture, showGrid, gridDistanceFt }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ offsetX: 20, offsetY: 20, zoom: 1 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPos, setLastPanPos] = useState<{ x: number; y: number } | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // ── Undo/Redo ──
  const undoStack = useRef<string[]>([])
  const redoStack = useRef<string[]>([])

  function pushUndoSnapshot() {
    // Take a snapshot of current map layers/labels/markers
    const snapshot = JSON.stringify({ layers: map.layers, labels: map.labels, markers: map.markers })
    // Don't push if identical to last snapshot
    if (undoStack.current.length > 0 && undoStack.current[undoStack.current.length - 1] === snapshot) return
    undoStack.current.push(snapshot)
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift()
    redoStack.current = []
  }

  function undo() {
    if (undoStack.current.length === 0) return
    // Save current state to redo
    const currentSnapshot = JSON.stringify({ layers: map.layers, labels: map.labels, markers: map.markers })
    redoStack.current.push(currentSnapshot)
    const prev = JSON.parse(undoStack.current.pop()!)
    onMapChange(m => {
      m.layers = prev.layers
      m.labels = prev.labels
      m.markers = prev.markers
    })
  }

  function redo() {
    if (redoStack.current.length === 0) return
    const currentSnapshot = JSON.stringify({ layers: map.layers, labels: map.labels, markers: map.markers })
    undoStack.current.push(currentSnapshot)
    const next = JSON.parse(redoStack.current.pop()!)
    onMapChange(m => {
      m.layers = next.layers
      m.labels = next.labels
      m.markers = next.markers
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCmd = e.metaKey || e.ctrlKey
      if (isCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (isCmd && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if (isCmd && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // Build a cell lookup for rendering
  const cellMap = useRef(new Map<string, MapCell>())
  useEffect(() => {
    const m = new Map<string, MapCell>()
    for (const layer of map.layers) {
      if (!layer.visible) continue
      for (const cell of layer.cells) {
        m.set(`${cell.x},${cell.y}`, cell)
      }
    }
    cellMap.current = m
  }, [map.layers])

  // Resize canvas to container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // ── Wall Drawing Helper ──
  function drawWallLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, type: WallType, cellSize: number, zoom: number) {
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
      // Polygon-fill wall (Dungeon.js approach) — filled quad between parallel lines
      const dx = x2 - x1, dy = y2 - y1
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const ext = 1.5 * zoom
      const ex1 = x1 - (dx / len) * ext, ey1 = y1 - (dy / len) * ext
      const ex2 = x2 + (dx / len) * ext, ey2 = y2 + (dy / len) * ext
      const thick = Math.max(2, 3 * zoom) / 2
      const nx = -(dy / len) * thick, ny = (dx / len) * thick

      // Filled wall body
      ctx.fillStyle = WALL_COLOR
      ctx.beginPath()
      ctx.moveTo(ex1 + nx, ey1 + ny)
      ctx.lineTo(ex2 + nx, ey2 + ny)
      ctx.lineTo(ex2 - nx, ey2 - ny)
      ctx.lineTo(ex1 - nx, ey1 - ny)
      ctx.closePath()
      ctx.fill()

      // Outline edges
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 0.5
      ctx.setLineDash(type === 'secret_door' ? [4, 4] : [])
      ctx.beginPath()
      ctx.moveTo(ex1 + nx, ey1 + ny); ctx.lineTo(ex2 + nx, ey2 + ny)
      ctx.moveTo(ex1 - nx, ey1 - ny); ctx.lineTo(ex2 - nx, ey2 - ny)
      ctx.stroke()
      ctx.setLineDash([])

      if (type === 'door') {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
        ctx.fillStyle = DOOR_COLOR
        ctx.fillRect(mx - 3 * zoom, my - 3 * zoom, 6 * zoom, 6 * zoom)
      }
    }
  }

  // ── Rendering ──
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    ctx.scale(dpr, dpr)

    const { offsetX, offsetY, zoom } = viewport
    const cellSize = map.cellSize * zoom

    // Clear
    ctx.fillStyle = '#0b0f14'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Draw terrain (with diagonal split support)
    for (const [, cell] of cellMap.current) {
      const px = offsetX + cell.x * cellSize
      const py = offsetY + cell.y * cellSize
      if (px + cellSize < 0 || py + cellSize < 0 || px > canvasSize.width || py > canvasSize.height) continue

      if (cell.split && cell.splitTerrain) {
        // Draw two triangles
        const t1 = TERRAIN_COLORS[cell.terrain] || TERRAIN_COLORS.void
        const t2 = TERRAIN_COLORS[cell.splitTerrain] || TERRAIN_COLORS.void
        if (cell.split === 'TLBR') {
          // Triangle 1: top-left (terrain)
          ctx.fillStyle = t1; ctx.beginPath()
          ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); ctx.lineTo(px, py + cellSize); ctx.closePath(); ctx.fill()
          // Triangle 2: bottom-right (splitTerrain)
          ctx.fillStyle = t2; ctx.beginPath()
          ctx.moveTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); ctx.lineTo(px, py + cellSize); ctx.closePath(); ctx.fill()
        } else {
          // TRBL: Triangle 1: top-right (terrain)
          ctx.fillStyle = t1; ctx.beginPath()
          ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); ctx.closePath(); ctx.fill()
          // Triangle 2: bottom-left (splitTerrain)
          ctx.fillStyle = t2; ctx.beginPath()
          ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py + cellSize); ctx.lineTo(px, py + cellSize); ctx.closePath(); ctx.fill()
        }
        // Draw split line
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1
        ctx.beginPath()
        if (cell.split === 'TLBR') { ctx.moveTo(px, py + cellSize); ctx.lineTo(px + cellSize, py) }
        else { ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py + cellSize) }
        ctx.stroke()
      } else {
        ctx.fillStyle = TERRAIN_COLORS[cell.terrain] || TERRAIN_COLORS.void
        ctx.fillRect(px, py, cellSize, cellSize)
      }

      // Draw features
      for (const feature of cell.features) {
        if (feature.type === 'stairs') {
          ctx.fillStyle = 'rgba(0,0,0,0.3)'
          ctx.fillRect(px + cellSize * 0.2, py + cellSize * 0.2, cellSize * 0.6, cellSize * 0.6)
          ctx.fillStyle = '#fff'
          ctx.font = `${cellSize * 0.3}px sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(feature.direction === 'up' ? '↑' : '↓', px + cellSize / 2, py + cellSize / 2)
        } else if (feature.type === 'entry' || feature.type === 'exit') {
          ctx.strokeStyle = feature.type === 'entry' ? '#22c55e' : '#ef4444'
          ctx.lineWidth = 2
          ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4)
        } else if (feature.type === 'trap') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'
          ctx.fillRect(px, py, cellSize, cellSize)
        } else if (feature.type === 'furniture') {
          const icon = FURNITURE_ICONS[feature.variant] || '?'
          ctx.font = `${cellSize * 0.55}px sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(icon, px + cellSize / 2, py + cellSize / 2)
        }
      }
    }

    // Draw walls (cardinal + diagonal)
    ctx.lineWidth = Math.max(2, 3 * zoom)
    for (const [, cell] of cellMap.current) {
      const px = offsetX + cell.x * cellSize
      const py = offsetY + cell.y * cellSize

      drawWallLine(ctx, px, py, px + cellSize, py, cell.walls.north, cellSize, zoom)
      drawWallLine(ctx, px + cellSize, py, px + cellSize, py + cellSize, cell.walls.east, cellSize, zoom)
      drawWallLine(ctx, px, py + cellSize, px + cellSize, py + cellSize, cell.walls.south, cellSize, zoom)
      drawWallLine(ctx, px, py, px, py + cellSize, cell.walls.west, cellSize, zoom)

      // Diagonal walls
      if (cell.walls.diagTLBR && cell.walls.diagTLBR !== 'none') {
        drawWallLine(ctx, px, py, px + cellSize, py + cellSize, cell.walls.diagTLBR, cellSize, zoom)
      }
      if (cell.walls.diagTRBL && cell.walls.diagTRBL !== 'none') {
        drawWallLine(ctx, px + cellSize, py, px, py + cellSize, cell.walls.diagTRBL, cellSize, zoom)
      }
    }
    ctx.setLineDash([])

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = GRID_COLOR
      ctx.lineWidth = 0.5
      for (let x = 0; x <= map.width; x++) {
        const px = offsetX + x * cellSize
        ctx.beginPath(); ctx.moveTo(px, offsetY); ctx.lineTo(px, offsetY + map.height * cellSize); ctx.stroke()
      }
      for (let y = 0; y <= map.height; y++) {
        const py = offsetY + y * cellSize
        ctx.beginPath(); ctx.moveTo(offsetX, py); ctx.lineTo(offsetX + map.width * cellSize, py); ctx.stroke()
      }
    }

    // Draw labels
    for (const label of map.labels) {
      ctx.fillStyle = label.color || '#ffffff'
      ctx.font = `bold ${label.fontSize * zoom}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(label.text, offsetX + label.x * zoom, offsetY + label.y * zoom)
    }

    // Draw markers
    for (const marker of map.markers) {
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

    // Grid distance label
    if (showGrid) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'
      ctx.fillText(`1 sq = ${gridDistanceFt} ft`, offsetX + 4, offsetY + map.height * cellSize + 4)
    }
  }, [map, viewport, canvasSize, showGrid, gridDistanceFt])

  useEffect(() => {
    requestAnimationFrame(render)
  }, [render])

  // ── Input Handling ──
  function screenToGrid(clientX: number, clientY: number): { gx: number; gy: number } {
    const canvas = canvasRef.current
    if (!canvas) return { gx: 0, gy: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const cellSize = map.cellSize * viewport.zoom
    const gx = Math.floor((x - viewport.offsetX) / cellSize)
    const gy = Math.floor((y - viewport.offsetY) / cellSize)
    return { gx, gy }
  }

  function isInBounds(gx: number, gy: number) {
    return gx >= 0 && gx < map.width && gy >= 0 && gy < map.height
  }

  function paintCell(gx: number, gy: number, clientX?: number, clientY?: number) {
    if (!isInBounds(gx, gy)) return

    if (activeTool === 'bucket') {
      onMapChange(m => {
        const layer = m.layers[0]
        const cellLookup = new Map<string, MapCell>()
        for (const c of layer.cells) cellLookup.set(`${c.x},${c.y}`, c)

        const startCell = cellLookup.get(`${gx},${gy}`)
        const startTerrain = startCell?.terrain ?? '__empty__'
        if (startTerrain === activeTerrainType) return

        const visited = new Set<string>()
        const queue: [number, number][] = [[gx, gy]]
        const toFill: [number, number][] = []

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!
          const key = `${cx},${cy}`
          if (visited.has(key)) continue
          visited.add(key)
          if (cx < 0 || cx >= m.width || cy < 0 || cy >= m.height) continue

          const cell = cellLookup.get(key)
          const terrain = cell?.terrain ?? '__empty__'
          if (terrain !== startTerrain) continue
          toFill.push([cx, cy])

          const hasWall = (c: MapCell | undefined, edge: 'north' | 'east' | 'south' | 'west') =>
            c?.walls[edge] != null && c.walls[edge] !== 'none'

          const nN = cellLookup.get(`${cx},${cy - 1}`)
          if (!hasWall(cell, 'north') && !hasWall(nN, 'south')) queue.push([cx, cy - 1])
          const nS = cellLookup.get(`${cx},${cy + 1}`)
          if (!hasWall(cell, 'south') && !hasWall(nS, 'north')) queue.push([cx, cy + 1])
          const nW = cellLookup.get(`${cx - 1},${cy}`)
          if (!hasWall(cell, 'west') && !hasWall(nW, 'east')) queue.push([cx - 1, cy])
          const nE = cellLookup.get(`${cx + 1},${cy}`)
          if (!hasWall(cell, 'east') && !hasWall(nE, 'west')) queue.push([cx + 1, cy])
        }

        for (const [fx, fy] of toFill) {
          const key = `${fx},${fy}`
          const existing = cellLookup.get(key)
          if (existing) {
            existing.terrain = activeTerrainType
          } else {
            layer.cells.push({ x: fx, y: fy, terrain: activeTerrainType, walls: { north: 'none', east: 'none', south: 'none', west: 'none' }, features: [] })
          }
        }
      })
      return
    }

    if (activeTool === 'floor') {
      onMapChange(m => {
        const layer = m.layers[0]
        const existing = layer.cells.findIndex(c => c.x === gx && c.y === gy)
        const cell: MapCell = { x: gx, y: gy, terrain: activeTerrainType, walls: { north: 'none', east: 'none', south: 'none', west: 'none' }, features: [] }
        if (existing >= 0) {
          cell.walls = layer.cells[existing].walls
          cell.features = layer.cells[existing].features
          layer.cells[existing] = cell
        } else {
          layer.cells.push(cell)
        }
      })
    } else if (activeTool === 'eraser') {
      onMapChange(m => {
        m.layers[0].cells = m.layers[0].cells.filter(c => !(c.x === gx && c.y === gy))
      })
    } else if (activeTool === 'wall' || activeTool === 'door' || activeTool === 'window') {
      const canvas = canvasRef.current
      if (!canvas || clientX == null || clientY == null) return
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const cellSize = map.cellSize * viewport.zoom
      const cellPxX = viewport.offsetX + gx * cellSize
      const cellPxY = viewport.offsetY + gy * cellSize
      const relX = (x - cellPxX) / cellSize
      const relY = (y - cellPxY) / cellSize

      const edges: { edge: 'north' | 'east' | 'south' | 'west'; dist: number }[] = [
        { edge: 'north', dist: relY },
        { edge: 'south', dist: 1 - relY },
        { edge: 'west', dist: relX },
        { edge: 'east', dist: 1 - relX },
      ]
      edges.sort((a, b) => a.dist - b.dist)
      const closestEdge = edges[0].edge

      const wallType: WallType = activeTool === 'door' ? 'door' : activeTool === 'window' ? 'window' : activeWallType
      onMapChange(m => {
        const layer = m.layers[0]
        let cell = layer.cells.find(c => c.x === gx && c.y === gy)
        if (!cell) {
          cell = { x: gx, y: gy, terrain: 'stone_floor', walls: { north: 'none', east: 'none', south: 'none', west: 'none' }, features: [] }
          layer.cells.push(cell)
        }
        cell.walls[closestEdge] = cell.walls[closestEdge] === wallType ? 'none' : wallType
      })
    } else if (activeTool === 'diagonal') {
      // Place a diagonal wall — detect which diagonal is closer to the click
      const canvas = canvasRef.current
      if (!canvas || clientX == null || clientY == null) return
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const cellSize = map.cellSize * viewport.zoom
      const cellPxX = viewport.offsetX + gx * cellSize
      const cellPxY = viewport.offsetY + gy * cellSize
      const relX = (x - cellPxX) / cellSize
      const relY = (y - cellPxY) / cellSize

      // Distance to TL-BR diagonal (y = x line) vs TR-BL diagonal (y = 1-x line)
      const distTLBR = Math.abs(relY - relX) / Math.SQRT2
      const distTRBL = Math.abs(relY - (1 - relX)) / Math.SQRT2
      const diagKey = distTLBR <= distTRBL ? 'diagTLBR' : 'diagTRBL'

      onMapChange(m => {
        const layer = m.layers[0]
        let cell = layer.cells.find(c => c.x === gx && c.y === gy)
        if (!cell) {
          cell = { x: gx, y: gy, terrain: 'stone_floor', walls: { north: 'none', east: 'none', south: 'none', west: 'none' }, features: [] }
          layer.cells.push(cell)
        }
        const current = cell.walls[diagKey] ?? 'none'
        cell.walls[diagKey] = current === 'wall' ? 'none' : 'wall'
      })
    } else if (activeTool === 'split') {
      // Split cell diagonally: click position determines which diagonal, active terrain fills the second half
      const canvas = canvasRef.current
      if (!canvas || clientX == null || clientY == null) return
      const rect = canvas.getBoundingClientRect()
      const lx = clientX - rect.left
      const ly = clientY - rect.top
      const cellSize = map.cellSize * viewport.zoom
      const relX = (lx - (viewport.offsetX + gx * cellSize)) / cellSize
      const relY = (ly - (viewport.offsetY + gy * cellSize)) / cellSize
      const splitType = Math.abs(relY - relX) < Math.abs(relY - (1 - relX)) ? 'TLBR' : 'TRBL'

      onMapChange(m => {
        const layer = m.layers[0]
        let cell = layer.cells.find(c => c.x === gx && c.y === gy)
        if (!cell) {
          cell = { x: gx, y: gy, terrain: 'void', walls: { north: 'none', east: 'none', south: 'none', west: 'none' }, features: [] }
          layer.cells.push(cell)
        }
        if (cell.split === splitType) {
          // Toggle off
          cell.split = undefined
          cell.splitTerrain = undefined
        } else {
          cell.split = splitType as 'TLBR' | 'TRBL'
          cell.splitTerrain = activeTerrainType
          // If cell has no terrain yet, default the primary to void
          if (cell.terrain === activeTerrainType) cell.terrain = 'void'
        }
      })
    } else if (activeTool === 'furniture') {
      onMapChange(m => {
        const layer = m.layers[0]
        let cell = layer.cells.find(c => c.x === gx && c.y === gy)
        if (!cell) {
          cell = { x: gx, y: gy, terrain: 'stone_floor', walls: { north: 'none', east: 'none', south: 'none', west: 'none' }, features: [] }
          layer.cells.push(cell)
        }
        // Toggle — if same furniture exists, remove it; otherwise add
        const existingIdx = cell.features.findIndex(f => f.type === 'furniture' && f.variant === activeFurniture)
        if (existingIdx >= 0) {
          cell.features.splice(existingIdx, 1)
        } else {
          // Remove any existing furniture first (one per cell)
          cell.features = cell.features.filter(f => f.type !== 'furniture')
          cell.features.push({ type: 'furniture', variant: activeFurniture })
        }
      })
    } else if (activeTool === 'marker') {
      onMapChange(m => {
        const cellSize = m.cellSize
        const existingIdx = m.markers.findIndex(mk => {
          const mkGx = Math.floor(mk.x / cellSize)
          const mkGy = Math.floor(mk.y / cellSize)
          return mkGx === gx && mkGy === gy
        })
        if (existingIdx >= 0) {
          m.markers.splice(existingIdx, 1)
        } else {
          const nextNum = m.markers.filter(mk => mk.type === 'room_number').length + 1
          m.markers.push({ id: generateId(), x: (gx + 0.5) * cellSize, y: (gy + 0.5) * cellSize, type: 'room_number', label: String(nextNum) })
        }
      })
    }
  }

  const lastPaintedCell = useRef<string | null>(null)

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setLastPanPos({ x: e.clientX, y: e.clientY })
      return
    }
    if (e.button === 0) {
      // Save undo snapshot before any drawing action
      pushUndoSnapshot()
      setIsDrawing(true)
      lastPaintedCell.current = null
      const { gx, gy } = screenToGrid(e.clientX, e.clientY)
      paintCell(gx, gy, e.clientX, e.clientY)
      lastPaintedCell.current = `${gx},${gy}`
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (isPanning && lastPanPos) {
      setViewport(v => ({
        ...v,
        offsetX: v.offsetX + (e.clientX - lastPanPos.x),
        offsetY: v.offsetY + (e.clientY - lastPanPos.y),
      }))
      setLastPanPos({ x: e.clientX, y: e.clientY })
      return
    }
    if (isDrawing && (activeTool === 'floor' || activeTool === 'eraser' || activeTool === 'wall' || activeTool === 'door' || activeTool === 'window' || activeTool === 'diagonal')) {
      const { gx, gy } = screenToGrid(e.clientX, e.clientY)
      const cellKey = `${gx},${gy}`
      if (activeTool === 'wall' || activeTool === 'door' || activeTool === 'window' || activeTool === 'diagonal') {
        if (cellKey === lastPaintedCell.current) return
      }
      paintCell(gx, gy, e.clientX, e.clientY)
      lastPaintedCell.current = cellKey
    }
  }

  function handlePointerUp() {
    setIsDrawing(false)
    setIsPanning(false)
    setLastPanPos(null)
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setViewport(v => ({ ...v, zoom: Math.max(0.25, Math.min(4, v.zoom + delta)) }))
  }

  const cursor = activeTool === 'select' ? 'default' : activeTool === 'eraser' ? 'crosshair' : 'cell'

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]" style={{ cursor }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className="touch-none"
      />
    </div>
  )
}

// ══════════════════════════════════════════════════
// ── Polished Export Renderer ──
// ══════════════════════════════════════════════════

// ── Seeded pseudo-random for deterministic textures ──
function seededRng(seed: number) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }
}

/** Stone/rock fill — irregular block shapes with mortar lines */
function drawStoneTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const rng = seededRng(Math.floor(x * 31 + y * 17))
  ctx.save()
  // Random mortar lines (horizontal + vertical offsets)
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 0.6
  const rows = Math.floor(h / 6) + 1
  for (let r = 0; r < rows; r++) {
    const ry = y + r * (h / rows) + (rng() - 0.5) * 2
    ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); ctx.stroke()
    // Vertical joints (offset each row)
    const offset = r % 2 === 0 ? 0 : w * 0.4
    for (let c = 0; c < 3; c++) {
      const cx = x + offset + c * (w / 2.5) + (rng() - 0.5) * 4
      if (cx > x && cx < x + w) {
        const nextRy = y + (r + 1) * (h / rows)
        ctx.beginPath(); ctx.moveTo(cx, ry); ctx.lineTo(cx, Math.min(nextRy, y + h)); ctx.stroke()
      }
    }
  }
  // Scattered dark specks
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.arc(x + rng() * w, y + rng() * h, 0.3 + rng() * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Dirt/earth — dense short hatch marks like reference image A */
function drawDirtTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const rng = seededRng(Math.floor(x * 13 + y * 23))
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.4
  // Dense short lines in random directions
  const count = Math.floor(w * h / 15)
  for (let i = 0; i < count; i++) {
    const sx = x + rng() * w
    const sy = y + rng() * h
    const angle = rng() * Math.PI * 2
    const len = 1.5 + rng() * 3
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
    ctx.stroke()
  }
  // Small pebble circles
  ctx.fillStyle = 'rgba(0,0,0,0.06)'
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(x + rng() * w, y + rng() * h, 0.8 + rng() * 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Sand — scattered stipple dots like reference image C */
function drawSandTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const rng = seededRng(Math.floor(x * 7 + y * 19))
  ctx.save()
  const count = Math.floor(w * h / 12)
  for (let i = 0; i < count; i++) {
    const dotX = x + rng() * w
    const dotY = y + rng() * h
    const size = 0.2 + rng() * 0.7
    ctx.fillStyle = `rgba(0,0,0,${0.08 + rng() * 0.12})`
    ctx.beginPath()
    ctx.arc(dotX, dotY, size, 0, Math.PI * 2)
    ctx.fill()
  }
  // Occasional larger pebble clusters
  for (let i = 0; i < 2; i++) {
    const cx = x + rng() * w
    const cy = y + rng() * h
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.08})`
      ctx.beginPath()
      ctx.arc(cx + (rng() - 0.5) * 4, cy + (rng() - 0.5) * 4, 0.4 + rng() * 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Water — wavy ripple lines */
function drawWaterTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, deep: boolean) {
  const rng = seededRng(Math.floor(x * 11 + y * 29))
  ctx.save()
  ctx.strokeStyle = deep ? 'rgba(0,60,120,0.2)' : 'rgba(0,80,160,0.12)'
  ctx.lineWidth = 0.6
  const lines = deep ? 5 : 3
  for (let i = 0; i < lines; i++) {
    const cy = y + (i + 1) * h / (lines + 1)
    const amp = 1.5 + rng() * 2
    ctx.beginPath()
    ctx.moveTo(x + 1, cy)
    for (let px = 0; px <= w; px += 3) {
      ctx.lineTo(x + px, cy + Math.sin(px * 0.15 + rng() * 6) * amp)
    }
    ctx.stroke()
  }
  ctx.restore()
}

/** Grass — dense organic marks with small leaf/grass blade strokes like reference A */
function drawGrassTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const rng = seededRng(Math.floor(x * 41 + y * 37))
  ctx.save()
  ctx.strokeStyle = 'rgba(0,80,0,0.15)'
  ctx.lineWidth = 0.5
  // Dense grass blades
  const count = Math.floor(w * h / 8)
  for (let i = 0; i < count; i++) {
    const bx = x + rng() * w
    const by = y + rng() * h
    const bh = 2 + rng() * 4
    const lean = (rng() - 0.5) * 2
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.quadraticCurveTo(bx + lean, by - bh * 0.6, bx + lean * 0.5, by - bh)
    ctx.stroke()
  }
  // Small rock clusters
  ctx.fillStyle = 'rgba(0,0,0,0.06)'
  for (let i = 0; i < 2; i++) {
    const rx = x + rng() * w, ry = y + rng() * h
    ctx.beginPath(); ctx.arc(rx, ry, 1 + rng() * 1.5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

/** Tile/cobblestone — clean sub-grid lines like reference B */
function drawTileTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isCobble: boolean) {
  ctx.save()
  ctx.strokeStyle = isCobble ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)'
  ctx.lineWidth = isCobble ? 0.6 : 0.4
  // Sub-grid: divide cell into 2x2 or 3x3
  const divs = isCobble ? 3 : 2
  for (let i = 1; i < divs; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * w / divs, y); ctx.lineTo(x + i * w / divs, y + h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, y + i * h / divs); ctx.lineTo(x + w, y + i * h / divs); ctx.stroke()
  }
  if (isCobble) {
    // Slight irregularity in cobblestone
    const rng = seededRng(Math.floor(x * 53 + y * 47))
    ctx.fillStyle = 'rgba(0,0,0,0.03)'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(x + rng() * w, y + rng() * h, 0.5 + rng(), 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

/** Lava — hot ripples with glow effect */
function drawLavaTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const rng = seededRng(Math.floor(x * 17 + y * 43))
  ctx.save()
  // Dark crust lines
  ctx.strokeStyle = 'rgba(80,0,0,0.2)'
  ctx.lineWidth = 0.8
  for (let i = 0; i < 4; i++) {
    const cy = y + rng() * h
    ctx.beginPath()
    ctx.moveTo(x, cy)
    for (let px = 0; px <= w; px += 4) {
      ctx.lineTo(x + px, cy + Math.sin(px * 0.2 + i) * 2)
    }
    ctx.stroke()
  }
  // Bright glow spots
  ctx.fillStyle = 'rgba(255,200,0,0.15)'
  for (let i = 0; i < 2; i++) {
    ctx.beginPath(); ctx.arc(x + rng() * w, y + rng() * h, 2 + rng() * 3, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

/** Draw a polished door symbol (arc + line) */
function drawExportDoor(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, cellSize: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const isHorizontal = Math.abs(y1 - y2) < 1
  const doorWidth = cellSize * 0.35
  ctx.save()
  // Gap in wall
  ctx.fillStyle = '#fff'
  if (isHorizontal) {
    ctx.fillRect(mx - doorWidth, my - 2, doorWidth * 2, 4)
  } else {
    ctx.fillRect(mx - 2, my - doorWidth, 4, doorWidth * 2)
  }
  // Door arc
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  if (isHorizontal) {
    ctx.arc(mx - doorWidth, my, doorWidth * 2, -Math.PI * 0.5, 0)
  } else {
    ctx.arc(mx, my - doorWidth, doorWidth * 2, 0, Math.PI * 0.5)
  }
  ctx.stroke()
  // Door line
  ctx.lineWidth = 1.5
  ctx.beginPath()
  if (isHorizontal) {
    ctx.moveTo(mx - doorWidth, my)
    ctx.lineTo(mx + doorWidth, my - doorWidth * 0.4)
  } else {
    ctx.moveTo(mx, my - doorWidth)
    ctx.lineTo(mx + doorWidth * 0.4, my + doorWidth)
  }
  ctx.stroke()
  ctx.restore()
}

/** Draw furniture icon for export (simple geometric shapes) */
function drawExportFurniture(ctx: CanvasRenderingContext2D, px: number, py: number, cs: number, variant: string) {
  ctx.save()
  const cx = px + cs / 2, cy = py + cs / 2
  const r = cs * 0.3
  ctx.strokeStyle = '#333'
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 1

  switch (variant) {
    case 'column': case 'pillar':
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break
    case 'chest':
      ctx.fillRect(cx - r * 0.7, cy - r * 0.5, r * 1.4, r); ctx.strokeRect(cx - r * 0.7, cy - r * 0.5, r * 1.4, r); break
    case 'table':
      ctx.strokeRect(cx - r, cy - r * 0.6, r * 2, r * 1.2); break
    case 'chair':
      ctx.fillRect(cx - r * 0.3, cy - r * 0.3, r * 0.6, r * 0.6); ctx.strokeRect(cx - r * 0.3, cy - r * 0.3, r * 0.6, r * 0.6); break
    case 'barrel': case 'crate':
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.stroke(); break
    case 'bed':
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(cx - r, cy - r * 0.4, r * 2, r * 0.8); ctx.strokeRect(cx - r, cy - r * 0.4, r * 2, r * 0.8)
      ctx.fillRect(cx - r, cy - r * 0.4, r * 0.4, r * 0.8); break
    case 'statue':
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx - r * 0.5, cy + r * 0.7); ctx.lineTo(cx + r * 0.5, cy + r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); break
    case 'altar':
      ctx.strokeRect(cx - r * 0.8, cy - r * 0.3, r * 1.6, r * 0.6)
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.6); ctx.lineTo(cx - r * 0.2, cy - r * 0.3); ctx.lineTo(cx + r * 0.2, cy - r * 0.3); ctx.closePath(); ctx.stroke(); break
    case 'fireplace': case 'forge':
      ctx.strokeRect(cx - r * 0.7, cy - r * 0.5, r * 1.4, r)
      ctx.fillStyle = 'rgba(200,80,0,0.2)'; ctx.fillRect(cx - r * 0.4, cy - r * 0.2, r * 0.8, r * 0.5); break
    case 'fountain': case 'well':
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.stroke(); break
    case 'sarcophagus':
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      ctx.fillRect(cx - r * 0.9, cy - r * 0.4, r * 1.8, r * 0.8); ctx.strokeRect(cx - r * 0.9, cy - r * 0.4, r * 1.8, r * 0.8); break
    case 'throne':
      ctx.strokeRect(cx - r * 0.4, cy - r * 0.3, r * 0.8, r * 0.7)
      ctx.strokeRect(cx - r * 0.5, cy - r * 0.7, r, r * 0.4); break
    case 'rubble':
      for (let i = 0; i < 5; i++) {
        const rx = cx - r + ((i * 37) % 7) / 7 * r * 2
        const ry = cy - r * 0.5 + ((i * 53) % 7) / 7 * r
        ctx.fillStyle = `rgba(0,0,0,${0.1 + (i % 3) * 0.05})`
        ctx.beginPath(); ctx.arc(rx, ry, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill()
      }; break
    case 'stairs':
      for (let i = 0; i < 4; i++) {
        const sy = cy - r * 0.6 + i * r * 0.3
        ctx.strokeStyle = '#555'
        ctx.beginPath(); ctx.moveTo(cx - r * 0.6, sy); ctx.lineTo(cx + r * 0.6, sy); ctx.stroke()
      }; break
    default:
      ctx.strokeStyle = '#666'; ctx.strokeRect(cx - r * 0.5, cy - r * 0.5, r, r)
  }
  ctx.restore()
}

// ══════════════════════════════════════════════════════════
// ── POLISHED EXPORT — One-Page Dungeon Style ──
// Matches the reference: hatched void, white floors, solid walls
// ══════════════════════════════════════════════════════════

export function exportMapAsPNG(map: CampaignMap, scale: number = 2): string {
  const canvas = document.createElement('canvas')
  const cs = map.cellSize
  canvas.width = map.width * cs * scale
  canvas.height = map.height * cs * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  const W = map.width * cs, H = map.height * cs
  const wallThick = map.wallThickness ?? 5
  const INK = '#221122'
  const PAPER = '#f5f0e8'
  const FLOOR = '#ffffff'

  // Build cell lookup & set of floor coordinates
  const cells = new Map<string, MapCell>()
  const floorSet = new Set<string>()
  for (const layer of map.layers) {
    if (!layer.visible) continue
    for (const cell of layer.cells) {
      cells.set(`${cell.x},${cell.y}`, cell)
      floorSet.add(`${cell.x},${cell.y}`)
    }
  }

  // ── Pass 1: Parchment background ──
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)

  // ── Pass 2: Hatching on void cells (outside dungeon) ──
  // Dense crosshatch strokes on every non-floor cell, like the reference
  const rng = seededRng(42)
  for (let gy = 0; gy < map.height; gy++) {
    for (let gx = 0; gx < map.width; gx++) {
      if (floorSet.has(`${gx},${gy}`)) continue
      // Check if this void cell is near any floor cell (within 2 cells)
      let nearFloor = false
      for (let dy = -2; dy <= 2 && !nearFloor; dy++)
        for (let dx = -2; dx <= 2 && !nearFloor; dx++)
          if (floorSet.has(`${gx + dx},${gy + dy}`)) nearFloor = true
      if (!nearFloor) continue // skip void cells far from dungeon

      const px = gx * cs, py = gy * cs
      // Dense hatching strokes
      ctx.strokeStyle = INK
      ctx.lineWidth = 0.6
      const density = 12
      for (let i = 0; i < density; i++) {
        const sx = px + rng.next() * cs
        const sy = py + rng.next() * cs
        const angle = rng.next() * Math.PI
        const len = 3 + rng.next() * (cs * 0.5)
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
        ctx.stroke()
      }
      // Extra short strokes for density
      ctx.lineWidth = 0.4
      for (let i = 0; i < density / 2; i++) {
        const sx = px + rng.next() * cs
        const sy = py + rng.next() * cs
        const angle = rng.next() * Math.PI * 2
        const len = 1.5 + rng.next() * 3
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
        ctx.stroke()
      }
    }
  }

  // ── Pass 3: Floor fills ──
  for (const [, cell] of cells) {
    const px = cell.x * cs, py = cell.y * cs
    const isWater = cell.terrain === 'water' || cell.terrain === 'deep_water'
    const isSpecial = cell.terrain !== 'stone_floor' && cell.terrain !== 'void'

    // White floor
    ctx.fillStyle = isWater ? '#e8f0f8' : FLOOR
    ctx.fillRect(px, py, cs, cs)

    // Subtle grid inside rooms
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 0.3
    ctx.strokeRect(px, py, cs, cs)

    // Water ripples
    if (isWater) {
      drawWaterTexture(ctx, px, py, cs, cs, cell.terrain === 'deep_water')
    }

    // Special terrain textures (non-floor)
    if (isSpecial && !isWater) {
      if (cell.terrain === 'dirt' || cell.terrain === 'mud' || cell.terrain === 'cave_floor') {
        drawSandTexture(ctx, px, py, cs, cs) // light stipple for dirt
      } else if (cell.terrain === 'grass') {
        drawGrassTexture(ctx, px, py, cs, cs)
      }
    }
  }

  // ── Pass 4: Features/furniture ──
  for (const [, cell] of cells) {
    const px = cell.x * cs, py = cell.y * cs
    for (const feature of cell.features) {
      if (feature.type === 'furniture') {
        drawExportFurniture(ctx, px, py, cs, feature.variant)
      } else if (feature.type === 'stairs') {
        ctx.save()
        ctx.strokeStyle = INK; ctx.lineWidth = 0.8
        for (let i = 0; i < 5; i++) {
          const sy = py + cs * 0.1 + i * cs * 0.16
          ctx.beginPath(); ctx.moveTo(px + cs * 0.15, sy); ctx.lineTo(px + cs * 0.85, sy); ctx.stroke()
        }
        ctx.restore()
      } else if (feature.type === 'trap') {
        ctx.save()
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6
        ctx.beginPath(); ctx.moveTo(px + 3, py + 3); ctx.lineTo(px + cs - 3, py + cs - 3); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(px + cs - 3, py + 3); ctx.lineTo(px + 3, py + cs - 3); ctx.stroke()
        ctx.restore()
      }
    }
  }

  // ── Pass 5: Walls — solid filled polygons ──
  function drawWall(x1: number, y1: number, x2: number, y2: number, type: WallType) {
    if (!type || type === 'none') return

    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ext = wallThick * 0.5
    const ex1 = x1 - (dx / len) * ext, ey1 = y1 - (dy / len) * ext
    const ex2 = x2 + (dx / len) * ext, ey2 = y2 + (dy / len) * ext
    const nx = -(dy / len) * (wallThick / 2)
    const ny = (dx / len) * (wallThick / 2)

    if (type === 'door') {
      // Door: gap in wall with small door rectangle
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      const doorGap = cs * 0.3
      const gx = (dx / len) * doorGap, gy = (dy / len) * doorGap
      // Wall before door
      ctx.fillStyle = INK; ctx.beginPath()
      ctx.moveTo(ex1 + nx, ey1 + ny); ctx.lineTo(mx - gx + nx, my - gy + ny)
      ctx.lineTo(mx - gx - nx, my - gy - ny); ctx.lineTo(ex1 - nx, ey1 - ny)
      ctx.closePath(); ctx.fill()
      // Wall after door
      ctx.beginPath()
      ctx.moveTo(mx + gx + nx, my + gy + ny); ctx.lineTo(ex2 + nx, ey2 + ny)
      ctx.lineTo(ex2 - nx, ey2 - ny); ctx.lineTo(mx + gx - nx, my + gy - ny)
      ctx.closePath(); ctx.fill()
      // Door rectangle
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2
      const dw = doorGap * 1.6, dh = wallThick * 0.6
      ctx.strokeRect(mx - dw / 2, my - dh / 2, dw, dh)
      return
    }

    if (type === 'secret_door') {
      // Secret door: thin dashed line
      ctx.strokeStyle = INK; ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      ctx.setLineDash([])
      return
    }

    if (type === 'window') {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      const gap = cs * 0.15
      const gx = (dx / len) * gap, gy = (dy / len) * gap
      // Wall segments
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.moveTo(ex1 + nx, ey1 + ny); ctx.lineTo(mx - gx + nx, my - gy + ny)
      ctx.lineTo(mx - gx - nx, my - gy - ny); ctx.lineTo(ex1 - nx, ey1 - ny)
      ctx.closePath(); ctx.fill()
      ctx.beginPath()
      ctx.moveTo(mx + gx + nx, my + gy + ny); ctx.lineTo(ex2 + nx, ey2 + ny)
      ctx.lineTo(ex2 - nx, ey2 - ny); ctx.lineTo(mx + gx - nx, my + gy - ny)
      ctx.closePath(); ctx.fill()
      // Window bars
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8
      ctx.beginPath(); ctx.moveTo(mx - gx, my - gy); ctx.lineTo(mx + gx, my + gy); ctx.stroke()
      return
    }

    if (type === 'arch') {
      // Arch: gap in wall (no door rectangle)
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      const archGap = cs * 0.35
      const gx = (dx / len) * archGap, gy = (dy / len) * archGap
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.moveTo(ex1 + nx, ey1 + ny); ctx.lineTo(mx - gx + nx, my - gy + ny)
      ctx.lineTo(mx - gx - nx, my - gy - ny); ctx.lineTo(ex1 - nx, ey1 - ny)
      ctx.closePath(); ctx.fill()
      ctx.beginPath()
      ctx.moveTo(mx + gx + nx, my + gy + ny); ctx.lineTo(ex2 + nx, ey2 + ny)
      ctx.lineTo(ex2 - nx, ey2 - ny); ctx.lineTo(mx + gx - nx, my + gy - ny)
      ctx.closePath(); ctx.fill()
      return
    }

    // Standard wall — solid filled polygon
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.moveTo(ex1 + nx, ey1 + ny)
    ctx.lineTo(ex2 + nx, ey2 + ny)
    ctx.lineTo(ex2 - nx, ey2 - ny)
    ctx.lineTo(ex1 - nx, ey1 - ny)
    ctx.closePath()
    ctx.fill()
  }

  for (const [, cell] of cells) {
    const px = cell.x * cs, py = cell.y * cs
    drawWall(px, py, px + cs, py, cell.walls.north)
    drawWall(px + cs, py, px + cs, py + cs, cell.walls.east)
    drawWall(px, py + cs, px + cs, py + cs, cell.walls.south)
    drawWall(px, py, px, py + cs, cell.walls.west)
    if (cell.walls.diagTLBR && cell.walls.diagTLBR !== 'none') drawWall(px, py, px + cs, py + cs, cell.walls.diagTLBR)
    if (cell.walls.diagTRBL && cell.walls.diagTRBL !== 'none') drawWall(px + cs, py, px, py + cs, cell.walls.diagTRBL)
  }

  // ── Pass 6: Room number markers (elegant serif style) ──
  for (const marker of map.markers) {
    const mx = marker.x, my = marker.y
    if (marker.type === 'room_number') {
      const r = cs * 0.35
      ctx.fillStyle = FLOOR
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = INK
      ctx.font = `bold ${cs * 0.4}px 'Georgia', 'Times New Roman', serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(marker.label, mx, my + 1)
    } else {
      ctx.fillStyle = INK
      ctx.font = `${cs * 0.2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(marker.label.slice(0, 4), mx, my)
    }
  }

  // ── Pass 7: Text labels ──
  for (const label of map.labels) {
    ctx.fillStyle = label.color || INK
    ctx.font = `bold ${label.fontSize}px 'Georgia', serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label.text, label.x, label.y)
  }

  return canvas.toDataURL('image/png')
}
