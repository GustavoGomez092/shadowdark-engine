/**
 * Rect (Axis-Aligned Rectangle)
 *
 * Represents a rectangle on the dungeon grid.
 * Base class for Room — provides geometry, intersection, and bounds logic.
 */

import Dot from './Dot.js';

class Rect {
  /**
   * @param {number} x - Left edge
   * @param {number} y - Top edge
   * @param {number} w - Width
   * @param {number} h - Height
   */
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  /** Right edge (exclusive) */
  get right() {
    return this.x + this.w;
  }

  /** Bottom edge (exclusive) */
  get bottom() {
    return this.y + this.h;
  }

  /** Center point as a Dot */
  center() {
    return new Dot(
      this.x + this.w / 2,
      this.y + this.h / 2
    );
  }

  /** Area in grid cells */
  area() {
    return this.w * this.h;
  }

  /** Create a copy */
  clone() {
    return new Rect(this.x, this.y, this.w, this.h);
  }

  /**
   * Check if a point is inside this rectangle
   * @param {number} px
   * @param {number} py
   */
  contains(px, py) {
    return px >= this.x && px < this.right &&
           py >= this.y && py < this.bottom;
  }

  /**
   * Check if this rectangle intersects (overlaps) another
   * @param {Rect} other
   * @returns {boolean}
   */
  intersects(other) {
    return this.x < other.right && this.right > other.x &&
           this.y < other.bottom && this.bottom > other.y;
  }

  /**
   * Get the intersection rectangle with another.
   * Returns a zero-area rect if no overlap.
   * @param {Rect} other
   * @returns {Rect}
   */
  intersection(other) {
    const x = Math.max(this.x, other.x);
    const y = Math.max(this.y, other.y);
    const r = Math.min(this.right, other.right);
    const b = Math.min(this.bottom, other.bottom);
    if (r > x && b > y) {
      return new Rect(x, y, r - x, b - y);
    }
    return new Rect(x, y, 0, 0);
  }

  /**
   * Get the bounding rect that contains both this and another rect
   * @param {Rect} other
   * @returns {Rect}
   */
  union(other) {
    const x = Math.min(this.x, other.x);
    const y = Math.min(this.y, other.y);
    const r = Math.max(this.right, other.right);
    const b = Math.max(this.bottom, other.bottom);
    return new Rect(x, y, r - x, b - y);
  }

  /**
   * Inflate (expand) or deflate (shrink) the rect
   * @param {number} dx - Horizontal expansion on each side
   * @param {number} dy - Vertical expansion on each side
   * @returns {Rect}
   */
  inflate(dx, dy) {
    return new Rect(
      this.x - dx,
      this.y - dy,
      this.w + 2 * dx,
      this.h + 2 * dy
    );
  }

  /**
   * Scale the rect dimensions by a factor
   * @param {number} factor
   * @returns {Rect}
   */
  scale(factor) {
    return new Rect(
      this.x * factor,
      this.y * factor,
      this.w * factor,
      this.h * factor
    );
  }

  /**
   * Get bounds after rotation by a given angle.
   * Used for rotating the dungeon display.
   *
   * @param {number} sinA - Sine of the rotation angle
   * @param {number} cosA - Cosine of the rotation angle
   * @returns {Rect}
   */
  getBounds(sinA, cosA) {
    const corners = [
      { x: this.x, y: this.y },
      { x: this.right, y: this.y },
      { x: this.right, y: this.bottom },
      { x: this.x, y: this.bottom }
    ];

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const c of corners) {
      const rx = c.x * cosA - c.y * sinA;
      const ry = c.x * sinA + c.y * cosA;
      minX = Math.min(minX, rx);
      minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx);
      maxY = Math.max(maxY, ry);
    }

    return new Rect(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Get polygon vertices (4 corners) as array of {x, y}
   * @returns {Array<{x:number, y:number}>}
   */
  getPolygon() {
    return [
      { x: this.x, y: this.y },
      { x: this.right, y: this.y },
      { x: this.right, y: this.bottom },
      { x: this.x, y: this.bottom }
    ];
  }

  toString() {
    return `Rect(${this.x}, ${this.y}, ${this.w}x${this.h})`;
  }

  toJSON() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

export default Rect;
