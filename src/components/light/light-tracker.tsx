import { useState, useEffect } from 'react'
import type { LightState } from '@/schemas/light.ts'
import type { LightSourceType } from '@/schemas/light.ts'
import { getRemainingMs } from '@/lib/rules/light.ts'
import { formatDuration } from '@/lib/utils/time.ts'

interface Props {
  lightState: LightState
  onAddLight: (type: LightSourceType, carrierId: string) => void
  onPauseAll: () => void
  onResumeAll: () => void
  onRemoveTimer: (timerId: string) => void
  isGM: boolean
}

export function LightTracker({ lightState, onAddLight, onPauseAll, onResumeAll, onRemoveTimer, isGM }: Props) {
  const [, setTick] = useState(0)

  // Tick every second for countdown display
  useEffect(() => {
    if (lightState.isPaused) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [lightState.isPaused])

  const activeTimers = lightState.timers.filter(t => t.isActive && !t.isExpired)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Light Sources</h2>
          {lightState.isInDarkness && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase animate-pulse">
              Darkness
            </span>
          )}
        </div>
        {isGM && (
          <div className="flex gap-2">
            {lightState.isPaused ? (
              <button onClick={onResumeAll} className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Resume
              </button>
            ) : (
              <button onClick={onPauseAll} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent">
                Pause
              </button>
            )}
          </div>
        )}
      </div>

      {activeTimers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {lightState.isInDarkness ? 'Total darkness! Disadvantage on most tasks.' : 'No active light sources.'}
        </p>
      ) : (
        <div className="space-y-2">
          {activeTimers.map(timer => {
            const remaining = getRemainingMs(timer)
            const percent = (remaining / timer.durationMs) * 100
            const isLow = percent < 20

            return (
              <div key={timer.id} className="flex items-center gap-3">
                <span className="text-base">{timer.type === 'torch' ? '🔥' : timer.type === 'lantern' ? '🏮' : timer.type === 'campfire' ? '🔥' : '✨'}</span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="capitalize">{timer.type}</span>
                    <span className={`font-mono text-xs ${isLow ? 'text-red-400 animate-pulse' : 'text-muted-foreground'}`}>
                      {formatDuration(remaining)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                    <div
                      className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                {isGM && (
                  <button onClick={() => onRemoveTimer(timer.id)} className="text-xs text-muted-foreground hover:text-red-400">
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isGM && false && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          {([['torch', '🔥 Torch'], ['lantern', '🏮 Lantern'], ['campfire', '🔥 Campfire']] as const).map(([type, label]) => (
            <button
              key={type}
              onClick={() => onAddLight(type, 'party')}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
