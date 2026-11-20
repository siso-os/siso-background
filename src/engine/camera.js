// The camera: drifts right on its own; Shift+D / Shift+A (or the arrows) speed it up while held, with easing; on
// release it coasts to a stop and, after 15 s with no input, eases back into the drift. Shift+W / Shift+S (or up and
// down) move one level (ground, clouds, space) with a smooth move of about 3 s; holding keeps going. On a phone a
// drag pans and a vertical swipe changes level.
//
// The camera is the one thing driven by input, so it is stepped (step(dt)) rather than drawn from t; with no input it
// sits exactly on the auto path autoX(t), which is what the director plans events along.

import { LEVELS } from './view.js';

const IDLE_RETURN = 15;    // seconds without input before the drift comes back
const MAX_V = 1500;        // world units per second at full speed
const W_SPRING = 2.4;      // the level move's spring: settles in about 3 s

export class Camera {
  constructor({ x0 = 0, t0 = 0, drift = 40, level = 0, y = null } = {}) {
    this.x0 = x0; this.drift = drift;
    this.x = x0 + drift * t0;
    this.vx = drift;
    this.level = level;
    this.y = y ?? LEVELS[level];
    this.vy = 0;
    this.keys = { left: false, right: false, up: false, down: false };
    this.held = 0;          // seconds a horizontal key has been held
    this.idle = Infinity;   // seconds since the last input (Infinity: never touched, so on the auto path)
    this.drag = null;       // { px, py, x, moved } while a pointer is down
  }
  autoX(t) { return this.x0 + this.drift * t; }
  get target() { return LEVELS[this.level]; }
  get touched() { return this.idle !== Infinity; }

  // One level up (+1) or down (-1). Returns true if it moved.
  climb(d) {
    const n = Math.max(0, Math.min(LEVELS.length - 1, this.level + d));
    if (n === this.level) return false;
    this.level = n; this.idle = 0;
    return true;
  }

  press(k, on) {
    if (!(k in this.keys)) return;
    const was = this.keys[k];
    this.keys[k] = on;
    this.idle = 0;
    if (on && !was && (k === 'up' || k === 'down')) this.climb(k === 'up' ? 1 : -1);
    if (!on && (k === 'left' || k === 'right')) this.held = 0;
  }

  // Pointer: a drag pans (k: device px per world unit at z 1), a vertical swipe changes level.
  pointerDown(px, py) { this.drag = { px, py, sx: px, sy: py, moved: false, v: 0 }; this.idle = 0; }
  pointerMove(px, py, k, dt = 1 / 60) {
    const d = this.drag; if (!d) return;
    const dx = px - d.px; d.px = px; d.py = py;
    if (Math.abs(px - d.sx) > 6) d.moved = true;
    const dw = -dx / k;
    this.x += dw; d.v = dw / Math.max(dt, 1 / 240);
    this.vx = 0; this.idle = 0;
  }
  pointerUp(H) {
    const d = this.drag; if (!d) return;
    const dy = d.py - d.sy, dx = d.px - d.sx;
    if (Math.abs(dy) > Math.max(0.08 * H, 40) && Math.abs(dy) > 1.5 * Math.abs(dx)) this.climb(dy > 0 ? 1 : -1); // pulling the scene down shows what is above
    else this.vx = Math.max(-MAX_V, Math.min(MAX_V, d.v * 0.8));   // fling
    this.drag = null; this.idle = 0;
  }

  // dt: seconds since the last step; t: the scene time (so an untouched camera sits exactly on the auto path).
  step(dt, t) {
    dt = Math.min(dt, 0.1);
    const k = this.keys;
    const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    if (!this.drag) {
      let target, tau;
      if (dir) {
        this.held += dt; this.idle = 0;
        target = dir * Math.min(MAX_V, 260 + 620 * this.held);   // the longer it is held, the faster
        tau = 0.35;
      } else if (this.idle < IDLE_RETURN) { target = 0; tau = 0.9; }           // coast to a stop
      else { target = this.drift; tau = 2.2; }                                   // back into the drift
      this.vx += (target - this.vx) * (1 - Math.exp(-dt / tau));
      this.x += this.vx * dt;
      if (this.idle === Infinity && t !== undefined) this.x = this.autoX(t);
    }
    if (!dir && !this.drag && !k.up && !k.down) this.idle += dt;
    // holding up or down keeps climbing once the current move is mostly done
    if ((k.up || k.down) && Math.abs(this.y - this.target) < 0.18 * Math.abs(LEVELS[1] - LEVELS[0])) this.climb(k.up ? 1 : -1);
    // the level move: a critically damped spring, so a second press mid-move blends in
    const w = W_SPRING, e = this.y - this.target;
    const ex = Math.exp(-w * dt);
    const y = (e + (this.vy + w * e) * dt) * ex;
    this.vy = (this.vy - w * (this.vy + w * e) * dt) * ex;
    this.y = this.target + y;
    if (Math.abs(e) < 0.05 && Math.abs(this.vy) < 0.05) { this.y = this.target; this.vy = 0; }
  }
}
