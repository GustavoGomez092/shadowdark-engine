import { rng } from './Random.js';
import Dot from './Dot.js';
import Rect from './Rect.js';
import Room from './Room.js';
import Door from './Door.js';
import Parameters from './Parameters.js';
import Graph from './Graph.js';
import Deck from './Deck.js';
import Planner from './Planner.js';
import Flood from './Flood.js';
import Story from './Story.js';
import Tags from './Tags.js';

/**
 * Dungeon - The core generator for the One Page Dungeon.
 * Matches original com.watabou.dungeon.model.Dungeon exactly.
 */
class Dungeon {
  constructor() {
    this.rooms = [];
    this.doors = [];
    this.blocks = [];
    this.tags = [];
    this.minSize = 6;
    this.maxSize = 15;
    this.style = [0, 0, 0, 1, 2, 3, 3];
    this.order = [true, true, true, true, false];
    this.queue = [];
    this.reflections = new Map();
    this.symmetry = null; // Deck instance
    this.seed = 0;
    this.planner = null;
    this.flood = null;
  }

  /**
   * Main generation algorithm.
   * Matches original: constructor does rng.reset + Story + Parameters.init,
   * then build() does room generation.
   * @param {number} seed - Master seed for RNG
   * @param {string[]} requestedTags - Generation tags from blueprint
   */
  build(seed, requestedTags) {
    this.seed = seed;
    rng.reset(seed);

    // === ORIGINAL CONSTRUCTOR LOGIC ===
    // Tag retry loop: create Story, derive tags, retry until match
    if (requestedTags && requestedTags.length > 0) {
      let found = false;
      let tolerance = 0;
      do {
        for (let d = 0; d < 20; d++) {
          this.tags = [];
          this.story = new Story(this);
          // Check if derived tags satisfy requested tags
          const missing = requestedTags.filter(t => !this.tags.includes(t));
          if (missing.length <= tolerance) {
            found = true;
            break;
          }
        }
        tolerance++;
      } while (!found);

      // Force-add any remaining requested tags via resolve
      for (const tag of requestedTags) {
        if (!this.tags.includes(tag)) {
          Tags.resolve(this.tags, tag);
        }
      }
    } else {
      this.tags = [];
      this.story = new Story(this);
    }

    // Parameters.init uses the dungeon's tags (which now include derived tags)
    Parameters.init(this.tags);

    // Set water flag in story if water level > 0
    if (Parameters.waterLevel > 0 && this.story) {
      this.story.setFlag('water');
    }

    // === ORIGINAL BUILD LOGIC ===
    const tags = this.tags;

    // Configure size based on tags
    if (tags.includes('small')) {
      this.minSize = 3;
      this.maxSize = 6;
    } else if (tags.includes('large')) {
      this.minSize = 12;
      this.maxSize = 25;
    } else if (tags.includes('medium')) {
      this.minSize = 6;
      this.maxSize = 12;
    }

    // Configure symmetry order
    if (tags.includes('chaotic')) {
      this.order = [false];
    } else if (tags.includes('ordered')) {
      this.order = [true, true, true, true, true, true, false];
    }

    // Configure room style patterns
    if (tags.includes('cramped')) {
      this.style = [0, 0, 0, 2, 3, 3];
    } else if (tags.includes('spacious')) {
      this.style = [0, 0, 1, 1, 2, 3];
    } else if (tags.includes('winding')) {
      this.style = [0, 0, 1, 2, 2, 3, 3, 3, 3];
    } else if (tags.includes('compact')) {
      this.style = [0, 0, 0, 1];
    }

    // Create symmetry deck (shuffled order array)
    this.symmetry = new Deck(this.order);

    // RETRY LOOP: Generate until we have enough rooms (infinite loop, no counter)
    for (;;) {
      this.rooms = [];
      this.doors = [];
      this.blocks = [];
      this.queue = [];

      const size = this.getRoomSize();
      const axis = rng.pick([Dot.UP, Dot.DOWN, Dot.LEFT, Dot.RIGHT]);

      // First room seed = current rng state value
      this.queueRoom(rng.seed, null, new Dot(0, 0), axis, size);

      while (this.queue.length > 0 && this.getSize() < this.maxSize) {
        this.buildRoom();
      }

      if (this.getSize() >= this.minSize) {
        break;
      }
    }

    // Group rooms by seed for symmetry reflection handling.
    // Use ascending seed order to match original Haxe IntMap iteration
    // (V8 iterates plain-object integer keys in ascending numeric order).
    const reflTemp = new Map();
    for (const room of this.rooms) {
      if (!reflTemp.has(room.seed)) {
        reflTemp.set(room.seed, []);
      }
      reflTemp.get(room.seed).push(room);
    }
    // Re-insert in ascending seed order
    this.reflections = new Map(
      [...reflTemp.entries()].sort((a, b) => a[0] - b[0])
    );

    // Expand rooms along their primary axes
    this.grow();

    // Plan room designations
    this.planner = new Planner(this);
    this.planner.plan();

    // Multi-level: add stairs down from boss room
    if (tags.includes('multi-level') && this.planner.last) {
      const bossRoom = this.planner.last;
      const stairDoor = new Door(bossRoom.xy(0, bossRoom.depth - 1), bossRoom, null);
      stairDoor.type = 8; // STAIRS_DOWN
      this.doors.push(stairDoor);
    }

    // Create loops (connections between distant rooms)
    while (this.createLoop() > 0) {}

    // Clean up disconnected rooms
    this.cleanUp();

    // Add step decorations to doors
    this.addSteps();

    // Generate water noise map
    this.flood = new Flood(this, 0);

    // Shape rooms (rotundas and colonnades)
    this.shapeRooms();

    // Create room props
    this.createProps();

    // Set water level
    this.flood.setLevel(Parameters.waterLevel);
  }

