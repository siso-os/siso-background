// barrage: the home bay answers. The enemy island across the water opens up; its rounds burst on the SISO shield in
// flares of light. The tower's spine pulses, its ports open, and a barrage of SISO missiles leaves them in turn, climbs
// over the bay and comes down on the enemy island, which flares and burns, smoking, as the camera drifts past it.

import { clamp, smooth, hr, bez3, missile, blast, burning, flush, homeIslands, enemyIslands, bobAt, seen } from './_war.js';

const TOWER_K = (0.5 * 460) / 290;  // the tower's scale on the home island (renderer CARRY: half the island's width high)
const DOME_K = (1.05 * 460) / 512;  // the dome's
const TOWER_Y = -163, DOME_Y = -150; // their slots on the island
const PORTS = [[-1, -96], [1, -112], [-1, -128], [1, -144], [-1, -160], [1, -176]];   // tower frame, from the asset
const BARRAGE = [2.2, 4.6];          // when the tower's ports fire (s after t0)
const SPAN = 64;                     // the island burns until the camera has passed it
const SHOTS = 6;                     // enemy rounds on the dome

function pair(seed, x0) {
  const home = homeIslands(seed, x0 - 2600, x0 + 2600)[0];
  if (!home) return null;
  const enemy = enemyIslands(seed, home.x, home.x + 2200).sort((a, b) => a.x - b.x)[0];
  return enemy ? { home, enemy } : null;
}

