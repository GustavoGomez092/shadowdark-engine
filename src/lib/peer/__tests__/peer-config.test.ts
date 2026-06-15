import { describe, it, expect, beforeEach } from 'vitest'
import { buildIceServers, parseIceResponse, fetchIceServers, resetIceCache } from '../peer-config.ts'

describe('parseIceResponse', () => {
  it('wraps a single iceServers object into an array', () => {
    const r = parseIceResponse({ iceServers: { urls: ['turn:t:3478'], username: 'u', credential: 'c' } })
    expect(r).toEqual([{ urls: ['turn:t:3478'], username: 'u', credential: 'c' }])
  })

  it('passes an iceServers array through', () => {
    const arr = [{ urls: 'stun:s:3478' }, { urls: ['turn:t:3478'], username: 'u', credential: 'c' }]
    expect(parseIceResponse({ iceServers: arr })).toEqual(arr)
  })

  it('returns null for missing/empty/invalid shapes', () => {
    expect(parseIceResponse({})).toBeNull()
    expect(parseIceResponse({ iceServers: [] })).toBeNull()
    expect(parseIceResponse(null)).toBeNull()
    expect(parseIceResponse('nope')).toBeNull()
  })
})

describe('fetchIceServers', () => {
  beforeEach(() => resetIceCache())

  it('fetches and parses ICE servers from an endpoint', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ iceServers: [{ urls: 'turn:t:3478' }] }) }) as unknown as Response
    expect(await fetchIceServers('https://worker.example/', fakeFetch)).toEqual([{ urls: 'turn:t:3478' }])
  })

  it('returns null when the endpoint errors (so PeerJS defaults are used)', async () => {
    const failFetch = async () => ({ ok: false, status: 502, json: async () => ({}) }) as unknown as Response
    expect(await fetchIceServers('https://worker.example/', failFetch)).toBeNull()
    const throwFetch = async () => { throw new Error('network') }
    expect(await fetchIceServers('https://worker.example/', throwFetch)).toBeNull()
  })
})

describe('buildIceServers', () => {
  it('returns null when nothing is configured (use PeerJS defaults)', () => {
    expect(buildIceServers({})).toBeNull()
    expect(buildIceServers({ turnUrls: '' })).toBeNull()
  })

  it('builds STUN + TURN from env-style fields', () => {
    const servers = buildIceServers({
      turnUrls: 'turn:turn.example.com:443?transport=tcp',
      turnUsername: 'user',
      turnCredential: 'secret',
    })
    expect(servers).toEqual([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: ['turn:turn.example.com:443?transport=tcp'], username: 'user', credential: 'secret' },
    ])
  })

  it('supports multiple comma-separated TURN urls', () => {
    const servers = buildIceServers({
      turnUrls: 'turn:a.example.com:3478, turns:a.example.com:443',
      turnUsername: 'u',
      turnCredential: 'c',
    })!
    expect(servers[1].urls).toEqual(['turn:a.example.com:3478', 'turns:a.example.com:443'])
  })

  it('lets a JSON override replace everything (per-device testing)', () => {
    const override = JSON.stringify([{ urls: 'turn:custom:3478', username: 'x', credential: 'y' }])
    expect(buildIceServers({ turnUrls: 'turn:ignored', override })).toEqual([
      { urls: 'turn:custom:3478', username: 'x', credential: 'y' },
    ])
  })

  it('ignores a malformed override and falls back to env', () => {
    const servers = buildIceServers({ turnUrls: 'turn:t.example.com:3478', turnUsername: 'u', turnCredential: 'c', override: 'not json' })
    expect(servers).toHaveLength(2)
    expect(servers![1].urls).toEqual(['turn:t.example.com:3478'])
  })
})
