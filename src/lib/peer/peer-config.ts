import type { PeerOptions } from 'peerjs'

/**
 * Shared PeerJS ICE configuration for GM and player peers.
 *
 * Cross-network WebRTC needs a TURN relay for restrictive NATs/firewalls
 * (mobile/CGNAT, corporate WiFi). PeerJS's free public TURN is best-effort and
 * unreliable, so provide your own:
 *
 *   - Build-time (recommended, applies to GM + all players):
 *       VITE_TURN_URLS        comma-separated, e.g. "turns:turn.example.com:443?transport=tcp"
 *       VITE_TURN_USERNAME
 *       VITE_TURN_CREDENTIAL
 *   - Per-device override (testing): localStorage["shadowdark:ice-servers"] = JSON RTCIceServer[]
 *
 * When nothing is configured, returns undefined so PeerJS uses its own defaults
 * (Google STUN + free PeerJS TURN) — i.e. behaviour is unchanged until you set TURN.
 */

const GOOGLE_STUN = 'stun:stun.l.google.com:19302'
export const ICE_OVERRIDE_KEY = 'shadowdark:ice-servers'

export interface IceConfigInput {
  turnUrls?: string
  turnUsername?: string
  turnCredential?: string
  override?: string
}

/** Pure builder — see getPeerOptions for the env/localStorage wiring. */
export function buildIceServers(opts: IceConfigInput): RTCIceServer[] | null {
  if (opts.override) {
    try {
      const parsed = JSON.parse(opts.override)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as RTCIceServer[]
    } catch {
      // fall through to env-based config
    }
  }

  const turnUrls = (opts.turnUrls ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (turnUrls.length === 0) return null

  return [
    { urls: GOOGLE_STUN },
    { urls: turnUrls, username: opts.turnUsername, credential: opts.turnCredential },
  ]
}

/**
 * PeerJS options with a custom ICE config, or undefined to use PeerJS defaults.
 * Use for both `new Peer(id, getPeerOptions())` and `new Peer(undefined, getPeerOptions())`.
 */
export function getPeerOptions(): PeerOptions | undefined {
  const env = import.meta.env as Record<string, string | undefined>
  const override = typeof localStorage !== 'undefined'
    ? localStorage.getItem(ICE_OVERRIDE_KEY) ?? undefined
    : undefined

  const servers = buildIceServers({
    turnUrls: env.VITE_TURN_URLS,
    turnUsername: env.VITE_TURN_USERNAME,
    turnCredential: env.VITE_TURN_CREDENTIAL,
    override,
  })

  return servers ? { config: { iceServers: servers } } : undefined
}
