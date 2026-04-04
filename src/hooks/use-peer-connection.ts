import { useState, useCallback, useRef, useEffect } from 'react'
import type { GMPeerCallbacks } from '@/lib/peer/gm-peer.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'
import { playerPeer } from '@/lib/peer/player-peer-singleton.ts'
import type { PlayerVisibleState } from '@/schemas/session.ts'
import type { PlayerToGMMessage, GMToPlayerMessage } from '@/schemas/messages.ts'

// ========== GM Hook (uses singleton — survives route changes) ==========

interface UseGMPeerOptions {
  onPlayerJoin: GMPeerCallbacks['onPlayerJoin']
  onPlayerMessage: (peerId: string, message: PlayerToGMMessage) => void
  onPlayerDisconnect: (peerId: string) => void
  getPlayerState: (peerId: string) => PlayerVisibleState | null
}

export function useGMPeer(options: UseGMPeerOptions) {
  const [roomCode, setRoomCode] = useState<string | null>(gmPeer.roomCode)
  const [isReady, setIsReady] = useState(gmPeer.isReady)
  const [playerCount, setPlayerCount] = useState(gmPeer.playerCount)

  // Keep callbacks up to date
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    gmPeer.setCallbacks({
      onPlayerJoin: (...args) => optionsRef.current.onPlayerJoin(...args),
      onPlayerMessage: (...args) => optionsRef.current.onPlayerMessage(...args),
      onPlayerDisconnect: (...args) => optionsRef.current.onPlayerDisconnect(...args),
      getPlayerState: (...args) => optionsRef.current.getPlayerState(...args),
    })
    gmPeer.setListeners({
      onReady: (code) => { setRoomCode(code); setIsReady(true) },
      onPlayerCountChange: (count) => setPlayerCount(count),
    })

    // Sync current state in case singleton is already running
    if (gmPeer.isReady) {
      setRoomCode(gmPeer.roomCode)
      setIsReady(true)
      setPlayerCount(gmPeer.playerCount)
    }
  }, [])

  const start = useCallback(async (existingRoomCode?: string) => {
    const code = await gmPeer.start(existingRoomCode)
    setRoomCode(code)
    setIsReady(true)
    return code
  }, [])

  const broadcast = useCallback((message: GMToPlayerMessage) => {
    gmPeer.broadcast(message)
  }, [])

  const broadcastStateSync = useCallback(() => {
    gmPeer.broadcastStateSync()
  }, [])

  const kick = useCallback((peerId: string, reason: string) => {
    gmPeer.kick(peerId, reason)
    setPlayerCount(gmPeer.playerCount)
  }, [])

  const destroy = useCallback(() => {
    gmPeer.destroy()
    setRoomCode(null)
    setIsReady(false)
    setPlayerCount(0)
  }, [])

  // Do NOT destroy on unmount — singleton persists across routes

  return { roomCode, isReady, playerCount, start, broadcast, broadcastStateSync, kick, destroy }
}

// ========== Player Hook (uses singleton — survives route changes) ==========

interface UsePlayerPeerOptions {
  onStateSync: (state: PlayerVisibleState) => void
  onMessage: (message: GMToPlayerMessage) => void
}

export function usePlayerPeer(options: UsePlayerPeerOptions & { onRoomCodeChanged?: (newRoomCode: string) => void }) {
  const [isConnected, setIsConnected] = useState(playerPeer.isConnected)
  const [isJoined, setIsJoined] = useState(playerPeer.isJoined)
  const [error, setError] = useState<string | null>(playerPeer.error)

  // Keep listeners up to date with current callback refs
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    playerPeer.setListeners({
      onConnected: () => setIsConnected(true),
      onDisconnected: () => {
        setIsConnected(false)
        setIsJoined(false)
      },
      onJoinResponse: (success, err, state, _charId) => {
        if (success) {
          setIsJoined(true)
          if (state) optionsRef.current.onStateSync(state)
        } else {
          setError(err ?? 'Join failed')
        }
      },
      onStateSync: (state) => optionsRef.current.onStateSync(state),
      onMessage: (msg) => optionsRef.current.onMessage(msg),
      onError: (err) => setError(err),
      onRoomCodeChanged: (newRoomCode) => optionsRef.current.onRoomCodeChanged?.(newRoomCode),
    })
  }, [])

  const connect = useCallback(async (roomCode: string, displayName: string, password?: string, existingCharacterId?: string) => {
    setError(null)
    await playerPeer.connect(roomCode, displayName, password, existingCharacterId)
  }, [])

  const send = useCallback((message: PlayerToGMMessage) => {
    playerPeer.send(message)
  }, [])

  const disconnect = useCallback(() => {
    playerPeer.destroy()
    setIsConnected(false)
    setIsJoined(false)
  }, [])

  // Do NOT destroy on unmount — singleton persists across routes

  return { isConnected, isJoined, error, connect, send, disconnect }
}
