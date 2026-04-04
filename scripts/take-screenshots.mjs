#!/usr/bin/env node
/**
 * Capture high-quality screenshots of all major features.
 * Requires the dev server running on port 3003 with an active session.
 *
 * Usage: node scripts/take-screenshots.mjs
 */
import puppeteer from 'puppeteer'
import { mkdir } from 'fs/promises'

const BASE = 'http://localhost:3003'
const OUT = 'docs/screenshots'
const WIDTH = 1440
const HEIGHT = 900

async function main() {
  await mkdir(OUT, { recursive: true })

  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 })

  // Helper: screenshot with delay for rendering
  async function snap(name, url, opts = {}) {
    await page.goto(url || BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
    // Wait for SPA to hydrate and render
    await new Promise(r => setTimeout(r, 2000))
    if (opts.scrollTo) {
      await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), opts.scrollTo)
    }
    if (opts.wait) await new Promise(r => setTimeout(r, opts.wait))
    if (opts.click) {
      await page.click(opts.click).catch(() => {})
      await new Promise(r => setTimeout(r, 800))
    }
    if (opts.eval) {
      await page.evaluate(opts.eval)
      await new Promise(r => setTimeout(r, 800))
    }
    await new Promise(r => setTimeout(r, 500))
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.fullPage ?? false })
    console.log(`  ✓ ${name}.png`)
  }

  // ===================== ENGLISH SCREENSHOTS =====================
  console.log('\n📸 Capturing English screenshots...\n')

  // Set English locale
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.evaluate(() => localStorage.setItem('shadowdark:locale', 'en'))
  await new Promise(r => setTimeout(r, 1000))

  // 1. Landing page
  await snap('01-landing', BASE)

  // 2. GM Session Overview
  await snap('02-gm-session', `${BASE}/gm/session/vpaj295w`)

  // 3. Monsters page with pack borders
  await snap('03-monsters', `${BASE}/gm/monsters`)

  // 4. Reference - Rules
  await snap('04-reference-rules', `${BASE}/gm/tables`)

  // 5. Reference - Spells tab
  await snap('05-reference-spells', `${BASE}/gm/tables`, {
    eval: () => {
      const btns = document.querySelectorAll('button')
      for (const b of btns) { if (b.textContent?.trim() === 'Spells') { b.click(); break } }
    },
    wait: 500,
  })

  // 6. Reference - Monsters tab
  await snap('06-reference-monsters', `${BASE}/gm/tables`, {
    eval: () => {
      const btns = document.querySelectorAll('button')
      for (const b of btns) { if (b.textContent?.trim() === 'Monsters') { b.click(); break } }
    },
    wait: 500,
  })

  // 7. Settings page
  await snap('07-settings', `${BASE}/gm/settings`)

  // 8. Settings - Data Packs (scroll down)
  await snap('08-data-packs', `${BASE}/gm/settings`, {
    scrollTo: 'h2',
    eval: () => {
      const headings = document.querySelectorAll('h2')
      for (const h of headings) {
        if (h.textContent?.includes('Data Packs')) { h.scrollIntoView({ block: 'start' }); break }
      }
    },
    wait: 300,
  })

  // 9. Settings - AI Provider
  await snap('09-ai-settings', `${BASE}/gm/settings`, {
    eval: () => {
      const headings = document.querySelectorAll('h2')
      for (const h of headings) {
        if (h.textContent?.includes('AI Provider')) { h.scrollIntoView({ block: 'start' }); break }
      }
    },
    wait: 300,
  })

  // 10. Sessions / Create page
  await snap('10-sessions', `${BASE}/gm/create`)

  // 11. Characters page
  await snap('11-characters', `${BASE}/gm/characters`)

  // 12. Stores page
  await snap('12-stores', `${BASE}/gm/stores`)

  // ===================== SPANISH SCREENSHOTS =====================
  console.log('\n🇪🇸 Capturing Spanish screenshots...\n')

  await page.evaluate(() => localStorage.setItem('shadowdark:locale', 'es'))

  // 13. Landing in Spanish
  await snap('13-landing-es', BASE)

  // 14. GM Session in Spanish
  await snap('14-gm-session-es', `${BASE}/gm/session/vpaj295w`)

  // 15. Reference Rules in Spanish
  await snap('15-reference-rules-es', `${BASE}/gm/tables`)

  // 16. Monsters in Spanish
  await snap('16-monsters-es', `${BASE}/gm/monsters`)

  // Reset to English
  await page.evaluate(() => localStorage.setItem('shadowdark:locale', 'en'))

  await browser.close()
  console.log(`\n✅ Done! ${16} screenshots saved to ${OUT}/\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
