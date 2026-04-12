/**
 * DungeonRenderer - Main canvas renderer for dungeon visualization
 *
 * Faithfully reconstructed from the original Watabou v1.2.7 rendering pipeline.
 *
 * Original layer order (critical for correct visuals):
 *   1. Shading (hatching + semi-transparent fill on wall bands)
 *   2. Shape (thick wall strokes + floor fills on SHRUNK polygons + door seams)
 *   3. Water
 *   4. Shadows (thick strokes with multiply blend, masked, offset)
 *   5. Grid (inside rooms, dotted/dashed patterns)
 *   6. Props (room decorations)
 *   7. Details (door symbols + colonnades + cracks)
 *
 * Key insight: floor polygons are shrunk by 1 grid unit from room bounds.
 * This creates a natural "wall band" where hatching shows through.
 * Hatching is drawn FIRST on the expanded area; then floors cover the interior.
 */

import style, { GRID_MODES, NOTE_MODES } from './Style.js';
import Parameters from './Parameters.js';
import { rng } from './Random.js';
import { chaikinSmooth } from './Geometry.js';

// Hatching configuration (matches original jb.* values)
const HATCHING = {
  mode: 'Default',
  nStrokes: 3,                  // parallel lines per cluster
  clusterRatio: 0.333,          // clusterSize = cellSize * clusterRatio
  distanceRatio: 0.5,           // distance = cellSize * distanceRatio
};

class DungeonRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = style.cellSize; // 30

    /**
     * User-overridden note box positions, keyed by note symbol (e.g. "A", "1").
     * Values are {x, y} in screen (CSS-pixel) space.
     * When a note has an entry here, the renderer uses it instead of the
     * auto-computed position.  Cleared on generate() so a new dungeon starts fresh.
     * @type {Map<string, {x: number, y: number}>}
     */
    this.noteOverrides = new Map();

    /**
     * Last-rendered note box placements (screen space).
     * Each entry: { x, y, boxW, boxH, padding, symb, screenTarget }
     * Populated every frame by _drawNoteBoxes so the App can hit-test for dragging.
     * @type {Array}
     */
    this.notePlacements = [];
  }

  // ─── LAYOUT ────────────────────────────────────────────────

  /**
   * Measure top reserved space (title + story height), exactly matching
   * the original layout() computation (Dungeon-built.js ~line 9969-9971):
   *
   *   b = title.visible ? story.y + story.height : 50
   *
   * where story.y = title.height, and heights come from actual text metrics.
   *
   * @param {Dungeon} dungeon
   * @param {number} rWidth - viewport width in CSS pixels
   * @returns {number} top reserved space in CSS pixels
   */
  _measureTopReserved(dungeon, rWidth) {
    const hasTitle = !!(dungeon.story && dungeon.story.name);
    if (!hasTitle) return 50;

    const ctx = this.ctx;
    ctx.save();

    // ── Measure title height ──
    // Original layoutTitle: scale = min((rWidth - 100) / textWidth, 1)
    // OpenFL TextField height for a single line ≈ fontSize (the textHeight).
    // When scaled, title.height = textHeight * scale (OpenFL scales the display object).
    ctx.font = style.getFontCSS(style.fontTitle);
    const titleMetrics = ctx.measureText(dungeon.story.name);
    const titleTextWidth = titleMetrics.width;
    const titleScale = Math.min((rWidth - 100) / titleTextWidth, 1);
    // Use actualBoundingBox metrics if available; otherwise approximate
    const titleNaturalHeight = (titleMetrics.fontBoundingBoxAscent !== undefined)
      ? titleMetrics.fontBoundingBoxAscent + titleMetrics.fontBoundingBoxDescent
      : style.fontTitle.size;
    const titleHeight = titleNaturalHeight * titleScale;

    // ── Measure story height ──
    // Original layoutStory: word-wraps the story text and measures height
    // story.y = title.height
    let storyHeight = 0;
    if (dungeon.story.hook) {
      ctx.font = style.getFontCSS(style.fontStory);
      // Original wraps to max(min(rWidth, rHeight), title.get_width()) - 100
      const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
      const rHeight = this.canvas.height / dpr;
      const wrapWidth = Math.max(
        Math.min(rWidth, rHeight),
        titleTextWidth * titleScale
      ) - 100;
      const lines = this._wrapText(ctx, dungeon.story.hook, wrapWidth);
      // Line height: use font metrics if available, otherwise approximate
      const storyMetrics = ctx.measureText('Mg');
      const storyLineHeight = (storyMetrics.fontBoundingBoxAscent !== undefined)
        ? storyMetrics.fontBoundingBoxAscent + storyMetrics.fontBoundingBoxDescent
        : style.fontStory.size * 1.2;
      storyHeight = lines.length * storyLineHeight;
    }

    ctx.restore();

    // topReserved = story.y + story.height + padding below story
    return titleHeight + storyHeight + 30;
  }

  /**
   * Compute complete layout for the dungeon.
   * Exactly matches the original layout() function (Dungeon-built.js ~line 9965).
   *
   * Original pseudocode:
   *   a = rWidth - 100                           // available width
   *   b = title ? story.y + story.height : 50    // top reserved
   *   c = rHeight - b - 50                        // available height
   *   d = 0                                        // legend width (0 in NORMAL mode)
   *   f = 0                                        // rotation angle
   *   if autoRotation:
   *     l = log(a / c)                             // target log aspect ratio
   *     F = Infinity                               // best score
   *     for h = -9 to 8:
   *       k = (h / 18) * PI
   *       g = dungeon.getBounds(k)
   *       score = |l - log(g.width / g.height)|
   *       if F / score > 1.01: adopt (F = score, f = k)
   *   g = dungeon.getBounds(f)                     // final bounds at chosen angle
   *   scale = min(a / g.width, c / g.height) / 30  // fit-scale
   *   if scale > 1: scale = sqrt(scale)            // zoom2fit cap
   *   center = (g.x + g.w/2, g.y + g.h/2)         // bounds center in grid units
   *   scaledCS = scale * 30
   *   mapX = rWidth/2 - center.x * scaledCS + d/2
   *   mapY = b + c/2 - center.y * scaledCS
   *
   * @param {Dungeon} dungeon
   * @returns {{ rotation, fitScale, mapX, mapY, topReserved, availW, availH,
   *             rotatedBounds, scaledCS, canvasW, canvasH }}
   */
  computeLayout(dungeon) {
    const cs = this.cellSize; // 30
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    const canvasW = this.canvas.width / dpr;  // rWidth
    const canvasH = this.canvas.height / dpr; // rHeight

    // Padding around all edges
    const padX = 50; // left and right padding (each side)
    const padTop = 20; // top padding above title
    const padBottom = 50; // bottom padding

    // ── a = rWidth - 2*padX ──
    let availW = canvasW - 2 * padX;

    // ── b = topReserved (title + story height + top padding) ──
    const topReserved = padTop + (style.showTitle ? this._measureTopReserved(dungeon, canvasW) : 20);

    // ── c = rHeight - b - padBottom ──
    const availH = canvasH - topReserved - padBottom;

    // ── d = 0 (legend width, only non-zero in LEGEND mode) ──
    const legendWidth = 0;

    // ── Rotation angle ──
    let rotation = 0;
    if (style.autoRotate) {
      const targetLogRatio = Math.log(availW / availH); // l
      let bestScore = Infinity; // F
      for (let h = -9; h < 9; h++) {
        const k = (h / 18) * Math.PI;
        const g = dungeon.getBounds(k);
        if (g.w === 0 || g.h === 0) continue;
        const score = Math.abs(targetLogRatio - Math.log(g.w / g.h));
        if (bestScore / score > 1.01) {
          bestScore = score;
          rotation = k;
        }
      }
    } else {
      rotation = style.rotation || 0;
    }

    // ── Bounds at chosen angle ──
    const rotatedBounds = dungeon.getBounds(rotation);

    // ── Scale ──
    let fitScale = (rotatedBounds.w > 0 && rotatedBounds.h > 0)
      ? Math.min(availW / rotatedBounds.w, availH / rotatedBounds.h) / cs
      : 1;
    // zoom2fit cap: sqrt if scale > 1
    if (fitScale > 1) {
      fitScale = Math.sqrt(fitScale);
    }

    // ── Center and position ──
    const centerGX = rotatedBounds.x + rotatedBounds.w / 2;
    const centerGY = rotatedBounds.y + rotatedBounds.h / 2;
    const scaledCS = fitScale * cs;
    const mapX = canvasW / 2 - centerGX * scaledCS + legendWidth / 2;
    const mapY = topReserved + availH / 2 - centerGY * scaledCS;

    // Debug: log layout computation (enable via: window._debugLayout = true)
    if (typeof window !== 'undefined' && window._debugLayout) {
      const rect = dungeon.getRect();
      console.log('[Layout]', {
        canvasW, canvasH, topReserved, availW, availH,
        rotationDeg: (rotation * 180 / Math.PI).toFixed(1),
        unrotatedRect: rect ? `(${rect.x},${rect.y} ${rect.w}x${rect.h})` : 'null',
        rotatedBounds: `(${rotatedBounds.x.toFixed(1)},${rotatedBounds.y.toFixed(1)} ${rotatedBounds.w.toFixed(1)}x${rotatedBounds.h.toFixed(1)})`,
        fitScale: fitScale.toFixed(4), scaledCS: scaledCS.toFixed(2),
        mapX: mapX.toFixed(1), mapY: mapY.toFixed(1),
        nRooms: dungeon.rooms.length, nBlocks: dungeon.blocks.length,
      });
    }

    return {
      rotation, fitScale, mapX, mapY,
      topReserved, availW, availH,
      rotatedBounds, scaledCS, canvasW, canvasH,
    };
  }

  // ─── MAIN RENDER ──────────────────────────────────────────

  /**
   * Render the complete dungeon.
   * @param {Dungeon} dungeon
   * @param {Planner} planner
   * @param {Flood} flood
   */
  render(dungeon, planner, flood) {
    // Save RNG state and reset to a deterministic render seed so that
    // hatching, cracks, and other visual randomness is identical across
    // redraws (e.g. when only the water level changes).
    const savedSeed = rng.seed;
    rng.reset(dungeon.seed + 99999);

    const ctx = this.ctx;
    const canvas = this.canvas;
    const cs = this.cellSize;

    // Pre-compute polygons for ALL drawable elements (rooms + doors).
    // Original: this.drawable = this.rooms.concat(this.doors)
    // Both rooms AND doors contribute floor polygons, shadows, and seams.
    // Door floor polygons are critical: they bridge the gap between adjacent
    // rooms so the floor fill covers the hatching in the door cell area.
    const allPolys = [];     // floor polygons (in pixels) for rooms AND doors
    const allShadows = [];   // shadow polygons for rooms AND doors
    const seamLines = [];    // door seam lines

    // Filter rooms and doors matching original updateDrawable() (line 10501):
    // - Exclude hidden rooms (unless showSecrets is on)
    // - Only include doors whose from/to rooms are both visible, or entrance/exit doors
    const visibleRooms = dungeon.rooms.filter(r => !r.hidden || style.showSecrets);
    const visibleDoors = dungeon.doors.filter(d =>
      d.type === 3 || d.type === 8 || // entrance/exit always visible
      (visibleRooms.indexOf(d.from) !== -1 && visibleRooms.indexOf(d.to) !== -1)
    );

    for (const room of visibleRooms) {
      const poly = this._getRoomPoly(room);
      allPolys.push(poly);
      allShadows.push(poly.slice()); // rooms use their floor poly as shadow
    }
    for (const door of visibleDoors) {
      allPolys.push(this._getDoorPoly(door));
      const shadow = this._getDoorShadowPoly(door);
      allShadows.push(shadow || allPolys[allPolys.length - 1].slice());
      const seams = this._getDoorSeams(door);
      for (const s of seams) seamLines.push(s);
    }

    // ─── Clear canvas ───
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = style.getPaper();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // ─── Compute layout (rotation, scale, position) ───
    // Uses computeLayout() which exactly matches original layout().
    const layout = this.computeLayout(dungeon);
    const { rotation, fitScale, mapX, mapY, topReserved, availW, availH,
            rotatedBounds, scaledCS, canvasW, canvasH } = layout;

    // Store rotation back to style so it persists
    style.rotation = rotation;

    // Store layout for external consumers (token overlay, fog of war)
    this._layout = layout;

    ctx.save();
    // Apply DPR scaling + the transform chain: dpr * translate -> scale -> rotate
    // Original OpenFL: translate(map.x, map.y) -> rotate(angle) -> scale(fitScale)
    // With uniform scale, scale and rotate commute, so this is equivalent:
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(mapX, mapY);
    ctx.scale(fitScale, fitScale);
    ctx.rotate(rotation);
    // Now drawing at (gridX * cs, gridY * cs) will appear correctly on screen

    // ═══════ LAYER 1: Shading (hatching + tinted wall bands) ═══════
    this._drawShading(dungeon);

    // ═══════ LAYER 2: Shape (walls + floors + door seams) ═══════
    this._drawShape(dungeon, allPolys, seamLines);

    // ═══════ LAYER 3: Water ═══════
    if (style.showWater && flood) {
      this._drawWater(flood, allPolys);
    }

    // ═══════ LAYER 4: Shadows ═══════
    if (style.showShadows && !style.bw) {
      this._drawShadows(allShadows);
    }

    // ═══════ LAYER 5: Grid ═══════
    if (style.showGrid && style.gridMode !== GRID_MODES.HIDDEN) {
      this._drawGrid(dungeon);
    }

    // ═══════ LAYER 6: Props ═══════
    if (style.showProps) {
      this._drawProps(dungeon);
    }

    // ═══════ LAYER 7: Details (doors + colonnades + cracks) ═══════
    this._drawDoors(dungeon);
    if (style.showProps) {
      this._drawColonnades(dungeon);
    }
    this._drawCracks(dungeon);

    ctx.restore();
    // ── Transform is now reset to identity (DPR only). ──
    // Title, story hook, note boxes, and room numbers are drawn in screen
    // space so they remain horizontal regardless of dungeon rotation.

    // Screen-space bounds of the rotated dungeon bounding box
    const screenBounds = {
      minX: mapX + rotatedBounds.x * scaledCS,
      minY: mapY + rotatedBounds.y * scaledCS,
      maxX: mapX + (rotatedBounds.x + rotatedBounds.w) * scaledCS,
      maxY: mapY + (rotatedBounds.y + rotatedBounds.h) * scaledCS,
      width: rotatedBounds.w * scaledCS,
      height: rotatedBounds.h * scaledCS,
    };

    // Helper to transform a local grid point to screen coordinates
    // (applies: rotate -> scale -> translate, matching the transform chain above)
    const localToScreen = (gx, gy) => {
      const lx = gx * cs;
      const ly = gy * cs;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const rx = lx * cosR - ly * sinR;
      const ry = lx * sinR + ly * cosR;
      return {
        x: mapX + rx * fitScale,
        y: mapY + ry * fitScale,
      };
    };

    // ═══════ LAYER 8: Room numbers (screen space, always upright) ═══════
    if (style.showNotes && style.noteMode !== NOTE_MODES.HIDDEN) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._drawRoomNumbers(dungeon, localToScreen, fitScale);
      ctx.restore();
    }

    // ═══════ LAYER 8b: Note boxes (screen space, horizontal text) ═══════
    if (style.showNotes && style.noteMode === NOTE_MODES.NORMAL) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._drawNoteBoxes(dungeon, screenBounds, localToScreen);
      ctx.restore();
    } else {
      // Clear stale placement data so hit-testing doesn't match invisible boxes
      this.notePlacements = [];
    }

    // ═══════ LAYER 9: Title & Story Hook (screen space, horizontal text) ═══════
    if (style.showTitle && dungeon.story && dungeon.story.name) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._drawTitle(dungeon.story.name, screenBounds, canvasW);
      if (dungeon.story.hook) {
        this._drawStoryHook(dungeon.story.hook, dungeon.story.name, canvasW);
      }
      ctx.restore();
    }

    // Restore RNG state so generation logic isn't affected by render calls
    rng.reset(savedSeed);
  }

  // ─── POLYGON HELPERS ──────────────────────────────────────

  /**
   * Get the floor polygon for a room, shrunk by 1 grid unit.
   * Original: Da.getPoly = function(a){ var b = a.inflate(-1,-1); ... }
   */
  _getRoomPoly(room) {
    const cs = this.cellSize;
    if (room.round) {
      const shrunk = { x: room.x + 1, y: room.y + 1, w: room.w - 2, h: room.h - 2 };
      const cx = (shrunk.x + shrunk.w / 2) * cs;
      const cy = (shrunk.y + shrunk.h / 2) * cs;
      const r = Math.sqrt(shrunk.w * shrunk.w + 1) / 2 * cs;
      const pts = [];
      for (let i = 0; i < 36; i++) {
        const angle = (2 * Math.PI * i) / 36;
        pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
      return pts;
    }
    // Rectangular: shrink by 1 unit
    const bx = (room.x + 1) * cs;
    const by = (room.y + 1) * cs;
    const bw = (room.w - 2) * cs;
    const bh = (room.h - 2) * cs;
    return [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]];
  }

  /**
   * Get the floor polygon for a door cell.
   * Original: Fa.getPoly - returns a polygon specific to door type.
   *
   * Door floor polys are CRITICAL for connected rooms: they fill the gap
   * between adjacent room floor polys (which are shrunk by 1 unit), covering
   * the hatching in the door cell area and making rooms appear connected.
   *
   * Types:
   *   0 (regular), 3 (entrance), 8 (stairs), 9 (steps): full 1x1 cell
   *   1,2,4,5 (archway/secret/locked/boss): doorwayPoly (U-shaped indent)
   *   6 (secret entrance): half-cell
   *   7 (barred): barredPoly (half-open shape)
   *
   * The poly is in grid units then scaled to pixels (×cellSize).
   * rotateYX(pts, sinA, cosA): (x,y) -> (x*cosA - y*sinA, y*cosA + x*sinA)
   * Called with (-dir.x, dir.y), so cosA=dir.y, sinA=-dir.x.
   */
  _getDoorPoly(door) {
    const cs = this.cellSize;
    const dir = door.dir || { x: 0, y: 1 };
    const type = door.type || 0;
    const sinA = -dir.x;
    const cosA = dir.y;

    // Helper: rotateYX then translate to door center, then scale to pixels
    const transformPoly = (pts) => pts.map(([x, y]) => [
      (x * cosA - y * sinA + door.x + 0.5) * cs,
      (y * cosA + x * sinA + door.y + 0.5) * cs,
    ]);

    switch (type) {
      case 1: // Archway
      case 2: // Secret
      case 4: // Locked
      case 5: // Boss gate
      {
        // doorwayPoly: U-shaped indent on both sides
        const doorwayPoly = [
          [-0.5, -0.5], [0.5, -0.5], [0.5, -0.25], [0.3, -0.25],
          [0.3, 0.25], [0.5, 0.25], [0.5, 0.5], [-0.5, 0.5],
          [-0.5, 0.25], [-0.3, 0.25], [-0.3, -0.25], [-0.5, -0.25],
        ];
        return transformPoly(doorwayPoly);
      }

      case 6: // Secret entrance: half-cell
      {
        // rect(1, 0.5) translated (0, 0.25) then rotated then translated
        const halfPoly = [
          [-0.5, 0], [0.5, 0], [0.5, 0.5], [-0.5, 0.5],
        ];
        return transformPoly(halfPoly);
      }

      case 7: // Barred
      {
        const barredPoly = [
          [-0.5, 0.5], [0.5, 0.5], [0.5, 0], [0.3, 0],
          [0.3, -0.5], [-0.3, -0.5], [-0.3, 0], [-0.5, 0],
        ];
        return transformPoly(barredPoly);
      }

      default: // Type 0 (regular), 3 (entrance), 8 (stairs), 9 (steps)
      {
        // emptyPoly: full 1x1 cell at (door.x, door.y) — NOT centered
        const x = door.x * cs;
        const y = door.y * cs;
        return [[x, y], [x + cs, y], [x + cs, y + cs], [x, y + cs]];
      }
    }
  }

  /**
   * Get hatching area for a room (shrunk by 1 unit, in pixels).
   * Original: Da.getHatchingArea: inflate(-1,-1) then scale by 30.
   */
  _getHatchingArea(room) {
    const cs = this.cellSize;
    const shrunk = { x: room.x + 1, y: room.y + 1, w: room.w - 2, h: room.h - 2 };
    if (room.round) {
      const cx = (shrunk.x + shrunk.w / 2) * cs;
      const cy = (shrunk.y + shrunk.h / 2) * cs;
      const r = (shrunk.w / 2) * cs;
      return { type: 'circle', x: cx, y: cy, r };
    }
    return {
      type: 'rect',
      x: shrunk.x * cs,
      y: shrunk.y * cs,
      w: shrunk.w * cs,
      h: shrunk.h * cs,
    };
  }

  /**
   * Get shadow polygon for a door (null if door doesn't need special shadow).
   */
  _getDoorShadowPoly(door) {
    // Types 3 (entrance) and 8 (stairs down) with open exits get a 2×1 shadow
    if (door.type === 3 || door.type === 8) {
      const cs = this.cellSize;
      const dir = door.dir || { x: 0, y: 1 };
      const hw = dir.y === 0 ? 1 : 0.5;
      const hh = dir.y === 0 ? 0.5 : 1;
      const cx = (door.x + 0.5) * cs;
      const cy = (door.y + 0.5) * cs;
      return [
        [cx - hw * cs, cy - hh * cs],
        [cx + hw * cs, cy - hh * cs],
        [cx + hw * cs, cy + hh * cs],
        [cx - hw * cs, cy + hh * cs],
      ];
    }
    return null;
  }

  /**
   * Get door seam lines (floor-colored lines that erase the wall at door positions).
   * Original: Fa.getSeams - two vertical lines at perpendicular edges of door cell,
   * rotated by door direction via rotateYX(dir.y, dir.x), then translated to door center.
   *
   * Base seams (before rotation):
   *   left  (b): [(-0.5, -0.5), (-0.5, 0.5)]
   *   right (c): [( 0.5, -0.5), ( 0.5, 0.5)]
   *
   * rotateYX(pts, sinA, cosA): new_x = x*cosA - y*sinA, new_y = y*cosA + x*sinA
   * Called with (dir.y, dir.x), so cosA=dir.x, sinA=dir.y.
   */
  _getDoorSeams(door) {
    const cs = this.cellSize;
    const dir = door.dir || { x: 0, y: 1 };
    const tx = (door.x + 0.5); // translate in grid units
    const ty = (door.y + 0.5);

    // rotateYX transform: (x,y) -> (x*dir.x - y*dir.y, y*dir.x + x*dir.y)
    const cosA = dir.x;
    const sinA = dir.y;

    // Base seam points in local coords
    const baseLeft  = [[-0.5, -0.5], [-0.5, 0.5]];
    const baseRight = [[ 0.5, -0.5], [ 0.5, 0.5]];

    const transform = (pts) => pts.map(([x, y]) => [
      (x * cosA - y * sinA + tx) * cs,
      (y * cosA + x * sinA + ty) * cs,
    ]);

    const leftSeam  = transform(baseLeft);
    const rightSeam = transform(baseRight);

    // Which seams to include depends on door type.
    // Original: with openExits=true (default), entrance/stairs get BOTH seams.
    switch (door.type) {
      case 3:  return [leftSeam, rightSeam]; // Entrance: both seams (openExits=true)
      case 6:  return [rightSeam];           // Secret entrance: only far seam
      case 8:  return [leftSeam, rightSeam]; // Stairs down: both seams (openExits=true)
      default: return [leftSeam, rightSeam]; // Most doors: both seams
    }
  }

  /**
   * Stroke a polygon path from an array of [x,y] points.
   */
  _tracePoly(ctx, poly) {
    if (!poly || poly.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i][0], poly[i][1]);
    }
    ctx.closePath();
  }

  // ─── BOUNDS ───────────────────────────────────────────────

  _calcBounds(dungeon) {
    if (!dungeon.rooms || dungeon.rooms.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }
    const cs = this.cellSize;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const room of dungeon.rooms) {
      minX = Math.min(minX, room.x * cs);
      minY = Math.min(minY, room.y * cs);
      maxX = Math.max(maxX, (room.x + room.w) * cs);
      maxY = Math.max(maxY, (room.y + room.h) * cs);
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 1: SHADING (hatching + tinted wall-band fill)
  // ═════════════════════════════════════════════════════════════

  /**
   * Original: drawShading() → shading.draw(areas)
   * 1. Collect hatching areas (room bounds shrunk by 1 unit, in pixels)
   * 2. Inflate by distance (15px) for the wall band
   * 3. Draw semi-transparent fill on the inflated areas (doShading)
   * 4. Draw hatching lines between the inflated area and inner exclusion zone
   */
  _drawShading(dungeon) {
    const ctx = this.ctx;
    // Scale hatching parameters with cellSize
    const cs = this.cellSize;
    const dist = cs * HATCHING.distanceRatio;
    const clusterSize = cs * HATCHING.clusterRatio;

    // Collect hatching areas for rooms
    const areas = [];
    for (const room of dungeon.rooms) {
      areas.push(this._getHatchingArea(room));
    }
    // Also add hatching areas for doors
    for (const door of dungeon.doors) {
      areas.push({ type: 'rect', x: cs * door.x, y: cs * door.y, w: cs, h: cs });
    }

    // Clone and inflate each area by `distance`
    const inflated = areas.map(a => this._inflateArea(a, dist));

    // ── doShading: semi-transparent fill on inflated areas ──
    if (!style.bw && style.getShading() !== style.getPaper()) {
      this._doShading(inflated, dist);
    }

    // ── doHatching: draw short parallel lines in the wall band ──
    const innerShrink = dist + 2 * clusterSize / 3;
    const inner = inflated.map(a => this._inflateArea(a, -innerShrink));
    this._doHatching(inflated, inner, clusterSize);
  }

  /**
   * Original doShading: draws semi-transparent rounded-rect fills on inflated areas.
   * lineStyle(H.thick, H.shading, 0.4) + beginFill(H.shading) + drawRoundRect
   */
  _doShading(inflatedAreas, dist) {
    const ctx = this.ctx;
    const cornerRadius = 2 * dist;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = style.getShading();
    ctx.strokeStyle = style.getShading();
    ctx.lineWidth = style.thick;
    ctx.lineJoin = 'round';

    for (const area of inflatedAreas) {
      if (area.type === 'circle') {
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Rounded rectangle
        this._roundRect(ctx, area.x, area.y, area.w, area.h, cornerRadius);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * Draw hatching lines in the wall-band area using Poisson disk sampling.
   *
   * Faithfully matches the original Watabou algorithm:
   *  1. Poisson disk sampling distributes cluster center points across the
   *     union of all outer areas (natural overlap prevention).
   *  2. Points inside the inner exclusion zones are skipped.
   *  3. At each surviving point, the angle is derived from the direction to
   *     the nearest Poisson neighbor, with random variation — producing the
   *     characteristic irregular scratch-mark look.
   *  4. nStrokes (default 3) short parallel lines are drawn at each cluster,
   *     with length limited by proximity to neighboring clusters' lines.
   */
  _doHatching(outerAreas, innerAreas, clusterSize) {
    const ctx = this.ctx;
    const nStrokes = HATCHING.nStrokes;

    // ── Step 1: Poisson disk sampling across the union of all outer areas ──
    const poisson = this._poissonDiskSample(outerAreas, clusterSize);
    const points = poisson.points;
    if (points.length === 0) return;

    // ── Step 2: Filter out points inside inner exclusion zones ──
    const validPoints = [];
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      let insideInner = false;
      for (let j = 0; j < innerAreas.length; j++) {
        const inner = innerAreas[j];
        if (!inner) continue;
        if (inner.type === 'circle') {
          if (inner.r <= 0) continue;
          const dx = pt.x - inner.x, dy = pt.y - inner.y;
          if (dx * dx + dy * dy <= inner.r * inner.r) { insideInner = true; break; }
        } else {
          if (inner.w <= 0 || inner.h <= 0) continue;
          if (pt.x >= inner.x && pt.x < inner.x + inner.w &&
              pt.y >= inner.y && pt.y < inner.y + inner.h) { insideInner = true; break; }
        }
      }
      if (!insideInner) validPoints.push(i); // store index into points[]
    }

    // ── Step 3: For each valid point, compute angle and draw strokes ──
    ctx.save();
    ctx.strokeStyle = style.getInk();
    ctx.lineWidth = style.stroke;

    // Map from point index to its drawn line segments (for neighbor clipping)
    const drawnLines = new Map();

    const h = (nStrokes - 1) / 2;
    const f = (nStrokes + 0.5) / (nStrokes + 1);
    const clusterHalf = 0.5 * clusterSize;

    ctx.beginPath();
    for (let vi = 0; vi < validPoints.length; vi++) {
      const pidx = validPoints[vi];
      const pt = points[pidx];
      const segments = [];
      drawnLines.set(pidx, segments);

      // Get Poisson neighbors
      const neighbours = poisson.getNeighbours(pt);

      // Find nearest neighbor to determine angle
      let nearDist = Infinity, nearPt = null;
      for (let ni = 0; ni < neighbours.length; ni++) {
        const nb = neighbours[ni];
        if (nb === pt) continue;
        const dx = pt.x - nb.x, dy = pt.y - nb.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearDist) { nearDist = d2; nearPt = nb; }
      }

      // Angle from nearest neighbor (with random variation when angle > 0)
      let angle = nearPt ? Math.atan2(pt.y - nearPt.y, pt.x - nearPt.x) : rng.float() * Math.PI * 2;
      if (angle > 0) {
        angle += (Math.PI / 4) * (1 + 2 * rng.float());
      }

      // Direction vector for the line and perpendicular for stroke spacing
      const dirX = Math.cos(angle) * clusterHalf;
      const dirY = Math.sin(angle) * clusterHalf;

      // Max reach for line clipping (original: 1.5 + 3 * rnd())
      const maxReach = 1.5 + 3 * rng.float();

      // Draw nStrokes parallel lines
      for (let si = 0; si < nStrokes; si++) {
        // Perpendicular offset for this stroke
        const z = (f * (si - h)) / h;
        const cx = pt.x + (-dirY) * z;
        const cy = pt.y + dirX * z;

        // Clip in negative direction (-dirX, -dirY)
        let negReach = maxReach;
        for (let ni = 0; ni < neighbours.length; ni++) {
          const nb = neighbours[ni];
          const nbLines = drawnLines.get(poisson.getPointIndex(nb));
          if (!nbLines) continue;
          for (let li = 0; li < nbLines.length; li++) {
            const seg = nbLines[li];
            const p0 = seg[0], p1 = seg[1];
            const t = this._intersectLines(cx, cy, -dirX, -dirY, p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
            if (t !== null && t.x > 0 && t.x < negReach && t.y >= 0 && t.y <= 1) {
              negReach = t.x;
            }
          }
        }
        if (negReach === maxReach) negReach = Math.sqrt(maxReach);
        const x0 = cx + (-dirX) * negReach;
        const y0 = cy + (-dirY) * negReach;

        // Clip in positive direction (+dirX, +dirY)
        let posReach = maxReach;
        for (let ni = 0; ni < neighbours.length; ni++) {
          const nb = neighbours[ni];
          const nbLines = drawnLines.get(poisson.getPointIndex(nb));
          if (!nbLines) continue;
          for (let li = 0; li < nbLines.length; li++) {
            const seg = nbLines[li];
            const p0 = seg[0], p1 = seg[1];
            const t = this._intersectLines(cx, cy, dirX, dirY, p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
            if (t !== null && t.x > 0 && t.x < posReach && t.y >= 0 && t.y <= 1) {
              posReach = t.x;
            }
          }
        }
        if (posReach === maxReach) posReach = Math.sqrt(maxReach);
        const x1 = cx + dirX * posReach;
        const y1 = cy + dirY * posReach;

        segments.push([{ x: x0, y: y0 }, { x: x1, y: y1 }]);
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Poisson disk sampling across the union of multiple shapes.
   * Matches the original be (PoissonDisk) class.
   *
   * @param {Array} areas - Array of {type, x, y, w, h} or {type, x, y, r} shapes
   * @param {number} radius - Minimum distance between points (clusterSize)
   * @returns {{ points: Array, getNeighbours: Function, getPointIndex: Function }}
   */
  _poissonDiskSample(areas, radius) {
    // Compute overall bounds
    let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
    for (const a of areas) {
      if (!a) continue;
      if (a.type === 'circle') {
        if (a.r <= 0) continue;
        bMinX = Math.min(bMinX, a.x - a.r);
        bMinY = Math.min(bMinY, a.y - a.r);
        bMaxX = Math.max(bMaxX, a.x + a.r);
        bMaxY = Math.max(bMaxY, a.y + a.r);
      } else {
        if (a.w <= 0 || a.h <= 0) continue;
        bMinX = Math.min(bMinX, a.x);
        bMinY = Math.min(bMinY, a.y);
        bMaxX = Math.max(bMaxX, a.x + a.w);
        bMaxY = Math.max(bMaxY, a.y + a.h);
      }
    }

    if (bMinX >= bMaxX || bMinY >= bMaxY) {
      return { points: [], getNeighbours: () => [], getPointIndex: () => -1 };
    }

    const cellSize = radius / Math.sqrt(2);
    const gridW = Math.ceil((bMaxX - bMinX) / cellSize);
    const gridH = Math.ceil((bMaxY - bMinY) / cellSize);
    const grid = new Array(gridW * gridH).fill(null);
    const points = [];
    const queue = [];
    // Map from point object to index in points[]
    const pointIndexMap = new Map();

    const validateShape = (pt) => {
      for (const a of areas) {
        if (!a) continue;
        if (a.type === 'circle') {
          if (a.r <= 0) continue;
          const dx = pt.x - a.x, dy = pt.y - a.y;
          if (dx * dx + dy * dy <= a.r * a.r) return true;
        } else {
          if (a.w <= 0 || a.h <= 0) continue;
          if (pt.x >= a.x && pt.x < a.x + a.w && pt.y >= a.y && pt.y < a.y + a.h) return true;
        }
      }
      return false;
    };

    const validateGrid = (pt) => {
      const gx = Math.floor((pt.x - bMinX) / cellSize);
      const gy = Math.floor((pt.y - bMinY) / cellSize);
      if (gx < 0 || gy < 0 || gx >= gridW || gy >= gridH) return false;
      const x0 = Math.max(0, gx - 2), x1 = Math.min(gridW, gx + 3);
      const y0 = Math.max(0, gy - 2), y1 = Math.min(gridH, gy + 3);
      for (let cy = y0; cy < y1; cy++) {
        const row = cy * gridW;
        for (let cx = x0; cx < x1; cx++) {
          const nb = grid[row + cx];
          if (nb !== null) {
            const dx = pt.x - nb.x, dy = pt.y - nb.y;
            if (dx * dx + dy * dy < radius * radius) return false;
          }
        }
      }
      return true;
    };

    const emit = (pt) => {
      pointIndexMap.set(pt, points.length);
      points.push(pt);
      queue.push(pt);
      const gx = Math.floor((pt.x - bMinX) / cellSize);
      const gy = Math.floor((pt.y - bMinY) / cellSize);
      if (gx >= 0 && gy >= 0 && gx < gridW && gy < gridH) {
        grid[gy * gridW + gx] = pt;
      }
    };

    // Seed with first point from a random area
    const validAreas = areas.filter(a => a && ((a.type === 'circle' && a.r > 0) || (a.type === 'rect' && a.w > 0 && a.h > 0)));
    if (validAreas.length === 0) {
      return { points: [], getNeighbours: () => [], getPointIndex: () => -1 };
    }
    const seedArea = validAreas[rng.float() * validAreas.length | 0];
    let seedPt;
    if (seedArea.type === 'circle') {
      const angle = rng.float() * Math.PI * 2;
      const r = seedArea.r * Math.sqrt(rng.float());
      seedPt = { x: seedArea.x + r * Math.cos(angle), y: seedArea.y + r * Math.sin(angle) };
    } else {
      seedPt = { x: seedArea.x + rng.float() * seedArea.w, y: seedArea.y + rng.float() * seedArea.h };
    }
    emit(seedPt);

    // Main Poisson disk loop
    while (queue.length > 0) {
      const idx = rng.float() * queue.length | 0;
      const active = queue[idx];
      let found = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        const angle = rng.float() * Math.PI * 2;
        const dist = radius + radius * rng.float();
        const candidate = {
          x: active.x + dist * Math.cos(angle),
          y: active.y + dist * Math.sin(angle),
        };
        if (validateShape(candidate) && validateGrid(candidate)) {
          emit(candidate);
          found = true;
        }
      }
      if (!found) {
        queue.splice(idx, 1);
      }
    }

    // Build neighbour lookup
    const getNeighbours = (pt) => {
      const gx = Math.floor((pt.x - bMinX) / cellSize);
      const gy = Math.floor((pt.y - bMinY) / cellSize);
      const result = [];
      const x0 = Math.max(0, gx - 2), x1 = Math.min(gridW, gx + 3);
      const y0 = Math.max(0, gy - 2), y1 = Math.min(gridH, gy + 3);
      for (let cy = y0; cy < y1; cy++) {
        const row = cy * gridW;
        for (let cx = x0; cx < x1; cx++) {
          const nb = grid[row + cx];
          if (nb !== null) result.push(nb);
        }
      }
      return result;
    };

    const getPointIndex = (pt) => {
      const idx = pointIndexMap.get(pt);
      return idx !== undefined ? idx : -1;
    };

    return { points, getNeighbours, getPointIndex };
  }

  /**
   * Line-line intersection (matches original Xc.intersectLines).
   * Ray: P = (ax, ay) + t * (dx, dy)
   * Segment: Q = (bx, by) + s * (ex, ey)
   * Returns { x: t, y: s } or null if parallel.
   */
  _intersectLines(ax, ay, dx, dy, bx, by, ex, ey) {
    const denom = dx * ey - dy * ex;
    if (denom === 0) return null;
    const s = (dy * (bx - ax) - dx * (by - ay)) / denom;
    const t = Math.abs(dx) > Math.abs(dy)
      ? (bx - ax + ex * s) / dx
      : (by - ay + ey * s) / dy;
    return { x: t, y: s };
  }

  /**
   * Inflate an area (rect or circle) by a given distance.
   */
  _inflateArea(area, dist) {
    if (area.type === 'circle') {
      return { type: 'circle', x: area.x, y: area.y, r: area.r + dist };
    }
    return {
      type: 'rect',
      x: area.x - dist,
      y: area.y - dist,
      w: area.w + 2 * dist,
      h: area.h + 2 * dist,
    };
  }

  /**
   * Draw a rounded rectangle path.
   */
  /** Draw a circle with optional fill and stroke */
  _drawCircle(ctx, cx, cy, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 2: SHAPE (walls + floors + door seams)
  // ═════════════════════════════════════════════════════════════

  /**
   * Original: drawShape(polys, seams)
   * 1. Stroke wall outlines (2*H.walls() = 2*thick = 6px)
   * 2. Fill floor interiors (floor color)
   * 3. Draw door seam lines (1px floor-colored lines to hide wall at door connections)
   */
  _drawShape(dungeon, roomPolys, seamLines) {
    const ctx = this.ctx;
    const wallWidth = 2 * style.thick; // Original: 2*H.walls() where walls()=thick in Default mode

    // ── Original rendering approach (Dungeon-built.js drawShape, ~line 10550): ──
    //
    //   1. lineStyle(2*H.walls(), H.ink)  →  stroke ALL polygons
    //   2. lineStyle()                    →  clear stroke
    //   3. beginFill(floorColor) + drawPolygon + endFill  for EACH polygon
    //   4. lineStyle(1, floorColor, NONE caps) → draw seam polylines
    //
    // In OpenFL, drawPolygon uses moveTo(last) then lineTo through all points,
    // building sub-paths on a single Graphics context.  All sub-paths sharing
    // the same lineStyle are rasterised together, so adjacent polygon edges
    // that coincide are drawn as ONE stroke — no Canvas2D anti-aliasing seam.
    //
    // To replicate this in Canvas2D we must batch all polygons into a SINGLE
    // path for the stroke pass and a SINGLE path for the fill pass.  Drawing
    // each polygon as its own beginPath/stroke would create visible anti-alias
    // seams at shared edges, making small rooms look like standalone boxes.

    // 1. Wall outlines — batch ALL polygons into one path, one stroke() call.
    //    This is the key fix: a single stroke pass means shared edges between
    //    adjacent room/door polygons are painted once (no double-antialiased seam).
    ctx.save();
    ctx.strokeStyle = style.getInk();
    ctx.lineWidth = wallWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const poly of roomPolys) {
      if (!poly || poly.length === 0) continue;
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i][0], poly[i][1]);
      }
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();

    // 2. Floor fills — batch ALL polygons into one path, one fill() call.
    //    A single fill pass with nonzero winding covers the union of all
    //    polygon interiors without visible seams at shared edges.
    ctx.save();
    ctx.fillStyle = style.getFloor();
    ctx.beginPath();
    for (const poly of roomPolys) {
      if (!poly || poly.length === 0) continue;
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i][0], poly[i][1]);
      }
      ctx.closePath();
    }
    ctx.fill('nonzero');
    ctx.restore();

    // 3. Door seam lines (floor-colored lines to erase wall at doorways).
    //    Original: lineStyle(1, floorColor, null, null, null, CapsStyle.NONE)
    //    then drawPolyline for each seam.
    //
    //    Seams erase the wall stroke at door positions.  Because Canvas2D
    //    anti-aliasing can leave sub-pixel wall remnants, we draw the seams
    //    slightly wider than the wall stroke to guarantee full coverage.
    ctx.save();
    ctx.strokeStyle = style.getFloor();
    ctx.lineWidth = wallWidth + 1;
    ctx.lineCap = 'butt';
    for (const seam of seamLines) {
      if (seam.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(seam[0][0], seam[0][1]);
        ctx.lineTo(seam[1][0], seam[1][1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 3: WATER
  // ═════════════════════════════════════════════════════════════

  _drawWater(flood, roomPolys) {
    if (!flood || !flood.bitmap) return;
    const ctx = this.ctx;
    const cs = this.cellSize;

    ctx.save();

    // ── Clip water to room interiors (matching original nh.updateRooms mask) ──
    // Original: the Water display object has a mask child that is filled with
    // the room polygons; the mask clips all water drawing to room interiors.
    ctx.beginPath();
    for (const poly of roomPolys) {
      if (!poly || poly.length === 0) continue;
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i][0], poly[i][1]);
      }
      ctx.closePath();
    }
    ctx.clip();

    // ── 1) Fill + stroke water contour edges as smooth polygons ──
    // Original (nh.updateFlood):
    //   beginFill(waterColor) + lineStyle(normal, ink)
    //   For each edge: Chaikin smooth (closed, 3 iterations), scale by 30,
    //   then drawPolygon (fill + stroke).
    //
    // The Chaikin smoothing here (at render time) is what creates the smooth
    // curved boundaries. The edges from Flood already have jitter + wavy
    // distortion applied during generation.
    if (flood.edges && flood.edges.length > 0) {
      ctx.fillStyle = style.getWater();
      ctx.strokeStyle = style.getInk();
      ctx.lineWidth = style.normal;
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1.0;

      for (const edge of flood.edges) {
        if (!edge || edge.length < 3) continue;

        // Chaikin smooth: closed=true, 3 iterations (matching original ff.render(h, !0, 3))
        const smooth = chaikinSmooth(edge, 3, true);

        ctx.beginPath();
        ctx.moveTo(smooth[0].x * cs, smooth[0].y * cs);
        for (let i = 1; i < smooth.length; i++) {
          ctx.lineTo(smooth[i].x * cs, smooth[i].y * cs);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // ── 2) Draw ripple lines (first ring) — dashed polylines ──
    // Original: lineStyle(normal, ink) then dashedPolyline for each ripple1.
    // Each ripple is Chaikin smoothed (closed, 3 iter), scaled, then drawn
    // as a dashed polyline with a random dash pattern.
    //
    // Original dash pattern for ripples1: 9 values, each =
    //   normal + 30 * abs((r1+r2+r3+r4)/2 - 1)
    // where r1..r4 are sequential RNG calls.
    if (flood.ripples1 && flood.ripples1.length > 0) {
      ctx.strokeStyle = style.getInk();
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = style.normal;

      // Generate random dash pattern (9 entries, all with multiplier 30)
      const dashPattern1 = this._generateRippleDashPattern(9, cs);

      for (const ripple of flood.ripples1) {
        if (!ripple || ripple.length < 3) continue;
        const smooth = chaikinSmooth(ripple, 3, true);
        const scaled = smooth.map(p => ({ x: p.x * cs, y: p.y * cs }));
        this._drawDashedPolyline(ctx, scaled, dashPattern1, false);
      }
    }

    // ── 3) Draw ripple lines (second ring) — dashed polylines ──
    // Original: same as ripples1 but with different dash pattern.
    // The ripples2 dash pattern has 9 values, alternating between
    // multiplier 30 and 150 (starting with 30, then 150, 30, 150, ...
    // then last is 30). Actually the original pattern is:
    //   [30-based, 150-based, 30-based, 150-based, 30-based, 150-based,
    //    30-based, 150-based, 30-based]
    // Wait — re-reading the original more carefully:
    // First entry uses 30, then alternates 150, 30, 150, 30, 150, 30, 150, 30.
    if (flood.ripples2 && flood.ripples2.length > 0) {
      ctx.strokeStyle = style.getInk();
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = style.normal;

      // Generate the ripples2 dash pattern: alternating 30/150 multipliers
      const dashPattern2 = this._generateRipple2DashPattern(9, cs);

      for (const ripple of flood.ripples2) {
        if (!ripple || ripple.length < 3) continue;
        const smooth = chaikinSmooth(ripple, 3, true);
        const scaled = smooth.map(p => ({ x: p.x * cs, y: p.y * cs }));
        this._drawDashedPolyline(ctx, scaled, dashPattern2, false);
      }
    }

    ctx.restore();
  }

  /**
   * Generate a random dash pattern for ripple lines.
   * Matches original: each dash length = normal + multiplier * abs((r1+r2+r3+r4)/2 - 1)
   * For ripples1, all 9 entries use multiplier = cellSize (30).
   *
   * @private
   * @param {number} count - Number of dash entries
   * @param {number} cellSize - Cell size (used as multiplier)
   * @returns {number[]} Dash pattern array
   */
  _generateRippleDashPattern(count, cellSize) {
    const pattern = [];
    for (let i = 0; i < count; i++) {
      const r1 = rng.float();
      const r2 = rng.float();
      const r3 = rng.float();
      const r4 = rng.float();
      pattern.push(style.normal + cellSize * Math.abs((r1 + r2 + r3 + r4) / 2 - 1));
    }
    return pattern;
  }

  /**
   * Generate the dash pattern for ripples2 (second ring).
   * Alternates between cellSize (30) and 5*cellSize (150) multipliers.
   * Pattern: [30-based, 150-based, 30-based, 150-based, ...]
   *
   * @private
   * @param {number} count
   * @param {number} cellSize
   * @returns {number[]}
   */
  _generateRipple2DashPattern(count, cellSize) {
    const pattern = [];
    for (let i = 0; i < count; i++) {
      const mult = (i % 2 === 0) ? cellSize : cellSize * 5;
      const r1 = rng.float();
      const r2 = rng.float();
      const r3 = rng.float();
      const r4 = rng.float();
      pattern.push(style.normal + mult * Math.abs((r1 + r2 + r3 + r4) / 2 - 1));
    }
    return pattern;
  }

  /**
   * Draw a dashed polyline on canvas context.
   *
   * Matches original Pb.dashedPolyline: walks along the polyline,
   * alternating between drawing (lineTo) and skipping (moveTo) segments
   * according to the dash pattern. Uses linear interpolation for partial
   * segments within a dash.
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array<{x: number, y: number}>} points - Polyline points (already scaled to pixels)
   * @param {number[]} dashPattern - Array of dash/gap lengths
   * @param {boolean} [wrapStart=false] - If true, start from last point wrapping to first
   */
  _drawDashedPolyline(ctx, points, dashPattern, wrapStart = false) {
    if (points.length < 2) return;

    ctx.beginPath();

    let drawing = true;       // true = pen down (dash), false = pen up (gap)
    let patIdx = 0;           // current index into dashPattern
    let remaining = dashPattern[0]; // remaining length of current dash/gap segment

    // Starting configuration
    const startIdx = wrapStart ? points.length - 1 : 0;
    const firstPt = points[startIdx];
    ctx.moveTo(firstPt.x, firstPt.y);

    let p0 = firstPt;
    const startStep = wrapStart ? 0 : 1;

    for (let k = startStep; k < points.length; k++) {
      const p1 = points[k % points.length];
      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      let segLen = Math.sqrt(dx * dx + dy * dy);

      // Walk along this segment
      let consumed = 0;
      while (consumed < segLen) {
        const leftInSeg = segLen - consumed;
        if (remaining <= leftInSeg) {
          // Finish current dash/gap within this segment
          const t = (consumed + remaining) / segLen;
          const px = p0.x + dx * t;
          const py = p0.y + dy * t;

          if (drawing) {
            ctx.lineTo(px, py);
          } else {
            ctx.moveTo(px, py);
          }

          consumed += remaining;
          drawing = !drawing;
          patIdx = (patIdx + 1) % dashPattern.length;
          remaining = dashPattern[patIdx];
        } else {
          // Current dash/gap extends past this segment
          remaining -= leftInSeg;
          if (drawing) {
            ctx.lineTo(p1.x, p1.y);
          }
          consumed = segLen; // done with this segment
        }
      }

      p0 = p1;
    }

    ctx.stroke();
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 4: SHADOWS
  // ═════════════════════════════════════════════════════════════

  /**
   * Original: Lf (Shadows class)
   *
   * The original uses a mask-based approach with OpenFL display objects:
   *   1. A "paint" child draws thick stroked outlines (2.2 * shadowDist * 30)
   *      in shadowColor, then fills white inside the polygons.
   *   2. A "mask" child fills the room polygons (solid).
   *   3. The mask clips the paint layer (set_mask).
   *   4. The paint layer is OFFSET from the mask by the shadow vector.
   *   5. Blend mode = multiply (mode 9).
   *
   * This means only the portion of the thick stroke that peeks out from
   * under the mask is visible — producing a thin shadow on just 1-2 sides
   * of each room (determined by the offset direction).
   *
   * Canvas 2D approach: use an offscreen canvas to composite the paint
   * and mask layers, then draw onto the main canvas with multiply blend.
   */
  _drawShadows(roomPolys) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const shadowPx = cs * style.shadowDist; // 0.2 * 30 = 6px
    const strokeW = 2.2 * shadowPx;        // 13.2px

    if (shadowPx <= 0) return;

    // Shadow offset direction: adjusts with map rotation.
    // Original: shadowDir = 45 degrees
    //   adjustAngle(rotDeg): polar(30 * shadowDist, -(rotDeg - 45) / 180 * PI)
    // The paint layer is offset by this vector from the mask.
    const rotDeg = (style.rotation || 0) * 180 / Math.PI;
    const shadowAngleRad = -(rotDeg - 45) / 180 * Math.PI;
    const offX = shadowPx * Math.cos(shadowAngleRad);
    const offY = shadowPx * Math.sin(shadowAngleRad);

    // Compute bounding box of all shadow polygons (with padding for stroke + offset)
    let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
    for (const poly of roomPolys) {
      if (!poly || poly.length === 0) continue;
      for (let i = 0; i < poly.length; i++) {
        bMinX = Math.min(bMinX, poly[i][0]);
        bMinY = Math.min(bMinY, poly[i][1]);
        bMaxX = Math.max(bMaxX, poly[i][0]);
        bMaxY = Math.max(bMaxY, poly[i][1]);
      }
    }
    if (bMinX >= bMaxX || bMinY >= bMaxY) return;

    const pad = strokeW + Math.abs(offX) + Math.abs(offY) + 2;
    const ox = bMinX - pad;
    const oy = bMinY - pad;
    const cw = Math.ceil(bMaxX - bMinX + 2 * pad);
    const ch = Math.ceil(bMaxY - bMinY + 2 * pad);

    // Create offscreen canvas for compositing paint + mask
    const offCanvas = document.createElement('canvas');
    offCanvas.width = cw;
    offCanvas.height = ch;
    const oc = offCanvas.getContext('2d');

    // Helper: trace all room polygons as a single path on a context
    const tracePath = (c, dx, dy) => {
      c.beginPath();
      for (const poly of roomPolys) {
        if (!poly || poly.length === 0) continue;
        c.moveTo(poly[0][0] - ox + dx, poly[0][1] - oy + dy);
        for (let i = 1; i < poly.length; i++) {
          c.lineTo(poly[i][0] - ox + dx, poly[i][1] - oy + dy);
        }
        c.closePath();
      }
    };

    // ── Step 1: Draw the "paint" layer (thick strokes + white fill), offset ──
    // Stroke thick outlines in shadow color
    oc.strokeStyle = style.shadowColor;
    oc.lineWidth = strokeW;
    oc.lineJoin = 'round';
    oc.lineCap = 'round';
    tracePath(oc, offX, offY);
    oc.stroke();

    // Fill white inside to erase the interior of the stroke
    oc.fillStyle = '#FFFFFF';
    tracePath(oc, offX, offY);
    oc.fill('nonzero');

    // ── Step 2: Apply the mask using destination-in ──
    // Only the pixels that overlap with the mask (room polygons at 0,0) survive
    oc.globalCompositeOperation = 'destination-in';
    oc.fillStyle = 'rgba(255,0,0,1)';
    tracePath(oc, 0, 0);
    oc.fill('nonzero');
    oc.globalCompositeOperation = 'source-over';

    // ── Step 3: Draw the composited shadow onto the main canvas ──
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(offCanvas, ox, oy);
    ctx.restore();
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 5: GRID
  // ═════════════════════════════════════════════════════════════

  /**
   * Original: Da.drawGrid / Da.drawGridLine with dash patterns
   * Grid is drawn INSIDE rooms (on the shrunk bounds, i.e., room.inflate(-1,-1)).
   */
  _drawGrid(dungeon) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const gridScale = style.gridScale || 1;
    const mode = style.gridMode;

    ctx.save();
    ctx.strokeStyle = style.getInk();

    // Line width: dotted mode with scale=1 uses H.normal, otherwise H.thin
    ctx.lineWidth = (mode === GRID_MODES.DOTTED && gridScale === 1)
      ? style.normal : style.thin;

    for (const room of dungeon.rooms) {
      // Grid is drawn on shrunk bounds (inflate(-1,-1))
      const gx = room.x + 1;
      const gy = room.y + 1;
      const gw = room.w - 2;
      const gh = room.h - 2;

      if (gw <= 0 || gh <= 0) continue;

      // Draw interior grid lines (not the boundary lines)
      for (let i = 1; i < gw * gridScale; i++) {
        const lx = (gx + i / gridScale) * cs;
        const sy = gy * cs;
        const ey = (gy + gh) * cs;
        this._drawGridLine(ctx, lx, sy, lx, ey, mode, gridScale);
      }
      for (let i = 1; i < gh * gridScale; i++) {
        const ly = (gy + i / gridScale) * cs;
        const sx = gx * cs;
        const ex = (gx + gw) * cs;
        this._drawGridLine(ctx, sx, ly, ex, ly, mode, gridScale);
      }
    }

    // Also draw grid lines through doors
    for (const door of dungeon.doors) {
      this._drawDoorGrid(ctx, door, mode, gridScale);
    }

    ctx.restore();
  }

  /**
   * Draw a single grid line with the appropriate dash pattern.
   */
  _drawGridLine(ctx, x1, y1, x2, y2, mode, gridScale) {
    const cellPx = this.cellSize / gridScale;

    switch (mode) {
      case GRID_MODES.DOTTED: {
        // Original: [0.5*H.normal, H.normal*(3+rng)/gridScale]
        const dotLen = 0.5 * style.normal;
        const gapLen = style.normal * 3.5 / gridScale;
        ctx.setLineDash([dotLen, gapLen]);
        break;
      }
      case GRID_MODES.DASHED: {
        const b = 0.2;
        ctx.setLineDash([0, b * cellPx, (1 - 2 * b) * cellPx, b * cellPx]);
        break;
      }
      case GRID_MODES.SOLID:
        ctx.setLineDash([]);
        break;
      case GRID_MODES.BROKEN: {
        const segLen = cellPx * 2;
        const gapLen = cellPx * 0.25;
        ctx.setLineDash([segLen, gapLen, segLen, gapLen]);
        break;
      }
      default:
        return;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Draw grid lines that pass through a door cell.
   * Original: Fa.drawGrid - draws grid edges at the "to" and "from" sides of the
   * door cell, perpendicular to the door direction. Which lines are drawn depends
   * on door type. Uses Fa.front = [(15,-15),(15,15)] rotated by door dir.
   *
   * "to" = grid line at forward edge (in dir direction)
   * "from" = grid line at backward edge (opposite dir)
   * "lengthwise" = line along door direction through center
   * "broadwise" = line perpendicular through center (optionally shortened)
   */
  _drawDoorGrid(ctx, door, mode, gridScale) {
    const cs = this.cellSize;
    const dir = door.dir || { x: 0, y: 1 };
    const cx = (door.x + 0.5) * cs;
    const cy = (door.y + 0.5) * cs;
    const half = cs / 2;

    // "to" edge: perpendicular line at +dir side of door cell
    const toLine = () => this._drawGridLine(ctx,
      cx + dir.x * half - dir.y * half, cy + dir.y * half + dir.x * half,
      cx + dir.x * half + dir.y * half, cy + dir.y * half - dir.x * half,
      mode, gridScale
    );
    // "from" edge: perpendicular line at -dir side of door cell
    const fromLine = () => this._drawGridLine(ctx,
      cx - dir.x * half - dir.y * half, cy - dir.y * half + dir.x * half,
      cx - dir.x * half + dir.y * half, cy - dir.y * half - dir.x * half,
      mode, gridScale
    );
    // "lengthwise" line along door direction through center
    const lengthwise = () => this._drawGridLine(ctx,
      cx + dir.x * half, cy + dir.y * half,
      cx - dir.x * half, cy - dir.y * half,
      mode, gridScale
    );
    // "broadwise" line perpendicular through center (optionally shortened by offset)
    const broadwise = (offset = 0) => {
      const len = half - offset;
      this._drawGridLine(ctx,
        cx - dir.y * len, cy + dir.x * len,
        cx + dir.y * len, cy - dir.x * len,
        mode, gridScale
      );
    };

    const type = door.type || 0;

    switch (type) {
      case 0: // Regular
        if (gridScale > 1) { lengthwise(); broadwise(); }
        toLine(); fromLine();
        break;
      case 2: // Secret
      case 4: // Locked
        if (gridScale > 1) { lengthwise(); broadwise(6); }
        toLine(); fromLine();
        break;
      case 1: // Archway
      case 5: // Boss gate
        if (gridScale > 1) { lengthwise(); }
        toLine(); fromLine();
        break;
      case 6: // Secret entrance - only "to" side
        toLine();
        break;
      case 7: // Barred
        if (gridScale > 1) { lengthwise(); }
        toLine();
        break;
      case 8: // Stairs down - only "from" side
        fromLine();
        break;
      case 3: // Entrance - only "to" side
      case 9: // Steps - only "to" side
        toLine();
        break;
      default:
        toLine(); fromLine();
        break;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 6: PROPS
  // ═════════════════════════════════════════════════════════════

  _drawProps(dungeon) {
    const ctx = this.ctx;
    const cs = this.cellSize;

    for (const room of dungeon.rooms) {
      if (!room.props || !style.showProps) continue;
      for (const prop of room.props) {
        if (!prop) continue;
        const px = prop.pos.x * cs;
        const py = prop.pos.y * cs;

        ctx.save();
        ctx.translate(px, py);

        // Scale factor: Rc passes 30*scale to drawing, we already have cs=30
        const s = (prop.scale || 1) * cs;
        // Rotation: original uses E(sin,cos) pair via rotateYX.
        // Original compiled: asRotateYX(pts, axis.y, axis.x)
        //   new_x = x*axis.x - y*axis.y  →  cos(θ) = axis.x
        //   new_y = x*axis.y + y*axis.x  →  sin(θ) = axis.y
        //   angle = atan2(axis.y, axis.x)
        if (prop.axis) {
          // Original: asRotateYX(pts, axis.y, axis.x) → angle = atan2(axis.y, axis.x)
          const angle = Math.atan2(prop.axis.y, prop.axis.x);
          ctx.rotate(angle);
        } else if (prop.rotation != null) {
          ctx.rotate(prop.rotation);
        }
        ctx.scale(s, s);

        // All props: PAPER fill + INK stroke at H.normal (1.5px) unless overridden
        ctx.strokeStyle = style.getInk();
        ctx.fillStyle = style.getFloor();
        ctx.lineWidth = style.normal / s; // compensate for scale

        switch (prop.type) {
          case 'boulder': {
            // Original He: 4 random polar points r=0.5, Chaikin-smoothed blob
            // Pre-generated, filled PAPER + outlined INK
            const pts = [];
            // Use prop-specific pseudo-random for consistent shape
            let bSeed = (prop.rotation || 0.5) * 1000;
            const bRand = () => { bSeed = (bSeed * 9301 + 49297) % 233280; return bSeed / 233280; };
            for (let i = 0; i < 4; i++) {
              const a = Math.PI * (0.3 * bRand() + i * 0.5);
              pts.push({ x: 0.5 * Math.cos(a), y: 0.5 * Math.sin(a) });
            }
            // Simple smoothing (approximate Chaikin)
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 0; i < pts.length; i++) {
              const next = pts[(i + 1) % pts.length];
              const mx = (pts[i].x + next.x) / 2;
              const my = (pts[i].y + next.y) / 2;
              ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          }
          case 'fountain': {
            // Original Gf: 3 circles r=0.5, 0.4 (WATER fill), 0.1
            this._drawCircle(ctx, 0, 0, 0.5, true, true);
            ctx.fillStyle = style.getWater();
            this._drawCircle(ctx, 0, 0, 0.4, true, true);
            ctx.fillStyle = style.getFloor();
            this._drawCircle(ctx, 0, 0, 0.1, true, true);
            break;
          }
          case 'well': {
            // Original gf: 2 circles r=0.4 (PAPER), r=0.24 (WATER)
            this._drawCircle(ctx, 0, 0, 0.4, true, true);
            ctx.fillStyle = style.getWater();
            this._drawCircle(ctx, 0, 0, 0.24, true, true);
            break;
          }
          case 'crate': {
            // Original Jf: square 0.6x0.6 + 2 vertical lines
            ctx.fillRect(-0.3, -0.3, 0.6, 0.6);
            ctx.strokeRect(-0.3, -0.3, 0.6, 0.6);
            ctx.beginPath();
            ctx.moveTo(-0.1, -0.3); ctx.lineTo(-0.1, 0.3);
            ctx.moveTo(0.1, -0.3); ctx.lineTo(0.1, 0.3);
            ctx.stroke();
            break;
          }
          case 'barrel': {
            // Original Kf: circle r=0.25 + 3 horizontal bands
            this._drawCircle(ctx, 0, 0, 0.25, true, true);
            const bcos = Math.cos(Math.asin(0.5));
            ctx.beginPath();
            ctx.moveTo(-0.25, 0); ctx.lineTo(0.25, 0);
            ctx.moveTo(-0.25 * bcos, -0.125); ctx.lineTo(0.25 * bcos, -0.125);
            ctx.moveTo(-0.25 * bcos, 0.125); ctx.lineTo(0.25 * bcos, 0.125);
            ctx.stroke();
            break;
          }
          case 'tapestry': {
            // Original me: wavy scalloped polyline
            const tw = prop.width || 2;
            ctx.beginPath();
            for (let d = 0; d < tw; d++) {
              const ox = d - tw / 2;
              ctx.moveTo(ox, -0.4);
              ctx.quadraticCurveTo(ox + 0.15, -0.15, ox + 0.3, -0.4);
              ctx.moveTo(ox + 0.5, -0.4);
              ctx.quadraticCurveTo(ox + 0.65, -0.15, ox + 0.8, -0.4);
            }
            ctx.stroke();
            break;
          }
          case 'dais': {
            // Original hf: 2 semicircular arcs
            // Arcs from PI*(1+h/16) for h=-8..8, offset +0.5 in X
            // Shape 1: filled polygon (PAPER), no outline
            // Shape 2: same arc as open polyline (INK stroke)
            // Shape 3: inner arc as open polyline (INK stroke)
            const daisOuter = [];
            const daisInner = [];
            for (let i = -8; i < 9; i++) {
              const ang = Math.PI * (1 + i / 16);
              daisOuter.push({ x: 1.5 * Math.cos(ang) + 0.5, y: 1.5 * Math.sin(ang) });
              daisInner.push({ x: 1.25 * Math.cos(ang) + 0.5, y: 1.25 * Math.sin(ang) });
            }
            // Filled background (PAPER)
            ctx.beginPath();
            daisOuter.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.fill();
            // Outer arc stroke
            ctx.beginPath();
            daisOuter.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();
            // Inner arc stroke
            ctx.beginPath();
            daisInner.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();
            break;
          }
          case 'smallDais': {
            // Original Hf: 2 concentric circles (r=1.25 filled, r=1.0 outlined)
            this._drawCircle(ctx, 0, 0, 1.25, true, true);
            this._drawCircle(ctx, 0, 0, 1.0, false, true);
            break;
          }
          case 'statue': {
            // Original Ie: circle base r=1/3 + 5-point star (INK filled)
            this._drawCircle(ctx, 0, 0, 1/3, true, true);
            ctx.fillStyle = style.getInk();
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
              const r = (1/3) * (i % 2 === 0 ? 0.9 : 0.4);
              const a = Math.PI * (0.2 * i - 0.5);
              const x = r * Math.cos(a), y = r * Math.sin(a);
              i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'altar': {
            // Original jf: rect 0.4x0.8 offset +0.2x + 2 tiny dots
            ctx.fillRect(0, -0.4, 0.4, 0.8);
            ctx.strokeRect(0, -0.4, 0.4, 0.8);
            this._drawCircle(ctx, 0.2, -0.2, 0.01, true, true);
            this._drawCircle(ctx, 0.2, 0.2, 0.01, true, true);
            break;
          }
          case 'sarcophagus': {
            // Original kf: coffin hexagon + inner at 70%
            const coffin = [[-0.25,-0.2],[-0.15,-0.45],[0.15,-0.45],[0.25,-0.2],[0.15,0.45],[-0.15,0.45]];
            ctx.beginPath();
            coffin.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            coffin.forEach((p, i) => i === 0 ? ctx.moveTo(p[0]*0.7, p[1]*0.7) : ctx.lineTo(p[0]*0.7, p[1]*0.7));
            ctx.closePath();
            ctx.stroke();
            break;
          }
          case 'throne': {
            // Original lf: rect 0.4x0.5 + rect 0.3x0.3 offset -0.1x
            ctx.fillRect(-0.2, -0.25, 0.4, 0.5);
            ctx.strokeRect(-0.2, -0.25, 0.4, 0.5);
            ctx.fillRect(-0.25, -0.15, 0.3, 0.3);
            ctx.strokeRect(-0.25, -0.15, 0.3, 0.3);
            break;
          }
          case 'chest': {
            // Original If: rect 0.6x0.8 + 4 horizontal lines
            ctx.fillRect(-0.3, -0.4, 0.6, 0.8);
            ctx.strokeRect(-0.3, -0.4, 0.6, 0.8);
            ctx.beginPath();
            ctx.moveTo(-0.3, -0.25); ctx.lineTo(0.3, -0.25);
            ctx.moveTo(-0.3, -0.15); ctx.lineTo(0.3, -0.15);
            ctx.moveTo(-0.3, 0.15); ctx.lineTo(0.3, 0.15);
            ctx.moveTo(-0.3, 0.25); ctx.lineTo(0.3, 0.25);
            ctx.stroke();
            break;
          }
        }

        ctx.restore();
      }
    }
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 7: DETAILS (doors + colonnades + cracks)
  // ═════════════════════════════════════════════════════════════

  /**
   * Draw door symbols.
   * Original: Fa.draw - draws door type-specific symbols.
   */
  _drawDoors(dungeon) {
    const ctx = this.ctx;
    const cs = this.cellSize;

    for (const door of dungeon.doors) {
      const cx = (door.x + 0.5) * cs;
      const cy = (door.y + 0.5) * cs;
      const dir = door.dir || { x: 0, y: 1 };
      const type = door.type || 0;
      const wallW = style.thick; // H.walls() in default mode

      ctx.save();

      switch (type) {
        case 0: // Regular door - just gap (seams handle it)
          break;

        case 1: // Archway: filled rect perpendicular to door
        case 5: // Boss gate: archway + cross line
          ctx.lineWidth = wallW;
          ctx.strokeStyle = style.getInk();
          ctx.fillStyle = style.getFloor();
          if (dir.y !== 0) {
            // Horizontal door
            ctx.fillRect(cx - 9 - wallW / 2, cy - 3.75, 18 + wallW, 7.5);
            ctx.strokeRect(cx - 9 - wallW / 2, cy - 3.75, 18 + wallW, 7.5);
          } else {
            // Vertical door
            ctx.fillRect(cx - 3.75, cy - 9 - wallW / 2, 7.5, 18 + wallW);
            ctx.strokeRect(cx - 3.75, cy - 9 - wallW / 2, 7.5, 18 + wallW);
          }
          if (type === 5) {
            // Boss gate cross line
            ctx.beginPath();
            ctx.moveTo(cx - 15 * dir.x / 4, cy - 15 * dir.y / 4);
            ctx.lineTo(cx + 15 * dir.x / 4, cy + 15 * dir.y / 4);
            ctx.stroke();
          }
          break;

        case 2: // Secret door - dashed line (only if secrets visible)
          if (style.showSecrets) {
            ctx.lineWidth = wallW;
            ctx.strokeStyle = style.getInk();
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            if (dir.y !== 0) {
              ctx.moveTo(cx - 9, cy);
              ctx.lineTo(cx + 9, cy);
            } else {
              ctx.moveTo(cx, cy - 9);
              ctx.lineTo(cx, cy + 9);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
          break;

        case 3: // Entrance stairs
        case 8: // Exit stairs down
          // Clear area behind stairs for open exits
          ctx.fillStyle = style.getPaper();
          if (type === 3) {
            ctx.fillRect(cs * door.x - cs * dir.x, cs * door.y - cs * dir.y, cs, cs);
          } else {
            ctx.fillRect(cs * door.x + cs * dir.x, cs * door.y + cs * dir.y, cs, cs);
          }
          this._drawStair(ctx, cx, cy, dir);
          break;

        case 4: // Locked - three small circles
          ctx.fillStyle = style.getInk();
          for (let i = -1; i <= 1; i++) {
            const dotX = cx + i * 18 * dir.y / 3;
            const dotY = cy + i * 18 * dir.x / 3;
            ctx.beginPath();
            ctx.arc(dotX, dotY, wallW / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case 7: // Barred door
        {
          const hcx = cx - 15 * dir.x / 2;
          const hcy = cy - 15 * dir.y / 2;
          ctx.lineWidth = wallW;
          ctx.strokeStyle = style.getInk();
          ctx.fillStyle = style.getFloor();
          if (dir.y !== 0) {
            ctx.fillRect(hcx - 9, hcy - 3.75, 18, 7.5);
            ctx.strokeRect(hcx - 9, hcy - 3.75, 18, 7.5);
          } else {
            ctx.fillRect(hcx - 3.75, hcy - 9, 7.5, 18);
            ctx.strokeRect(hcx - 3.75, hcy - 9, 7.5, 18);
          }
          // Perpendicular bar line
          ctx.lineWidth = style.normal;
          ctx.beginPath();
          ctx.moveTo(hcx - 9 * dir.y, hcy - 9 * dir.x);
          ctx.lineTo(hcx + 9 * dir.y, hcy + 9 * dir.x);
          ctx.stroke();
          break;
        }

        case 9: // Steps (small internal stairs)
          this._drawStair(ctx, cx, cy, dir, true);
          break;
      }

      ctx.restore();
    }
  }

  /**
   * Draw stair lines.
   * Original: Fa.drawStair - draws 4-5 parallel step lines.
   */
  _drawStair(ctx, x, y, dir, isSmall = false) {
    ctx.save();
    ctx.strokeStyle = style.getInk();
    ctx.lineWidth = style.normal;

    const startStep = isSmall ? 0 : 1;
    for (let i = startStep; i < 5; i++) {
      const halfW = this.cellSize * (5 - i) / 5 * 0.5 * (isSmall ? 0.8 : 1);
      const offset = this.cellSize * (i / 5 - 0.5);
      const sx = x - dir.y * halfW + dir.x * offset;
      const sy = y + dir.y * offset - dir.x * halfW;
      const ex = x + dir.y * halfW + dir.x * offset;
      const ey = y + dir.y * offset + dir.x * halfW;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draw colonnades (columns along room edges).
   * Original: Da.drawColonnades + Da.drawColumn
   */
  _drawColonnades(dungeon) {
    const ctx = this.ctx;
    const cs = this.cellSize;

    for (const room of dungeon.rooms) {
      if (!room.columns) continue;
      // Original: colonnades only for rooms with w>3 AND h>3 (matches Dungeon.shapeRooms).
      // Skip small rooms as a safety guard even if columns was set.
      if (room.w <= 3 || room.h <= 3) continue;

      const shrunk = { x: room.x + 1, y: room.y + 1, w: room.w - 2, h: room.h - 2 };
      const radius = cs * Parameters.columnRadius;

      if (room.round) {
        // Circular room: columns around the perimeter
        const innerR = (shrunk.w / 2 - 1);
        const nCols = 4 * Math.floor(Math.PI * innerR / 2);
        const center = { x: (shrunk.x + shrunk.w / 2), y: (shrunk.y + shrunk.h / 2) };
        for (let i = 0; i < nCols; i++) {
          const angle = ((i + 0.5) / nCols) * 2 * Math.PI;
          const px = center.x + innerR * Math.cos(angle);
          const py = center.y + innerR * Math.sin(angle);
          this._drawColumn(ctx, px * cs, py * cs, radius);
        }
      } else {
        // Rectangular room: columns along parallel edges
        if (room.axis && room.axis.x !== 0) {
          // Horizontal axis: columns along top and bottom rows
          for (let x = shrunk.x + 1; x < shrunk.x + shrunk.w; x++) {
            this._drawColumn(ctx, x * cs, (shrunk.y + 1) * cs, radius);
            this._drawColumn(ctx, x * cs, (shrunk.y + shrunk.h - 1) * cs, radius);
          }
        } else {
          // Vertical axis: columns along left and right columns
          for (let y = shrunk.y + 1; y < shrunk.y + shrunk.h; y++) {
            this._drawColumn(ctx, (shrunk.x + 1) * cs, y * cs, radius);
            this._drawColumn(ctx, (shrunk.x + shrunk.w - 1) * cs, y * cs, radius);
          }
        }
      }
    }
  }

  /**
   * Draw a single column (circle or square).
   */
  _drawColumn(ctx, x, y, radius) {
    const isShattered = rng.float() < (Parameters.columnShattered || 0.0125);

    ctx.save();
    if (isShattered) {
      // Shattered column: just outline with floor fill
      ctx.lineWidth = style.normal;
      ctx.strokeStyle = style.getInk();
      ctx.fillStyle = style.getFloor();
    } else {
      // Normal column: shadow + shading fill + ink outline
      // Shadow (drawn first, slightly larger)
      ctx.fillStyle = style.getShading();
      if (Parameters.columnSquare) {
        ctx.fillRect(x - radius - style.thick / 2, y - radius - style.thick / 2,
                     2 * (radius + style.thick / 2), 2 * (radius + style.thick / 2));
      } else {
        ctx.beginPath();
        ctx.arc(x, y, radius + style.thick / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = style.thick;
      ctx.strokeStyle = style.getInk();
      ctx.fillStyle = style.getShading();
    }

    // Draw column shape
    if (Parameters.columnSquare) {
      ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
      ctx.strokeRect(x - radius, y - radius, 2 * radius, 2 * radius);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draw wall cracks.
   * Original: Da.drawCracks - uses seeded RNG to place cracks on solid walls.
   * Checks all 3 wall directions: axis (case 0), perpendicular-left (case 1),
   * perpendicular-right (case 2). Uses room.width/depth (local coords).
   */
  _drawCracks(dungeon) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const crackChance = Parameters.crackChance || 0.125;

    if (crackChance <= 0) return;

    ctx.save();

    for (const room of dungeon.rooms) {
      if (room.w <= 3 || room.h <= 3) continue;

      let radius = 0;
      let perimeter;
      if (room.round) {
        radius = Math.sqrt((room.width - 2) * (room.width - 2) + 1) / 2;
        perimeter = Math.PI * radius;
      } else {
        perimeter = 2 * (room.width + room.depth - 4);
      }

      // Original: nCracks = (perimeter * avg(rng,rng,rng) * crackChance) | 0
      const nCracks = (perimeter * ((rng.float() + rng.float() + rng.float()) / 3) * crackChance) | 0;

      for (let i = 0; i < nCracks; i++) {
        const center = room.center();
        let crackDir = null;

        if (room.round) {
          const angle = 2 * Math.PI * rng.float();
          crackDir = { x: Math.cos(angle), y: Math.sin(angle) };
          center.x += crackDir.x * radius;
          center.y += crackDir.y * radius;
        } else {
          const ax = room.axis;
          const wallChoice = Math.floor(rng.float() * 3);

          if (wallChoice === 0) {
            // Back wall (along axis direction)
            if (room.isSolid(ax)) {
              crackDir = { x: ax.x, y: ax.y };
              const d = room.depth / 2 - 1;
              center.x += crackDir.x * d;
              center.y += crackDir.y * d;
              const perp = { x: -crackDir.y, y: crackDir.x };
              const crossOff = (room.width / 2 - 2) * rng.float();
              center.x += perp.x * crossOff;
              center.y += perp.y * crossOff;
            }
          } else if (wallChoice === 1) {
            // Perpendicular wall: (-axis.y, axis.x)
            const sideDir = { x: -ax.y, y: ax.x };
            if (room.isSolid(sideDir)) {
              crackDir = { x: sideDir.x, y: sideDir.y };
              const d = room.width / 2 - 1;
              center.x += crackDir.x * d;
              center.y += crackDir.y * d;
              const perp = { x: -crackDir.y, y: crackDir.x };
              const crossOff = (room.depth / 2 - 2) * rng.float();
              center.x += perp.x * crossOff;
              center.y += perp.y * crossOff;
            }
          } else {
            // Opposite perpendicular wall: (axis.y, -axis.x)
            const sideDir = { x: ax.y, y: -ax.x };
            if (room.isSolid(sideDir)) {
              crackDir = { x: sideDir.x, y: sideDir.y };
              const d = room.width / 2 - 1;
              center.x += crackDir.x * d;
              center.y += crackDir.y * d;
              const perp = { x: -crackDir.y, y: crackDir.x };
              const crossOff = (room.depth / 2 - 2) * rng.float();
              center.x += perp.x * crossOff;
              center.y += perp.y * crossOff;
            }
          }
        }

        if (crackDir) {
          this._drawCrack(ctx, center, crackDir, rng.float(), cs);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Draw a single crack line from a wall point.
   * Original: Da.drawCrack - uses seeded RNG for zigzag angles.
   */
  _drawCrack(ctx, pos, dir, depth, cs) {
    const nSegments = Math.ceil(5 * depth);
    const stepLen = (-cs * depth) / nSegments;
    const stepX = stepLen * dir.x;
    const stepY = stepLen * dir.y;

    const px = pos.x * cs;
    const py = pos.y * cs;

    // First point: offset back by half of H.thick along crack direction
    const stepMag = Math.sqrt(stepX * stepX + stepY * stepY);
    const normFactor = stepMag > 0 ? (0.5 * style.thick) / stepMag : 0;
    const points = [
      [px - stepX * normFactor, py - stepY * normFactor],
      [px, py]
    ];

    let cx = px, cy = py;
    let zigzag = rng.float() < 0.5 ? 1 : -1;

    for (let s = 0; s < nSegments; s++) {
      zigzag = -zigzag;
      const angleVar = zigzag * rng.float() * Math.PI / 4;
      const cos = Math.cos(angleVar);
      const sin = Math.sin(angleVar);
      cx += stepX * cos - stepY * sin;
      cy += stepY * cos + stepX * sin;
      points.push([cx, cy]);
    }

    // Draw as tapered stroke (simplified from original Da.drawStroke)
    ctx.save();
    ctx.lineWidth = style.thick * depth;
    ctx.strokeStyle = style.getInk();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 8: NOTES (room numbers on map + floating note boxes)
  // ═════════════════════════════════════════════════════════════

  /**
   * Draw room number symbols on the map (inside each room).
   * Drawn in screen space so numbers stay upright regardless of rotation.
   * Original: NoteView places a ref text (the number) at the room center,
   * with a floor-colored glow behind it for readability.
   *
   * @param {Object} dungeon
   * @param {Function} localToScreen - converts grid coords (gx, gy) to screen {x, y}
   * @param {number} fitScale - current fit scale factor for sizing the font
   */
  _drawRoomNumbers(dungeon, localToScreen, fitScale) {
    const ctx = this.ctx;

    // Scale the font size to match the dungeon zoom level.
    // The base fontSymbols size (e.g. 30) is defined in local/grid space,
    // so we multiply by fitScale to get the correct screen-space size.
    const scaledFont = {
      ...style.fontSymbols,
      size: style.fontSymbols.size * fitScale,
    };

    ctx.save();
    ctx.fillStyle = style.getInk();
    ctx.font = style.getFontCSS(scaledFont);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const room of dungeon.rooms) {
      if (room.note && room.note.symb) {
        // Get grid coordinates for the room number position
        const gx = room.note.point
          ? room.note.point.x
          : room.x + room.w / 2;
        const gy = room.note.point
          ? room.note.point.y
          : room.y + room.h / 2;

        // Project to screen coordinates (already accounts for rotation)
        const screen = localToScreen(gx, gy);

        // Draw glow (floor-colored outline behind text for readability)
        if (!style.bw) {
          ctx.save();
          ctx.strokeStyle = style.getFloor();
          ctx.lineWidth = style.normal * fitScale * 2;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(room.note.symb, screen.x, screen.y);
          ctx.restore();
        }

        ctx.fillText(room.note.symb, screen.x, screen.y);
      }
    }
    ctx.restore();
  }

  /**
   * Draw floating note boxes around the dungeon perimeter.
   *
   * Original algorithm (layoutStickerNotes):
   * 1. Collect occupied rectangles (all rooms/blocks scaled to pixels + title/story)
   * 2. For each note, try up to 1000 random positions within the available area
   * 3. Pick the position closest to the room's center that doesn't overlap occupied rects
   * 4. If no clear position found, push outward from center
   * 5. Each placed note becomes a new occupied rect for subsequent notes
   *
   * Each note box: rounded rect with paper fill, ink border, containing
   * "N. description text" with word-wrapped text.
   */
  _drawNoteBoxes(dungeon, bounds, localToScreen) {
    const ctx = this.ctx;
    const cs = this.cellSize;

    // Collect notes
    const notes = [];
    for (const room of dungeon.rooms) {
      if (room.note && room.note.text && room.note.symb) {
        notes.push(room.note);
      }
    }
    if (notes.length === 0) return;

    // -- Measure all note boxes first --
    const noteBoxWidth = 200; // Original: setWidth(200) for NORMAL mode
    const padding = 10;       // Original: 10px padding on each side
    const cornerRadius = 10;

    ctx.save();
    ctx.font = style.getFontCSS(style.fontNotes);

    const noteMeasurements = [];
    for (const note of notes) {
      const displayText = note.symb + '. ' + note.text;
      const lines = this._wrapText(ctx, displayText, noteBoxWidth - 2 * padding);
      const lineHeight = style.fontNotes.size * 1.2;
      const textHeight = lines.length * lineHeight;
      const boxW = noteBoxWidth;
      const boxH = textHeight;
      noteMeasurements.push({ note, lines, lineHeight, boxW, boxH });
    }

    // -- Build occupied rectangles in SCREEN space --
    // Transform each room's four corners through the rotation to get an
    // axis-aligned bounding box in screen coordinates.
    const occupied = [];
    const roomsAndBlocks = dungeon.rooms.slice();
    if (dungeon.blocks) {
      for (const block of dungeon.blocks) roomsAndBlocks.push(block);
    }
    for (const rect of roomsAndBlocks) {
      const corners = [
        localToScreen(rect.x, rect.y),
        localToScreen(rect.x + rect.w, rect.y),
        localToScreen(rect.x, rect.y + rect.h),
        localToScreen(rect.x + rect.w, rect.y + rect.h),
      ];
      let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
      for (const c of corners) {
        if (c.x < sMinX) sMinX = c.x;
        if (c.y < sMinY) sMinY = c.y;
        if (c.x > sMaxX) sMaxX = c.x;
        if (c.y > sMaxY) sMaxY = c.y;
      }
      occupied.push({ x: sMinX, y: sMinY, w: sMaxX - sMinX, h: sMaxY - sMinY });
    }

    // Add title/story area as occupied so notes don't overlap text
    const dprOcc = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    const vpW = this.canvas.width / dprOcc;
    const vpH = this.canvas.height / dprOcc;
    const topReserved = this._measureTopReserved(dungeon, vpW);
    if (topReserved > 50) {
      // Block the entire title/story banner area
      occupied.push({ x: 0, y: 0, w: vpW, h: topReserved + 10 });
    }

    // Sampling area: clamped to viewport with padding
    const margin = cs * 3;
    const viewPad = 15;
    const areaMinX = Math.max(viewPad, bounds.minX - margin * 4);
    const areaMinY = Math.max(topReserved + 10, bounds.minY - margin * 4);
    const areaMaxX = Math.min(vpW - viewPad, bounds.maxX + margin * 4);
    const areaMaxY = Math.min(vpH - 35, bounds.maxY + margin * 4); // 35px for bottom bar

    // -- Position each note using random sampling (original algorithm) --
    // Use a simple seeded LCG so positions are deterministic per dungeon
    let posSeed = dungeon.seed || 12345;
    const nextRand = () => {
      posSeed = (48271 * posSeed % 2147483647) | 0;
      return posSeed / 2147483647;
    };

    const placements = []; // { x, y, boxW, boxH, measurement, screenTarget }

    for (const m of noteMeasurements) {
      // Target: room center projected to screen coordinates
      const screenTarget = localToScreen(m.note.point.x, m.note.point.y);
      const targetX = screenTarget.x;
      const targetY = screenTarget.y;

      // Check if the user has manually repositioned this note box
      const overrideKey = m.note.symb;
      const override = this.noteOverrides.get(overrideKey);

      if (override) {
        // Advance the RNG the same number of times as the sampling loop would,
        // so that subsequent non-overridden notes get stable auto-positions.
        for (let i = 0; i < 1000; i++) { nextRand(); nextRand(); }
        // Use user-dragged position
        placements.push({ x: override.x, y: override.y, boxW: m.boxW, boxH: m.boxH, measurement: m, screenTarget });
        // Still add to occupied so subsequent auto-placed notes avoid this one
        occupied.push({
          x: override.x - m.boxW / 2 - padding,
          y: override.y - m.boxH / 2 - padding,
          w: m.boxW + 2 * padding,
          h: m.boxH + 2 * padding
        });
        continue;
      }

      const rangeW = areaMaxX - areaMinX - m.boxW;
      const rangeH = areaMaxY - areaMinY - m.boxH;

      let bestDist = Infinity;
      let bestX = null;
      let bestY = null;

      // Try up to 1000 random positions (matching original)
      for (let attempt = 0; attempt < 1000; attempt++) {
        const tryX = areaMinX + m.boxW / 2 + rangeW * nextRand();
        const tryY = areaMinY + m.boxH / 2 + rangeH * nextRand();

        // Check rect centered at (tryX, tryY)
        const testRect = {
          x: tryX - m.boxW / 2 - padding,
          y: tryY - m.boxH / 2 - padding,
          w: m.boxW + 2 * padding,
          h: m.boxH + 2 * padding
        };

        let overlaps = false;
        for (const occ of occupied) {
          if (this._rectsIntersect(testRect, occ)) {
            overlaps = true;
            break;
          }
        }
        for (const placed of placements) {
          if (overlaps) break;
          const placedRect = {
            x: placed.x - placed.boxW / 2 - padding,
            y: placed.y - placed.boxH / 2 - padding,
            w: placed.boxW + 2 * padding,
            h: placed.boxH + 2 * padding
          };
          if (this._rectsIntersect(testRect, placedRect)) {
            overlaps = true;
          }
        }

        if (!overlaps) {
          const dx = tryX - targetX;
          const dy = tryY - targetY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bestDist) {
            bestDist = dist;
            bestX = tryX;
            bestY = tryY;
          }
        }
      }

      // Fallback: push outward from dungeon center if no clear spot found
      if (bestX === null) {
        const dpr2 = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
        const vpW2 = this.canvas.width / dpr2;
        const vpH2 = this.canvas.height / dpr2;
        const cx = bounds.minX + bounds.width / 2;
        const cy = bounds.minY + bounds.height / 2;
        const dx = targetX - cx;
        const dy = targetY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pushDist = Math.max(m.boxW, m.boxH);
        bestX = Math.max(m.boxW / 2 + 15, Math.min(vpW2 - m.boxW / 2 - 15, targetX + (dx / dist) * pushDist));
        bestY = Math.max(m.boxH / 2 + 15, Math.min(vpH2 - m.boxH / 2 - 30, targetY + (dy / dist) * pushDist));
      }

      // Clamp to viewport so notes are never clipped
      const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
      const vpW = this.canvas.width / dpr;
      const vpH = this.canvas.height / dpr;
      const halfW = m.boxW / 2 + padding;
      const halfH = m.boxH / 2 + padding;
      bestX = Math.max(halfW + 5, Math.min(vpW - halfW - 5, bestX));
      bestY = Math.max(halfH + 5, Math.min(vpH - halfH - 30, bestY)); // 30px bottom for UI bar

      placements.push({ x: bestX, y: bestY, boxW: m.boxW, boxH: m.boxH, measurement: m, screenTarget });

      // Add to occupied so subsequent notes avoid this one
      occupied.push({
        x: bestX - m.boxW / 2 - padding,
        y: bestY - m.boxH / 2 - padding,
        w: m.boxW + 2 * padding,
        h: m.boxH + 2 * padding
      });
    }

    // -- Save placements for hit-testing (used by App drag logic) --
    this.notePlacements = placements.map(p => ({
      x: p.x,
      y: p.y,
      boxW: p.measurement.boxW,
      boxH: p.measurement.boxH,
      padding,
      symb: p.measurement.note.symb,
      screenTarget: p.screenTarget,
    }));

    // -- Draw the note boxes (all in screen space, axis-aligned) --
    for (const p of placements) {
      const m = p.measurement;
      const bx = p.x - m.boxW / 2;
      const by = p.y - m.boxH / 2;

      // Draw connector line from note box center to room's screen position
      if (style.showConnectors) {
        ctx.save();
        ctx.strokeStyle = style.getInk();
        ctx.lineWidth = style.normal;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.screenTarget.x, p.screenTarget.y);
        ctx.stroke();
        ctx.restore();
      }

      // Background box: paper fill + ink border (original: drawRoundRect with paper fill)
      ctx.save();
      ctx.lineWidth = 2 * style.normal;
      ctx.strokeStyle = style.getInk();
      ctx.fillStyle = style.getPaper();
      this._roundRect(ctx, bx - padding, by - padding,
        m.boxW + 2 * padding, m.boxH + 2 * padding, cornerRadius);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Inner paper fill (covers the border's inner area for clean text rendering)
      ctx.save();
      ctx.fillStyle = style.getPaper();
      this._roundRect(ctx, bx - padding + 1, by - padding + 1,
        m.boxW + 2 * padding - 2, m.boxH + 2 * padding - 2, cornerRadius - 1);
      ctx.fill();
      ctx.restore();

      // Draw wrapped text
      ctx.save();
      ctx.fillStyle = style.getInk();
      ctx.font = style.getFontCSS(style.fontNotes);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (let i = 0; i < m.lines.length; i++) {
        ctx.fillText(m.lines[i], bx, by + i * m.lineHeight);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Word-wrap text to fit within a given pixel width.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} maxWidth
   * @returns {string[]} Array of wrapped lines
   */
  _wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length > 0 ? lines : [''];
  }

  /**
   * Test if two axis-aligned rectangles intersect.
   * @param {{x,y,w,h}} a
   * @param {{x,y,w,h}} b
   * @returns {boolean}
   */
  _rectsIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ═════════════════════════════════════════════════════════════
  // LAYER 9: TITLE & STORY HOOK
  // ═════════════════════════════════════════════════════════════

  /**
   * Draw the dungeon title centered above the map.
   *
   * Original: title uses 'Germania One' font (fontTitle), centered horizontally.
   * Scales down if the title is wider than the available area (rWidth - 100).
   * Position: centered above the dungeon bounding box.
   *
   * @param {string} title - The dungeon name (e.g., "Swamp Chambers of the Under Moon")
   * @param {Object} bounds - Dungeon pixel bounds {minX, minY, maxX, maxY, width, height}
   * @param {number} canvasW - Full viewport width in CSS pixels
   */
  _drawTitle(title, bounds, canvasW) {
    const ctx = this.ctx;
    const centerX = canvasW / 2;

    ctx.save();
    ctx.fillStyle = style.getInk();
    ctx.font = style.getFontCSS(style.fontTitle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Original layoutTitle (Dungeon-built.js ~line 10016):
    //   titleScale = min((rWidth - 100) / textWidth, 1)
    //   title.x = (rWidth - title.width) / 2
    //   title.y = 0 (default, at top of scene)
    const titleTextWidth = ctx.measureText(title).width;
    const titleScale = Math.min((canvasW - 100) / titleTextWidth, 1);

    // Position with top padding
    const titleY = 20;

    if (titleScale < 1) {
      ctx.save();
      ctx.translate(centerX, titleY);
      ctx.scale(titleScale, titleScale);
      ctx.fillText(title, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(title, centerX, titleY);
    }

    ctx.restore();
  }

  /**
   * Draw the story hook text below the title, centered.
   *
   * Original: story hook uses 'Pathway Gothic One' italic (fontStory),
   * centered, word-wrapped, positioned just below the title.
   *
   * @param {string} hook - The story hook text
   * @param {string} titleText - The dungeon name (needed to measure title height)
   * @param {number} canvasW - Full viewport width in CSS pixels
   */
  _drawStoryHook(hook, titleText, canvasW) {
    const ctx = this.ctx;
    const centerX = canvasW / 2;

    ctx.save();

    // ── Measure title height (to position story below it) ──
    ctx.font = style.getFontCSS(style.fontTitle);
    const titleTextWidth = ctx.measureText(titleText).width;
    const titleScale = Math.min((canvasW - 100) / titleTextWidth, 1);
    const titleMetrics = ctx.measureText(titleText);
    const titleNaturalHeight = (titleMetrics.fontBoundingBoxAscent !== undefined)
      ? titleMetrics.fontBoundingBoxAscent + titleMetrics.fontBoundingBoxDescent
      : style.fontTitle.size;
    const titleHeight = titleNaturalHeight * titleScale;

    // ── Story text ──
    ctx.fillStyle = style.getInk();
    ctx.font = style.getFontCSS(style.fontStory);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Original layoutStory (Dungeon-built.js ~line 10024):
    //   story.y = title.height  (story starts right below title)
    //   story wraps to max(min(rWidth, rHeight), title.scaledWidth) - 100
    //   story.x = (rWidth - story.width) / 2
    const startY = 20 + titleHeight; // 20px top padding + title height

    // Wrap width: original uses max(min(rWidth, rHeight), title.scaledWidth) - 100
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    const rHeight = this.canvas.height / dpr;
    const wrapWidth = Math.max(
      Math.min(canvasW, rHeight),
      titleTextWidth * titleScale
    ) - 100;
    const lines = this._wrapText(ctx, hook, wrapWidth);
    const storyMetrics = ctx.measureText('Mg');
    const lineHeight = (storyMetrics.fontBoundingBoxAscent !== undefined)
      ? storyMetrics.fontBoundingBoxAscent + storyMetrics.fontBoundingBoxDescent
      : style.fontStory.size * 1.2;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], centerX, startY + i * lineHeight);
    }

    ctx.restore();
  }
}

export default DungeonRenderer;