  /**
   * Get a room size based on the current style pattern.
   * Returns {x: width, y: depth} matching original La(width, depth).
   */
  getRoomSize() {
    const isRound = this.tags.includes('round') && rng.float() < 0.5;

    switch (rng.pick(this.style)) {
      case 0: {
        const b = 3 + (Math.floor(1 + rng.float() * 2) << 1);
        const a = isRound ? b : Math.floor(4 + rng.float() * 3);
        return { x: b, y: a };
      }
      case 1: {
        const b = 3 + (Math.floor(1 + rng.float() * 3) << 1);
        const a = isRound ? b : Math.floor(7 + rng.float() * 3);
        return { x: b, y: a };
      }
      case 2:
        return { x: 3, y: Math.floor(4 + rng.float() * 2) };
      case 3:
        return { x: 3, y: 3 };
      default:
        return null;
    }
  }

  /**
   * Queue a room for building.
   * @param {number} seed - Room seed
   * @param {Room} parent - Parent room (null for root)
   * @param {Dot} origin - Placement origin
   * @param {Dot} axis - Growth axis
   * @param {{x: number, y: number}} size - Room dimensions {x: width, y: depth}
   * @param {number} [mirror=-1] - Mirror flag
   */
  queueRoom(seed, parent, origin, axis, size, mirror) {
    if (mirror == null) mirror = -1;
    this.queue.push({
      seed,
      parent,
      origin,
      width: size.x,
      depth: size.y,
      axis,
      mirror
    });
  }

  /**
   * Process next room from queue.
   * Resets RNG to seed+1 before placing, assigns seed after.
   */
  buildRoom() {
    const item = this.queue.shift();
    rng.reset(item.seed + 1);
    const room = this.placeRoom(
      item.parent,
      item.origin,
      item.axis,
      item.width,
      item.depth,
      item.mirror
    );
    if (room != null) {
      room.seed = item.seed;
    }
  }

