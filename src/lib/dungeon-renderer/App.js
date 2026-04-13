/**
 * App - Main Application Controller
 *
 * Orchestrates dungeon generation, rendering, and user interaction.
 * This is the entry point that ties all modules together.
 *
 * Original: Watabou "One Page Dungeon Generator" v1.2.7
 * Reconstructed as clean ES6+ source.
 */

import Dungeon from './Dungeon.js';
import Blueprint from './Blueprint.js';
import Parameters from './Parameters.js';
import Story from './Story.js';
import DungeonRenderer from './DungeonRenderer.js';
import style from './Style.js';
import Formats from './Formats.js';
import Room from './Room.js';
import Door from './Door.js';
import Dot from './Dot.js';

class App {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element to render into
   * @param {object} [options] - Options
   * @param {boolean} [options.autoInit=false] - Auto-generate on construction
   * @param {boolean} [options.bindEvents=false] - Bind keyboard/mouse events
   * @param {number} [options.seed] - Initial seed
   * @param {string[]} [options.tags] - Initial tags
   */
  constructor(canvas, options = {}) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;

    /** @type {DungeonRenderer} */
    this.renderer = new DungeonRenderer(this.canvas);

    /** @type {Dungeon|null} */
    this.dungeon = null;

    /** @type {Planner|null} */
    this.planner = null;

    /** @type {Flood|null} */
    this.flood = null;

    /** @type {Blueprint} */
    this.blueprint = new Blueprint(options.seed || 0, options.tags || []);

    // Drag state for note boxes
    this._dragNote = null;

    // Undo/redo history
    this._undoStack = [];
    this._redoStack = [];
    this._maxHistory = 80;

    // Bind all events (keyboard, mouse, resize, note dragging)
    this._bindEvents();

