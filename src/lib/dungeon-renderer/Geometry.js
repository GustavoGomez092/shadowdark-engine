/**
 * Geometry Utilities
 *
 * Polygon operations, Chaikin curve smoothing, dashed line generation,
 * and other vector math used throughout the rendering pipeline.
 */

/**
 * Rotate a polygon's points by direction vector (dirX, dirY)
 * Used to orient door polygons to face the correct wall.
 *
 * @param {Array<{x:number,y:number}>} poly
 * @param {number} dirX - Direction X component (-1, 0, or 1)
 * @param {number} dirY - Direction Y component (-1, 0, or 1)
 * @returns {Array<{x:number,y:number}>}
 */
export function rotateYX(poly, dirX, dirY) {
  return poly.map(p => ({
    x: p.x * dirY - p.y * dirX,
    y: p.x * dirX + p.y * dirY
  }));
}

/**
 * Translate a polygon by (tx, ty)
 */
export function translate(poly, tx, ty) {
  return poly.map(p => ({
    x: p.x + tx,
    y: p.y + ty
  }));
}

/**
 * Scale a polygon by (sx, sy) or uniform scale
 */
export function scalePoly(poly, sx, sy = sx) {
  return poly.map(p => ({
    x: p.x * sx,
    y: p.y * sy
  }));
}

/**
 * Chaikin curve smoothing.
 * Subdivides polygon edges to produce a smoother curve.
 *
 * @param {Array<{x:number,y:number}>} points - Input polyline
 * @param {number} iterations - Number of smoothing passes (default 3)
 * @param {boolean} closed - Whether the polyline is closed (default false)
 * @returns {Array<{x:number,y:number}>}
 */
export function chaikinSmooth(points, iterations = 3, closed = false) {
  let current = points;

  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    const n = current.length;

    if (closed) {
      // Closed: process every vertex, wrapping around
      // For each vertex, produce two points: one toward prev, one toward next
      // This matches the original ff.render closed case exactly.
      for (let i = 0; i < n; i++) {
        const p = current[i];
        const prev = current[(i + n - 1) % n];
        const nxt = current[(i + 1) % n];

        next.push({
          x: 0.75 * p.x + 0.25 * prev.x,
          y: 0.75 * p.y + 0.25 * prev.y
        });
        next.push({
          x: 0.75 * p.x + 0.25 * nxt.x,
          y: 0.75 * p.y + 0.25 * nxt.y
        });
      }
    } else {
      // Open: process only interior vertices (indices 1 to n-2),
      // keeping first and last endpoints.
      // Matches original ff.render open case.
      for (let i = 1; i < n - 1; i++) {
        const p = current[i];
        next.push({
          x: 0.75 * p.x + 0.25 * current[i - 1].x,
          y: 0.75 * p.y + 0.25 * current[i - 1].y
        });
        next.push({
          x: 0.75 * p.x + 0.25 * current[i + 1].x,
          y: 0.75 * p.y + 0.25 * current[i + 1].y
        });
      }
      // Preserve endpoints
      next.unshift(current[0]);
      next.push(current[n - 1]);
    }

    current = next;
  }

  return current;
}

/**
 * Generate points for a regular polygon (circle approximation).
 *
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius
 * @param {number} sides - Number of sides
 * @param {number} startAngle - Start angle in radians (default 0)
 * @returns {Array<{x:number,y:number}>}
 */
export function regularPolygon(cx, cy, radius, sides, startAngle = 0) {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (2 * Math.PI * i) / sides;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });
  }
  return points;
}

/**
 * Offset a polyline outward by a given distance.
 * Simple normal-based offset (not a full polygon offset).
 *
 * @param {Array<{x:number,y:number}>} points
 * @param {number} distance
 * @returns {Array<{x:number,y:number}>}
 */
export function offsetPolyline(points, distance) {
  if (points.length < 2) return [...points];

  const result = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];

    // Direction along the line
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Normal (perpendicular)
    const nx = -dy / len;
    const ny = dx / len;

    result.push({
      x: points[i].x + nx * distance,
      y: points[i].y + ny * distance
    });
  }
  return result;
}

/**
 * Make a polyline wavy by adding sinusoidal perturbation.
 *
 * @param {Array<{x:number,y:number}>} points
 * @param {number} amplitude
 * @param {number} frequency
 * @returns {Array<{x:number,y:number}>}
 */
export function wavyLine(points, amplitude, frequency = 1) {
  if (points.length < 2) return points;

  const result = [];
  let totalDist = 0;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }

    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const nx = -dy / len;
    const ny = dx / len;
    const wave = Math.sin(totalDist * frequency * 2 * Math.PI) * amplitude;

    result.push({
      x: points[i].x + nx * wave,
      y: points[i].y + ny * wave
    });
  }
  return result;
}

/**
 * Generate dashed line segments between two points.
 *
 * @param {number} x1 @param {number} y1
 * @param {number} x2 @param {number} y2
 * @param {number[]} pattern - Array of [dash, gap, dash, gap, ...]
 * @returns {Array<{x1,y1,x2,y2}>} Line segments
 */
export function dashedLine(x1, y1, x2, y2, pattern) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const totalLen = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / totalLen;
  const uy = dy / totalLen;

  const segments = [];
  let dist = 0;
  let patIdx = 0;
  let drawing = true;

  while (dist < totalLen) {
    const segLen = Math.min(pattern[patIdx % pattern.length], totalLen - dist);
    if (drawing) {
      segments.push({
        x1: x1 + ux * dist,
        y1: y1 + uy * dist,
        x2: x1 + ux * (dist + segLen),
        y2: y1 + uy * (dist + segLen)
      });
    }
    dist += segLen;
    patIdx++;
    drawing = !drawing;
  }

  return segments;
}

/**
 * Get the bounding box of a set of points
 * @param {Array<{x:number,y:number}>} points
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function boundingBox(points) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
