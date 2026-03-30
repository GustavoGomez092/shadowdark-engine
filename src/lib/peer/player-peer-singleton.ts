import { PlayerPeerClient } from './player-peer.ts'
import type { PlayerPeerCallbacks } from './player-peer.ts'
import type { PlayerVisibleState } from '@/schemas/session.ts'
import type { GMToPlayerMessage } from '@/schemas/messages.ts'

type Listener = {
  onStateSync?: (state: PlayerVisibleState) => void
  onMessage?: (message: GMToPlayerMessage) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: string) => void
  onJoinResponse?: (success: boolean, error?: string, state?: PlayerVisibleState, characterId?: string) => void
}

/**
 * Singleton manager for the player peer connection.
 * Survives React component unmounts/route changes.
 */
class PlayerPeerManager {
  private client: PlayerPeerClient | null = null
  private listeners: Listener = {}
  private _isConnected = false
  private _isJoined = false
  private _error: string | null = null

  get isConnected() { return this._isConnected }
  get isJoined() { return this._isJoined }
  get error() { return this._error }

  setListeners(l: Listener) {
    this.listeners = l
  }

  async connect(roomCode: string, displayName: string, password?: string, existingCharacterId?: string) {
    // Destroy previous client if any
    this.client?.destroy()
    this._error = null
    this._isConnected = false
    this._isJoined = false

    const callbacks: PlayerPeerCallbacks = {
      onConnected: () => {
        this._isConnected = true
        this.listeners.onConnected?.()
      },
      onDisconnected: () => {
        this._isConnected = false
        this._isJoined = false
        this.listeners.onDisconnected?.()
      },
      onJoinResponse: (success, error, state, charId) => {
        if (success) {
          this._isJoined = true
          if (state) this.listeners.onStateSync?.(state)
        } else {
          this._error = error ?? 'Join failed'
        }
        this.listeners.onJoinResponse?.(success, error, state, charId)
      },
      onStateSync: (state) => {
        this.listeners.onStateSync?.(state)
      },
      onMessage: (message) => {
        this.listeners.onMessage?.(message)
      },
      onError: (error) => {
        this._error = error
        this.listeners.onError?.(error)
      },
    }

    this.client = new PlayerPeerClient(callbacks)
    await this.client.connect(roomCode, displayName, password, existingCharacterId)
  }

  send(message: Parameters<PlayerPeerClient['send']>[0]) {
    this.client?.send(message)
  }

  destroy() {
    this.client?.destroy()
    this.client = null
    this._isConnected = false
    this._isJoined = false
    this._error = null
  }
}

// Global singleton
export const playerPeer = new PlayerPeerManager()
