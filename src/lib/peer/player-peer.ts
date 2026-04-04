import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import type { PlayerToGMMessage, GMToPlayerMessage, P2PMessageEnvelope } from '@/schemas/messages.ts'
import type { PlayerVisibleState } from '@/schemas/session.ts'
import { generateId } from '@/lib/utils/id.ts'

export interface PlayerPeerCallbacks {
  onConnected: () => void
  onDisconnected: () => void
  onJoinResponse: (success: boolean, error?: string, state?: PlayerVisibleState, characterId?: string) => void
  onStateSync: (state: PlayerVisibleState) => void
  onMessage: (message: GMToPlayerMessage) => void
  onError: (error: string) => void
  onRoomCodeChanged?: (newRoomCode: string) => void
}

export class PlayerPeerClient {
  private peer: Peer | null = null
  private connection: DataConnection | null = null
  private callbacks: PlayerPeerCallbacks
  private seq = 0
  private _isConnected = false
  private _peerId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private roomCode: string | null = null
  private _isRotating = false  // Guard against race condition during room code rotation
  private displayName: string | null = null
  private password: string | undefined
  private existingCharacterId: string | undefined

  constructor(callbacks: PlayerPeerCallbacks) {
    this.callbacks = callbacks
  }

  get isConnected() { return this._isConnected }
  get peerId() { return this._peerId }

  async connect(roomCode: string, displayName: string, password?: string, existingCharacterId?: string): Promise<void> {
    this.roomCode = roomCode
    this.displayName = displayName
    this.password = password
    this.existingCharacterId = existingCharacterId

    return new Promise((resolve, reject) => {
      this.peer = new Peer()

      this.peer.on('open', (id) => {
        this._peerId = id
        this.connectToRoom(roomCode)
        resolve()
      })

      this.peer.on('error', (err) => {
        console.error('[Player Peer] Error:', err)
        this.callbacks.onError(err.message ?? 'Connection error')
        reject(err)
      })

      this.peer.on('disconnected', () => {
        console.log('[Player Peer] Disconnected from signaling')
        this._isConnected = false
        this.callbacks.onDisconnected()
        // If rotating, the room_code_changed handler manages reconnection
        if (this._isRotating) {
          console.log('[Player Peer] Room rotation in progress, skipping signaling reconnect')
          return
        }
        this.attemptReconnect()
      })
    })
  }

  private connectToRoom(roomCode: string) {
    if (!this.peer) return

    this.connection = this.peer.connect(roomCode, { reliable: true })

    this.connection.on('open', () => {
      console.log('[Player Peer] Connected to GM')
      this._isConnected = true
      this.reconnectAttempts = 0
      this.dataReconnectAttempts = 0
      this.callbacks.onConnected()

      // Send join request
      this.send({
        type: 'join_room',
        displayName: this.displayName!,
        password: this.password,
        existingCharacterId: this.existingCharacterId,
      })
    })

    this.connection.on('data', (rawData) => {
      try {
        const envelope = rawData as P2PMessageEnvelope
        const message = envelope.payload as GMToPlayerMessage
        this.handleMessage(message)
      } catch (err) {
        console.error('[Player Peer] Bad message:', err)
      }
    })

    this.connection.on('close', () => {
      console.log('[Player Peer] Connection closed')
      this._isConnected = false
      this.callbacks.onDisconnected()
      // If rotating, the room_code_changed handler is managing reconnection — don't race
      if (this._isRotating) {
        console.log('[Player Peer] Room rotation in progress, skipping auto-reconnect')
        return
      }
      // GM likely refreshed — try reconnecting the data connection
      this.attemptDataReconnect()
    })

    this.connection.on('error', (err) => {
      console.error('[Player Peer] Connection error:', err)
    })
  }

