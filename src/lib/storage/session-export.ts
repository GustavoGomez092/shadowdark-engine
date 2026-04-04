import type { SessionState } from '@/schemas/session.ts'
import { generateRoomCode } from '@/lib/utils/id.ts'

export interface SessionExport {
  version: 1
  exportedAt: number
  engineVersion: string
  session: SessionState
}

/**
 * Sanitize and export a session as a JSON string.
 * Strips connection-specific data (peer IDs, connected players).
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

  const envelope: SessionExport = {
    version: 1,
    exportedAt: Date.now(),
    engineVersion: '1.0.0',
    session: sanitized,
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

/**
 * Parse and validate an imported session JSON string.
 * Assigns a new room ID and resets connection state.
 */
export function parseSessionImport(json: string): { valid: boolean; error?: string; session?: SessionState } {
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
  if (obj.version && obj.session && typeof obj.session === 'object') {
    // SessionExport envelope
    session = obj.session as SessionState
  } else if (obj.room && obj.characters && typeof obj.room === 'object') {
    // Raw SessionState
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

  return { valid: true, session }
}
