/**
 * Classic Perlin Noise Generator
 *
 * Exact port of the original Watabou PerlinNoise (Ad class).
 * Uses the standard Ken Perlin permutation table, shifted by seed.
 * Gradient function uses 4 directions selected by (perm & 3).
 * Easing uses 6th-degree smoothstep: t^3 * (t * (6t - 15) + 10).
 *
 * Used by the Flood system to create water level maps.
 */

// Standard Ken Perlin permutation table (256 values)
const PERMUTATION = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247,
  120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57,
  177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74,
  165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3,
  64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85,
  212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170,
  213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43,
  172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185,
  112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191,
  179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31,
  181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150,
  254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195,
  78, 66, 215, 61, 156, 180
];

// Precomputed easing table: t^3 * (t * (6t - 15) + 10) for t in [0, 1)
// 4096 entries, matching original Ad.ease
let EASE = null;
function getEase() {
  if (!EASE) {
    EASE = new Float64Array(4096);
    for (let i = 0; i < 4096; i++) {
      const t = i / 4096;
      EASE[i] = t * t * t * (t * (6 * t - 15) + 10);
    }
  }
  return EASE;
}

// Zero offset point (matching original Ad.zero = new E())
const ZERO = { x: 0, y: 0 };

class PerlinNoise {
  /**
   * @param {number} seed - Integer seed (0-255), shifts the permutation table
   */
  constructor(seed) {
    // Build permutation table shifted by seed (matching original Ad constructor)
    const p = [];
    for (let i = 0; i < 256; i++) {
      p.push(PERMUTATION[(i + seed) % 256]);
    }
    // Double the table (matching original: this.p = this.p.concat(this.p))
    this.p = p.concat(p);

    // Ensure easing table is initialized
    getEase();
  }

  /**
   * Generate a single-octave 2D noise map.
   * Exact port of original Ad.prototype.noiseMap.
   *
   * @param {number} width - Map width (columns)
   * @param {number} height - Map height (rows)
   * @param {object} options
   * @param {number} options.gridSizeX - Grid cell size in X (default 1)
   * @param {number} [options.gridSizeY] - Grid cell size in Y (default = gridSizeX)
   * @param {Array<{x:number,y:number}>} [options.offsets] - Offset per octave
   * @returns {number[][]} 2D array [height][width] of noise values
   */
  noiseMap(width, height, options) {
    // Fill defaults (matching original Ad.fill)
    if (options.octaves == null) options.octaves = 1;
    if (options.gridSizeX == null) options.gridSizeX = 1;
    if (options.gridSizeY == null) options.gridSizeY = options.gridSizeX;
    if (options.persistence == null) options.persistence = 0.5;
    if (options.offsets == null) {
      options.offsets = [];
      for (let i = 0; i < options.octaves; i++) options.offsets.push(ZERO);
    }

    const ease = getEase();
    const p = this.p;

    // Create output grid initialized to 0
    const grid = [];
    for (let row = 0; row < height; row++) {
      const r = [];
      for (let col = 0; col < width; col++) r.push(0);
      grid.push(r);
    }

    const stepX = options.gridSizeX / width;
    const stepY = options.gridSizeY / width; // NOTE: original divides by 'a' (width) for both, not height
    let offsetX = options.offsets[0].x;
    let coordY = options.offsets[0].y;

    for (let row = 0; row < height; row++) {
      const iy = coordY | 0;       // integer part of y
      const iy1 = iy + 1;          // next integer y
      const fy = coordY - iy;      // fractional part of y
      const ey = ease[(4096 * fy) | 0]; // eased y fraction
      let coordX = offsetX;

      for (let col = 0; col < width; col++) {
        const ix = coordX | 0;       // integer part of x
        const ix1 = ix + 1;          // next integer x
        const fx = coordX - ix;      // fractional part of x
        const ex = ease[(4096 * fx) | 0]; // eased x fraction

        // Hash the four corners
        const p00 = p[p[ix] + iy];   // top-left
        const p10 = p[p[ix1] + iy];  // top-right
        const p01 = p[p[ix] + iy1];  // bottom-left
        const p11 = p[p[ix1] + iy1]; // bottom-right

        // Gradient dot products at each corner
        // Gradient function: (perm & 3) selects one of 4 directions
        //   0: +fx + fy
        //   1: +fx - fy
        //   2: -fx + fy
        //   3: -fx - fy

        // Top-left corner (p00): offset = (fx, fy)
        let g00;
        switch (p00 & 3) {
          case 0: g00 = fx + fy; break;
          case 1: g00 = fx - fy; break;
          case 2: g00 = -fx + fy; break;
          case 3: g00 = -fx - fy; break;
          default: g00 = 0;
        }

        // Top-right corner (p10): offset = (fx - 1, fy)
        const fx1 = fx - 1;
        let g10;
        switch (p10 & 3) {
          case 0: g10 = fx1 + fy; break;
          case 1: g10 = fx1 - fy; break;
          case 2: g10 = -fx1 + fy; break;
          case 3: g10 = -fx1 - fy; break;
          default: g10 = 0;
        }

        // Interpolate top edge
        const top = g00 + (g10 - g00) * ex;

        // Bottom-left corner (p01): offset = (fx, fy - 1)
        const fy1 = fy - 1;
        let g01;
        switch (p01 & 3) {
          case 0: g01 = fx + fy1; break;
          case 1: g01 = fx - fy1; break;
          case 2: g01 = -fx + fy1; break;
          case 3: g01 = -fx - fy1; break;
          default: g01 = 0;
        }

        // Bottom-right corner (p11): offset = (fx - 1, fy - 1)
        let g11;
        switch (p11 & 3) {
          case 0: g11 = fx1 + fy1; break;
          case 1: g11 = fx1 - fy1; break;
          case 2: g11 = -fx1 + fy1; break;
          case 3: g11 = -fx1 - fy1; break;
          default: g11 = 0;
        }

        // Interpolate bottom edge
        const bottom = g01 + (g11 - g01) * ex;

        // Interpolate vertically
        grid[row][col] = top + (bottom - top) * ey;

        coordX += stepX;
      }

      coordY += stepY;
    }

    return grid;
  }

  /**
   * Generate a multi-octave 2D noise map (fractal Brownian motion).
   * Exact port of original Ad.prototype.noiseMapHigh.
   *
   * Each subsequent octave doubles gridSizeX and gridSizeY,
   * reduces amplitude by persistence factor, and shifts offsets.
   * Results are NOT normalized (raw accumulation).
   *
   * @param {number} width - Map width
   * @param {number} height - Map height
   * @param {object} options - Same as noiseMap, plus octaves and persistence
   * @returns {number[][]} 2D array of accumulated noise values
   */
  noiseMapHigh(width, height, options) {
    // First octave
    const result = this.noiseMap(width, height, options);

    let amplitude = 1;
    let octave = 1;
    const totalOctaves = options.octaves;

    while (octave < totalOctaves) {
      octave++;
      options.gridSizeX *= 2;
      options.gridSizeY *= 2;
      options.offsets.shift();
      amplitude *= options.persistence;

      const layer = this.noiseMap(width, height, options);

      // Accumulate weighted noise
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          result[y][x] += layer[y][x] * amplitude;
        }
      }
    }

    return result;
  }
}

export default PerlinNoise;
