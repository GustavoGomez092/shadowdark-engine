# Prop Rotation — Original Engine Reference

This document explains exactly how the original compiled Watabou One-Page Dungeon engine handles prop rotation, derived from analyzing `Dungeon-built.js`.

## Data Flow

### 1. Prop Instance Creation (`Rc` class, line 497)

```js
var Rc = function(a, b, c, d) {
  this.drawing = a;   // Drawing class (hf=Dais, Hf=SmallDais, Ie=Statue, etc.)
  this.pos = b;       // E (point) — grid position {x, y}
  this.rotation = c;  // E (point) or null — direction vector {x, y}, NOT an angle
  this.scale = d;     // number (default 1)
};
```

**Critical**: `this.rotation` is a **2D direction vector** (an `E` point object), NOT a scalar angle. It's the room's `axis` vector. For example:
- DOWN room: `new E(0, 1)` — axis points downward
- UP room: `new E(0, -1)` — axis points upward
- RIGHT room: `new E(1, 0)` — axis points right
- LEFT room: `new E(-1, 0)` — axis points left

### 2. How Props Are Created (Room.createProps, lines 352-359)

Dais example (line 356):
```js
// axis = this.axis (room direction)
d.push(new Rc(hf.inst, this.aisle(), new E(a.x, a.y)));
// Creates: Rc(DaisDrawing, aislePosition, axisVector)
```

Altar (line 358): `new Rc(jf.inst, this.aisle(), new E(axis.x, axis.y))`
Throne (line 358): `new Rc(lf.inst, this.aisle(), new E(axis.x, axis.y))`
Sarcophagus (line 358): `new Rc(kf.inst, this.aisle(), new E(Math.abs(axis.x), Math.abs(axis.y)))` — note: uses `abs()` so it's always positive
Tapestry (line 357): `new Rc(tapestry, this.aisle(), new E(-axis.y, axis.x))` — note: rotated 90° from room axis
Barrel/Crate: `new Rc(drawing, pos, E.polar(1, PI * random), scale)` — random angle as unit vector

### 3. Prop Draw Call (Rc.prototype.draw, line 498)

```js
draw: function(a) {
  var b = this.pos;
  this.drawing.draw(a, new E(30 * b.x, 30 * b.y), this.rotation, 30 * this.scale);
}
```

Passes `this.rotation` (the direction vector) to the Drawing's `draw()` method.

### 4. Drawing Base Class Draw (Drawing/$b.prototype.draw, lines 484-486)

This is the KEY rotation code:

```js
draw: function(a, b, c, d) {
  // a = graphics context
  // b = pixel position (E point)
  // c = rotation vector (E point) or null
  // d = scale (number)
  
  for each shape in this.shapes:
    // Clone the shape's polygon points
    F = shape.poly.map(p => p.clone());
    
    // ROTATION: Apply rotateYX transform if rotation vector exists
    if (c != null) {
      kb.asRotateYX(F, c.y, c.x);  // NOTE: passes c.y first, c.x second
    }
    
    // SCALE
    if (d != 1) {
      kb.asScale(F, d, d);
    }
    
    // TRANSLATE to position
    kb.asTranslate(F, b.x, b.y);
    
    // Draw the polygon/polyline
    ...
}
```

### 5. The Rotation Transform (kb.asRotateYX, line 488)

```js
kb.asRotateYX = function(points, b, c) {
  for each point h in points:
    h.setTo(
      h.x * c - h.y * b,   // new_x = x * c - y * b
      h.y * c + h.x * b    // new_y = y * c + x * b
    );
};
```

Called as `kb.asRotateYX(F, c.y, c.x)` where `c` is the rotation vector:
- `b = c.y` (the Y component of the direction vector)
- `c_param = c.x` (the X component of the direction vector)

So the actual transform is:
```
new_x = x * axis.x - y * axis.y
new_y = y * axis.x + x * axis.y
```

### 6. Mathematical Interpretation

This is a **standard 2D rotation matrix**:
```
| cos(θ)  -sin(θ) |   | axis.x  -axis.y |
| sin(θ)   cos(θ) | = | axis.y   axis.x |
```

