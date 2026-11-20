// portal: a ring of green and violet fire spins open over the bay and things come out of it. Flyers and drifters spill
// into the sky, metal craft fan out and fire, walkers drop to the quay and start across it. Then everyone shoots: jets
// cross and loose missiles, the quay's launcher, gun and artillery come up and fire, a warship passing in the bay
// launches. One by one they pop and fall into the sea. The ring tightens, flares and implodes.

import { clamp, smooth, lerp, hr, bez2, bez3, missile, rising, flush, cityNear, atFrac, frac, toDepth } from './_war.js';

const PZ = 1.07, PS = 0.95;              // the portal's depth and scale (its ring is 190 x PS across, its centre 250 x PS up)
const OPEN = 2.5, CLOSE = 27, SHUT = CLOSE + 1.8;
const DIE = { 'aliens.flyer': 2.2, 'aliens.craft': 3, 'aliens.walker': 2.6, 'aliens.drifter': 3 };
const SIZE = { 'aliens.flyer': 1.25, 'aliens.craft': 0.6, 'aliens.walker': 0.75, 'aliens.drifter': 0.62 };

// Where alien a is at u (s after t0), its facing and its state, or null if it is not out (yet, or any more).
function where(ev, a, u) {
  const C = [ev.px, -250 * PS, PZ];
  const tau = u - a.te;
  if (tau < 0) return null;
  const die = u >= a.td ? u - a.td : -1;
  const at = (uu) => {
    const tt = uu - a.te;
    if (a.id === 'aliens.walker') {
      // out of the ring, a drop to the quay, then across it
      const exit = [C[0] + a.dx * 0.15, C[1] + 40, PZ], land = [a.wx, -3, 1.037];
      if (tt < 0.8) { const f = smooth(0, 0.8, tt); return { x: lerp(C[0], exit[0], f), y: lerp(C[1], exit[1], f), z: PZ, s: 0.25 + 0.75 * f, st: 'idle' }; }
      if (tt < 2.1) { const f = (tt - 0.8) / 1.3; return { x: lerp(exit[0], land[0], f), y: lerp(exit[1], land[1], f * f), z: lerp(PZ, land[2], f), s: 1, st: 'idle' }; }
      return { x: land[0] + a.dir * 14 * (tt - 2.1), y: land[1], z: land[2], s: 1, st: tt < 2.8 ? 'idle' : 'walk' };
    }
    const exit = [C[0] + a.ex, C[1] + a.ey, PZ];
    if (tt < 1) { const f = smooth(0, 1, tt); return { x: lerp(C[0], exit[0], f), y: lerp(C[1], exit[1], f), z: PZ, s: 0.2 + 0.8 * f, st: 'fly' }; }
    if (tt < 4) {
      const f = 1 - (1 - (tt - 1) / 3) ** 2;
      const p = bez2(exit, [exit[0] + a.ex * 2.5, exit[1] + a.ey * 2.5 - 60, PZ], [a.wx, a.wy, a.wz], f);
      return { x: p[0], y: p[1], z: p[2], s: 1, st: 'fly' };
    }
    const h = tt - 4;
    return { x: a.wx + a.vx * h + Math.sin(h * 0.7 + a.ph) * 40, y: a.wy + Math.sin(h * 1.1 + a.ph * 2) * 18, z: a.wz, s: 1, st: a.id === 'aliens.craft' && Math.floor(h / 1.6 + a.ph) % 3 === 0 ? 'fire' : 'idle' };
  };
  if (die < 0) { const p = at(u), q = at(u + 0.1); return { ...p, flip: a.id === 'aliens.walker' ? a.dir < 0 : (q.x - p.x < -0.5 || (Math.abs(q.x - p.x) <= 0.5 && a.wx < ev.px)), state: p.st }; }
  // dead: it plays its death while it falls (a walker slumps where it stands), and is gone when it meets the sea
  const p = at(a.td), q = at(a.td + 0.1), walker = a.id === 'aliens.walker';
  const end = walker ? DIE[a.id] + 0.3 : Math.max(DIE[a.id], splashAfter(p.y));
  if (die > end) return null;
  const vx = (q.x - p.x) * 5, fall = walker ? 0 : 0.5 * G * die * die;
  return { x: p.x + vx * die, y: walker ? p.y : Math.min(0, p.y + fall), z: p.z, s: 1, state: 'die', p: Math.min(1, die / DIE[a.id]), flip: walker ? a.dir < 0 : vx < 0 };
}
const G = 160;                                          // how fast the dead fall, units/s/s
const splashAfter = (y) => Math.sqrt((2 * Math.max(0, -y)) / G);

