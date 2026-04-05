import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'

export const Route = createFileRoute('/campaign/$campaignId/mapgen2')({
  component: MapGen2Page,
})

// ── Watabou-compatible JSON format ──
interface DungeonData {
  version?: string
  title: string
  story: string
  rects: DRect[]
  doors: DDoor[]
  notes: DNote[]
  columns: DColumn[]
  water: DWater[]
}

interface DRect { x: number; y: number; w: number; h: number; ending?: boolean; rotunda?: boolean }
interface DDoor { x: number; y: number; dir: { x: number; y: number }; type: number }
interface DNote { text: string; ref: string; pos: { x: number; y: number } }
interface DColumn { x: number; y: number }
interface DWater { x: number; y: number }

// ── Seeded RNG ──
function makeRng(seed: number) {
  let s = (seed & 0x7fffffff) || 1
  return () => { s = (48271 * s) % 2147483647; return (s & 0x7fffffff) / 2147483647 }
}

// ── Constants matching reference ──
const CELL = 30                    // pixels per grid cell
const INK = '#221122'
const PAPER = '#f0ece4'
const FLOOR = '#f5f0e8'
const WALL_THICK = 3               // wall band half-width
const GRID_DASH = [3, 5]           // dashed grid pattern
const HATCH_DENSITY = 8            // strokes per void cell
const HATCH_LEN_MIN = 4
const HATCH_LEN_MAX = 14
const HATCH_WIDTH = 0.8

