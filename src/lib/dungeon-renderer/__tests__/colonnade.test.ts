import { describe, it, expect } from 'vitest'
// @ts-expect-error - plain JS module, no types
import { colonnadePoints as rawColonnadePoints } from '../colonnade.js'

type Pt = { x: number; y: number }
const colonnadePoints = (room: Record<string, unknown>): Pt[] => rawColonnadePoints(room)

// Minimal room stand-ins (shape matches what DungeonRenderer reads off a Room)
function rect(overrides: Record<string, unknown> = {}) {
  return { x: -8, y: 0, w: 17, h: 17, round: false, axis: { x: 0, y: 1 }, ...overrides }
}

describe('colonnadePoints — rectangular (vertical axis)', () => {
  it('default reproduces legacy placement: one column per tile, two lines, inset 2', () => {
    const pts = colonnadePoints(rect())
    // Two vertical lines at x = room.x+2 and room.x+room.w-2 (symmetric, 2 from each wall line)
    const xs = [...new Set(pts.map(p => p.x))].sort((a, b) => a - b)
    expect(xs).toEqual([-6, 7]) // -8+2 and -8+17-2
    // Along-edge span y = room.y+2 .. room.y+room.h-2 inclusive, one per tile => h-3 = 14 per line
    const leftYs = pts.filter(p => p.x === -6).map(p => p.y)
    expect(leftYs).toEqual(Array.from({ length: 14 }, (_, i) => 2 + i)) // 2..15
    expect(pts).toHaveLength(28) // 14 * 2 lines
  })

  it('colCount sets the number of columns per side (evenly spaced across the span)', () => {
    const pts = colonnadePoints(rect({ colCount: 3 }))
    const leftYs = pts.filter(p => p.x === -6).map(p => p.y)
    expect(leftYs).toEqual([2, 8.5, 15]) // linspace(2,15,3)
    expect(pts).toHaveLength(6)
  })

  it('colCount of 1 centers a single column on each side', () => {
    const pts = colonnadePoints(rect({ colCount: 1 }))
    const leftYs = pts.filter(p => p.x === -6).map(p => p.y)
    expect(leftYs).toEqual([8.5]) // midpoint of 2..15
  })

  it('colInset moves the column lines relative to the walls', () => {
    const xs = [...new Set(colonnadePoints(rect({ colInset: 1 })).map(p => p.x))].sort((a, b) => a - b)
    expect(xs).toEqual([-7, 8]) // room.x+1 and room.x+room.w-1
  })
})

describe('colonnadePoints — rectangular (horizontal axis)', () => {
  it('places columns along top and bottom lines', () => {
    const pts = colonnadePoints(rect({ axis: { x: 1, y: 0 } }))
    const ys = [...new Set(pts.map(p => p.y))].sort((a, b) => a - b)
    expect(ys).toEqual([2, 15]) // room.y+2 and room.y+room.h-2
  })
})

describe('colonnadePoints — round', () => {
  it('default ring count matches legacy formula', () => {
    const room = { x: -8, y: 0, w: 17, h: 17, round: true, axis: { x: 0, y: 1 } }
    const innerR = 17 / 2 - 2
    const expected = 4 * Math.floor((Math.PI * innerR) / 2)
    expect(colonnadePoints(room)).toHaveLength(expected)
  })

  it('colCount overrides the ring count', () => {
    const room = { x: -8, y: 0, w: 17, h: 17, round: true, axis: { x: 0, y: 1 }, colCount: 8 }
    expect(colonnadePoints(room)).toHaveLength(8)
  })
})