Where:
- `cos(θ) = axis.x`
- `sin(θ) = axis.y`
- `θ = atan2(axis.y, axis.x)`

### 7. Concrete Examples

**DOWN room** (axis = {x:0, y:1}):
- cos(θ) = 0, sin(θ) = 1 → θ = atan2(1, 0) = **π/2 (90°)**
- Transform: new_x = -y, new_y = x (90° counterclockwise)

**UP room** (axis = {x:0, y:-1}):
- cos(θ) = 0, sin(θ) = -1 → θ = atan2(-1, 0) = **-π/2 (-90°)**
- Transform: new_x = y, new_y = -x (90° clockwise)

**RIGHT room** (axis = {x:1, y:0}):
- cos(θ) = 1, sin(θ) = 0 → θ = atan2(0, 1) = **0 (no rotation)**
- Transform: identity (no change)

**LEFT room** (axis = {x:-1, y:0}):
- cos(θ) = -1, sin(θ) = 0 → θ = atan2(0, -1) = **π (180°)**
- Transform: new_x = -x, new_y = -y (flip)

### 8. Dais Shape Definition (hf, line 495)

```js
var hf = function() {
  this.shapes = [];
  var points = [];
  for (var i = -8; i < 9; i++) {
    var angle = Math.PI * (1 + i/16);  // PI*0.5 to PI*1.5
    var p = E.polar(1.5, angle);       // radius 1.5
    points.push(new E(p.x + 0.5, p.y)); // offset +0.5 in X
  }
  // Shape 1: filled semicircle (no outline) — background
  var s1 = new Db(points);
  s1.outlined = false;
  this.shapes.push(s1);
  // Shape 2: same arc as outline — outer ring
  this.shapes.push(new Db(points));  // closed=false would be open, but default is closed
  // Shape 3: inner arc — smaller radius
  var inner = [];
  for (var i = -8; i < 9; i++) {
    var angle = Math.PI * (1 + i/16);
    var p = E.polar(1.25, angle);
    inner.push(new E(p.x + 0.5, p.y));
  }
  var s3 = new Db(inner);
  s3.closed = false;
  this.shapes.push(s3);
};
```

The dais shape is a **semicircle** spanning angles π*0.5 to π*1.5 (90° to 270°).
- At 90°: cos=0, sin=1 → point (0+0.5, 1.5) = (0.5, 1.5)
- At 180°: cos=-1, sin=0 → point (-1.5+0.5, 0) = (-1.0, 0)
- At 270°: cos=0, sin=-1 → point (0+0.5, -1.5) = (0.5, -1.5)

**At rotation 0 (no transform), the dais curved part bulges to the LEFT (-X direction), flat edge on the RIGHT (+X side at x=0.5).**

### 9. Canvas 2D Equivalent

To replicate in Canvas 2D `ctx.rotate()`:

```js
if (prop.axis) {
  // axis.x = cos(θ), axis.y = sin(θ)
  // θ = atan2(sin, cos) = atan2(axis.y, axis.x)
  const angle = Math.atan2(prop.axis.y, prop.axis.x);
  ctx.rotate(angle);
}
```

Note: Canvas `ctx.rotate(angle)` applies the same rotation matrix:
```
| cos(angle)  -sin(angle) |
| sin(angle)   cos(angle) |
```
which is identical to the original `asRotateYX` transform when `angle = atan2(axis.y, axis.x)`.

### 10. Order of Operations

The original engine applies transforms to the polygon POINTS in this order:
1. **Rotate** the points (asRotateYX)
2. **Scale** the points (asScale)
3. **Translate** the points to position (asTranslate)

In Canvas 2D, transforms are applied in REVERSE order (last call applied first), so the equivalent is:
```js
ctx.save();
ctx.translate(px, py);     // 3. position (applied first due to reverse order)
ctx.rotate(angle);         // 1. rotation
ctx.scale(s, s);           // 2. scale
// ... draw shape at origin ...
ctx.restore();
```

This matches the existing `_drawProps` code in DungeonRenderer.js.
