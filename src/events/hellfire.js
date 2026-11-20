// hellfire: a swarm of missiles comes down on a city like rain. A near sheet of real missiles, all on the same slant,
// each with its thin grey trail, falls across the frame; behind it a far sheet of streaks recedes into the haze. The
// impacts roll across the city as a carpet from one end to the other: blasts, fireballs, flashes, splashes in the bay.
// Blocks come down in dust and burn; smoke rolls off the carpet; the quay guns try and barely matter. At night every
// impact lights the faces of the towers, the smoke and the water, and the sky lifts with the worst of it.

import { clamp, smooth, lerp, hr, missile, blast, burning, collapse, crane, rising, flush, buildings, cityNear, toDepth, lightSprite, css } from './_war.js';

const N = 130;            // near missiles
const FAR = 150;          // far streaks
const SPEED = 300;        // units/s along the slant (each missile 0.8 to 1.2 of it)
const SLANT = 0.95;       // x per unit of drop: the sheet leans hard, so the live heads spread across the sky, not down one column
const Y0 = -950;          // where they start: just above the top of the frame at the city's depth, so most of each flight shows
const YF = -1700;         // the far sheet starts higher: at its depth the top of the frame is higher up
const CARPET = [6, 12.5]; // when the first and last land (s after t0)

const target = (seed, xc) => cityNear(seed, xc, 760, 560);

