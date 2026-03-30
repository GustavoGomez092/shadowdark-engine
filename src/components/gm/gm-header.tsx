import { Link, useMatches } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSessionStore } from '@/stores/session-store.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'

const NAV_ITEMS = [
  { label: 'Overview', href: '/gm/session/$sessionId', icon: '🏠', matchEnd: true },
  { label: 'Characters', href: '/gm/characters', icon: '⚔️', matchEnd: false },
  { label: 'Monsters', href: '/gm/monsters', icon: '🐉', matchEnd: false },
  { label: 'Stores', href: '/gm/stores', icon: '🏪', matchEnd: false },
  { label: 'Reference', href: '/gm/tables', icon: '📖', matchEnd: false },
  { label: 'Settings', href: '/gm/settings', icon: '⚙️', matchEnd: false },
]

export function GMHeader() {
  const session = useSessionStore(s => s.session)
  const [roomCode, setRoomCode] = useState(gmPeer.roomCode)
  const [isReady, setIsReady] = useState(gmPeer.isReady)

  // Player count from session store (source of truth for connected status)
  const connectedCount = session ? Object.values(session.players).filter(p => p.isConnected).length : 0

  // Poll singleton for room code and ready status
  useEffect(() => {
    const interval = setInterval(() => {
      setRoomCode(gmPeer.roomCode)
      setIsReady(gmPeer.isReady)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? ''

  if (!session) return null

  const sessionId = session.room.id

  function isActive(href: string) {
    if (href.includes('$sessionId')) {
      const resolved = href.replace('$sessionId', sessionId)
      return currentPath === resolved
    }
    return currentPath.startsWith(href)
  }

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 py-3">
        {/* Top row: title + room info */}
        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{session.room.name}</h1>
            <p className="text-xs text-muted-foreground">GM Dashboard</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CopyBadge label="Room Code" value={roomCode ?? session.room.gmPeerId ?? '...'} className="text-primary" />
            {session.room.password && (
              <CopyBadge label="Password" value={session.room.password} className="text-amber-400" />
            )}
            <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-center">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Players</div>
              <div className="text-sm font-bold">{connectedCount}</div>
            </div>
            <div className={`h-2.5 w-2.5 rounded-full ${isReady ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
          </div>
        </div>

        {/* Nav row */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {NAV_ITEMS.map(item => {
            const href = item.href.includes('$sessionId')
              ? item.href.replace('$sessionId', sessionId)
              : item.href
            const active = isActive(item.href)

            return (
              <Link
                key={item.label}
                to={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CopyBadge({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg border border-border bg-card px-3 py-1.5 text-center hover:border-primary/40 transition"
      title={`Copy ${label.toLowerCase()}`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-xs font-bold uppercase ${className}`}>
        {copied ? <span className="text-green-400">Copied!</span> : value}
      </div>
    </button>
  )
}
