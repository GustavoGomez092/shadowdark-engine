import { describe, it, expect } from 'vitest'
import { extractColumnOccluders, PILLAR_OCCLUDER_HALF } from '../dungeon-walls.ts'

describe('extractColumnOccluders', () => {
  it('returns no segments for empty/missing columns', () => {
    expect(extractColumnOccluders([])).toEqual([])
    expect(extractColumnOccluders(null)).toEqual([])
    expect(extractColumnOccluders(undefined)).toEqual([])
  })

  it('builds a closed 4-segment square per pillar', () => {
    const segs = extractColumnOccluders([{ x: 5, y: 7 }], 0.3)
    expect(segs).toHaveLength(4)
    // Square corners at (4.7,6.7) .. (5.3,7.3)
    expect(segs).toEqual([
      { x1: 4.7, y1: 6.7, x2: 5.3, y2: 6.7 }, // top
      { x1: 5.3, y1: 6.7, x2: 5.3, y2: 7.3 }, // right
      { x1: 5.3, y1: 7.3, x2: 4.7, y2: 7.3 }, // bottom
      { x1: 4.7, y1: 7.3, x2: 4.7, y2: 6.7 }, // left
    ])
  })

  it('forms a connected loop (each segment end meets the next start)', () => {
    const [a, b, c, d] = extractColumnOccluders([{ x: 0, y: 0 }])
    expect([a.x2, a.y2]).toEqual([b.x1, b.y1])
    expect([b.x2, b.y2]).toEqual([c.x1, c.y1])
    expect([c.x2, c.y2]).toEqual([d.x1, d.y1])
    expect([d.x2, d.y2]).toEqual([a.x1, a.y1]) // closes back to start
  })

  it('emits 4 segments per column for many pillars', () => {
    const cols = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }))
    expect(extractColumnOccluders(cols)).toHaveLength(40)
  })

  it('defaults to PILLAR_OCCLUDER_HALF when no half given', () => {
    const segs = extractColumnOccluders([{ x: 0, y: 0 }])
    // top edge spans full width = 2 * half
    const top = segs[0]
    expect(top.x2 - top.x1).toBeCloseTo(2 * PILLAR_OCCLUDER_HALF)
  })
})
