import { rng } from './Random.js';
import Door from './Door.js';
import Rect from './Rect.js';

/**
 * Planner designates room roles within the dungeon.
 *
 * Faithfully matches original com.watabou.dungeon.model.Planner (ej).
 *
 * Wings are stored as: Map<rootRoom, Room[]>
 * getWing(room) returns the root room of the wing containing that room.
 * secrets[] is an array of root rooms of secret wings.
 *
 * @class Planner
 */
class Planner {
  constructor(dungeon) {
    this.dungeon = dungeon;
    this.graph = dungeon.getGraph();
    this.wings = new Map();      // rootRoom -> Room[] (wing members)
    this.secrets = [];           // Array of secret wing root rooms
    this.first = null;           // Entrance room
    this.last = null;            // Boss/final room
    this.entrance = null;        // Entrance door object
    this.gateRoom = null;        // Gate/threshold room
    this.backdoor = null;        // Secondary entrance room (not door)
    this.ante = null;            // Room before boss
    this.approach = null;        // Approach wing array (Room[])
    this.regular = null;         // Main wing array (Room[])
    this.culmination = null;     // Boss wing array (Room[])
    this.nKeys = 0;              // Number of key rooms spawned
  }

  /**
   * Execute full dungeon planning.
   * Matches original plan() exactly (lines 8396-8423).
   */
  plan() {
    this.entrance = this.dungeon.doors[0] || null;
    this.first = this.dungeon.rooms[0];
    if (this.first) this.first.enviro = true;

    this.buildCulmination();
    this.buildApproach();
    this.buildSecrets();
    this.regular = this.addWing(this.first);
    this.spawnKeys();
    this.addBackdoor();

    // Inline loot/event designation (original lines 8406-8422)
    const logN = Math.log(this.normal(this.dungeon.rooms).length);
    const frac = logN - (logN | 0);
    const nTreasure = (logN | 0) + (rng.chance(frac) ? 1 : 0);

    const available = this.getAvailable();
    const treasureRooms = rng.subset(available, nTreasure);
    for (const room of treasureRooms) {
      if (!room.key && !room.event) {
        room.loot = true;
      }
    }

    const remaining = this.getAvailable();
    const eventRooms = rng.subset(remaining, 1);
    for (const room of eventRooms) {
      if (!room.loot && !room.key && !room.enemy) {
        room.event = true;
      }
    }

    this.rollNotes();
  }

  /**
   * Find and designate the boss room.
   * Matches original buildCulmination (lines 8425-8446).
   */
  buildCulmination() {
    const startNode = this.graph.getNode(this.first);
    const normalRooms = this.normal(this.dungeon.rooms);
    let maxDist = 0;
    let candidates = [];

    for (const room of normalRooms) {
      const path = this.graph.aStar(startNode, this.graph.getNode(room));
      let dist = this.graph.calculatePrice(path);
      if (this.dungeon.isUnique(room)) {
        dist *= 2;
      }
      if (candidates.length === 0 || dist > maxDist) {
        candidates = [room];
        maxDist = dist;
      } else if (dist === maxDist) {
        candidates.push(room);
      }
    }

    const areas = candidates.map(r => r.w * r.h);
    this.last = rng.weighted(candidates, areas);
    this.last.enviro = true;
    this.last.enemy = true;
    this.culmination = this.addWing(this.last);
  }

