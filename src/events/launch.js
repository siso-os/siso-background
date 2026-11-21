// launch: a rocket on a pad by the water drifts into view venting vapour. It lights, the trench throws smoke both ways
// and it climbs on its flame out of the top of the frame, leaving a column of exhaust that billows, drifts and slowly
// thins. Higher up it pitches over downrange and arcs on into space, where someone following it (Shift+W) sees it pass.
//
// The asset plays the first 14 s of a launch in its own box (a climb of 900). After that the event draws it twice: the
// pad (tower, deck and the foot of the asset's own column) with the rocket's band cut out, and that band (the rocket and
// its flame) moved along the path and turned as it pitches over. At the switch the two are the same picture. The long
// plume is the event's own: puffs laid along the path, each aging from the moment the flame passed it.

import { clamp, smooth, hr, flush, cityNear } from './_war.js';
import { drawAsset } from '../assets/registry.js';
import { smokeTint, puffTinted, put } from '../assets/fx/_lib.js';

const IGNITE = 12;               // s after t0: the pad has drifted in to about two thirds of the way across by then
const LAUNCH = 14;               // the asset's launch (its p runs 0..1 over this)
const S = 0.9;                   // the rocket's scale
const RX = 6, BOT = -12;         // the rocket's centre line and tail in the asset frame
const BAND = [RX - 18, -1080, 48, 1080 - 790];   // x, y, w, h (asset frame): the rocket and its flame at p = 1
const VMAX = 300, J = 2.0;       // past the asset's 14 s the climb speeds up (jerk J) to VMAX world units/s
const SP = 14;                   // plume puffs every SP units along the path
const GAP = 70;                  // the plume starts this far behind the tail (the flame is in front of it)
const TOP = -9200;               // above the space view: the rocket is gone there
const FADE = [20, 45];           // plume puffs thin out over these ages (s)

// the climb (path length, world units) at ul seconds after ignition: the asset's own curve, then faster
const H1 = S * 900, V1 = (S * 1800) / (0.94 * LAUNCH), A1 = (S * 1800) / (0.94 * LAUNCH) ** 2;
const TC = (-A1 + Math.sqrt(A1 * A1 - 4 * J * (V1 - VMAX))) / (2 * J);
const post = (tau) => H1 + V1 * tau + (A1 * tau * tau) / 2 + (J * tau ** 3) / 3;
const HC = post(TC);
function climb(ul) {
  if (ul <= LAUNCH) return H1 * Math.max(0, (ul / LAUNCH - 0.06) / 0.94) ** 2;
  const tau = ul - LAUNCH;
  return tau <= TC ? post(tau) : HC + VMAX * (tau - TC);
}
// ...and when (ul) the tail reached path length h
function when(h) {
  if (h <= 0) return 0.06 * LAUNCH;
  if (h <= H1) return LAUNCH * (0.06 + 0.94 * Math.sqrt(h / H1));
  if (h > HC) return LAUNCH + TC + (h - HC) / VMAX;
  let a = 0, b = TC;
  for (let i = 0; i < 22; i++) { const m = (a + b) / 2; if (post(m) < h) a = m; else b = m; }
  return LAUNCH + (a + b) / 2;
}

// The path of the tail at ul seconds after ignition: points every SP units, straight up and then turning downrange,
// and where the tail is now (tx, ty), its heading (rot) and whether it has left the top of the world.
function track(ev, ul) {
  const h = climb(ul);
  const head = (hh) => ev.pitch * smooth(1000, 8000, hh) ** 1.2;
  const xs = [ev.x + RX * S], ys = [BOT * S];
  let k = 0;
  while ((k + 1) * SP <= h && ys[k] > TOP) { const a = head((k + 0.5) * SP); xs.push(xs[k] + Math.sin(a) * SP); ys.push(ys[k] - Math.cos(a) * SP); k++; }
  const d = h - k * SP, rot = head(h);
  const tx = xs[k] + Math.sin(head(k * SP + d / 2)) * d, ty = ys[k] - Math.cos(head(k * SP + d / 2)) * d;
  return { h, xs, ys, k, tx, ty, rot, gone: ys[k] <= TOP };
}

// Where the rocket is at t (its tail, in world units at the pad's depth), for a camera that follows it up.
export function rocketAt(ev, t) {
  const ul = t - ev.t0 - IGNITE;
  if (ul < 0) return { x: ev.x + RX * S, y: BOT * S, z: ev.z, rot: 0, gone: false };
  const tr = track(ev, ul);
  return { x: tr.tx, y: tr.ty, z: ev.z, rot: tr.rot, gone: tr.gone };
}

