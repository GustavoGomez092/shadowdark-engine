import Rect from './Rect.js';
import Dot from './Dot.js';
import { rng } from './Random.js';
import Parameters from './Parameters.js';

/**
 * Room - represents a dungeon room as a rectangular area with connections.
 * Extends Rect for position and dimensions on the dungeon grid.
 * Manages doors, properties, and metadata for a single room.
 */
export default class Room extends Rect {
  /**
   * Direction constants for room axes and doors
   */
  static UP = new Dot(0, -1);
  static DOWN = new Dot(0, 1);
  static LEFT = new Dot(-1, 0);
  static RIGHT = new Dot(1, 0);

  /**
   * Constructor - creates a room positioned relative to an origin point
   * along a specified axis with given dimensions.
   *
   * @param {Dot} origin - entry point from parent room
   * @param {Dot} axis - direction room extends (UP/DOWN/LEFT/RIGHT as Dot vectors)
   * @param {number} width - room width perpendicular to axis (in tiles)
   * @param {number} depth - room depth along axis direction (in tiles)
   * @param {number} mirror - symmetry flag: -1 or 1
   */
  constructor(origin, axis, width, depth, mirror = 1) {
    // Calculate bounding rectangle based on axis direction
    let x, y, w, h;

    if (axis.x === 0 && axis.y === -1) {
      // UP: room extends upward from origin
      x = origin.x - Math.floor(width / 2);
      y = origin.y - depth + 1;
      w = width;
      h = depth;
    } else if (axis.x === 0 && axis.y === 1) {
      // DOWN: room extends downward from origin
      x = origin.x - Math.floor(width / 2);
      y = origin.y;
      w = width;
      h = depth;
    } else if (axis.x === -1 && axis.y === 0) {
      // LEFT: room extends leftward from origin
      x = origin.x - depth + 1;
      y = origin.y - Math.floor(width / 2);
      w = depth;
      h = width;
    } else if (axis.x === 1 && axis.y === 0) {
      // RIGHT: room extends rightward from origin
      x = origin.x;
      y = origin.y - Math.floor(width / 2);
      w = depth;
      h = width;
    } else {
      throw new Error('Invalid axis direction');
    }

    super(x, y, w, h);

    this.origin = origin;
    this.axis = axis;
    this.width = width;
    this.depth = depth;
    this.mirror = mirror;

    // Metadata (seed assigned externally by Dungeon builder)
    this.seed = 0;
    this.symm = false; // Has symmetrical counterpart
    this.round = false; // Circular room
    this.columns = false; // Has colonnade
    this.hidden = false; // Secret room

    // Reference to parent dungeon
    this.dungeon = null;

    // Feature flags (all default false)
    this.enemy = false;
    this.loot = false;
    this.key = false;
    this.gate = false;
    this.event = false;
    this.enviro = false;

    // Room contents
    this.props = []; // Array of prop objects
    this.desc = null; // Room description text (set by Story/Planner)
    this.note = null; // { point: Dot, text: string, symb: string }
  }

  /**
   * Get rotated bounding box (matches original zg.prototype.getBounds).
   * Round rooms rotate their center and return a square bounding box.
   * Non-round rooms delegate to Rect.getBounds.
   *
   * @param {number} sinA - sine of rotation angle
   * @param {number} cosA - cosine of rotation angle
   * @returns {Rect}
   */
  getBounds(sinA = 0, cosA = 1) {
    if (this.round) {
      const c = this.w / 2;
      const d = this.center(); // {x: this.x + this.w/2, y: this.y + this.h/2}
      // Rotate center: (x*cos - y*sin, y*cos + x*sin)
      const rx = d.x * cosA - d.y * sinA;
      const ry = d.y * cosA + d.x * sinA;
      return new Rect(rx - c, ry - c, 2 * c, 2 * c);
    }
    return super.getBounds(sinA, cosA);
  }

  /**
   * Convert local room coordinates to world coordinates.
   * Local coordinates are relative to room origin point, using cross/depth offsets.
   * Cross offset is perpendicular to axis, depth offset is along axis.
   *
   * @param {number} crossOffset - perpendicular to axis direction
   * @param {number} depthOffset - along axis direction
   * @returns {Dot} world coordinates
   */
  xy(a, b) {
    // Original formula: x = origin.x - a*axis.y*mirror + b*axis.x
    //                   y = origin.y + b*axis.y + a*axis.x*mirror
    return new Dot(
      this.origin.x - a * this.axis.y * this.mirror + b * this.axis.x,
      this.origin.y + b * this.axis.y + a * this.axis.x * this.mirror
    );
  }

