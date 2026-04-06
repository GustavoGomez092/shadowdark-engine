import PerlinNoise from './PerlinNoise.js';
import { rng } from './Random.js';
import { chaikinSmooth } from './Geometry.js';

/**
 * Flood class generates water levels and contours using Perlin noise.
 *
 * Water is represented as:
 * - A 2D noise heightmap covering the dungeon bounds
 * - A bitmap indicating water/dry cells within room interiors
 * - Contour edges marking water boundaries
 * - Ripple offset lines for visual rendering
 *
 * @class Flood
 */
class Flood {
  /**
   * Creates a Flood instance and generates initial noise map.
   * Matches original fj constructor: (dungeon, level=0.3)
   *
   * @constructor
   * @param {Object} dungeon - Dungeon instance with rooms and bounding rect
   * @param {number} [level=0.3] - Initial water level
   */
  constructor(dungeon, level) {
    if (level == null) level = 0.3;
    this.dungeon = dungeon;
    this.rect = dungeon.getRect();
    this.scale = 1;
    this.map = null;
    this.bitmap = null;
    this.edges = [];
    this.ripples1 = [];
    this.ripples2 = [];
    this.pools = [];
    this.min = 0;
    this.max = 0;

    this._generateNoiseMap();

    if (level > 0) {
      this.setLevel(level);
    }
  }