  /**
   * Place a room in the dungeon with validation and child room generation.
   * Matches original placeRoom exactly — no seed save/restore.
   */
  placeRoom(parent, origin, axis, width, depth, mirror) {
    if (mirror == null) mirror = -1;
    const room = this.validateRoom(origin, axis, width, depth, mirror);
    if (room == null) return null;

    this.addRoom(room);

    // Pick symmetry using preserve (saves/restores RNG around deck pick)
    room.symm = rng.preserve(() => this.symmetry.pick());

    // Create connecting door
    const door = new Door(origin, parent, room);
    this.addDoor(door);

    // First room: add spacing block around door
    if (parent == null) {
      this.blocks.push(new Rect(door.x, door.y, 1, 1).inflate(1, 1));
    }

    // Direction for child room placement
    const a = rng.float() < 0.5 ? 1 : -1;
    const isString = this.tags.includes('string');

    // Helper: calculate child room depth offset
    const getChildDepth = () => {
      if (width === depth && this.tags.includes('round')) {
        return depth >> 1;
      }
      const subDepth = depth - 2 - 1;
      return Math.floor(1 + rng.float() * subDepth);
    };

    const c = axis; // alias for axis (matching original variable name)
    const d = width;
    const h = depth;
    const f = mirror;

    if (room.symm) {
      // SYMMETRIC ROOM
      let shouldWing = false;
      let shouldCross = false;

      if (isString) {
        shouldCross = true;
      } else {
        shouldWing = (room.w === 3 && room.h === 3) || rng.float() < 0.5;
        if (room.w !== 3 || room.h !== 3) {
          // At least one dimension is not 3
          if ((room.w === 3 && room.h > 3) || (room.h === 3 && room.w > 3)) {
            shouldCross = true;
          } else {
            shouldCross = rng.float() < 0.1;
          }
        } else {
          shouldCross = false;
        }
        if (!shouldWing && !shouldCross) {
          shouldWing = true;
        }
      }

      if (shouldWing) {
        const childDepth = getChildDepth();
        const childSize = this.getRoomSize();
        const childSeed = rng.seed; // Use current seed state

        // First wing: position at -a * halfwidth
        const pos1 = room.xy(-a * (d >> 1), childDepth);
        const q1 = -a * f;
        this.queueRoom(childSeed, room, pos1, new Dot(-q1 * c.y, q1 * c.x), childSize, f);

        // Second wing: position at +a * halfwidth
        const pos2 = room.xy(a * (d >> 1), childDepth);
        const q2 = a * f;
        this.queueRoom(childSeed, room, pos2, new Dot(-q2 * c.y, q2 * c.x), childSize, -f);
      }

      if (shouldCross) {
        const childSize = this.getRoomSize();
        const pos = room.xy(0, h - 1);
        // Seed is an RNG advance (inline w.seed = 48271*w.seed%...)
        const crossSeed = (rng._seed = (48271 * rng._seed) % 2147483647 | 0);
        this.queueRoom(crossSeed, room, pos, c, childSize, f);
      }
    } else {
      // NON-SYMMETRIC ROOM
      let shouldWingL = false;
      let shouldWingR = false;
      let shouldCross = false;

      if (isString) {
        const roll = Math.floor(rng.float() * 3);
        if (roll === 0) shouldWingL = true;
        else if (roll === 1) shouldWingR = true;
        else shouldCross = true;
      } else {
        shouldWingL = rng.float() < 0.5;
        shouldWingR = rng.float() < 0.5;
        if (room.w !== 3 || room.h !== 3) {
          if ((room.w === 3 && room.h > 3) || (room.h === 3 && room.w > 3)) {
            shouldCross = true;
          } else {
            shouldCross = rng.float() < 0.1;
          }
        } else {
          shouldCross = false;
        }
        if (!shouldWingL && !shouldWingR && !shouldCross) {
          shouldWingL = rng.float() < 0.5;
          shouldWingR = !shouldWingL;
        }
      }

      // Right wing (g in original)
      if (shouldWingR) {
        const childDepth = getChildDepth();
        const childSize = this.getRoomSize();
        const pos = room.xy(a * (d >> 1), childDepth);
        const q = -a;
        const wingSeed = (rng._seed = (48271 * rng._seed) % 2147483647 | 0);
        this.queueRoom(wingSeed, room, pos, new Dot(-q * c.y, q * c.x), childSize);
      }

      // Left wing (f in original)
      if (shouldWingL) {
        const childDepth = getChildDepth();
        const childSize = this.getRoomSize();
        const pos = room.xy(-a * (d >> 1), childDepth);
        const wingSeed = (rng._seed = (48271 * rng._seed) % 2147483647 | 0);
        this.queueRoom(wingSeed, room, pos, new Dot(-a * c.y, a * c.x), childSize);
      }

      // Cross
      if (shouldCross) {
        const childSize = this.getRoomSize();
        const minX = -(d >> 1) + 1;
        const crossX = Math.floor(minX + rng.float() * ((d >> 1) - minX));
        const pos = room.xy(crossX, h - 1);
        const crossSeed = (rng._seed = (48271 * rng._seed) % 2147483647 | 0);
        this.queueRoom(crossSeed, room, pos, c, childSize);
      }
    }

    return room;
  }

