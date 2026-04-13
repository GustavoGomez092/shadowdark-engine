/**
 * Props.js - Dungeon decoration and prop drawing functions
 *
 * This module provides canvas-based drawing functions for all dungeon props.
 * Each prop is rendered using 2D canvas context calls with support for position,
 * scale, rotation, and styling.
 *
 * @module visuals/drawings/Props
 */

/**
 * Helper function to draw a regular polygon path on the canvas.
 * Moves to the first point and draws lines to all subsequent points.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} cx - Center x coordinate
 * @param {number} cy - Center y coordinate
 * @param {number} radius - Radius from center to vertex
 * @param {number} sides - Number of sides
 * @param {number} [startAngle=0] - Starting rotation angle in radians
 */
function regularPolygonPath(ctx, cx, cy, radius, sides, startAngle = 0) {
  for (let i = 0; i <= sides; i++) {
    const angle = startAngle + (2 * Math.PI * i) / sides;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

/**
 * Draw an Altar prop - six small hexagons arranged in a circular pattern.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawAltar(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const hexRadius = 0.01 * scale;
  const orbitRadius = 0.08 * scale;

  // Draw 6 small hexagons in a circle
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = orbitRadius * Math.cos(angle);
    const hy = orbitRadius * Math.sin(angle);

    ctx.beginPath();
    regularPolygonPath(ctx, hx, hy, hexRadius, 6);
    ctx.fillStyle = style.getInk();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draw a Barrel prop - regular 16-gon with horizontal diameter line and 2 hoops.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawBarrel(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const radius = 0.25 * scale;

  // Main barrel body (16-gon)
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, radius, 16);
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.thin;
  ctx.stroke();

  // Diameter line across center
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(radius, 0);
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.thin;
  ctx.stroke();

  // Top hoop
  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.7, radius * 0.9, radius * 0.2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.thin;
  ctx.stroke();

  // Bottom hoop
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.7, radius * 0.9, radius * 0.2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.thin;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a Boulder prop - irregular jagged polygon.
 * Uses pseudo-random noise-based offset to create natural rocky appearance.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawBoulder(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const radius = 0.25 * scale;
  const sides = 12;

  // Create jagged polygon with noise-based offsets
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    // Pseudo-random noise using sine functions
    const noise = Math.sin(angle * 3) * Math.sin(angle * 7) * 0.3;
    const r = radius * (1 + noise);
    const px = r * Math.cos(angle);
    const py = r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.fillStyle = style.getInk();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a Box prop - rectangular container with internal dividers.
 * Dimensions: 0.6x0.6 with vertical lines at ±0.1 offset.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawBox(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const w = 0.6 * scale;
  const h = 0.6 * scale;
  const dividerOffset = 0.1 * scale;

  // Box outline
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.thin;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  // Left vertical divider
  ctx.beginPath();
  ctx.moveTo(-dividerOffset, -h / 2);
  ctx.lineTo(-dividerOffset, h / 2);
  ctx.stroke();

  // Right vertical divider
  ctx.beginPath();
  ctx.moveTo(dividerOffset, -h / 2);
  ctx.lineTo(dividerOffset, h / 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a Chest prop - rectangular container with horizontal lid stripes.
 * Dimensions: 0.6x0.8 with 4 horizontal lines for lid details.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawChest(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const w = 0.6 * scale;
  const h = 0.8 * scale;

  // Chest outline
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.thin;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  // Lid stripes (4 horizontal lines in upper half)
  const stripeSpacing = (h / 2) / 5;
  for (let i = 1; i <= 4; i++) {
    const sy = -h / 2 + stripeSpacing * i;
    ctx.beginPath();
    ctx.moveTo(-w / 2, sy);
    ctx.lineTo(w / 2, sy);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a Dais prop - semi-circular raised platform.
 * Uses 16-point arc with outer radius 1.5x and inner radius 1.25x.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawDais(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const outerRadius = 1.5 * scale;
  const innerRadius = 1.25 * scale;
  const points = 16;

  // Create semi-circular arch path
  ctx.beginPath();

  // Outer arc (top half)
  for (let i = 0; i <= points; i++) {
    const angle = Math.PI + (Math.PI * i) / points;
    const px = outerRadius * Math.cos(angle);
    const py = outerRadius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  // Inner arc (bottom half, reversed)
  for (let i = points; i >= 0; i--) {
    const angle = Math.PI + (Math.PI * i) / points;
    const px = innerRadius * Math.cos(angle);
    const py = innerRadius * Math.sin(angle);
    ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fillStyle = style.getInk();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a SmallDais prop - circular raised platform.
 * Uses concentric circles: outer at 1.25x, inner at 1.0x.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawSmallDais(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const outerRadius = 1.25 * scale;
  const innerRadius = 1.0 * scale;

  // Create ring path
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  ctx.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  ctx.closePath();

  ctx.fillStyle = style.getInk();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a Fountain prop - water feature with concentric circles.
 * Outer 24-gon (0.5r), inner 24-gon (0.4r, filled with water), center 12-gon (0.1r).
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawFountain(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const outerRadius = 0.5 * scale;
  const waterRadius = 0.4 * scale;
  const centerRadius = 0.1 * scale;

  // Outer basin (24-gon)
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, outerRadius, 24);
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.thin;
  ctx.stroke();

  // Water (24-gon, filled)
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, waterRadius, 24);
  ctx.fillStyle = style.getWater();
  ctx.fill();

  // Center spout (12-gon)
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, centerRadius, 12);
  ctx.fillStyle = style.getInk();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a Sarcophagus prop - nested hexagonal shapes.
 * Outer hexagon at 0.45 scale, inner hexagon at 0.7 scale.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawSarcophagus(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const outerRadius = 0.45 * scale;
  const innerRadius = 0.7 * outerRadius;

  // Outer hexagon
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, outerRadius, 6);
  ctx.fillStyle = style.getInk();
  ctx.fill();

  // Inner hexagon (carved out)
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, innerRadius, 6);
  ctx.fillStyle = style.getPaper();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a Statue prop - pedestal with decorative crown.
 * Pedestal: 16-gon at 0.333r
 * Crown: 10-spike pattern with alternating 0.9x/0.4x radius.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawStatue(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const pedestalRadius = 0.333 * scale;
  const crownOuter = 0.9 * scale;
  const crownInner = 0.4 * scale;

  // Pedestal (16-gon)
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, pedestalRadius, 16);
  ctx.fillStyle = style.getInk();
  ctx.fill();

  // Crown with 10 spikes
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const angle = (Math.PI * i) / 10;
    const radius = i % 2 === 0 ? crownOuter : crownInner;
    const px = radius * Math.cos(angle);
    const py = radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = style.getInk();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a Tapestry prop - wall hanging with scalloped pattern.
 * Width-dependent design with Chaikin curve smoothing applied to edges.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawTapestry(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const width = 0.6 * scale;
  const height = 0.8 * scale;
  const scallops = 6;

  // Create scalloped path using quadratic curves
  ctx.beginPath();
  ctx.moveTo(-width / 2, -height / 2);

  // Top scalloped edge
  const scallop = width / scallops;
  for (let i = 0; i < scallops; i++) {
    const x1 = -width / 2 + i * scallop + scallop / 2;
    const y1 = -height / 2 - scallop / 4;
    const x2 = -width / 2 + (i + 1) * scallop;
    const y2 = -height / 2;
    ctx.quadraticCurveTo(x1, y1, x2, y2);
  }

  // Right edge
  ctx.lineTo(width / 2, height / 2);

  // Bottom edge (straight)
  ctx.lineTo(-width / 2, height / 2);
  ctx.closePath();

  ctx.fillStyle = style.getInk();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a Throne prop - ceremonial seat with high back.
 * Seat: 0.4x0.5 rectangle, back: 0.3x0.3 rectangle offset upward.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawThrone(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const seatW = 0.4 * scale;
  const seatH = 0.5 * scale;
  const backW = 0.3 * scale;
  const backH = 0.3 * scale;
  const backOffset = 0.25 * scale;

  // Seat
  ctx.fillStyle = style.getInk();
  ctx.fillRect(-seatW / 2, -seatH / 2, seatW, seatH);

  // High back, offset upward
  ctx.fillRect(-backW / 2, -seatH / 2 - backOffset - backH, backW, backH);

  ctx.restore();
}

/**
 * Draw a Well prop - circular structure with water.
 * Outer: 16-gon at 0.4r, Inner: 16-gon at 0.24r (filled with water).
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 */
function drawWell(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const outerRadius = 0.4 * scale;
  const waterRadius = 0.24 * scale;

  // Outer ring (16-gon)
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, outerRadius, 16);
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.thin;
  ctx.stroke();

  // Water (16-gon, filled)
  ctx.beginPath();
  regularPolygonPath(ctx, 0, 0, waterRadius, 16);
  ctx.fillStyle = style.getWater();
  ctx.fill();

  ctx.restore();
}

/**
 * Stairs - parallel lines indicating a staircase with direction arrow.
 */
function drawStairs(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const w = 0.5 * scale;
  const h = 0.7 * scale;
  const steps = 5;
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.normal;
  ctx.strokeRect(-w, -h, w * 2, h * 2);
  for (let i = 1; i < steps; i++) {
    const sy = -h + (i * (h * 2)) / steps;
    ctx.beginPath();
    ctx.moveTo(-w, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.6);
  ctx.lineTo(0, h * 0.6);
  ctx.moveTo(-w * 0.3, h * 0.3);
  ctx.lineTo(0, h * 0.6);
  ctx.lineTo(w * 0.3, h * 0.3);
  ctx.stroke();
  ctx.restore();
}

/**
 * Door - rectangular door shape with handle dot.
 */
function drawDoor(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const w = 0.35 * scale;
  const h = 0.5 * scale;
  ctx.fillStyle = style.getFloor();
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.normal;
  ctx.strokeRect(-w, -h, w * 2, h * 2);
  ctx.beginPath();
  ctx.arc(w * 0.5, 0, scale * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = style.getInk();
  ctx.fill();
  ctx.restore();
}

/**
 * Window - double-frame rectangle with cross bars.
 */
function drawWindow(ctx, x, y, scale, rotation, style) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const w = 0.4 * scale;
  const h = 0.25 * scale;
  ctx.strokeStyle = style.getInk();
  ctx.lineWidth = style.normal;
  ctx.strokeRect(-w, -h, w * 2, h * 2);
  const inset = scale * 0.06;
  ctx.strokeRect(-w + inset, -h + inset, (w - inset) * 2, (h - inset) * 2);
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(0, h);
  ctx.moveTo(-w, 0);
  ctx.lineTo(w, 0);
  ctx.stroke();
  ctx.restore();
}

/**
 * Master dispatcher function that routes to the correct prop drawing function.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {string} type - Prop type identifier
 * @param {number} x - Center x coordinate in pixels
 * @param {number} y - Center y coordinate in pixels
 * @param {number} scale - Size multiplier (typically 10-30 pixels)
 * @param {number} rotation - Rotation angle in radians
 * @param {Object} style - Style configuration object
 * @throws {Error} If prop type is not recognized
 */
function drawProp(ctx, type, x, y, scale, rotation, style) {
  const drawFunctions = {
    'altar': drawAltar,
    'barrel': drawBarrel,
    'boulder': drawBoulder,
    'box': drawBox,
    'chest': drawChest,
    'dais': drawDais,
    'smalldais': drawSmallDais,
    'fountain': drawFountain,
    'sarcophagus': drawSarcophagus,
    'statue': drawStatue,
    'tapestry': drawTapestry,
    'throne': drawThrone,
    'well': drawWell,
    'stairs': drawStairs,
    'door': drawDoor,
    'window': drawWindow,
  };

  const fn = drawFunctions[type.toLowerCase()];
  if (!fn) {
    throw new Error(`Unknown prop type: ${type}`);
  }

  fn(ctx, x, y, scale, rotation, style);
}

/**
 * Array of all valid prop type identifiers.
 * @type {string[]}
 */
const PROP_TYPES = [
  'altar',
  'barrel',
  'boulder',
  'box',
  'chest',
  'dais',
  'smalldais',
  'fountain',
  'sarcophagus',
  'statue',
  'tapestry',
  'throne',
  'well',
  'stairs',
  'door',
  'window',
];

export {
  drawAltar,
  drawBarrel,
  drawBoulder,
  drawBox,
  drawChest,
  drawDais,
  drawSmallDais,
  drawFountain,
  drawSarcophagus,
  drawStatue,
  drawTapestry,
  drawThrone,
  drawWell,
  drawProp,
  PROP_TYPES,
  regularPolygonPath,
};

export default {
  drawProp,
  PROP_TYPES,
  regularPolygonPath,
};
