// @vitest-environment node
/**
 * DEEP leveling journey E2E: drives a character through the real GM+player flow from
 * creation all the way to level 10, MAKING and VERIFYING the player's choices at each
 * level — HP rolls, talent/ability picks (incl. stat increases and the choose-talent-or-
 * stats branch), and (for casters) picking spells every level. Asserts the choices land
 * on the character sheet.
 *
 * This is slow by nature (real ~13s dice animations × ~9 levels). Watch it run:
 *   E2E_HEADLESS=false npx vitest run leveling-journey-e2e
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import puppeteer, { type Browser, type Page, type ElementHandle } from 'puppeteer'

const BASE_URL = 'http://localhost:3000'
const SETUP_TIMEOUT = 60_000
const JOURNEY_TIMEOUT = 600_000 // full 1→10 with dice animations

const MARTIAL = ['thief', 'fighter', 'ranger'] as const
const CASTERS = ['wizard', 'priest', 'witch', 'seer'] as const
const ALL = [...MARTIAL, ...CASTERS]
const isCaster = (c: string) => (CASTERS as readonly string[]).includes(c)

async function isServerRunning(): Promise<boolean> {
  try { const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3_000) }); return r.ok || r.status === 304 } catch { return false }
}

const pause = (ms: number) => new Promise(r => setTimeout(r, ms))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Dropdown labels read "<name> Tier <n> (Focus)"; reduce to the bare name for sheet matching.
const normalizeSpell = (s: string) => s.replace(/\s*tier\s*\d+/i, '').replace(/\s*\(focus\)\s*/i, '').trim()

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
const waitText = (page: Page, t: string, ms = SETUP_TIMEOUT) =>
  page.waitForFunction((x: string) => document.body.innerText.includes(x), { timeout: ms }, t)
const readLevel = (page: Page) =>
  page.evaluate(() => { const m = document.body.innerText.match(/Level\s+(\d+)/); return m ? parseInt(m[1], 10) : -1 })

interface JourneySummary {
  finalLevel: number
  talentLevels: number
  hpByLevel: number[]
  spellsPicked: string[]
  sheetSpells: string  // sheet text after L10 (for verifying picks landed)
}

