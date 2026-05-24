// @vitest-environment node
/**
 * E2E for the full battle sequence, driven through the real GM+player PeerJS flow:
 * GM spawns a monster → rolls initiative → the player rolls initiative → turns advance →
 * the player attacks on their turn (rolling on the dice roller, which reaches the GM) →
 * the GM damages and defeats the monster → the GM ends combat.
 *
 *   E2E_HEADLESS=false npx vitest run battle-e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import puppeteer, { type Browser, type Page, type ElementHandle } from 'puppeteer'

const BASE_URL = 'http://localhost:3000'
const TIMEOUT = 60_000
const TEST_TIMEOUT = 180_000

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
/** Click the LAST element matching (e.g. the surprise dialog's "Roll Initiative", behind the panel's). */
async function clickLast(page: Page, text: string, tag = 'button'): Promise<void> {
  const h = await page.evaluateHandle((t: string, sel: string) => {
    const lc = t.toLowerCase()
    const els = Array.from(document.querySelectorAll(sel)).filter(e => (e.textContent ?? '').toLowerCase().includes(lc)) as HTMLElement[]
    return els[els.length - 1] ?? null
  }, text, tag)
  const el = h.asElement()
  if (!el) throw new Error(`no last <${tag}> "${text}"`)
  await (el as ElementHandle<Element>).click()
}
async function clickTitle(page: Page, title: string): Promise<void> {
  const h = await page.evaluateHandle((t: string) => {
    const els = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,strong,p,button')) as HTMLElement[]
    const ex = els.filter(e => (e.textContent ?? '').trim() === t)
    return ex.sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0] ?? null
  }, title)
  const el = h.asElement()
  if (!el) throw new Error(`no title "${title}"`)
  await (el as ElementHandle<Element>).click()
}
const waitText = (page: Page, t: string, ms = TIMEOUT) =>
  page.waitForFunction((x: string) => document.body.innerText.includes(x), { timeout: ms }, t)
const rollCount = (page: Page) =>
  page.evaluate(() => (document.body.innerText.match(/→|rolled/gi) ?? []).length)

describe('Battle sequence E2E (GM + player)', () => {
  let browser: Browser
  let gm: Page
  let serverAvailable = false

  beforeAll(async () => {
    serverAvailable = await isServerRunning()
    if (!serverAvailable) {
      console.warn('\n⚠  Dev server not running on :3000 — skipping battle E2E.\n   Start it with: pnpm dev\n')
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

  it('runs a full battle: spawn → initiative → player attacks → monster defeated → end', async () => {
    if (!serverAvailable) return

    // GM session
    await gm.goto(`${BASE_URL}/gm/create`, { waitUntil: 'domcontentloaded' })
    await (await gm.waitForSelector('input[type="text"]'))!.type('Battle')
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
    await inputs[1].click({ clickCount: 3 }); await inputs[1].type('Bob')
    await click(player, 'Join Game')
    await waitText(player, 'Create My Character'); await click(player, 'Create My Character')
    await waitText(player, 'Roll Ability Scores'); await click(player, 'Roll 3d6 for Each Stat'); await waitText(player, 'Reroll'); await click(player, 'Next')
    await waitText(player, 'Choose Ancestry'); await clickTitle(player, 'Human'); await pause(300); await click(player, 'Next')
    await waitText(player, 'Choose Class'); await clickTitle(player, 'Fighter'); await pause(300); await click(player, 'Next')
    await waitText(player, 'Character Details'); await (await player.waitForSelector('input[placeholder*="character name" i]'))!.type('Bob Fighter'); await click(player, 'Next')
    await waitText(player, 'Review Character'); await click(player, 'Create Character'); await waitText(player, 'XP:')

    // GM spawns a monster (client-side nav keeps the PeerJS connection alive)
    await gm.bringToFront()
    await click(gm, 'Monsters', 'a, button'); await waitText(gm, 'Spawn', 15_000)
    const monsterName = await gm.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === 'Spawn')
      const h = btn?.closest('div')?.querySelector('h1,h2,h3,h4')
      return (h?.textContent ?? '').trim()
    })
    expect(monsterName).toBeTruthy()
    await click(gm, 'Spawn'); await pause(800)
    await click(gm, 'Overview', 'a, button'); await waitText(gm, 'Roll Initiative', 15_000)

    // Start combat → surprise dialog → confirm
    await click(gm, 'Roll Initiative'); await pause(500)
    await clickLast(gm, 'Roll Initiative')

    // Player rolls initiative
    await player.bringToFront()
    await waitText(player, 'Roll for initiative', 12_000)
    await click(player, 'Roll'); await pause(3_500)
    await waitText(player, 'Your initiative', 12_000) // combat locked + player rolled
    await click(player, 'Continue').catch(() => {})
    await pause(1_500)

    // Advance turns until it's the player's turn (the on-turn dice roller appears), then attack.
    const rollsBefore = await gm.evaluate(() => (document.body.innerText.match(/→|rolled/gi) ?? []).length)
    let attacked = false
    for (let i = 0; i < 4 && !attacked; i++) {
      await player.bringToFront(); await pause(500)
      const myTurn = await player.evaluate(() => Array.from(document.querySelectorAll('button')).some(b => (b.textContent ?? '').trim().toLowerCase() === 'roll'))
      if (myTurn) { await click(player, 'Roll'); await pause(3_500); attacked = true; break }
      await gm.bringToFront(); await click(gm, 'Next Turn').catch(() => {}); await pause(900)
    }
    expect(attacked).toBe(true)
    // The player's attack roll reached the GM (a new roll entry appeared in the GM's log).
    await pause(800)
    expect(await rollCount(gm)).toBeGreaterThan(rollsBefore)

    // GM selects the monster, damages it to 0, and marks it defeated.
    await gm.bringToFront()
    await clickTitle(gm, monsterName).catch(() => {}) // select (auto-selected if sole monster)
    await pause(400)
    for (let i = 0; i < 12; i++) { await click(gm, '-5').catch(() => {}); await pause(120) }
    await waitText(gm, 'Mark as Defeated', 8_000)
    await click(gm, 'Mark as Defeated')
    await pause(500)
    expect(await gm.evaluate(() => document.body.innerText.toLowerCase().includes('defeated'))).toBe(true)

    // GM ends combat → the player is no longer in an active turn.
    await click(gm, 'End Combat'); await pause(1_000)
    await player.bringToFront()
    expect(await player.evaluate(() => !/active turn/i.test(document.body.innerText))).toBe(true)

    await player.close()
  }, TEST_TIMEOUT)
})
