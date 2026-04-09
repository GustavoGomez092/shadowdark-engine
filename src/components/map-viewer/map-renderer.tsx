/**
 * MapRenderer - Uses the existing DungeonRenderer for map display,
 * with token overlay composited on top.
 *
 * Zoom: canvas CSS size = base size * zoom, then DungeonApp.draw() re-renders.
 * Pan: native overflow:auto scroll on the container.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import type { CampaignMap } from '@/schemas/map.ts'
import type { MapToken, MapLightSource, WallSegment } from '@/schemas/map-viewer.ts'
import type { VisibilityResult } from '@/lib/map-viewer/visibility.ts'
import { computeCombinedVisibility } from '@/lib/map-viewer/visibility.ts'
// @ts-ignore
import DungeonApp from '@/lib/dungeon-renderer/App.js'
// @ts-ignore
import style from '@/lib/dungeon-renderer/Style.js'
// @ts-ignore
import Story from '@/lib/dungeon-renderer/Story.js'

const HP_STATUS_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  wounded: '#f59e0b',
  critical: '#ef4444',
  dying: '#7f1d1d',
  dead: '#374151',
}

export interface MapViewport {
  offsetX: number
  offsetY: number
  zoom: number
}

interface Props {
  mapData: CampaignMap
  tokens: MapToken[]
  wallSegments: WallSegment[]
  lightSources: MapLightSource[]
  exploredCells: Set<string>
  fogMode: 'none' | 'player'
  viewport: MapViewport
  onViewportChange: (v: MapViewport) => void
  onTokenDragEnd?: (tokenId: string, gridX: number, gridY: number) => void
  onTokenClick?: (tokenId: string) => void
  onMapClick?: (gridX: number, gridY: number) => void
  onDungeonReady?: (app: any) => void
  selectedTokenId?: string | null
  placingToken?: boolean
  panMode?: boolean
  /** Token referenceId to center the view on after init */
  centerOnTokenRef?: string
  /** Hide titles, notes, room numbers (player view) */
  playerView?: boolean
  className?: string
}

