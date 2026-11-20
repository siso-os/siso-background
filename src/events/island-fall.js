// island-fall: two SISO jets cross high and put missiles into an enemy island's engines. The drums burst and burn;
// the island lurches, tips and sags, then drops, breaking up, into the bay behind the city. The crash throws up fire,
// a column of water and a wall of dust; the shock flattens the blocks in front of it, which lie smoking in ruin and are
// rebuilt under cranes. Long after, with the camera gone, a new island is lowered back into its place.

import { clamp, smooth, lerp, hr, bez2, missile, blast, burning, collapse, crane, flush, enemyIslands, cityNear, buildings, bobAt, frac, HALF } from './_war.js';

const TI = 12;           // when it hits (s after t0)
const SPAN = 92;
const BACK = 14;         // the last seconds of the span: the new island coming down into place

// The island to drop: hanging over the bay in view now, and over the city (as the camera sees it) when it lands.
function pick(seed, at) {
  const camI = at.autoX(at.t0 + TI), cam0 = at.autoX(at.t0);
  for (const isl of enemyIslands(seed, cam0 - 1500, cam0 + 1800).filter((i) => i.id === 'islands.enemy')) {
    const f0 = frac(isl.x, isl.z, cam0), fI = frac(isl.x, isl.z, camI);
    if (f0 < 0.25 || f0 > 0.9 || fI < 0.2 || fI > 0.75) continue;
    const zc = 0.955, xc = camI + ((isl.x - camI) * isl.z) / zc;   // where it lands, at the city's depth
    const city = cityNear(seed, xc, 200, 260);
    if (city) return { isl, xc, zc };
  }
  return null;
}

// The story picks its island and how hard it is thrown (opts: { island: world x near the island, lean, push }): the
// island is shoved sideways as it drops (push times the usual drift), so it can come down on a city it hangs beside.
const DRIFT = (push) => 14 + 9 * push * (TI - 7) ** 1.6;
function forced(seed, at) {
  const o = at.opts, push = o.push ?? 1, lean = o.lean ?? -1;
  const isl = enemyIslands(seed, o.island - 900, o.island + 900).filter((i) => i.id === 'islands.enemy').sort((a, b) => Math.abs(a.x - o.island) - Math.abs(b.x - o.island))[0];
  if (!isl) return null;
  const camI = at.autoX(at.t0 + TI), zc = 0.955, ix = isl.x + lean * DRIFT(push);
  return { isl, xc: camI + ((ix - camI) * isl.z) / zc, zc, push, lean };
}

