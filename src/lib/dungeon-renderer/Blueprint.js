/**
 * Blueprint.js - Configuration model for dungeon generation
 *
 * The Blueprint class encapsulates all configuration parameters needed
 * to generate a specific dungeon. It handles seed management, tag resolution,
 * and URL serialization for shareable dungeon links.
 *
 * @module model/Blueprint
 */

import Tags from './Tags.js';

/**
 * Blueprint class representing dungeon generation configuration.
 *
 * A blueprint contains:
 * - seed: Deterministic RNG seed for reproducible generation
 * - tags: Dungeon style/feature tags that influence generation
 * - name: Display name for the dungeon
 *
 * Blueprints can be created from scratch, from URL parameters, or
 * with randomized values. They can be serialized back to URLs for
 * easy sharing.
 */
class Blueprint {
  /**
   * Create a new Blueprint with specified configuration.
   *
   * @param {number} [seed=0] - RNG seed for dungeon generation. If 0 or falsy,
   *                            a random seed will be generated. Seeds must be
   *                            positive integers less than 2^31.
   * @param {string[]} [tags=[]] - Array of style/feature tags. Invalid tags
   *                               are ignored during initialization.
   * @param {string} [name=''] - Display name for the dungeon
   *
   * @example
   * const bp = new Blueprint(12345, ['ruins', 'undead'], 'Crypt of the Forgotten');
   */
  constructor(seed = 0, tags = [], name = '') {
    /**
     * RNG seed for reproducible dungeon generation.
     * @type {number}
     */
    this.seed = seed || Math.floor(Math.random() * 2147483647);

    /**
     * Array of generation tags influencing dungeon characteristics.
     * @type {string[]}
     */
    this.tags = Array.isArray(tags) ? tags : [];

    /**
     * Display name for this dungeon.
     * @type {string}
     */
    this.name = String(name || '');
  }

  /**
   * Create a Blueprint with a random seed and no tags.
   *
   * Useful for generating a fresh dungeon with no specific constraints.
   * Each call produces a different seed.
   *
   * @returns {Blueprint} New Blueprint with random seed
   *
   * @example
   * const randomDungeon = Blueprint.random();
   */
  static random() {
    return new Blueprint(Math.floor(Math.random() * 2147483647), []);
  }

  /**
   * Create a Blueprint from an array of tags with a random seed.
   *
   * Validates tags against the Tags module and filters out invalid ones.
   * Useful for constrained generation with specific theme requirements.
   *
   * @param {string[]} tags - Array of tag strings to apply
   * @returns {Blueprint} New Blueprint with specified tags and random seed
   *
   * @example
   * const bp = Blueprint.fromTags(['undead', 'ruins']);
   * // Creates a dungeon tagged as undead ruins with random seed
   */
  static fromTags(tags) {
    const validTags = Array.isArray(tags)
      ? tags.filter((t) => typeof t === 'string' && Tags.isValid(t))
      : [];
    return new Blueprint(Math.floor(Math.random() * 2147483647), validTags);
  }

  /**
   * Parse Blueprint configuration from URL search parameters.
   *
   * Expects URL format:
   * - `seed=12345` - RNG seed (integer)
   * - `tags=undead,ruins,dark` - Comma-separated tag list
   * - `name=My+Dungeon` - Dungeon display name (URL-encoded)
   *
   * Invalid tags are silently ignored. Missing parameters use defaults.
   *
   * @returns {Blueprint} Blueprint parsed from current window.location
   *
   * @example
   * // URL: https://example.com/?seed=999&tags=undead,fire&name=Hell
   * const bp = Blueprint.fromURL();
   * // bp.seed === 999
   * // bp.tags includes 'undead' and 'fire' (if valid)
   * // bp.name === 'Hell'
   */
  static fromURL() {
    if (typeof window === 'undefined' || !window.location) {
      return new Blueprint();
    }

    const params = new URLSearchParams(window.location.search);

    const seedParam = params.get('seed');
    const seed = seedParam ? parseInt(seedParam, 10) : 0;

    const tagsParam = params.get('tags') || '';
    const tags = tagsParam
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && Tags.isValid(t));

    const name = params.get('name') || '';