  /**
   * Build the approach path to the boss room.
   * Matches original buildApproach (lines 8448-8473).
   *
   * Walks back from last via getEntrance().from chain to build parent path.
   * Picks a random normal room from the path, A* to last,
   * gets the door between them, makes approach wing.
   * Sets gate door type=5 and marks gate room.
   */
  buildApproach() {
    // Walk back from last to first via entrance chain
    const path = [];
    let current = this.last.getEntrance() ? this.last.getEntrance().from : null;
    while (current != null) {
      path.unshift(current);
      const ent = current.getEntrance();
      current = ent ? ent.from : null;
    }

    const normalPath = this.normal(path);
    let gateDoor;

    if (normalPath.length > 0) {
      // Pick a random room from the normal path
      const picked = rng.pick(normalPath);

      // A* from picked to last
      const astarPath = this.graph.aStar(
        this.graph.getNode(picked),
        this.graph.getNode(this.last)
      );

      // Get the door between picked and the next room in the path
      gateDoor = picked.getDoor(astarPath[1].data);

      // If the door's target is not the last room, make approach wing from it
      if (gateDoor.to !== this.last) {
        this.approach = this.addWing(gateDoor.to);
      }

      // Ante room logic
      const lastOnPath = normalPath[normalPath.length - 1];
      if (picked !== lastOnPath) {
        const prob = 1 - this.approach.length / this.dungeon.rooms.length;
        if (rng.chance(prob)) {
          this.ante = lastOnPath;
          this.ante.enviro = true;
          this.ante.enemy = true;
        }
      }
    } else {
      gateDoor = this.last.getEntrance();
    }

    gateDoor.type = 5; // Gate type
    this.gateRoom = gateDoor.from;
    this.gateRoom.gate = true;
  }

  /**
   * Designate secret wings.
   * Matches original buildSecrets (lines 8475-8525) exactly.
   *
   * For each leaf room (no exits), rolls for secret.
   * Walks up through small rooms to find the secret wing root.
   * Sets door types and adds to secrets array.
   */
  buildSecrets() {
    if (this.dungeon.tags.includes('no secrets')) return;

    const leaves = this.getLeaves(this.dungeon.rooms);
    // Remove this.last from leaves
    const lastIdx = leaves.indexOf(this.last);
    if (lastIdx !== -1) leaves.splice(lastIdx, 1);

    const secretMultiplier = this.dungeon.tags.includes('secret') ? 2 : 1;

    for (const leaf of leaves) {
      const prob = secretMultiplier * (this.dungeon.isUnique(leaf) ? 0.5 : 0.1);

      if (rng.chance(prob)) {
        // Walk UP through small rooms with < 2 exits to find a "normal" room
        let d = leaf;
        while (d != null && !(d.w > 3 && d.h > 3) && d.getExits().length < 2) {
          const ent = d.getEntrance();
          d = ent ? ent.from : null;
        }

        // Validate: must exist, not be last, and have at most 1 exit
        if (d == null || d === this.last || d.getExits().length > 1) continue;

        d.enviro = true;

        // Roll for treasure or event
        if (rng.chance(1 / 3)) {
          d.loot = true;
        } else {
          d.event = true;
        }

        // Walk UP again through small rooms with exactly 1 exit
        // to find the wing root
        let parent = d.getEntrance().from;
        while (!(parent.w > 3 && parent.h > 3) && parent.getExits().length === 1) {
          d = parent;
          parent = d.getEntrance().from;
        }

        // Build the secret wing from d
        const wingRooms = this.addWing(d, true);

        // Change autoType doors to secret doors
        for (const wingRoom of wingRooms) {
          for (const exit of wingRoom.getExits()) {
            if (exit.type === 1) { // autoType (archway)
              exit.type = 2; // SECRET
            }
          }
        }

        this.secrets.push(d);
        d.getEntrance().type = 6; // SECRET_ENTRANCE
      }
    }
  }

  /**
   * Spawn progression keys in leaf rooms of the main wing.
   * Matches original spawnKeys (lines 8612-8622).
   */
  spawnKeys() {
    // Original: this.normal(this.regular) then this.leaves
    const normalRegular = this.normal(this.regular);
    const available = this.getLeaves(normalRegular);

    this.nKeys = rng.pick([0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 4]);
    if (this.nKeys > available.length) this.nKeys = available.length;

    const keyRooms = rng.subset(available, this.nKeys);
    for (const room of keyRooms) {
      room.key = true;
    }
  }