    if (options.autoInit) {
      this._resize();
      Story.loadData().then(() => this.generate());
    }
  }

  /**
   * Initialize: load grammar and generate first dungeon.
   * Call this after the canvas is sized.
   */
  async init() {
    await Story.loadData();
    this._resize();
    this.generate();
  }

  /**
   * Resize canvas to match its parent container.
   */
  resize(width, height) {
    if (width && height) {
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    }
    this._resize();
    this.renderer.noteOverrides.clear();
    this.draw();
  }

  // ─── GENERATION ──────────────────────────────────────────────

  /**
   * Generate a new dungeon from the current blueprint.
   * This is the main generation pipeline.
   */
  generate() {
    const bp = this.blueprint;

    // Clear user-dragged note positions for the new dungeon
    this.renderer.noteOverrides.clear();

    // Create and build dungeon (full pipeline runs inside build)
    this.dungeon = new Dungeon();
    this.dungeon.build(bp.seed, bp.tags);

    // Store references for rendering
    this.planner = this.dungeon.planner;
    this.flood = this.dungeon.flood;

    // Hide secret rooms if "Show Secrets" is off (matches original reset() line 10077)
    if (this.planner) {
      const secrets = this.planner.getSecrets();
      if (secrets.length > 0 && !style.showSecrets) {
        for (const room of secrets) {
          room.hidden = true;
        }
      }
    }

    // Populate room notes (must happen after hiding secrets so hidden rooms
    // are excluded, and before rendering so room.note is available)
    this.dungeon.populateNotes();

    // Props with axis vectors are left as-is for correct rendering.
    // The axis is only converted to rotation when the user edits the prop.

    // Layout (including auto-rotation) is computed inside renderer.render()
    // via computeLayout(), exactly matching the original layout() function.

    // Update URL with current seed/tags
    bp.updateURL();

    // Render (computeLayout inside render handles rotation, scale, position)
    this.draw();
  }

  /**
   * Generate a completely new random dungeon.
   */
  newDungeon() {
    this.blueprint = Blueprint.random();
    // Carry over current tags
    const tags = this.blueprint.tags;
    this.blueprint.tags = tags.length > 0 ? tags : [];
    this.generate();
  }

  /**
   * Regenerate with new tags.
   */
  regenerateWithTags(tags) {
    this.blueprint = new Blueprint(0, tags);
    this.generate();
  }

  // ─── RENDERING ───────────────────────────────────────────────

  /**
   * Render the current dungeon to the canvas.
   */
  draw() {
    if (!this.dungeon) return;
    this.renderer.render(this.dungeon, this.planner, this.flood);
  }

  /**
   * Force recomputation of auto-rotation on next render.
   * The actual computation is done inside renderer.computeLayout(),
   * which exactly matches the original layout() function.
   */
  _autoRotate() {
    // No-op: layout (including rotation) is computed inside render().
    // This method exists only for API compatibility.
  }

  // ─── USER INTERACTION ────────────────────────────────────────

  /**
   * Bind all event listeners (keyboard, mouse, window resize).
   */
  _bindEvents() {
    // Window resize — recalculate rotation and redraw
    window.addEventListener('resize', () => {
      this._resize();
      // Clear dragged note positions since screen coordinates are invalidated
      this.renderer.noteOverrides.clear();
      if (style.autoRotate) {
        this._autoRotate();
      }
      this.draw();
    });

    // ─── Note box dragging ──────────────────────────────────────
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // only left button
      // Only allow dragging when note boxes are visible
      if (!style.showNotes || style.noteMode !== 'normal') return;

      const placements = this.renderer.notePlacements;
      if (!placements || placements.length === 0) return;

      const cssX = e.offsetX;
      const cssY = e.offsetY;

      // Hit-test note boxes (check in reverse order so topmost drawn is hit first)
      for (let i = placements.length - 1; i >= 0; i--) {
        const p = placements[i];
        const halfW = p.boxW / 2 + p.padding;
        const halfH = p.boxH / 2 + p.padding;
        if (cssX >= p.x - halfW && cssX <= p.x + halfW &&
            cssY >= p.y - halfH && cssY <= p.y + halfH) {
          // Start dragging this note
          this._dragNote = {
            symb: p.symb,
            offsetX: cssX - p.x,
            offsetY: cssY - p.y,
          };
          this.canvas.style.cursor = 'grabbing';
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this._dragNote) {
        const cssX = e.offsetX;
        const cssY = e.offsetY;
        const newX = cssX - this._dragNote.offsetX;
        const newY = cssY - this._dragNote.offsetY;
        this.renderer.noteOverrides.set(this._dragNote.symb, { x: newX, y: newY });
        this.draw();
        return;
      }

      // Hover cursor: show grab cursor when over a note box
      if (style.showNotes && style.noteMode === 'normal') {
        const placements = this.renderer.notePlacements;
        if (placements && placements.length > 0) {
          const cssX = e.offsetX;
          const cssY = e.offsetY;
          let overNote = false;
          for (let i = placements.length - 1; i >= 0; i--) {
            const p = placements[i];
            const halfW = p.boxW / 2 + p.padding;
            const halfH = p.boxH / 2 + p.padding;
            if (cssX >= p.x - halfW && cssX <= p.x + halfW &&
                cssY >= p.y - halfH && cssY <= p.y + halfH) {
              overNote = true;
              break;
            }
          }
          this.canvas.style.cursor = overNote ? 'grab' : 'crosshair';
        }
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (this._dragNote) {
        this._dragNote = null;
        this.canvas.style.cursor = 'crosshair';
      }
    });

    // Stop dragging if mouse leaves canvas
    this.canvas.addEventListener('mouseleave', () => {
      if (this._dragNote) {
        this._dragNote = null;
        this.canvas.style.cursor = 'crosshair';
      }
    });
  }

  // Keyboard shortcuts removed — all features are accessible via the toolbar UI.

  /**
   * Resize canvas to fill the window.
   * Sets canvas backing-store size to CSS size * devicePixelRatio for sharp rendering.
   * The DPR scale is applied per-frame in the renderer (not here) to avoid accumulation.
   */
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    // Use parent container dimensions if available, otherwise window
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  // ─── PUBLIC API ──────────────────────────────────────────────

  /**
   * Get the current dungeon data as a plain object (for JSON export).
   */
  getData() {
    return this.dungeon ? this.dungeon.getData() : null;
  }

  /**
   * Get the current style configuration.
   */
  getStyle() {
    return style;
  }

  /**
   * Set a tag and regenerate.
   */
  setTag(tag) {
    this.blueprint.addTag(tag);
    this.generate();
  }

  /**
   * Remove a tag and regenerate.
   */
  removeTag(tag) {
    this.blueprint.removeTag(tag);
    this.generate();
  }

  /**
   * Generate with a specific seed.
   */
  setSeed(seed) {
    this.blueprint.seed = seed;
    this.generate();
  }

  // ─── EDITOR API ──────────────────────────────────────────────

  /**
   * Find which room contains grid coordinates (gx, gy).
   * Returns the room object or null.
   */
  findRoomAt(gx, gy) {
    if (!this.dungeon) return null;
    for (const room of this.dungeon.rooms) {
      if (gx >= room.x && gx < room.x + room.w && gy >= room.y && gy < room.y + room.h) {
        if (room.hidden && !style.showSecrets) continue;
        return room;
      }
    }
    return null;
  }

  /**
   * Find which door is at grid coordinates (gx, gy).
   */
  findDoorAt(gx, gy) {
    if (!this.dungeon) return null;
    for (const door of this.dungeon.doors) {
      if (door.x === gx && door.y === gy) return door;
    }
    return null;
  }

  /**
   * Convert CSS pixel coordinates to grid coordinates.
   * Accounts for DPR, layout transform (translate, scale, rotate).
   */
  cssToGrid(cssX, cssY) {
    if (!this.dungeon) return null;
    const layout = this.renderer.computeLayout(this.dungeon);
    const { fitScale, mapX, mapY, rotation } = layout;
    const cs = this.renderer.cellSize;

    // Reverse: css -> map-space -> rotated-space -> grid
    const mx = cssX - mapX;
    const my = cssY - mapY;

    // Reverse scale
    const sx = mx / fitScale;
    const sy = my / fitScale;

    // Reverse rotation
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const rx = sx * cos - sy * sin;
    const ry = sx * sin + sy * cos;

    return { gx: Math.floor(rx / cs), gy: Math.floor(ry / cs) };
  }

  /**
   * Convert grid coordinates to CSS pixel coordinates.
   * Inverse of cssToGrid — used for drawing overlays.
   */
  gridToCSS(gx, gy) {
    if (!this.dungeon) return null;
    const layout = this.renderer.computeLayout(this.dungeon);
    const { fitScale, mapX, mapY, rotation } = layout;
    const cs = this.renderer.cellSize;

    const rx = gx * cs;
    const ry = gy * cs;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const sx = rx * cos - ry * sin;
    const sy = rx * sin + ry * cos;
    return { cssX: sx * fitScale + mapX, cssY: sy * fitScale + mapY };
  }

  /**
   * Get the CSS pixel size of one grid cell (accounts for fitScale).
   */
  getGridCellCSS() {
    if (!this.dungeon) return 0;
    const layout = this.renderer.computeLayout(this.dungeon);
    return this.renderer.cellSize * layout.fitScale;
  }

  /**
   * Get the current map rotation in radians.
   */
  getRotation() {
    if (!this.dungeon) return 0;
    const layout = this.renderer.computeLayout(this.dungeon);
    return layout.rotation;
  }

  /**
   * Toggle a room property and re-render.
   */
  toggleRoom(room, prop) {
    this.pushUndo();
    if (prop === 'round') room.round = !room.round;
    else if (prop === 'columns') room.columns = !room.columns;
    else if (prop === 'hidden') {
      room.hidden = !room.hidden;
      if (this.dungeon) this.dungeon.populateNotes();
    }
    this.draw();
  }

  /**
   * Change a door type and re-render.
   */
  setDoorType(door, type) {
    this.pushUndo();
    door.type = type;
    this.draw();
  }

  /**
   * Remove a door and re-render.
   */
  removeDoor(door) {
    if (!this.dungeon) return;
    this.pushUndo();
    const idx = this.dungeon.doors.indexOf(door);
    if (idx !== -1) this.dungeon.doors.splice(idx, 1);
    this.draw();
  }

  /**
   * Set room description and refresh notes.
   */
  setRoomDesc(room, text) {
    room.desc = text;
    // Update the room's note text if it has one (preserves custom notes)
    if (room.note) {
      room.note.text = text;
    }
    this.draw();
  }

  /**
   * Set the dungeon title.
   */
  setTitle(title) {
    if (!this.dungeon || !this.dungeon.story) return;
    this.dungeon.story.name = title;
    this.draw();
  }

  /**
   * Set the dungeon story hook.
   */
  setStoryHook(hook) {
    if (!this.dungeon || !this.dungeon.story) return;
    this.dungeon.story.hook = hook;
    this.draw();
  }

  /**
   * Clear all props from a room and re-render.
   */
  clearRoomProps(room) {
    this.pushUndo();
    room.props = [];
    this.draw();
  }

  /**
   * Add a prop to a room. Returns the created prop object.
   */
  addRoomProp(room, type, relX, relY, scale = 0.6, rotation = 0) {
    this.pushUndo();
    const prop = {
      type,
      pos: { x: room.x + relX, y: room.y + relY },
      rotation,
      scale,
    };
    room.props.push(prop);
    this.draw();
    return prop;
  }

  /**
   * Update a prop's properties and re-render.
   */
  updateProp(prop, updates) {
    if (updates.scale !== undefined) prop.scale = updates.scale;
    if (updates.rotation !== undefined) {
      prop.rotation = updates.rotation;
      // Clear axis so renderer uses rotation directly
      delete prop.axis;
    }
    if (updates.type !== undefined) prop.type = updates.type;
    if (updates.x !== undefined) prop.pos.x = updates.x;
    if (updates.y !== undefined) prop.pos.y = updates.y;
    this.draw();
  }

  /**
   * Reorder props within a room. Props later in the array render on top.
   */
  reorderProps(room, fromIndex, toIndex) {
    this.pushUndo();
    const [moved] = room.props.splice(fromIndex, 1);
    room.props.splice(toIndex, 0, moved);
    this.draw();
  }

  /**
   * Remove a specific prop from its room and re-render.
   */
  removeProp(room, prop) {
    this.pushUndo();
    const idx = room.props.indexOf(prop);
    if (idx !== -1) room.props.splice(idx, 1);
    this.draw();
  }

  /**
   * Find a prop near grid coordinates in a room.
   */
  findPropAt(room, gx, gy) {
    if (!room || !room.props) return null;
    for (const prop of room.props) {
      const dx = prop.pos.x - gx;
      const dy = prop.pos.y - gy;
      if (Math.abs(dx) < 0.8 && Math.abs(dy) < 0.8) return prop;
    }
    return null;
  }

  /**
   * Set water level (0 to 1).
   */
  setWaterLevel(level) {
    Parameters.waterLevel = level;
    if (this.flood) {
      this.flood.setLevel(level);
    }
    this.draw();
  }

  /**
   * Get all visible rooms (for editor panel listing).
   */
  getVisibleRooms() {
    if (!this.dungeon) return [];
    return this.dungeon.rooms.filter(r => !r.hidden || style.showSecrets);
  }

  /**
   * Get all doors.
   */
  getDoors() {
    return this.dungeon ? this.dungeon.doors : [];
  }

  /**
   * Add a new room to the dungeon at the given grid rectangle.
   * Creates a standalone room (no door connections).
   * @param {number} gx - Grid X of top-left corner
   * @param {number} gy - Grid Y of top-left corner
   * @param {number} w - Width in grid cells (minimum 3)
   * @param {number} h - Height in grid cells (minimum 3)
   * @returns {Room|null} The created room, or null if dungeon not ready
   */
  addRoom(gx, gy, w, h) {
    if (!this.dungeon) return null;
    this.pushUndo();
    // Add 1-cell wall band on each side so visible floor matches the drawn area
    const rw = Math.max(3, w + 2);
    const rh = Math.max(3, h + 2);

    // Create room using DOWN axis, offset by -1 to center wall band around drawn area
    const origin = new Dot(gx - 1 + Math.floor(rw / 2), gy - 1);
    const room = new Room(origin, Room.DOWN, rw, rh, 1);
    room.seed = Date.now();
    room.props = [];
    this.dungeon.addRoom(room);
    this.dungeon.populateNotes();
    this.draw();
    return room;
  }

  /**
   * Remove a room from the dungeon.
   * @param {Room} room - Room to remove
   */
  removeEditorRoom(room) {
    if (!this.dungeon) return;
    this.pushUndo();
    this.dungeon.removeRoom(room);
    this.dungeon.populateNotes();
    this.draw();
  }

  /**
   * Create a freeform path from an array of waypoints.
   * Each pair of consecutive waypoints creates a corridor room.
   * Non-axis-aligned pairs get an auto-corner (horizontal first, then vertical).
   * Doors are placed at junctions and at endpoints touching existing rooms.
   *
   * @param {{ x: number, y: number }[]} points - Waypoints in grid coords
   * @param {number} corridorWidth - Corridor width (default 3)
   */
  createPath(points, corridorWidth = 3) {
    if (!this.dungeon || points.length < 2) return;
    this.pushUndo();

    const hw = Math.floor(corridorWidth / 2);

    // Expand non-axis-aligned pairs into axis-aligned sub-segments with corner points
    const expanded = [];
    for (let i = 0; i < points.length; i++) {
      expanded.push(points[i]);
      if (i < points.length - 1) {
        const a = points[i], b = points[i + 1];
        if (a.x !== b.x && a.y !== b.y) {
          expanded.push({ x: b.x, y: a.y });
        }
      }
    }

    // For each segment, extend the endpoint by hw cells past each corner
    // so adjacent perpendicular corridors overlap — no gap at turns.
    const corridors = [];
    for (let i = 0; i < expanded.length - 1; i++) {
      let p1 = expanded[i], p2 = expanded[i + 1];
      if (p1.x === p2.x && p1.y === p2.y) continue;

      let x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;

      if (y1 === y2) {
        // Horizontal — extend left/right by hw at internal junctions
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const extLeft = (i > 0) ? hw : 0;
        const extRight = (i < expanded.length - 2) ? hw : 0;
        x1 = left - extLeft;
        x2 = right + extRight;
      } else {
        // Vertical — extend up/down by hw at internal junctions
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);
        const extTop = (i > 0) ? hw : 0;
        const extBot = (i < expanded.length - 2) ? hw : 0;
        y1 = top - extTop;
        y2 = bottom + extBot;
      }

      const room = this._makeCorridorRoom(x1, y1, x2, y2, corridorWidth);
      if (room) {
        room.seed = Date.now() + corridors.length;
        room.props = [];
        this.dungeon.addRoom(room);
        corridors.push(room);
      }
    }

    // Add doors at start/end if touching existing rooms
    if (corridors.length > 0) {
      const startPt = expanded[0];
      const startRoom = this.findRoomAt(startPt.x, startPt.y);
      if (startRoom && startRoom !== corridors[0]) {
        const pos = new Dot(startPt.x, startPt.y);
        if (!this.dungeon.getDoor(pos)) {
          const door = new Door(pos, startRoom, corridors[0]);
          door.type = 0;
          this.dungeon.addDoor(door);
        }
      }

      const endPt = expanded[expanded.length - 1];
      const endRoom = this.findRoomAt(endPt.x, endPt.y);
      if (endRoom && endRoom !== corridors[corridors.length - 1]) {
        const pos = new Dot(endPt.x, endPt.y);
        if (!this.dungeon.getDoor(pos)) {
          const door = new Door(pos, corridors[corridors.length - 1], endRoom);
          door.type = 0;
          this.dungeon.addDoor(door);
        }
      }
    }

    this.dungeon.populateNotes();
    this.draw();
    return corridors;
  }

  /**
   * Create a single corridor room between two axis-aligned points.
   */
  _makeCorridorRoom(x1, y1, x2, y2, corridorWidth) {
    if (y1 === y2) {
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const depth = right - left + 1;
      if (depth < 1) return null;
      const origin = new Dot(left, y1);
      return new Room(origin, Room.RIGHT, corridorWidth, depth, 1);
    } else if (x1 === x2) {
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);
      const depth = bottom - top + 1;
      if (depth < 1) return null;
      const origin = new Dot(x1, top);
      return new Room(origin, Room.DOWN, corridorWidth, depth, 1);
    }
    return null;
  }

  // ─── UNDO / REDO ────────────────────────────────────────────

  /**
   * Take a snapshot of the current dungeon state for undo.
   * Call this BEFORE making any mutation.
   */
  pushUndo() {
    if (!this.dungeon) return;
    const snap = this._snapshot();
    if (!snap) return;
    this._undoStack.push(snap);
    if (this._undoStack.length > this._maxHistory) this._undoStack.shift();
    this._redoStack = []; // clear redo on new action
  }

  /**
   * Undo the last mutation. Returns true if undo was performed.
   */
  undo() {
    if (!this.dungeon || this._undoStack.length === 0) return false;
    this._redoStack.push(this._snapshot());
    const snap = this._undoStack.pop();
    this._restore(snap);
    this.draw();
    return true;
  }

  /**
   * Redo the last undone mutation. Returns true if redo was performed.
   */
  redo() {
    if (!this.dungeon || this._redoStack.length === 0) return false;
    this._undoStack.push(this._snapshot());
    const snap = this._redoStack.pop();
    this._restore(snap);
    this.draw();
    return true;
  }

  /** Number of available undo steps */
  get undoCount() { return this._undoStack.length; }
  /** Number of available redo steps */
  get redoCount() { return this._redoStack.length; }

  /**
   * Snapshot rooms, doors, and story into a plain JSON-safe object.
   */
  _snapshot() {
    if (!this.dungeon) return null;
    const rooms = this.dungeon.rooms.map(r => ({
      x: r.x, y: r.y, w: r.w, h: r.h,
      originX: r.origin.x, originY: r.origin.y,
      axisX: r.axis.x, axisY: r.axis.y,
      width: r.width, depth: r.depth, mirror: r.mirror,
      seed: r.seed, round: r.round, columns: r.columns, hidden: r.hidden,
      symm: r.symm, desc: r.desc,
      enemy: r.enemy, loot: r.loot, key: r.key, gate: r.gate, event: r.event, enviro: r.enviro,
      props: r.props.map(p => ({
        type: p.type,
        posX: p.pos.x, posY: p.pos.y,
        scale: p.scale ?? 0.6, rotation: p.rotation ?? 0,
        axisX: p.axis ? p.axis.x : undefined, axisY: p.axis ? p.axis.y : undefined,
        width: p.width,
      })),
      note: r.note ? { px: r.note.point.x, py: r.note.point.y, symb: r.note.symb, text: r.note.text } : null,
    }));
    const doors = this.dungeon.doors.map(d => ({
      x: d.x, y: d.y, type: d.type,
      dirX: d.dir ? d.dir.x : null, dirY: d.dir ? d.dir.y : null,
      fromIdx: d.from ? this.dungeon.rooms.indexOf(d.from) : -1,
      toIdx: d.to ? this.dungeon.rooms.indexOf(d.to) : -1,
    }));
    const story = this.dungeon.story ? {
      name: this.dungeon.story.name,
      hook: this.dungeon.story.hook,
    } : null;
    return { rooms, doors, story };
  }

  /**
   * Restore dungeon state from a snapshot.
   */
  _restore(snap) {
    if (!this.dungeon || !snap) return;

    // Rebuild rooms
    this.dungeon.rooms = snap.rooms.map(r => {
      const origin = new Dot(r.originX, r.originY);
      const axis = new Dot(r.axisX, r.axisY);
      const room = new Room(origin, axis, r.width, r.depth, r.mirror);
      room.seed = r.seed;
      room.round = r.round;
      room.columns = r.columns;
      room.hidden = r.hidden;
      room.symm = r.symm;
      room.desc = r.desc;
      room.enemy = r.enemy; room.loot = r.loot; room.key = r.key;
      room.gate = r.gate; room.event = r.event; room.enviro = r.enviro;
      room.dungeon = this.dungeon;
      room.props = r.props.map(p => {
        const prop = { type: p.type, pos: { x: p.posX, y: p.posY }, scale: p.scale, rotation: p.rotation };
        if (p.axisX !== undefined) prop.axis = { x: p.axisX, y: p.axisY };
        if (p.width !== undefined) prop.width = p.width;
        return prop;
      });
      if (r.note) {
        room.note = { point: { x: r.note.px, y: r.note.py }, symb: r.note.symb, text: r.note.text };
      }
      return room;
    });

    // Rebuild doors with references to rebuilt rooms
    this.dungeon.doors = snap.doors.map(d => {
      const from = d.fromIdx >= 0 ? this.dungeon.rooms[d.fromIdx] : null;
      const to = d.toIdx >= 0 ? this.dungeon.rooms[d.toIdx] : null;
      const door = new Door(new Dot(d.x, d.y), null, null);
      door.from = from;
      door.to = to;
      door.type = d.type;
      door.dir = (d.dirX != null) ? new Dot(d.dirX, d.dirY) : null;
      return door;
    });

    // Restore story text
    if (snap.story && this.dungeon.story) {
      this.dungeon.story.name = snap.story.name;
      this.dungeon.story.hook = snap.story.hook;
    }
  }

  /**
   * Load a dungeon from serialized save data.
   * Generates from seed to get planner/flood/story, then restores the snapshot.
   * @param {Object} saveData - Data from serialize()
   */
  loadFromSave(saveData) {
    if (!saveData) return false;

    // Generate from seed first to get planner, flood, story
    const seed = saveData.seed || 0;
    this.blueprint = new Blueprint(seed, []);
    this.generate();

    if (!this.dungeon) return false;

    // Now restore the snapshot (rooms, doors, story edits) from saved data
    if (saveData._snapshot) {
      this._restore(saveData._snapshot);
    }

    // Restore editor state
    if (saveData.editorState) {
      const es = saveData.editorState;
      if (es.noteOverrides) {
        this.renderer.noteOverrides.clear();
        for (const [key, val] of Object.entries(es.noteOverrides)) {
          this.renderer.noteOverrides.set(key, val);
        }
      }
      if (es.rotation != null) style.rotation = es.rotation;
      if (es.showGrid != null) style.showGrid = es.showGrid;
      if (es.showWater != null) style.showWater = es.showWater;
      if (es.showProps != null) style.showProps = es.showProps;
      if (es.showNotes != null) style.showNotes = es.showNotes;
      if (es.showSecrets != null) style.showSecrets = es.showSecrets;
      if (es.showTitle != null) style.showTitle = es.showTitle;
      if (es.bw != null) style.bw = es.bw;
    }

    // Clear undo/redo stacks for a fresh start
    this._undoStack = [];
    this._redoStack = [];

    this.draw();
    return true;
  }

  /**
   * Serialize the entire dungeon state for saving.
   * Includes everything needed to restore: rooms, doors, notes, water, story.
   */
  serialize() {
    if (!this.dungeon) return null;
    // Capture snapshot BEFORE getData() — getData calls populateNotes()
    // which clears custom room notes. Snapshot preserves them.
    const snapshot = this._snapshot();
    const data = this.dungeon.getData();
    // Add seed for regeneration on load
    data.seed = this.dungeon.seed;
    data._snapshot = snapshot;
    // Add editor-specific state
    data.editorState = {
      noteOverrides: Object.fromEntries(this.renderer.noteOverrides),
      rotation: style.rotation,
      palette: style.currentPalette || 'default',
      showGrid: style.showGrid,
      showWater: style.showWater,
      showProps: style.showProps,
      showNotes: style.showNotes,
      showSecrets: style.showSecrets,
      showTitle: style.showTitle,
      bw: style.bw,
    };
    return data;
  }
}

export default App;