  private handleMessage(message: GMToPlayerMessage) {
    switch (message.type) {
      case 'join_room_response':
        this.callbacks.onJoinResponse(
          message.success,
          message.error,
          message.initialState,
          message.assignedCharacterId,
        )
        break
      case 'state_sync':
        this.callbacks.onStateSync(message.state)
        break
      case 'force_disconnect':
        this.callbacks.onError(`Disconnected: ${message.reason}`)
        this.destroy()
        break
      case 'room_code_changed':
        // Ignore duplicate broadcasts (GM sends twice for reliability)
        if (this._isRotating) {
          console.log('[Player Peer] Ignoring duplicate room_code_changed')
          break
        }
        console.log(`[Player Peer] Room code rotating to: ${message.newRoomCode}`)
        this._isRotating = true  // Prevent all auto-reconnect handlers from racing
        this.roomCode = message.newRoomCode
        this.callbacks.onRoomCodeChanged?.(message.newRoomCode)
        // Close current connection
        this.connection?.close()
        this._isConnected = false
        // Wait for GM to finish destroying old peer + creating new peer, then reconnect
        // 3s total: 500ms GM broadcast delay + ~1-2s peer creation
        setTimeout(() => {
          this._isRotating = false
          this.reconnectAttempts = 0
          this.dataReconnectAttempts = 0
          // Recreate our own Peer if it got disconnected/destroyed during rotation
          if (!this.peer || this.peer.destroyed || this.peer.disconnected) {
            console.log('[Player Peer] Recreating Peer for rotation reconnect')
            this.peer?.destroy()
            this.peer = new Peer()
            this.peer.on('open', () => {
              console.log('[Player Peer] New Peer ready, connecting to rotated room')
              this.connectToRoom(message.newRoomCode)
            })
            this.peer.on('error', (err) => {
              console.error('[Player Peer] Peer recreation error:', err)
              this.callbacks.onError('Failed to reconnect after room rotation')
            })
            this.peer.on('disconnected', () => {
              if (!this._isRotating) {
                this.callbacks.onDisconnected()
                this.attemptReconnect()
              }
            })
          } else {
            this.connectToRoom(message.newRoomCode)
          }
        }, 3000)
        break
      default:
        this.callbacks.onMessage(message)
        break
    }
  }

  send(message: PlayerToGMMessage) {
    if (!this.connection?.open) {
      console.warn('[Player Peer] Cannot send, not connected')
      return
    }

    const envelope: P2PMessageEnvelope = {
      id: generateId(),
      timestamp: Date.now(),
      senderId: this._peerId ?? 'unknown',
      type: message.type,
      payload: message,
      seq: this.seq++,
    }

    try {
      this.connection.send(envelope)
    } catch (err) {
      console.error('[Player Peer] Send failed:', err)
    }
  }

  private dataReconnectAttempts = 0
  private maxDataReconnectAttempts = 10

  private attemptDataReconnect() {
    if (this.dataReconnectAttempts >= this.maxDataReconnectAttempts) {
      this.callbacks.onError('GM appears to be offline. Try rejoining.')
      return
    }

    this.dataReconnectAttempts++
    // Wait longer for GM to come back (they might be refreshing)
    const delay = Math.min(2000 * this.dataReconnectAttempts, 15000)

    console.log(`[Player Peer] Data reconnect in ${delay}ms (attempt ${this.dataReconnectAttempts})`)
    setTimeout(() => {
      if (!this.roomCode || !this.peer || this.peer.destroyed) return
      if (this._isConnected) return // already reconnected

      console.log('[Player Peer] Attempting data reconnect to', this.roomCode)
      this.connectToRoom(this.roomCode)
    }, delay)
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.callbacks.onError('Failed to reconnect after multiple attempts')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    console.log(`[Player Peer] Signaling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
    setTimeout(() => {
      if (this.roomCode && this.peer && !this.peer.destroyed) {
        this.connectToRoom(this.roomCode)
      }
    }, delay)
  }

  destroy() {
    this.connection?.close()
    this.peer?.destroy()
    this.connection = null
    this.peer = null
    this._isConnected = false
    this._peerId = null
  }
}
