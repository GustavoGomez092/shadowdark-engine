// @vitest-environment node
/**
 * E2E for portable character export/import, driven through the real GM + player
 * PeerJS flow with Puppeteer against the dev server on :3000. Skips if no server.
 *
 * Covers:
 *  - a player EXPORTS their character → a valid `shadowdark-character-v1` file downloads
 *  - a player IMPORTS a character on the "no character" screen right after joining
 *    (the button the user reported as missing) → the character is created and assigned
 *
 *   pnpm dev      # terminal 1
 *   pnpm test     # terminal 2  (or: npx vitest run character-import-export-e2e)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import puppeteer, { type Browser, type Page, type ElementHandle } from 'puppeteer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { Character } from '@/schemas/character.ts'
import { exportCharacter } from '@/lib/character/export.ts'

const BASE_URL = 'http://localhost:3000'
const TIMEOUT = 60_000
const TEST_TIMEOUT = 180_000

async function isServerRunning(): Promise<boolean> {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3_000) })
    return r.ok || r.status === 304
  } catch { return false }
}

async function clickByText(page: Page, text: string, tag = 'button'): Promise<void> {
  const handle = await page.evaluateHandle((t: string, sel: string) => {
    const lc = t.toLowerCase()
    const els = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
    return els.find(el => (el.textContent ?? '').trim().toLowerCase() === lc)
      ?? els.find(el => (el.textContent ?? '').toLowerCase().includes(lc)) ?? null
  }, text, tag)
  const el = handle.asElement()
  if (!el) throw new Error(`No <${tag}> with text "${text}"`)
  await (el as ElementHandle<Element>).click()
}

async function clickCardTitle(page: Page, title: string): Promise<void> {
  const handle = await page.evaluateHandle((t: string) => {
    const els = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,strong,p')) as HTMLElement[]
    const exact = els.filter(e => (e.textContent ?? '').trim() === t)
    return exact.sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0] ?? null
  }, title)
  const el = handle.asElement()
  if (!el) throw new Error(`No card titled "${title}"`)
  await (el as ElementHandle<Element>).click()
}

const pause = (ms: number) => new Promise(r => setTimeout(r, ms))
const waitForText = (page: Page, text: string, timeout = TIMEOUT) =>
  page.waitForFunction((t: string) => document.body.innerText.includes(t), { timeout }, text)
const readLevel = (page: Page) =>
  page.evaluate(() => { const m = document.body.innerText.match(/Level\s+(\d+)/); return m ? parseInt(m[1], 10) : -1 })

/** A complete, valid level-5 character used as an import fixture. */
function makeImportFixture(): Character {
  const baseStats = { STR: 15, DEX: 12, CON: 14, INT: 8, WIS: 10, CHA: 9 }
  return {
    id: 'fixture-src', playerId: 'someone-else', name: 'Imported Hero',
    ancestry: 'human', class: 'fighter', level: 5, xp: 7, alignment: 'lawful',
    background: 'soldier', title: 'Warrior', languages: ['Common'],
    baseStats, statModifications: [{ id: 'm1', stat: 'STR', amount: 2, source: 'talent:x', permanent: true }],
    maxHp: 40, currentHp: 12, isDying: false,
    inventory: { items: [{ id: 'i1', definitionId: 'longsword', name: 'Longsword', category: 'weapon', slots: 1, quantity: 1, equipped: true, isIdentified: true }], coins: { gp: 100, sp: 0, cp: 0 } },
    spells: { knownSpells: [], penances: [] }, conditions: [], talents: [],
    ancestryTraitUsed: false, hasLuckToken: false, weaponMasteries: ['longsword'], notes: 'Veteran of many delves.',
    computed: { effectiveStats: baseStats, modifiers: { STR: 2, DEX: 1, CON: 2, INT: -1, WIS: 0, CHA: 0 }, ac: 16, gearSlots: 17, usedGearSlots: 1, meleeAttackBonus: 2, rangedAttackBonus: 1 },
  } as Character
}

