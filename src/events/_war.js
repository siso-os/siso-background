// Shared by the war events (not an event: the director only reads index.js). Where things stand in the world, flight
// paths solved backwards from the hit, missiles with their trails, the light a blast throws on the city, the smoke and
// the sea, and small timing helpers. Every function is pure: the same inputs draw the same thing.

import { chunkItems, chunkOf, PLACES } from '../engine/world.js';
import { sizeOf } from '../engine/standin.js';
import { lightSprite } from '../engine/shore.js';
import { clamp, lerp, smooth } from '../core/rng.js';
import { css } from '../core/paint.js';
import { drawAsset } from '../assets/registry.js';

export { clamp, lerp, smooth, lightSprite, css };
export const HALF = 960;   // half the view's width at z 1 on a 16:9 screen, in units (W / 2 / k = 540 W / H)
export const TAU = Math.PI * 2;

// ---- timing ----
// p through a window [a, a + d): 0..1 inside it, -1 outside.
export const win = (u, a, d) => (u < a || u >= a + d ? -1 : (u - a) / d);
// a 0..1 envelope: up over `rise` from a, down over `fall` to b.
export const env = (u, a, b, rise = 1, fall = 1) => (u <= a || u >= b ? 0 : Math.min(1, (u - a) / rise, (b - u) / fall));
// a cheap per-index hash, 0..1, for jitter that must not depend on how many draws came before.
export function hr(i, s = 0) {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((s | 0) + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// ---- where things are ----
// Is world x at depth z on screen (a 16:9 view) with the camera at camX, m units in from the edge?
export const seen = (x, z, camX, m = 0) => Math.abs(z * (x - camX)) < HALF - m;
// The screen fraction (0 left, 1 right) of world x at depth z, camera at camX, 16:9.
export const frac = (x, z, camX) => 0.5 + (z * (x - camX)) / (2 * HALF);
// The world x at depth z that sits at screen fraction f with the camera at camX.
export const atFrac = (f, z, camX) => camX + ((f - 0.5) * 2 * HALF) / z;

// World items (from the static chunks) with x in [xa, xb] that pass test.
export function worldItems(seed, xa, xb, test) {
  const out = [];
  for (let c = chunkOf(xa); c <= chunkOf(xb); c++) for (const it of chunkItems(seed, c).items) if (!it.screen && !it.fn && it.x >= xa && it.x <= xb && test(it)) out.push(it);
  return out;
}
// Buildings, with their width W and height H in world units.
export function buildings(seed, xa, xb) {
  return worldItems(seed, xa, xb, (it) => it.kind === 'building').map((it) => {
    const [w, h] = sizeOf(it.id);
    return { id: it.id, x: it.x, z: it.z, s: it.s, W: w * it.s, H: h * it.s, seed: it.seed };
  });
}
// Enemy islands hanging over the ground (not the far small ones, not the ones up in the clouds).
export const enemyIslands = (seed, xa, xb) => worldItems(seed, xa, xb, (it) => (it.id === 'islands.enemy' || it.id === 'islands.enemy-small') && it.z >= 0.62 && it.y > -1000);
export const homeIslands = (seed, xa, xb) => worldItems(seed, xa, xb, (it) => it.id === 'islands.siso-home' && it.home);
export const palaces = (seed, xa, xb) => worldItems(seed, xa, xb, (it) => it.id === 'space.palace');
// The city spans (world x) of the places between xa and xb: [{ a, b, type }].
export function cities(seed, xa, xb) {
  const out = [];
  for (let c = chunkOf(xa); c <= chunkOf(xb); c++) {
    const P = chunkItems(seed, c).place;
    if (P.city) out.push({ a: P.x0 + P.city.span[0], b: P.x0 + P.city.span[1], type: P.type, i: c });
  }
  return out;
}
// The city that most overlaps [xc - half, xc + half], with that overlap as lo..hi, if it is at least need wide.
export function cityNear(seed, xc, half, need) {
  let best = null, ov = 0;
  for (const c of cities(seed, xc - half, xc + half)) {
    const lo = Math.max(c.a, xc - half), hi = Math.min(c.b, xc + half);
    if (hi - lo > ov) { ov = hi - lo; best = { ...c, lo, hi }; }
  }
  return ov >= need ? best : null;
}
export { PLACES };
// The bob the renderer gives a floating thing (so a shot can hit it where it is drawn).
export const bobAt = (it, t) => (it.bob ? Math.sin(t * 0.42 + (it.seed || 0) * 1.7 + it.x * 0.0013) * 5 * it.bob : 0);
export const sizeOfId = sizeOf;

// ---- projection ----
// The point at depth zh that the camera sees where it sees (x, y, z). Paths that cross depths draw their trails in
// the head's frame through this, so the trail lands on the screen where the missile actually was.
export function toDepth(view, x, y, z, zh) {
  if (!view || Math.abs(z - zh) < 1e-6) return [x, y];
  return [view.wx(view.sx(x, z), zh), view.wy(view.sy(y, z), zh)];
}

// ---- paths ----
const lp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
export const bez2 = (a, b, c, f) => lp(lp(a, b, f), lp(b, c, f), f);
export const bez3 = (a, b, c, d, f) => lp(bez2(a, b, c, f), bez2(b, c, d, f), f);

// One missile in flight at time t: its body turned along the path, its smoke trail back along where it has been.
// path(f) -> [x, y, z] for f 0..1 between launch t0 and arrival t1 (ease shapes the speed). The trail is sampled back
// in time for up to `back` seconds and capped at `len` units; the smoke drifts with `wind` (units/s) and sags.
// stop (default t1) is when it ends: lands, or is shot down on the way. Its trail then hangs for `linger` seconds,
// still drifting, and thins from its old end until it is gone, so a hit never wipes 300 units of smoke in one frame.
export function missile(out, { path, t0, t1, t, state = 'enemy', s = 0.7, view, ease = null, back = 1.2, len = 300, wind = 0, sag = 6, trail = state, ts = 1, seed = 0, lights = null, glow = 1, stop = t1, linger = 0 }) {
  if (t < t0 || t >= stop + linger) return null;
  const F = (tt) => { const f = clamp((tt - t0) / (t1 - t0)); return ease ? ease(f) : f; };
  const now = Math.min(t, stop), gone = t - now;
  const f = F(now);
  const [x, y, z] = path(f);
  const prev = path(Math.max(0, f - 0.004)), next = path(Math.min(1, f + 0.004));
  const [px, py] = toDepth(view, prev[0], prev[1], prev[2], z), [nx, ny] = toDepth(view, next[0], next[1], next[2], z);
  const rot = Math.atan2(ny - py, nx - px);
  // the trail: points from oldest to newest in the head's frame, relative to the nozzle
  if (trail) {
    const pts = [];
    const n = 9, span = Math.min(back, now - t0);
    for (let k = n; k >= 0; k--) {
      const tau = (k / n) * span, age = tau + gone;
      const q = path(F(now - tau));
      const [qx, qy] = toDepth(view, q[0], q[1], q[2], z);
      pts.push([(qx - x + wind * age) / ts, (qy - y + sag * age * age) / ts]);
    }
    const fade = gone > 0 ? 1 - gone / linger : 1;
    if (span > 0.02 && fade > 0.02) out.push({ id: 'fx.trail', x, y, z: z - 0.0005, s: ts, kind: 'fx', extra: { points: pts, kind: trail, len: (len * fade) / ts } });
  }
  if (gone > 0) return null;
  // the body: its nozzle (-0.6, -2.5 in its frame) on the path
  const c = Math.cos(rot), sn = Math.sin(rot), ax = 0.6 * s, ay = 2.5 * s;
  out.push({ id: 'air.missile', x: x + ax * c - ay * sn, y: y + ax * sn + ay * c, z, s, rot, state, seed, kind: 'fx' });
  if (lights) lights.push({ x, y, z, r: 26, c: state === 'siso' ? [140, 190, 255] : [255, 150, 60], a: 0.35 * glow });
  return { x, y, z, rot };
}

// ---- light ----
const WARM = [255, 150, 70];
// One overlay at depth z drawing every light additively: a soft sprite on what is around it (the faces of the towers,
// the smoke, the air), and for lights near the water a broken column on the sea under them. a is the strength at
// night; by day the same lights are a quarter as strong. lights: [{ x, y, z, r, c, a, water }]
export function lightOverlay(z, lights, { waterZ = 1.035 } = {}) {
  return {
    overlay: true, z,
    draw(ctx, v, L, t) {
      const night = 0.22 + 0.78 * clamp(L.night * 1.25);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const a = l.a * night;
        if (a < 0.01) continue;
        const x = v.sx(l.x, l.z), y = v.sy(l.y, l.z), r = v.k * l.z * l.r;
        if (x + r < 0 || x - r > v.W || y + r < 0) continue;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(lightSprite(l.c || WARM), x - r, y - r, r * 2, r * 2);
        if (l.water !== false && l.y > -700) {
          // the sea under it: dashes from the waterline down, as far below as the light is above (a mirror)
          const yw = v.sy(0, Math.max(waterZ, l.z)), depth = Math.min(v.H - yw, Math.max(8, (yw - y) * 0.9 + r * 0.3));
          if (depth <= 2 || yw >= v.H) continue;
          // a glitter path: soft glints, crowded at the waterline and spreading toward the viewer, each its own width
          // and offset, some winking out as the swell passes
          const n = Math.max(6, Math.min(30, Math.round((depth / (v.k * 3.2)) * Math.min(1, 0.4 + a))));
          const w0 = Math.min(r * 1.1, v.k * 80), sd = Math.round(l.x) % 997, spr = lightSprite(l.c || WARM), sw = Math.floor(t * 2.5);
          for (let k = 0; k < n; k++) {
            if (hr(k + 13, sd + sw) < 0.18) continue;
            const f = (k + 0.5) / n, g = f ** 1.5, yy = yw + 1 + g * depth;
            const w = w0 * (0.25 + 0.75 * (1 - f) ** 0.7) * (0.4 + 0.8 * hr(k + 31, sd)) * (0.75 + 0.25 * Math.sin(t * 5 + k * 2.1));
            const th = v.k * (1.1 + 2.4 * g), dx = (hr(k, sd) - 0.5) * w0 * 0.5 + Math.sin(t * 2.3 + k * 1.9) * v.k * 3;
            ctx.globalAlpha = Math.min(1, a * 0.85 * (1 - f) ** 1.3 * (0.5 + 0.5 * hr(k + 7, sd)));
            ctx.drawImage(spr, x - w / 2 + dx, yy - th, w, th * 2);
          }
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}

// The sky lifting on the biggest blasts: a very faint wash over the whole frame, brightest around the blast. Drawn on
// the far layer so the mountains and the sky catch it. flashes: [{ x, y, z, a, c }]
export function skyFlash(flashes) {
  return {
    overlay: true, z: 0.3,
    draw(ctx, v, L) {
      const night = 0.15 + 0.85 * clamp(L.night * 1.25);
      ctx.globalCompositeOperation = 'lighter';
      for (const f of flashes) {
        const a = f.a * night;
        if (a < 0.01) continue;
        const x = v.sx(f.x, f.z), y = v.sy(f.y, f.z), R = Math.max(v.W, v.H) * 0.9;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        const c = f.c || [255, 170, 110];
        g.addColorStop(0, css(c, 0.22 * a)); g.addColorStop(0.35, css(c, 0.09 * a)); g.addColorStop(1, css(c, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
      }
    },
  };
}


// The light overlays for a frame: lights split by layer (an overlay draws on its own layer's canvas, so a light on an
// island in the mid layer is drawn there, under the city), and the sky flashes on the far layer.
export function flush(out, lights, flashes) {
  // a soft knee on the total: past KNEE the lights add a third as much, so a carpet of thirty blasts lights the city
  // without burning it to white (the scale is a smooth function of the sum, so nothing steps between frames)
  const KNEE = 4, sum = lights.reduce((n, l) => n + l.a, 0);
  if (sum > KNEE) { const sc = (KNEE + (sum - KNEE) / 3) / sum; lights = lights.map((l) => ({ ...l, a: l.a * sc })); }
  const mid = lights.filter((l) => l.z < 0.9), main = lights.filter((l) => l.z >= 0.9 && l.z < 1.12), near = lights.filter((l) => l.z >= 1.12);
  if (mid.length) out.push(lightOverlay(0.89, mid, { waterZ: 0.9 }));
  if (main.length) out.push(lightOverlay(1.03, main));
  if (near.length) out.push(lightOverlay(1.2, near));
  if (flashes && flashes.length) out.push(skyFlash(flashes));
  return out;
}

// A defence that comes up out of a roof hatch or the quay deck rather than appearing: drawn clipped at its own base
// and pushed up through it as up runs 0 to 1. The item keeps its id and state, so it is still that asset.
export function rising(it, up) {
  if (up >= 1) return it;
  if (up <= 0.02) return null;
  const [w, h] = sizeOf(it.id);
  return {
    ...it, w, h,
    fn(g, o) { g.beginPath(); g.rect(-w, -h * 1.6, w * 2, h * 1.6); g.clip(); g.translate(0, h * 1.05 * (1 - up)); drawAsset(g, it.id, o); },
  };
}

// ---- the hit: a blast on a building and what follows it ----
// A hit at (x, y, z) at time th: flash, explosion, and the light it throws. size scales it. Pushes into out/lights.
// The explosion's ground burst sits on the anchor (its fireball 34 x size above it); air bursts 170 x size above.
export function blast(out, lights, flashes, { x, y, z, th, t, size = 0.5, state = 'ground', seed = 0, flash = true, sky = 0, light = 1, colour = null }) {
  const u = t - th;
  if (u < 0 || u > 3.4) return;
  const air = state === 'air', cy = y - (air ? 170 : 34) * size;
  if (u < 3.2) out.push({ id: 'fx.explosion', x, y, z: z + 0.002, s: 1, state, p: u / 3.2, seed, kind: 'fx', extra: { size } });
  if (flash && u < 0.6) out.push({ id: 'fx.flash', x, y: cy + 120 * size * 0.9, z: z + 0.003, s: 1, state: 'flash', p: u / 0.6, seed, kind: 'fx', extra: { size: size * 0.9 } });
  const k = Math.exp(-u * 2) * (u < 0.05 ? u / 0.05 : 1);
  if (lights && light > 0) lights.push({ x, y: cy, z, r: 300 * size + 60, c: colour || [255, 150, 70], a: 1.2 * k * light });
  if (flashes && sky > 0 && u < 0.9) flashes.push({ x, y: cy, z, a: sky * Math.exp(-u * 4) });
}

// A fire with its smoke from th: flames on a w wide base at (x, y) for burn seconds, then a plume rising off it for
// smoke seconds (thinning to grey after the fire is out). big scales both.
export function burning(out, lights, { x, y = 0, z, w = 60, th, t, burn = 30, smoke = 45, wind = 0.5, seed = 0, big = 1, plume = true }) {
  const u = t - th;
  if (u < 0) return;
  const grow = smooth(0, 1.5, u), die = 1 - smooth(burn * 0.8, burn, u);   // it catches, burns, and dies down to nothing
  if (u < burn) {
    const low = u > burn * 0.65;
    out.push({ id: 'fx.fire', x, y, z: z + 0.001, s: big * (0.15 + 0.85 * grow) * die, state: low ? 'low' : 'burn', seed, kind: 'fx', extra: { w: Math.max(16, w), wind: wind * 0.6 } });
    const fl = 0.8 + 0.2 * Math.sin(t * 13 + seed) * Math.sin(t * 7.3 + seed * 2);
    if (lights) lights.push({ x, y: y - 25 * big, z, r: (60 + w * 1.6) * big, c: [255, 120, 50], a: (low ? 0.3 : 0.6) * fl * grow * die });
  }
  if (plume && u > 0.8 && u < smoke) {
    const g = smooth(0.8, 8, u), fade = 1 - smooth(smoke - 10, smoke, u);
    // from a wisp to its full column and back to nothing: no frame where a column appears or vanishes whole
    const s = (0.04 + 0.41 * g) * fade * big * Math.min(1.6, 0.55 + w / 110);
    out.push({ id: 'fx.smoke', x: x + wind * 10 * g, y, z: z - 0.003, s, state: u > burn ? 'grey' : 'plume', seed, kind: 'fx', extra: { wind, fire: u < burn ? 1 : 0.15 } });
  }
}

// A building coming down from at: dust dumped along its base and rolling out, debris thrown, then (while it lies in
// ruin) a small fire in the rubble. b: { x, z, W, H } from buildings().
export function collapse(out, lights, { b, at, t, fall = 3.5, seed = 0, burn = 20, wind = 0.5, plume = true }) {
  const u = t - at;
  if (u < 0) return;
  if (u < 6) out.push({ id: 'fx.dust', x: b.x, y: 0, z: b.z + 0.003, s: Math.min(0.85, 0.35 + b.H / 320), state: 'billow', p: u / 6, seed, kind: 'fx', extra: { w: b.W * 1.5 } });
  if (u < 2.6) out.push({ id: 'fx.debris', x: b.x, y: -b.H * 0.4, z: b.z + 0.004, s: 0.6, state: 'burst', p: u / 2.6, seed, kind: 'fx', extra: { size: Math.min(1.3, 0.5 + b.W / 80) } });
  burning(out, lights, { x: b.x, y: -Math.min(16, b.H * 0.2), z: b.z, w: b.W * 0.9, th: at + fall * 0.7, t, burn, smoke: burn + 18, wind, seed, big: 0.8, plume });
}

// A crane put up beside a ruin while it is rebuilt and taken down after: it rises out of the ground and sinks back.
export function crane(out, { x, z, from, to, t, h = 80, seed = 0, flip = false }) {
  if (t < from || t >= to) return;
  const up = smooth(from, from + 3, t) * (1 - smooth(to - 3, to, t));
  const it = rising({ id: 'city.crane', x, y: 0, z, s: h / sizeOf('city.crane')[1], state: 'build', seed, flip, kind: 'crane' }, up);
  if (it) out.push(it);
}
