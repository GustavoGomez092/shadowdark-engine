/**
 * Multi-page print exporter for dungeon maps.
 * Renders the map at a target scale (inches per grid square),
 * slices into page-sized tiles, and opens a print-ready window.
 */

export interface PrintOptions {
  paperSize: 'letter' | 'a4' | 'a3' | 'legal'
  orientation: 'portrait' | 'landscape'
  gridScale: number // inches per grid square
  margin: number // inches
  title: string
}

export const PAPER_SIZES: Record<string, { w: number; h: number; label: string }> = {
  letter: { w: 8.5, h: 11, label: 'Letter (8.5" × 11")' },
  a4: { w: 8.27, h: 11.69, label: 'A4 (210 × 297mm)' },
  a3: { w: 11.69, h: 16.54, label: 'A3 (297 × 420mm)' },
  legal: { w: 8.5, h: 14, label: 'Legal (8.5" × 14")' },
}

const DPI = 96

/**
 * Open a print-ready window with the dungeon map tiled across pages.
 */
export function openPrintExport(app: any, styleObj: any, options: PrintOptions) {
  if (!app?.dungeon) return

  const { paperSize, orientation, gridScale, margin, title } = options
  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES.letter

  // Paper dimensions in inches (swap for landscape)
  const paperW = orientation === 'landscape' ? paper.h : paper.w
  const paperH = orientation === 'landscape' ? paper.w : paper.h

  // Printable area in pixels
  const printWpx = Math.floor((paperW - margin * 2) * DPI)
  const printHpx = Math.floor((paperH - margin * 2) * DPI)

  // Pixels per grid square at target scale
  const pxPerSquare = gridScale * DPI

  // Dungeon bounds
  const cellSize = app.renderer.cellSize
  const padding = 2
  const rect = app.dungeon.getRect()
  const mapW = Math.ceil((rect.w + padding * 2) * pxPerSquare)
  const mapH = Math.ceil((rect.h + padding * 2) * pxPerSquare)

  // Save style state
  const saved = {
    bw: styleObj.bw,
    ink: styleObj.ink,
    paper: styleObj.paper,
    floor: styleObj.floor,
    water: styleObj.water,
    shading: styleObj.shading,
    showTitle: styleObj.showTitle,
    showNotes: styleObj.showNotes,
    showConnectors: styleObj.showConnectors,
  }

  // Set B&W colors manually (not bw mode, which overrides water getter)
  styleObj.bw = false
  styleObj.ink = '#000000'
  styleObj.paper = '#FFFFFF'
  styleObj.floor = '#FFFFFF'
  styleObj.water = '#A8D8EA'
  styleObj.shading = '#CCCCCC'
  styleObj.showTitle = false
  styleObj.showNotes = false
  styleObj.showConnectors = false

  // Render full map to offscreen canvas
  const offscreen = document.createElement('canvas')
  offscreen.width = mapW
  offscreen.height = mapH

  const origCanvas = app.renderer.canvas
  const origCtx = app.renderer.ctx
  app.renderer.canvas = offscreen
  app.renderer.ctx = offscreen.getContext('2d')!

  app.renderer.render(app.dungeon, app.planner, app.flood)

  // Crop to inked area — scan for non-white pixels
  const cropCtx = offscreen.getContext('2d')!
  const imgData = cropCtx.getImageData(0, 0, offscreen.width, offscreen.height)
  const px = imgData.data
  let cropTop = offscreen.height, cropBot = 0, cropLeft = offscreen.width, cropRight = 0
  for (let y = 0; y < offscreen.height; y++) {
    for (let x = 0; x < offscreen.width; x++) {
      const i = (y * offscreen.width + x) * 4
      // Check if pixel is not white (R<250 or G<250 or B<250) and not fully transparent
      if (px[i + 3] > 10 && (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250)) {
        if (y < cropTop) cropTop = y
        if (y > cropBot) cropBot = y
        if (x < cropLeft) cropLeft = x
        if (x > cropRight) cropRight = x
      }
    }
  }

  // Add a small padding around the content
  const cropPad = Math.round(pxPerSquare * 0.5)
  cropTop = Math.max(0, cropTop - cropPad)
  cropLeft = Math.max(0, cropLeft - cropPad)
  cropBot = Math.min(offscreen.height - 1, cropBot + cropPad)
  cropRight = Math.min(offscreen.width - 1, cropRight + cropPad)

  const croppedW = cropRight - cropLeft + 1
  const croppedH = cropBot - cropTop + 1

  // Create cropped canvas
  const cropped = document.createElement('canvas')
  cropped.width = croppedW
  cropped.height = croppedH
  const croppedCtx = cropped.getContext('2d')!
  croppedCtx.fillStyle = '#FFFFFF'
  croppedCtx.fillRect(0, 0, croppedW, croppedH)
  croppedCtx.drawImage(offscreen, cropLeft, cropTop, croppedW, croppedH, 0, 0, croppedW, croppedH)

  // Restore renderer + style
  app.renderer.canvas = origCanvas
  app.renderer.ctx = origCtx
  styleObj.bw = saved.bw
  styleObj.ink = saved.ink
  styleObj.paper = saved.paper
  styleObj.floor = saved.floor
  styleObj.water = saved.water
  styleObj.shading = saved.shading
  styleObj.showTitle = saved.showTitle
  styleObj.showNotes = saved.showNotes
  styleObj.showConnectors = saved.showConnectors

  // Redraw original canvas
  app.draw()

  // Slice cropped map into page tiles
  const cols = Math.max(1, Math.ceil(croppedW / printWpx))
  const rows = Math.max(1, Math.ceil(croppedH / printHpx))
  const totalPages = cols * rows

  const tiles: string[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = col * printWpx
      const sy = row * printHpx
      const sw = Math.min(printWpx, croppedW - sx)
      const sh = Math.min(printHpx, croppedH - sy)

      const tile = document.createElement('canvas')
      tile.width = printWpx
      tile.height = printHpx
      const tCtx = tile.getContext('2d')!
      tCtx.fillStyle = '#FFFFFF'
      tCtx.fillRect(0, 0, printWpx, printHpx)
      tCtx.drawImage(cropped, sx, sy, sw, sh, 0, 0, sw, sh)

      // Crop/alignment marks at corners
      drawCropMarks(tCtx, printWpx, printHpx, row, col, rows, cols)

      tiles.push(tile.toDataURL('image/png'))
    }
  }

  // Generate assembly preview — small thumbnail of the cropped map
  const previewScale = 220 / Math.max(croppedW, croppedH)
  const previewW = Math.ceil(croppedW * previewScale)
  const previewH = Math.ceil(croppedH * previewScale)
  const previewCanvas = document.createElement('canvas')
  previewCanvas.width = previewW
  previewCanvas.height = previewH
  const pCtx = previewCanvas.getContext('2d')!
  pCtx.drawImage(cropped, 0, 0, croppedW, croppedH, 0, 0, previewW, previewH)
  const previewSrc = previewCanvas.toDataURL('image/png')

  // Page grid dimensions for preview
  const thumbW = Math.floor(previewW / cols)
  const thumbH = Math.floor(previewH / rows)

  // Build print window
  const pw = window.open('', '_blank')
  if (!pw) return

  const paperCSS = `${paperW}in ${paperH}in`
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  // Build assembly preview grid lines
  const gridLines: string[] = []
  for (let c = 1; c < cols; c++) {
    const x = Math.round(c * thumbW)
    gridLines.push(`<div style="position:absolute;left:${x}px;top:0;width:2px;height:100%;background:rgba(34,197,94,0.6)"></div>`)
  }
  for (let r = 1; r < rows; r++) {
    const y = Math.round(r * thumbH)
    gridLines.push(`<div style="position:absolute;top:${y}px;left:0;height:2px;width:100%;background:rgba(34,197,94,0.6)"></div>`)
  }
  // Page number labels
  const pageLabels: string[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c + 1
      const x = Math.round(c * thumbW + thumbW / 2)
      const y = Math.round(r * thumbH + thumbH / 2)
      pageLabels.push(`<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);font-size:9px;font-weight:700;color:rgba(34,197,94,0.9)">${idx}</div>`)
    }
  }

  pw.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Print: ${esc(title)}</title>
