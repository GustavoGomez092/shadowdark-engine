// @vitest-environment node
/**
 * E2E for the player leveling experience, driven through the real two-client
 * (GM + player) PeerJS flow with Puppeteer against the dev server on :3000.
 *
 * Recommended tool: Puppeteer — already a dependency and used by the other E2E
 * specs (see campaign-e2e.test.ts). It runs its own browser, independent of any
 * editor/extension. Skips gracefully if the dev server is not running.
 *
 *   pnpm dev      # terminal 1
 *   pnpm test     # terminal 2  (or: npx vitest run leveling-e2e)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import puppeteer, { type Browser, type Page } from 'puppeteer'

const BASE_URL = 'http://localhost:3000'
const TIMEOUT = 60_000
const TEST_TIMEOUT = 180_000 // full create + level-up incl. ~13s dice animations

async function isServerRunning(): Promise<boolean> {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3_000) })
    return r.ok || r.status === 304
  } catch {
    return false
  }
}

/** Click the first visible element matching `tag` whose trimmed text equals/contains `text`. */
async function clickByText(page: Page, text: string, tag = 'button'): Promise<void> {
  const handle = await page.evaluateHandle(
    (t: string, sel: string) => {
      const lc = t.toLowerCase() // buttons often use CSS uppercase; match DOM text case-insensitively
      const els = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
      return els.find(el => (el.textContent ?? '').trim().toLowerCase() === lc)
        ?? els.find(el => (el.textContent ?? '').toLowerCase().includes(lc))
        ?? null
    },
    text, tag,
  )
  const el = handle.asElement()
  if (!el) throw new Error(`No <${tag}> with text "${text}"`)
  await el.click()
}

/** Click a selection card by its exact title text (e.g. "Human", "Thief"); the
 *  click bubbles to the card's onClick. Used for ancestry/class selection. */
async function clickCardTitle(page: Page, title: string): Promise<void> {
  const handle = await page.evaluateHandle((t: string) => {
    const els = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,strong,p')) as HTMLElement[]
    const exact = els.filter(e => (e.textContent ?? '').trim() === t)
    return exact.sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0] ?? null
  }, title)
  const el = handle.asElement()
  if (!el) throw new Error(`No card titled "${title}"`)
  await el.click()
}

const pause = (ms: number) => new Promise(r => setTimeout(r, ms))

async function waitForText(page: Page, text: string, timeout = TIMEOUT): Promise<void> {
  await page.waitForFunction(
    (t: string) => document.body.innerText.includes(t),
    { timeout },
    text,
  )
}

async function readLevel(page: Page): Promise<number> {
  return page.evaluate(() => {
    const m = document.body.innerText.match(/Level\s+(\d+)/)
    return m ? parseInt(m[1], 10) : -1
  })
}