export default {
  id: 'portal',
  title: 'Portal',
  about: 'A ring opens over the bay; flyers, craft, drifters and walkers come out; jets, the quay guns and a warship shoot them down; the ring implodes.',
  dur: 31,
  weight: 1,
  war: true,             // it fits anywhere, so it is the war the others leave over
  where: null,                            // every place has a bay to open over
  plan(r, { t0, seed, autoX }) {
    const px = autoX(t0) + 470;
    const city = cityNear(seed, px, 500, 200);
    const kinds = ['aliens.craft', 'aliens.flyer', 'aliens.flyer', 'aliens.drifter', 'aliens.craft', 'aliens.flyer', city ? 'aliens.walker' : 'aliens.flyer', 'aliens.flyer', 'aliens.drifter', 'aliens.craft', city ? 'aliens.walker' : 'aliens.flyer', 'aliens.flyer'];
    // the killers, in turn: jets cross, the quay's launcher, gun and artillery fire, the warship launches
    const order = city ? ['jet', 'sam', 'ciws', 'ship', 'art', 'jet', 'sam', 'ciws', 'jet', 'ship', 'art', 'ciws'] : ['jet', 'ship', 'jet', 'ship', 'jet', 'ship', 'jet', 'ship', 'jet', 'ship', 'jet', 'ship'];
    const aliens = kinds.map((id, i) => {
      const te = OPEN + 0.3 + i * 0.85 + r.range(-0.15, 0.15);
      const side = i % 2 ? 1 : -1, ang = side * r.range(0.35, 1.25);
      const ex = Math.sin(ang) * 120, ey = -Math.cos(ang) * 70;
      const wz = r.range(1.0, 1.1), cam = autoX(t0 + te + 4);
      const wx = atFrac(clamp(frac(px, PZ, cam) + side * r.range(0.12, 0.4), 0.08, 0.92), wz, cam);
      const wy = -r.range(320, 640);
      return { i, id, te, ex, ey, wx, wy, wz, vx: r.range(-12, 12) + 20, ph: r.range(0, 6), dx: side * 140, dir: side, seed: r.int(0, 5) };
    });
    // they die in turn from te + 6, the last before the ring closes
    const deaths = aliens.map((a) => a.te + r.range(6, 9)).sort((p, q) => p - q);
    aliens.forEach((a, i) => { a.td = Math.min(CLOSE - 1, deaths[i] + 0.4 * i); a.by = order[i]; });
    for (const a of aliens) if (a.id === 'aliens.walker') { a.wx = px + a.dir * r.range(120, 220); a.by = 'art'; }
    // the quay defences under the portal, and the warship passing right to left in the bay
    const quay = city ? { sam: { x: px - 260, y: -3, z: 1.036 }, ciws: { x: px + 180, y: -3, z: 1.036 }, art: { x: px - 120, y: -3, z: 1.036 } } : null;
    const ship = { x0: autoX(t0) + 1050, v: -22, z: 1.13, s: 0.75 };
    const jets = aliens.filter((a) => a.by === 'jet').map((a) => ({ a: a.i, tf: a.td - 1.5, y: a.wy + r.range(-60, 120), z: clamp(a.wz - 0.04, 0.95, 1.1), v: r.range(320, 360) }));
    // the swarm: small flyers streaming out of the tunnel and away to both sides, speeding up until they are gone
    const NS = 40, swarm = [];
    for (let i = 0; i < NS; i++) {
      swarm.push({ te: OPEN + 1 + (i / NS) * (CLOSE - 7 - OPEN) + r.range(-0.2, 0.2), side: i % 2 ? 1 : -1, v: r.range(90, 150), a: r.range(15, 40), dy: r.range(-0.22, 0.08), s: r.range(0.4, 0.7), ph: r.range(0, 6), seed: r.int(0, 5) });
    }
    return { px, aliens, quay, ship, jets, swarm };
  },
  items(ev, t, L, view) {
    const u = t - ev.t0, out = [], lights = [];
    // the ring
    if (u < SHUT) {
      const st = u < OPEN ? 'open' : u < CLOSE ? 'hold' : 'close', p = u < OPEN ? u / OPEN : u < CLOSE ? 0 : (u - CLOSE) / (SHUT - CLOSE);
      out.push({ id: 'aliens.portal', x: ev.px, y: 0, z: PZ, s: PS, state: st, p, seed: 1, kind: 'fx' });
      const k = u < OPEN ? smooth(0, OPEN, u) : u < CLOSE ? 1 : 1 + 1.5 * Math.sin(Math.PI * p);
      // the light comes off the ring, not its middle: the tunnel inside stays darker than the sky
      const rs = 190 * PS * (u < OPEN ? smooth(0, OPEN, u) : u < CLOSE ? 1 : 1 - 0.8 * p);
      for (let j = 0; j < 8; j++) {
        const an = (j / 8) * Math.PI * 2 + t * 0.3, gr = j % 2 === 0;
        lights.push({ x: ev.px + Math.cos(an) * rs, y: -250 * PS + Math.sin(an) * rs, z: PZ, r: 260, c: gr ? [90, 255, 170] : [190, 110, 255], a: (gr ? 0.24 : 0.17) * k * (0.85 + 0.15 * Math.sin(t * 9 + j)) });
      }
    }
    // the aliens
    const pos = {};
    for (const a of ev.aliens) {
      const w = where(ev, a, u);
      if (!w) continue;
      pos[a.i] = w;
      out.push({ id: a.id, x: w.x, y: w.y, z: w.z, s: SIZE[a.id] * w.s, state: w.state, p: w.p || 0, flip: w.flip, seed: a.seed, kind: 'alien', reflect: false });
      if (w.state !== 'die') lights.push({ x: w.x, y: w.y - 20, z: w.z, r: 70, c: a.id === 'aliens.craft' ? [120, 255, 150] : [110, 230, 255], a: 0.35, water: false });
    }
    // the swarm
    for (const m of ev.swarm || []) {
      const tau = u - m.te;
      if (tau < 0 || tau > 12) continue;
      const d = m.v * tau + 0.5 * m.a * tau * tau, g = smooth(0, 0.9, tau);
      out.push({ id: 'aliens.flyer', x: ev.px + m.side * d, y: -250 * PS + m.dy * d + Math.sin(tau * 3 + m.ph) * 10, z: PZ + 0.002, s: SIZE['aliens.flyer'] * m.s * (0.15 + 0.85 * g), state: 'fly', flip: m.side < 0, seed: m.seed, kind: 'alien', reflect: false });
    }
    // the kills: a shot that meets each alien at td, then a pop, light, and (if it falls in the sea) a splash
    const aim = (a) => { const w = where(ev, a, a.td - 0.01); return w ? [w.x, w.y - 30, w.z] : null; };
    for (const a of ev.aliens) {
      const q = aim(a);
      if (!q) continue;
      const dk = u - a.td;
      if (a.by === 'jet') {
        const j = ev.jets.find((j) => j.a === a.i);
        const jx = (uu) => q[0] - 420 + j.v * (uu - j.tf);
        if (u > j.tf - 3.5 && u < j.tf + 4) {
          out.push({ id: 'air.jet-siso', x: jx(u), y: j.y + Math.sin(u * 0.9) * 5, z: j.z, s: 1.3, state: u >= j.tf - 0.2 && u < j.tf + 1.2 ? 'fire' : 'idle', p: clamp((u - j.tf + 0.2) / 1.4), seed: a.i, kind: 'air' });
          lights.push({ x: jx(u) - 26, y: j.y, z: j.z, r: 40, c: [150, 190, 255], a: 0.4, water: false });
        }
        const from = [jx(j.tf) + 20, j.y + 6, j.z];
        if (u >= j.tf && u < a.td + 1.2) missile(out, { path: (f) => bez2(from, [lerp(from[0], q[0], 0.5), from[1] + 30, (from[2] + q[2]) / 2], q, f), t0: ev.t0 + j.tf, t1: ev.t0 + a.td, linger: 1.2, t, state: 'siso', s: 0.8, view, back: 0.9, len: 260, lights });
      } else if (a.by === 'sam' && ev.quay) {
        const s = ev.quay.sam, from = [s.x, s.y - 18, s.z], tl = a.td - 1.6;
        if (u >= tl && u < a.td + 1.2) missile(out, { path: (f) => bez2(from, [from[0], lerp(from[1], q[1], 0.7), from[2]], q, f), ease: (f) => f * f * 0.4 + f * 0.6, t0: ev.t0 + tl, t1: ev.t0 + a.td, linger: 1.2, t, state: 'siso', s: 0.7, view, back: 1, len: 280, lights });
      } else if (a.by === 'ship') {
        const sx = (uu) => ev.ship.x0 + ev.ship.v * uu, tl = a.td - 1.3;
        const from = [sx(tl) + 20, -150, ev.ship.z];
        if (u >= tl && u < a.td + 1.2) missile(out, { path: (f) => bez2(from, [from[0], q[1] - 120, lerp(from[2], q[2], 0.5)], q, f), t0: ev.t0 + tl, t1: ev.t0 + a.td, linger: 1.2, t, state: 'siso', s: 0.8, view, back: 1, len: 300, lights });
      }
      if (dk >= 0 && dk < 2.8 && a.id !== 'aliens.walker') {
        out.push({ id: 'fx.intercept', x: q[0], y: q[1] + 30 + 170 * 0.5, z: q[2] + 0.002, s: 0.5, state: 'blue', p: dk / 2.8, seed: a.seed, kind: 'fx' });
        lights.push({ x: q[0], y: q[1], z: q[2], r: 220, c: [150, 255, 200], a: 1.0 * Math.exp(-dk * 3) });
      }
      if (dk >= 0 && dk < 1.5 && a.id === 'aliens.walker') {
        out.push({ id: 'fx.explosion', x: q[0], y: q[1] + 30, z: q[2] + 0.002, s: 1, state: 'ground', p: dk / 3.2, seed: a.seed, kind: 'fx', extra: { size: 0.4 } });
        lights.push({ x: q[0], y: q[1], z: q[2], r: 200, c: [255, 160, 80], a: 1.0 * Math.exp(-dk * 2.5) });
      }
      if (a.id !== 'aliens.walker') {
        const tf = a.td + splashAfter(q[1] + 30);
        if (u >= tf && u < tf + 1.8) { const pf = where(ev, a, tf - 0.002); if (pf) out.push({ id: 'fx.splash', x: pf.x, y: 0, z: pf.z + 0.001, s: 0.6, state: 'shell', p: (u - tf) / 1.8, seed: a.seed, kind: 'fx' }); }
      }
    }
    // the warship: in from the right, firing (the asset's gun flashes and its missile off the deck) ahead of each kill
    const sx = ev.ship.x0 + ev.ship.v * u;
    const shipFire = ev.aliens.filter((a) => a.by === 'ship').map((a) => a.td - 1.3 - 2.0).find((f) => u >= f && u < f + 2.4);
    out.push({ id: 'sea.warship', x: sx, y: 0, z: ev.ship.z, s: ev.ship.s, state: shipFire !== undefined ? 'fire' : 'idle', p: shipFire !== undefined ? (u - shipFire) / 2.4 : 0, flip: true, seed: 3, kind: 'boat', reflect: true, speed: 22, wake: true });
    // the quay defences: up out of the deck as the ring opens, back down after it shuts
    if (ev.quay) {
      const up = smooth(1, 3, u) * (1 - smooth(ev.dur - 2, ev.dur, u));
      const firing = (by, lead, len) => ev.aliens.filter((a) => a.by === by).map((a) => a.td - lead).find((f) => u >= f && u < f + len);
      const fs = firing('sam', 1.7, 1.6);
      const s1 = rising({ id: 'defence.sam-launcher', x: ev.quay.sam.x, y: ev.quay.sam.y, z: ev.quay.sam.z, s: 1.2, state: fs !== undefined ? 'fire' : 'idle', p: fs !== undefined ? (u - fs) / 1.6 : 0, seed: 1, kind: 'defence', extra: { kind: 'siso' } }, up);
      if (s1) out.push(s1);
      // the gun: a tracer stream onto its alien for 1.5 s before the kill
      const c = ev.quay.ciws, on = ev.aliens.find((a) => a.by === 'ciws' && u >= a.td - 1.5 && u < a.td + 0.3);
      let gaim = 0.6, gflip = false;
      if (on && view) {
        const w = u < on.td ? pos[on.i] : null, q = w ? [w.x, w.y - 20, w.z] : aim(on);
        if (q) {
          const [qx, qy] = toDepth(view, q[0], q[1], q[2], c.z), gy = c.y - 14;
          gflip = qx < c.x; gaim = clamp(Math.atan2(gy - qy, Math.abs(qx - c.x)), 0.15, 1.4);
          // reaching out at the rounds' speed; after the kill the last rounds fly on and the stream leaves the muzzle
          const g = clamp(((u - on.td + 1.5) * 1100) / Math.max(1, Math.hypot(qx - c.x, qy - gy))), a = clamp((u - on.td) / 0.3);
          if (g - a > 0.01) out.push({ id: 'fx.tracer', x: c.x, y: gy, z: c.z + 0.001, s: 1, state: 'siso', seed: 2, kind: 'fx', extra: { points: [[(qx - c.x) * a, (qy - gy) * a], [(qx - c.x) * g, (qy - gy) * g]] } });
          lights.push({ x: c.x, y: gy, z: c.z, r: 60, c: [170, 200, 255], a: 0.5 });
        }
      }
      const c1 = rising({ id: 'defence.ciws', x: c.x, y: c.y, z: c.z, s: 1.3, state: on ? 'fire' : 'idle', flip: gflip, seed: 2, kind: 'defence', extra: { aim: gaim } }, up);
      if (c1) out.push(c1);
      // the artillery: a shot (its own flash) and a fast round onto its target
      const art = ev.quay.art, fa = ev.aliens.find((a) => a.by === 'art' && u >= a.td - 0.5 && u < a.td + 1);
      let aflip = false;
      if (fa) {
        const q = aim(fa);
        if (q) {
          aflip = q[0] < art.x;
          if (u < fa.td && view) {
            const [qx, qy] = toDepth(view, q[0], q[1], q[2], art.z), gy = art.y - 10;
            const g = clamp((u - fa.td + 0.5) / 0.5);   // the round's streak reaching its target as it hits
            out.push({ id: 'fx.tracer', x: art.x, y: gy, z: art.z + 0.001, s: 1, state: 'fire', seed: 4, kind: 'fx', extra: { points: [[0, 0], [(qx - art.x) * g, (qy - gy) * g]] } });
          }
        }
      }
      const a1 = rising({ id: 'defence.artillery', x: art.x, y: art.y, z: art.z, s: 1.4, state: fa ? 'fire' : 'idle', p: fa ? (u - fa.td + 0.5) / 1.5 : 0, flip: aflip, seed: 3, kind: 'defence' }, up);
      if (a1) out.push(a1);
    }
    return flush(out, lights, null);
  },
};
