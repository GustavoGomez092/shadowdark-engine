// @vitest-environment node
/**
 * E2E for a player's "kit" — the weapon they attack with. Drives the real GM+player
 * flow: GM grants a weapon, the player equips it, and we verify it's equipped and the
 * character has a melee attack. (This engine has no attack-a-monster action; players
 * attack by rolling on their turn, so "kit" = equipped weapon + attack bonus + spells.)
 *
 *   E2E_HEADLESS=false npx vitest run character-kit-e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import puppeteer, { type Browser, type Page, type ElementHandle } from 'puppeteer'

const BASE_URL = 'http://localhost:3000'
const TIMEOUT = 60_000
const TEST_TIMEOUT = 120_000

async function isServerRunning(): Promise<boolean> {
  try { const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3_000) }); return r.ok || r.status === 304 } catch { return false }
}
const pause = (ms: number) => new Promise(r => setTimeout(r, ms))
async function click(page: Page, text: string, tag = 'button'): Promise<void> {
  const h = await page.evaluateHandle((t: string, sel: string) => {
    const lc = t.toLowerCase()
    const els = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
    return els.find(e => (e.textContent ?? '').trim().toLowerCase() === lc)
      ?? els.find(e => (e.textContent ?? '').toLowerCase().includes(lc)) ?? null
  }, text, tag)
  const el = h.asElement()
  if (!el) throw new Error(`no <${tag}> "${text}"`)
  await (el as ElementHandle<Element>).click()
}
async function clickTitle(page: Page, title: string): Promise<void> {
  const h = await page.evaluateHandle((t: string) => {
    const els = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,strong,p')) as HTMLElement[]
    const ex = els.filter(e => (e.textContent ?? '').trim() === t)
    return ex.sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0] ?? null
  }, title)
  const el = h.asElement()
  if (!el) throw new Error(`no title "${title}"`)
  await (el as ElementHandle<Element>).click()
}
const waitText = (page: Page, t: string, ms = TIMEOUT) =>
  page.waitForFunction((x: string) => document.body.innerText.includes(x), { timeout: ms }, t)

describe('Player kit (weapon equip) E2E', () => {
  let browser: Browser
  let gm: Page
  let serverAvailable = false

  beforeAll(async () => {
    serverAvailable = await isServerRunning()
    if (!serverAvailable) {
      console.warn('\n⚠  Dev server not running on :3000 — skipping kit E2E.\n   Start it with: pnpm dev\n')
      return
    }
    browser = await puppeteer.launch({
      headless: process.env.E2E_HEADLESS !== 'false',
      slowMo: process.env.E2E_HEADLESS === 'false' ? 50 : 0,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
    })
    gm = await browser.newPage()
    gm.setDefaultTimeout(TIMEOUT)
  }, TIMEOUT)

  afterAll(async () => { await browser?.close() })

  it('GM grants a weapon, the player equips it, and the character can attack with it', async () => {
    if (!serverAvailable) return

    // GM session
    await gm.goto(`${BASE_URL}/gm/create`, { waitUntil: 'domcontentloaded' })
    await (await gm.waitForSelector('input[type="text"]'))!.type('Kit Test')
    await click(gm, 'Create Game')
    await gm.waitForFunction(() => location.href.includes('/gm/session/'), { timeout: TIMEOUT })
    await waitText(gm, 'SD-')
    const code = await gm.evaluate(() => (document.body.innerText.match(/SD-[A-Z0-9]+/) ?? [''])[0])

    // Player joins + creates a fighter
    const player = await browser.newPage()
    player.setDefaultTimeout(TIMEOUT)
    await player.goto(`${BASE_URL}/player/join`, { waitUntil: 'domcontentloaded' })
    await player.waitForSelector('input')
    const inputs = await player.$$('input')
    await inputs[0].type(code)
    await inputs[1].click({ clickCount: 3 }); await inputs[1].type('KitPlayer')
    await click(player, 'Join Game')
    await waitText(player, 'Create My Character'); await click(player, 'Create My Character')
    await waitText(player, 'Roll Ability Scores'); await click(player, 'Roll 3d6 for Each Stat'); await waitText(player, 'Reroll'); await click(player, 'Next')
    await waitText(player, 'Choose Ancestry'); await clickTitle(player, 'Human'); await pause(300); await click(player, 'Next')
    await waitText(player, 'Choose Class'); await clickTitle(player, 'Fighter'); await pause(300); await click(player, 'Next')
    await waitText(player, 'Character Details'); await (await player.waitForSelector('input[placeholder*="character name" i]'))!.type('Kit Hero'); await click(player, 'Next')
    await waitText(player, 'Review Character'); await click(player, 'Create Character'); await waitText(player, 'XP:')

    // The freshly-created fighter starts with no items.
    expect(await player.evaluate(() => document.body.innerText.includes('No items'))).toBe(true)

    // GM grants a Longsword via the player menu's "Add Item" tab.
    await gm.bringToFront()
    await click(gm, '⋮'); await waitText(gm, '+5 XP', 6_000)
    await click(gm, 'Add Item')
    const search = await gm.waitForSelector('input[placeholder="Search items..."]')
    await search!.type('longsword')
    await pause(400)
    await click(gm, 'Longsword')
    await pause(500)

    // The weapon appears in the player's kit.
    await player.bringToFront()
    await waitText(player, 'Longsword', 10_000)

    // Player equips it → it shows the equipped marker "(E)".
    await click(player, 'Equip')
    await waitText(player, '(E)', 10_000)

    // The character has a melee attack (the means to attack with the weapon).
    expect(await player.evaluate(() => document.body.innerText.includes('Melee'))).toBe(true)

    await player.close()
  }, TEST_TIMEOUT)
})