export function MapRenderer({
  mapData, tokens, wallSegments, lightSources, exploredCells,
  fogMode, viewport, onViewportChange: _onViewportChange,
  onTokenDragEnd, onTokenClick, onMapClick, onDungeonReady,
  selectedTokenId, placingToken, panMode, centerOnTokenRef, playerView, className,
}: Props) {
  // Outer sizer div (fixed size, measures available space)
  const sizerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dungeonCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any>(null)
  const storyLoaded = useRef(false)
  const [ready, setReady] = useState(false)

  // Base size: measured once from the sizer, not affected by canvas growth
  const baseSizeRef = useRef({ width: 0, height: 0 })

  // Keep latest tokens in a ref so async code can read current values
  const tokensRef = useRef(tokens)
  tokensRef.current = tokens

  // Flag: center on token after first zoom-redraw
  const needsCenterOnToken = useRef(false)

  // Token drag
  const draggingTokenId = useRef<string | null>(null)
  const dragPos = useRef<{ gx: number; gy: number } | null>(null)

  // Visibility cache
  const visibilityRef = useRef<VisibilityResult | null>(null)
  const visibilityKeyRef = useRef('')

  // Measure the sizer once on mount and on window resize
  const [baseSizeReady, setBaseSizeReady] = useState(false)
  useEffect(() => {
    function measure() {
      const el = sizerRef.current
      if (!el) return
      baseSizeRef.current = { width: el.clientWidth, height: el.clientHeight }
      if (el.clientWidth > 10) setBaseSizeReady(true)
    }
    measure()
    // Retry measurement shortly in case layout isn't ready yet
    const timer = setTimeout(measure, 100)
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('resize', measure); clearTimeout(timer) }
  }, [])

  // ── Initialize DungeonApp ──
  const initMapId = useRef<string | null>(null)
  useEffect(() => {
    const canvas = dungeonCanvasRef.current
    if (!canvas || !mapData.dungeonData) return
    if (baseSizeRef.current.width < 10) return

    // Don't re-init same map
    if (initMapId.current === mapData.id && appRef.current) return
    initMapId.current = mapData.id

    let cancelled = false

    async function initDungeon() {
      if (!storyLoaded.current) {
        await Story.loadData()
        storyLoaded.current = true
      }
      if (cancelled) return

      style.autoRotate = false
      style.showProps = true
      style.showGrid = true
      style.showWater = true
      style.showSecrets = false
      style.showNotes = true
      style.showTitle = true
      style.noteMode = 'normal'

      // Restore editor state from saved data
      const es = mapData.dungeonData!.editorState
      if (es) {
        if (es.rotation != null) style.rotation = es.rotation
        if (es.showGrid != null) style.showGrid = es.showGrid
        if (es.showWater != null) style.showWater = es.showWater
        if (es.showProps != null) style.showProps = es.showProps
        if (es.showNotes != null) style.showNotes = es.showNotes
        if (es.bw != null) style.bw = es.bw
      }

      // Player view: override AFTER editor state to hide GM-only info
      if (playerView) {
        style.showNotes = false
        style.showTitle = false
        style.noteMode = 'hidden'
      }

      const { width: bw, height: bh } = baseSizeRef.current
      // Set canvas CSS before DungeonApp reads it
      canvas!.style.width = bw + 'px'
      canvas!.style.height = bh + 'px'

      const dungeonSeed = (mapData.dungeonData as any)?.seed || mapData.seed || 0
      const app = new DungeonApp(canvas!, { seed: dungeonSeed })
      if (cancelled) return

      await app.init()
      if (cancelled) return

      app.resize(bw, bh)
      app.loadFromSave(mapData.dungeonData!)

      // loadFromSave restores editor state which overrides our style settings.
      // Re-apply playerView overrides AFTER load and redraw.
      if (playerView) {
        style.showNotes = false
        style.showTitle = false
        style.noteMode = 'hidden'
        app.draw()
      }

      // Size overlay to match
      const overlay = overlayCanvasRef.current
      if (overlay) {
        const dpr = window.devicePixelRatio || 1
        overlay.width = bw * dpr
        overlay.height = bh * dpr
        overlay.style.width = bw + 'px'
        overlay.style.height = bh + 'px'
      }

      appRef.current = app
      setReady(true)
      onDungeonReady?.(app)

      if (centerOnTokenRef) {
        // Player view: defer centering to zoom effect (needs zoomed layout)
        needsCenterOnToken.current = true
      } else {
        // GM view: center the canvas immediately
        const cp = centeredPan(viewport.zoom)
        panRef.current = cp
        setPan(cp)
      }
    }

    initDungeon().catch(e => console.error('Map viewer init failed:', e))

    return () => {
      cancelled = true
      appRef.current = null
      setReady(false)
      initMapId.current = null
    }
  }, [mapData.id, baseSizeReady])

  /** Compute the pan offset that centers the canvas in the viewport at a given zoom */
  function centeredPan(zoom: number): { x: number; y: number } {
    const { width: bw, height: bh } = baseSizeRef.current
    return {
      x: -bw * (zoom - 1) / 2,
      y: -bh * (zoom - 1) / 2,
    }
  }

  // ── Zoom: resize canvas, re-center pan, and redraw ──
  const prevZoomRef = useRef(viewport.zoom)
  useEffect(() => {
    const app = appRef.current
    const canvas = dungeonCanvasRef.current
    const overlay = overlayCanvasRef.current
    if (!app || !canvas || !ready) return

    const { width: bw, height: bh } = baseSizeRef.current
    if (bw < 10) return

    const w = Math.round(bw * viewport.zoom)
    const h = Math.round(bh * viewport.zoom)
    const dpr = window.devicePixelRatio || 1

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    app.draw()

    if (overlay) {
      overlay.width = w * dpr
      overlay.height = h * dpr
      overlay.style.width = w + 'px'
      overlay.style.height = h + 'px'
    }

    // One-time: center on player's token after first zoom-redraw
    if (needsCenterOnToken.current && centerOnTokenRef) {
      needsCenterOnToken.current = false
      const token = tokensRef.current.find(t => t.referenceId === centerOnTokenRef)
      if (token && app.renderer?._layout) {
        const { sx, sy } = gridToScreen(token.gridX, token.gridY)
        const newPan = { x: bw / 2 - sx, y: bh / 2 - sy }
        panRef.current = newPan
        setPan(newPan)
        prevZoomRef.current = viewport.zoom
        renderOverlay()
        return
      }
    }

    // Adjust pan so the viewport center stays fixed when zoom changes
    const oldZoom = prevZoomRef.current
    if (oldZoom !== viewport.zoom) {
      const ratio = viewport.zoom / oldZoom
      const cx = bw / 2 - panRef.current.x
      const cy = bh / 2 - panRef.current.y
      const newPan = {
        x: bw / 2 - cx * ratio,
        y: bh / 2 - cy * ratio,
      }
      panRef.current = newPan
      setPan(newPan)
      prevZoomRef.current = viewport.zoom
    }

    renderOverlay()
  }, [viewport.zoom, ready])

  // ── Compute visibility (all in grid-unit coordinates) ──
  useEffect(() => {
    if (fogMode === 'none' || lightSources.length === 0) {
      visibilityRef.current = null
      return
    }
    const key = JSON.stringify(lightSources.map(s => `${s.x},${s.y},${s.radius}`))
    if (key === visibilityKeyRef.current) return
    // cellSize=1 because walls, lights, and results are all in grid units
    visibilityRef.current = computeCombinedVisibility(
      lightSources, wallSegments, 1, 100, 100,
    )
    visibilityKeyRef.current = key
  }, [fogMode, lightSources, wallSegments])

  /** Read the dungeon renderer's stored layout transform */
  function getLayout(): { scaledCS: number, mapX: number, mapY: number, fitScale: number, rotation: number, cs: number } {
    const app = appRef.current
    const layout = app?.renderer?._layout
    if (!layout) return { scaledCS: 30, mapX: 0, mapY: 0, fitScale: 1, rotation: 0, cs: 30 }
    return {
      scaledCS: layout.scaledCS,
      mapX: layout.mapX,
      mapY: layout.mapY,
      fitScale: layout.fitScale,
      rotation: layout.rotation || 0,
      cs: app.renderer.cellSize || 30,
    }
  }

  /** Convert a raw grid point to CSS pixel coords using the dungeon layout (no centering offset) */
  function gridPointToScreen(gx: number, gy: number): { sx: number; sy: number } {
    const { scaledCS, mapX, mapY, rotation, cs } = getLayout()
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const px = gx * cs
    const py = gy * cs
    return {
      sx: mapX + (cos * px - sin * py) * (scaledCS / cs),
      sy: mapY + (sin * px + cos * py) * (scaledCS / cs),
    }
  }

  /** Convert grid cell coords to screen (centered within the cell — for tokens) */
  function gridToScreen(gx: number, gy: number): { sx: number; sy: number } {
    return gridPointToScreen(gx + 0.5, gy + 0.5)
  }

  // ── Render overlay (tokens + optional fog) ──
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    const app = appRef.current
    if (!canvas || !app?.renderer) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = parseFloat(canvas.style.width) || baseSizeRef.current.width
    const h = parseFloat(canvas.style.height) || baseSizeRef.current.height
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const { scaledCS } = getLayout()

    for (const token of tokens) {
      if (!token.visible && fogMode === 'player') continue
      const isDragging = token.id === draggingTokenId.current
      const gx = isDragging && dragPos.current ? dragPos.current.gx : token.gridX
      const gy = isDragging && dragPos.current ? dragPos.current.gy : token.gridY

      const { sx: cx, sy: cy } = gridToScreen(gx, gy)
      const tokenR = Math.max(4, scaledCS * 0.4 * token.size)
      const isSelected = token.id === selectedTokenId

      if (isSelected) { ctx.shadowColor = token.color; ctx.shadowBlur = 8 }

      ctx.strokeStyle = token.color
      ctx.lineWidth = Math.max(2, scaledCS * 0.06)
      ctx.beginPath(); ctx.arc(cx, cy, tokenR, 0, Math.PI * 2); ctx.stroke()

      ctx.fillStyle = isDragging ? 'rgba(30,30,30,0.7)' : 'rgba(20,20,20,0.85)'
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, tokenR - 1), 0, Math.PI * 2); ctx.fill()

      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0

      ctx.fillStyle = token.color
      ctx.font = `bold ${Math.max(10, scaledCS * 0.3)}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(token.name[0]?.toUpperCase() || '?', cx, cy)

      if (token.hpStatus && token.hpStatus !== 'healthy') {
        ctx.fillStyle = HP_STATUS_COLORS[token.hpStatus] || '#888'
        ctx.beginPath(); ctx.arc(cx + tokenR * 0.7, cy - tokenR * 0.7, Math.max(3, scaledCS * 0.08), 0, Math.PI * 2); ctx.fill()
      }

      const nameY = cy + tokenR + 3
      ctx.font = `${Math.max(8, scaledCS * 0.18)}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      const nw = ctx.measureText(token.name).width
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.fillRect(cx - nw / 2 - 2, nameY - 1, nw + 4, Math.max(10, scaledCS * 0.2) + 2)
      ctx.fillStyle = '#fff'
      ctx.fillText(token.name, cx, nameY)
    }

    if (fogMode === 'player') {
      drawFog(ctx, w, h, gridPointToScreen, getLayout, visibilityRef.current, exploredCells)
    }
  }, [tokens, fogMode, exploredCells, selectedTokenId, lightSources, mapData.cellSize, ready, viewport.zoom])

  useEffect(() => {
    if (ready) {
      const id = requestAnimationFrame(renderOverlay)
      return () => cancelAnimationFrame(id)
    }
  }, [renderOverlay, ready])

  // ── Transform-based pan ──
  const isPanning = useRef(false)
  const lastPanPos = useRef<{ x: number; y: number } | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // ── Block outer page scroll when mouse is over the map ──
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Coordinate helpers ──
  /** Convert screen position to grid cell (inverse of gridPointToScreen, then floor) */
  function screenToGrid(clientX: number, clientY: number): { gx: number; gy: number } {
    const el = scrollRef.current
    if (!el) return { gx: 0, gy: 0 }
    const rect = el.getBoundingClientRect()
    const { scaledCS, mapX, mapY, rotation, cs } = getLayout()
    const sx = clientX - rect.left - panRef.current.x
    const sy = clientY - rect.top - panRef.current.y
    const rx = sx - mapX
    const ry = sy - mapY
    const f = scaledCS / cs
    const ux = rx / f
    const uy = ry / f
    const cos = Math.cos(-rotation)
    const sin = Math.sin(-rotation)
    const gxf = (cos * ux - sin * uy) / cs
    const gyf = (sin * ux + cos * uy) / cs
    return { gx: Math.floor(gxf), gy: Math.floor(gyf) }
  }

  /** Find the nearest token to screen coordinates */
  function findTokenAtScreen(clientX: number, clientY: number): MapToken | undefined {
    const el = scrollRef.current
    if (!el) return undefined
    const rect = el.getBoundingClientRect()
    const mx = clientX - rect.left - panRef.current.x
    const my = clientY - rect.top - panRef.current.y
    const { scaledCS } = getLayout()
    const hitRadius = scaledCS * 0.6

    let closest: MapToken | undefined
    let closestDist = hitRadius

    for (const token of tokens) {
      const { sx, sy } = gridToScreen(token.gridX, token.gridY)
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2)
      if (dist < closestDist) {
        closestDist = dist
        closest = token
      }
    }
    return closest
  }

  // Track mouse movement distance to distinguish click from drag
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)
  const DRAG_THRESHOLD = 4

  function handleMouseDown(e: React.MouseEvent) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }

    // Middle mouse button = pan
    if (e.button === 1) {
      e.preventDefault()
      isPanning.current = true
      lastPanPos.current = { x: e.clientX, y: e.clientY }
      return
    }

    if (e.button !== 0) return

    // Left + Cmd/Ctrl OR panMode active = pan
    if (e.metaKey || e.ctrlKey || panMode) {
      isPanning.current = true
      lastPanPos.current = { x: e.clientX, y: e.clientY }
      return
    }

    // Check if clicking on a token to start dragging
    const token = findTokenAtScreen(e.clientX, e.clientY)
    if (token && onTokenDragEnd) {
      draggingTokenId.current = token.id
      dragPos.current = { gx: token.gridX, gy: token.gridY }
      onTokenClick?.(token.id)
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    // Panning (Cmd/Ctrl + drag)
    if (isPanning.current && lastPanPos.current) {
      const dx = e.clientX - lastPanPos.current.x
      const dy = e.clientY - lastPanPos.current.y
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy }
      setPan({ ...panRef.current })
      lastPanPos.current = { x: e.clientX, y: e.clientY }
      return
    }

    // Token dragging
    if (draggingTokenId.current) {
      const { gx, gy } = screenToGrid(e.clientX, e.clientY)
      dragPos.current = { gx, gy }
      requestAnimationFrame(renderOverlay)
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    const wasDrag = mouseDownPos.current &&
      (Math.abs(e.clientX - mouseDownPos.current.x) > DRAG_THRESHOLD ||
       Math.abs(e.clientY - mouseDownPos.current.y) > DRAG_THRESHOLD)

    // Finish token drag
    if (draggingTokenId.current && dragPos.current && wasDrag) {
      onTokenDragEnd?.(draggingTokenId.current, dragPos.current.gx, dragPos.current.gy)
    }

    // Plain click (no significant movement) = place token or select
    if (!wasDrag && !isPanning.current) {
      const { gx, gy } = screenToGrid(e.clientX, e.clientY)
      const token = findTokenAtScreen(e.clientX, e.clientY)
      if (token && !draggingTokenId.current) {
        onTokenClick?.(token.id)
      } else if (placingToken && onMapClick) {
        onMapClick(gx, gy)
      } else {
        onTokenClick?.('')
      }
    }

    draggingTokenId.current = null
    dragPos.current = null
    isPanning.current = false
    lastPanPos.current = null
    mouseDownPos.current = null
  }

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      {/* Invisible sizer: measures available space without being affected by canvas */}
      <div ref={sizerRef} className="absolute inset-0 pointer-events-none" />

      {/* Map interaction area: click-drag tokens, Cmd+drag or hand-mode to pan */}
      <div
        ref={scrollRef}
        className={`w-full h-full overflow-hidden ${panMode ? 'cursor-grab active:cursor-grabbing' : placingToken ? 'cursor-crosshair' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
      >
        <div
          className="relative inline-block origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          <canvas ref={dungeonCanvasRef} className="block" />
          <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}

// ── Fog of War ──
// All coordinates in grid units, converted to screen via gridToScreen

function drawFog(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number, canvasHeight: number,
  pointToScreen: (gx: number, gy: number) => { sx: number; sy: number },
  getLayout: () => { scaledCS: number; mapX: number; mapY: number; fitScale: number; rotation: number; cs: number },
  visibility: VisibilityResult | null,
  exploredCells: Set<string>,
) {
  const fogCanvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  fogCanvas.width = canvasWidth * dpr
  fogCanvas.height = canvasHeight * dpr
  const fogCtx = fogCanvas.getContext('2d')!
  fogCtx.scale(dpr, dpr)

  // Full darkness
  fogCtx.fillStyle = 'rgba(0, 0, 0, 1)'
  fogCtx.fillRect(0, 0, canvasWidth, canvasHeight)

  const { scaledCS } = getLayout()

  // Punch through explored cells (dimmed)
  fogCtx.globalCompositeOperation = 'destination-out'
  for (const key of exploredCells) {
    const [cx, cy] = key.split(',').map(Number)
    // Convert cell corner and opposite corner to screen
    const tl = pointToScreen(cx, cy)
    const br = pointToScreen(cx + 1, cy + 1)
    fogCtx.fillStyle = 'rgba(255,255,255,0.18)'
    fogCtx.fillRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy)
  }

  // Punch through lit areas with visibility polygons
  if (visibility) {
    for (const { polygon, source } of visibility.polygons) {
      if (polygon.length < 3) continue
      fogCtx.save()
      fogCtx.globalCompositeOperation = 'destination-out'

      // Draw visibility polygon in screen coords
      fogCtx.beginPath()
      const p0 = pointToScreen(polygon[0].x, polygon[0].y)
      fogCtx.moveTo(p0.sx, p0.sy)
      for (let i = 1; i < polygon.length; i++) {
        const pi = pointToScreen(polygon[i].x, polygon[i].y)
        fogCtx.lineTo(pi.sx, pi.sy)
      }
      fogCtx.closePath()
      fogCtx.clip()

      // Radial gradient from light source center
      const sc = pointToScreen(source.x, source.y)
      const sr = source.radius * scaledCS  // radius in grid units → screen pixels
      const grad = fogCtx.createRadialGradient(sc.sx, sc.sy, 0, sc.sx, sc.sy, sr)
      grad.addColorStop(0, `rgba(255,255,255,${source.intensity})`)
      grad.addColorStop(0.6, `rgba(255,255,255,${source.intensity * 0.85})`)
      grad.addColorStop(0.85, `rgba(255,255,255,${source.intensity * 0.4})`)
      grad.addColorStop(1.0, 'rgba(255,255,255,0)')
      fogCtx.fillStyle = grad
      fogCtx.fillRect(sc.sx - sr, sc.sy - sr, sr * 2, sr * 2)
      fogCtx.restore()
    }
  }

  // Composite fog onto main overlay
  fogCtx.globalCompositeOperation = 'source-over'
  ctx.drawImage(fogCanvas, 0, 0, canvasWidth, canvasHeight)
}
