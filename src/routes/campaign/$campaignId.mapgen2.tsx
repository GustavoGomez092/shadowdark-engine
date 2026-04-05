import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'

export const Route = createFileRoute('/campaign/$campaignId/mapgen2')({
  component: MapGen2Page,
})

// ── Watabou JSON types ──
interface DungeonData {
  title: string; story: string
  rects: DRect[]; doors: DDoor[]; notes: DNote[]
  columns: DColumn[]; water: DWater[]
}
interface DRect { x: number; y: number; w: number; h: number; ending?: boolean }
interface DDoor { x: number; y: number; dir: { x: number; y: number }; type: number }
interface DNote { text: string; ref: string; pos: { x: number; y: number } }
interface DColumn { x: number; y: number }
interface DWater { x: number; y: number }

function makeRng(seed: number) {
  let s = (seed & 0x7fffffff) || 1
  return () => { s = (48271 * s) % 2147483647; return (s & 0x7fffffff) / 2147483647 }
}

const C = 30 // cell size
const INK = '#221122'
const PAPER = '#f0ece4'
const FLOOR = '#f5f0e8'
const WT = 5 // wall thickness (half = 2.5)

function renderDungeon(canvas: HTMLCanvasElement, data: DungeonData, scale: number, rotation: number) {
  // ── Bounding box ──
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity
  for (const r of data.rects) {
    bx0 = Math.min(bx0, r.x); by0 = Math.min(by0, r.y)
    bx1 = Math.max(bx1, r.x + r.w); by1 = Math.max(by1, r.y + r.h)
  }
  // Also include note positions in bounding box
  for (const n of data.notes) {
    bx0 = Math.min(bx0, n.pos.x - 4); by0 = Math.min(by0, n.pos.y - 2)
    bx1 = Math.max(bx1, n.pos.x + 4); by1 = Math.max(by1, n.pos.y + 2)
  }
  const pad = 6, titleCells = 6
  bx0 -= pad; by0 -= (pad + titleCells); bx1 += pad; by1 += pad

  const gw = bx1 - bx0, gh = by1 - by0
  const W = gw * C, H = gh * C
  canvas.width = W * scale; canvas.height = H * scale
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  if (rotation) { ctx.translate(W / 2, H / 2); ctx.rotate(rotation * Math.PI / 180); ctx.translate(-W / 2, -H / 2) }

  const ox = -bx0 * C, oy = -by0 * C

  // ── Build floor grid ──
  const floor = new Set<string>()
  for (const r of data.rects)
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++)
        floor.add(`${x},${y}`)

  // Large rooms (for numbering — only rooms w>1 AND h>1)
  const rooms = data.rects.filter(r => r.w > 1 && r.h > 1)

  // ══════ PASS 1: Paper ══════
  ctx.fillStyle = PAPER
  ctx.fillRect(-100, -100, W + 200, H + 200)

  // ══════ PASS 2: Hatching (everywhere outside floor cells) ══════
  const rng = makeRng(7919)
  // Only hatch cells near the dungeon (within 3 cells of any floor cell)
  for (let gy = by0; gy < by1; gy++) {
    for (let gx = bx0; gx < bx1; gx++) {
      if (floor.has(`${gx},${gy}`)) continue
      // Proximity check
      let near = false
      for (let dy = -3; dy <= 3 && !near; dy++)
        for (let dx = -3; dx <= 3 && !near; dx++)
          if (floor.has(`${gx + dx},${gy + dy}`)) near = true
      if (!near) continue

      const px = ox + gx * C, py = oy + gy * C
      // Dense directional hatching
      ctx.strokeStyle = INK
      ctx.lineCap = 'round'
      // Main strokes — predominantly diagonal
      ctx.lineWidth = 0.7
      ctx.globalAlpha = 0.35
      for (let i = 0; i < 10; i++) {
        const sx = px + rng() * C
        const sy = py + rng() * C
        // Mostly 45° and 135° with slight variation
        const baseAngle = rng() < 0.5 ? Math.PI * 0.25 : Math.PI * 0.75
        const angle = baseAngle + (rng() - 0.5) * 0.6
        const len = 5 + rng() * 12
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
        ctx.stroke()
      }
      // Extra density near walls (cells directly adjacent to floor)
      let adjFloor = false
      for (const [ddx, ddy] of [[0,-1],[0,1],[-1,0],[1,0]])
        if (floor.has(`${gx+ddx},${gy+ddy}`)) { adjFloor = true; break }
      if (adjFloor) {
        ctx.lineWidth = 0.9
        ctx.globalAlpha = 0.4
        for (let i = 0; i < 6; i++) {
          const sx = px + rng() * C, sy = py + rng() * C
          const angle = rng() * Math.PI
          const len = 3 + rng() * 8
          ctx.beginPath(); ctx.moveTo(sx, sy)
          ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
          ctx.stroke()
        }
      }
    }
  }
  ctx.globalAlpha = 1

  // ══════ PASS 3: Floor fills ══════
  ctx.fillStyle = FLOOR
  for (const r of data.rects)
    ctx.fillRect(ox + r.x * C, oy + r.y * C, r.w * C, r.h * C)

  // ══════ PASS 4: Floor grid (dashed, only in large rooms) ══════
  ctx.strokeStyle = 'rgba(0,0,0,0.1)'
  ctx.lineWidth = 0.3
  ctx.setLineDash([2, 4])
  for (const r of rooms) {
    const px = ox + r.x * C, py = oy + r.y * C
    for (let x = 1; x < r.w; x++) {
      ctx.beginPath(); ctx.moveTo(px + x * C, py); ctx.lineTo(px + x * C, py + r.h * C); ctx.stroke()
    }
    for (let y = 1; y < r.h; y++) {
      ctx.beginPath(); ctx.moveTo(px, py + y * C); ctx.lineTo(px + r.w * C, py + y * C); ctx.stroke()
    }
  }
  ctx.setLineDash([])

  // ══════ PASS 5: Water ══════
  if (data.water?.length) {
    ctx.fillStyle = 'rgba(100,150,200,0.15)'
    for (const w of data.water) ctx.fillRect(ox + w.x * C, oy + w.y * C, C, C)
  }

  // ══════ PASS 6: Columns ══════
  for (const col of data.columns) {
    const cx = ox + (col.x + 0.5) * C, cy = oy + (col.y + 0.5) * C
    ctx.fillStyle = FLOOR; ctx.beginPath(); ctx.arc(cx, cy, C * 0.18, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(cx, cy, C * 0.18, 0, Math.PI * 2); ctx.stroke()
  }

  // ══════ PASS 7: Walls (cell-based — wall on every floor-void edge) ══════
  ctx.fillStyle = INK
  const hw = WT / 2
  for (const key of floor) {
    const [gxs, gys] = key.split(',')
    const gx = parseInt(gxs), gy = parseInt(gys)
    const px = ox + gx * C, py = oy + gy * C

    // North wall
    if (!floor.has(`${gx},${gy - 1}`)) ctx.fillRect(px - hw, py - hw, C + WT, WT)
    // South wall
    if (!floor.has(`${gx},${gy + 1}`)) ctx.fillRect(px - hw, py + C - hw, C + WT, WT)
    // West wall
    if (!floor.has(`${gx - 1},${gy}`)) ctx.fillRect(px - hw, py - hw, WT, C + WT)
    // East wall
    if (!floor.has(`${gx + 1},${gy}`)) ctx.fillRect(px + C - hw, py - hw, WT, C + WT)
  }

  // ══════ PASS 8: Doors ══════
  for (const door of data.doors) {
    const cx = ox + (door.x + 0.5) * C, cy = oy + (door.y + 0.5) * C
    const isH = door.dir.y !== 0
    drawDoor(ctx, cx, cy, isH, door.type)
  }

  // ══════ PASS 9: Room numbers (only rooms referenced by notes) ══════
  // Build a set of note refs to know which numbers to show
  const noteRefs = new Set(data.notes.map(n => n.ref))
  // Number rooms sequentially, but only display if a note references it
  for (let i = 0; i < rooms.length; i++) {
    const num = String(i + 1)
    if (!noteRefs.has(num)) continue
    const r = rooms[i]
    const cx = ox + (r.x + r.w / 2) * C, cy = oy + (r.y + r.h / 2) * C
    const fs = Math.min(r.w, r.h) * C * 0.35
    ctx.font = `bold ${fs}px 'Georgia','Times New Roman',serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = INK
    ctx.fillText(num, cx, cy + 1)
  }

  // ══════ PASS 10: Notes ══════
  ctx.font = `italic ${C * 0.36}px 'Georgia','Times New Roman',serif`
  for (const note of data.notes) {
    const nx = ox + note.pos.x * C, ny = oy + note.pos.y * C
    const text = `${note.ref}. ${note.text}`
    const lines = wrap(ctx, text, C * 5.5)
    const lh = C * 0.44
    const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + C * 0.5
    const bh = lines.length * lh + C * 0.25
    const bx = nx - bw / 2, by = ny - bh / 2

    ctx.fillStyle = FLOOR; ctx.fillRect(bx, by, bw, bh)
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh)
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], nx, by + C * 0.12 + i * lh)
  }

  // ══════ PASS 11: Title + Story (drawn with paper backdrop to cover hatching) ══════
  if (data.title || data.story) {
    // Clear hatching behind title area
    const titleBlockH = titleCells * C
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, W, titleBlockH)

    let curY = C * 1.5

    if (data.title) {
      ctx.font = `bold ${C * 1.4}px 'Georgia','Times New Roman',serif`
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(data.title, W / 2, curY)
      curY += C * 1.8
    }
    if (data.story) {
      ctx.font = `italic ${C * 0.4}px 'Georgia','Times New Roman',serif`
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      const sl = wrap(ctx, data.story, W * 0.7)
      for (let i = 0; i < sl.length; i++) ctx.fillText(sl[i], W / 2, curY + i * C * 0.5)
    }
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, cx: number, cy: number, isH: boolean, type: number) {
  const s = C * 0.38
  // Clear wall
  ctx.fillStyle = FLOOR
  if (isH) ctx.fillRect(cx - s, cy - WT, s * 2, WT * 2)
  else ctx.fillRect(cx - WT, cy - s, WT * 2, s * 2)

  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1.2

  if (type === 0 || type === 1 || type === 2) {
    if (isH) ctx.strokeRect(cx - s * 0.55, cy - 2, s * 1.1, 4)
    else ctx.strokeRect(cx - 2, cy - s * 0.55, 4, s * 1.1)
    if (type === 1) {
      ctx.lineWidth = 0.7
      if (isH) { ctx.beginPath(); ctx.moveTo(cx-3,cy-1.5); ctx.lineTo(cx+3,cy+1.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx+3,cy-1.5); ctx.lineTo(cx-3,cy+1.5); ctx.stroke() }
      else { ctx.beginPath(); ctx.moveTo(cx-1.5,cy-3); ctx.lineTo(cx+1.5,cy+3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx+1.5,cy-3); ctx.lineTo(cx-1.5,cy+3); ctx.stroke() }
    }
  } else if (type === 3) {
    ctx.lineWidth = 0.6
    for (let i = -2; i <= 2; i++) {
      if (isH) { ctx.beginPath(); ctx.moveTo(cx-s,cy+i*2.5); ctx.lineTo(cx+s,cy+i*2.5); ctx.stroke() }
      else { ctx.beginPath(); ctx.moveTo(cx+i*2.5,cy-s); ctx.lineTo(cx+i*2.5,cy+s); ctx.stroke() }
    }
  } else if (type === 5) {
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const t = (i+0.5)/3
      if (isH) { const bx=cx-s+t*s*2; ctx.beginPath(); ctx.moveTo(bx,cy-3); ctx.lineTo(bx,cy+3); ctx.stroke() }
      else { const by=cy-s+t*s*2; ctx.beginPath(); ctx.moveTo(cx-3,by); ctx.lineTo(cx+3,by); ctx.stroke() }
    }
  } else if (type === 6) {
    ctx.lineWidth = 0.8; ctx.setLineDash([2,2])
    if (isH) { ctx.beginPath(); ctx.moveTo(cx-s,cy); ctx.lineTo(cx+s,cy); ctx.stroke() }
    else { ctx.beginPath(); ctx.moveTo(cx,cy-s); ctx.lineTo(cx,cy+s); ctx.stroke() }
    ctx.setLineDash([])
  } else {
    if (isH) { ctx.beginPath(); ctx.arc(cx-s,cy,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+s,cy,1.5,0,Math.PI*2); ctx.fill() }
    else { ctx.beginPath(); ctx.arc(cx,cy-s,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx,cy+s,1.5,0,Math.PI*2); ctx.fill() }
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(' '); const lines: string[] = []; let line = ''
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > max && line) { lines.push(line); line = w } else line = t }
  if (line) lines.push(line); return lines
}

// ══════ Page ══════
function MapGen2Page() {
  const campaign = useCampaignStore(s => s.campaign)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [data, setData] = useState<DungeonData | null>(null)
  const [rotation, setRotation] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (canvasRef.current && data) renderDungeon(canvasRef.current, data, 2, rotation) }, [data, rotation])

  function importJSON(file: File) {
    const r = new FileReader()
    r.onload = () => { try { const d = JSON.parse(r.result as string); if (d.rects) setData(d) } catch {} }
    r.readAsText(file)
  }
  function exportPNG() { if (!canvasRef.current) return; const a = document.createElement('a'); a.href = canvasRef.current.toDataURL('image/png'); a.download = `${data?.title?.replace(/\s+/g,'_').toLowerCase()||'dungeon'}.png`; a.click() }
  function print() { if (!canvasRef.current) return; const w = window.open('','_blank'); if (!w) return; w.document.write(`<html><head><title>${data?.title||'Dungeon'}</title><style>@media print{body{margin:0}img{max-width:100%}}body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:white}img{max-width:95vw;max-height:95vh}</style></head><body><img src="${canvasRef.current.toDataURL('image/png')}"/><script>setTimeout(()=>window.print(),500)</script></body></html>`); w.document.close() }

  if (!campaign) return null
  return (
    <main className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/50 px-3 py-2">
        <h2 className="text-sm font-semibold mr-2">Map Generator v2</h2>
        <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition">Import JSON</button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = '' }} />
        {data && (<>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Rotate:</span>
            <input type="range" value={rotation} onChange={e => setRotation(parseFloat(e.target.value))} min={-15} max={15} step={0.5} className="w-20 accent-primary" />
            <span className="w-8 font-mono text-center">{rotation}°</span>
            <button onClick={() => setRotation(0)} className="text-[10px] text-muted-foreground hover:text-foreground">Reset</button>
          </div>
          <div className="flex-1" />
          <button onClick={exportPNG} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">PNG</button>
          <button onClick={print} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent transition">Print</button>
        </>)}
      </div>
      <div className="flex-1 overflow-auto bg-[#e8e4dc] flex items-center justify-center p-4">
        {data ? <canvas ref={canvasRef} className="shadow-lg" /> : (
          <div className="text-center">
            <p className="text-lg font-semibold text-[#221122] mb-2">One-Page Dungeon Renderer</p>
            <p className="text-sm text-[#221122]/60 mb-4">Import a dungeon JSON from <a href="https://watabou.github.io/one-page-dungeon/" target="_blank" rel="noopener" className="text-primary underline">watabou's generator</a></p>
            <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">Import Dungeon JSON</button>
          </div>
        )}
      </div>
    </main>
  )
}
