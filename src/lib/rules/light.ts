import type { LightTimer, LightState } from '@/schemas/light.ts'
import { LIGHT_DURATIONS, LIGHT_RANGES } from '@/schemas/light.ts'
import type { LightSourceType } from '@/schemas/light.ts'
import { generateId } from '@/lib/utils/id.ts'

export function createLightTimer(type: LightSourceType, carrierId: string, customDurationMs?: number): LightTimer {
  return {
    id: generateId(),
    type,
    carrierId,
    range: LIGHT_RANGES[type],
    startedAt: Date.now(),
    durationMs: customDurationMs ?? LIGHT_DURATIONS[type],
    accumulatedPauseMs: 0,
    isActive: true,
    isExpired: false,
  }
}

export function getRemainingMs(timer: LightTimer): number {
  if (!timer.isActive || timer.isExpired) return 0
  const now = timer.pausedAt ?? Date.now()
  const elapsed = now - timer.startedAt - timer.accumulatedPauseMs
  return Math.max(0, timer.durationMs - elapsed)
}

export function isTimerExpired(timer: LightTimer): boolean {
  return getRemainingMs(timer) <= 0
}

export function pauseTimer(timer: LightTimer): LightTimer {
  if (timer.pausedAt || !timer.isActive) return timer
  return { ...timer, pausedAt: Date.now() }
}

export function resumeTimer(timer: LightTimer): LightTimer {
  if (!timer.pausedAt) return timer
  const pauseDuration = Date.now() - timer.pausedAt
  return {
    ...timer,
    pausedAt: undefined,
    accumulatedPauseMs: timer.accumulatedPauseMs + pauseDuration,
  }
}

export function tickLightState(state: LightState): LightState {
  const timers = state.timers.map(t => {
    if (!t.isActive || t.isExpired || t.pausedAt) return t
    if (isTimerExpired(t)) {
      return { ...t, isActive: false, isExpired: true }
    }
    return t
  })

  const hasActiveLight = timers.some(t => t.isActive && !t.isExpired)

  return {
    ...state,
    timers,
    isInDarkness: !hasActiveLight,
  }
}

export function pauseAllTimers(state: LightState): LightState {
  return {
    ...state,
    timers: state.timers.map(t => t.isActive && !t.pausedAt ? pauseTimer(t) : t),
    isPaused: true,
    pausedAt: Date.now(),
  }
}

export function resumeAllTimers(state: LightState): LightState {
  return {
    ...state,
    timers: state.timers.map(t => t.pausedAt ? resumeTimer(t) : t),
    isPaused: false,
    pausedAt: undefined,
  }
}