describe('Character import/export E2E (GM + player)', () => {
  let browser: Browser
  let gm: Page
  let serverAvailable = false

  beforeAll(async () => {
    serverAvailable = await isServerRunning()
    if (!serverAvailable) {
      console.warn('\n⚠  Dev server not running on :3000 — skipping import/export E2E.\n   Start it with: pnpm dev\n')
      return
    }
    browser = await puppeteer.launch({
      // Watch the run with a visible browser: E2E_HEADLESS=false npx vitest run character-import-export-e2e
      headless: process.env.E2E_HEADLESS !== 'false',
      slowMo: process.env.E2E_HEADLESS === 'false' ? 60 : 0,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
    })
    gm = await browser.newPage()
    gm.setDefaultTimeout(TIMEOUT)
  }, TIMEOUT)

  afterAll(async () => { await browser?.close() })

  async function createGmSession(name: string): Promise<string> {
    await gm.goto(`${BASE_URL}/gm/create`, { waitUntil: 'domcontentloaded' })
    const input = await gm.waitForSelector('input[type="text"]')
    await input!.type(name)
    await clickByText(gm, 'Create Game')
    await gm.waitForFunction(() => location.href.includes('/gm/session/'), { timeout: TIMEOUT })
    await waitForText(gm, 'SD-')
    return gm.evaluate(() => (document.body.innerText.match(/SD-[A-Z0-9]+/) ?? [''])[0])
  }

  /** Join a room; returns the player page sitting on the "no character" screen. */
  async function joinRoom(roomCode: string, playerName: string): Promise<Page> {
    const player = await browser.newPage()
    player.setDefaultTimeout(TIMEOUT)
    await player.goto(`${BASE_URL}/player/join`, { waitUntil: 'domcontentloaded' })
    await player.waitForSelector('input')
    const inputs = await player.$$('input')
    await inputs[0].type(roomCode)
    await inputs[1].click({ clickCount: 3 })
    await inputs[1].type(playerName)
    await clickByText(player, 'Join Game')
    await waitForText(player, 'Create My Character')
    return player
  }

  async function createThief(player: Page, playerName: string): Promise<void> {
    await clickByText(player, 'Create My Character')
    await waitForText(player, 'Roll Ability Scores')
    await clickByText(player, 'Roll 3d6 for Each Stat')
    await waitForText(player, 'Reroll')
    await clickByText(player, 'Next')
    await waitForText(player, 'Choose Ancestry'); await clickCardTitle(player, 'Human'); await pause(300); await clickByText(player, 'Next')
    await waitForText(player, 'Choose Class'); await clickCardTitle(player, 'Thief'); await pause(300); await clickByText(player, 'Next')
    await waitForText(player, 'Character Details')
    const nameField = await player.waitForSelector('input[placeholder*="character name" i]')
    await nameField!.type(`${playerName} Blade`)
    await clickByText(player, 'Next')
    await waitForText(player, 'Review Character')
    await clickByText(player, 'Create Character')
    await waitForText(player, 'XP:')
  }

  it('lets a player export their character as a valid shadowdark-character-v1 file', async () => {
    if (!serverAvailable) return
    const code = await createGmSession('E2E Export')
    const player = await joinRoom(code, 'Expo')
    await createThief(player, 'Expo')

    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-char-dl-'))
    const cdp = await player.createCDPSession()
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir })

    await clickByText(player, 'Export')
    await pause(2_000)

    const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.json'))
    expect(files.length).toBeGreaterThan(0)
    const content = JSON.parse(fs.readFileSync(path.join(downloadDir, files[0]), 'utf-8'))
    expect(content).toHaveProperty('format', 'shadowdark-character-v1')
    expect(content).toHaveProperty('exportedAt')
    expect(content.character).toHaveProperty('name', 'Expo Blade')
    expect(content.character).toHaveProperty('class', 'thief')

    fs.rmSync(downloadDir, { recursive: true, force: true })
    await cdp.detach()
    await player.close()
  }, TEST_TIMEOUT)

  it('lets a player import a character on the no-character screen right after joining', async () => {
    if (!serverAvailable) return
    // Write a valid export envelope to a temp file to import.
    const envelope = exportCharacter(makeImportFixture())
    const tmpFile = path.join(os.tmpdir(), `import-${Date.now()}.json`)
    fs.writeFileSync(tmpFile, JSON.stringify(envelope, null, 2))

    const code = await createGmSession('E2E Import')
    const player = await joinRoom(code, 'Impo')

    // The "no character" screen must offer an import control (hidden file input).
    await waitForText(player, 'Import Character')
    const fileInput = await player.waitForSelector('input[type="file"]')
    expect(fileInput).toBeTruthy()
    await (fileInput as import('puppeteer').ElementHandle<HTMLInputElement>).uploadFile(tmpFile)

    // The imported character should be created, assigned, and shown on the sheet.
    await waitForText(player, 'Imported Hero')
    expect(await readLevel(player)).toBe(5)
    // Transient state reset on import: current HP restored to max (40), not the source's 12.
    await waitForText(player, '40/40')

    fs.rmSync(tmpFile, { force: true })
    await player.close()
  }, TEST_TIMEOUT)
})
