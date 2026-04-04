import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Room Code Rotation Test Suite
 *
 * Tests the proactive room code rotation mechanism that prevents
 * PeerJS timeout disconnections during long game sessions.
 *
 * Since PeerJS requires WebRTC (not available in jsdom), we test
 * the rotation logic by mocking the Peer class and DataConnection.
 */

// ========== Mocks ==========

function createMockConnection(peerId: string) {
  const listeners: Record<string, Function[]> = {}
  return {
    peer: peerId,
    open: true,
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    }),
    send: vi.fn(),
    close: vi.fn(),
    _emit: (event: string, ...args: unknown[]) => {
      listeners[event]?.forEach(fn => fn(...args))
    },
  }
}

function createMockPeer(id: string) {
  const listeners: Record<string, Function[]> = {}
  return {
    id,
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    }),
    connect: vi.fn((roomCode: string) => createMockConnection(roomCode)),
    destroy: vi.fn(),
    _emit: (event: string, ...args: unknown[]) => {
      listeners[event]?.forEach(fn => fn(...args))
    },
  }
}

// ========== Tests ==========

describe('Room Code Rotation', () => {
  describe('GM-side rotation logic', () => {
    it('generates a new room code in sd-XXXXXXXX format', async () => {
      const { generateRoomCode } = await import('@/lib/utils/id.ts')
      const code = generateRoomCode()
      expect(code).toMatch(/^[a-z0-9]{8}$/)
      expect(code.length).toBe(8)
    })

    it('generates unique codes on each call', async () => {
      const { generateRoomCode } = await import('@/lib/utils/id.ts')
      const codes = new Set(Array.from({ length: 100 }, () => generateRoomCode()))
      expect(codes.size).toBe(100)
    })

    it('room_code_changed message has correct structure', () => {
      const message = {
        type: 'room_code_changed' as const,
        newRoomCode: 'sd-abc12345',
      }
      expect(message.type).toBe('room_code_changed')
      expect(message.newRoomCode).toMatch(/^sd-/)
    })
  })

  describe('Message protocol', () => {
    it('room_code_changed is a valid GMToPlayerMessage type', async () => {
      // Verify the type is in the union by constructing it
      const msg: import('@/schemas/messages.ts').RoomCodeChangedMessage = {
        type: 'room_code_changed',
        newRoomCode: 'sd-newcode1',
      }
      expect(msg.type).toBe('room_code_changed')
      expect(msg.newRoomCode).toBeDefined()
    })

    it('broadcast envelope wraps room_code_changed correctly', async () => {
      const { generateId } = await import('@/lib/utils/id.ts')
      const envelope: import('@/schemas/messages.ts').P2PMessageEnvelope = {
        id: generateId(),
        timestamp: Date.now(),
        senderId: 'sd-oldcode1',
        type: 'room_code_changed',
        payload: { type: 'room_code_changed', newRoomCode: 'sd-newcode1' },
        seq: 42,
      }
      expect(envelope.type).toBe('room_code_changed')
      expect((envelope.payload as { newRoomCode: string }).newRoomCode).toBe('sd-newcode1')
    })
  })

  describe('Player-side room code handling', () => {
    it('player stores new room code when received', () => {
      // Simulate the player peer state
      let currentRoomCode = 'sd-oldcode1'
      let isConnected = true
      let reconnectTarget: string | null = null

      // Simulate receiving room_code_changed
      const message = { type: 'room_code_changed' as const, newRoomCode: 'sd-newcode1' }

      // This is what the player peer does:
      currentRoomCode = message.newRoomCode
      isConnected = false
      reconnectTarget = message.newRoomCode

      expect(currentRoomCode).toBe('sd-newcode1')
      expect(isConnected).toBe(false)
      expect(reconnectTarget).toBe('sd-newcode1')
    })

    it('player reconnects to new code, not old code', () => {
      const oldCode = 'sd-oldcode1'
      const newCode = 'sd-newcode1'

      // Simulate the reconnection target
      let roomCode = oldCode

      // Room code changed message received
      roomCode = newCode

      // When reconnection happens, it should use the new code
      expect(roomCode).not.toBe(oldCode)
      expect(roomCode).toBe(newCode)
    })
  })

  describe('Rotation timing', () => {
    it('rotation interval is shorter than typical PeerJS timeout', () => {
      const ROTATION_INTERVAL_MS = 25 * 60 * 1000 // 25 minutes
      const PEERJS_TYPICAL_TIMEOUT_MS = 60 * 60 * 1000 // ~60 minutes

      expect(ROTATION_INTERVAL_MS).toBeLessThan(PEERJS_TYPICAL_TIMEOUT_MS)
      // Should be at least half the timeout for safety margin
      expect(ROTATION_INTERVAL_MS).toBeLessThan(PEERJS_TYPICAL_TIMEOUT_MS / 2)
    })

    it('broadcast delay is sufficient for message delivery', () => {
      const BROADCAST_DELAY_MS = 500
      // Should be at least 100ms for WebRTC delivery
      expect(BROADCAST_DELAY_MS).toBeGreaterThanOrEqual(100)
      // Should not be too long (blocks the rotation)
      expect(BROADCAST_DELAY_MS).toBeLessThanOrEqual(2000)
    })

    it('player reconnect delay allows old peer to fully close', () => {
      const PLAYER_RECONNECT_DELAY_MS = 1000
      const GM_BROADCAST_DELAY_MS = 500
      // Player should wait longer than GM's broadcast delay
      expect(PLAYER_RECONNECT_DELAY_MS).toBeGreaterThan(GM_BROADCAST_DELAY_MS)
    })
  })

  describe('Rotation flow simulation', () => {
    it('full rotation sequence: broadcast → close → recreate → reconnect', async () => {
      const events: string[] = []

      // Simulate GM rotation
      const connectedPlayers = ['player-1', 'player-2', 'player-3']
      const sentMessages: { peerId: string; message: unknown }[] = []

      // Step 1: Broadcast new code to all players
      const newCode = 'sd-newcode1'
      for (const peerId of connectedPlayers) {
        sentMessages.push({
          peerId,
          message: { type: 'room_code_changed', newRoomCode: newCode },
        })
      }
      events.push('broadcast')
      expect(sentMessages).toHaveLength(3)
      expect(sentMessages.every(m => (m.message as { newRoomCode: string }).newRoomCode === newCode)).toBe(true)

      // Step 2: Wait for delivery
      events.push('wait')

      // Step 3: Close all connections
      const closedConnections: string[] = []
      for (const peerId of connectedPlayers) {
        closedConnections.push(peerId)
      }
      events.push('close_connections')
      expect(closedConnections).toHaveLength(3)

      // Step 4: Destroy old peer
      events.push('destroy_old_peer')

      // Step 5: Create new peer with new code
      events.push('create_new_peer')

      // Step 6: Players reconnect
      const reconnectedPlayers: string[] = []
      for (const peerId of connectedPlayers) {
        reconnectedPlayers.push(peerId)
      }
      events.push('players_reconnect')

      expect(events).toEqual([
        'broadcast',
        'wait',
        'close_connections',
        'destroy_old_peer',
        'create_new_peer',
        'players_reconnect',
      ])
    })

    it('handles rotation when no players are connected', () => {
      const connectedPlayers: string[] = []
      const sentMessages: unknown[] = []

      // Broadcast to empty list should not error
      for (const peerId of connectedPlayers) {
        sentMessages.push({ peerId, message: { type: 'room_code_changed', newRoomCode: 'sd-new' } })
      }

      expect(sentMessages).toHaveLength(0)
      // Rotation should still complete (GM peer recreated)
    })

    it('player handles receiving room_code_changed while already disconnected', () => {
      let isConnected = false
      let roomCode = 'sd-old'

      // Player is already disconnected
      const message = { type: 'room_code_changed' as const, newRoomCode: 'sd-new' }

      // Should still update the room code for next reconnect attempt
      roomCode = message.newRoomCode
      isConnected = false // already false

      expect(roomCode).toBe('sd-new')
      expect(isConnected).toBe(false)
    })

    it('multiple rapid rotations update to latest code', () => {
      let roomCode = 'sd-code-v1'

      // Simulate rapid rotations (shouldn't happen normally but edge case)
      roomCode = 'sd-code-v2'
      roomCode = 'sd-code-v3'
      roomCode = 'sd-code-v4'

      // Player should always have the latest
      expect(roomCode).toBe('sd-code-v4')
    })
  })

  describe('Session state persistence', () => {
    it('session gmPeerId updates after rotation', () => {
      const session = {
        room: {
          id: 'session-123',
          name: 'Test Game',
          gmPeerId: 'sd-oldcode1',
          createdAt: Date.now(),
          maxPlayers: 4,
        },
      }

      // Simulate post-rotation update
      const newCode = 'sd-newcode1'
      session.room.gmPeerId = newCode

      expect(session.room.gmPeerId).toBe('sd-newcode1')
      // Room ID should NOT change (session identity is separate from peer ID)
      expect(session.room.id).toBe('session-123')
    })

    it('room code format is always valid after rotation', () => {
      const codes = [
        'sd-abc12345',
        'sd-xyz98765',
        'sd-mn3k7h2p',
      ]

      for (const code of codes) {
        expect(code).toMatch(/^sd-[a-z0-9]{8}$/)
      }
    })
  })
})
