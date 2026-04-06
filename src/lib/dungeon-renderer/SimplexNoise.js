/**
 * Simplex Noise Generator
 *
 * Used by the Flood system to create natural-looking water level maps.
 * Implements 2D simplex noise with octave stacking (fractal Brownian motion).
 */

class SimplexNoise {
  constructor(seed = 0) {
    // Permutation table seeded deterministically
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Fisher-Yates shuffle using seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 48271) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  /**
   * 2D simplex noise in range [-1, 1]
   */
  noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;

    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else          { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    const grad3 = [
      [1,1], [-1,1], [1,-1], [-1,-1],
      [1,0], [-1,0], [0,1], [0,-1],
      [1,1], [-1,1], [1,-1], [-1,-1]
    ];

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Generate a 2D noise map with fractal Brownian motion (fBm).
   *
   * @param {number} width
   * @param {number} height
   * @param {object} options
   * @param {number} options.octaves - Number of noise octaves (default 4)
   * @param {number} options.persistence - Amplitude decay per octave (default 0.5)
   * @param {number} options.lacunarity - Frequency multiplier per octave (default 2)
   * @param {number} options.scale - Base frequency scale (default 1)
   * @returns {number[][]} 2D array of noise values
   */
  noiseMap(width, height, options = {}) {
    const {
      octaves = 4,
      persistence = 0.5,
      lacunarity = 2,
      scale = 1
    } = options;

    const map = [];
    for (let y = 0; y < height; y++) {
      map[y] = [];
      for (let x = 0; x < width; x++) {
        let amplitude = 1;
        let frequency = scale / Math.max(width, height);
        let value = 0;
        let maxAmplitude = 0;

        for (let o = 0; o < octaves; o++) {
          value += amplitude * this.noise2D(x * frequency, y * frequency);
          maxAmplitude += amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }

        map[y][x] = value / maxAmplitude;
      }
    }

    return map;
  }
}

export default SimplexNoise;