  /**
   * Add a secondary entrance (backdoor) to the dungeon.
   * Matches original addBackdoor (lines 8527-8610) exactly.
   */
  addBackdoor() {
    if (this.dungeon.tags.includes('no backdoor')) return;

    // Original logic (lines 8530-8537):
    //   if no 'backdoor' tag: b = chance(secretDiv / normalRooms)
    //     b=true -> skip backdoor; b=false -> create backdoor
    //   if has 'backdoor' tag: b=false -> always create
    //   if (!b) { ... create backdoor }
    if (!this.dungeon.tags.includes('backdoor')) {
      const secretDiv = this.dungeon.tags.includes('secret') ? 5 : 10;
      const prob = secretDiv / this.normal(this.dungeon.rooms).length;
      if (rng.chance(prob)) return; // b=true -> skip backdoor
    }

    const startNode = this.graph.getNode(this.first);
    const distFunc = (room) => {
      const path = this.graph.aStar(startNode, this.graph.getNode(room));
      return Math.pow(this.graph.calculatePrice(path), 2);
    };

    let candidates;
    let weights;

    if (this.nKeys > 0) {
      // Use normal rooms from regular wing
      candidates = this.normal(this.regular);
      weights = candidates.map(r => distFunc(r));

      // Add secret roots whose parent wing is first
      for (const secretRoot of this.secrets) {
        const wingRoot = this.getWing(secretRoot);
        const wingRootEntrance = wingRoot.getEntrance();
        if (wingRootEntrance && this.getWing(wingRootEntrance.from) === this.first) {
          candidates.push(secretRoot);
          weights.push(10 * distFunc(secretRoot));
        }
      }
    } else {
      // Use all normal rooms except last
      candidates = this.normal(this.dungeon.rooms);
      const lastIdx = candidates.indexOf(this.last);
      if (lastIdx !== -1) candidates.splice(lastIdx, 1);
      weights = candidates.map(r => distFunc(r));

      // Add secret roots with 10x weight
      for (const secretRoot of this.secrets) {
        candidates.push(secretRoot);
        weights.push(10 * distFunc(secretRoot));
      }
    }

    // Get candidate positions for each room
    const getPositions = (room) => {
      return [
        room.xy(0, room.depth - 1),
        room.xy(-(room.width >> 1), room.depth >> 1),
        room.xy(room.width >> 1, room.depth >> 1),
      ];
    };

    // Check if a door position is valid (doesn't overlap other rooms)
    const isValidPos = (room, pos) => {
      const rect = new Rect(pos.x, pos.y, 1, 1);
      for (const other of this.dungeon.rooms) {
        if (other !== room && other.intersects(rect)) {
          return false;
        }
      }
      return true;
    };

    // Filter candidates: must have at least one valid external door position
    // NOTE: Original (line 8584-8599) filters candidates but passes the
    // UNFILTERED weights array to la.weighted. We replicate that quirk so the
    // RNG sequence stays identical.
    const filteredCandidates = [];
    for (let i = 0; i < candidates.length; i++) {
      const room = candidates[i];
      const positions = getPositions(room);
      if (positions.some(pos => isValidPos(room, pos))) {
        filteredCandidates.push(room);
      }
    }

    if (filteredCandidates.length === 0) return;

    // Pick backdoor room weighted by distance (uses original unfiltered weights)
    this.backdoor = rng.weighted(filteredCandidates, weights);

    // Create door at valid position
    const positions = getPositions(this.backdoor);
    const validDoors = [];
    for (const pos of positions) {
      if (isValidPos(this.backdoor, pos)) {
        validDoors.push(new Door(pos, null, this.backdoor));
      }
    }

    // Original always calls la.random(b) here (1 RNG call), even if b could
    // theoretically be empty.  The selected backdoor room passed the position
    // filter, so validDoors should always have at least one element.
    this.dungeon.doors.push(rng.pick(validDoors));
  }

  /**
   * Generate descriptive notes for map legend.
   * Matches original rollNotes (lines 8692-8698).
   * Only sets desc - note objects are created later in getData/getNotes.
   */
  rollNotes() {
    if (this.dungeon.story) {
      this.dungeon.story.initKeys(this);
    }

    for (const room of this.dungeon.rooms) {
      room.desc = this.dungeon.story
        ? this.dungeon.story.getRoomDesc(this, room)
        : null;
    }
  }

  // ─── Wing management ──────────────────────────────────────

