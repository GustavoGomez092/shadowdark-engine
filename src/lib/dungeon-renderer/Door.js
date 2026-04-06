import Dot from './Dot.js';
import { rng } from './Random.js';

/**
 * Door - represents a passageway between two rooms or to the exterior.
 * Extends Dot for position on the dungeon grid.
 */
export default class Door extends Dot {
  // Array of "regular" door types used for randomType fallOff and isRegular check
  static REGULAR = [1, 2, 0]; // [ARCHWAY, SECRET, REGULAR]

  // Door type constants
  static ENTRANCE = 3;
  static LOCKED = 4;
  static BOSS_GATE = 5;
  static SECRET_ENTRANCE = 6;
  static IMPASSABLE = 7;
  static STAIRS_DOWN = 8;
  static STEPS = 9;

  /**
   * Constructor - creates a door at a position connecting two rooms.
   * Auto-assigns type and direction matching original behavior.
   *
   * @param {Dot} pos - door position on grid
   * @param {Room|null} from - source room (can be null for external doors)
   * @param {Room|null} to - destination room (can be null for external doors)
   */
  constructor(pos, from = null, to = null) {
    super(pos.x, pos.y);

    this.from = from;
    this.to = to;

    // Auto-type based on rooms (matching original Wc.autoType)
    this.type = Door.autoType(from, to);

    // Direction from room.out()
    if (from != null) {
      this.dir = from.out(this);
    } else if (to != null) {
      const d = to.out(this);
      this.dir = d ? new Dot(-d.x, -d.y) : null;
    } else {
      this.dir = null;
    }
  }

  /**
   * Auto-determine door type based on connected rooms.
   * Matches original Wc.autoType exactly.
   */
  static autoType(from, to) {
    if (to == null) return 8;       // No destination -> STAIRS_DOWN
    if (from == null) return 3;     // No source -> ENTRANCE
    // If either room is large (>3x3), use random type
    if ((from.w > 3 && from.h > 3) || (to.w > 3 && to.h > 3)) {
      return Door.randomType();
    }
    return 0; // REGULAR
  }

  /**
   * Generate a random door type using fall-off distribution.
   * Uses REGULAR array [1, 2, 0] with power-law bias toward index 0.
   */
  static randomType() {
    return rng.fallOff(Door.REGULAR);
  }

  /**
   * Check if door is a "regular" passage type.
   * Regular types are those in the REGULAR array: 0, 1, 2.
   */
  isRegular() {
    return Door.REGULAR.indexOf(this.type) !== -1;
  }
}
