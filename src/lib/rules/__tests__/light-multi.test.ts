import { describe, it, expect } from 'vitest'
import { applyLightForCarrier } from '../light.ts'
import type { LightTimer } from '@/schemas/light.ts'

function timer(over: Partial<LightTimer> = {}): LightTimer {
  return {
    id: 'tA', type: 'torch', carrierId: 'doffin', range: 'near',
    startedAt: 1000, durationMs: 3_600_000, accumulatedPauseMs: 0,
    isActive: true, isExpired: false, ...over,
  }
}

describe('applyLightForCarrier', () => {
  it('appends a new timer for a carrier with no light', () => {
    const out = applyLightForCarrier([], 'doffin', 'lantern', 3_600_000, 5000)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ carrierId: 'doffin', type: 'lantern', range: 'double_near', durationMs: 3_600_000, startedAt: 5000, isActive: true })
  })

  it('keeps separate timers for different carriers (the fix)', () => {
    const start = [timer({ id: 'tA', carrierId: 'doffin' })]
    const out = applyLightForCarrier(start, 'wrenna', 'torch', 3_600_000, 9000)
    expect(out).toHaveLength(2)
    expect(out.map(t => t.carrierId).sort()).toEqual(['doffin', 'wrenna'])
    // Doffin's timer is untouched
    expect(out.find(t => t.carrierId === 'doffin')).toEqual(start[0])
  })

  it("resets the same carrier's active timer instead of adding a second", () => {
    const start = [timer({ id: 'tA', carrierId: 'doffin', startedAt: 1000, accumulatedPauseMs: 50, pausedAt: 1200 })]
    const out = applyLightForCarrier(start, 'doffin', 'torch', 3_600_000, 9000)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('tA') // same timer, reused
    expect(out[0]).toMatchObject({ startedAt: 9000, accumulatedPauseMs: 0, pausedAt: undefined, isActive: true, isExpired: false })
  })

  it('updates type/range when the same carrier relights with a different source', () => {
    const start = [timer({ id: 'tA', carrierId: 'doffin', type: 'torch', range: 'near' })]
    const out = applyLightForCarrier(start, 'doffin', 'lantern', 3_600_000, 9000)
    expect(out[0]).toMatchObject({ type: 'lantern', range: 'double_near' })
  })

  it('appends a fresh timer when the carrier only has an expired light', () => {
    const start = [timer({ id: 'tOld', carrierId: 'doffin', isActive: false, isExpired: true })]
    const out = applyLightForCarrier(start, 'doffin', 'torch', 3_600_000, 9000)
    expect(out).toHaveLength(2)
    expect(out.filter(t => t.carrierId === 'doffin' && t.isActive && !t.isExpired)).toHaveLength(1)
  })
})
