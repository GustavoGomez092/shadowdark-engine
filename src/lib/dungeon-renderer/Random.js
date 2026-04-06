/**
 * Random Number Generator
 *
 * Park-Miller Linear Congruential Generator (LCG).
 * Produces deterministic pseudo-random sequences from a seed.
 * Original algorithm from the Watabou One Page Dungeon Generator.
 *
 * Formula: seed = (48271 * seed) % 2147483647
 */

const MULTIPLIER = 48271;
const MODULUS = 2147483647; // 2^31 - 1 (Mersenne prime)

class Random {
  constructor(seed) {
    this._seed = seed || 1;
  }

  /** Get or set the current seed */
  get seed() {
    return this._seed;
  }

  set seed(value) {
    this._seed = value;
  }

  /** Reset the RNG with a new seed */
  reset(seed) {
    this._seed = seed;
    this._callCount = 0;
  }

  /** Generate a float in [0, 1) */
  float() {
    this._callCount = (this._callCount || 0) + 1;
    this._seed = (MULTIPLIER * this._seed) % MODULUS;
    return this._seed / MODULUS;
  }

  /** Generate an integer in [0, max) */
  int(max) {
    return Math.floor(this.float() * max);
  }

  /** Generate an integer in [min, max) */
  intRange(min, max) {
    return min + Math.floor(this.float() * (max - min));
  }

  /** Generate a float in [min, max) */
  floatRange(min, max) {
    return min + this.float() * (max - min);
  }

  /** Pick a random element from an array (uniform) */
  pick(array) {
    return array[this.float() * array.length | 0];
  }

  /** Pick with fall-off distribution (biased toward start of array) */
  fallOff(array, power = 2) {
    return array[Math.pow(this.float(), power) * array.length | 0];
  }

  /** Pick a weighted random element. weights[i] = relative probability of array[i] */
  weighted(array, weights) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = this.float() * total;
    for (let i = 0; i < array.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return array[i];
    }
    return array[array.length - 1];
  }

  /** Pick n unique random elements from an array (shuffle + slice, matching original la.subset) */
  subset(array, n) {
    return this.shuffle(array).slice(0, n);
  }

  /** Shuffle array using insertion-based algorithm (matches original la.shuffle) */
  shuffle(array) {
    const result = [];
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      const pos = this.float() * (result.length + 1) | 0;
      result.splice(pos, 0, item);
    }
    return result;
  }

  /** Average of N random floats (approximates normal distribution) */
  averageN(n) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.float();
    return sum / n;
  }

  /** Execute a function while preserving the current seed state */
  preserve(fn) {
    const savedSeed = this._seed;
    const result = fn();
    this._seed = savedSeed;
    return result;
  }

  /** Boolean with given probability (0-1) */
  chance(probability) {
    return this.float() < probability;
  }

  /** Generate a random sign: -1 or 1 */
  sign() {
    return this.float() < 0.5 ? -1 : 1;
  }
}

// Global shared RNG instance
const rng = new Random(Date.now());

export { Random, rng };
export default rng;