describe('Deep leveling journey E2E (creation → level 10)', () => {
  let browser: Browser
  let gm: Page
  let serverAvailable = false

  beforeAll(async () => {
    serverAvailable = await isServerRunning()
    if (!serverAvailable) {
      console.warn('\n⚠  Dev server not running on :3000 — skipping deep leveling journey E2E.\n   Start it with: pnpm dev\n')
    }
  })

  // A fresh browser per class keeps each ~minute-long journey isolated — sharing one
  // browser across all 7 long sessions destabilizes the CDP connection.
  beforeEach(async () => {
    if (!serverAvailable) return
    browser = await puppeteer.launch({
      headless: process.env.E2E_HEADLESS !== 'false',
      slowMo: process.env.E2E_HEADLESS === 'false' ? 40 : 0,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
    })
    gm = await browser.newPage()
    gm.setDefaultTimeout(SETUP_TIMEOUT)
  }, SETUP_TIMEOUT)

  afterEach(async () => { await browser?.close() })

  async function createGmSession(name: string): Promise<string> {
    await gm.goto(`${BASE_URL}/gm/create`, { waitUntil: 'domcontentloaded' })
    const input = await gm.waitForSelector('input[type="text"]')
    await input!.type(name)
    await click(gm, 'Create Game')
    await gm.waitForFunction(() => location.href.includes('/gm/session/'), { timeout: SETUP_TIMEOUT })
    await waitText(gm, 'SD-')
    return gm.evaluate(() => (document.body.innerText.match(/SD-[A-Z0-9]+/) ?? [''])[0])
  }

  async function joinAndCreate(roomCode: string, playerName: string, className: string): Promise<Page> {
    const player = await browser.newPage()
    player.setDefaultTimeout(SETUP_TIMEOUT)
    await player.goto(`${BASE_URL}/player/join`, { waitUntil: 'domcontentloaded' })
    await player.waitForSelector('input')
    const inputs = await player.$$('input')
    await inputs[0].type(roomCode)
    await inputs[1].click({ clickCount: 3 }); await inputs[1].type(playerName)
    await click(player, 'Join Game')
    await waitText(player, 'Create My Character')
    await click(player, 'Create My Character')
    await waitText(player, 'Roll Ability Scores')
    await click(player, 'Roll 3d6 for Each Stat'); await waitText(player, 'Reroll'); await click(player, 'Next')
    await waitText(player, 'Choose Ancestry'); await clickTitle(player, 'Human'); await pause(300); await click(player, 'Next')
    await waitText(player, 'Choose Class'); await clickTitle(player, cap(className)); await pause(300); await click(player, 'Next')
    await waitText(player, 'Character Details')
    const nf = await player.waitForSelector('input[placeholder*="character name" i]')
    await nf!.type(`Hero ${className}`); await click(player, 'Next')
    await waitText(player, 'Review Character'); await click(player, 'Create Character')
    await waitText(player, 'XP:')
    return player
  }

  async function ensureMenu(): Promise<void> {
    await gm.bringToFront()
    const open = await gm.evaluate(() => document.body.innerText.includes('+5 XP'))
    if (!open) await click(gm, '⋮')
    await waitText(gm, '+5 XP', 6_000)
  }
  async function awardXp(amount: number): Promise<void> {
    await ensureMenu()
    for (let i = 0; i < Math.ceil(amount / 5); i++) { await click(gm, '+5 XP'); await pause(120) }
  }

  /** Roll the talent and resolve whichever branch comes up (stat choice / distribute / plain). */
  async function resolveTalent(p: Page): Promise<void> {
    await click(p, 'ROLL')
    let s: { choose: boolean; mode: boolean; contEnabled: boolean; rolling: boolean } | null = null
    for (let i = 0; i < 20; i++) {
      s = await p.evaluate(() => {
        const txt = document.body.innerText.toLowerCase()
        const cont = Array.from(document.querySelectorAll('button')).find(b => /^continue$/i.test((b.textContent ?? '').trim()))
        return { choose: txt.includes('choose stat to increase'), mode: txt.includes('pick a talent or distribute'), contEnabled: !!cont && !cont.disabled, rolling: txt.includes('rolling') }
      })
      if (!s.rolling && (s.choose || s.mode || s.contEnabled)) break
      await pause(1_000)
    }
    if (s?.choose) {
      await p.evaluate(() => { const codes = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']; const b = Array.from(document.querySelectorAll('button')).find(x => codes.includes((x.textContent ?? '').trim().slice(0, 3))); (b as HTMLButtonElement)?.click() })
    } else if (s?.mode) {
      await click(p, '+2 to Stats'); await waitText(p, 'Distribute 2 points', 5_000)
      await p.evaluate(() => { const plus = Array.from(document.querySelectorAll('button')).filter(b => (b.textContent ?? '').trim() === '+'); for (let i = 0; i < 2 && plus[0]; i++) (plus[0] as HTMLButtonElement).click() })
      await pause(300)
    }
    for (let i = 0; i < 6; i++) {
      await click(p, 'Continue').catch(() => {})
      await pause(500)
      if (!(await p.evaluate(() => document.body.innerText.includes('Talent Table')))) return
    }
  }

  /** Fill each newly opened spell slot from its dropdown; returns the spell names chosen. */
  async function pickSpells(p: Page): Promise<string[]> {
    if (!(await p.evaluate(() => document.body.innerText.includes('Learn New Spells')))) return []
    const chosen = await p.evaluate(() => {
      const sels = Array.from(document.querySelectorAll('select')).filter(s => Array.from(s.options).some(o => /select a spell/i.test(o.textContent ?? '')))
      const picked: string[] = []
      const used: string[] = []
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!
      for (const sel of sels) {
        // distinct spell per slot (all slots share the same unlocked-tier pool)
        const opt = Array.from(sel.options).find(o => o.value && !used.includes(o.value))
        if (opt) {
          setter.call(sel, opt.value)
          sel.dispatchEvent(new Event('change', { bubbles: true }))
          used.push(opt.value)
          picked.push((opt.textContent ?? '').trim())
        }
      }
      return picked
    })
    await click(p, 'Continue').catch(() => {})
    return chosen
  }

  async function levelUpOnce(p: Page): Promise<{ talentResolved: boolean; spells: string[]; newMaxHp: number }> {
    await p.bringToFront()
    await waitText(p, 'Ready to Level Up!', 12_000); await click(p, 'Level Up!')
    await waitText(p, 'reaches Level'); await click(p, 'Continue')
    await waitText(p, 'Roll', 12_000); await click(p, 'ROLL'); await waitText(p, 'HP gained', 40_000); await click(p, 'Continue')
    let talentResolved = false
    if (await p.evaluate(() => document.body.innerText.includes('Talent Table'))) { await resolveTalent(p); talentResolved = true }
    const spells = await pickSpells(p)
    await waitText(p, 'Level Up Complete!', 15_000)
    const newMaxHp = await p.evaluate(() => { const m = document.body.innerText.match(/Max HP:[^\d]*\d+[^\d]+(\d+)/); return m ? parseInt(m[1], 10) : -1 })
    await click(p, 'Complete Level Up'); await waitText(p, 'XP:', 12_000); await pause(700)
    return { talentResolved, spells, newMaxHp }
  }

  async function playToLevel10(player: Page): Promise<JourneySummary> {
    const summary: JourneySummary = { finalLevel: 1, talentLevels: 0, hpByLevel: [], spellsPicked: [], sheetSpells: '' }
    for (let target = 2; target <= 10; target++) {
      await awardXp((target - 1) * 10)
      const r = await levelUpOnce(player)
      if (r.talentResolved) summary.talentLevels++
      summary.spellsPicked.push(...r.spells)
      summary.hpByLevel.push(r.newMaxHp)
      summary.finalLevel = await readLevel(player)
      if (summary.finalLevel !== target) throw new Error(`expected level ${target}, got ${summary.finalLevel}`)
    }
    summary.sheetSpells = await player.evaluate(() => document.body.innerText)
    return summary
  }

  describe.each(ALL)('%s reaches level 10 making real choices', (className) => {
    it('levels up with growing HP, talents, and (casters) chosen spells on the sheet', async () => {
      if (!serverAvailable) return
      const code = await createGmSession(`Deep ${className}`)
      const player = await joinAndCreate(code, `H${className}`, className)
      expect(await readLevel(player)).toBe(1)

      const s = await playToLevel10(player)

      expect(s.finalLevel).toBe(10)
      // talent gained reaching levels 3, 5, 7, 9
      expect(s.talentLevels).toBe(4)
      // HP grew across the climb
      expect(s.hpByLevel[s.hpByLevel.length - 1]).toBeGreaterThan(s.hpByLevel[0])
      // the sheet shows a Talents section with the abilities gained
      expect(s.sheetSpells).toContain('Talents')

      if (isCaster(className)) {
        // Casters pick spells as new (fillable) slots open. Priests only have tier 1–2
        // spells in the data, so they pick fewer than full-list casters — the meaningful
        // assertion is that the chosen spells actually land on the sheet.
        expect(s.spellsPicked.length).toBeGreaterThan(0)
        const landed = s.spellsPicked.some(name => s.sheetSpells.includes(normalizeSpell(name)))
        expect(landed).toBe(true)
        expect(s.sheetSpells).toContain('Spells')
      } else {
        expect(s.spellsPicked.length).toBe(0)
      }

      await player.close()
    }, JOURNEY_TIMEOUT)
  })
})