export default {
  id: 'hellfire',
  title: 'Hellfire',
  about: 'A sheet of about a hundred missiles rains down on a city on one slant; the impacts roll across it as a carpet; blocks fall, burn and are rebuilt.',
  dur: 30,
  span: 76,
  weight: 2,
  war: true,
  where: (place, at) => !!target(at.seed, at.autoX(at.t0 + 10)),
  plan(r, { t0, seed, autoX }) {
    const xc = autoX(t0 + 10);
    const city = target(seed, xc);
    if (!city) return null;
    const A = city.lo - 90, B = city.hi + 90;
    const dir = r() < 0.65 ? 1 : -1;      // the carpet rolls with the drift, mostly
    const bs = buildings(seed, A, B);
    const near = (x) => { let best = null, d = 1e9; for (const b of bs) { const e = Math.abs(b.x - x) - b.W * 0.5; if (e < d) { d = e; best = b; } } return d < 6 ? best : null; };
    const ms = [], fallen = new Set();
    for (let i = 0; i < N; i++) {
      const c = (i + r()) / N;
      // loose in time, place and speed, so the live heads fill a slab of sky instead of lining up on one diagonal
      const th = lerp(CARPET[0], CARPET[1], dir > 0 ? c : 1 - c) + r.range(-1, 1);
      let x = lerp(A, B, c) + r.range(-0.2, 0.2) * (B - A);
      const v = SPEED * r.range(0.8, 1.2);
      const roll = r();
      let kind = i % 4 === 0 ? 'full' : i % 4 === 3 ? 'flash' : 'ball';
      let z, y, b = null;
      if (roll < 0.5 && (b = near(x))) { z = b.z + 0.0015; y = -b.H * r.range(0.35, 0.9); x = b.x + r.range(-0.3, 0.3) * b.W; }
      else if (roll < 0.78) { z = r.range(0.935, 0.99); y = 0; }
      else { z = r.range(1.045, 1.1); y = 0; kind = 'sea'; }
      if (i % 7 === 5 && kind !== 'full') kind = 'kill';
      const drop = y - Y0, fl = (drop * Math.hypot(1, SLANT)) / v;
      const m = { i, th, fl, x, y, z, kind, seed: r.int(0, 3), f: r.range(0.55, 0.75) };
      // a building hit by a blast or a fireball comes down (once)
      if (b && (kind === 'full' || kind === 'ball') && !fallen.has(b) && r() < 0.7) { fallen.add(b); m.b = b; m.fall = true; }
      else if (b && kind !== 'kill') m.b = b;
      ms.push(m);
    }
    // which fires get a plume and which ruins a crane, fixed here so they never move from one block to another
    let np = 0, nb = 0, nc = 0;
    for (const m of ms.slice().sort((p, q) => p.th - q.th)) {
      if (m.fall) { m.plume = np++ < 6; if (m.b.H > 50 && nc < 4) { m.crane = true; nc++; } }
      else if (m.b && m.kind === 'full') m.plume = nb++ < 8;
    }
    const far = [];
    for (let i = 0; i < FAR; i++) {
      const c = (i + r()) / FAR;
      far.push({ th: lerp(CARPET[0] - 1, CARPET[1] + 1.5, dir > 0 ? c : 1 - c) + r.range(-0.8, 0.8), x: lerp(A - 900, B + 500, r()), z: r.range(0.5, 0.82), s: r.range(0.8, 1.2) });
    }
    const qz = 1.036;
    return { A, B, dir, ms, far, ciws: [A + 140, (A + B) / 2 + 80].map((x) => ({ x, y: -3, z: qz })), wind: r.range(0.4, 0.9) };
  },
  marks(ev) {
    return ev.ms.filter((m) => m.fall).map((m) => ({ x0: m.b.x - 2, x1: m.b.x + 2, z0: m.b.z - 0.002, z1: m.b.z + 0.002, at: ev.t0 + m.th + 0.3, fall: 3.2, ruin: 30 + (m.i % 4) * 3, build: 14 }));
  },
  items(ev, t, L, view) {
    const u = t - ev.t0, out = [], lights = [], flashes = [];
    let sky = 0;
    const line = (m) => (f) => { const d = m.y - Y0; return [m.x - SLANT * d * (1 - f), Y0 + d * f, m.z]; };
    // the near sheet
    for (const m of ev.ms) {
      const t1 = m.th, tl = t1 - m.fl, end = m.kind === 'kill' ? tl + m.fl * m.f : t1;
      if (u >= tl && u < end + 1.4) missile(out, { path: line(m), t0: ev.t0 + tl, t1: ev.t0 + t1, stop: ev.t0 + end, linger: 1.4, t, state: 'enemy', s: 0.62 * m.z, view, back: 1.0, len: 260, wind: 5, sag: 4, seed: m.seed, lights, glow: 0.8 });
    }
    // the impacts, the fires, the falls
    for (const m of ev.ms) {
      const th = m.th, du = u - th;
      // a kill bursts where the missile was met, before it would have landed
      if (m.kind === 'kill') {
        const tk = m.th - m.fl * (1 - m.f), dk = u - tk;
        if (dk >= 0 && dk < 2.8) {
          const q = line(m)(m.f);
          out.push({ id: 'fx.intercept', x: q[0], y: q[1] + 170 * 0.4, z: q[2] + 0.002, s: 0.4, state: 'pop', p: dk / 2.8, seed: m.seed, kind: 'fx' });
          lights.push({ x: q[0], y: q[1], z: q[2], r: 140, c: [255, 170, 90], a: 0.8 * Math.exp(-dk * 3), water: false });
        }
        continue;
      }
      if (du < 0) continue;
      if (m.kind === 'sea') {
        if (du < 2.8) out.push({ id: 'fx.splash', x: m.x, y: 0, z: m.z, s: 0.7 * m.z, state: m.i % 3 ? 'shell' : 'big', p: du / (m.i % 3 ? 1.8 : 2.8), seed: m.seed, kind: 'fx' });
        if (du < 0.6) { out.push({ id: 'fx.flash', x: m.x, y: 120 * 0.4 - 10, z: m.z + 0.001, s: 1, state: 'flash', p: du / 0.6, kind: 'fx', extra: { size: 0.4 } }); lights.push({ x: m.x, y: -20, z: m.z, r: 150, c: [255, 160, 80], a: 1.0 * Math.exp(-du * 4) }); }
        continue;
      }
      if (m.kind === 'full') {
        blast(out, lights, null, { x: m.x, y: m.y, z: m.z, th: ev.t0 + th, t, size: 0.34 + 0.16 * hr(m.i, 3), seed: m.seed });
        if (du < 0.9) sky += 0.07 * Math.exp(-du * 4);
      } else if (m.kind === 'ball') {
        if (du < 2.4) out.push({ id: 'fx.fireball', x: m.x, y: m.y + 20, z: m.z + 0.002, s: 0.45 + 0.2 * hr(m.i, 4), state: 'burst', p: du / 2.4, seed: m.seed, kind: 'fx' });
        if (du < 0.6) out.push({ id: 'fx.flash', x: m.x, y: m.y - 20 + 120 * 0.5, z: m.z + 0.003, s: 1, state: 'flash', p: du / 0.6, kind: 'fx', extra: { size: 0.5 } });
        const k = Math.exp(-du * 2.4) * (du < 0.05 ? du / 0.05 : 1);
        if (du < 2.4) lights.push({ x: m.x, y: m.y - 40, z: m.z, r: 220, c: [255, 140, 60], a: 1.0 * k });
      } else {
        if (du < 0.6) out.push({ id: 'fx.flash', x: m.x, y: m.y - 10 + 120 * 0.45, z: m.z + 0.003, s: 1, state: 'flash', p: du / 0.6, kind: 'fx', extra: { size: 0.45 } });
        if (du < 2.6) out.push({ id: 'fx.debris', x: m.x, y: m.y, z: m.z + 0.002, s: 0.4, state: 'burst', p: du / 2.6, seed: m.seed, kind: 'fx', extra: { size: 0.7 } });
        if (du < 1) lights.push({ x: m.x, y: m.y - 30, z: m.z, r: 170, c: [255, 170, 90], a: 0.9 * Math.exp(-du * 3.5) });
      }
      if (m.fall) {
        const b = m.b;
        collapse(out, lights, { b, at: ev.t0 + th + 0.3, t, seed: m.i, burn: 22, wind: ev.wind, plume: m.plume });
        if (m.crane) {
          const done = th + 0.3 + 3.2 + 30 + (m.i % 4) * 3;
          crane(out, { x: b.x + (m.i % 2 ? 1 : -1) * (b.W * 0.5 + 10), z: b.z + 0.003, from: ev.t0 + done - 4, to: ev.t0 + done + 14 + 3, t, h: Math.max(70, b.H), seed: m.i, flip: m.i % 2 === 0 });
        }
      } else if (m.b && m.kind === 'full') {
        burning(out, lights, { x: m.x, y: m.y + 10, z: m.z + 0.001, w: m.b.W * 0.5, th: ev.t0 + th + 0.3, t, burn: 30, smoke: 46, wind: ev.wind, seed: m.i, big: 0.6, plume: m.plume });
      }
    }
    // the smoke rolling off the carpet: a few big plumes rising where it has passed
    for (let k = 0; k < 4; k++) {
      const c = (k + 0.5) / 4, th = lerp(CARPET[0], CARPET[1], ev.dir > 0 ? c : 1 - c) + 1, du = u - th;
      if (du < 0 || du > 60) continue;
      const g = smooth(0, 10, du), fade = 1 - smooth(48, 60, du);
      out.push({ id: 'fx.smoke', x: lerp(ev.A, ev.B, c) + ev.wind * 20 * g, y: 0, z: 0.94 + k * 0.004, s: (0.08 + 0.82 * g) * fade, state: du < 30 ? 'plume' : 'grey', seed: k, kind: 'fx', extra: { wind: ev.wind, fire: du < 25 ? 1 : 0.3 } });
    }
    // the quay guns, firing into the sheet while it falls
    const up = smooth(1.5, 3.5, u) * (1 - smooth(ev.dur - 3, ev.dur, u));
    ev.ciws.forEach((c, k) => {
      const firing = u > CARPET[0] - 3 && u < CARPET[1] + 1;
      let aim = 0.9, flip = true;
      if (firing && view) {
        // bursts of 0.6 s, each at one missile picked at the burst's start from those still flying through it
        const wi = Math.floor(u / 0.6), ws = wi * 0.6;
        const live = ev.ms.filter((m) => { const e = m.kind === 'kill' ? m.th - m.fl * (1 - m.f) : m.th; return ws >= m.th - m.fl + 1 && ws + 0.6 < e - 0.6; });
        const m = live.length ? live[(wi + k * 3) % live.length] : null;
        if (m) {
          const d = m.y - Y0, f = clamp((u - (m.th - m.fl)) / m.fl), q = [m.x - SLANT * d * (1 - f), Y0 + d * f, m.z];
          const [qx, qy] = toDepth(view, q[0], q[1], q[2], c.z), gy = c.y - 14;
          flip = qx < c.x; aim = clamp(Math.atan2(gy - qy, Math.abs(qx - c.x)), 0.2, 1.4);
          // a 0.25 s burst: its head reaches the missile, its tail leaves the muzzle, both gone before the next burst
          const g = clamp((u - ws) / 0.35), a = clamp((u - ws - 0.25) / 0.35);
          if (g - a > 0.01) out.push({ id: 'fx.tracer', x: c.x, y: gy, z: c.z + 0.001, s: 1, state: 'siso', seed: k, kind: 'fx', extra: { points: [[(qx - c.x) * a, (qy - gy) * a], [(qx - c.x) * g, (qy - gy) * g]] } });
          lights.push({ x: c.x, y: gy, z: c.z, r: 60, c: [170, 200, 255], a: 0.5 });
        }
      }
      const it = rising({ id: 'defence.ciws', x: c.x, y: c.y, z: c.z, s: 1.2, state: firing ? 'fire' : 'idle', flip, seed: k, kind: 'defence', extra: { aim } }, up);
      if (it) out.push(it);
    });
    // the far sheet: streaks into the haze, tiny flashes where they land on the far shore
    const far = ev.far;
    out.push({
      overlay: true, z: 0.6,
      draw(ctx, v, Lx) {
        const night = 0.35 + 0.65 * clamp(Lx.night * 1.25);
        ctx.lineCap = 'round';
        for (const s of far) {
          const tl = s.th - (-YF * Math.hypot(1, SLANT)) / SPEED, f = (u - tl) / (s.th - tl);
          if (f < 0 || f > 1.15) continue;
          const z = s.z, a = (0.35 + 0.65 * (z - 0.5) / 0.32);
          if (f <= 1) {
            const y = YF * (1 - f), x = s.x - SLANT * -YF * (1 - f);
            const hx = v.sx(x, z), hy = v.sy(y, z);
            if (hx < -60 || hx > v.W + 60 || hy < -40) continue;
            const len = Math.min(200, SPEED * 1.2 * f + 20) * v.k * z * s.s, k = 1 / Math.hypot(1, SLANT);
            const tx = hx - len * SLANT * k, ty = hy - len * k;
            const gr = ctx.createLinearGradient(tx, ty, hx, hy);
            gr.addColorStop(0, css(Lx.haze || [180, 180, 180], 0)); gr.addColorStop(1, css([200, 196, 190], 0.32 * a));
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = gr; ctx.lineWidth = Math.max(0.6, 1.4 * v.k * z); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            const r = Math.max(1.2, 2.2 * v.k * z);
            ctx.globalAlpha = Math.min(1, 0.6 * a + 0.3 * night);
            ctx.drawImage(lightSprite([255, 150, 70]), hx - r * 2, hy - r * 2, r * 4, r * 4);
            ctx.globalAlpha = 1;
          } else {
            // landed: a short flare on the far shore and a flicker on the water
            const k = 1 - (f - 1) / 0.15, hx = v.sx(s.x, z), hy = v.sy(0, z);
            if (hx < -60 || hx > v.W + 60) continue;
            const r = 40 * v.k * z * s.s * (0.6 + 0.4 * night);
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, k * a * (0.5 + 0.5 * night));
            ctx.drawImage(lightSprite([255, 140, 60]), hx - r, hy - r * 1.2, r * 2, r * 2);
            ctx.globalAlpha = 1;
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    });
    if (sky > 0.01) flashes.push({ x: (ev.A + ev.B) / 2, y: -200, z: 1, a: Math.min(0.7, sky) });
    return flush(out, lights, flashes);
  },
};