  /**
   * Generate the underlying Perlin noise heightmap.
   *
   * Uses multi-octave Perlin noise (noiseMapHigh) with adaptive persistence
   * to create varied water distributions. Matches original fj constructor
   * exactly: uses PerlinNoise (Ad class) with the standard permutation table.
   *
   * Octaves are determined by map size to ensure features scale appropriately.
   *
   * @private
   */
  _generateNoiseMap() {
    const rect = this.rect;
    const w = rect.w * this.scale;
    const h = rect.h * this.scale;
    // Square dimension based on max (matching original)
    const a = Math.max(w, h);

    // Octaves: log2(maxDim) with fractional rounding via RNG
    const logSize = Math.log(a) / Math.log(2);
    const frac = logSize - (logSize | 0);
    const octaves = (logSize | 0) + (rng.chance(frac) ? 1 : 0);

    // Noise seed from RNG (matching original: Math.floor(rng * 256))
    const noiseSeed = Math.floor(rng.float() * 256);
    const noise = new PerlinNoise(noiseSeed);

    // Persistence: 4 RNG calls, sum/2 - 1 (matching original)
    const r1 = rng.float();
    const r2 = rng.float();
    const r3 = rng.float();
    const r4 = rng.float();
    const persistence = 0.5 + 0.3 * Math.abs((r1 + r2 + r3 + r4) / 2 - 1);

    // Generate SQUARE noise map using multi-octave Perlin noise
    // (matching original: new Ad(seed).noiseMapHigh(a, a, { octaves, persistence }))
    // gridSizeX and gridSizeY default to 1 via fill(), offsets default to zeros
    this.map = noise.noiseMapHigh(a, a, {
      octaves,
      persistence
    });

    // Find min/max values across the entire square map
    this.min = Infinity;
    this.max = -Infinity;
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const v = this.map[y][x];
        if (v < this.min) this.min = v;
        if (v > this.max) this.max = v;
      }
    }
  }

  /**
   * Set water level as a normalized fraction (0-1).
   *
   * Creates a water bitmap by thresholding the noise map, applies dilation
   * to room edges, and generates contour edges using cell-boundary detection.
   * Also generates ripple offset lines for visual effect.
   *
   * @param {number} level - Water level as fraction 0-1 (0=no water, 1=full)
   */
  setLevel(level) {
    if (level <= 0) {
      this.bitmap = null;
      this.edges = [];
      this.ripples1 = [];
      this.ripples2 = [];
      return;
    }

    const rect = this.rect;
    const w = rect.w;
    const h = rect.h;
    const threshold = this.min + (this.max - this.min) * level;

    // Create water bitmap
    this.bitmap = Array.from({length: h}, () => new Array(w).fill(false));

    // Mark water cells inside rooms
    for (const room of this.dungeon.rooms) {
      const rx = room.x - rect.x;
      const ry = room.y - rect.y;

      // Interior cells (exclude borders)
      for (let y = 1; y < room.h - 1; y++) {
        for (let x = 1; x < room.w - 1; x++) {
          const mx = rx + x;
          const my = ry + y;
          if (my >= 0 && my < h && mx >= 0 && mx < w) {
            this.bitmap[my][mx] = this.map[my][mx] < threshold;
          }
        }
      }

      // Dilate to room edges (horizontal)
      for (let y = 1; y < room.h - 1; y++) {
        const my = ry + y;
        if (my >= 0 && my < h) {
          // Left edge
          if (rx >= 0 && rx < w && rx + 1 < w) {
            this.bitmap[my][rx] = this.bitmap[my][rx] || this.bitmap[my][rx + 1];
          }
          // Right edge
          const re = rx + room.w - 1;
          if (re >= 0 && re < w && re - 1 >= 0) {
            this.bitmap[my][re] = this.bitmap[my][re] || this.bitmap[my][re - 1];
          }
        }
      }

      // Dilate to room edges (vertical)
      for (let x = 1; x < room.w - 1; x++) {
        const mx = rx + x;
        if (mx >= 0 && mx < w) {
          // Top edge
          if (ry >= 0 && ry < h && ry + 1 < h) {
            this.bitmap[ry][mx] = this.bitmap[ry][mx] || this.bitmap[ry + 1][mx];
          }
          // Bottom edge
          const be = ry + room.h - 1;
          if (be >= 0 && be < h && be - 1 >= 0) {
            this.bitmap[be][mx] = this.bitmap[be][mx] || this.bitmap[be - 1][mx];
          }
        }
      }
    }

    // Build contour edges using cell-boundary detection (matching original buildSegments)
    this.edges = this._buildEdges();
    this.ripples1 = this._offsetEdges(this.edges, 0.2 / this.scale);
    this.ripples2 = this._offsetEdges(this.edges, 0.4 / this.scale);
  }

  /**
   * Build water/dry boundary polylines using cell-boundary edge detection.
   *
   * Matches original fj.buildSegments: for each water cell, checks its 4
   * neighbors. If a neighbor is dry (or at the bitmap boundary), adds an
   * edge segment along that cell boundary. Edge points use a grid of shared
   * vertices (via _getPoint) at cell corner positions.
   *
   * This produces closed polygons that can be filled with the water color.
   *
   * @private
   * @returns {Array<Array<{x: number, y: number}>>} Array of polylines
   */
  _buildEdges() {
    if (!this.bitmap) return [];

    const h = this.rect.h;
    const w = this.rect.w;

    // Cache grid of shared edge points (matching original gp() / this.points)
    this._pointCache = Array.from({length: h + 1}, () => new Array(w + 1).fill(null));

    const segments = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!this.bitmap[y][x]) continue;

        // Top edge: if no water cell above, add top boundary
        if (y === 0 || !this.bitmap[y - 1][x]) {
          segments.push([this._getPoint(x, y), this._getPoint(x + 1, y)]);
        }
        // Bottom edge: if no water cell below, add bottom boundary
        if (y === h - 1 || !this.bitmap[y + 1][x]) {
          segments.push([this._getPoint(x + 1, y + 1), this._getPoint(x, y + 1)]);
        }
        // Left edge: if no water cell to the left, add left boundary
        if (x === 0 || !this.bitmap[y][x - 1]) {
          segments.push([this._getPoint(x, y + 1), this._getPoint(x, y)]);
        }
        // Right edge: if no water cell to the right, add right boundary
        if (x === w - 1 || !this.bitmap[y][x + 1]) {
          segments.push([this._getPoint(x + 1, y), this._getPoint(x + 1, y + 1)]);
        }
      }
    }

    // Link into continuous closed polylines
    return this._linkSegments(segments);
  }

  /**
   * Get or create a shared edge point at grid vertex (gx, gy).
   *
   * Matches original gp(a, b): creates a point at
   *   (a/scale + rect.x, b/scale + rect.y)
   * with a random polar jitter added for organic edges.
   *
   * Original jitter: polar(0.3/scale * ((r1+r2+r3)/3 * 2 - 1), PI * r4)
   * where r1..r4 are sequential RNG calls.
   *
   * @private
   * @param {number} gx - Grid X index (0 to rect.w)
   * @param {number} gy - Grid Y index (0 to rect.h)
   * @returns {{x: number, y: number}} Point in world grid coordinates
   */
  _getPoint(gx, gy) {
    if (this._pointCache[gy][gx]) return this._pointCache[gy][gx];

    let px = gx / this.scale + this.rect.x;
    let py = gy / this.scale + this.rect.y;

    // Random polar jitter matching original gp():
    // magnitude = 0.3/scale * ((r1+r2+r3)/3 * 2 - 1)
    // angle = PI * r4
    const r1 = rng.float();
    const r2 = rng.float();
    const r3 = rng.float();
    const mag = (0.3 / this.scale) * ((r1 + r2 + r3) / 3 * 2 - 1);
    const angle = Math.PI * rng.float();
    px += Math.cos(angle) * mag;
    py += Math.sin(angle) * mag;

    const pt = { x: px, y: py };
    this._pointCache[gy][gx] = pt;
    return pt;
  }

  /**
   * Link cell-boundary segments into continuous polylines, then smooth them.
   *
   * Matches original fj.linkSegments which, after linking segments, applies:
   *   1. resample(polyline, 1) - redistribute points at unit distance
   *   2. Chaikin(polyline, open, 1 iteration) - smooth once
   *   3. resample(polyline, 0.5) - redistribute at finer distance
   *   4. pop() - remove last point (to make it properly closed for wavy)
   *   5. wavy(polyline, 0.3) - add wavy distortion along normals
   *
   * @private
   * @param {Array<Array>} segments - Array of [start, end] segment pairs
   * @returns {Array<Array<{x: number, y: number}>>} Array of connected polylines
   */
  _linkSegments(segments) {
    if (segments.length === 0) return [];

    // Work with a mutable copy
    const remaining = segments.slice();
    const polylines = [];

    while (remaining.length > 0) {
      let line = remaining.shift();

      // Extend forward: find segment whose start matches our end
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i][0] === line[line.length - 1]) {
            line.push(remaining[i][1]);
            remaining.splice(i, 1);
            changed = true;
            break;
          }
        }
      }

      // Extend backward: find segment whose end matches our start
      changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i][1] === line[0]) {
            line.unshift(remaining[i][0]);
            remaining.splice(i, 1);
            changed = true;
            break;
          }
        }
      }

      // Post-processing matching original fj.linkSegments:
      // 1. Resample at distance 1
      line = this._resample(line, 1);
      // 2. Chaikin smooth (open, 1 iteration)
      line = chaikinSmooth(line, 1, false);
      // 3. Resample at distance 0.5
      line = this._resample(line, 0.5);
      // 4. Remove last point (makes it a proper closed loop for wavy)
      line.pop();
      // 5. Apply wavy distortion
      line = this._wavy(line, 0.3);

      polylines.push(line);
    }

    return polylines;
  }

  /**
   * Resample a polyline at fixed distance intervals.
   *
   * Matches original ef.resample: walks along the polyline and places
   * new points at regular intervals using linear interpolation.
   *
   * @private
   * @param {Array<{x: number, y: number}>} points - Input polyline
   * @param {number} dist - Target distance between consecutive points
   * @returns {Array<{x: number, y: number}>} Resampled polyline
   */
  _resample(points, dist) {
    if (points.length < 2) return points.slice();

    const result = [points[0]];
    let nextDist = dist;
    let cumDist = 0;
    let segIdx = 1;
    let p0 = points[0];
    let p1 = points[1];
    let segLen = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);

    for (;;) {
      if (cumDist + segLen > nextDist) {
        // Interpolate a new point on this segment
        const t = (nextDist - cumDist) / segLen;
        result.push({
          x: p0.x + (p1.x - p0.x) * t,
          y: p0.y + (p1.y - p0.y) * t
        });
        nextDist += dist;
      } else {
        // Move to next segment
        segIdx++;
        if (segIdx >= points.length) break;
        cumDist += segLen;
        p0 = p1;
        p1 = points[segIdx];
        segLen = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
      }
    }

    // Ensure last point is included
    const last = points[points.length - 1];
    const prevLast = result[result.length - 1];
    const dToLast = Math.sqrt((last.x - prevLast.x) ** 2 + (last.y - prevLast.y) ** 2);
    if (dToLast > 0) {
      result.push(last);
    } else {
      result[result.length - 1] = last;
    }

    return result;
  }

  /**
   * Apply wavy distortion along normals of a closed polyline.
   *
   * Matches original fj.wavy: for each point, computes the perpendicular
   * direction from neighbors, then offsets alternately +/- with random
   * magnitude: direction flips every 2 points (using index & 2),
   * magnitude = amplitude * (1 - abs(sum4rng/2 - 1)).
   *
   * @private
   * @param {Array<{x: number, y: number}>} points - Input polyline (treated as closed)
   * @param {number} amplitude - Maximum displacement
   * @returns {Array<{x: number, y: number}>} Wavy polyline
   */
  _wavy(points, amplitude) {
    const n = points.length;
    const result = [];

    for (let i = 0; i < n; i++) {
      const next = points[(i + 1) % n];
      const prev = points[(i + n - 1) % n];

      // Normal direction (perpendicular to tangent)
      let nx = next.y - prev.y;
      let ny = prev.x - next.x;
      const len = Math.sqrt(nx * nx + ny * ny);
      if (len > 0) {
        nx /= len;
        ny /= len;
      }

      // Alternating direction: flip every 2 points (matching original f&2 check)
      const sign = (i & 2) === 0 ? 1 : -1;

      // Random magnitude: amplitude * (1 - abs(sum4rng/2 - 1))
      const r1 = rng.float();
      const r2 = rng.float();
      const r3 = rng.float();
      const r4 = rng.float();
      const offset = sign * amplitude * (1 - Math.abs((r1 + r2 + r3 + r4) / 2 - 1));

      result.push({
        x: points[i].x + nx * offset,
        y: points[i].y + ny * offset
      });
    }

    return result;
  }

  /**
   * Offset edge polylines outward by a given distance.
   *
   * Computes perpendicular offset for each point using neighboring points.
   * Used to create ripple effect rings around water boundaries.
   *
   * @private
   * @param {Array<Array<{x: number, y: number}>>} edges - Input polylines
   * @param {number} distance - Offset distance in world units
   * @returns {Array<Array<{x: number, y: number}>>} Offset polylines
   */
  _offsetEdges(edges, distance) {
    return edges.map(edge => {
      const n = edge.length;
      if (n < 2) return edge;

      const result = [];
      for (let i = 0; i < n; i++) {
        // Use circular indexing (matching original offset() which uses modular wrap)
        // This correctly handles closed polylines where first/last points connect
        const prev = edge[(i + n - 1) % n];
        const next = edge[(i + 1) % n];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        // Perpendicular offset (normal direction: rotate tangent 90 degrees)
        result.push({
          x: edge[i].x + (-dy / len) * distance,
          y: edge[i].y + (dx / len) * distance
        });
      }
      return result;
    });
  }

  /**
   * Get serializable water data for export/rendering.
   *
   * Returns water cell positions and contour edge data.
   *
   * @returns {Object|null} Water data or null if no water set
   */
  getData() {
    if (!this.bitmap) return null;

    const cells = [];
    const h = this.bitmap.length;
    const w = this.bitmap[0]?.length || 0;

    // Collect all water cell positions
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (this.bitmap[y][x]) {
          cells.push({
            x: this.rect.x + x,
            y: this.rect.y + y
          });
        }
      }
    }

    return {
      cells,
      edges: this.edges,
      ripples1: this.ripples1,
      ripples2: this.ripples2
    };
  }
}

export default Flood;
