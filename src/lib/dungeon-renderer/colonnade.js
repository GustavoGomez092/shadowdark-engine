/**
 * Colonnade geometry — pure column-placement math, no canvas.
 *
 * Computes where colonnade columns sit for a room, honoring optional per-room
 * overrides while reproducing the legacy auto-layout exactly when unset:
 *   - room.colCount : number of columns per side / around the ring (default: legacy)
 *   - room.colInset : distance (in tiles) of the column line from the wall (default: 2)
 * Radius (room.colRadius) is handled by the renderer, not here.
 *
 * Returns an array of { x, y } in tile coordinates (grid-line positions).
 */

const DEFAULT_INSET = 2

/**
 * Evenly distribute `count` points across the inclusive span [a, b].
 * When count is null/undefined, reproduce the legacy one-per-tile placement.
 */
function distribute(a, b, count) {
  if (count == null) {
    const out = []
    for (let v = a; v <= b; v++) out.push(v)
    return out
  }
  if (count <= 1) return [(a + b) / 2]
  const step = (b - a) / (count - 1)
  const out = []
  for (let i = 0; i < count; i++) out.push(a + step * i)
  return out
}

export function colonnadePoints(room) {
  const inset = room.colInset ?? DEFAULT_INSET
  const pts = []

  if (room.round) {
    const cx = room.x + room.w / 2
    const cy = room.y + room.h / 2
    const innerR = room.w / 2 - inset
    if (innerR <= 0) return pts
    const defaultN = 4 * Math.floor((Math.PI * innerR) / 2)
    const n = room.colCount ?? defaultN
    for (let i = 0; i < n; i++) {
      const angle = ((i + 0.5) / n) * 2 * Math.PI
      pts.push({ x: cx + innerR * Math.cos(angle), y: cy + innerR * Math.sin(angle) })
    }
    return pts
  }

  // Rectangular: two parallel lines of columns. Inset controls the cross-axis
  // line position; the along-edge span keeps the legacy +2/-2 endpoints.
  const horizontal = room.axis && room.axis.x !== 0
  if (horizontal) {
    const lineYs = [room.y + inset, room.y + room.h - inset]
    const xs = distribute(room.x + 2, room.x + room.w - 2, room.colCount)
    for (const y of lineYs) for (const x of xs) pts.push({ x, y })
  } else {
    const lineXs = [room.x + inset, room.x + room.w - inset]
    const ys = distribute(room.y + 2, room.y + room.h - 2, room.colCount)
    for (const x of lineXs) for (const y of ys) pts.push({ x, y })
  }
  return pts
}