  /**
   * Determine which wall (direction) a door is on relative to the room.
   *
   * @param {Door} door - door to check
   * @returns {Dot} direction (UP/DOWN/LEFT/RIGHT)
   */
  out(door) {
    if (door.x === this.x) return Room.LEFT;
    if (door.x === this.x + this.w - 1) return Room.RIGHT;
    if (door.y === this.y) return Room.UP;
    if (door.y === this.y + this.h - 1) return Room.DOWN;
    return null;
  }

  /**
   * Get descriptive word for room type based on dimensions.
   * Uses RNG for random word selection matching original.
   */
  word() {
    if (this.w > 3 && this.h > 3) {
      const inner = (this.w - 2) * (this.h - 2);
      if (inner >= 21) return rng.pick(["large room", "large chamber", "hall"]);
      if (inner >= 15) return rng.pick(["room", "chamber"]);
      return rng.pick(["small room", "small chamber"]);
    }
    return rng.fallOff(["corridor", "passage"]);
  }

  /**
   * Check if room can be rendered as circular.
   * Requires square room (w==h) with minimum size 5, and odd dimensions.
   *
   * @returns {boolean}
   */
  canBeRound() {
    if (this.w !== this.h || this.w <= 3) return false;
    // All doors must be at cardinal midpoints
    const a = this.xy(0, 0);
    const b = this.xy(-(this.width >> 1), this.depth >> 1);
    const c = this.xy(this.width >> 1, this.depth >> 1);
    const d = this.xy(0, this.depth - 1);
    const doors = this.getDoors();
    for (const door of doors) {
      if (!((door.x === a.x && door.y === a.y) ||
            (door.x === b.x && door.y === b.y) ||
            (door.x === c.x && door.y === c.y) ||
            (door.x === d.x && door.y === d.y))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all doors connected to this room (incoming or outgoing).
   *
   * @returns {Array<Door>} doors where this room is from or to
   */
  getDoors() {
    if (!this.dungeon || !this.dungeon.doors) return [];
    return this.dungeon.doors.filter(door => door.from === this || door.to === this);
  }

  /**
   * Get the entrance door to this room.
   *
   * @returns {Door|null} door where door.to === this
   */
  getEntrance() {
    if (!this.dungeon || !this.dungeon.doors) return null;
    for (const door of this.dungeon.doors) {
      if (door.to === this) return door;
    }
    return null;
  }

  /**
   * Get the door connecting this room to another room.
   * Matches original Room.getDoor(otherRoom) (line 8872).
   *
   * @param {Room} otherRoom - The other room
   * @returns {Door|null} door connecting the two rooms
   */
  getDoor(otherRoom) {
    if (!this.dungeon || !this.dungeon.doors) return null;
    for (const door of this.dungeon.doors) {
      if ((door.from === this && door.to === otherRoom) ||
          (door.from === otherRoom && door.to === this)) {
        return door;
      }
    }
    return null;
  }

  /**
   * Get all exit doors from this room.
   *
   * @returns {Array<Door>} doors where door.from === this
   */
  getExits() {
    const doors = this.getDoors();
    return doors.filter(door => door.from === this);
  }

  /**
   * Get door on north wall (UP direction).
   *
   * @returns {Door|null}
   */
  getDoorW() {
    const doors = this.getDoors();
    for (const d of doors) {
      if (d.x === this.x && d.y >= this.y && d.y < this.y + this.h) return d;
    }
    return null;
  }

  getDoorE() {
    const doors = this.getDoors();
    for (const d of doors) {
      if (d.x === this.x + this.w - 1 && d.y >= this.y && d.y < this.y + this.h) return d;
    }
    return null;
  }

  getDoorN() {
    const doors = this.getDoors();
    for (const d of doors) {
      if (d.y === this.y && d.x >= this.x && d.x < this.x + this.w) return d;
    }
    return null;
  }

  getDoorS() {
    const doors = this.getDoors();
    for (const d of doors) {
      if (d.y === this.y + this.h - 1 && d.x >= this.x && d.x < this.x + this.w) return d;
    }
    return null;
  }

  /**
   * Check if a wall has no door (solid/impassable).
   *
   * @param {Dot} direction - wall direction (UP/DOWN/LEFT/RIGHT)
   * @returns {boolean} true if no door on that wall
   */
  isSolid(direction) {
    const door = this.getWallDoor(direction);
    return door != null ? door.type === 6 : true;
  }

  /**
   * Get door on a specific wall by direction.
   */
  getWallDoor(direction) {
    const doors = this.getDoors();
    for (const door of doors) {
      const wall = this.out(door);
      if (wall && wall.x === direction.x && wall.y === direction.y) {
        return door;
      }
    }
    return null;
  }

  // center() inherited from Rect — returns float {x + w/2, y + h/2}

  /**
   * Check if room description matches any of the given keywords.
   */
  checkDesc(keywords) {
    if (!this.desc) return false;
    const lower = this.desc.toLowerCase();
    for (const kw of keywords.split(',')) {
      if (lower.includes(kw)) return true;
    }
    return false;
  }

  /**
   * Get position for aisle (one cell before back wall).
   */
  aisle() {
    const p = this.xy(0, this.depth - 2);
    return { x: p.x + 0.5, y: p.y + 0.5 };
  }

  /**
   * Check if the aisle position is available for props.
   */
  aisleAvailable() {
    const backDoor = this.dungeon ? this.dungeon.getDoor(this.xy(0, this.depth - 1)) : null;
    return backDoor != null ? backDoor.type === 6 : true;
  }

  /**
   * Scatter a position randomly within the room.
   * Round rooms: 2 RNG calls. Rectangular: 4 RNG calls.
   */
  scatter(size) {
    const rect = this.inflate(-1, -1);
    if (this.round) {
      const c = this.center();
      const radius = ((rect.w - size) / 2) * Math.pow(rng.float(), 0.25);
      const angle = 2 * Math.PI * rng.float();
      return {
        x: Math.cos(angle) * radius + c.x,
        y: Math.sin(angle) * radius + c.y
      };
    }
    // Rectangular: 4 RNG calls
    const cx = Math.pow(rng.float(), 1 / 3) * (rng.float() < 0.5 ? 0.5 : -0.5) + 0.5;
    const cy = Math.pow(rng.float(), 1 / 3) * (rng.float() < 0.5 ? 0.5 : -0.5) + 0.5;
    return {
      x: rect.x + size / 2 + cx * (rect.w - size),
      y: rect.y + size / 2 + cy * (rect.h - size)
    };
  }

  /**
   * Create props for this room. Matches original RNG consumption pattern exactly.
   */
  createProps() {
    this.props = [];
    const rect = this.inflate(-1, -1);
    const area = rect.w * rect.h;
    const isCrumbling = this.dungeon && this.dungeon.tags.includes('crumbling');

    // PHASE 1: DEBRIS
    let debrisCount = 1 + ((rng.float() * area / (isCrumbling ? 2 : 4)) | 0);
    if (this.checkDesc('rubble,debris')) debrisCount += 3;

    // Skip drawing debris in very small rooms (3x3 corridors/junctions) to avoid
    // visual clutter, but still consume RNG calls to preserve the seeded sequence.
    const skipDebris = (this.w <= 3 && this.h <= 3);
    for (let i = 0; i < debrisCount; i++) {
      let h = rng.float();
      h = 0.1 + (isCrumbling ? 0.6 : 0.4) * h * h * h;
      const pos = this.scatter(h);
      rng.float(); // la.random pick from boulders
      const rotation = Math.PI * rng.float();
      if (!skipDebris) {
        this.props.push({ type: 'boulder', pos, rotation, scale: h });
      }
    }

    // PHASE 2: Description-based props (check desc keywords)
    let descProp = null;
    if (this.checkDesc('throne') && this.aisleAvailable()) {
      descProp = { type: 'throne', pos: this.aisle() };
    } else if (this.checkDesc('well') && this.aisleAvailable()) {
      descProp = { type: 'well', pos: this.aisle() };
    } else if (this.checkDesc('statue,sculpture') && this.aisleAvailable()) {
      descProp = { type: 'statue', pos: this.aisle() };
    } else if (this.checkDesc('sarcophagus,coffin') && this.aisleAvailable()) {
      descProp = { type: 'sarcophagus', pos: this.aisle() };
    } else if (this.checkDesc('altar,pedestal') && this.aisleAvailable()) {
      descProp = { type: 'altar', pos: this.aisle() };
    } else if (this.checkDesc('chest') && this.aisleAvailable()) {
      descProp = { type: 'chest', pos: this.aisle() };
    } else if (this.checkDesc('crate,box,trunk') && !this.columns) {
      descProp = this._addCrate();
    } else if (this.checkDesc('tapestry') && !this.round) {
      descProp = this._addTapestry();
    }

    if (this.checkDesc('pool,puddle') && this.dungeon && this.dungeon.flood) {
      this.dungeon.flood.pools.push({ x: this.x + 1, y: this.y + 1 });
    }

    if (descProp) this.props.push(descProp);

    // PHASE 3: Random furniture (big rooms, no columns, not special, no desc prop)
    if (this.w > 3 && this.h > 3 && !this.columns &&
        this.dungeon && this.dungeon.planner && !this.dungeon.planner.isSpecial(this) &&
        descProp == null) {

      let tryFountain = false;
      if (!this.desc) {
        tryFountain = rng.float() < Parameters.fountainChance;
      }

      if (tryFountain) {
        Parameters.fountainChance /= 2;
        const scale = 1.5 * Math.sqrt((Math.min(this.w, this.h) - 2) / 3);
        this.props.push({ type: 'fountain', pos: this.center(), scale });
      } else {
        let tryWell = false;
        if (!this.desc) {
          tryWell = rng.float() < Parameters.wellChance * (this.round ? 2 : 1);
        }

        if (tryWell) {
          Parameters.wellChance = 0;
          this.props.push({ type: 'well', pos: this.center() });
        } else {
          // Crates/barrels check
          if (rng.float() < 1 / 3) {
            const count = (rng.float() * area / 5) | 0;
            if (rng.float() < 2 / 3) {
              // Crates
              for (let i = 0; i < count; i++) {
                this.props.push(this._addCrate());
              }
            } else {
              // Barrels
              const barrelSize = 0.6 + 0.4 * ((rng.float() + rng.float() + rng.float()) / 3);
              for (let i = 0; i < count; i++) {
                const pos = this.scatter(barrelSize);
                const rotation = Math.PI * rng.float();
                this.props.push({ type: 'barrel', pos, rotation, scale: barrelSize });
              }
            }
          }

          // Tapestry check
          if (!this.round) {
            const backDoorPos = this.xy(0, this.depth - 1);
            const backDoor = this.dungeon ? this.dungeon.getDoor(backDoorPos) : null;
            let tryTapestry = false;
            if (backDoor == null) {
              tryTapestry = rng.float() < Parameters.tapestryChance / this.width;
            } else if (backDoor.type === 6) {
              tryTapestry = true;
            }
            if (tryTapestry) {
              this.props.push(this._addTapestry());
            }
          }
        }
      }
    }

    // PHASE 4: Last room special props
    if (this.dungeon && this.dungeon.planner && this === this.dungeon.planner.last) {
      if (this.width <= 5) this.columns = false;

      if (this.dungeon.tags.includes('multi-level')) {
        if (rng.float() < 0.5) {
          this.props.push({ type: 'statue', pos: this.center() });
        } else if (!this.round) {
          this.props.push({ type: 'dais', pos: this.aisle(), axis: this.axis });
        }
      } else {
        const pos = this.round ? this.center() : this.aisle();
        this.props.push({
          type: this.round ? 'smallDais' : 'dais',
          pos, axis: this.axis
        });

        let themeType = 'statue';
        if (this.dungeon.tags.includes('temple')) themeType = 'altar';
        else if (this.dungeon.tags.includes('tomb')) themeType = 'sarcophagus';
        else if (this.dungeon.tags.includes('dwelling')) themeType = 'throne';
        this.props.push({ type: themeType, pos, axis: this.axis });
      }
    }
  }

  /** Add a crate prop (3 RNG for size + scatter + 1 RNG for rotation) */
  _addCrate() {
    const size = 0.4 + 0.6 * ((rng.float() + rng.float() + rng.float()) / 3);
    const pos = this.scatter(size);
    const rotation = Math.PI * rng.float();
    return { type: 'crate', pos, rotation, scale: size };
  }

  /** Add a tapestry prop (no RNG consumed) */
  _addTapestry() {
    const pos = this.aisle();
    return { type: 'tapestry', pos, width: this.width - 2, axis: this.axis };
  }
}
