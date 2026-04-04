import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useCallback } from 'react'
import { useSessionStore } from '@/stores/session-store.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'
import { DataPackManager } from '@/components/gm/data-pack-manager.tsx'
import { AISettingsPanel } from '@/components/ai/ai-settings.tsx'
import { exportSession, getExportFilename, downloadJson, parseSessionImport } from '@/lib/storage/session-export.ts'

export const Route = createFileRoute('/gm/settings')({
  component: GMSettingsPage,
})

function GMSettingsPage() {
  const navigate = useNavigate()
  const session = useSessionStore(s => s.session)
  const endSession = useSessionStore(s => s.endSession)

  const [torchMin, setTorchMin] = useState(session?.settings?.torchDurationMinutes ?? 60)
  const [lanternMin, setLanternMin] = useState(session?.settings?.lanternDurationMinutes ?? 60)
  const [campfireMin, setCampfireMin] = useState(session?.settings?.campfireDurationMinutes ?? 480)
  const [showPackMonstersFirst, setShowPackMonstersFirst] = useState(session?.settings?.showPackMonstersFirst ?? false)
  const [showPackItemsFirst, setShowPackItemsFirst] = useState(session?.settings?.showPackItemsFirst ?? false)
  const [saved, setSaved] = useState(false)

  function saveSettings() {
    const store = useSessionStore.getState()
    if (!store.session) return
    store.session.settings = {
      torchDurationMinutes: torchMin,
      lanternDurationMinutes: lanternMin,
      campfireDurationMinutes: campfireMin,
      showPackMonstersFirst,
      showPackItemsFirst,
    }
    store.saveNow()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setTimeout(() => gmPeer.broadcastStateSync(), 50)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Settings</h1>

      {/* Session Info */}
      {session && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Session Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{session.room.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Room ID:</span><span className="font-mono text-xs">{session.room.id}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created:</span><span>{new Date(session.room.createdAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Characters:</span><span>{Object.keys(session.characters).length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Players:</span><span>{Object.keys(session.players).length}</span></div>
          </div>
        </div>
      )}

      {/* Light Duration Settings */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 font-semibold">Light Source Durations</h2>
        <p className="mb-4 text-xs text-muted-foreground">Customize how long light sources last. Default is 1 hour real time for torches and lanterns. Lower values for faster-paced games.</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm">
              <span>🔥 Torch Duration</span>
              <span className="font-mono text-xs text-muted-foreground">{torchMin} min ({Math.round(torchMin / 60 * 10) / 10}h)</span>
            </label>
            <input
              type="range"
              min={1}
              max={120}
              value={torchMin}
              onChange={e => setTorchMin(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>1 min</span>
              <div className="flex gap-2">
                {[5, 10, 15, 30, 60].map(v => (
                  <button key={v} onClick={() => setTorchMin(v)}
                    className={`rounded px-1.5 py-0.5 transition ${torchMin === v ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}
                  >{v}m</button>
                ))}
              </div>
              <span>2h</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm">
              <span>🏮 Lantern Duration (per oil)</span>
              <span className="font-mono text-xs text-muted-foreground">{lanternMin} min ({Math.round(lanternMin / 60 * 10) / 10}h)</span>
            </label>
            <input
              type="range"
              min={1}
              max={120}
              value={lanternMin}
              onChange={e => setLanternMin(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>1 min</span>
              <div className="flex gap-2">
                {[5, 10, 15, 30, 60].map(v => (
                  <button key={v} onClick={() => setLanternMin(v)}
                    className={`rounded px-1.5 py-0.5 transition ${lanternMin === v ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}
                  >{v}m</button>
                ))}
              </div>
              <span>2h</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm">
              <span>🔥 Campfire Duration</span>
              <span className="font-mono text-xs text-muted-foreground">{campfireMin} min ({Math.round(campfireMin / 60 * 10) / 10}h)</span>
            </label>
            <input
              type="range"
              min={10}
              max={480}
              step={10}
              value={campfireMin}
              onChange={e => setCampfireMin(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>10 min</span>
              <div className="flex gap-2">
                {[30, 60, 120, 240, 480].map(v => (
                  <button key={v} onClick={() => setCampfireMin(v)}
                    className={`rounded px-1.5 py-0.5 transition ${campfireMin === v ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}
                  >{v >= 60 ? `${v/60}h` : `${v}m`}</button>
                ))}
              </div>
              <span>8h</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveSettings}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Save Settings
          </button>
          {saved && <span className="text-xs text-green-400">Saved!</span>}
        </div>
      </div>

      {/* Data Packs */}
      <div className="mb-6">
        <DataPackManager />
      </div>

      {/* Data Pack Display */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 font-semibold">Data Pack Display</h2>
        <p className="mb-4 text-xs text-muted-foreground">Control how data pack content appears in lists throughout the app.</p>

        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={showPackMonstersFirst}
              onChange={e => setShowPackMonstersFirst(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span>Show pack monsters first in lists</span>
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={showPackItemsFirst}
              onChange={e => setShowPackItemsFirst(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span>Show pack items first in lists</span>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveSettings}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Save Settings
          </button>
          {saved && <span className="text-xs text-green-400">Saved!</span>}
        </div>
      </div>

      {/* AI Settings */}
      <div className="mb-6">
        <AISettingsPanel />
      </div>

      {/* Session Backup */}
      {session && <SessionBackupCard session={session} />}

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-red-400">End Session</h2>
            <p className="text-xs text-muted-foreground">Save and close this session. You can resume it later from the create screen.</p>
          </div>
          <button
            onClick={() => {
              gmPeer.destroy()
              endSession()
              navigate({ to: '/gm/create' })
            }}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            End Session
          </button>
        </div>
      </div>
    </main>
  )
}

function SessionBackupCard({ session }: { session: import('@/schemas/session.ts').SessionState }) {
  const importSessionFn = useSessionStore(s => s.importSession)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const json = exportSession(session)
    downloadJson(json, getExportFilename(session.room.name))
  }

  function processImportFile(file: File) {
    setImportError(null)
    setImportSuccess(null)
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseSessionImport(reader.result as string)
      if (!result.valid || !result.session) {
        setImportError(result.error ?? 'Failed to import')
        return
      }
      importSessionFn(result.session)
      setImportSuccess(`Imported "${result.session.room.name}" — available in saved sessions`)
      setTimeout(() => setImportSuccess(null), 5000)
      if (fileRef.current) fileRef.current.value = ''
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
    else if (file) setImportError('Only .json files are supported')
  }, [])

  // Estimate file size
  const sizeEstimate = Math.ceil(JSON.stringify(session).length / 1024)

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="mb-1 font-semibold">Session Backup</h2>
      <p className="mb-4 text-xs text-muted-foreground">Export this session as a JSON file for backup or sharing. Import sessions from other devices.</p>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleExport}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          Export Current Session
        </button>
        <span className="text-xs text-muted-foreground">~{sizeEstimate} KB</span>
      </div>

      {importError && (
        <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">{importError}</div>
      )}
      {importSuccess && (
        <div className="mb-3 rounded-lg bg-green-500/10 border border-green-500/20 p-2.5 text-xs text-green-400">{importSuccess}</div>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <label className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed py-4 transition ${
          isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-accent/50'
        }`}>
          <div className="text-center pointer-events-none">
            <p className="text-sm font-medium">{isDragging ? 'Drop to import' : 'Import Session'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Drag & drop or click to browse (.json)</p>
          </div>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>
    </div>
  )
}
