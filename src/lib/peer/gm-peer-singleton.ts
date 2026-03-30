import { GMPeerHost } from './gm-peer.ts'
import type { GMPeerCallbacks, ConnectedPeer } from './gm-peer.ts'
import type { GMToPlayerMessage } from '@/schemas/messages.ts'

/**
 * Singleton manager for the GM peer host.
 * Survives React component unmounts/route changes.
 */
class GMPeerManager {
  private host: GMPeerHost | null = null
  private _roomCode: string | null = null
  private _isReady = false
  private _playerCount = 0
  private callbacks: GMPeerCallbacks | null = null
  private listeners: {
    onReady?: (code: string) => void
    onPlayerCountChange?: (count: number) => void
  } = {}

  get roomCode() { return this._roomCode }
  get isReady() { return this._isReady }
  get playerCount() { return this._playerCount }
  get connectedPlayers(): ConnectedPeer[] { return this.host?.connectedPlayers ?? [] }

  setCallbacks(cb: GMPeerCallbacks) {
    this.callbacks = cb
  }

  setListeners(l: typeof this.listeners) {
    this.listeners = l
  }

  async start(existingRoomCode?: string): Promise<string> {
    // Already running with same code — skip
    if (this.host && this._isReady && this._roomCode) {
      if (!existingRoomCode || existingRoomCode === this._roomCode) {
        return this._roomCode
      }
    }

    // Destroy previous if exists
    this.host?.destroy()

    if (!this.callbacks) throw new Error('GM peer callbacks not set')

    this.host = new GMPeerHost({
      onPlayerJoin: (...args) => {
        const result = this.callbacks!.onPlayerJoin(...args)
        if (result.success) {
          this._playerCount = this.host?.connectedPlayers.length ?? 0
          this.listeners.onPlayerCountChange?.(this._playerCount)
        }
        return result
      },
      onPlayerMessage: (...args) => this.callbacks!.onPlayerMessage(...args),
      onPlayerDisconnect: (...args) => {
        this.callbacks!.onPlayerDisconnect(...args)
        this._playerCount = this.host?.connectedPlayers.length ?? 0
        this.listeners.onPlayerCountChange?.(this._playerCount)
      },
      getPlayerState: (...args) => this.callbacks!.getPlayerState(...args),
    })

    const code = await this.host.start(existingRoomCode)
    this._roomCode = code
    this._isReady = true
    this.listeners.onReady?.(code)
    return code
  }

  broadcast(message: GMToPlayerMessage) {
    this.host?.broadcast(message)
  }

  broadcastStateSync() {
    this.host?.broadcastStateSync()
  }

  kick(peerId: string, reason: string) {
    this.host?.kick(peerId, reason)
    this._playerCount = this.host?.connectedPlayers.length ?? 0
    this.listeners.onPlayerCountChange?.(this._playerCount)
  }

  destroy() {
    this.host?.destroy()
    this.host = null
    this._roomCode = null
    this._isReady = false
    this._playerCount = 0
  }
}

export const gmPeer = new GMPeerManager()