describe('Leveling E2E (GM + player)', () => {
  let browser: Browser
  let gm: Page
  let serverAvailable = false

  beforeAll(async () => {
    serverAvailable = await isServerRunning()
    if (!serverAvailable) {
      console.warn('\n⚠  Dev server not running on :3000 — skipping leveling E2E.\n   Start it with: pnpm dev\n')
      return
    }
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Keep PeerJS/WebRTC alive on the backgrounded GM tab so the player can connect.
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    })
    gm = await browser.newPage()
    gm.setDefaultTimeout(TIMEOUT)
  }, TIMEOUT)

  afterAll(async () => {
    await browser?.close()
  })

  /** Create a GM session and return its room code (e.g. "SD-XXXX"). */
  async function createGmSession(name: string): Promise<string> {
    await gm.goto(`${BASE_URL}/gm/create`, { waitUntil: 'domcontentloaded' })
    const input = await gm.waitForSelector('input[type="text"]')
    await input!.type(name)
    await clickByText(gm, 'Create Game')
    await gm.waitForFunction(() => location.href.includes('/gm/session/'), { timeout: TIMEOUT })
    await waitForText(gm, 'SD-')
    return gm.evaluate(() => (document.body.innerText.match(/SD-[A-Z0-9]+/) ?? [''])[0])
  }

  /** Join as a player and create a character of the given class. Returns the player Page. */
  async function joinAndCreate(roomCode: string, playerName: string, className: string): Promise<Page> {
    const player = await browser.newPage()
    player.setDefaultTimeout(TIMEOUT)
    await player.goto(`${BASE_URL}/player/join`, { waitUntil: 'domcontentloaded' })

    await player.waitForSelector('input') // wait for React to render the form
    const inputs = await player.$$('input')
    await inputs[0].type(roomCode)             // room code
    await inputs[1].click({ clickCount: 3 })   // name (may be prefilled)
    await inputs[1].type(playerName)
    await clickByText(player, 'Join Game')

    await waitForText(player, 'Create My Character')
    await clickByText(player, 'Create My Character')

    // Step 1: roll stats
    await waitForText(player, 'Roll Ability Scores')
    await clickByText(player, 'Roll 3d6 for Each Stat')
    await waitForText(player, 'Reroll')
    await clickByText(player, 'Next')

    // Step 2: ancestry → Human
    await waitForText(player, 'Choose Ancestry')
    await clickCardTitle(player, 'Human')
    await pause(300)
    await clickByText(player, 'Next')

    // Step 3: class
    await waitForText(player, 'Choose Class')
    await clickCardTitle(player, className.charAt(0).toUpperCase() + className.slice(1))
    await pause(300)
    await clickByText(player, 'Next')

    // Step 4: details
    await waitForText(player, 'Character Details')
    const nameField = await player.waitForSelector('input[placeholder*="character name" i]')
    await nameField!.type(`${playerName} the ${className}`)
    await clickByText(player, 'Next')

    // Step 5: review → create
    await waitForText(player, 'Review Character')
    await clickByText(player, 'Create Character')

    await waitForText(player, 'XP:')
    return player
  }

  /** GM awards `clicks` × +5 XP to the (single) connected player. */
  async function awardXp(clicks: number): Promise<void> {
    await gm.bringToFront()
    await clickByText(gm, '⋮') // open the player menu
    await waitForText(gm, '+5 XP')
    for (let i = 0; i < clicks; i++) {
      await clickByText(gm, '+5 XP')
      await new Promise(r => setTimeout(r, 150))
    }
  }

  interface LevelUpOutcome { sawSpellStep: boolean; spellOptionCount: number }

  /** Run the player's level-up wizard one full level, handling optional talent/spell steps. */
  async function levelUpOnce(player: Page): Promise<LevelUpOutcome> {
    const outcome: LevelUpOutcome = { sawSpellStep: false, spellOptionCount: 0 }
    await player.bringToFront()
    await waitForText(player, 'Ready to Level Up!')
    await clickByText(player, 'Level Up!')

    // Announce
    await waitForText(player, 'reaches Level')
    await clickByText(player, 'Continue')

    // HP roll
    await waitForText(player, 'Roll', 10_000) // "Roll d? for HP"
    await clickByText(player, 'ROLL')
    await waitForText(player, 'HP gained', 20_000) // appears once the dice settle
    await clickByText(player, 'Continue')

    // Optional talent step
    const onTalent = await player.evaluate(() => document.body.innerText.includes('Talent Table'))
    if (onTalent) {
      await clickByText(player, 'ROLL')
      // wait for a settled talent (Continue becomes enabled / a result line shows)
      await new Promise(r => setTimeout(r, 9_000))
      // If the roll requires choosing a stat, pick the first offered stat button.
      const needsStat = await player.evaluate(() => document.body.innerText.includes('Choose which stat') || document.body.innerText.includes('to increase'))
      if (needsStat) {
        for (const s of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
          const clicked = await player.evaluate((stat) => {
            const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent ?? '').trim().startsWith(stat))
            if (b) { (b as HTMLButtonElement).click(); return true }
            return false
          }, s)
          if (clicked) break
        }
      }
      await clickByText(player, 'Continue')
    }

    // Optional spell step (casters): fill each new spell slot from its dropdown of
    // learnable spells — this is the "list of new spells to decide how to attack".
    const onSpells = await player.evaluate(() => /Learn New Spell|New spell slot|NEW TIER/i.test(document.body.innerText))
    if (onSpells) {
      outcome.sawSpellStep = true
      outcome.spellOptionCount = await player.evaluate(() => {
        const spellSelects = Array.from(document.querySelectorAll('select'))
          .filter(s => Array.from(s.options).some(o => /select a spell/i.test(o.textContent ?? '')))
        let chosen = 0
        for (const sel of spellSelects) {
          const opt = Array.from(sel.options).find(o => o.value)
          if (opt) {
            sel.value = opt.value
            sel.dispatchEvent(new Event('change', { bubbles: true }))
            chosen++
          }
        }
        // report how many spells the first slot offered the player to choose from
        const first = spellSelects[0]
        return first ? Array.from(first.options).filter(o => o.value).length : chosen
      })
      await clickByText(player, 'Continue').catch(() => {})
    }

    // Summary
    await waitForText(player, 'Level Up Complete!')
    await clickByText(player, 'Complete Level Up')
    await new Promise(r => setTimeout(r, 1_500))
    return outcome
  }

  it('levels a Thief from creation to level 2 via the real GM→player flow', async () => {
    if (!serverAvailable) return
    const code = await createGmSession('E2E Thief')
    expect(code).toMatch(/^SD-/)
    const player = await joinAndCreate(code, 'EThief', 'thief')
    expect(await readLevel(player)).toBe(1)

    await awardXp(2) // 10 XP → level 1 threshold
    await levelUpOnce(player)

    expect(await readLevel(player)).toBe(2)
    await player.close()
  }, TEST_TIMEOUT)

  it('levels a Wizard to level 2 and presents new spell slots to choose', async () => {
    if (!serverAvailable) return
    const code = await createGmSession('E2E Wizard')
    expect(code).toMatch(/^SD-/)
    const player = await joinAndCreate(code, 'EWiz', 'wizard')
    expect(await readLevel(player)).toBe(1)

    await awardXp(2)
    const outcome = await levelUpOnce(player)

    expect(await readLevel(player)).toBe(2)
    // The caster must be presented a real list of new spells to choose how to attack.
    expect(outcome.sawSpellStep).toBe(true)
    expect(outcome.spellOptionCount).toBeGreaterThan(1)
    await player.close()
  }, TEST_TIMEOUT)
})