  /**
   * Build a wing by traversing exits from a start room.
   * Matches original buildWing (lines 8624-8643).
   *
   * @param {Room} startRoom - Room to start wing from
   * @param {boolean} reassign - If true, reassign rooms already in other wings
   * @returns {Room[]} Array of rooms in the wing
   */
  buildWing(startRoom, reassign = false) {
    const result = [];
    const queue = [startRoom];

    while (queue.length > 0) {
      const room = queue.shift();
      const existingWing = this.getWing(room);

      if (reassign || existingWing == null) {
        // Remove from existing wing if reassigning
        if (existingWing != null) {
          const wingArray = this.wings.get(existingWing);
          if (wingArray) {
            const idx = wingArray.indexOf(room);
            if (idx !== -1) wingArray.splice(idx, 1);
          }
        }

        result.push(room);

        // Traverse via exits only (directed: from === room)
        for (const exit of room.getExits()) {
          if (exit.to) queue.push(exit.to);
        }
      }
    }

    return result;
  }

  /**
   * Register a wing. Stores rootRoom -> roomArray mapping.
   * Matches original addWing (lines 8645-8649).
   *
   * @param {Room} startRoom - Wing root room
   * @param {boolean} reassign - If true, reassign rooms already in other wings
   * @returns {Room[]} Array of rooms in the wing
   */
  addWing(startRoom, reassign = false) {
    const wingRooms = this.buildWing(startRoom, reassign);
    this.wings.set(startRoom, wingRooms);
    return wingRooms;
  }

  /**
   * Get the wing root for a room.
   * Matches original getWing (lines 8651-8657).
   *
   * @param {Room} room - Room to query
   * @returns {Room|null} Wing root room, or null if not assigned
   */
  getWing(room) {
    for (const [rootRoom, wingArray] of this.wings) {
      if (rootRoom === room || wingArray.indexOf(room) !== -1) {
        return rootRoom;
      }
    }
    return null;
  }

  /**
   * Get all rooms in a wing by root room.
   * @param {Room[]} wingArray - The wing array (returned by addWing)
   * @returns {Room[]} Same array
   */
  getWingRooms(wingArray) {
    return wingArray;
  }

  /**
   * Get all secret rooms (rooms in secret wings).
   * Matches original getSecrets (lines 8700-8706).
   */
  getSecrets() {
    const result = [];
    for (const secretRoot of this.secrets) {
      const wingArray = this.wings.get(secretRoot);
      if (wingArray) {
        for (const room of wingArray) result.push(room);
      }
    }
    return result;
  }

  /**
   * Hide/show all rooms in a wing.
   * Matches original hideWing (lines 8659-8663).
   */
  hideWing(room, hidden) {
    const wingRoot = this.getWing(room);
    const wingArray = this.wings.get(wingRoot);
    if (wingArray) {
      for (const r of wingArray) {
        r.hidden = hidden;
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Filter rooms to only those larger than 3x3.
   * Matches original normal (lines 8671-8677).
   */
  normal(rooms) {
    return rooms.filter(r => r.w > 3 && r.h > 3);
  }

  /**
   * Get leaf rooms (dead ends with zero exits).
   * Matches original leaves (lines 8679-8685).
   * NOTE: Original uses getExits().length === 0, NOT getDoors().length === 1.
   */
  getLeaves(rooms) {
    return rooms.filter(r => r.getExits().length === 0);
  }

  /**
   * Get rooms not yet designated with a role.
   * Matches original getAvailable (lines 8687-8691).
   * Removes specific rooms rather than checking flags.
   */
  getAvailable() {
    const rooms = this.normal(this.dungeon.rooms);
    const remove = [this.first, this.last, this.gateRoom, this.ante];
    for (const r of remove) {
      const idx = rooms.indexOf(r);
      if (idx !== -1) rooms.splice(idx, 1);
    }
    return rooms;
  }

  /**
   * Check if a room is a special location.
   * Matches original isSpecial (lines 8668-8669).
   */
  isSpecial(room) {
    if (room === this.first || room === this.last) return true;
    return room === this.gateRoom;
  }

  /**
   * Check if a room is in a secret wing.
   * Matches original isSecret (lines 8665-8666).
   */
  isSecret(room) {
    return this.secrets.indexOf(this.getWing(room)) !== -1;
  }
}

export default Planner;