export default {
  id: 'island-fall',
  title: 'Island fall',
  about: 'Jets knock out an enemy island\'s engines; it tips and drops into the bay behind the city; the crash flattens blocks, which are rebuilt.',
  dur: 28,
  span: SPAN,
  weight: 5,
  war: true,
  pull: 0.9,             // an island over a city in the right place is rare: take it when it comes
  where: (place, at) => !!pick(at.seed, at),
  plan(r, at) {
    const p = at.opts && at.opts.island != null ? forced(at.seed, at) : pick(at.seed, at);
    if (!p) return null;
    const { isl, xc, zc } = p, s = isl.s || 1, push = p.push ?? 1;
    const lean = p.lean ?? (r() < 0.5 ? -1 : 1);
    // the blocks the shock flattens: in front of where it lands, spreading out from the middle
    const half = 210 * s * isl.z / zc + 40;
    const bs = buildings(at.seed, xc - half, xc + half).map((b) => ({ ...b, at: TI + 0.5 + Math.abs(b.x - xc) / 350 + r.range(0, 0.3) }));
    // the jets and their missiles into the engine drums (enemy frame: the underside, about -78 in the middle)
    const eng = [[0, -80], [-80, -96], [80, -96], [-150, -125]].map(([x, y]) => [x * s, y * s]);
    const jets = [0, 1].map((k) => ({ y: isl.y - r.range(260, 380) - k * 60, z: 0.9 + k * 0.03, x0: isl.x - 1450 - k * 140, v: r.range(330, 380), fire: 0.9 + k * 0.5, seed: k }));
    const ms = eng.map((e, k) => {
      const j = jets[k % 2], tl = j.fire + (k >> 1) * 0.25, fl = r.range(1.6, 2.1);
      return { tl, fl, from: [j.x0 + j.v * tl + 20, j.y + 6, j.z], e, seed: r.int(0, 3) };
    });
    return { ix: isl.x, iy: isl.y, iz: isl.z, s, iseed: isl.seed, lean, push, xc, zc, half, bs, ms, jets, wind: r.range(0.4, 0.8) };
  },
  marks(ev) {
    return ev.bs.map((b) => ({ x0: b.x - 2, x1: b.x + 2, z0: b.z - 0.002, z1: b.z + 0.002, at: ev.t0 + b.at, fall: 2.6, ruin: ev.ruin ?? 40, build: 16 }));
  },
  // how the island moves: { dx, dy, rot } at u, while it falls
  pose(ev, u) {
    // a sag of 36 as the engines go, then a drop from rest that puts its belly in the water at TI (the anchor is the
    // underside's lowest point plus 78 s, so the anchor ends about 30 under the water line)
    const sag = smooth(3.6, 7, u) * 36, fall = u > 7 ? ((-ev.iy + 30 - 36) / ((TI - 7) ** 2)) * (u - 7) ** 2 : 0;
    return { dx: ev.lean * (14 * smooth(3.6, 7, u) + 9 * (ev.push ?? 1) * Math.max(0, u - 7) ** 1.6), dy: sag + fall, rot: ev.lean * (0.05 * smooth(2.6, 4.5, u) + 0.3 * smooth(6, TI, u)) };
  },
  states(ev) {
    const t0 = ev.t0, x0 = ev.ix - 1, x1 = ev.ix + 1, id = 'islands.enemy', out = [];
    // fall p runs from the engines going out to the crash; the island goes with it, then is gone
    const k = 30, dt = (TI + 0.3 - 3.6) / k;
    for (let i = 0; i < k; i++) {
      const u = 3.6 + i * dt, ps = this.pose(ev, u + dt / 2);
      out.push({ id, x0, x1, from: t0 + u, to: t0 + u + dt, state: 'fall', p: (u + dt / 2 - 3.6) / (TI + 0.3 - 3.6), ...ps });
    }
    out.push({ id, x0, x1, from: t0 + 2.2, to: t0 + 3.6, state: 'hit' });
    const span = ev.span ?? SPAN;               // the story brings the new island back sooner
    out.push({ id, x0, x1, from: t0 + TI + 0.3, to: t0 + span - BACK, hide: true });
    // the new one coming down into place on its engines
    for (let i = 0; i < 10; i++) {
      const f = i / 10, g = (i + 1) / 10;
      out.push({ id, x0, x1, from: t0 + span - BACK * (1 - f), to: t0 + span - BACK * (1 - g), state: 'boost', dy: -1150 * (1 - smooth(0, 1, (f + g) / 2)) });
    }
    return out;
  },
  items(ev, t, L, view) {
    const u = t - ev.t0, out = [], lights = [], flashes = [];
    const s = ev.s, ps = u < TI + 0.3 ? (u >= 3.6 ? this.pose(ev, u) : { dx: 0, dy: 0, rot: 0 }) : null;
    const bob = bobAt({ x: ev.ix, seed: ev.iseed, bob: 1 }, t);
    // a point on the island (enemy frame) where it is now
    const on = ([x, y]) => {
      const c = Math.cos(ps.rot), sn = Math.sin(ps.rot);
      return [ev.ix + ps.dx + x * c - y * sn, ev.iy + bob + ps.dy + x * sn + y * c];
    };
    // the jets
    for (const j of ev.jets) {
      const x = j.x0 + j.v * u;
      if (u < 9) out.push({ id: 'air.jet-siso', x, y: j.y + Math.sin(u * 0.8 + j.seed) * 6, z: j.z, s: 1.3, state: u >= j.fire && u < j.fire + 1.4 ? 'fire' : 'idle', p: clamp((u - j.fire) / 1.4), seed: j.seed, kind: 'air', extra: {} });
      if (u < 9) lights.push({ x: x - 26, y: j.y, z: j.z, r: 40, c: [150, 190, 255], a: 0.4, water: false });
    }
    // the missiles into the engines, and the drums bursting and burning
    for (const m of ev.ms) {
      const th = m.tl + m.fl;
      if (u >= m.tl && u < th + 1.4) {
        const end = [ev.ix + m.e[0], ev.iy + bobAt({ x: ev.ix, seed: ev.iseed, bob: 1 }, ev.t0 + th) + m.e[1], ev.iz + 0.002];
        const mid = [(m.from[0] + end[0]) / 2, Math.max(m.from[1], end[1]) + 40, (m.from[2] + end[2]) / 2];
        missile(out, { path: (f) => bez2(m.from, mid, end, f), t0: ev.t0 + m.tl, t1: ev.t0 + th, linger: 1.4, t, state: 'siso', s: 0.8, view, back: 1, len: 320, wind: 5, seed: m.seed, lights });
      }
      if (u >= th && ps) {
        const [x, y] = on(m.e);
        blast(out, lights, flashes, { x, y: y + 20, z: ev.iz + 0.003, th: ev.t0 + th, t, size: 0.45, seed: m.seed, sky: 0.1 });
        if (u > th + 0.4) {
          const sink = 1 - smooth(TI - 0.2, TI + 0.3, u);   // swallowed by the crash as the island goes in
          out.push({ id: 'fx.fire', x, y, z: ev.iz + 0.004, s: 0.9 * smooth(th + 0.4, th + 1.6, u) * sink, state: 'burn', seed: m.seed, kind: 'fx', extra: { w: 46, wind: 0.5 } });
          const fl = 0.8 + 0.2 * Math.sin(t * 11 + m.seed * 3);
          lights.push({ x, y: y - 20, z: ev.iz, r: 150, c: [255, 120, 50], a: 0.6 * fl * sink });
        }
      }
    }
    // a trail of smoke off it as it goes down; after the crash the column stays where it was and thins away
    if (u > 3 && u < TI + 8) {
      const pp = ps || this.pose(ev, TI + 0.3), b0 = ps ? bob : bobAt({ x: ev.ix, seed: ev.iseed, bob: 1 }, ev.t0 + TI + 0.3);
      const c = Math.cos(pp.rot), sn = Math.sin(pp.rot), ly = -110 * s;
      const x = ev.ix + pp.dx - ly * sn, y = ev.iy + b0 + pp.dy + ly * c;
      out.push({ id: 'fx.smoke', x, y, z: ev.iz - 0.004, s: (0.05 + 0.85 * smooth(3, 9, u)) * (1 - smooth(TI + 0.3, TI + 8, u)), state: 'plume', seed: 7, kind: 'fx', extra: { wind: -ev.lean * 0.9 - 0.3, fire: 1 } });
    }
    // the crash: at its own depth, in the bay behind the city
    const du = u - TI;
    if (du >= 0) {
      const ix = ev.ix + ev.lean * DRIFT(ev.push ?? 1), iz = ev.iz + 0.004;
      blast(out, lights, flashes, { x: ix, y: -6, z: iz, th: ev.t0 + TI, t, size: 1.9, seed: 1, sky: 0.8, light: 1.6 });
      for (let k = 0; k < 4; k++) blast(out, lights, null, { x: ix + (k - 1.5) * 120 * s, y: -4, z: iz + 0.001, th: ev.t0 + TI + 0.15 + k * 0.12, t, size: 0.9, seed: k, flash: false, light: 0.5 });
      if (du < 2.8) out.push({ id: 'fx.splash', x: ix + 60 * ev.lean, y: 0, z: iz - 0.001, s: 3.2, state: 'big', p: du / 2.8, seed: 2, kind: 'fx' });
      if (du < 2.6) for (let k = 0; k < 3; k++) out.push({ id: 'fx.debris', x: ix + (k - 1) * 140, y: -20, z: iz + 0.002, s: 1.3, state: 'burst', p: du / 2.6, seed: k, kind: 'fx', extra: { size: 1.3 } });
      if (du < 6) out.push({ id: 'fx.dust', x: ix, y: 0, z: iz + 0.003, s: 1.6, state: 'billow', p: du / 6, seed: 3, kind: 'fx', extra: { w: 560 * s } });
      // the wreck burns on the water and smokes
      burning(out, lights, { x: ix, y: -4, z: iz, w: 260 * s, th: ev.t0 + TI + 0.6, t, burn: 44, smoke: 62, wind: ev.wind, seed: 5, big: 1.5 });
      burning(out, lights, { x: ix - 110 * ev.lean, y: -2, z: iz + 0.001, w: 120 * s, th: ev.t0 + TI + 1.4, t, burn: 34, smoke: 50, wind: ev.wind, seed: 6, big: 1.1 });
      // a water-borne glow under the whole crash
      if (du < 30) lights.push({ x: ix, y: -60, z: ev.iz, r: 520, c: [255, 120, 50], a: 0.8 * (1 - smooth(10, 30, du)) + 0.6 * Math.exp(-du * 1.5) });
    }
    // the blocks in front: down in dust, burning, then rebuilt under cranes
    ev.bs.forEach((b, k) => {
      collapse(out, lights, { b, at: ev.t0 + b.at, t, fall: 2.6, seed: k, burn: 26, wind: ev.wind, plume: k % 3 === 0 });
      if (k % 2 === 0 && b.H > 30) crane(out, { x: b.x + (k % 4 ? 1 : -1) * (b.W * 0.5 + 9), z: b.z + 0.003, from: ev.t0 + b.at + 2.6 + (ev.ruin ?? 40) - 4, to: ev.t0 + b.at + 2.6 + (ev.ruin ?? 40) + 16 + 3, t, h: Math.max(60, b.H), seed: k, flip: k % 4 === 0 });
    });
    return flush(out, lights, flashes);
  },
};