export default {
  id: 'barrage',
  title: 'Barrage',
  about: 'Enemy rounds burst on the SISO shield; the tower fires a barrage from its ports that arcs over the bay onto the enemy island, which burns.',
  dur: 22,
  span: SPAN,
  weight: 5,
  war: true,
  pull: 0.9,             // the home bay comes round once in eight chunks: when it does, it is usually at war
  // only where the tower stands, and only when the tower and the enemy island are both in view as the missiles fly
  where: (place, at) => {
    if (place.type !== 'home') return false;
    const p = pair(at.seed, at.x0);
    return !!p && seen(p.home.x, p.home.z, at.autoX(at.t0 + 3), 120) && seen(p.enemy.x, p.enemy.z, at.autoX(at.t0 + 8), 160);
  },
  plan(r, { t0, x0, seed }) {
    const p = pair(seed, x0);
    if (!p) return null;
    const H = p.home, E = p.enemy, es = E.s || 1;
    const bobH = (t) => bobAt(H, t), bobE = (t) => bobAt(E, t);
    // the SISO missiles: one for each port firing of the tower's own barrage, picked up where the asset's little
    // launch flash ends (half a cycle after the port opens, 60 units up and 30 out)
    const ms = [];
    PORTS.forEach(([sg, py], i) => {
      for (let n = Math.ceil((t0 + BARRAGE[0]) * 1.4 + i / 6); (n - i / 6) / 1.4 < t0 + BARRAGE[1]; n++) {
        const T = (n - i / 6) / 1.4 + 0.5 / 1.4;
        const fx = sg * 3.6 + sg * 30, fy = py - 60;
        const from = [H.x + TOWER_K * fx, H.y + bobH(T) + TOWER_Y + TOWER_K * fy, H.z];
        const fl = r.range(3.6, 4.4), th = T + fl;
        const engines = r() < 0.25;
        const hx = engines ? r.range(-70, 70) : r.range(-175, 175), hy = engines ? -78 : r.range(-240, -165);
        const to = [E.x + hx * es, E.y + bobE(th) + hy * es, E.z + 0.002];
        const c1 = [from[0] + sg * r.range(40, 110), from[1] - r.range(300, 420), H.z];
        const c2 = [to[0] - r.range(180, 320), Math.min(from[1], to[1]) - r.range(260, 380), E.z];
        ms.push({ T: T - t0, fl, from, c1, c2, to, seed: r.int(0, 3), big: r() < 0.4 });
      }
    });
    // the enemy rounds on the dome: from its wall guns to a point on the shell facing it
    const guns = [[-84, -198], [-34, -198], [34, -198], [84, -198]];
    const shots = [];
    for (let k = 0; k < SHOTS; k++) {
      const tl = 0.4 + k * 0.6 + r.range(-0.1, 0.1), fl = r.range(2.2, 2.7), th = tl + fl;
      const g = guns[k % 4];
      const from = [E.x + g[0] * es, E.y + bobE(t0 + tl) + g[1] * es, E.z];
      const th0 = r.range(0.45, 1.15);                        // the angle from the dome's top, toward the enemy
      const hitX = 250 * Math.sin(th0), hitY = -296 * Math.cos(th0);
      const to = [H.x + DOME_K * hitX, H.y + bobH(t0 + th) + DOME_Y + DOME_K * hitY, H.z + 0.004];
      const c1 = [from[0] - r.range(120, 220), from[1] - r.range(160, 260), E.z];
      const c2 = [to[0] + r.range(200, 320), to[1] - r.range(160, 240), H.z];
      shots.push({ tl, fl, from, c1, c2, to, hitX, hitY, seed: r.int(0, 3) });
    }
    const first = Math.min(...ms.map((m) => m.T + m.fl));
    return { hx: H.x, ex: E.x, eid: E.id, ms, shots, first, fires: [0, 1, 2].map((k) => ({ x: r.range(-150, 150) * es, y: r.range(-200, -170) * es, w: r.range(40, 80) * es, at: first + k * 1.1 + r.range(0, 0.6) })), es, E: { x: E.x, y: E.y, z: E.z, seed: E.seed, bob: E.bob } };
  },
  states(ev) {
    const t0 = ev.t0, out = [];
    // the dome flares where each round lands (listed first, so a hit wins over nothing)
    for (const s of ev.shots) out.push({ id: 'defence.shield-dome', x0: ev.hx - 1, x1: ev.hx + 1, from: t0 + s.tl + s.fl, to: t0 + s.tl + s.fl + 1.6, state: 'hit', extra: { hitX: s.hitX, hitY: s.hitY } });
    out.push(
      { id: 'city.tower-siso', x0: ev.hx - 1, x1: ev.hx + 1, from: t0, to: t0 + BARRAGE[0], state: 'shield' },
      { id: 'city.tower-siso', x0: ev.hx - 1, x1: ev.hx + 1, from: t0 + BARRAGE[0], to: t0 + BARRAGE[1], state: 'barrage' },
      { id: 'city.tower-siso', x0: ev.hx - 1, x1: ev.hx + 1, from: t0 + BARRAGE[1], to: t0 + ev.dur - 2, state: 'shield' },
      { id: ev.eid, x0: ev.ex - 1, x1: ev.ex + 1, from: t0, to: t0 + Math.min(4.6, ev.first), state: 'fire' },
      // it burns until the camera has long passed it
      { id: ev.eid, x0: ev.ex - 1, x1: ev.ex + 1, from: t0 + ev.first, to: t0 + (ev.span ?? SPAN), state: 'hit' },
    );
    return out;
  },
  items(ev, t, L, view) {
    const u = t - ev.t0, out = [], lights = [], flashes = [];
    // the SISO barrage
    for (const m of ev.ms) {
      const th = m.T + m.fl;
      if (u >= m.T && u < th + 1.4) missile(out, { path: (f) => bez3(m.from, m.c1, m.c2, m.to, f), ease: (f) => f * (0.6 + 0.4 * f), t0: ev.t0 + m.T, t1: ev.t0 + th, linger: 1.4, t, state: 'siso', s: 0.8, view, back: 1.3, len: 380, wind: 6, seed: m.seed, lights, glow: 1.2 });
      if (u >= th) {
        const dy = bobAt(ev.E, t) - bobAt(ev.E, ev.t0 + th);    // the hit rides on the island as it bobs
        blast(out, lights, flashes, { x: m.to[0], y: m.to[1] + dy, z: m.to[2], th: ev.t0 + th, t, size: m.big ? 0.55 : 0.38, seed: m.seed, sky: m.big ? 0.12 : 0 });
      }
    }
    // the enemy rounds and the shield taking them
    for (const s of ev.shots) {
      const th = s.tl + s.fl;
      if (u >= s.tl && u < th + 1.2) missile(out, { path: (f) => bez3(s.from, s.c1, s.c2, s.to, f), t0: ev.t0 + s.tl, t1: ev.t0 + th, linger: 1.2, t, state: 'enemy', s: 0.7, view, back: 1, len: 300, wind: -4, seed: s.seed, lights });
      if (u >= th && u < th + 1.2) {
        const sz = 0.75;
        out.push({ id: 'fx.shield-hit', x: s.to[0], y: s.to[1] + 120 * sz, z: s.to[2], s: sz, state: 'hit', p: (u - th) / 1.2, seed: s.seed, kind: 'fx', extra: { tilt: 0.9 } });
        lights.push({ x: s.to[0], y: s.to[1], z: 0.86, r: 260, c: [130, 190, 255], a: 1.1 * Math.exp(-(u - th) * 3), water: true });
      }
    }
    // the enemy island burning: fires on its walls and black smoke off it, riding its bob
    const bob = bobAt(ev.E, t);
    ev.fires.forEach((f, k) => {
      burning(out, lights, { x: ev.ex + f.x, y: ev.E.y + bob + f.y, z: ev.E.z + 0.003, w: f.w, th: ev.t0 + f.at, t, burn: (ev.span ?? SPAN) - f.at - 2, smoke: (ev.span ?? SPAN) - f.at, wind: 0.6, seed: k + 3, big: 0.8, plume: k < 2 });
    });
    return flush(out, lights, flashes);
  },
};