<style>
  @page { size: ${paperCSS}; margin: ${margin}in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #e8e8e8; color: #222; }
  .page {
    width: ${printWpx}px; height: ${printHpx}px;
    background: white; margin: 20px auto;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    overflow: hidden; position: relative;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .page img { width: 100%; height: 100%; display: block; }
  .page-label { position: absolute; bottom: 3px; right: 6px; font-size: 7px; color: #bbb; }

  .sidebar {
    position: fixed; top: 0; left: 0;
    width: 260px; height: 100vh;
    background: #1a1a2e; color: #d0d0d0;
    padding: 16px; overflow-y: auto; z-index: 100;
    font-size: 12px;
  }
  .sidebar h2 { font-size: 15px; margin-bottom: 12px; color: white; }
  .sidebar .info { font-size: 11px; color: #888; margin-bottom: 14px; line-height: 1.6; }
  .sidebar button {
    width: 100%; padding: 10px; border: none; border-radius: 8px;
    font-weight: 600; cursor: pointer; font-size: 13px; margin-bottom: 6px;
  }
  .sidebar .btn-print { background: #22c55e; color: white; }
  .sidebar .btn-print:hover { background: #16a34a; }
  .sidebar .btn-close { background: #333; color: #aaa; }
  .sidebar .btn-close:hover { background: #444; }
  .content { margin-left: 300px; padding: 20px; }
  .preview { position: relative; border-radius: 6px; overflow: hidden; border: 1px solid #333; margin-top: 14px; }
  .preview img { display: block; width: 100%; }

  @media print {
    .sidebar { display: none !important; }
    .content { margin-left: 0; padding: 0; }
    .page { margin: 0; box-shadow: none; width: 100%; height: 100%; }
    .page-label { color: #ccc; }
    body { background: white; }
  }
</style>
</head>
<body>
<div class="sidebar">
  <h2>${esc(title)}</h2>
  <div class="info">
    <strong>${cols} × ${rows}</strong> pages (${totalPages} total)<br>
    Paper: ${paper.label}<br>
    Orientation: ${orientation}<br>
    Scale: 1 square = ${gridScale}" (${(gridScale * 25.4).toFixed(1)}mm)<br>
    Map: ${rect.w} × ${rect.h} squares<br>
    Margin: ${margin}"
  </div>
  <button class="btn-print" onclick="window.print()">Print (Ctrl+P)</button>
  <button class="btn-close" onclick="window.close()">Close</button>
  <div style="margin-top:12px;font-size:10px;color:#666;">
    Tip: Set margins to "None" and disable "Headers and footers" for best results.
  </div>
  <div style="margin-top:14px;font-size:10px;font-weight:600;color:#999;margin-bottom:6px;">Assembly Preview</div>
  <div class="preview" style="width:${previewW}px;height:${previewH}px;">
    <img src="${previewSrc}" alt="Assembly preview">
    ${gridLines.join('')}
    ${pageLabels.join('')}
  </div>
</div>
<div class="content">
  ${tiles.map((src, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    return `<div class="page">
      <img src="${src}" alt="Page ${i + 1}">
      <div class="page-label">${esc(title)} · ${i + 1}/${totalPages} (${c + 1},${r + 1})</div>
    </div>`
  }).join('\n')}
</div>
</body></html>`)
  pw.document.close()
}

function drawCropMarks(ctx: CanvasRenderingContext2D, w: number, h: number, row: number, col: number, totalRows: number, totalCols: number) {
  const len = 12
  const gap = 2
  ctx.save()
  ctx.strokeStyle = '#aaa'
  ctx.lineWidth = 0.5

  // Top-left
  if (row > 0 || col > 0) {
    ctx.beginPath()
    ctx.moveTo(0, len); ctx.lineTo(0, gap)
    ctx.moveTo(gap, 0); ctx.lineTo(len, 0)
    ctx.stroke()
  }
  // Top-right
  if (row > 0 || col < totalCols - 1) {
    ctx.beginPath()
    ctx.moveTo(w, len); ctx.lineTo(w, gap)
    ctx.moveTo(w - gap, 0); ctx.lineTo(w - len, 0)
    ctx.stroke()
  }
  // Bottom-left
  if (row < totalRows - 1 || col > 0) {
    ctx.beginPath()
    ctx.moveTo(0, h - len); ctx.lineTo(0, h - gap)
    ctx.moveTo(gap, h); ctx.lineTo(len, h)
    ctx.stroke()
  }
  // Bottom-right
  if (row < totalRows - 1 || col < totalCols - 1) {
    ctx.beginPath()
    ctx.moveTo(w, h - len); ctx.lineTo(w, h - gap)
    ctx.moveTo(w - gap, h); ctx.lineTo(w - len, h)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * GM print — full map with title, story, notes, secrets, room cards
 * scaled to fit a single landscape US Letter page.
 */
export function openGMPrint(app: any, styleObj: any, title: string) {
  if (!app?.dungeon) return

  const DPI = 96
  const margin = 0.5
  const pageW = 11 // landscape letter
  const pageH = 8.5
  const printWpx = Math.floor((pageW - margin * 2) * DPI)
  const printHpx = Math.floor((pageH - margin * 2) * DPI)

  // Save style state
  const saved = {
    bw: styleObj.bw,
    ink: styleObj.ink,
    paper: styleObj.paper,
    floor: styleObj.floor,
    water: styleObj.water,
    shading: styleObj.shading,
    showTitle: styleObj.showTitle,
    showNotes: styleObj.showNotes,
    showSecrets: styleObj.showSecrets,
    showConnectors: styleObj.showConnectors,
    autoRotate: styleObj.autoRotate,
    rotation: styleObj.rotation,
  }

  // GM view: B&W + blue water, show everything
  styleObj.bw = false
  styleObj.ink = '#000000'
  styleObj.paper = '#FFFFFF'
  styleObj.floor = '#FFFFFF'
  styleObj.water = '#A8D8EA'
  styleObj.shading = '#CCCCCC'
  styleObj.showTitle = true
  styleObj.showNotes = true
  styleObj.showSecrets = true
  styleObj.showConnectors = true
  styleObj.autoRotate = false
  styleObj.rotation = 0

  // Render at high res then scale to fit page
  const renderW = printWpx * 2
  const renderH = printHpx * 2
  const offscreen = document.createElement('canvas')
  offscreen.width = renderW
  offscreen.height = renderH

  const origCanvas = app.renderer.canvas
  const origCtx = app.renderer.ctx
  app.renderer.canvas = offscreen
  app.renderer.ctx = offscreen.getContext('2d')!

  app.renderer.render(app.dungeon, app.planner, app.flood)

  // Restore
  app.renderer.canvas = origCanvas
  app.renderer.ctx = origCtx
  styleObj.bw = saved.bw
  styleObj.ink = saved.ink
  styleObj.paper = saved.paper
  styleObj.floor = saved.floor
  styleObj.water = saved.water
  styleObj.shading = saved.shading
  styleObj.showTitle = saved.showTitle
  styleObj.showNotes = saved.showNotes
  styleObj.showSecrets = saved.showSecrets
  styleObj.showConnectors = saved.showConnectors
  styleObj.autoRotate = saved.autoRotate
  styleObj.rotation = saved.rotation
  app.draw()

  // Crop to content
  const imgData = offscreen.getContext('2d')!.getImageData(0, 0, renderW, renderH)
  const px = imgData.data
  let cTop = renderH, cBot = 0, cLeft = renderW, cRight = 0
  for (let y = 0; y < renderH; y++) {
    for (let x = 0; x < renderW; x++) {
      const i = (y * renderW + x) * 4
      if (px[i + 3] > 10 && (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250)) {
        if (y < cTop) cTop = y
        if (y > cBot) cBot = y
        if (x < cLeft) cLeft = x
        if (x > cRight) cRight = x
      }
    }
  }
  const pad = 20
  cTop = Math.max(0, cTop - pad)
  cLeft = Math.max(0, cLeft - pad)
  cBot = Math.min(renderH - 1, cBot + pad)
  cRight = Math.min(renderW - 1, cRight + pad)
  const contentW = cRight - cLeft + 1
  const contentH = cBot - cTop + 1

  // Scale to fit page
  const scale = Math.min(printWpx / contentW, printHpx / contentH)
  const finalW = Math.round(contentW * scale)
  const finalH = Math.round(contentH * scale)

  const final = document.createElement('canvas')
  final.width = printWpx
  final.height = printHpx
  const fCtx = final.getContext('2d')!
  fCtx.fillStyle = '#FFFFFF'
  fCtx.fillRect(0, 0, printWpx, printHpx)
  // Center on page
  const ox = Math.round((printWpx - finalW) / 2)
  const oy = Math.round((printHpx - finalH) / 2)
  fCtx.drawImage(offscreen, cLeft, cTop, contentW, contentH, ox, oy, finalW, finalH)

  const imgSrc = final.toDataURL('image/png')
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const pw = window.open('', '_blank')
  if (!pw) return

  pw.document.write(`<!DOCTYPE html>
<html>
<head>
<title>GM Print: ${esc(title)}</title>
<style>
  @page { size: 11in 8.5in; margin: ${margin}in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #e8e8e8; color: #222; }
  .page {
    width: ${printWpx}px; height: ${printHpx}px;
    background: white; margin: 30px auto;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    overflow: hidden;
  }
  .page img { width: 100%; height: 100%; display: block; }
  .toolbar {
    position: fixed; top: 0; left: 0; right: 0;
    background: #1a1a2e; color: #d0d0d0;
    padding: 10px 20px; display: flex; align-items: center; gap: 10px;
    z-index: 100; font-size: 13px;
  }
  .toolbar h2 { font-size: 14px; color: white; margin-right: auto; }
  .toolbar button {
    padding: 8px 16px; border: none; border-radius: 6px;
    font-weight: 600; cursor: pointer; font-size: 12px;
  }
  .toolbar .btn-print { background: #22c55e; color: white; }
  .toolbar .btn-print:hover { background: #16a34a; }
  .toolbar .btn-close { background: #333; color: #aaa; }
  .toolbar .btn-close:hover { background: #444; }
  .content { padding-top: 60px; }
  @media print {
    .toolbar { display: none !important; }
    .content { padding-top: 0; }
    .page { margin: 0; box-shadow: none; width: 100%; height: 100%; }
    body { background: white; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <h2>GM Reference: ${esc(title)}</h2>
  <span style="font-size:11px;color:#888;">Landscape Letter · Includes secrets, notes, room cards</span>
  <button class="btn-print" onclick="window.print()">Print (Ctrl+P)</button>
  <button class="btn-close" onclick="window.close()">Close</button>
</div>
<div class="content">
  <div class="page">
    <img src="${imgSrc}" alt="GM Map">
  </div>
</div>
</body></html>`)
  pw.document.close()
}
