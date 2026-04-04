import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useCallback } from 'react'
import { useSessionStore } from '@/stores/session-store.ts'
import { Spinner } from '@/components/shared/spinner.tsx'
import { exportSession, getExportFilename, downloadJson, parseSessionImport } from '@/lib/storage/session-export.ts'
import { useLocale } from '@/hooks/use-locale.ts'

export const Route = createFileRoute('/gm/create')({
  component: CreateGamePage,
})

function CreateGamePage() {
  const { t, ti } = useLocale()
  const navigate = useNavigate()
  const createSession = useSessionStore(s => s.createSession)
  const loadSession = useSessionStore(s => s.loadSession)
  const getSavedSessions = useSessionStore(s => s.getSavedSessions)
  const deleteSession = useSessionStore(s => s.deleteSession)
  const importSession = useSessionStore(s => s.importSession)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [savedSessions, setSavedSessions] = useState(() => getSavedSessions())

  // Import state
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)

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

  function handleExport(id: string, sessionName: string) {
    // Load from localStorage directly
    const raw = localStorage.getItem(`shadowdark:session:${id}`)
    if (!raw) return
    const session = JSON.parse(raw)
    const json = exportSession(session)
    downloadJson(json, getExportFilename(sessionName))
  }

  function processImportFile(file: File) {
    setImportError(null)
    setImportSuccess(null)

    const reader = new FileReader()
    reader.onload = () => {
      const result = parseSessionImport(reader.result as string)
      if (!result.valid || !result.session) {
        setImportError(result.error ?? t('gm.failedToImport'))
        return
      }
      const newId = importSession(result.session)
      setSavedSessions(getSavedSessions())
      const packMsg = result.packsInstalled ? ` (${result.packsInstalled} data pack${result.packsInstalled !== 1 ? 's' : ''} installed)` : ''
      setImportSuccess(ti('gm.importedSession', { name: result.session.room.name, packMsg }))
      setTimeout(() => setImportSuccess(null), 5000)
      if (fileRef.current) fileRef.current.value = ''
      void newId // used for index registration
    }
    reader.readAsText(file)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processImportFile(file)
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.json')) processImportFile(file)
    else if (file) setImportError(t('common.onlyJsonSupported'))
  }, [])

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">{t('gm.createNewGame')}</h1>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">{t('gm.sessionName')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('gm.sessionNamePlaceholder')}
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
          <label htmlFor="use-password" className="text-sm">{t('gm.passwordProtect')}</label>
        </div>

        {usePassword && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold">{t('gm.roomPassword')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('gm.roomPasswordPlaceholder')}
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
          {isCreating ? t('gm.creating') : t('gm.createGame')}
        </button>
      </div>

      {/* Saved Sessions */}
      {savedSessions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">{t('gm.resumePreviousSession')}</h2>
          <div className="space-y-2">
            {savedSessions
              .sort((a, b) => b.lastPlayed - a.lastPlayed)
              .map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ti('gm.lastPlayed', { date: new Date(s.lastPlayed).toLocaleDateString() })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport(s.id, s.name)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent"
                      title={t('gm.exportSession')}
                    >
                      {t('common.export')}
                    </button>
                    <button
                      onClick={() => handleLoad(s.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      {t('common.resume')}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Import Session */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold">{t('gm.importSession')}</h2>

        {importError && (
          <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="mb-3 rounded-lg bg-green-500/10 border border-green-500/20 p-2.5 text-xs text-green-400">
            {importSuccess}
          </div>
        )}

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <label className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed py-8 transition ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.02]'
              : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }`}>
            <div className="text-center pointer-events-none">
              <div className="text-2xl mb-1">{isDragging ? '\u2193' : '\u2191'}</div>
              <p className="text-sm font-medium">{isDragging ? t('common.dropToImport') : t('gm.importSessionFile')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('common.dragDropOrBrowse')}</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </main>
  )
}
