import { useState, useEffect } from 'react'

export interface RollToastData {
  id: string
  playerName: string
  diceType: string
  total: number
  isNat20: boolean
  isNat1: boolean
  timestamp: number
}

const TOAST_DURATION = 4000

// Global toast state — shared across all instances
let toasts: RollToastData[] = []
let listeners: Set<() => void> = new Set()

function notify() {
  listeners.forEach(fn => fn())
}

export function pushRollToast(toast: RollToastData) {
  toasts = [toast, ...toasts].slice(0, 5)
  notify()
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== toast.id)
    notify()
  }, TOAST_DURATION)
}

export function RollToastContainer() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick(t => t + 1)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
            toast.isNat20 ? 'border-green-500/40 bg-green-500/15' :
            toast.isNat1 ? 'border-red-500/40 bg-red-500/15' :
            'border-border bg-card/95'
          }`}
          style={{ minWidth: 220 }}
        >
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold tabular-nums ${
              toast.isNat20 ? 'text-green-400' : toast.isNat1 ? 'text-red-400' : 'text-primary'
            }`}>
              {toast.total}
            </div>
            <div>
              <div className="text-sm font-semibold">{toast.playerName}</div>
              <div className="text-xs text-muted-foreground">{toast.diceType}</div>
              {toast.isNat20 && <div className="text-[10px] font-bold text-green-400 uppercase">Natural 20!</div>}
              {toast.isNat1 && <div className="text-[10px] font-bold text-red-400 uppercase">Natural 1!</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
