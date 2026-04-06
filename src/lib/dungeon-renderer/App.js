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
    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => this._onKey(e));

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

    // Click to regenerate (on canvas), but not when double-clicking a note box
    this.canvas.addEventListener('dblclick', (e) => {
      if (style.showNotes && style.noteMode === 'normal') {
        const placements = this.renderer.notePlacements;
        if (placements && placements.length > 0) {
          const cssX = e.offsetX;
          const cssY = e.offsetY;
          for (let i = placements.length - 1; i >= 0; i--) {
            const p = placements[i];
            const halfW = p.boxW / 2 + p.padding;
            const halfH = p.boxH / 2 + p.padding;
            if (cssX >= p.x - halfW && cssX <= p.x + halfW &&
                cssY >= p.y - halfH && cssY <= p.y + halfH) {
              return; // double-click on note box — do not regenerate
            }
          }
        }
      }
      this.newDungeon();
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

  /**
   * Handle keyboard input.
   * Mirrors the original generator's keyboard shortcuts.
   */
  _onKey(e) {
    const key = e.key.toLowerCase();
    const shift = e.shiftKey;

    switch (key) {
      // ─── Generation ───
      case 'enter':
        e.preventDefault();
        this.newDungeon();
        break;

      case ' ':
        e.preventDefault();
        // Re-roll notes (regenerate with same structure)
        if (this.planner) {
          this.planner.rollNotes();
          if (this.dungeon) this.dungeon.populateNotes();
          this.draw();
        }
        break;

      // ─── Palettes (1-5) ───
      case '1':
        if (shift) { style.gridScale = 1; }
        else { style.setPalette('default'); }
        style.save();
        this.draw();
        break;
      case '2':
        if (shift) { style.gridScale = 2; }
        else { style.setPalette('ancient'); }
        style.save();
        this.draw();
        break;
      case '3':
        style.setPalette('light');
        style.save();
        this.draw();
        break;
      case '4':
        style.setPalette('modern');
        style.save();
        this.draw();
        break;
      case '5':
        style.setPalette('link');
        style.save();
        this.draw();
        break;

      // ─── Toggles ───
      case 'g':
        if (shift) { style.cycleGrid(); }
        else { style.showGrid = !style.showGrid; }
        style.save();
        this.draw();
        break;

      case 'w':
        if (shift) {
          // Raise water level
          Parameters.waterLevel = Math.round((Parameters.waterLevel + 0.1) * 10) / 10;
          if (Parameters.waterLevel > 1) Parameters.waterLevel = 0;
          if (this.flood) {
            this.flood.setLevel(Parameters.waterLevel);
          }
        } else {
          style.showWater = !style.showWater;
        }
        style.save();
        this.draw();
        break;

      case 'p':
        style.showProps = !style.showProps;
        style.save();
        this.draw();
        break;

      case 'h':
        style.showSecrets = !style.showSecrets;
        // Toggle hidden flag on secret rooms (matching original toggleSecrets)
        if (this.planner) {
          const secrets = this.planner.getSecrets();
          for (const room of secrets) {
            room.hidden = !style.showSecrets;
          }
        }
        // Re-populate notes (hidden rooms are excluded from notes)
        if (this.dungeon) this.dungeon.populateNotes();
        style.save();
        this.draw();
        break;

      case 'n':
        style.cycleNotes();
        style.save();
        this.draw();
        break;

      case 'c':
        style.showConnectors = !style.showConnectors;
        style.save();
        this.draw();
        break;

      case 'l':
        style.showLegend = !style.showLegend;
        style.save();
        this.draw();
        break;

      case 'm':
        style.bw = !style.bw;
        style.save();
        this.draw();
        break;

      case 'r':
        style.autoRotate = !style.autoRotate;
        if (style.autoRotate) {
          this._autoRotate();
        } else {
          style.rotation = 0;
        }
        style.save();
        this.draw();
        break;

      // ─── Export ───
      case 'e':
        if (shift) {
          // Export PNG with scale dialog
          const scale = parseFloat(prompt('Export scale (1-5):', '2')) || 2;
          Formats.exportPNG(this.dungeon, this.renderer, scale);
        } else {
          Formats.exportPNG(this.dungeon, this.renderer, 1);
        }
        break;

      case 'j':
        Formats.exportJSON(this.dungeon);
        break;

      case 's':
        Formats.exportSVG(this.dungeon, this.renderer);
        break;
    }
  }

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
   * Toggle a room property and re-render.
   */
  toggleRoom(room, prop) {
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
    door.type = type;
    this.draw();
  }

  /**
   * Remove a door and re-render.
   */
  removeDoor(door) {
    if (!this.dungeon) return;
    const idx = this.dungeon.doors.indexOf(door);
    if (idx !== -1) this.dungeon.doors.splice(idx, 1);
    this.draw();
  }

  /**
   * Set room description and refresh notes.
   */
  setRoomDesc(room, text) {
    room.desc = text;
    if (this.dungeon) this.dungeon.populateNotes();
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
    room.props = [];
    this.draw();
  }

  /**
   * Add a prop to a room.
   */
  addRoomProp(room, type, relX, relY) {
    room.props.push({
      type,
      pos: { x: room.x + relX, y: room.y + relY },
      rotation: 0,
      scale: 0.6,
    });
    this.draw();
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
   * Serialize the entire dungeon state for saving.
   * Includes everything needed to restore: rooms, doors, notes, water, story.
   */
  serialize() {
    if (!this.dungeon) return null;
    const data = this.dungeon.getData();
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