export default {
  id: 'launch',
  title: 'Rocket launch',
  about: 'A rocket lifts off from its pad on a long flame, climbs out of the frame leaving a billowing column, pitches over and arcs up into space.',
  dur: 86,
  weight: 1.5,
  // every third ground slot at most (90 s apart): one launch is over before the next can start
  where: (place, at) => ((at.slot % 3) + 3) % 3 === 0,
  plan(r, { t0, seed, autoX, opts }) {
    const x = opts?.x ?? autoX(t0) + 1000;          // just off the right edge: it drifts in rather than appearing
    const quay = cityNear(seed, x, 40, 40);
    return { x, z: quay ? 1.036 : 1.06, pitch: r.range(0.5, 0.65), wind: r.range(1.5, 4), seed: r.int(0, 9) };
  },
  items(ev, t, L, view) {
    const u = t - ev.t0, ul = u - IGNITE, z = ev.z, out = [], lights = [];
    if (ul < 0) {
      out.push({ id: 'air.rocket-ship', x: ev.x, y: 0, z, s: S, state: 'idle', seed: ev.seed, kind: 'air' });
      lights.push({ x: ev.x, y: -40, z, r: 120, c: [255, 236, 200], a: 0.25 });
      return flush(out, lights, null);
    }
    const p = ul / LAUNCH, burn = smooth(0, 0.05, p);
    const { h, xs, ys, k, tx, ty, rot, gone } = track(ev, ul);

    if (p < 1) out.push({ id: 'air.rocket-ship', x: ev.x, y: 0, z, s: S, state: 'launch', p, seed: ev.seed, kind: 'air' });
    else {
      // the rocket: its band of the asset at the end of the asset's climb, carried along the path, turned about its tail
      if (!gone) out.push({
        id: 'air.rocket-ship', x: tx, y: ty, z: z + 0.0005, s: S, state: 'launch', p: 1, seed: ev.seed, kind: 'air', w: 80, h: 320, rot,
        fn(g, o) { g.translate(-RX, 900 - BOT); g.beginPath(); g.rect(...BAND); g.clip(); drawAsset(g, 'air.rocket-ship', o); },
      });
      // the pad: the same picture with that band cut out
      out.push({
        // its column thins with the long plume (the foot was laid over the asset's 14 s, so about 7 s in), or it would
        // stand over the pad, unchanged, until the event ends
        id: 'air.rocket-ship', x: ev.x, y: 0, z, s: S, state: 'launch', p: 1, seed: ev.seed, kind: 'air', w: 80, h: 800,
        extra: { plume: 1 - smooth(FADE[0], FADE[1], ul - LAUNCH / 2) },
        fn(g, o) { g.beginPath(); g.rect(-400, -1200, 800, 1300); g.rect(...BAND); g.clip('evenodd'); drawAsset(g, 'air.rocket-ship', o); },
      });
    }

    // the plume: a puff every SP units, laid when the flame passed, growing, drifting downwind and rising as it ages
    const puffs = [];
    const add = (px, py, R, al, i) => {
      if (al <= 0.004) return;
      if (view) {
        const X = view.sx(px, z), Y = view.sy(py, z), rr = R * 1.4 * view.k * z;
        if (X + rr < 0 || X - rr > view.W || Y + rr < 0 || Y - rr > view.H) return;
      }
      puffs.push([px, py, R, al, i]);
    };
    for (let i = 0; i <= k; i++) {
      const hh = i * SP;
      if (hh + GAP > h) break;
      const a = ul - when(hh + GAP);
      if (a < 0) continue;
      const f = 1 - smooth(FADE[0], FADE[1], a), R = Math.min(120, 6 + 16 * a ** 0.65), j = hr(i, 11) - 0.5;
      add(xs[i] + ev.wind * a + j * R * 0.5, ys[i] - 1.5 * a, R, 0.45 * Math.min(1, (1.6 * SP) / R) * f, i);
    }
    // the trench cloud rolling out both ways from the pad
    for (const side of [-1, 1]) for (let m = 0; m < 7; m++) {
      const a = ul - (0.6 + m * 0.45);
      if (a < 0) continue;
      const f = 1 - smooth(FADE[0], FADE[1], a), g = 1 - Math.exp(-a / 2.2);
      add(ev.x + RX * S + side * (10 + (30 + 22 * m) * g) + ev.wind * a, -10 - (6 + 3 * m) * (1 - Math.exp(-a / 3)) - 0.8 * a, 14 + 8 * Math.sqrt(m) + 7 * a ** 0.6, 0.5 * f, 900 + m * 2 + (side > 0 ? 1 : 0));
    }
    if (puffs.length) {
      const [ax, ay] = puffs[0];
      let wx = 0, up = 0, dn = 0, rm = 0;
      for (const [px, py, R] of puffs) { wx = Math.max(wx, Math.abs(px - ax)); up = Math.max(up, ay - py); dn = Math.max(dn, py - ay); rm = Math.max(rm, R * 1.4); }
      out.push({
        id: 'fx.smoke', x: ax, y: ay, z: z + 0.001, s: 1, state: 'plume', kind: 'fx', w: 2 * (wx + rm) + 40, h: Math.max(up / 1.05, dn / 0.4) + 2 * rm + 40,
        fn(g, o) {
          const tint = smokeTint(o.L, 'steam', o.lit || 1);
          for (const [px, py, R, al, i] of puffs) put(g, puffTinted(i * 5 + 3, tint), px - ax, py - ay, R * 1.4, al);
        },
      });
    }

    // the flame lights the pad, the water and its own exhaust while it is low, then is a star going up
    if (!gone) {
      const low = clamp(1 - h / 900), fx = tx - Math.sin(rot) * 40, fy = ty + Math.cos(rot) * 40;
      lights.push({ x: fx, y: fy, z, r: 160 + 300 * low, c: [255, 170, 90], a: burn * (0.5 + 0.7 * low), water: fy > -700 });
    }
    lights.push({ x: ev.x, y: -30, z, r: 240, c: [255, 150, 80], a: 0.5 * burn * clamp(1 - (ul - 6) / 14) });
    return flush(out, lights, null);
  },
};
