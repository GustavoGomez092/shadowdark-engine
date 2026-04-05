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
const GRID_COLOR = 'rgba(100, 100, 100, 0.3)'
const SELECTION_COLOR = 'rgba(34, 197, 94, 0.3)'

export type MapTool = 'select' | 'floor' | 'wall' | 'door' | 'eraser' | 'label' | 'marker'

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

export function MapCanvas({ map, onMapChange, activeTool, activeTerrainType, activeWallType, showGrid, gridDistanceFt }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ offsetX: 20, offsetY: 20, zoom: 1 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPos, setLastPanPos] = useState<{ x: number; y: number } | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

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
    for (const [key, cell] of cellMap.current) {
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
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
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

    // Draw walls
    ctx.lineWidth = Math.max(2, 3 * zoom)
    for (const [, cell] of cellMap.current) {
      const px = offsetX + cell.x * cellSize
      const py = offsetY + cell.y * cellSize

      const drawWall = (x1: number, y1: number, x2: number, y2: number, type: WallType) => {
        if (type === 'none') return
        ctx.strokeStyle = type === 'door' ? DOOR_COLOR : type === 'secret_door' ? SECRET_DOOR_COLOR : WALL_COLOR
        if (type === 'secret_door') ctx.setLineDash([4, 4])
        else ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        if (type === 'door') {
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
          ctx.fillStyle = DOOR_COLOR
          ctx.fillRect(mx - 3, my - 3, 6, 6)
        }
      }

      drawWall(px, py, px + cellSize, py, cell.walls.north)
      drawWall(px + cellSize, py, px + cellSize, py + cellSize, cell.walls.east)
      drawWall(px, py + cellSize, px + cellSize, py + cellSize, cell.walls.south)
      drawWall(px, py, px, py + cellSize, cell.walls.west)
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
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label.text, offsetX + label.x * zoom, offsetY + label.y * zoom)
    }

    // Draw markers
    for (const marker of map.markers) {
      const mx = offsetX + marker.x * zoom
      const my = offsetY + marker.y * zoom
      const r = 12 * zoom

      if (marker.type === 'room_number') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.beginPath()
        ctx.arc(mx, my, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${10 * zoom}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(marker.label, mx, my)
      } else {
        const colors: Record<string, string> = { monster: '#ef4444', npc: '#a855f7', treasure: '#f59e0b', trap: '#ef4444', note: '#3b82f6' }
        ctx.fillStyle = colors[marker.type] || '#888'
        ctx.beginPath()
        ctx.arc(mx, my, r * 0.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = `${8 * zoom}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(marker.label.slice(0, 3), mx, my)
      }
    }

    // Grid distance label
    if (showGrid) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
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

  function paintCell(gx: number, gy: number) {
    if (!isInBounds(gx, gy)) return

    if (activeTool === 'floor') {
      onMapChange(m => {
        const layer = m.layers[0]
        const existing = layer.cells.findIndex(c => c.x === gx && c.y === gy)
        const cell: MapCell = {
          x: gx, y: gy,
          terrain: activeTerrainType,
          walls: { north: 'none', east: 'none', south: 'none', west: 'none' },
          features: [],
        }
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
        const layer = m.layers[0]
        layer.cells = layer.cells.filter(c => !(c.x === gx && c.y === gy))
      })
    } else if (activeTool === 'wall' || activeTool === 'door') {
      // Determine which edge is closest to click
      const canvas = canvasRef.current
      if (!canvas) return
      const wallType: WallType = activeTool === 'door' ? 'door' : activeWallType
      onMapChange(m => {
        const layer = m.layers[0]
        let cell = layer.cells.find(c => c.x === gx && c.y === gy)
        if (!cell) {
          cell = { x: gx, y: gy, terrain: 'stone_floor', walls: { north: 'none', east: 'none', south: 'none', west: 'none' }, features: [] }
          layer.cells.push(cell)
        }
        // Toggle all walls for simplicity on click (TODO: edge detection in future)
        const has = cell.walls.north !== 'none' || cell.walls.east !== 'none' || cell.walls.south !== 'none' || cell.walls.west !== 'none'
        if (has) {
          cell.walls = { north: 'none', east: 'none', south: 'none', west: 'none' }
        } else {
          cell.walls = { north: wallType, east: wallType, south: wallType, west: wallType }
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
          m.markers.push({
            id: generateId(),
            x: (gx + 0.5) * cellSize,
            y: (gy + 0.5) * cellSize,
            type: 'room_number',
            label: String(nextNum),
          })
        }
      })
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setLastPanPos({ x: e.clientX, y: e.clientY })
      return
    }
    if (e.button === 0) {
      setIsDrawing(true)
      const { gx, gy } = screenToGrid(e.clientX, e.clientY)
      paintCell(gx, gy)
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
    if (isDrawing && (activeTool === 'floor' || activeTool === 'eraser')) {
      const { gx, gy } = screenToGrid(e.clientX, e.clientY)
      paintCell(gx, gy)
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
    setViewport(v => ({
      ...v,
      zoom: Math.max(0.25, Math.min(4, v.zoom + delta)),
    }))
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

  // White background
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, map.width * cellSize, map.height * cellSize)

  // Build cell lookup
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

  // Walls
  ctx.lineWidth = 3
  for (const [, cell] of cells) {
    const px = cell.x * cellSize, py = cell.y * cellSize
    const drawW = (x1: number, y1: number, x2: number, y2: number, type: WallType) => {
      if (type === 'none') return
      ctx.strokeStyle = type === 'door' ? DOOR_COLOR : type === 'secret_door' ? '#999' : '#000'
      if (type === 'secret_door') ctx.setLineDash([4, 4]); else ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    }
    drawW(px, py, px + cellSize, py, cell.walls.north)
    drawW(px + cellSize, py, px + cellSize, py + cellSize, cell.walls.east)
    drawW(px, py + cellSize, px + cellSize, py + cellSize, cell.walls.south)
    drawW(px, py, px, py + cellSize, cell.walls.west)
  }
  ctx.setLineDash([])

  // Markers
  for (const marker of map.markers) {
    const mx = marker.x, my = marker.y
    if (marker.type === 'room_number') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'
      ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(marker.label, mx, my)
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
