/**
 * Tags class manages dungeon generation tags — string labels that control dungeon properties.
 * Tags are organized into conflict groups where only one tag per group can be active simultaneously.
 * Attempting to add a conflicting tag automatically removes the previous tag in that group.
 *
 * @class Tags
 */
class Tags {
  /**
   * Complete list of all valid dungeon generation tags.
   * @type {string[]}
   * @static
   * @private
   */
  static #VALID_TAGS = [
    'chaotic',
    'ordered',
    'winding',
    'compact',
    'cramped',
    'spacious',
    'large',
    'medium',
    'small',
    'string',
    'flat',
    'deep',
    'secret',
    'no secrets',
    'treasure',
    'dangerous',
    'round',
    'square',
    'colonnades',
    'dry',
    'wet',
    'flooded',
    'temple',
    'tomb',
    'dwelling',
    'crumbling',
    'multi-level',
    'single-level',
    'backdoor',
    'no backdoor'
  ];

  /**
   * Maps tags to their conflict groups.
   * Tags in the same group are mutually exclusive.
   * @type {Map<string, string[]>}
   * @static
   * @private
   */
  static #CONFLICT_GROUPS = new Map([
    ['chaotic', ['chaotic', 'ordered']],
    ['ordered', ['chaotic', 'ordered']],
    ['winding', ['winding', 'compact']],
    ['compact', ['winding', 'compact']],
    ['cramped', ['cramped', 'spacious']],
    ['spacious', ['cramped', 'spacious']],
    ['large', ['large', 'medium', 'small']],
    ['medium', ['large', 'medium', 'small']],
    ['small', ['large', 'medium', 'small']],
    ['round', ['round', 'square']],
    ['square', ['round', 'square']],
    ['dry', ['dry', 'wet', 'flooded']],
    ['wet', ['dry', 'wet', 'flooded']],
    ['flooded', ['dry', 'wet', 'flooded']],
    ['single-level', ['single-level', 'multi-level']],
    ['multi-level', ['single-level', 'multi-level']],
    ['secret', ['secret', 'no secrets']],
    ['no secrets', ['secret', 'no secrets']],
    ['backdoor', ['backdoor', 'no backdoor']],
    ['no backdoor', ['backdoor', 'no backdoor']],
    ['flat', ['flat', 'deep']],
    ['deep', ['flat', 'deep']],
    ['string', ['string', 'secret']]
  ]);

  /**
   * Resolves tag conflicts by adding a new tag and removing any conflicting tags.
   * If the new tag conflicts with existing tags in the currentTags array,
   * those conflicting tags are removed before adding the new tag.
   *
   * Special case: 'string' tag excludes 'secret' tag and vice versa.
   *
   * @static
   * @param {string[]} currentTags - Array of currently active tags
   * @param {string} newTag - Tag to add
   * @returns {string[]} New array of tags with conflicts resolved
   *
   * @example
   * const tags = ['ordered', 'dry'];
   * const updated = Tags.resolve(tags, 'chaotic'); // ['chaotic', 'dry']
   *
   * @example
   * const tags = ['secret'];
   * const updated = Tags.resolve(tags, 'string'); // ['string']
   */
  static resolve(currentTags, newTag) {
    // Validate the new tag
    if (!Tags.isValid(newTag)) {
      return currentTags;
    }

    // Get the conflict group for the new tag
    const conflictGroup = Tags.#CONFLICT_GROUPS.get(newTag);

    // Remove conflicting tags in-place
    if (conflictGroup) {
      for (let i = currentTags.length - 1; i >= 0; i--) {
        if (conflictGroup.includes(currentTags[i])) {
          currentTags.splice(i, 1);
        }
      }
    }

    // Add the new tag
    if (!currentTags.includes(newTag)) {
      currentTags.push(newTag);
    }

    return currentTags;
  }

  /**
   * Checks whether a given tag is in the valid tags list.
   *
   * @static
   * @param {string} tag - Tag to validate
   * @returns {boolean} True if tag is valid, false otherwise
   *
   * @example
   * Tags.isValid('dry'); // true
   * Tags.isValid('invalid-tag'); // false
   */
  static isValid(tag) {
    return Tags.#VALID_TAGS.includes(tag);
  }

  /**
   * Returns a copy of the complete array of all valid dungeon generation tags.
   *
   * @static
   * @returns {string[]} Array of all valid tags
   *
   * @example
   * const allTags = Tags.getAll();
   * console.log(allTags.length); // 31
   */
  static getAll() {
    return [...Tags.#VALID_TAGS];
  }

  /**
   * Tag anchors: maps words in dungeon names to generation tags.
   * Parsed from tags.txt format.
   */
  static #ANCHORS = (() => {
    const map = new Map();
    const lines = [
      "lair: chaotic, winding, treasure, dangerous",
      "maze: chaotic, winding, colonnades, dangerous, flat",
      "labyrinth: winding, large",
      "catacombs: chaotic, large, wet, dangerous",
      "tomb: tomb, colonnades, deep",
      "sepulcher: tomb",
      "castle, citadel: deep",
      "crypt, mausoleum: cramped, tomb",
      "pyramid: ordered, square, tomb",
      "temple: ordered, large, spacious, round, colonnades, temple",
      "shrine: temple",
      "sanctum: temple, colonnades",
      "monastery: large, temple, dwelling",
      "abbey: large, secret, temple, dwelling",
      "chapel: small, compact, temple",
      "halls: large, spacious, chaotic, dwelling",
      "hall: small, spacious, chaotic, dwelling",
      "chambers, mansion, manor: dwelling",
      "house: small, compact, square, secret, dwelling",
      "palace: ordered, large, treasure, colonnades, dwelling, deep",
      "basilica: square, ordered, compact, colonnades",
      "dungeon: chaotic, secret, dangerous",
      "observatory: compact, round",
      "vault: secret, treasure",
      "prison: large, compact, square, dangerous, dwelling",
      "asylum: compact, square, dangerous, dwelling",
      "library, archive: ordered, large, compact, round",
      "vampire, undead: tomb",
      "king, queen, emperor: dwelling",
      "ruined, shattered, mountain, undeground, subterranean: crumbling",
      "sunken, underwater: flooded",
      "desert, frozen: dry",
      "swamp: wet",
      "chaos: chaotic"
    ];
    for (const line of lines) {
      const [words, tags] = line.split(':').map(s => s.trim());
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
      for (const word of words.split(',').map(w => w.trim())) {
        map.set(word.toLowerCase(), tagList);
      }
    }
    return map;
  })();

  /**
   * Derive tags from a dungeon name by looking up each word.
   * Matches original cd.deriveTags.
   */
  static deriveTags(name) {
    const result = [];
    const words = name.toLowerCase().split(/\s+/);
    for (const word of words) {
      const tags = Tags.#ANCHORS.get(word);
      if (tags) {
        for (const tag of tags) {
          if (!result.includes(tag)) {
            result.push(tag);
          }
        }
      }
    }
    return result;
  }

  /**
   * Returns all tags that conflict with the given tag (excluding the tag itself).
   * Conflicting tags are those in the same conflict group that cannot coexist.
   *
   * @static
   * @param {string} tag - Tag to find conflicts for
   * @returns {string[]} Array of conflicting tags, or empty array if tag is invalid or has no conflicts
   *
   * @example
   * Tags.getConflicts('dry'); // ['wet', 'flooded']
   * Tags.getConflicts('chaotic'); // ['ordered']
   * Tags.getConflicts('invalid'); // []
   */
  static getConflicts(tag) {
    if (!Tags.isValid(tag)) {
      return [];
    }

    const conflictGroup = Tags.#CONFLICT_GROUPS.get(tag);
    // Return all conflicts except the tag itself
    return conflictGroup.filter(t => t !== tag);
  }
}

export default Tags;
