// The light at a moment: one sun (or moon) for the whole frame. Every asset shades itself from this.
// lightAt(hour, { overcast, altitude }) -> L. Hours run 0..24 and wrap.

import { clamp, lerp, smooth } from './rng.js';

// Keyframes: hour, sky top, sky horizon, key light colour, key strength, ambient, haze, windows lit, neon, stars.
const K = [
  { h: 0.0,  top: [5, 8, 19],     hor: [22, 29, 52],    key: [150, 172, 214], k: 0.22, amb: [30, 36, 56],    haze: [24, 32, 54],    win: 0.82, neon: 1.0, stars: 1.0 },
  { h: 4.6,  top: [9, 13, 31],    hor: [40, 44, 74],    key: [150, 172, 214], k: 0.2,  amb: [36, 40, 62],    haze: [38, 42, 68],    win: 0.62, neon: 0.9, stars: 0.9 },
  { h: 5.6,  top: [30, 42, 86],   hor: [208, 126, 98],  key: [255, 150, 92],  k: 0.45, amb: [78, 72, 96],    haze: [186, 132, 124], win: 0.45, neon: 0.6, stars: 0.35 },
  { h: 6.6,  top: [66, 106, 168], hor: [248, 188, 140], key: [255, 190, 122], k: 0.9,  amb: [126, 118, 130], haze: [228, 188, 160], win: 0.18, neon: 0.2, stars: 0.0 },
  { h: 8.0,  top: [76, 138, 210], hor: [194, 212, 228], key: [255, 236, 206], k: 1.0,  amb: [148, 158, 176], haze: [190, 206, 224], win: 0.06, neon: 0.0, stars: 0.0 },
  { h: 12.0, top: [54, 120, 204], hor: [174, 202, 230], key: [255, 250, 238], k: 1.0,  amb: [164, 174, 192], haze: [184, 204, 228], win: 0.04, neon: 0.0, stars: 0.0 },
  { h: 16.0, top: [62, 124, 202], hor: [198, 208, 222], key: [255, 238, 212], k: 1.0,  amb: [158, 162, 176], haze: [198, 206, 220], win: 0.06, neon: 0.0, stars: 0.0 },
  { h: 17.6, top: [72, 104, 168], hor: [250, 194, 132], key: [255, 184, 102], k: 0.95, amb: [148, 120, 112], haze: [236, 182, 134], win: 0.24, neon: 0.25, stars: 0.0 },
  { h: 18.5, top: [50, 62, 118],  hor: [246, 122, 72],  key: [255, 122, 62],  k: 0.7,  amb: [108, 84, 98],   haze: [208, 118, 96],  win: 0.58, neon: 0.6, stars: 0.05 },
  { h: 19.3, top: [22, 32, 72],   hor: [92, 82, 122],   key: [170, 160, 210], k: 0.25, amb: [58, 60, 94],    haze: [66, 70, 106],   win: 0.86, neon: 1.0, stars: 0.4 },
  { h: 21.0, top: [7, 11, 27],    hor: [28, 34, 62],    key: [150, 172, 214], k: 0.22, amb: [32, 38, 60],    haze: [26, 34, 58],    win: 0.9,  neon: 1.0, stars: 0.9 },
  { h: 24.0, top: [5, 8, 19],     hor: [22, 29, 52],    key: [150, 172, 214], k: 0.22, amb: [30, 36, 56],    haze: [24, 32, 54],    win: 0.82, neon: 1.0, stars: 1.0 },
];

const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// The grade over the keyframes. 'ember' (the default, the owner's art direction of 20 Nov: black and ember, "more
// futuristic"): as the sun goes, the sky goes to black with an ember band on the horizon, the haze to smoke, the
// ambient warm; by day it does nothing. 'blue' is the earlier navy night. setGrade() picks it for the page (?grade=).
let GRADE = 'ember';
export const setGrade = (g) => { GRADE = g === 'blue' ? 'blue' : 'ember'; };
const EMBER = { top: [5, 4, 8], hor: [104, 36, 16], haze: [46, 24, 20], amb: [56, 36, 34], key: [255, 168, 116] };

