/**
 * Dungeon Engine Integration
 *
 * Bridges the decompiled watabou dungeon generator + renderer
 * with our campaign map system. Provides:
 * - generateDungeon(): create a dungeon from seed + tags
 * - renderToCanvas(): render a dungeon to an HTML canvas
 * - exportPNG(): export as high-res PNG
 * - getDungeonData(): get JSON data for persistence
 */

// @ts-nocheck — decompiled JS modules, not typed
import Dungeon from './Dungeon.js'
import DungeonRenderer from './DungeonRenderer.js'
import style from './Style.js'
import Story from './Story.js'
import Blueprint from './Blueprint.js'

let storyLoaded = false

export async function ensureStoryLoaded() {
  if (storyLoaded) return
  try {
    await Story.loadData()
    storyLoaded = true
  } catch (e) {
    console.warn('Failed to load story grammar:', e)
    storyLoaded = true // proceed without stories
  }
}

export interface GenerateOptions {
  seed?: number
  tags?: string[]
  palette?: 'default' | 'ancient' | 'light' | 'modern' | 'link'
  showGrid?: boolean
  showSecrets?: boolean
  rotation?: number
}

export async function generateAndRender(
  canvas: HTMLCanvasElement,
  options: GenerateOptions = {},
): Promise<{ dungeon: any; renderer: any; data: any }> {
  await ensureStoryLoaded()

  const seed = options.seed ?? Math.floor(Math.random() * 2147483647)
  const tags = options.tags ?? []

  // Apply style options
  if (options.palette) style.setPalette(options.palette)
  if (options.showGrid !== undefined) {
    style.gridMode = options.showGrid ? 'dashed' : 'hidden'
  }
  if (options.showSecrets !== undefined) style.showSecrets = options.showSecrets
  if (options.rotation !== undefined) style.rotation = options.rotation * Math.PI / 180

  // Create blueprint and build dungeon
  const blueprint = new Blueprint(seed, tags)
  const dungeon = new Dungeon()
  dungeon.build(blueprint)

  // Create renderer and render
  const renderer = new DungeonRenderer(canvas)
  renderer.render(dungeon, dungeon.planner, dungeon.flood)

  // Get JSON data
  const data = dungeon.getData()

  return { dungeon, renderer, data }
}

export function rerenderDungeon(
  renderer: any,
  dungeon: any,
  options: GenerateOptions = {},
) {
  if (options.palette) style.setPalette(options.palette)
  if (options.rotation !== undefined) style.rotation = options.rotation * Math.PI / 180
  if (options.showGrid !== undefined) {
    style.gridMode = options.showGrid ? 'dashed' : 'hidden'
  }
  if (options.showSecrets !== undefined) style.showSecrets = options.showSecrets

  renderer.render(dungeon, dungeon.planner, dungeon.flood)
}

export function exportPNG(canvas: HTMLCanvasElement, title?: string): void {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = `${(title || 'dungeon').toLowerCase().replace(/\s+/g, '_')}.png`
  a.click()
}

export function getDungeonData(dungeon: any): any {
  return dungeon.getData()
}

export { style, DungeonRenderer }
