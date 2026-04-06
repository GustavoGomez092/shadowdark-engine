import { rng } from './Random.js';

/**
 * Parameters class holds static configuration values that control all aspects of dungeon generation.
 * All values are initialized by the init() method based on dungeon tags, allowing dynamic
 * configuration of generation parameters.
 *
 * @class Parameters
 */
class Parameters {
  /**
   * Radius of cylindrical columns as a fraction of cell size (0.0 to 0.5).
   * @type {number}
   * @static
   */
  static columnRadius = 0.15;

  /**
   * Whether columns should be rendered as squares instead of circles.
   * @type {boolean}
   * @static
   */
  static columnSquare = false;

  /**
   * Chance (0.0 to 1.0) that individual column segments will be shattered or crumbled.
   * @type {number}
   * @static
   */
  static columnShattered = 0.0125;

  /**
   * Chance (0.0 to 1.0) that stairs will appear between elevation levels.
   * @type {number}
   * @static
   */
  static stepsChance = 0.1;

  /**
   * Multiplier for rotunda (circular room) appearance frequency. Higher values increase prevalence.
   * @type {number}
   * @static
   */
  static rotundaChance = 1;

  /**
   * Multiplier for colonnade (pillared corridor) appearance frequency. Higher values increase prevalence.
   * @type {number}
   * @static
   */
  static colonnadeChance = 1;

  /**
   * Water level as a fraction of dungeon depth (0.0 to 1.0).
   * 0 = dry, 1.0 = completely flooded.
   * Original default: Wa.waterLevel = 0.3
   * @type {number}
   * @static
   */
  static waterLevel = 0.3;

  /**
   * Chance (0.0 to 1.0) that decorative fountains will appear in rooms.
   * @type {number}
   * @static
   */
  static fountainChance = 0.1;

  /**
   * Chance (0.0 to 1.0) that wells will appear in rooms.
   * @type {number}
   * @static
   */
  static wellChance = 0.02;

  /**
   * Chance (0.0 to 1.0) that tapestries will appear on walls.
   * @type {number}
   * @static
   */
  static tapestryChance = 0.333;

  /**
   * Chance (0.0 to 1.0) that floor cracks will appear.
   * @type {number}
   * @static
   */
  static crackChance = 0.125;

  /**
   * Type of impassable door (barred=4, locked=7).
   * Determines the appearance and mechanics of locked/blocked doors.
   * @type {number}
   * @static
   */
  static impassable = 4;

  /**
   * Initializes all parameter values based on the provided dungeon tags.
   * Each tag category influences specific parameters to create themed dungeons.
   *
   * Tag influences:
   * - 'crumbling': Increases column shattering and cracks, reduces tapestries
   * - 'flat': No stairs between levels
   * - 'deep': Frequent stairs between levels
   * - 'round': Increased rotundas (circular rooms)
   * - 'square': No rotundas
   * - 'colonnades': Doubled colonnade frequency
   * - 'dry': No water
   * - 'flooded': 60% water level
   * - 'wet': 30% water level
   * - 'tomb': Rare fountains (2%)
   * - 'dwelling': Common wells (20%) and tapestries (100%)
   *
   * @static
   * @param {string[]} tags - Array of dungeon generation tags
   * @returns {void}
   *
   * @example
   * Parameters.init(['deep', 'crumbling', 'round']);
   */
  static init(tags) {
    // Column radius: 1 / (6 + 2 * (avg3 * 2 - 1))
    const avg3 = rng.averageN(3);
    Parameters.columnRadius = 1 / (6 + 2 * (avg3 * 2 - 1));

    // Column shape: 25% chance for square columns instead of circular
    Parameters.columnSquare = rng.chance(0.25);

    // Crumbling: significantly increases column deterioration
    Parameters.columnShattered = tags.includes('crumbling') ? 0.1 : 0.0125;

    // Steps/stairs between elevation levels
    if (tags.includes('flat')) {
      Parameters.stepsChance = 0;
    } else if (tags.includes('deep')) {
      Parameters.stepsChance = 0.5;
    } else {
      Parameters.stepsChance = 0.1;
    }

    // Rotunda (circular room) generation
    if (tags.includes('round')) {
      Parameters.rotundaChance = 5;
    } else if (tags.includes('square')) {
      Parameters.rotundaChance = 0;
    } else {
      Parameters.rotundaChance = 1;
    }

    // Colonnades (pillared corridors)
    Parameters.colonnadeChance = tags.includes('colonnades') ? 2 : 1;

    // Water level determination
    if (tags.includes('dry')) {
      Parameters.waterLevel = 0;
    } else if (tags.includes('flooded')) {
      Parameters.waterLevel = 0.6;
    } else if (tags.includes('wet')) {
      Parameters.waterLevel = 0.3;
    } else {
      // Random water level: average of 3 random floats, scaled to 0-0.9
      const avg3w = rng.averageN(3);
      Parameters.waterLevel = Math.round(Math.max(6 * avg3w - 2, 0)) / 10;
    }

    // Decorative features: fountains, wells, tapestries
    Parameters.fountainChance = tags.includes('tomb') ? 0.02 : 0.1;
    Parameters.wellChance = tags.includes('dwelling') ? 0.2 : 0.02;
    Parameters.tapestryChance = tags.includes('dwelling') ? 1 : 1/3;

    // Reduce decorations in deteriorated environments
    if (tags.includes('crumbling')) {
      Parameters.tapestryChance /= 3;
    }
    if (tags.includes('flooded')) {
      Parameters.tapestryChance /= 3;
    }

    // Floor cracks increase significantly in crumbling dungeons
    Parameters.crackChance = tags.includes('crumbling') ? 1/3 : 0.125;

    // Door impassability: random choice between barred (4) and locked (7)
    Parameters.impassable = rng.chance(0.5) ? 4 : 7;
  }
}

export default Parameters;
