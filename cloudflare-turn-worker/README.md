# ShadowDark TURN credential Worker

A tiny Cloudflare Worker that mints **short-lived TURN credentials** for the
peer-to-peer connection, so players on different networks (mobile, corporate
WiFi, CGNAT) can connect reliably. The secret API token stays in the Worker;
the static site only ever sees disposable credentials.

## 1. Get your Cloudflare TURN key

Cloudflare dashboard → **Realtime** → **TURN** → create a TURN app. You get:

- a **TURN Key ID** (identifier, goes in `wrangler.toml`)
- a **TURN API Token** (secret — used to mint credentials)

## 2. Configure & deploy

```bash
cd cloudflare-turn-worker
npm i -g wrangler        # if needed
wrangler login

# edit wrangler.toml: set TURN_KEY_ID and ALLOW_ORIGINS (your site origin)
wrangler secret put TURN_API_TOKEN   # paste the TURN API token when prompted

wrangler deploy
```

Deploy prints your Worker URL, e.g. `https://shadowdark-turn.<account>.workers.dev`.

Quick check (should return `{ "iceServers": [ ... ] }`):

```bash
curl https://shadowdark-turn.<account>.workers.dev
```

## 3. Point the app at it

Set this env var **at build time** for the site (e.g. in the GitHub Pages
build/Action), then rebuild & redeploy:

```
VITE_ICE_SERVERS_URL=https://shadowdark-turn.<account>.workers.dev
```

That's it. On connect, the GM and every player fetch fresh ICE servers from the
Worker. If the Worker is ever unreachable, the app falls back to PeerJS's
default servers rather than failing outright.

> Per-device testing without a rebuild: set
> `localStorage["shadowdark:ice-servers"]` to a JSON `RTCIceServer[]` in the
> browser console — it overrides everything for that browser.