  /**
   * Validate a room placement against existing rooms and blocks.
   * Default mirror = 1 matching original.
   */
  validateRoom(origin, axis, width, depth, mirror) {
    if (mirror == null) mirror = 1;
    const room = new Room(origin, axis, width, depth, mirror);

    for (const existingRoom of this.rooms) {
      const isect = room.intersection(existingRoom);
      if (isect.w > 1 && isect.h > 1) {
        return null;
      }
    }

    for (const block of this.blocks) {
      if (room.intersects(block)) {
        return null;
      }
    }

    return room;
  }

  addRoom(room) {
    this.rooms.push(room);
    room.dungeon = this;
  }

  /** Check if a room has no symmetric reflections (unique seed) */
  isUnique(room) {
    const group = this.reflections.get(room.seed);
    return group ? group.length === 1 : true;
  }

  /**
   * Remove a room and all its associated doors.
   * Matches original removeRoom exactly.
   */
  removeRoom(room) {
    const idx = this.rooms.indexOf(room);
    if (idx !== -1) this.rooms.splice(idx, 1);
    // Remove all doors connected to this room
    const roomDoors = room.getDoors();
    for (const door of roomDoors) {
      const di = this.doors.indexOf(door);
      if (di !== -1) this.doors.splice(di, 1);
    }
  }

  addDoor(door) {
    this.doors.push(door);
  }

  /** Find a door at a specific position */
  getDoor(pos) {
    for (const door of this.doors) {
      if (door.x === pos.x && door.y === pos.y) return door;
    }
    return null;
  }