    return new Blueprint(seed, tags, name);
  }

  /**
   * Update the browser URL with current Blueprint configuration.
   *
   * Uses browser history API to replace the current URL without page reload.
   * Omits empty/default values to keep URLs clean:
   * - seed is omitted if 0
   * - tags are omitted if empty
   * - name is omitted if empty
   *
   * Safe to call even if window.location is unavailable (no-op in that case).
   *
   * @example
   * const bp = new Blueprint(999, ['undead'], 'My Crypt');
   * bp.updateURL();
   * // URL changes to: ?seed=999&tags=undead&name=My+Crypt
   */
  updateURL() {
    if (typeof window === 'undefined' || !window.location) {
      return;
    }

    const params = new URLSearchParams();

    if (this.seed && this.seed !== 0) {
      params.set('seed', String(this.seed));
    }

    if (this.tags.length > 0) {
      params.set('tags', this.tags.join(','));
    }

    if (this.name) {
      params.set('name', this.name);
    }

    const queryString = params.toString();
    const url = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

    window.history.replaceState(null, '', url);
  }

  /**
   * Add a tag to this Blueprint's tag list.
   *
   * Automatically resolves tag conflicts using the Tags module's resolution
   * strategy. For example, if you add a tag that conflicts with an existing
   * one, the conflicting tag may be replaced or removed based on the Tags
   * configuration.
   *
   * If the tag is invalid, it is silently ignored.
   *
   * @param {string} tag - Tag to add
   *
   * @example
   * const bp = new Blueprint();
   * bp.addTag('undead');
   * bp.addTag('fire');
   * // Tags are resolved for compatibility
   */
  addTag(tag) {
    if (!tag || typeof tag !== 'string') {
      return;
    }

    if (!Tags.isValid(tag)) {
      return;
    }

    this.tags = Tags.resolve(this.tags, tag);
  }

  /**
   * Remove a specific tag from this Blueprint's tag list.
   *
   * If the tag is not present, this is a no-op.
   *
   * @param {string} tag - Tag to remove
   *
   * @example
   * const bp = new Blueprint(0, ['undead', 'fire']);
   * bp.removeTag('undead');
   * // bp.tags === ['fire']
   */
  removeTag(tag) {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  /**
   * Check if a specific tag is currently set in this Blueprint.
   *
   * @param {string} tag - Tag to check for
   * @returns {boolean} True if the tag is present, false otherwise
   *
   * @example
   * const bp = new Blueprint(0, ['undead', 'fire']);
   * bp.hasTag('undead'); // true
   * bp.hasTag('water');  // false
   */
  hasTag(tag) {
    return this.tags.includes(tag);
  }

  /**
   * Get a list of all tags currently set in this Blueprint.
   *
   * Returns a copy of the internal tags array to prevent external mutation.
   *
   * @returns {string[]} Current list of tags
   *
   * @example
   * const bp = new Blueprint(0, ['undead', 'fire']);
   * const tags = bp.getTags(); // ['undead', 'fire']
   */
  getTags() {
    return [...this.tags];
  }

  /**
   * Toggle a tag on or off in this Blueprint.
   *
   * If the tag is present, it is removed. If it is not present, it is added
   * (subject to conflict resolution). Invalid tags are ignored.
   *
   * @param {string} tag - Tag to toggle
   *
   * @example
   * const bp = new Blueprint();
   * bp.toggleTag('undead'); // adds 'undead'
   * bp.toggleTag('undead'); // removes 'undead'
   */
  toggleTag(tag) {
    if (!tag || typeof tag !== 'string' || !Tags.isValid(tag)) {
      return;
    }

    if (this.hasTag(tag)) {
      this.removeTag(tag);
    } else {
      this.addTag(tag);
    }
  }

  /**
   * Get a human-readable description of this Blueprint.
   *
   * Useful for debugging and logging.
   *
   * @returns {string} Description including seed, tags, and name
   *
   * @example
   * const bp = new Blueprint(999, ['undead'], 'My Crypt');
   * bp.toString(); // "Blueprint(seed=999, tags=[undead], name='My Crypt')"
   */
  toString() {
    return `Blueprint(seed=${this.seed}, tags=[${this.tags.join(', ')}], name='${this.name}')`;
  }

  /**
   * Create a copy of this Blueprint.
   *
   * Useful for creating variations or preserving state before modifications.
   *
   * @returns {Blueprint} Deep copy of this Blueprint
   *
   * @example
   * const bp1 = new Blueprint(999, ['undead'], 'Original');
   * const bp2 = bp1.clone();
   * bp2.addTag('fire');
   * // bp1 still has only 'undead', bp2 has both 'undead' and 'fire'
   */
  clone() {
    return new Blueprint(this.seed, [...this.tags], this.name);
  }

  /**
   * Serialize this Blueprint to a shareable URL string.
   *
   * Creates a full URL with this Blueprint's configuration as parameters.
   * Useful for generating shareable links to specific dungeons.
   *
   * @param {string} [baseURL=''] - Optional base URL (defaults to current origin)
   * @returns {string} Full URL with Blueprint parameters
   *
   * @example
   * const bp = new Blueprint(999, ['undead'], 'My Crypt');
   * const url = bp.toURL('https://dungeongenerator.com');
   * // "https://dungeongenerator.com?seed=999&tags=undead&name=My+Crypt"
   */
  toURL(baseURL = '') {
    const params = new URLSearchParams();

    if (this.seed && this.seed !== 0) {
      params.set('seed', String(this.seed));
    }

    if (this.tags.length > 0) {
      params.set('tags', this.tags.join(','));
    }

    if (this.name) {
      params.set('name', this.name);
    }

    const queryString = params.toString();
    const separator = baseURL && queryString ? '?' : '';
    return baseURL + separator + queryString;
  }
}

export default Blueprint;
