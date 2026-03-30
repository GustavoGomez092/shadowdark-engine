import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { usePlayerPeer } from '@/hooks/use-peer-connection.ts'
import { usePlayerStore } from '@/stores/player-store.ts'
import { Spinner } from '@/components/shared/spinner.tsx'
import type { PlayerVisibleState } from '@/schemas/session.ts'
import type { GMToPlayerMessage } from '@/schemas/messages.ts'

export const Route = createFileRoute('/player/join')({
  component: JoinGamePage,
})

function JoinGamePage() {
  const navigate = useNavigate()
  const setPlayerState = usePlayerStore(s => s.setState)
  const setDisplayName = usePlayerStore(s => s.setDisplayName)
  const saveConnectionInfo = usePlayerStore(s => s.saveConnectionInfo)

  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const handleStateSync = (state: PlayerVisibleState) => {
    setPlayerState(state)
  }

  const handleMessage = (_message: GMToPlayerMessage) => {
    // Handle additional messages as features are built
  }

  const { isConnected, isJoined, error, connect } = usePlayerPeer({
    onStateSync: handleStateSync,
    onMessage: handleMessage,
  })

  async function handleJoin() {
    if (!roomCode.trim() || !name.trim()) return
    setIsConnecting(true)
    try {
      const code = roomCode.trim().toLowerCase()
      setDisplayName(name.trim())
      saveConnectionInfo({
        roomCode: code,
        displayName: name.trim(),
        password: password || undefined,
      })
      await connect(code, name.trim(), password || undefined)
      // Do NOT clear isConnecting here — wait for join response
    } catch {
      setIsConnecting(false)
    }
  }

  // Clear connecting state on error
  useEffect(() => {
    if (error) setIsConnecting(false)
  }, [error])

  // Navigate once joined
  useEffect(() => {
    if (isJoined) {
      navigate({ to: '/player/session' })
    }
  }, [isJoined, navigate])

  // Full-screen connecting overlay
  if (isConnecting || (isConnected && !isJoined)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Spinner size="lg" />
        <p className="text-lg font-semibold">
          {isConnected ? 'Joining session...' : 'Connecting to room...'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isConnected ? 'Waiting for GM to accept' : `Room code: ${roomCode}`}
        </p>
        {error && (
          <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <button
          onClick={() => {
            setIsConnecting(false)
          }}
          className="mt-4 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
        >
          Cancel
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Join Game</h1>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Room Code</label>
          <input
            type="text"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter room code..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-lg tracking-wider outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            maxLength={30}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Password <span className="text-muted-foreground font-normal">(if required)</span></label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Room password..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={!roomCode.trim() || !name.trim() || isConnecting}
          className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
        >
          Join Game
        </button>
      </div>
    </main>
  )
}
