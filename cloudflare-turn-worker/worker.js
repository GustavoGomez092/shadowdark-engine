/**
 * Cloudflare Worker — mints short-lived TURN credentials for the ShadowDark
 * Engine peers. The secret TURN API token lives here (as a Worker secret), never
 * in the static site. The app fetches this endpoint and gets back:
 *
 *   { "iceServers": [ { urls: [...], username, credential }, ... ] }
 *
 * Config (set with wrangler):
 *   - var    TURN_KEY_ID     your Cloudflare Realtime TURN key id
 *   - secret TURN_API_TOKEN  the TURN key's API token  (wrangler secret put TURN_API_TOKEN)
 *   - var    ALLOW_ORIGINS   comma-separated allowed origins, or "*"  (e.g. https://you.github.io)
 *   - var    TURN_TTL        credential lifetime in seconds (default 86400)
 */
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowed = (env.ALLOW_ORIGINS || '*').split(',').map((s) => s.trim())
    const allowOrigin = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : (allowed[0] || '')
    const cors = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })

    try {
      const ttl = Number(env.TURN_TTL || 86400)
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttl }),
        },
      )
      if (!res.ok) {
        return json({ error: 'turn_generate_failed', status: res.status }, 502, cors)
      }
      const data = await res.json() // { iceServers: { urls, username, credential } }
      const ice = data.iceServers
      const iceServers = Array.isArray(ice) ? ice : [ice]
      return json({ iceServers }, 200, { ...cors, 'Cache-Control': 'no-store' })
    } catch {
      return json({ error: 'worker_error' }, 500, cors)
    }
  },
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
