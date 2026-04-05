import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'

export const Route = createFileRoute('/campaign/$campaignId/mapgen2')({
  component: MapGen2Page,
})

// ── Watabou JSON types ──
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

// ── Constants ──
const CELL = 30
const INK = '#221122'
const PAPER = '#f0ece4'
const FLOOR = '#f5f0e8'

// ── Main Renderer ──
function renderDungeon(canvas: HTMLCanvasElement, data: DungeonData, scale: number = 2, rotation: number = 0) {
  // Bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const r of data.rects) {
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h)
  }
  const pad = 5
  minX -= pad; minY -= pad; maxX += pad; maxY += pad

  // Add space for title at top
  const titleSpace = 4 // cells
  minY -= titleSpace

  const gw = maxX - minX, gh = maxY - minY
  const W = gw * CELL, H = gh * CELL

  canvas.width = W * scale
  canvas.height = H * scale
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  const ox = -minX * CELL, oy = -minY * CELL

  // Build floor set (all cells covered by any rect)
  const floorCells = new Set<string>()
  for (const r of data.rects)
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++)
        floorCells.add(`${x},${y}`)

  // Identify large rooms (not 1x1 corridor connectors)
  const largeRects = data.rects.filter(r => r.w > 1 || r.h > 1)

  // Apply rotation
  if (rotation !== 0) {
    ctx.translate(W / 2, H / 2)
    ctx.rotate(rotation * Math.PI / 180)
    ctx.translate(-W / 2, -H / 2)
  }

  // ═══ PASS 1: Paper background ═══
  ctx.fillStyle = PAPER
  ctx.fillRect(-50, -50, W + 100, H + 100)

  // ═══ PASS 2: Full-canvas crosshatching ═══
  // Dense hatching covering the ENTIRE canvas, like the reference
  const rng = makeRng(7919)
  ctx.strokeStyle = INK
  ctx.lineCap = 'round'

  // Layer 1: 45° lines
  ctx.lineWidth = 0.5
  ctx.globalAlpha = 0.25
  for (let i = 0; i < (W + H) / 6; i++) {
    const startX = -H + i * 6 + (rng() - 0.5) * 2
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    ctx.lineTo(startX + H, H)
    ctx.stroke()
  }
  // Layer 2: 135° lines
  for (let i = 0; i < (W + H) / 6; i++) {
    const startX = i * 6 + (rng() - 0.5) * 2
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    ctx.lineTo(startX - H, H)
    ctx.stroke()
  }
  // Layer 3: Short random strokes for organic feel
  ctx.lineWidth = 0.6
  ctx.globalAlpha = 0.2
  const strokeCount = Math.floor(W * H / 80)
  for (let i = 0; i < strokeCount; i++) {
    const sx = rng() * W, sy = rng() * H
    const angle = (rng() < 0.5 ? 0.25 : 0.75) * Math.PI + (rng() - 0.5) * 0.4
    const len = 4 + rng() * 10
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
    ctx.stroke()
  }
  ctx.globalAlpha = 1.0

  // ═══ PASS 3: Floor fills (white rooms cut through hatching) ═══
  ctx.fillStyle = FLOOR
  for (const r of data.rects) {
    ctx.fillRect(ox + r.x * CELL, oy + r.y * CELL, r.w * CELL, r.h * CELL)
  }

  // ═══ PASS 4: Dashed grid inside rooms ═══
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.4
  ctx.setLineDash([3, 5])
  for (const r of data.rects) {
    if (r.w <= 1 && r.h <= 1) continue // skip corridor connectors
    const px = ox + r.x * CELL, py = oy + r.y * CELL
    for (let x = 1; x < r.w; x++) {
      ctx.beginPath(); ctx.moveTo(px + x * CELL, py); ctx.lineTo(px + x * CELL, py + r.h * CELL); ctx.stroke()
    }
    for (let y = 1; y < r.h; y++) {
      ctx.beginPath(); ctx.moveTo(px, py + y * CELL); ctx.lineTo(px + r.w * CELL, py + y * CELL); ctx.stroke()
    }
  }
  ctx.setLineDash([])

  // ═══ PASS 5: Water ═══
  if (data.water?.length > 0) {
    ctx.fillStyle = 'rgba(100,150,200,0.12)'
    for (const w of data.water) ctx.fillRect(ox + w.x * CELL, oy + w.y * CELL, CELL, CELL)
  }

  // ═══ PASS 6: Columns ═══
  for (const col of data.columns) {
    const cx = ox + (col.x + 0.5) * CELL, cy = oy + (col.y + 0.5) * CELL
    ctx.fillStyle = FLOOR
    ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.18, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.18, 0, Math.PI * 2); ctx.stroke()
  }

  // ═══ PASS 7: Walls ═══
  // Draw walls as solid filled polygon bands on room perimeters
  const wt = 3 // wall half-thickness
  ctx.fillStyle = INK

  for (const r of data.rects) {
    const x1 = ox + r.x * CELL, y1 = oy + r.y * CELL
    const x2 = x1 + r.w * CELL, y2 = y1 + r.h * CELL
    const e = wt * 0.6 // extension past corners

    // Only draw wall on edges where there's no adjacent floor cell
    // North
    if (!hasAdjacentFloor(r, 'north', data.rects)) {
      ctx.fillRect(x1 - e, y1 - wt, (x2 - x1) + e * 2, wt * 2)
    }
    // South
    if (!hasAdjacentFloor(r, 'south', data.rects)) {
      ctx.fillRect(x1 - e, y2 - wt, (x2 - x1) + e * 2, wt * 2)
    }
    // West
    if (!hasAdjacentFloor(r, 'west', data.rects)) {
      ctx.fillRect(x1 - wt, y1 - e, wt * 2, (y2 - y1) + e * 2)
    }
    // East
    if (!hasAdjacentFloor(r, 'east', data.rects)) {
      ctx.fillRect(x2 - wt, y1 - e, wt * 2, (y2 - y1) + e * 2)
    }

    // Inner shadow/border for depth (thin line inside room edges)
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(x1 + 1, y1 + 1, (x2 - x1) - 2, (y2 - y1) - 2)
  }

  // ═══ PASS 8: Doors ═══
  for (const door of data.doors) {
    const cx = ox + (door.x + 0.5) * CELL
    const cy = oy + (door.y + 0.5) * CELL
    const isHoriz = door.dir.y !== 0
    renderDoor(ctx, cx, cy, isHoriz, door.type)
  }

  // ═══ PASS 9: Room numbers (only large rooms) ═══
  let roomIdx = 1
  for (const r of largeRects) {
    const cx = ox + (r.x + r.w / 2) * CELL
    const cy = oy + (r.y + r.h / 2) * CELL
    const fontSize = Math.min(r.w, r.h) * CELL * 0.35
    ctx.font = `bold ${fontSize}px 'Georgia', 'Times New Roman', serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = INK
    ctx.fillText(String(roomIdx), cx, cy + 1)
    roomIdx++
  }

  // ═══ PASS 10: Notes (text boxes outside dungeon) ═══
  ctx.font = `italic ${CELL * 0.38}px 'Georgia', 'Times New Roman', serif`
  for (const note of data.notes) {
    const nx = ox + note.pos.x * CELL
    const ny = oy + note.pos.y * CELL
    const text = `${note.ref}. ${note.text}`
    const lines = wrapText(ctx, text, CELL * 5)
    const lineH = CELL * 0.48
    const boxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + CELL * 0.6
    const boxH = lines.length * lineH + CELL * 0.3
    const bx = nx - boxW / 2, by = ny - boxH / 2

    ctx.fillStyle = FLOOR
    ctx.fillRect(bx, by, boxW, boxH)
    ctx.strokeStyle = INK; ctx.lineWidth = 1
    ctx.strokeRect(bx, by, boxW, boxH)

    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], nx, by + CELL * 0.15 + i * lineH)
    }
  }

  // ═══ PASS 11: Title and Story ═══
  if (data.title) {
    const titleSize = CELL * 1.3
    ctx.font = `bold ${titleSize}px 'Georgia', 'Times New Roman', serif`
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillText(data.title, W / 2, oy + (minY + titleSpace - 2) * CELL)
  }
  if (data.story) {
    ctx.font = `italic ${CELL * 0.4}px 'Georgia', 'Times New Roman', serif`
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    const storyLines = wrapText(ctx, data.story, W * 0.65)
    const storyY = oy + (minY + titleSpace - 1.5) * CELL
    for (let i = 0; i < storyLines.length; i++) {
      ctx.fillText(storyLines[i], W / 2, storyY + i * CELL * 0.5)
    }
  }

  // ═══ PASS 12: Random decorative elements inside rooms ═══
  const decoRng = makeRng(4242)
  for (const r of largeRects) {
    const px = ox + r.x * CELL, py = oy + r.y * CELL
    const area = r.w * r.h
    // Small dots (room debris)
    ctx.fillStyle = INK
    const dotCount = Math.floor(area * 0.04)
    for (let i = 0; i < dotCount; i++) {
      const dx = px + (0.3 + decoRng() * 0.4) * r.w * CELL
      const dy = py + (0.3 + decoRng() * 0.4) * r.h * CELL
      ctx.beginPath(); ctx.arc(dx, dy, 0.8 + decoRng() * 0.8, 0, Math.PI * 2); ctx.fill()
    }
  }
}

// ── Check if a rect has adjacent floor on a given side ──
function hasAdjacentFloor(r: DRect, side: 'north' | 'south' | 'east' | 'west', allRects: DRect[]): boolean {
  for (const other of allRects) {
    if (other === r) continue
    if (side === 'north') {
      // Check if other rect shares the north edge (other.y + other.h == r.y and overlaps horizontally)
      if (other.y + other.h === r.y && other.x < r.x + r.w && other.x + other.w > r.x) return true
    } else if (side === 'south') {
      if (other.y === r.y + r.h && other.x < r.x + r.w && other.x + other.w > r.x) return true
    } else if (side === 'west') {
      if (other.x + other.w === r.x && other.y < r.y + r.h && other.y + other.h > r.y) return true
    } else if (side === 'east') {
      if (other.x === r.x + r.w && other.y < r.y + r.h && other.y + other.h > r.y) return true
    }
  }
  return false
}

// ── Door renderer ──
function renderDoor(ctx: CanvasRenderingContext2D, cx: number, cy: number, isHoriz: boolean, type: number) {
  const s = CELL * 0.35
  // Clear wall behind door
  ctx.fillStyle = FLOOR
  if (isHoriz) ctx.fillRect(cx - s, cy - 4, s * 2, 8)
  else ctx.fillRect(cx - 4, cy - s, 8, s * 2)

  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1.2

  if (type === 0 || type === 1 || type === 2) {
    // Regular door
    if (isHoriz) ctx.strokeRect(cx - s * 0.6, cy - 2, s * 1.2, 4)
    else ctx.strokeRect(cx - 2, cy - s * 0.6, 4, s * 1.2)
    if (type === 1) {
      ctx.lineWidth = 0.8
      if (isHoriz) {
        ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - 1.5); ctx.lineTo(cx + s * 0.3, cy + 1.5); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + s * 0.3, cy - 1.5); ctx.lineTo(cx - s * 0.3, cy + 1.5); ctx.stroke()
      } else {
        ctx.beginPath(); ctx.moveTo(cx - 1.5, cy - s * 0.3); ctx.lineTo(cx + 1.5, cy + s * 0.3); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + 1.5, cy - s * 0.3); ctx.lineTo(cx - 1.5, cy + s * 0.3); ctx.stroke()
      }
    }
  } else if (type === 3) {
    // Stairs
    ctx.lineWidth = 0.7
    for (let i = -2; i <= 2; i++) {
      if (isHoriz) { ctx.beginPath(); ctx.moveTo(cx - s, cy + i * 2.5); ctx.lineTo(cx + s, cy + i * 2.5); ctx.stroke() }
      else { ctx.beginPath(); ctx.moveTo(cx + i * 2.5, cy - s); ctx.lineTo(cx + i * 2.5, cy + s); ctx.stroke() }
    }
  } else if (type === 5) {
    // Gate
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const t = (i + 0.5) / 3
      if (isHoriz) { const bx = cx - s + t * s * 2; ctx.beginPath(); ctx.moveTo(bx, cy - 3); ctx.lineTo(bx, cy + 3); ctx.stroke() }
      else { const by = cy - s + t * s * 2; ctx.beginPath(); ctx.moveTo(cx - 3, by); ctx.lineTo(cx + 3, by); ctx.stroke() }
    }
  } else if (type === 6) {
    // Secret
    ctx.lineWidth = 0.8; ctx.setLineDash([2, 2])
    if (isHoriz) { ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.stroke() }
    else { ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s); ctx.stroke() }
    ctx.setLineDash([])
  } else {
    // Open passage — dots
    if (isHoriz) {
      ctx.beginPath(); ctx.arc(cx - s, cy, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + s, cy, 1.5, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.beginPath(); ctx.arc(cx, cy - s, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx, cy + s, 1.5, 0, Math.PI * 2); ctx.fill()
    }
  }
}

// ── Text wrapping ──
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

// ══════════════════════════════════════════════
// ── Page Component ──
// ══════════════════════════════════════════════

function MapGen2Page() {
  const campaign = useCampaignStore(s => s.campaign)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dungeonData, setDungeonData] = useState<DungeonData | null>(null)
  const [rotation, setRotation] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !dungeonData) return
    renderDungeon(canvasRef.current, dungeonData, 2, rotation)
  }, [dungeonData, rotation])

  function handleImportJSON(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as DungeonData
        if (!data.rects || !data.doors) throw new Error('Invalid dungeon JSON')
        setDungeonData(data)
      } catch (e) { console.error('Failed to parse dungeon JSON:', e) }
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
      <style>@media print{body{margin:0}img{max-width:100%}}body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:white}img{max-width:95vw;max-height:95vh}</style></head>
      <body><img src="${dataUrl}"/><script>setTimeout(()=>window.print(),500)</script></body></html>`)
    win.document.close()
  }

  if (!campaign) return null

  return (
    <main className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/50 px-3 py-2">
        <h2 className="text-sm font-semibold mr-2">Map Generator v2</h2>
        <button onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition">
          Import JSON
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImportJSON(f); e.target.value = '' }} />

        {dungeonData && (
          <>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Rotation:</span>
              <input type="range" value={rotation} onChange={e => setRotation(parseFloat(e.target.value))}
                min={-15} max={15} step={0.5} className="w-24 accent-primary" />
              <span className="w-8 text-center font-mono">{rotation}°</span>
              <button onClick={() => setRotation(0)} className="text-[10px] text-muted-foreground hover:text-foreground">Reset</button>
            </div>
            <div className="flex-1" />
            <button onClick={handleExportPNG} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">PNG</button>
            <button onClick={handlePrint} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">Print</button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-[#e8e4dc] flex items-center justify-center p-4">
        {dungeonData ? (
          <canvas ref={canvasRef} className="shadow-lg" />
        ) : (
          <div className="text-center">
            <p className="text-lg font-semibold text-[#221122] mb-2">One-Page Dungeon Renderer</p>
            <p className="text-sm text-[#221122]/60 mb-4">Import a dungeon JSON from watabou's generator</p>
            <button onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
              Import Dungeon JSON
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
