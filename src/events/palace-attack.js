// palace-attack: up in space, a wing of enemy attack ships makes strafing runs on the floating palace. They come in
// from both sides, cannons pumping; the palace's shield flares where the bolts land and its guns answer; now and then a
// round gets through and blasts flash on the hull. No smoke: this is vacuum. It runs on the space track, so it is only
// there for whoever climbs (Shift+W) near a palace, about one visit in three.

import { clamp, smooth, hr, flush, palaces, frac } from './_war.js';

const N = 5;
const SHIELD = { cy: -232, rx: 340, ry: 250 };   // the palace's shield bubble in its own frame (from the asset)
const HITS = [7.5, 14, 20.5];                     // when a round gets through (palace 'hit', 2.6 s each)

function find(seed, at) {
  for (const p of palaces(seed, at.x0 - 2600, at.x0 + 2600)) {
    const f = frac(p.x, p.z, at.autoX(at.t0 + 3)), g = frac(p.x, p.z, at.autoX(at.t0 + 22));
    if (f > 0.3 && f < 0.95 && g > 0.05 && g < 0.85) return p;
  }
  return null;
}

// Ship k at u: sweeping passes across the palace that turn out of sight at both ends.
function ship(ev, k, u) {
  const S = ev.ships[k];
  const a = S.w * u + S.ph, x = ev.px + S.A * Math.sin(a), vx = Math.cos(a);
  const y = ev.py + SHIELD.cy + S.dy + S.B * Math.sin(2 * a + S.ph2);
  const dist = Math.abs(x - ev.px), toward = Math.sign(ev.px - x) === Math.sign(vx);
  return { x, y, z: S.z, flip: vx < 0, fire: toward && dist > 260 && dist < 1150, rot: -0.12 * Math.cos(2 * a + S.ph2) * Math.sign(vx) };
}

export default {
  id: 'palace-attack',
  title: 'Palace attack',
  about: 'Up in space, five attack ships strafe the floating palace; its shield flares and its guns fire back; blasts flash on the hull.',
  track: 'space',
  dur: 26,
  weight: 1,
  where: (place, at) => !!find(at.seed, at),
  plan(r, at) {
    const p = find(at.seed, at);
    if (!p) return null;
    const ships = [];
    for (let k = 0; k < N; k++) {
      // each starts off to one side, out of sight, and comes in
      const side = k % 2 ? 1 : -1;
      ships.push({ A: r.range(1450, 1750), w: r.range(0.3, 0.38), ph: side * Math.PI / 2 + r.range(-0.15, 0.15) + (k > 2 ? Math.PI * 0.35 * side : 0), ph2: r.range(0, 6), dy: r.range(-260, 260), B: r.range(30, 70), z: [0.76, 0.69, 0.8, 0.74, 0.66][k] });
    }
    return { px: p.x, py: p.y, pz: p.z, ships, seed: r.int(0, 99) };
  },
  states(ev) {
    const t0 = ev.t0, x0 = ev.px - 1, x1 = ev.px + 1;
    return [
      ...HITS.map((h) => ({ id: 'space.palace', x0, x1, from: t0 + h, to: t0 + h + 2.6, state: 'hit' })),
      { id: 'space.palace', x0, x1, from: t0 + 1.5, to: t0 + ev.dur - 0.5, state: 'attack' },
    ];
  },
  items(ev, t, L) {
    const u = t - ev.t0, out = [], lights = [];
    const cx = ev.px, cy = ev.py + SHIELD.cy;
    for (let k = 0; k < N; k++) {
      const s = ship(ev, k, u);
      out.push({ id: 'space.attack-ship', x: s.x, y: s.y, z: s.z, s: 0.75, state: s.fire && u > 1 ? 'fire' : 'idle', flip: s.flip, rot: s.rot, seed: k, kind: 'space' });
      lights.push({ x: s.x - (s.flip ? -40 : 40), y: s.y, z: s.z, r: 50, c: [160, 200, 255], a: 0.35, water: false });
      // the bolts landing on the shield: one every 0.45 s while it fires (arriving 0.3 s after they leave)
      for (let n = Math.floor((u - 1.2) / 0.45); n <= Math.floor(u / 0.45); n++) {
        const th = n * 0.45 + k * 0.09, du = u - th;
        if (du < 0 || du >= 1.2 || th < 1.3) continue;
        const sf = ship(ev, k, th - 0.3);
        if (!sf.fire) continue;
        const ang = Math.atan2((sf.y - cy) / SHIELD.ry, (sf.x - cx) / SHIELD.rx) + (hr(n, k) - 0.5) * 0.5;
        const hx = cx + SHIELD.rx * Math.cos(ang), hy = cy + SHIELD.ry * Math.sin(ang), sz = 0.55;
        out.push({ id: 'fx.shield-hit', x: hx, y: hy + 120 * sz, z: ev.pz + (sf.z > ev.pz ? 0.004 : -0.004), s: sz, state: 'hit', p: du / 1.2, seed: n % 7, kind: 'fx', extra: { tilt: 0.6 + 0.3 * Math.abs(Math.sin(ang)) } });
        lights.push({ x: hx, y: hy, z: ev.pz, r: 160, c: [140, 200, 255], a: 0.8 * Math.exp(-du * 4), water: false });
      }
      // the palace's guns getting a ship now and then: a blue flash and a spray of fragments off it
      const tk = 4 + k * 4.3 + (k % 2) * 1.1, dk = u - tk;
      if (dk >= 0 && dk < 2.6) {
        const sk = ship(ev, k, tk);
        if (dk < 0.6) out.push({ id: 'fx.flash', x: sk.x, y: sk.y + 120 * 0.5, z: sk.z + 0.002, s: 1, state: 'blue', p: dk / 0.6, kind: 'fx', extra: { size: 0.5 } });
        const sn = ship(ev, k, u);
        out.push({ id: 'fx.debris', x: sn.x, y: sn.y + 30, z: sn.z + 0.001, s: 0.5, state: 'burst', p: dk / 2.6, seed: k, kind: 'fx', extra: { size: 0.6 } });
        lights.push({ x: sk.x, y: sk.y, z: sk.z, r: 200, c: [150, 200, 255], a: Math.exp(-dk * 3), water: false });
      }
    }
    // the hull blasts light the palace from inside its shield
    for (const h of HITS) { const dh = u - h; if (dh >= 0 && dh < 2.6) lights.push({ x: cx, y: cy + 60, z: ev.pz, r: 520, c: [255, 190, 120], a: 0.5 * Math.exp(-dh * 1.5), water: false }); }
    return flush(out, lights, null);
  },
};