// ── Renderer ──
function renderDungeon(canvas: HTMLCanvasElement, data: DungeonData, scale: number = 2) {
  // Find bounding box of all rects
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const r of data.rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w)
    maxY = Math.max(maxY, r.y + r.h)
  }
  // Add padding
  const pad = 4
  minX -= pad; minY -= pad; maxX += pad; maxY += pad

  const gw = maxX - minX, gh = maxY - minY
  const W = gw * CELL, H = gh * CELL

  canvas.width = W * scale
  canvas.height = H * scale
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  // Translate so minX,minY is at origin
  const ox = -minX * CELL, oy = -minY * CELL

  // Build floor set for hatching detection
  const floorCells = new Set<string>()
  for (const r of data.rects) {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++)
        floorCells.add(`${x},${y}`)
  }
  // Add door cells
  for (const d of data.doors) floorCells.add(`${d.x},${d.y}`)

  // ── Pass 1: Paper background ──
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)

  // ── Pass 2: Hatching on void cells near dungeon ──
  const rng = makeRng(12345)
  for (let gy = minX; gy < maxX; gy++) {
    for (let gx = minY; gx < maxY; gx++) {
      // Swap: iterate grid coordinates properly
    }
  }
  // Proper iteration over grid
  for (let gy = minY; gy < maxY; gy++) {
    for (let gx = minX; gx < maxX; gx++) {
      if (floorCells.has(`${gx},${gy}`)) continue
      // Check proximity to floor
      let near = false
      for (let dy = -2; dy <= 2 && !near; dy++)
        for (let dx = -2; dx <= 2 && !near; dx++)
          if (floorCells.has(`${gx + dx},${gy + dy}`)) near = true
      if (!near) continue

      const px = ox + gx * CELL, py = oy + gy * CELL
      ctx.strokeStyle = INK
      ctx.lineWidth = HATCH_WIDTH
      ctx.lineCap = 'round'
      for (let i = 0; i < HATCH_DENSITY; i++) {
        const sx = px + rng() * CELL
        const sy = py + rng() * CELL
        const angle = (rng() < 0.5 ? 0.25 : 0.75) * Math.PI + (rng() - 0.5) * 0.5
        const len = HATCH_LEN_MIN + rng() * (HATCH_LEN_MAX - HATCH_LEN_MIN)
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
        ctx.stroke()
      }
    }
  }

  // ── Pass 3: Floor fills (white rooms) ──
  for (const r of data.rects) {
    const px = ox + r.x * CELL, py = oy + r.y * CELL
    const pw = r.w * CELL, ph = r.h * CELL
    ctx.fillStyle = FLOOR
    ctx.fillRect(px, py, pw, ph)
  }

  // ── Pass 4: Floor grid (dashed lines inside rooms) ──
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.4
  ctx.setLineDash(GRID_DASH)
  for (const r of data.rects) {
    const px = ox + r.x * CELL, py = oy + r.y * CELL
    // Vertical grid lines
    for (let x = 1; x < r.w; x++) {
      ctx.beginPath()
      ctx.moveTo(px + x * CELL, py)
      ctx.lineTo(px + x * CELL, py + r.h * CELL)
      ctx.stroke()
    }
    // Horizontal grid lines
    for (let y = 1; y < r.h; y++) {
      ctx.beginPath()
      ctx.moveTo(px, py + y * CELL)
      ctx.lineTo(px + r.w * CELL, py + y * CELL)
      ctx.stroke()
    }
  }
  ctx.setLineDash([])

  // ── Pass 5: Water ──
  if (data.water.length > 0) {
    ctx.fillStyle = 'rgba(100,150,200,0.15)'
    for (const w of data.water) {
      ctx.fillRect(ox + w.x * CELL, oy + w.y * CELL, CELL, CELL)
    }
  }

  // ── Pass 6: Columns ──
  for (const col of data.columns) {
    const cx = ox + (col.x + 0.5) * CELL, cy = oy + (col.y + 0.5) * CELL
    ctx.fillStyle = FLOOR
    ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.15, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = INK; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.15, 0, Math.PI * 2); ctx.stroke()
  }

  // ── Pass 7: Walls — solid filled polygons on room perimeters ──
  // For each rect, draw walls on edges that face void (no adjacent room)
  ctx.fillStyle = INK
  for (const r of data.rects) {
    const x1 = ox + r.x * CELL, y1 = oy + r.y * CELL
    const x2 = x1 + r.w * CELL, y2 = y1 + r.h * CELL
    const wt = WALL_THICK

    // Check each edge — draw wall if no adjacent floor
    // North edge
    drawWallEdge(ctx, x1, y1, x2, y1, wt, data.rects, r, 'north', ox, oy, INK)
    // South edge
    drawWallEdge(ctx, x1, y2, x2, y2, wt, data.rects, r, 'south', ox, oy, INK)
    // West edge
    drawWallEdge(ctx, x1, y1, x1, y2, wt, data.rects, r, 'west', ox, oy, INK)
    // East edge
    drawWallEdge(ctx, x2, y1, x2, y2, wt, data.rects, r, 'east', ox, oy, INK)
  }

  // ── Pass 8: Doors ──
  for (const door of data.doors) {
    const cx = ox + (door.x + 0.5) * CELL
    const cy = oy + (door.y + 0.5) * CELL
    const isHoriz = door.dir.y !== 0
    drawDoor(ctx, cx, cy, isHoriz, door.type, INK, FLOOR)
  }

  // ── Pass 9: Room numbers ──
  // Number the large rooms (w > 1 and h > 1, not corridor cells)
  const largeRects = data.rects.filter(r => r.w > 1 && r.h > 1)
  for (let i = 0; i < largeRects.length; i++) {
    const r = largeRects[i]
    const cx = ox + (r.x + r.w / 2) * CELL
    const cy = oy + (r.y + r.h / 2) * CELL
    const num = String(i + 1)
    const fontSize = CELL * 0.7
    ctx.font = `bold ${fontSize}px 'Georgia', 'Times New Roman', serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = INK
    ctx.fillText(num, cx, cy + 1)
  }

  // ── Pass 10: Notes (text boxes) ──
  ctx.font = `italic ${CELL * 0.38}px 'Georgia', 'Times New Roman', serif`
  for (const note of data.notes) {
    const nx = ox + note.pos.x * CELL
    const ny = oy + note.pos.y * CELL
    const text = `${note.ref}. ${note.text}`

    // Measure text and draw box
    const lines = wrapText(ctx, text, CELL * 5)
    const lineH = CELL * 0.45
    const boxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + CELL * 0.5
    const boxH = lines.length * lineH + CELL * 0.3
    const bx = nx - boxW / 2, by = ny - boxH / 2

    // Box background
    ctx.fillStyle = FLOOR
    ctx.fillRect(bx, by, boxW, boxH)
    ctx.strokeStyle = INK; ctx.lineWidth = 1
    ctx.strokeRect(bx, by, boxW, boxH)

    // Text
    ctx.fillStyle = INK
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], nx, by + CELL * 0.15 + i * lineH)
    }
  }

  // ── Pass 11: Title and story ──
  if (data.title) {
    const titleSize = CELL * 1.2
    ctx.font = `bold ${titleSize}px 'Georgia', 'Times New Roman', serif`
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillText(data.title, W / 2, CELL * 2.5)
  }
  if (data.story) {
    ctx.font = `italic ${CELL * 0.4}px 'Georgia', 'Times New Roman', serif`
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    const storyLines = wrapText(ctx, data.story, W * 0.6)
    for (let i = 0; i < storyLines.length; i++) {
      ctx.fillText(storyLines[i], W / 2, CELL * 2.8 + i * CELL * 0.5)
    }
  }
}

// ── Wall edge renderer ──
function drawWallEdge(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  wt: number, allRects: DRect[], thisRect: DRect,
  side: 'north' | 'south' | 'east' | 'west',
  ox: number, oy: number, ink: string,
) {
  // Draw wall as filled polygon band
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = -(dy / len) * wt, ny = (dx / len) * wt

  // Extend slightly past corners
  const ext = wt * 0.5
  const edx = (dx / len) * ext, edy = (dy / len) * ext
  const ex1 = x1 - edx, ey1 = y1 - edy
  const ex2 = x2 + edx, ey2 = y2 + edy

  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.moveTo(ex1 + nx, ey1 + ny)
  ctx.lineTo(ex2 + nx, ey2 + ny)
  ctx.lineTo(ex2 - nx, ey2 - ny)
  ctx.lineTo(ex1 - nx, ey1 - ny)
  ctx.closePath()
  ctx.fill()
}

// ── Door renderer ──
function drawDoor(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, isHoriz: boolean, type: number,
  ink: string, floor: string,
) {
  const s = CELL * 0.35 // door half-size

  // Clear wall behind door
  ctx.fillStyle = floor
  if (isHoriz) {
    ctx.fillRect(cx - s, cy - WALL_THICK - 1, s * 2, WALL_THICK * 2 + 2)
  } else {
    ctx.fillRect(cx - WALL_THICK - 1, cy - s, WALL_THICK * 2 + 2, s * 2)
  }

  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = 1.2

  if (type === 0 || type === 1 || type === 2) {
    // Regular door — small rectangle
    if (isHoriz) {
      ctx.strokeRect(cx - s * 0.7, cy - 2, s * 1.4, 4)
    } else {
      ctx.strokeRect(cx - 2, cy - s * 0.7, 4, s * 1.4)
    }
    // Locked: add X
    if (type === 1) {
      ctx.lineWidth = 0.8
      if (isHoriz) {
        ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy - 1.5); ctx.lineTo(cx + s * 0.4, cy + 1.5); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + s * 0.4, cy - 1.5); ctx.lineTo(cx - s * 0.4, cy + 1.5); ctx.stroke()
      } else {
        ctx.beginPath(); ctx.moveTo(cx - 1.5, cy - s * 0.4); ctx.lineTo(cx + 1.5, cy + s * 0.4); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + 1.5, cy - s * 0.4); ctx.lineTo(cx - 1.5, cy + s * 0.4); ctx.stroke()
      }
    }
  } else if (type === 3) {
    // Stairs — parallel lines
    ctx.lineWidth = 0.8
    for (let i = -2; i <= 2; i++) {
      if (isHoriz) {
        ctx.beginPath(); ctx.moveTo(cx - s, cy + i * 2.5); ctx.lineTo(cx + s, cy + i * 2.5); ctx.stroke()
      } else {
        ctx.beginPath(); ctx.moveTo(cx + i * 2.5, cy - s); ctx.lineTo(cx + i * 2.5, cy + s); ctx.stroke()
      }
    }
  } else if (type === 5) {
    // Gate/portcullis — vertical bars
    ctx.lineWidth = 1
    const bars = 3
    for (let i = 0; i < bars; i++) {
      const t = (i + 0.5) / bars
      if (isHoriz) {
        const bx = cx - s + t * s * 2
        ctx.beginPath(); ctx.moveTo(bx, cy - 3); ctx.lineTo(bx, cy + 3); ctx.stroke()
      } else {
        const by = cy - s + t * s * 2
        ctx.beginPath(); ctx.moveTo(cx - 3, by); ctx.lineTo(cx + 3, by); ctx.stroke()
      }
    }
  } else if (type === 6) {
    // Secret door — thin dashed line across
    ctx.lineWidth = 0.8
    ctx.setLineDash([2, 2])
    if (isHoriz) {
      ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s); ctx.stroke()
    }
    ctx.setLineDash([])
  } else {
    // Default: open passage (arch) — small dots at ends
    ctx.fillStyle = ink
    if (isHoriz) {
      ctx.beginPath(); ctx.arc(cx - s, cy, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + s, cy, 1.5, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.beginPath(); ctx.arc(cx, cy - s, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx, cy + s, 1.5, 0, Math.PI * 2); ctx.fill()
    }
  }
}

// ── Text wrapping helper ──
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = test
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

// ══════════════════════════════════════════════
// ── Page Component ──
// ══════════════════════════════════════════════

function MapGen2Page() {
  const campaign = useCampaignStore(s => s.campaign)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dungeonData, setDungeonData] = useState<DungeonData | null>(null)
  const [seed, setSeed] = useState(Math.floor(Math.random() * 99999999))
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Render when data changes
  useEffect(() => {
    if (!canvasRef.current || !dungeonData) return
    renderDungeon(canvasRef.current, dungeonData, 2)
  }, [dungeonData])

  function handleImportJSON(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as DungeonData
        if (!data.rects || !data.doors) throw new Error('Invalid dungeon JSON')
        setDungeonData(data)
      } catch (e) {
        console.error('Failed to parse dungeon JSON:', e)
      }
    }
    reader.readAsText(file)
  }

  function handleExportPNG() {
    if (!canvasRef.current) return
    const a = document.createElement('a')
    a.href = canvasRef.current.toDataURL('image/png')
    a.download = `${dungeonData?.title?.toLowerCase().replace(/\s+/g, '_') || 'dungeon'}.png`
    a.click()
  }

  function handlePrint() {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>${dungeonData?.title || 'Dungeon'}</title>
      <style>@media print { body { margin: 0; } img { max-width: 100%; } }
      body { display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; background:white; }
      img { max-width:95vw; max-height:95vh; }</style></head>
      <body><img src="${dataUrl}"/><script>setTimeout(()=>window.print(),500)</script></body></html>`)
    win.document.close()
  }

  if (!campaign) return null

  return (
    <main className="flex flex-col h-[calc(100vh-120px)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/50 px-3 py-2">
        <h2 className="text-sm font-semibold mr-2">Map Generator v2</h2>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
        >
          Import Dungeon JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleImportJSON(file)
            e.target.value = ''
          }}
        />

        <div className="flex-1" />

        {dungeonData && (
          <>
            <button onClick={handleExportPNG} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">Export PNG</button>
            <button onClick={handlePrint} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">Print</button>
          </>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto bg-[#e8e4dc] flex items-center justify-center p-4">
        {dungeonData ? (
          <canvas ref={canvasRef} className="shadow-lg" />
        ) : (
          <div className="text-center">
            <p className="text-lg font-semibold text-[#221122] mb-2">One-Page Dungeon Renderer</p>
            <p className="text-sm text-[#221122]/60 mb-4">
              Import a dungeon JSON file from{' '}
              <a href="https://watabou.github.io/one-page-dungeon/" target="_blank" rel="noopener" className="text-primary underline">
                watabou's generator
              </a>
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Import Dungeon JSON
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
