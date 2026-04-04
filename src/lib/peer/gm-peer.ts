import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import type { PlayerToGMMessage, GMToPlayerMessage, P2PMessageEnvelope } from '@/schemas/messages.ts'
import type { PlayerVisibleState } from '@/schemas/session.ts'
import { generateId, generateRoomCode } from '@/lib/utils/id.ts'

export interface ConnectedPeer {
  peerId: string
  connection: DataConnection
  displayName: string
  characterId?: string
  isAuthenticated: boolean
  joinedAt: number
}

export interface GMPeerCallbacks {
  onPlayerJoin: (peerId: string, displayName: string, password?: string, existingCharacterId?: string) => { success: boolean; error?: string; characterId?: string }
  onPlayerMessage: (peerId: string, message: PlayerToGMMessage) => void
  onPlayerDisconnect: (peerId: string) => void
  getPlayerState: (peerId: string) => PlayerVisibleState | null
}

export class GMPeerHost {
  private peer: Peer | null = null
  private connections: Map<string, ConnectedPeer> = new Map()
  private callbacks: GMPeerCallbacks
  private seq = 0
  private _roomCode: string | null = null
  private _isReady = false

  constructor(callbacks: GMPeerCallbacks) {
    this.callbacks = callbacks
  }

  get roomCode() { return this._roomCode }
  get isReady() { return this._isReady }
  get connectedPlayers(): ConnectedPeer[] { return Array.from(this.connections.values()) }

  async start(existingRoomCode?: string): Promise<string> {
    const tryConnect = (roomCode: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        this.peer = new Peer(roomCode)

        this.peer.on('open', (id) => {
          this._roomCode = id
          this._isReady = true
          this.setupListeners()
          resolve(id)
        })

        this.peer.on('error', (err: { type?: string }) => {
          console.error('[GM Peer] Error:', err)
          reject(err)
        })
      })
    }

    // Try existing room code first, fall back to new one if taken
    if (existingRoomCode) {
      try {
        return await tryConnect(existingRoomCode)
      } catch (err: unknown) {
        const peerErr = err as { type?: string }
        if (peerErr.type === 'unavailable-id') {
          console.warn('[GM Peer] Old room code taken, generating new one')
          this.peer?.destroy()
          const newCode = `sd-${generateRoomCode()}`
          return await tryConnect(newCode)
        }
        throw err
      }
    }

    return await tryConnect(`sd-${generateRoomCode()}`)
  }

  private setupListeners() {
    if (!this.peer) return

    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        console.log('[GM Peer] New connection:', conn.peer)
      })

      conn.on('data', (rawData) => {
        try {
          const envelope = rawData as P2PMessageEnvelope
          const message = envelope.payload as PlayerToGMMessage

          if (message.type === 'join_room') {
            this.handleJoinRequest(conn, message)
          } else if (message.type === 'player_ping') {
            this.sendTo(conn.peer, {
              type: 'pong',
              originalSentAt: message.sentAt,
              respondedAt: Date.now(),
            })
          } else {
            // Only accept messages from authenticated peers
            const peer = this.connections.get(conn.peer)
            if (peer?.isAuthenticated) {
              this.callbacks.onPlayerMessage(conn.peer, message)
            }
          }
        } catch (err) {
          console.error('[GM Peer] Bad message from', conn.peer, err)
        }
      })

      conn.on('close', () => {
        console.log('[GM Peer] Connection closed:', conn.peer)
        this.connections.delete(conn.peer)
        this.callbacks.onPlayerDisconnect(conn.peer)
      })

      conn.on('error', (err) => {
        console.error('[GM Peer] Connection error:', conn.peer, err)
      })
    })
  }

  private handleJoinRequest(conn: DataConnection, message: PlayerToGMMessage & { type: 'join_room' }) {
    const result = this.callbacks.onPlayerJoin(
      conn.peer,
      message.displayName,
      message.password,
      message.existingCharacterId,
    )

    if (result.success) {
      const connectedPeer: ConnectedPeer = {
        peerId: conn.peer,
        connection: conn,
        displayName: message.displayName,
        characterId: result.characterId,
        isAuthenticated: true,
        joinedAt: Date.now(),
      }
      this.connections.set(conn.peer, connectedPeer)

      // Send join response with initial state
      const state = this.callbacks.getPlayerState(conn.peer)
      this.sendTo(conn.peer, {
        type: 'join_room_response',
        success: true,
        initialState: state ?? undefined,
        assignedCharacterId: result.characterId,
      })
    } else {
      this.sendTo(conn.peer, {
        type: 'join_room_response',
        success: false,
        error: result.error as 'wrong_password' | 'room_full' | 'name_taken',
      })
      // Close connection after rejection
      setTimeout(() => conn.close(), 500)
    }
  }

  sendTo(peerId: string, message: GMToPlayerMessage) {
    const peer = this.connections.get(peerId)
    if (!peer?.connection.open) return

    const envelope: P2PMessageEnvelope = {
      id: generateId(),
      timestamp: Date.now(),
      senderId: this._roomCode ?? 'gm',
      type: message.type,
      payload: message,
      seq: this.seq++,
    }

    try {
      peer.connection.send(envelope)
    } catch (err) {
      console.error('[GM Peer] Failed to send to', peerId, err)
    }
  }

  broadcast(message: GMToPlayerMessage) {
    for (const [peerId, peer] of this.connections) {
      if (peer.isAuthenticated) {
        this.sendTo(peerId, message)
      }
    }
  }

  broadcastStateSync() {
    for (const [peerId, peer] of this.connections) {
      if (!peer.isAuthenticated) continue
      const state = this.callbacks.getPlayerState(peerId)
      if (state) {
        this.sendTo(peerId, {
          type: 'state_sync',
          state,
          serverTime: Date.now(),
        })
      }
    }
  }

  kick(peerId: string, reason: string) {
    this.sendTo(peerId, { type: 'force_disconnect', reason })
    const peer = this.connections.get(peerId)
    if (peer) {
      setTimeout(() => peer.connection.close(), 300)
      this.connections.delete(peerId)
    }
  }

  /**
   * Rotate the room code: broadcast the new code to all players,
   * then create a new peer with the new code. Players auto-reconnect.
   */
  async rotateRoomCode(): Promise<string> {
    const newCode = `sd-${generateRoomCode()}`
    console.log(`[GM Peer] Rotating room code: ${this._roomCode} → ${newCode}`)

    // 1. Broadcast the new code to all connected players BEFORE destroying
    this.broadcast({ type: 'room_code_changed', newRoomCode: newCode })

    // 2. Wait briefly so messages can be delivered
    await new Promise(resolve => setTimeout(resolve, 500))

    // 3. Close all current connections and destroy old peer
    for (const peer of this.connections.values()) {
      peer.connection.close()
    }
    this.connections.clear()
    this._isReady = false
    this.peer?.destroy()
    this.peer = null

    // 4. Create new peer with new code
    return new Promise((resolve, reject) => {
      this.peer = new Peer(newCode)
      this.peer.on('open', (id) => {
        this._roomCode = id
        this._isReady = true
        this.setupListeners()
        console.log(`[GM Peer] Room code rotated successfully to ${id}`)
        resolve(id)
      })
      this.peer.on('error', (err: { type?: string }) => {
        console.error('[GM Peer] Rotation error:', err)
        reject(err)
      })
    })
  }

  destroy() {
    for (const peer of this.connections.values()) {
      peer.connection.close()
    }
    this.connections.clear()
    this.peer?.destroy()
    this.peer = null
    this._roomCode = null
    this._isReady = false
  }
}
