import { useRef, useEffect, useState, useCallback } from 'react'
import type { CampaignMap, MapCell, TerrainType, WallType, MapLabel, MapMarker } from '@/schemas/map.ts'
import { generateId } from '@/lib/utils/id.ts'

// ── Terrain Colors ──
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
}

const WALL_COLOR = '#2a2a2a'
const DOOR_COLOR = '#8b6914'
const SECRET_DOOR_COLOR = '#6a4c93'
const WINDOW_COLOR = '#5b9bd5'
const GRID_COLOR = 'rgba(100, 100, 100, 0.3)'

export type MapTool = 'select' | 'floor' | 'bucket' | 'wall' | 'door' | 'window' | 'diagonal' | 'eraser' | 'label' | 'marker'

interface Props {
  map: CampaignMap
  onMapChange: (updater: (m: CampaignMap) => void) => void
  activeTool: MapTool
  activeTerrainType: TerrainType
  activeWallType: WallType
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

export function MapCanvas({ map, onMapChange, activeTool, activeTerrainType, activeWallType, showGrid, gridDistanceFt }: Props) {
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
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
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

    // Draw terrain
    for (const [, cell] of cellMap.current) {
      const px = offsetX + cell.x * cellSize
      const py = offsetY + cell.y * cellSize
      if (px + cellSize < 0 || py + cellSize < 0 || px > canvasSize.width || py > canvasSize.height) continue

      ctx.fillStyle = TERRAIN_COLORS[cell.terrain] || TERRAIN_COLORS.void
      ctx.fillRect(px, py, cellSize, cellSize)

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
          ctx.fillStyle = 'rgba(139, 92, 246, 0.4)'
          ctx.fillRect(px + cellSize * 0.15, py + cellSize * 0.15, cellSize * 0.7, cellSize * 0.7)
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

// ── Export function ──
export function exportMapAsPNG(map: CampaignMap, scale: number = 2): string {
  const canvas = document.createElement('canvas')
  const cellSize = map.cellSize
  canvas.width = map.width * cellSize * scale
  canvas.height = map.height * cellSize * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, map.width * cellSize, map.height * cellSize)

  const cells = new Map<string, MapCell>()
  for (const layer of map.layers) {
    if (!layer.visible) continue
    for (const cell of layer.cells) cells.set(`${cell.x},${cell.y}`, cell)
  }

  // Terrain
  for (const [, cell] of cells) {
    ctx.fillStyle = TERRAIN_COLORS[cell.terrain]
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize)
  }

  // Grid
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= map.width; x++) {
    ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, map.height * cellSize); ctx.stroke()
  }
  for (let y = 0; y <= map.height; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(map.width * cellSize, y * cellSize); ctx.stroke()
  }

  // Walls helper for export
  function drawExportWall(x1: number, y1: number, x2: number, y2: number, type: WallType) {
    if (!type || type === 'none') return
    if (type === 'window') {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      const dx = x2 - x1, dy = y2 - y1
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const gap = cellSize * 0.2
      const nx = dx / len * gap, ny = dy / len * gap
      ctx.strokeStyle = '#000'; ctx.setLineDash([]); ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx - nx, my - ny); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(mx + nx, my + ny); ctx.lineTo(x2, y2); ctx.stroke()
      ctx.strokeStyle = '#5b9bd5'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(mx - nx, my - ny); ctx.lineTo(mx + nx, my + ny); ctx.stroke()
      ctx.lineWidth = 3
    } else {
      ctx.strokeStyle = type === 'door' ? DOOR_COLOR : type === 'secret_door' ? '#999' : '#000'
      if (type === 'secret_door') ctx.setLineDash([4, 4]); else ctx.setLineDash([])
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      if (type === 'door') {
        ctx.fillStyle = DOOR_COLOR
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
        ctx.fillRect(mx - 3, my - 3, 6, 6)
      }
    }
  }

  // Walls
  ctx.lineWidth = 3
  for (const [, cell] of cells) {
    const px = cell.x * cellSize, py = cell.y * cellSize
    drawExportWall(px, py, px + cellSize, py, cell.walls.north)
    drawExportWall(px + cellSize, py, px + cellSize, py + cellSize, cell.walls.east)
    drawExportWall(px, py + cellSize, px + cellSize, py + cellSize, cell.walls.south)
    drawExportWall(px, py, px, py + cellSize, cell.walls.west)
    // Diagonals
    if (cell.walls.diagTLBR && cell.walls.diagTLBR !== 'none') {
      drawExportWall(px, py, px + cellSize, py + cellSize, cell.walls.diagTLBR)
    }
    if (cell.walls.diagTRBL && cell.walls.diagTRBL !== 'none') {
      drawExportWall(px + cellSize, py, px, py + cellSize, cell.walls.diagTRBL)
    }
  }
  ctx.setLineDash([])

  // Markers
  for (const marker of map.markers) {
    if (marker.type === 'room_number') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'
      ctx.beginPath(); ctx.arc(marker.x, marker.y, 12, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(marker.label, marker.x, marker.y)
    }
  }

  // Labels
  for (const label of map.labels) {
    ctx.fillStyle = label.color || '#000'
    ctx.font = `bold ${label.fontSize}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label.text, label.x, label.y)
  }

  return canvas.toDataURL('image/png')
}