  /**
   * Count rooms that are "significant" (larger than 3x3).
   */
  getSize() {
    let count = 0;
    for (const room of this.rooms) {
      if (room.w > 3 && room.h > 3) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get bounding rectangle of entire dungeon.
   */
  getRect(includeHidden = true) {
    let result = null;
    for (const room of this.rooms) {
      if (includeHidden || !room.hidden) {
        result = result == null ? new Rect(room.x, room.y, room.w, room.h) : result.union(room);
      }
    }
    return result;
  }

  /**
   * Get the bounding rectangle of the dungeon after rotation by an angle.
   * Matches original: cj.prototype.getBounds
   *
   * For angle=0, returns getRect().scale(1) (a copy).
   * Otherwise, rotates all blocks+rooms corners and returns the union of their
   * axis-aligned bounding boxes.
   *
   * @param {number} [angle=0] - Rotation angle in radians
   * @returns {Rect} Axis-aligned bounding rect in grid units
   */
  getBounds(angle = 0) {
    if (angle === 0) {
      const r = this.getRect();
      return r ? r.scale(1) : new Rect(0, 0, 0, 0);
    }
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    let result = null;
    const items = this.blocks.concat(this.rooms);
    for (const item of items) {
      const b = item.getBounds(sinA, cosA);
      result = result == null ? b : result.union(b);
    }
    return result || new Rect(0, 0, 0, 0);
  }

  findRoom(x, y) {
    for (const room of this.rooms) {
      if (room.inflate(-1, -1).contains(x, y)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Expand rooms along their growth axes until blocked.
   * Exact translation of original Dungeon-built.js lines 7772-7849.
   *
   * Verified identical output for seed 405272020: same 34 rooms,
   * same final RNG state (1917986178), same room dimensions.
   */
  grow() {
    // Local helper: compute the expanded rect for a room along its axis.
    // Called once during collision checking and again during apply
    // (mirrors original's inline function 'a' at lines 7774-7792).
    const expandRect = (room) => {
      if (room.axis.equals(Dot.UP))    return new Rect(room.x, room.y - 1, room.w, room.h + 1);
      if (room.axis.equals(Dot.DOWN))  return new Rect(room.x, room.y,     room.w, room.h + 1);
      if (room.axis.equals(Dot.LEFT))  return new Rect(room.x - 1, room.y, room.w + 1, room.h);
      if (room.axis.equals(Dot.RIGHT)) return new Rect(room.x, room.y,     room.w + 1, room.h);
      return null;
    };

    // Outer loop: repeat until no group grew in a full pass (original line 7793).
    for (;;) {
      let anyGrew = false;

      // Iterate reflection groups in ascending seed order
      // (matches original IntMap iterator at line 7795).
      for (const [seed, group] of this.reflections) {
        let canGrow = true;
        const f = group[0]; // Reference room for probability check

        // Probability limiter (original lines 7799-7805):
        // If room.width > 3, RNG is consumed and skip = (rng < depth/width).
        // If room.width <= 3, skip = false and NO RNG call is made.
        let skip;
        if (f.width > 3) {
          const ratio = f.depth / f.width;
          skip = rng.float() < ratio;
        } else {
          skip = false;
        }

        // Original line 7806: if (!(skip || depth >= 10)) { ... }
        if (!(skip || f.depth >= 10)) {

          // Check phase: verify all rooms in group can grow (lines 7807-7831)
          for (let i = 0; i < group.length; i++) {
            const room = group[i];
            const expanded = expandRect(room);

            // Check room-room collisions (lines 7811-7821)
            let blocked = false;
            for (let j = 0; j < this.rooms.length; j++) {
              const other = this.rooms[j];
              if (other !== room) {
                const isect = other.intersection(expanded);
                if (isect.w > 1 && isect.h > 1) {
                  blocked = true;
                  break;
                }
              }
            }

            // Check room-block collisions (lines 7822-7827)
            if (!blocked) {
              for (let j = 0; j < this.blocks.length; j++) {
                if (this.blocks[j].intersects(expanded)) {
                  blocked = true;
                  break;
                }
              }
            }

            if (blocked) {
              canGrow = false;
              break;
            }
          }

          // Apply phase: expand all rooms in group (lines 7833-7843)
          if (canGrow) {
            for (let i = 0; i < group.length; i++) {
              const room = group[i];
              const expanded = expandRect(room);
              room.x = expanded.x;
              room.y = expanded.y;
              room.w = expanded.w;
              room.h = expanded.h;
              room.depth++;
            }
            anyGrew = true;
          }
        }
      }

      // Original line 7847: if (!anyGrew) break
      if (!anyGrew) break;
    }
  }

  /**
   * Find and create a loop by connecting distant rooms with a shared wall.
   * Uses internal planner for wing/secret checks.
   */
  createLoop() {
    const graph = this.getGraph();
    let maxDist = 5;
    let bestA = null;
    let bestB = null;
    let bestIsect = null;
    let bestWingA = null;
    let bestWingB = null;

    for (let i = 0; i < this.rooms.length - 1; i++) {
      const roomA = this.rooms[i];
      const nodeA = graph.getNode(roomA);
      const wingA = this.planner.getWing(roomA);
      const secretA = this.planner.secrets.indexOf(wingA) !== -1;

      for (let j = i + 1; j < this.rooms.length; j++) {
        const roomB = this.rooms[j];
        const nodeB = graph.getNode(roomB);
        const wingB = this.planner.getWing(roomB);
        const secretB = this.planner.secrets.indexOf(wingB) !== -1;

        // Only connect rooms in same wing, or both non-secret
        if (wingA !== wingB && (secretA || secretB)) continue;

        if (nodeA.links.has(nodeB)) continue;

        const isect = roomA.intersection(roomB);
        if (!((isect.w === 1 && isect.h >= 3) || (isect.h === 1 && isect.w >= 3))) {
          continue;
        }

        const path = graph.aStar(nodeA, nodeB);
        if (!path) continue;

        const dist = graph.calculatePrice(path);
        if (dist > maxDist) {
          maxDist = dist;
          bestA = roomA;
          bestB = roomB;
          bestIsect = isect;
          bestWingA = wingA;
          bestWingB = wingB;
        }
      }
    }

    const isString = this.tags.includes('string');

    if (bestA == null) return 0;

    let doorPos;
    if (bestIsect.h === 1) {
      const startX = bestIsect.x + 1;
      const x = Math.floor(startX + rng.float() * (bestIsect.x + bestIsect.w - 2 - startX));
      doorPos = new Dot(x, bestIsect.y);
    } else {
      const startY = bestIsect.y + 1;
      const y = Math.floor(startY + rng.float() * (bestIsect.y + bestIsect.h - 2 - startY));
      doorPos = new Dot(bestIsect.x, y);
    }

    const door = new Door(doorPos, bestA, bestB);

    // Door type: same wing + (not approach wing or no ante) → autoType; else → impassable
    // Original: c == d && (wings[c] != approach || ante == null)
    // bestWingA/B are root rooms; approach is a wing array (Room[])
    const sameWing = bestWingA === bestWingB;
    const wingArray = bestWingA != null ? this.planner.wings.get(bestWingA) : null;
    const isApproachWing = wingArray != null && wingArray === this.planner.approach;
    const inApproach = sameWing && (!isApproachWing || this.planner.ante == null);
    door.type = (!isString && inApproach) ? Door.autoType(bestA, bestB) : Parameters.impassable;

    this.doors.push(door);
    return maxDist;
  }

  /**
   * Add special room shapes: rotundas and colonnades.
   */
  shapeRooms() {
    for (const [seed, reflGroup] of this.reflections) {
      const room = reflGroup[0];

      // ROTUNDAS
      if (Parameters.rotundaChance > 0) {
        let canBeRound = true;
        let totalDoors = 0;

        for (const r of reflGroup) {
          if (!r.canBeRound()) {
            canBeRound = false;
            break;
          }
          totalDoors += r.getDoors().length;
        }

        if (canBeRound) {
          const prob =
            (totalDoors / reflGroup.length / 3) *
            ((room.w - 2) / room.w) *
            Parameters.rotundaChance;
          if (rng.chance(prob)) {
            for (const r of reflGroup) {
              r.round = true;
            }
          }
        }
      }

      // COLONNADES
      // Original uses room.depth and room.width (logical dimensions),
      // NOT room.w / room.h (rect dimensions which depend on axis rotation).
      if (room.w > 3 && room.h > 3) {
        let prob = 0.7 * ((room.depth - 4) / room.depth) + 0.3 * ((room.width - 4) / room.width);
        if (room.width === 5) {
          prob /= 2;
        }
        prob *= room.round ? 1 : 1.2 - room.width / room.depth;
        prob *= Parameters.colonnadeChance;
        // First room bonus (matching original: c == this.planner.first && (h += 0.5))
        if (room === this.planner.first) {
          prob += 0.5;
        }

        if (rng.chance(prob)) {
          for (const r of reflGroup) {
            r.columns = true;
          }
        }
      }
    }
  }

  /**
   * Add steps to some doors for visual variety.
   */
  addSteps() {
    if (Parameters.stepsChance <= 0) return;

    for (const door of this.doors) {
      if (!door.isRegular()) continue;
      if (!door.to) continue;

      let prob = Parameters.stepsChance / door.to.getDoors().length;
      if (door.from && door.from.w === 3 && door.from.h === 3) {
        prob *= 2;
      }
      if (door.to.w === 3 && door.to.h === 3) {
        prob *= 2;
      }

      if (rng.chance(prob)) {
        door.type = 9; // STEPS
      }
    }
  }

  /**
   * Remove dead-end small rooms and trim excess corridor length.
   * Matches original cleanUp exactly (Dungeon-built.js lines 7690-7732).
   *
   * Phase 1: Repeatedly remove small rooms (w<=3 AND h<=3) that have
   * exactly 1 door (dead-end junctions). removeRoom also removes the
   * associated door, which may cause other rooms to become dead-ends.
   *
   * Phase 2: For remaining small rooms, if no door at the back wall,
   * walk backward from the end trimming depth until a side-door is found.
   */
  cleanUp() {
    // Phase 1: Remove dead-end small rooms
    for (;;) {
      let changed = false;
      for (const room of this.rooms) {
        if (!(room.w > 3 && room.h > 3) && room.getDoors().length === 1) {
          this.removeRoom(room);
          changed = true;
        }
      }
      if (!changed) break;
    }

    // Phase 2: Trim corridors from the back
    for (const room of this.rooms) {
      if (room.w > 3 && room.h > 3) continue;

      const backPos = room.xy(0, room.depth - 1);
      if (this.getDoor(backPos) != null) continue;

      // Walk backward from the end, counting how many rows to trim
      let trimCount = 0;
      for (;;) {
        const leftPos = room.xy(-1, room.depth - 2 - trimCount);
        const rightPos = room.xy(1, room.depth - 2 - trimCount);
        if (this.getDoor(leftPos) != null || this.getDoor(rightPos) != null) break;
        trimCount++;
      }

      if (trimCount > 0) {
        // Shrink room along its axis direction
        if (room.axis.equals(Dot.UP)) {
          room.y += trimCount;
          room.h -= trimCount;
        } else if (room.axis.equals(Dot.LEFT)) {
          room.x += trimCount;
          room.w -= trimCount;
        } else if (room.axis.equals(Dot.DOWN)) {
          room.h -= trimCount;
        } else if (room.axis.equals(Dot.RIGHT)) {
          room.w -= trimCount;
        }
        room.depth -= trimCount;
      }
    }
  }

  /**
   * Build connectivity graph.
   */
  /**
   * Build connectivity graph.
   * Matches original getGraph (lines 7752-7764).
   * Weight = 1 + (from is big ? 1 : 0) + (to is big ? 1 : 0).
   * "Big" means w > 3 AND h > 3.
   */
  getGraph() {
    const graph = new Graph();
    for (const room of this.rooms) {
      graph.getNode(room);
    }
    for (const door of this.doors) {
      if (door.from && door.to) {
        let weight = 1;
        if (door.from.w > 3 && door.from.h > 3) weight++;
        if (door.to.w > 3 && door.to.h > 3) weight++;
        graph.connect(door.from, door.to, weight);
      }
    }
    return graph;
  }

  /**
   * Sort rooms by greedy nearest-neighbor from entrance.
   * Matches original sortRooms (lines 7944-7964).
   * Modifies the array in-place.
   */
  sortRooms(roomArray) {
    const remaining = roomArray.slice();
    const graph = this.getGraph();
    const sorted = [];
    let current = this.planner.first;

    while (remaining.length > 0) {
      const currentNode = graph.getNode(current);
      let bestRoom = null;
      let bestDist = Infinity;

      for (const room of remaining) {
        const path = graph.aStar(graph.getNode(room), currentNode);
        const dist = graph.calculatePrice(path);
        if (bestRoom == null || dist < bestDist) {
          bestDist = dist;
          bestRoom = room;
        }
      }

      sorted.push(bestRoom);
      const idx = remaining.indexOf(bestRoom);
      if (idx !== -1) remaining.splice(idx, 1);
      current = bestRoom;
    }

    // Replace contents of original array
    roomArray.splice(0, roomArray.length);
    for (const r of sorted) roomArray.push(r);
  }

  /**
   * Create room props (furniture, decorations, etc.).
   * Iterates all rooms and calls each room's createProps.
   */
  createProps() {
    for (const room of this.rooms) {
      room.createProps();
    }
  }

  /**
   * Populate room.note for rooms that have descriptions.
   * Matches original getNotes() (lines 7899-7921):
   * filters non-hidden rooms with desc, sorts by proximity to entrance,
   * and assigns numbered symbols.
   *
   * Must be called after planner.plan() (which sets room.desc via rollNotes)
   * and after hiding secrets, but before rendering.
   */
  populateNotes() {
    // Only generate notes for rooms that don't already have a custom note
    // (custom notes come from _restore after loadFromSave)
    const noteRooms = this.rooms.filter(r => !r.hidden && r.desc != null && !r.note);
    this.sortRooms(noteRooms);

    // Count existing notes to continue numbering
    const existingCount = this.rooms.filter(r => r.note).length;

    for (let i = 0; i < noteRooms.length; i++) {
      const room = noteRooms[i];
      const c = room.center();
      room.note = {
        point: { x: c.x, y: c.y },
        symb: String(existingCount + i + 1),
        text: room.desc,
        room: room,
      };
    }
  }

  /**
   * Export dungeon data.
   * Matches original getData format exactly:
   * - Room rects are deflated by inflate(-1, -1)
   * - Door positions are appended as 1x1 rects
   * - Includes title, story, columns, water
   */
  getData() {
    const rects = [];
    const columns = [];

    for (const room of this.rooms) {
      // Deflate room rect by 1 on each side (matching original)
      const k = room.inflate(-1, -1);
      const g = { x: k.x, y: k.y, w: k.w, h: k.h };
      if (room.round) g.rotunda = true;
      if (room.hidden) g.hidden = true;

      // Columns
      if (room.columns) {
        if (room.round) {
          const radius = k.w / 2 - 1;
          const numCols = 4 * ((Math.PI * radius / 2) | 0);
          for (let i = 0; i < numCols; i++) {
            const angle = ((i + 0.5) / numCols) * 2 * Math.PI;
            const cx = k.x + k.w / 2 + Math.cos(angle) * radius;
            const cy = k.y + k.h / 2 + Math.sin(angle) * radius;
            columns.push({ x: cx, y: cy });
          }
        } else if (room.axis.x !== 0) {
          // Horizontal axis
          for (let x = k.x + 1; x < k.x + k.w; x++) {
            columns.push({ x, y: k.y + 1 });
            columns.push({ x, y: k.y + k.h - 1 });
          }
        } else {
          // Vertical axis
          for (let y = k.y + 1; y < k.y + k.h; y++) {
            columns.push({ x: k.x + 1, y });
            columns.push({ x: k.x + k.w - 1, y });
          }
        }
      }

      // Ending flag for last room
      if (this.planner && room === this.planner.last) {
        g.ending = true;
      }

      rects.push(g);
    }

    // Append doors as 1x1 rects and build door array
    const doors = [];
    for (const d of this.doors) {
      rects.push({ x: d.x, y: d.y, w: 1, h: 1 });
      doors.push({
        x: d.x, y: d.y,
        dir: d.dir ? { x: d.dir.x, y: d.dir.y } : null,
        type: d.type
      });
    }

    // Collect notes from rooms (populated by populateNotes()).
    // Ensure notes are populated if not already done.
    this.populateNotes();
    const notes = [];
    for (const room of this.rooms) {
      if (room.note) {
        notes.push({
          text: room.note.text,
          ref: room.note.symb,
          pos: room.note.point
        });
      }
    }

    const result = {
      version: '1.2.7',
      title: this.story ? this.story.name : '',
      story: this.story ? this.story.hook : '',
      rects,
      doors,
      notes,
      columns,
      water: this.flood ? this.flood.getData() : []
    };

    return result;
  }
}

export default Dungeon;
