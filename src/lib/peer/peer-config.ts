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
 * Synchronous PeerJS options from static env / localStorage override, or
 * undefined. Prefer resolvePeerOptions() which also supports a credential
 * endpoint (e.g. a Cloudflare Worker minting short-lived TURN creds).
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

/** Normalize a credential endpoint's JSON into an RTCIceServer[] (or null). */
export function parseIceResponse(json: unknown): RTCIceServer[] | null {
  if (!json || typeof json !== 'object') return null
  const ice = (json as { iceServers?: unknown }).iceServers
  if (!ice) return null
  const arr = Array.isArray(ice) ? ice : [ice]
  return arr.length > 0 ? (arr as RTCIceServer[]) : null
}

const CACHE_MS = 12 * 60 * 60 * 1000 // refetch creds at most twice/day
let iceCache: { servers: RTCIceServer[]; expiresAt: number } | null = null

/** Clear the in-memory ICE cache (tests). */
export function resetIceCache(): void { iceCache = null }

/**
 * Fetch ICE servers from a credential endpoint (a Cloudflare Worker that mints
 * short-lived TURN creds). Cached in-memory; returns null on any failure so the
 * caller can fall back to PeerJS defaults rather than block connecting.
 */
export async function fetchIceServers(
  url: string,
  fetchFn: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<RTCIceServer[] | null> {
  if (iceCache && iceCache.expiresAt > now()) return iceCache.servers
  try {
    const res = await fetchFn(url)
    if (!res.ok) return null
    const servers = parseIceResponse(await res.json())
    if (!servers) return null
    iceCache = { servers, expiresAt: now() + CACHE_MS }
    return servers
  } catch {
    return null
  }
}

/**
 * Resolve PeerJS options for both peers. Static env/localStorage config wins
 * (no network); otherwise fetch from VITE_ICE_SERVERS_URL if set; otherwise
 * undefined (PeerJS defaults). Always resolves — never throws.
 */
export async function resolvePeerOptions(): Promise<PeerOptions | undefined> {
  const sync = getPeerOptions()
  if (sync) return sync

  const url = (import.meta.env as Record<string, string | undefined>).VITE_ICE_SERVERS_URL
  if (!url) return undefined

  const servers = await fetchIceServers(url)
  return servers ? { config: { iceServers: servers } } : undefined
}
