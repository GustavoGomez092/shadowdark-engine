import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { AdventurePDF } from './adventure-pdf.tsx'
import type { AdventurePDFProps } from './adventure-pdf.tsx'
import type { Campaign } from '@/schemas/campaign.ts'
import type { CampaignMap } from '@/schemas/map.ts'

// @ts-expect-error — decompiled JS modules, not typed
import DungeonApp from '@/lib/dungeon-renderer/App.js'
// @ts-expect-error — decompiled JS modules
import style from '@/lib/dungeon-renderer/Style.js'
// @ts-expect-error — decompiled JS modules
import Blueprint from '@/lib/dungeon-renderer/Blueprint.js'
import { ensureStoryLoaded } from '@/lib/dungeon-renderer/index.ts'

// ── Map Rendering ──

/**
 * Render a single dungeon map to a PNG data URL.
 * Creates a temporary offscreen canvas, loads the dungeon data,
 * renders in B&W print style, crops to content, and returns the data URL.
 */
async function renderMapToImage(map: CampaignMap): Promise<string | null> {
  if (!map.dungeonData) return null

  await ensureStoryLoaded()

  // Create offscreen canvas at high resolution
  const targetCellSize = 48 // pixels per grid cell for crisp output
  const padding = 2

  // Create a temporary canvas and DungeonApp
  const offscreen = document.createElement('canvas')
  offscreen.width = 2000
  offscreen.height = 2000

  const app = new DungeonApp(offscreen, { seed: map.seed || 0 })
  await app.init()

  // Load the saved dungeon data
  app.loadFromSave(map.dungeonData)

  if (!app.dungeon) return null

  // Get dungeon bounds
  const rect = app.dungeon.getRect()
  const mapW = Math.ceil((rect.w + padding * 2) * targetCellSize)
  const mapH = Math.ceil((rect.h + padding * 2) * targetCellSize)

  // Resize canvas to fit the map
  offscreen.width = mapW
  offscreen.height = mapH

  // Save style state
  const saved = {
    bw: style.bw,
    ink: style.ink,
    paper: style.paper,
    floor: style.floor,
    water: style.water,
    shading: style.shading,
    showTitle: style.showTitle,
    showNotes: style.showNotes,
    showSecrets: style.showSecrets,
    showConnectors: style.showConnectors,
    autoRotate: style.autoRotate,
    rotation: style.rotation,
  }

  // Set B&W print style
  style.bw = false
  style.ink = '#000000'
  style.paper = '#FFFFFF'
  style.floor = '#FFFFFF'
  style.water = '#A8D8EA'
  style.shading = '#CCCCCC'
  style.showTitle = true
  style.showNotes = true
  style.showSecrets = false
  style.showConnectors = true
  style.autoRotate = false
  style.rotation = 0

  // Update renderer to use our canvas and cell size
  app.renderer.canvas = offscreen
  app.renderer.ctx = offscreen.getContext('2d')!
  app.renderer.cellSize = targetCellSize

  // Render
  app.renderer.render(app.dungeon, app.planner, app.flood)

  // Crop to content (scan for non-white pixels)
  const ctx = offscreen.getContext('2d')!
  const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height)
  const px = imgData.data
  let cropTop = offscreen.height
  let cropBot = 0
  let cropLeft = offscreen.width
  let cropRight = 0

  for (let y = 0; y < offscreen.height; y++) {
    for (let x = 0; x < offscreen.width; x++) {
      const i = (y * offscreen.width + x) * 4
      if (px[i + 3] > 10 && (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250)) {
        if (y < cropTop) cropTop = y
        if (y > cropBot) cropBot = y
        if (x < cropLeft) cropLeft = x
        if (x > cropRight) cropRight = x
      }
    }
  }

  // Add padding around content
  const cropPad = Math.round(targetCellSize * 0.5)
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

  // Restore style state
  style.bw = saved.bw
  style.ink = saved.ink
  style.paper = saved.paper
  style.floor = saved.floor
  style.water = saved.water
  style.shading = saved.shading
  style.showTitle = saved.showTitle
  style.showNotes = saved.showNotes
  style.showSecrets = saved.showSecrets
  style.showConnectors = saved.showConnectors
  style.autoRotate = saved.autoRotate
  style.rotation = saved.rotation

  return cropped.toDataURL('image/png')
}

/**
 * Render all dungeon maps in the campaign to data URL images.
 */
async function renderMapsToImages(campaign: Campaign): Promise<{ mapId: string; dataUrl: string }[]> {
  const dungeonMaps = campaign.maps.filter(m => m.dungeonData)
  const results: { mapId: string; dataUrl: string }[] = []

  for (const map of dungeonMaps) {
    const dataUrl = await renderMapToImage(map)
    if (dataUrl) {
      results.push({ mapId: map.id, dataUrl })
    }
  }

  return results
}

// ── PDF Generation ──

/**
 * Generate and download an adventure module PDF from a campaign.
 *
 * @param campaign - The campaign data
 * @param onProgress - Optional callback for progress updates
 */
export async function generateAdventurePDF(
  campaign: Campaign,
  onProgress?: (step: string) => void,
): Promise<void> {
  try {
    // 1. Render maps to images
    onProgress?.('Rendering maps...')
    const mapImages = await renderMapsToImages(campaign)

    // 2. Generate PDF blob
    onProgress?.('Generating PDF...')
    const props: AdventurePDFProps = { campaign, mapImages }
    const element = createElement(AdventurePDF, props)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await pdf(element as any).toBlob()

    // 3. Trigger download
    onProgress?.('Downloading...')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${campaign.name.replace(/[^a-zA-Z0-9\s_-]/g, '').trim() || 'adventure'}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    onProgress?.('Done!')
  } catch (err) {
    console.error('PDF generation failed:', err)
    throw err
  }
}
