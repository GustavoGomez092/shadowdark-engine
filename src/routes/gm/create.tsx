import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSessionStore } from '@/stores/session-store.ts'
import { Spinner } from '@/components/shared/spinner.tsx'

export const Route = createFileRoute('/gm/create')({
  component: CreateGamePage,
})

function CreateGamePage() {
  const navigate = useNavigate()
  const createSession = useSessionStore(s => s.createSession)
  const loadSession = useSessionStore(s => s.loadSession)
  const getSavedSessions = useSessionStore(s => s.getSavedSessions)
  const deleteSession = useSessionStore(s => s.deleteSession)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [savedSessions, setSavedSessions] = useState(() => getSavedSessions())

  function handleCreate() {
    if (!name.trim()) return
    setIsCreating(true)
    const session = createSession(name.trim(), usePassword ? password : undefined)
    setTimeout(() => navigate({ to: '/gm/session/$sessionId', params: { sessionId: session.room.id } }), 50)
  }

  function handleLoad(id: string) {
    const success = loadSession(id)
    if (success) {
      navigate({ to: '/gm/session/$sessionId', params: { sessionId: id } })
    }
  }

  function handleDelete(id: string) {
    deleteSession(id)
    setSavedSessions(getSavedSessions())
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Create New Game</h1>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Session Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., The Lost Citadel"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use-password"
            checked={usePassword}
            onChange={e => setUsePassword(e.target.checked)}
            className="rounded border-input"
          />
          <label htmlFor="use-password" className="text-sm">Password protect this room</label>
        </div>

        {usePassword && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Room Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
        >
          {isCreating && <Spinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" />}
          {isCreating ? 'Creating...' : 'Create Game'}
        </button>
      </div>

      {savedSessions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Resume Previous Session</h2>
          <div className="space-y-2">
            {savedSessions
              .sort((a, b) => b.lastPlayed - a.lastPlayed)
              .map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Last played: {new Date(s.lastPlayed).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoad(s.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </main>
  )
}
