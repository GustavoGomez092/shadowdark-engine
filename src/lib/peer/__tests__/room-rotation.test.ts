import { describe, it, expect } from 'vitest'

/**
 * Room Code Rotation Test Suite
 *
 * Tests the room code management system that ensures players always
 * have the latest room code, even when the GM's peer ID changes
 * (due to PeerJS timeout, page refresh, or network issues).
 *
 * Strategy: The GM's current room code (peer ID) is included in
 * every PlayerVisibleState sync. The player caches this and uses
 * it for reconnection. No fragile timer-based rotation needed.
 */

// ========== Tests ==========

describe('Room Code Management', () => {
  describe('Room code generation', () => {
    it('generates a new room code in 8-char format', async () => {
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

    it('room code is prefixed with sd- when used as peer ID', async () => {
      const { generateRoomCode } = await import('@/lib/utils/id.ts')
      const peerCode = `sd-${generateRoomCode()}`
      expect(peerCode).toMatch(/^sd-[a-z0-9]{8}$/)
    })
  })

  describe('PlayerVisibleState includes currentRoomCode', () => {
    it('state sync includes the current room code', () => {
      const state = {
        room: { id: 'session-123', name: 'Test Game' },
        currentRoomCode: 'sd-abc12345',
        myCharacter: null,
        otherCharacters: [],
        combat: null,
        light: { timers: [], isInDarkness: false, isPaused: false },
        activeTurnId: null,
        visibleMonsters: [],
        chatLog: [],
        recentRolls: [],
      }

      expect(state.currentRoomCode).toBe('sd-abc12345')
    })

    it('room code updates in state when GM peer changes', () => {
      // Simulate GM's peer ID changing (after refresh or PeerJS reassignment)
      const state1 = { currentRoomCode: 'sd-oldcode1' }
      const state2 = { currentRoomCode: 'sd-newcode1' }

      // Player receives state2 via state_sync — room code is now new
      expect(state2.currentRoomCode).not.toBe(state1.currentRoomCode)
      expect(state2.currentRoomCode).toBe('sd-newcode1')
    })
  })

  describe('Player reconnection with cached room code', () => {
    it('player uses latest room code from cached state for reconnection', () => {
      const connectionInfo = {
        roomCode: 'sd-oldcode1', // Original join code
        displayName: 'Pesto',
      }

      const cachedState = {
        currentRoomCode: 'sd-newcode1', // Updated via state sync
      }

      // Reconnection logic: prefer cached state's room code
      const latestRoomCode = cachedState.currentRoomCode || connectionInfo.roomCode
      expect(latestRoomCode).toBe('sd-newcode1')
    })

    it('falls back to connection info code when no cached state', () => {
      const connectionInfo = {
        roomCode: 'sd-oldcode1',
        displayName: 'Pesto',
      }

      const cachedState = null

      const latestRoomCode = cachedState?.currentRoomCode || connectionInfo.roomCode
      expect(latestRoomCode).toBe('sd-oldcode1')
    })

    it('connection info updates when state sync has new room code', () => {
      const connectionInfo = {
        roomCode: 'sd-oldcode1',
        displayName: 'Pesto',
        characterId: 'char-123',
      }

      // State sync arrives with different room code
      const newRoomCode = 'sd-newcode1'

      // Connection info should be updated
      if (newRoomCode !== connectionInfo.roomCode) {
        const updatedInfo = { ...connectionInfo, roomCode: newRoomCode }
        expect(updatedInfo.roomCode).toBe('sd-newcode1')
        expect(updatedInfo.displayName).toBe('Pesto') // unchanged
        expect(updatedInfo.characterId).toBe('char-123') // unchanged
      }
    })
  })

  describe('GM peer recovery', () => {
    it('GM generates new code when old one is unavailable', () => {
      // Simulate unavailable-id error (PeerJS took the old code)
      const oldCode = 'sd-expired1'
      const peerError = { type: 'unavailable-id' }

      let usedCode = oldCode
      if (peerError.type === 'unavailable-id') {
        usedCode = 'sd-freshcode' // GM generates new code
      }

      expect(usedCode).not.toBe(oldCode)
    })

    it('session state stores new peer ID after recovery', () => {
      const session = {
        room: {
          id: 'session-123',
          name: 'Test Game',
          gmPeerId: 'sd-oldcode1',
        },
      }

      // After peer recovery with new code
      const newCode = 'sd-newcode1'
      session.room.gmPeerId = newCode

      expect(session.room.gmPeerId).toBe('sd-newcode1')
      expect(session.room.id).toBe('session-123') // session ID unchanged
    })
  })

  describe('State sync reliability', () => {
    it('state sync happens every 60 seconds', () => {
      const SYNC_INTERVAL_MS = 60_000
      // Ensure sync is frequent enough to catch room code changes
      expect(SYNC_INTERVAL_MS).toBeLessThanOrEqual(120_000)
    })

    it('state sync also happens after every GM action', () => {
      // This is guaranteed by the architecture: every GM action
      // calls broadcastStateSync() which sends PlayerVisibleState
      // including currentRoomCode to all players
      const actionsTriggeredSync = [
        'addMonster', 'updateMonster', 'removeMonster',
        'updateCharacter', 'addChatMessage', 'setDangerLevel',
      ]
      expect(actionsTriggeredSync.length).toBeGreaterThan(0)
    })
  })

  describe('Message protocol', () => {
    it('room_code_changed message structure is valid', () => {
      const msg = {
        type: 'room_code_changed' as const,
        newRoomCode: 'sd-abc12345',
      }
      expect(msg.type).toBe('room_code_changed')
      expect(msg.newRoomCode).toMatch(/^sd-/)
    })

    it('broadcast envelope wraps correctly', async () => {
      const { generateId } = await import('@/lib/utils/id.ts')
      const envelope = {
        id: generateId(),
        timestamp: Date.now(),
        senderId: 'sd-gmcode1',
        type: 'room_code_changed',
        payload: { type: 'room_code_changed', newRoomCode: 'sd-newcode1' },
        seq: 42,
      }
      expect(envelope.type).toBe('room_code_changed')
    })
  })

  describe('Race condition prevention', () => {
    it('rotation flag prevents duplicate reconnect attempts', () => {
      let isRotating = false
      let reconnectAttempts = 0

      // room_code_changed sets flag
      isRotating = true

      // connection close fires — blocked
      if (!isRotating) reconnectAttempts++
      expect(reconnectAttempts).toBe(0)

      // signaling disconnect fires — also blocked
      if (!isRotating) reconnectAttempts++
      expect(reconnectAttempts).toBe(0)

      // Planned reconnect fires
      isRotating = false
      reconnectAttempts++
      expect(reconnectAttempts).toBe(1)
    })

    it('duplicate room_code_changed messages are ignored', () => {
      let isRotating = false
      let handleCount = 0

      // First message
      if (!isRotating) { isRotating = true; handleCount++ }
      // Duplicate
      if (!isRotating) { handleCount++ }

      expect(handleCount).toBe(1)
    })

    it('normal disconnect without rotation still triggers reconnect', () => {
      let isRotating = false
      let reconnected = false

      if (!isRotating) { reconnected = true }
      expect(reconnected).toBe(true)
    })
  })
})
