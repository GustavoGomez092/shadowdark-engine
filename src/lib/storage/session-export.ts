import type { SessionState } from '@/schemas/session.ts'
import type { DataPack } from '@/lib/data/types.ts'
import { generateRoomCode } from '@/lib/utils/id.ts'
import { dataRegistry } from '@/lib/data/registry.ts'

export interface SessionExport {
  version: 2
  exportedAt: number
  engineVersion: string
  session: SessionState
  dataPacks?: DataPack[]
}

/**
 * Sanitize and export a session as a JSON string.
 * Includes all installed data packs so the session is fully self-contained.
 */
export function exportSession(session: SessionState): string {
  const sanitized: SessionState = {
    ...session,
    room: {
      ...session.room,
      gmPeerId: '',
    },
    players: {},
    activeTurnId: null,
  }

  // Include all installed data packs (strip 'enabled' field — they'll default to enabled on import)
  const packs = dataRegistry.getPacks()
  const fullPacks: DataPack[] = packs.map(meta => {
    const pack = dataRegistry.getPackById(meta.id)
    if (!pack) return null
    const { enabled: _, ...rest } = pack
    return rest as DataPack
  }).filter((p): p is DataPack => p !== null)

  const envelope: SessionExport = {
    version: 2,
    exportedAt: Date.now(),
    engineVersion: '1.0.0',
    session: sanitized,
    dataPacks: fullPacks.length > 0 ? fullPacks : undefined,
  }

  return JSON.stringify(envelope, null, 2)
}

/**
 * Build a safe filename from session name and date.
 */
export function getExportFilename(sessionName: string): string {
  const safe = sessionName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-')
  const date = new Date().toISOString().slice(0, 10)
  return `${safe}-${date}.json`
}

/**
 * Trigger a file download from a JSON string.
 */
export function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface SessionImportResult {
  valid: boolean
  error?: string
  session?: SessionState
  dataPacks?: DataPack[]
  packsInstalled?: number
}

/**
 * Parse and validate an imported session JSON string.
 * Assigns a new room ID, resets connection state, and extracts bundled data packs.
 */
export function parseSessionImport(json: string): SessionImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { valid: false, error: 'Invalid JSON file' }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Invalid file format' }
  }

  const obj = parsed as Record<string, unknown>

  // Accept both raw SessionState and SessionExport envelope
  let session: SessionState
  let dataPacks: DataPack[] | undefined
  if (obj.version && obj.session && typeof obj.session === 'object') {
    // SessionExport envelope
    session = obj.session as SessionState
    if (Array.isArray(obj.dataPacks)) {
      dataPacks = obj.dataPacks as DataPack[]
    }
  } else if (obj.room && obj.characters && typeof obj.room === 'object') {
    // Raw SessionState (v1 or manual)
    session = parsed as SessionState
  } else {
    return { valid: false, error: 'Not a valid session file. Expected a ShadowDark Engine session export.' }
  }

  // Validate required fields
  if (!session.room?.name) {
    return { valid: false, error: 'Session file is missing room name' }
  }
  if (!session.characters || typeof session.characters !== 'object') {
    return { valid: false, error: 'Session file is missing characters data' }
  }

  // Assign new room ID and reset connection state
  session.room = {
    ...session.room,
    id: generateRoomCode(),
    gmPeerId: '',
  }
  session.players = {}
  session.activeTurnId = null
  session.meta = {
    ...session.meta,
    lastSavedAt: Date.now(),
  }

  // Install bundled data packs (skip already-installed ones)
  let packsInstalled = 0
  if (dataPacks && dataPacks.length > 0) {
    for (const pack of dataPacks) {
      const existing = dataRegistry.getPackById(pack.id)
      if (!existing) {
        dataRegistry.addPack(pack)
        packsInstalled++
      }
    }
  }

  return { valid: true, session, dataPacks, packsInstalled }
}
