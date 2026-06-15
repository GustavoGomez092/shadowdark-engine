import { describe, it, expect } from 'vitest'
import { buildIceServers } from '../peer-config.ts'

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
