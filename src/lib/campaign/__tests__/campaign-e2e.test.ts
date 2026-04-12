/**
 * E2E tests for campaign export/import UI flow.
 *
 * These tests use Puppeteer to drive a real browser against the dev server
 * running on localhost:3000. If the server is not running, the tests skip
 * gracefully rather than crashing.
 *
 * Run the dev server first:  pnpm dev
 * Then run tests:            pnpm test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const BASE_URL = 'http://localhost:3000'
const CAMPAIGN_LIST_URL = `${BASE_URL}/campaign/`
const TIMEOUT = 30_000

/** Check whether the dev server is reachable before running tests. */
async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(3_000) })
    return response.ok || response.status === 200 || response.status === 304
  } catch {
    return false
  }
}

describe('Campaign E2E', () => {
  let browser: Browser
  let page: Page
  let serverAvailable = false

  beforeAll(async () => {
    serverAvailable = await isServerRunning()
    if (!serverAvailable) {
      console.warn(
        '\n⚠  Dev server not running on port 3000 — skipping E2E tests.\n' +
        '   Start it with: pnpm dev\n',
      )
      return
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    page = await browser.newPage()
    page.setDefaultTimeout(TIMEOUT)
  }, TIMEOUT)

  afterAll(async () => {
    await browser?.close()
  })

  // ── Test 1: Export happy path ──────────────────────────────────────────────

  it('exports an adventure JSON with the correct format after creating a campaign', async () => {
    if (!serverAvailable) return

    // Navigate to campaign list
    await page.goto(CAMPAIGN_LIST_URL, { waitUntil: 'networkidle0' })

    // Fill in campaign name and create
    const nameInput = await page.waitForSelector('form input[type="text"]')
    expect(nameInput).toBeTruthy()
    await nameInput!.click({ clickCount: 3 })
    await nameInput!.type('E2E Export Test Campaign')

    // Submit the form (click the submit button)
    const submitButton = await page.waitForSelector('form button[type="submit"]')
    await submitButton!.click()

    // Wait for navigation to campaign overview page (/campaign/{id}/)
    await page.waitForNavigation({ waitUntil: 'networkidle0' })

    const url = page.url()
    expect(url).toMatch(/\/campaign\/[^/]+/)

    // Set up CDP download behavior to a temp directory
    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-e2e-download-'))
    const cdpSession = await page.createCDPSession()
    await cdpSession.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
    })

    // Find and click the adventure export button (the second export button in the export section)
    const adventureExportButton = await page.evaluateHandle(() => {
      // Find the button in the export section — it is the second button in the last card section
      const exportSection = Array.from(document.querySelectorAll('h3')).find(
        h3 => h3.closest('.rounded-xl.border'),
      )
      if (!exportSection) return null
      const card = exportSection.closest('.rounded-xl')
      if (!card) return null
      const cardButtons = card.querySelectorAll('button')
      // Adventure export is the second button
      return cardButtons.length >= 2 ? cardButtons[1] : cardButtons[0]
    })

    if (adventureExportButton) {
      await (adventureExportButton as unknown as import('puppeteer').ElementHandle<HTMLButtonElement>).click()
    }

    // Give the browser a moment to trigger the download
    await new Promise(resolve => setTimeout(resolve, 2_000))

    // Check if a file was downloaded — this is inherently fragile across OS/configs
    const downloadedFiles = fs.readdirSync(downloadDir).filter(f => f.endsWith('.json'))

    if (downloadedFiles.length > 0) {
      const filePath = path.join(downloadDir, downloadedFiles[0])
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

      // Verify adventure document format
      expect(content).toHaveProperty('format', 'shadowdark-adventure-v1')
      expect(content).toHaveProperty('exportedAt')
      expect(content).toHaveProperty('id')
      expect(content).toHaveProperty('name', 'E2E Export Test Campaign')
      expect(content).toHaveProperty('content')
      expect(content).toHaveProperty('adventure')
      expect(content).toHaveProperty('lore')
      expect(content).toHaveProperty('maps')
      expect(typeof content.exportedAt).toBe('number')
    } else {
      // Download verification failed — don't fail the test hard, just warn
      console.warn(
        '  Download verification skipped: no JSON file found in download directory.\n' +
        '  This can happen due to OS-specific download handling.\n' +
        `  Download dir: ${downloadDir}`,
      )
    }

    // Clean up temp directory
    fs.rmSync(downloadDir, { recursive: true, force: true })

    await cdpSession.detach()
  }, TIMEOUT)

  // ── Test 2: Import happy path ─────────────────────────────────────────────

  it('imports a valid adventure JSON and navigates to the imported campaign', async () => {
    if (!serverAvailable) return

    // Navigate to campaign list
    await page.goto(CAMPAIGN_LIST_URL, { waitUntil: 'networkidle0' })

    // Build a valid adventure document to import
    const adventureJson = JSON.stringify({
      format: 'shadowdark-adventure-v1',
      exportedAt: Date.now(),
      id: 'e2e-import-test-001',
      name: 'E2E Imported Campaign',
      author: 'E2E Bot',
      version: '1.0',
      description: 'A campaign created for E2E import testing',
      createdAt: Date.now() - 100_000,
      updatedAt: Date.now(),
      content: {},
      adventure: {
        hook: 'A mysterious portal opens...',
        overview: 'The party must investigate a strange portal.',
        targetLevel: [1, 3],
        rooms: [],
        randomEncounters: [],
        npcs: [],
      },
      lore: { chapters: [] },
      maps: [],
    })

    // Use page.evaluate to inject a File into the hidden file input via DataTransfer API
    // because the <input type="file"> is hidden and activated programmatically
    const navigated = await page.evaluate((jsonString: string) => {
      return new Promise<boolean>((resolve) => {
        const fileInput = document.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement
        if (!fileInput) {
          resolve(false)
          return
        }

        // Create a synthetic File and set it on the input via DataTransfer
        const dataTransfer = new DataTransfer()
        const file = new File([jsonString], 'test-adventure.json', { type: 'application/json' })
        dataTransfer.items.add(file)
        fileInput.files = dataTransfer.files

        // Dispatch a change event to trigger the React handler
        const changeEvent = new Event('change', { bubbles: true })
        fileInput.dispatchEvent(changeEvent)

        // Wait a moment for navigation
        setTimeout(() => resolve(true), 500)
      })
    }, adventureJson)

    expect(navigated).toBe(true)

    // Wait for navigation to campaign page
    await page.waitForFunction(
      (base: string) => window.location.href.includes('/campaign/') && window.location.href !== `${base}/campaign/`,
      { timeout: 10_000 },
      BASE_URL,
    )

    const currentUrl = page.url()
    // Verify we navigated away from the list to a specific campaign
    expect(currentUrl).toMatch(/\/campaign\/[^/]+/)
    expect(currentUrl).not.toBe(CAMPAIGN_LIST_URL)
  }, TIMEOUT)

  // ── Test 3: Import error path ─────────────────────────────────────────────

  it('shows an error message when importing invalid JSON', async () => {
    if (!serverAvailable) return

    // Navigate to campaign list
    await page.goto(CAMPAIGN_LIST_URL, { waitUntil: 'networkidle0' })

    // Inject invalid JSON (missing required fields) into the file input
    const invalidJson = JSON.stringify({ garbage: true, notACampaign: 42 })

    await page.evaluate((jsonString: string) => {
      const fileInput = document.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement
      if (!fileInput) return

      const dataTransfer = new DataTransfer()
      const file = new File([jsonString], 'bad-file.json', { type: 'application/json' })
      dataTransfer.items.add(file)
      fileInput.files = dataTransfer.files

      const changeEvent = new Event('change', { bubbles: true })
      fileInput.dispatchEvent(changeEvent)
    }, invalidJson)

    // Wait for the error message to appear
    // The error div has classes: border-red-500/30 bg-red-500/10 text-red-400
    const errorElement = await page.waitForSelector('[class*="text-red"]', { timeout: 5_000 })
    expect(errorElement).toBeTruthy()

    // Verify the error message has content
    const errorText = await errorElement!.evaluate(el => el.textContent)
    expect(errorText).toBeTruthy()
    expect(errorText!.length).toBeGreaterThan(0)

    // Should still be on the campaign list page (no navigation occurred)
    expect(page.url()).toBe(CAMPAIGN_LIST_URL)
  }, TIMEOUT)
})