export function lightAt(hour = 12, { overcast = 0, altitude = 0 } = {}) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < K.length - 2 && K[i + 1].h <= h) i++;
  const a = K[i], b = K[i + 1];
  const f = smooth(0, 1, (h - a.h) / (b.h - a.h));
  const L = {
    hour: h,
    sky: { top: mixc(a.top, b.top, f), horizon: mixc(a.hor, b.hor, f) },
    key: mixc(a.key, b.key, f),
    keyAmt: lerp(a.k, b.k, f),
    ambient: mixc(a.amb, b.amb, f),
    haze: mixc(a.haze, b.haze, f),
    windows: lerp(a.win, b.win, f),
    neon: lerp(a.neon, b.neon, f),
    stars: lerp(a.stars, b.stars, f),
  };
  const dayT0 = (h - 5.6) / 13.2, elev0 = Math.sin(Math.PI * clamp(dayT0, -0.2, 1.2));
  if (GRADE === 'ember') {
    const night0 = 1 - smooth(-0.15, 0.2, elev0), low = clamp(1 - Math.abs(elev0 - 0.05) / 0.25);
    const e = 0.86 * smooth(0.25, 1, night0) + 0.3 * low;
    L.sky.top = mixc(L.sky.top, EMBER.top, e);
    L.sky.horizon = mixc(L.sky.horizon, EMBER.hor, e * 0.9);
    L.haze = mixc(L.haze, EMBER.haze, e * 0.85);
    L.ambient = mixc(L.ambient, EMBER.amb, e * 0.7);
    L.key = mixc(L.key, EMBER.key, e * 0.45);
  }
  // Sun across the sky in screen fractions: rises at the left around 05:40, sets at the right around 18:40.
  const dayT = (h - 5.6) / 13.2;
  L.sun = { x: lerp(0.08, 0.92, dayT), elev: Math.sin(Math.PI * clamp(dayT, -0.2, 1.2)), up: dayT > 0 && dayT < 1 };
  L.sun.y = 1 - clamp(L.sun.elev, -0.2, 1); // 0 = top of the sky, 1 = the horizon
  const nightT = (((h - 18.4) % 24) + 24) % 24 / 11.4;
  L.moon = { x: lerp(0.1, 0.9, nightT), elev: Math.sin(Math.PI * clamp(nightT, 0, 1)), up: nightT > 0 && nightT < 1 };
  L.night = 1 - smooth(-0.15, 0.2, L.sun.elev); // 0 by day, 1 at night
  L.golden = clamp(1 - Math.abs(L.sun.elev - 0.12) / 0.3) * (L.sun.up ? 1 : 0.4); // warm low sun
  // Which side the key light comes from, on screen: -1 from the left, 1 from the right.
  const src = L.sun.up && L.sun.elev > -0.05 ? L.sun : L.moon;
  L.side = src.x < 0.5 ? -1 : 1;
  L.keyHeight = clamp(src.elev, 0.05, 1); // low light rakes, high light flattens
  if (overcast > 0) {
    const grey = (c) => { const m = (c[0] + c[1] + c[2]) / 3; return mixc(c, [m, m, m * 1.04], 0.7 * overcast); };
    L.keyAmt *= 1 - 0.7 * overcast;
    L.ambient = mixc(L.ambient, grey(L.haze), 0.4 * overcast);
    L.haze = grey(L.haze); L.sky.top = grey(L.sky.top); L.sky.horizon = grey(L.sky.horizon);
    L.stars *= 1 - overcast;
  }
  L.overcast = overcast;
  // Altitude 0 at sea level, 1 in space: the sky darkens and the stars come out whatever the hour.
  L.space = clamp(altitude);
  if (L.space > 0) {
    const s = smooth(0.15, 0.9, L.space);
    L.sky.top = mixc(L.sky.top, [2, 3, 8], s);
    L.sky.horizon = mixc(L.sky.horizon, [10, 14, 30], s * 0.8);
    L.haze = mixc(L.haze, [8, 10, 20], s);
    L.stars = Math.max(L.stars, s);
    L.ambient = mixc(L.ambient, [40, 44, 60], s);
  }
  // a cache key for baked bodies: it moves every quarter hour and every tenth of the climb to space
  L.qh = h * 4; L.qs = L.space * 10; L.qo = overcast * 100;
  L.q = Math.round(L.qh) / 4 + L.qo + Math.round(L.qs) * 1000;
  return L;
}

// The light for one body, its key moved by f (0..1, fixed per body). Every body still re-bakes once a quarter hour,
// but at its own moment, so the bodies on screen re-bake a few at a time instead of all in one frame (a visible stall).
// The light itself is the same; only the key differs. Copies are kept per light and per f, so a frame makes at most 64.
const KEYED = new WeakMap();
export function keyedLight(L, f) {
  if (!L || L.qh === undefined) return L;
  const b = Math.min(63, Math.max(0, Math.floor(f * 64)));
  if (b === 0) return L;
  let m = KEYED.get(L);
  if (!m) KEYED.set(L, (m = []));
  return m[b] || (m[b] = { ...L, q: Math.round(L.qh + b / 64) / 4 + L.qo + Math.round(L.qs + b / 64) * 1000 });
}
