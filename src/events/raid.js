// raid: an enemy island over the bay opens fire on the city. Its wall guns flash and a salvo of missiles arcs up off it
// and down onto the blocks; launchers and guns come up out of the quay, killing some in the air;
// the rest land. Blocks flare, burn and come down in dust, lie smoking in ruin, and are rebuilt under cranes.

import { clamp, smooth, hr, bez3, bez2, missile, blast, burning, collapse, crane, rising, flush, buildings, cityNear, enemyIslands, bobAt, toDepth, lerp } from './_war.js';

const N = 26;            // missiles in the salvo: two ripples of 13
const HITS = 7;          // of them, how many land on buildings (the rest are shot down or fall in the bay)

// The enemy island the salvo comes from: the nearest one over this stretch of the auto path.
function source(seed, xc) {
  const isl = enemyIslands(seed, xc - 1500, xc + 1900);
  isl.sort((a, b) => Math.abs(a.x - xc - 500) - Math.abs(b.x - xc - 500));
  return isl[0] || null;
}
const target = (seed, xc) => cityNear(seed, xc, 620, 420);

export default {
  id: 'raid',
  title: 'Raid',
  about: 'An enemy island fires a salvo onto the city; launchers and guns on the quay shoot some down, the rest hit; blocks burn, fall and are rebuilt.',
  dur: 26,
  span: 82,
  weight: 3,
  war: true,
  pull: 0.4,             // a city with an enemy island across from it
  // a city in view with an enemy island near enough to fire on it
  where: (place, at) => {
    const xc = at.autoX(at.t0 + 9);
    return !!target(at.seed, xc) && !!source(at.seed, xc);
  },
  plan(r, { t0, seed, autoX }) {
    const xc = autoX(t0 + 9);
    const isl = source(seed, xc), city = target(seed, xc);
    if (!isl || !city) return null;
    const lo = city.lo + 10, hi = city.hi - 10;
    const bs = buildings(seed, lo, hi).filter((b) => b.H > 26);
    if (bs.length < HITS + 2) return null;
    // the targets: tall ones first, a little shuffled
    const order = bs.map((b, i) => ({ b, k: b.H * (0.6 + 0.8 * r()) + i * 0.001 })).sort((p, q) => q.k - p.k).map((e) => e.b);
    const hits = order.slice(0, HITS);
    // two launchers on the quay, a third and two thirds of the way along (rooftops sit too high for their box)
    const sams = [0.33, 0.67].map((f) => ({ x: lerp(lo, hi, f) + r.range(-30, 30), y: -3, z: 1.037 }));
    const s = isl.s || 1, ix = isl.x, iy = isl.y, iz = isl.z;
    const guns = isl.id === 'islands.enemy' ? [[-84, -198], [-34, -198], [34, -198], [84, -198], [0, -238]] : [[-44, -132], [44, -132], [0, -156]];
    const ms = [];
    for (let i = 0; i < N; i++) {
      const g = guns[i % guns.length];
      const tl = 0.8 + (i < 13 ? i * 0.3 : 5.6 + (i - 13) * 0.3) + r.range(-0.1, 0.1);
      const fl = r.range(4.4, 5.4);
      const from = [ix + g[0] * s, iy + g[1] * s, iz];
      let fate, to;
      if (i % 3 === 0 && ms.filter((m) => m.fate === 'hit').length < HITS) {   // the hits spread over both ripples
        const b = hits[ms.filter((m) => m.fate === 'hit').length];
        fate = 'hit'; to = [b.x + r.range(-0.25, 0.25) * b.W, -b.H * r.range(0.55, 0.85), b.z + 0.0015]; ms.push({ i, tl, fl, from, to, fate, b, fall: r() < 0.75 });
        continue;
      }
      const x = lerp(lo, hi, r());
      fate = r() < 0.75 ? 'kill' : 'sea';
      to = fate === 'sea' ? [x, 0, 1.06 + r.range(0, 0.04)] : [x, -r.range(30, 80), 1.0];
      ms.push({ i, tl, fl, from, to, fate, f: r.range(0.58, 0.8) });
    }
    // who kills which: two in three by a quay launcher (taking turns), the rest by the quay guns (taking turns)
    let kc = 0;
    for (const m of ms) if (m.fate === 'kill') { m.by = sams.length && kc % 3 !== 2 ? 'sam' : 'ciws'; m.sam = kc % Math.max(1, sams.length); m.gun = kc % 2; kc++; }
    for (const m of ms) {
      const [a, b] = [m.from, m.to], dx = b[0] - a[0];
      m.c1 = [a[0] + dx * 0.22, a[1] - r.range(260, 380), a[2]];
      m.c2 = [a[0] + dx * 0.72, Math.min(a[1], b[1]) - r.range(120, 240), b[2]];
      m.seed = r.int(0, 3);
    }
    // the quay guns: two at the ends of the stretch
    const qz = 1.036, ciws = [lo + 60, hi - 40].map((x) => ({ x, y: -3, z: qz }));
    return { ix, iy, iz, iid: isl.id, isl: { x: ix, seed: isl.seed, bob: 1 }, ms, sams, ciws, wind: r.range(0.3, 0.8) };
  },
  marks(ev) {
    return ev.ms.filter((m) => m.fate === 'hit' && m.fall).map((m) => ({
      x0: m.b.x - 2, x1: m.b.x + 2, z0: m.b.z - 0.002, z1: m.b.z + 0.002, at: ev.t0 + m.tl + m.fl + 0.35, fall: 3.5, ruin: (ev.ruin ?? 30) + (m.i % 3) * 4, build: 12,
    }));
  },
  states(ev) {
    // the island's guns flash while the salvo leaves
    return [{ id: ev.iid, x0: ev.ix - 1, x1: ev.ix + 1, from: ev.t0, to: ev.t0 + 10, state: 'fire' }];
  },
  items(ev, t, L, view) {
    const u = t - ev.t0, out = [], lights = [], flashes = [];
    const path = (m) => (f) => bez3(m.from, m.c1, m.c2, m.to, f);
    const accel = (f) => f * (0.75 + 0.25 * f);
    const pos = (m, tt) => path(m)(accel(clamp((tt - m.tl) / m.fl)));
    // the defences: launchers and the guns come up out of the quay deck
    const up = smooth(0.5, 2.2, u) * (1 - smooth(ev.dur - 2.5, ev.dur, u));
    ev.sams.forEach((s, k) => {
      const shots = ev.ms.filter((m) => m.fate === 'kill' && m.by === 'sam' && m.sam === k);
      const fire = shots.map((m) => m.tl + m.fl * m.f - 1.5).filter((f) => u >= f && u < f + 1.6);
      const it = rising({ id: 'defence.sam-launcher', x: s.x, y: s.y, z: s.z, s: 1.1, state: fire.length ? 'fire' : 'idle', p: fire.length ? (u - fire[0]) / 1.6 : 0, flip: s.x > ev.ix, seed: k, kind: 'defence', extra: { kind: 'siso' } }, up);
      if (it) out.push(it);
    });
    ev.ciws.forEach((c, k) => {
      const shots = ev.ms.filter((m) => m.fate === 'kill' && m.by === 'ciws' && m.gun === k);
      const on = shots.find((m) => { const tk = m.tl + m.fl * m.f; return u >= tk - 1.5 && u < tk + 0.3; }) || null;
      let aim = 0.55, flip = false;
      if (on && view) {
        const q = pos(on, ev.t0 + Math.min(u, on.tl + on.fl * on.f));
        const [qx, qy] = toDepth(view, q[0], q[1], q[2], c.z);
        const gx = c.x, gy = c.y - 14;
        flip = qx < gx; aim = clamp(Math.atan2(gy - qy, Math.abs(qx - gx)), 0.15, 1.35);
        // the stream reaches out from the muzzle at the rounds' speed; after the kill its last rounds fly on and it leaves the muzzle
        const tk = on.tl + on.fl * on.f, g = clamp(((u - tk + 1.5) * 1100) / Math.max(1, Math.hypot(qx - gx, qy - gy))), a = clamp((u - tk) / 0.3);
        if (g - a > 0.01) out.push({ id: 'fx.tracer', x: gx, y: gy, z: c.z + 0.001, s: 1, state: 'siso', seed: k, kind: 'fx', extra: { points: [[(qx - gx) * a, (qy - gy) * a], [(qx - gx) * g, (qy - gy) * g]] } });
        lights.push({ x: gx, y: gy, z: c.z, r: 60, c: [170, 200, 255], a: 0.5 });
      }
      const it = rising({ id: 'defence.ciws', x: c.x, y: c.y, z: c.z, s: 1.2, state: on ? 'fire' : 'idle', flip, seed: k, kind: 'defence', extra: { aim } }, up);
      if (it) out.push(it);
    });
    for (const m of ev.ms) {
      const tEnd = m.fate === 'kill' ? m.tl + m.fl * m.f : m.tl + m.fl;
      // in flight
      if (u >= m.tl && u < tEnd + 1.6) missile(out, { path: path(m), ease: accel, t0: ev.t0 + m.tl, t1: ev.t0 + m.tl + m.fl, stop: ev.t0 + tEnd, linger: 1.6, t, state: 'enemy', s: 0.75, view, back: 2.0, len: 480, wind: 6, seed: m.seed, lights });
      if (m.fate === 'kill') {
        const tk = tEnd;
        // the interceptor: up out of a launcher (or a straight run from the quay gun) to where the missile will be
        if (m.by === 'sam' && ev.sams.length) {
          const s = ev.sams[m.sam % ev.sams.length], q = pos(m, ev.t0 + tk);
          const a = [s.x, s.y - 8, s.z], c = [s.x + (q[0] - s.x) * 0.25, q[1] + (s.y - q[1]) * 0.15, (s.z + q[2]) / 2];
          if (u >= tk - 1.5 && u < tk + 1.2) missile(out, { path: (f) => bez2(a, c, q, f), ease: (f) => f * f * 0.5 + f * 0.5, t0: ev.t0 + tk - 1.5, t1: ev.t0 + tk, linger: 1.2, t, state: 'siso', s: 0.6, view, back: 0.9, len: 260, wind: 4, lights });
        }
        if (u >= tk && u < tk + 2.8) {
          const q = pos(m, ev.t0 + tk);
          out.push({ id: 'fx.intercept', x: q[0], y: q[1] + 170 * 0.45, z: q[2] + 0.002, s: 0.45, state: m.by === 'sam' ? 'blue' : 'pop', p: (u - tk) / 2.8, seed: m.seed, kind: 'fx' });
          const k = Math.exp(-(u - tk) * 3);
          lights.push({ x: q[0], y: q[1], z: q[2], r: 160, c: m.by === 'sam' ? [170, 200, 255] : [255, 170, 90], a: 0.9 * k });
        }
        continue;
      }
      const th = m.tl + m.fl;
      if (m.fate === 'sea') {
        if (u >= th && u < th + 2.8) out.push({ id: 'fx.splash', x: m.to[0], y: 0, z: m.to[2], s: 0.8, state: 'big', p: (u - th) / 2.8, seed: m.seed, kind: 'fx' });
        if (u >= th && u < th + 0.8) lights.push({ x: m.to[0], y: -30, z: m.to[2], r: 140, c: [255, 160, 80], a: 0.8 * Math.exp(-(u - th) * 4) });
        continue;
      }
      // a hit on a building
      const b = m.b;
      // sized to the block: the cap of the blast a couple of block widths across, not a mushroom over the whole skyline
      blast(out, lights, flashes, { x: m.to[0], y: m.to[1] + 20, z: b.z, th: ev.t0 + th, t, size: 0.28 + Math.min(0.16, b.W / 300), seed: m.seed, sky: 0.25 });
      if (m.fall) {
        const at = th + 0.35;
        collapse(out, lights, { b, at: ev.t0 + at, t, seed: m.i, burn: 24, wind: ev.wind });
        const ruin = (ev.ruin ?? 30) + (m.i % 3) * 4;
        crane(out, { x: b.x + (m.i % 2 ? 1 : -1) * (b.W * 0.5 + 10), z: b.z + 0.003, from: ev.t0 + at + 3.5 + ruin - 4, to: ev.t0 + at + 3.5 + ruin + 12 + 3, t, h: Math.max(60, b.H * 0.9), seed: m.i, flip: m.i % 2 === 0 });
      } else {
        burning(out, lights, { x: m.to[0], y: m.to[1] + 12, z: b.z + 0.002, w: b.W * 0.55, th: ev.t0 + th + 0.2, t, burn: 34, smoke: 52, wind: ev.wind, seed: m.i, big: 0.7 });
      }
    }
    return flush(out, lights, flashes);
  },
};
