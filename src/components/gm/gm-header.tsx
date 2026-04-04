import { Link, useMatches } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSessionStore } from '@/stores/session-store.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { LOCALE_LABELS } from '@/i18n/index.ts'

const NAV_ITEMS = [
  { key: 'nav.overview', href: '/gm/session/$sessionId', icon: '\u{1F3E0}', matchEnd: true },
  { key: 'nav.characters', href: '/gm/characters', icon: '\u{2694}\u{FE0F}', matchEnd: false },
  { key: 'nav.monsters', href: '/gm/monsters', icon: '\u{1F409}', matchEnd: false },
  { key: 'nav.stores', href: '/gm/stores', icon: '\u{1F3EA}', matchEnd: false },
  { key: 'nav.reference', href: '/gm/tables', icon: '\u{1F4D6}', matchEnd: false },
  { key: 'nav.settings', href: '/gm/settings', icon: '\u{2699}\u{FE0F}', matchEnd: false },
  { key: 'nav.sessions', href: '/gm/create', icon: '\u{1F4BE}', matchEnd: false },
]

export function GMHeader() {
  const { t, locale, setLocale, availableLocales } = useLocale()
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

  if (!session) {
    return (
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">ShadowDark Engine</h1>
              <p className="text-xs text-muted-foreground">{t('nav.noActiveSession')}</p>
            </div>
            <Link to="/gm/create" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              {t('nav.sessions')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
            <p className="text-xs text-muted-foreground">{t('nav.gmDashboard')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CopyBadge label={t('nav.roomCode')} value={roomCode ?? session.room.gmPeerId ?? '...'} className="text-primary" />
            {session.room.password && (
              <CopyBadge label={t('nav.password')} value={session.room.password} className="text-amber-400" />
            )}
            <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-center">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t('nav.players')}</div>
              <div className="text-sm font-bold">{connectedCount}</div>
            </div>
            <select
              value={locale}
              onChange={e => setLocale(e.target.value as typeof locale)}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none"
            >
              {availableLocales.map(l => (
                <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
              ))}
            </select>
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
                key={item.key}
                to={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <span>{item.icon}</span>
                {t(item.key)}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CopyBadge({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  const { t } = useLocale()
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
        {copied ? <span className="text-green-400">{t('common.copied')}</span> : value}
      </div>
    </button>
  )
}
