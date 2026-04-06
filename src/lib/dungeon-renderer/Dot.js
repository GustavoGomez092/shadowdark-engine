/**
 * Dot (2D Integer Point)
 *
 * Represents a point or direction vector on the dungeon grid.
 * Used for room origins, door positions, and directional axes.
 */

class Dot {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /** Create a copy of this dot */
  clone() {
    return new Dot(this.x, this.y);
  }

  /** Check equality with another dot */
  equals(other) {
    return other && this.x === other.x && this.y === other.y;
  }

  /** Add another dot's coordinates */
  add(other) {
    return new Dot(this.x + other.x, this.y + other.y);
  }

  /** Subtract another dot's coordinates */
  sub(other) {
    return new Dot(this.x - other.x, this.y - other.y);
  }

  /** Scale by a factor */
  scale(factor) {
    return new Dot(this.x * factor, this.y * factor);
  }

  /** Negate both coordinates */
  negate() {
    return new Dot(-this.x, -this.y);
  }

  /** Manhattan distance to another dot */
  manhattan(other) {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  /** Euclidean distance to another dot */
  distance(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Get the perpendicular (rotated 90 degrees clockwise) */
  perpCW() {
    return new Dot(-this.y, this.x);
  }

  /** Get the perpendicular (rotated 90 degrees counter-clockwise) */
  perpCCW() {
    return new Dot(this.y, -this.x);
  }

  toString() {
    return `(${this.x}, ${this.y})`;
  }

  toJSON() {
    return { x: this.x, y: this.y };
  }
}

/** Direction constants */
Dot.UP    = new Dot( 0, -1);
Dot.DOWN  = new Dot( 0,  1);
Dot.LEFT  = new Dot(-1,  0);
Dot.RIGHT = new Dot( 1,  0);

/** All four cardinal directions */
Dot.DIRECTIONS = [Dot.UP, Dot.DOWN, Dot.LEFT, Dot.RIGHT];

/**
 * Create a unit vector from an angle (radians)
 */
Dot.polar = function(length, angle) {
  return new Dot(
    Math.round(Math.cos(angle) * length),
    Math.round(Math.sin(angle) * length)
  );
};

export default Dot;
