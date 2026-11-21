// The world: an endless strip in x, cut into chunks of 3000 units, each generated from (seed, chunk index), so any x
// always shows the same place. Places repeat in seeded runs of eight that always start at the SISO home bay.
// Static things come from chunkItems(); moving traffic (boats, cars, planes) from streams(), a pure function of t.
//
// An item: { id, x, y, z, s, seed, state, flip, kind, bob, dxAt, w, h } in world units (x at its own depth's parallax), or
// { screen: true, z, draw(ctx, view, L, t) } for engine-drawn strips that span depths (land, quay, far coast).

import { rng, hash, clamp, lerp } from '../core/rng.js';
import { sizeOf } from './standin.js';
import { SPACE_Y, LEVELS, D, VIEW_H, HORIZON } from './view.js';
import { landBand, quay, farCoast } from './shore.js';

export const CHUNK = 3000;

// Each place: its mountains, its shore, and its city recipe.
export const PLACES = {
  home: { title: 'The SISO home bay', terrain: 'alpine', shore: 'concrete', city: { span: [1180, 2320], n: 46, peak: 1.0, mix: { 'skyscraper-glass': 3, 'skyscraper-twist': 2, spire: 1, 'skyscraper-deco': 2, office: 4, residential: 5, 'neon-block': 2 } } },
  harbour: { title: 'A harbour city', terrain: 'alpine', shore: 'concrete', city: { span: [700, 2100], n: 44, peak: 0.75, mix: { office: 5, residential: 6, 'skyscraper-deco': 2, 'skyscraper-glass': 2, spire: 1 } }, cranes: true, bridge: true },
  desert: { title: 'A desert coast', terrain: 'desert', shore: 'sand', city: { span: [1000, 1900], n: 26, peak: 0.85, mix: { residential: 6, office: 3, 'skyscraper-twist': 1, 'skyscraper-glass': 2, spire: 1 } } },
  neon: { title: 'The neon district', terrain: 'volcanic', shore: 'concrete', city: { span: [800, 2300], n: 54, peak: 1.15, mix: { 'neon-block': 7, 'skyscraper-twist': 3, 'skyscraper-glass': 3, spire: 1, office: 2 } } },
  opensea: { title: 'Open sea', terrain: null, shore: null, city: null, ships: true },
  arctic: { title: 'An arctic coast', terrain: 'arctic', shore: 'snow', city: { span: [1200, 1800], n: 16, peak: 0.45, mix: { residential: 6, office: 2, 'skyscraper-deco': 1 } } },
};
const RUN = ['harbour', 'opensea', 'desert', 'neon', 'opensea', 'arctic', 'harbour'];

const cache = new Map();
const memo = (k, f) => { let v = cache.get(k); if (!v) { v = f(); cache.set(k, v); if (cache.size > 64) cache.delete(cache.keys().next().value); } return v; };

export function placeAt(seed, i) {
  return memo(`p:${seed}:${i}`, () => {
    const c = Math.floor(i / 8), j = ((i % 8) + 8) % 8;
    let type = 'home';
    if (j > 0) {
      const r = rng(hash(seed, 'run', c));
      const order = RUN.slice();
      for (let a = order.length - 1; a > 0; a--) { const b = Math.floor(r() * (a + 1)); [order[a], order[b]] = [order[b], order[a]]; }
      for (let a = 1; a < order.length; a++) if (order[a] === 'opensea' && order[a - 1] === 'opensea') { const b = (a + 2) % order.length; [order[a], order[b]] = [order[b], order[a]]; }
      type = order[j - 1];
    }
    return { i, type, ...PLACES[type], x0: i * CHUNK, x1: (i + 1) * CHUNK };
  });
}
export const chunkOf = (x) => Math.floor(x / CHUNK);

// y for a thing at depth z that should sit at screen fraction f (0 top, 1 bottom) when the camera is at camY.
const yAt = (f, z, camY) => camY + ((f - HORIZON) * VIEW_H - D(z)) / z;

// Fit an asset to a height in world units: the scale to pass.
const fitH = (id, h) => h / sizeOf(id)[1];

export function chunkItems(seed, i) {
  return memo(`c:${seed}:${i}`, () => build(seed, i));
}

function build(seed, i) {
  const P = placeAt(seed, i);
  const r = rng(hash(seed, 'chunk', i));
  const x0 = P.x0;
  const items = [];
  const add = (it) => { const o = { s: 1, y: 0, seed: 0, flip: false, state: undefined, ...it }; items.push(o); return o; };

  // FAR: two ridges of mountains stepping back. The farthest is taller and paler, the nearer lower and darker.
  const terrainAt = (x) => placeAt(seed, chunkOf(x)).terrain;
  for (const [z, hScreen, offs] of [[0.17, [52, 82], [0, 1500]], [0.29, [26, 44], [700, 2200]]]) {
    for (const o of offs) {
      const x = x0 + o + r.range(-200, 200);
      const terr = terrainAt(x) || (z < 0.2 && r() < 0.5 ? placeAt(seed, i - 1).terrain : null);
      if (!terr) continue;
      const id = `nature.mountains-${terr}`;
      const hs = r.range(hScreen[0], hScreen[1]);
      add({ id, x, z, s: hs / (sizeOf(id)[1] * z), seed: r.int(0, 999), flip: r() < 0.5, kind: 'mountain' });
    }
  }

  // MID: a far coast with its strip of tiny buildings and lights (not on open sea).
  if (P.shore) add({ fn: farCoast(seed, i, P.shore, 0.5), x: x0 + CHUNK / 2, y: 0, z: 0.5, w: CHUNK, h: 40, kind: 'coast' });

  // Floating islands. The home bay has the big SISO island with the tower and the shield over the city. They hang in
  // the upper third, as in the options (the home island's underside about a quarter of the way down the frame).
  if (P.type === 'home') {
    // one dominant hero island (the owner's art direction, 20 Nov: "one island clearly bigger than the rest"), with
    // satellites on their own depths: a pair behind it that drift together, touch and spring apart, and one in front
    const isl = add({ id: 'islands.siso-home', x: x0 + 1050, y: -430, z: 0.86, s: 1.5, seed: 0, kind: 'island', bob: 0.6, home: true });
    const pair = (t) => 75 + 150 * Math.abs(Math.sin((t * Math.PI) / 38));   // half the gap: 75 is touching
    add({ id: 'islands.siso-small', x: x0 + 520, y: -640, z: 0.74, s: 0.75, seed: 1, kind: 'island', bob: 1, dxAt: (t) => -pair(t) });
    add({ id: 'islands.siso-small', x: x0 + 520, y: -655, z: 0.74, s: 0.75, seed: 3, kind: 'island', bob: 1, dxAt: (t) => pair(t) });
    add({ id: 'islands.siso-small', x: x0 + 1620, y: -560, z: 0.89, s: 0.62, seed: 5, kind: 'island', bob: 1.2, dxAt: (t) => 40 * Math.sin(t * 0.07) });
    isl.carry = ['city.lion-ring', 'city.tower-siso', 'defence.shield-dome'];
    add({ id: 'islands.enemy', x: x0 + 2520, y: -520, z: 0.78, seed: 1, kind: 'island', bob: 1 });
  } else if (P.type === 'opensea' || r() < 0.5) {
    const enemy = r() < 0.6;
    add({ id: enemy ? 'islands.enemy' : 'islands.siso-small', x: x0 + r.range(600, 2400), y: -r.range(440, 580), z: r.range(0.66, 0.8), seed: r.int(0, 9), kind: 'island', bob: 1, s: enemy ? 0.8 : 1 });
  }
  // a small far island now and then, never over the home bay (pass 3: the 60 s strip had three to five islands in every
  // frame, where the options show one or two). The draws are made as before so every later placement stays put.
  const pSmall = r();
  if (pSmall < 0.6) {
    const o = { id: r() < 0.5 ? 'islands.enemy-small' : 'islands.siso-small', x: x0 + r.range(200, 2800), y: -r.range(580, 740), z: r.range(0.48, 0.6), seed: r.int(0, 9), kind: 'island', bob: 1, s: 0.8 };
    if (pSmall < 0.3 && P.type !== 'home') add(o);
  }

  // MAIN: the city on its shore.
  if (P.city) city(P, r, add, seed, i);
  if (P.ships) {
    // open sea: big ships at anchor or under way in the middle distance
    add({ id: r() < 0.5 ? 'sea.warship' : 'sea.cargo', x: x0 + r.range(500, 1500), y: 0, z: 1.02, seed: r.int(0, 9), kind: 'boat', reflect: true, flip: r() < 0.5, s: 0.55 });
    if (r() < 0.6) add({ id: 'sea.cargo', x: x0 + r.range(1800, 2700), y: 0, z: 0.95, seed: r.int(0, 9), kind: 'boat', reflect: true, s: 0.5 });
  }

  // CLOUDS LEVEL: banks of cloud and islands hanging among them (out of view from the ground).
  const cy = LEVELS[1];
  for (let k = 0; k < 4; k++) {
    const z = r.range(0.5, 0.95);
    add({ id: 'nature.cloud-bank', x: x0 + k * 800 + r.range(-200, 200), y: yAt(r.range(0.55, 0.95), z, cy), z, seed: r.int(0, 99), kind: 'cloud', s: r.range(0.7, 1.2) });
  }
  if (r() < 0.75) {
    const z = r.range(0.7, 0.9), home = r() < 0.35;
    const it = add({ id: home ? 'islands.siso-home' : r() < 0.5 ? 'islands.siso-small' : 'islands.enemy-small', x: x0 + r.range(400, 2600), y: yAt(r.range(0.42, 0.6), z, cy), z, seed: r.int(0, 9), kind: 'island', bob: 1 });
    if (home) it.carry = ['city.tower-siso', 'defence.shield-dome'];
  }

  // SPACE: the moon with its city, the palace, stations and satellites.
  const sy = LEVELS[2];
  if (((i % 3) + 3) % 3 === 0) {
    const z = 0.42;
    const m = add({ id: 'space.moon', x: x0 + 900, y: yAt(0.62, z, sy), z, seed: 0, kind: 'space', s: 0.75 });
    m.carry = ['space.moon-city'];
  }
  if (((i % 4) + 4) % 4 === 2) add({ id: 'space.palace', x: x0 + 1900, y: yAt(0.58, 0.72, sy), z: 0.72, seed: 0, kind: 'space', state: 'idle' });
  add({ id: 'space.station', x: x0 + r.range(200, 2800), y: yAt(r.range(0.3, 0.55), 0.6, sy), z: 0.6, seed: r.int(0, 9), kind: 'space' });
  for (let k = 0; k < 2; k++) add({ id: 'space.satellite', x: x0 + r.range(0, 3000), y: yAt(r.range(0.15, 0.6), 0.85, sy), z: r.range(0.75, 0.95), seed: r.int(0, 9), kind: 'space' });

  items.sort((a, b) => a.z - b.z);
  return { place: P, items };
}

// The city: a downtown that peaks in the middle of its span, low-rise to the ends, a back row and a front row.
function city(P, r, add, seed, i) {
  const C = P.city, x0 = P.x0;
  const [a, b] = C.span;
  const types = Object.entries(C.mix).flatMap(([k, n]) => Array(n).fill(k));
  const tall = new Set(['skyscraper-glass', 'skyscraper-twist', 'spire', 'skyscraper-deco']);
  // land under the city, from the far bank to the quay
  add({ screen: true, z: 0.93, x0: x0 + a - 140, x1: x0 + b + 140, draw: landBand(seed, i, P.shore) });
  let n = 0;
  for (const row of [0, 1]) {
    const z = row === 0 ? 0.955 : 1.0;
    const count = Math.round(C.n * (row === 0 ? 0.45 : 0.55));
    for (let k = 0; k < count; k++) {
      const u = (k + r.range(0.1, 0.9)) / count;
      const x = x0 + lerp(a, b, u);
      const centre = Math.exp(-(((u - 0.5) / 0.22) ** 2));
      let type = r.pick(types);
      if (!tall.has(type) && centre > 0.7 && r() < 0.5 && row === 0) type = r.pick(['skyscraper-glass', 'skyscraper-twist', 'skyscraper-deco']);
      const id = `city.${type}`;
      const isTall = tall.has(type);
      const H = (isTall ? lerp(70, 175, centre) * r.range(0.7, 1.1) : lerp(22, 62, centre) * r.range(0.6, 1.2)) * C.peak * (row === 0 ? 1.05 : 0.75);
      add({ id, x, z, s: fitH(id, Math.max(14, H)), seed: hash(seed, i, n) % 997, flip: r() < 0.5, kind: 'building', key: `${i}:${n}` });
      n++;
    }
  }
  // the hero spire of the home bay
  if (P.type === 'home') add({ id: 'city.spire', x: x0 + 1760, z: 0.965, s: fitH('city.spire', 182), seed: 3, kind: 'building', key: `${i}:hero` });
  if (P.type === 'neon') add({ id: 'city.skyscraper-twist', x: x0 + 1500, z: 0.965, s: fitH('city.skyscraper-twist', 200), seed: 5, kind: 'building', key: `${i}:hero` });
  // cranes and a bridge in the harbour
  if (P.cranes) for (let k = 0; k < 3; k++) add({ id: 'city.crane', x: x0 + b + 120 + k * 70, z: 1.01, s: fitH('city.crane', 70), seed: k, flip: k % 2 === 1, kind: 'crane', state: 'build' });
  if (P.bridge) add({ id: 'city.bridge', x: x0 + a - 520, z: 0.99, s: fitH('city.bridge', 60), seed: 0, kind: 'bridge' });
  // the quay along the front, with the coast road
  add({ screen: true, z: 1.035, x0: x0 + a - 140, x1: x0 + b + 140, draw: quay(seed, i, P.shore), road: [x0 + a - 120, x0 + b + 120] });
}

// Traffic, a pure function of t: boats in lanes, cars on the coast roads, planes in the air lanes.
const LANES = [
  { z: 1.07, v: 7, S: 2300, p: 0.55, types: ['sea.ferry', 'sea.cargo', 'sea.yacht', 'sea.ferry'], s: 0.55, ph: 300 },
  { z: 1.18, v: 16, S: 1150, p: 0.6, types: ['sea.speedboat', 'sea.yacht', 'sea.speedboat', 'sea.ferry'], s: 0.8, ph: 0 },
  { z: 1.29, v: -22, S: 1700, p: 0.5, types: ['sea.speedboat', 'sea.yacht', 'sea.speedboat'], s: 0.9, ph: 700 },
  { z: 1.38, v: 34, S: 2900, p: 0.4, types: ['sea.speedboat'], s: 1, ph: 1300 },
];
const AIR = [
  { z: 0.62, y: -780, v: 150, S: 16000, p: 0.7, id: 'air.airliner', s: 0.5 },
  { z: 0.8, y: -2150, v: -170, S: 11000, p: 0.6, id: 'air.airliner', s: 0.8 },
];

export function streams(seed, t, view) {
  const out = [];
  LANES.forEach((ln, li) => {
    const [lo, hi] = view.span(ln.z, 500);
    const off = ln.v * t + ln.ph;
    for (let n = Math.floor((lo - off) / ln.S); n <= Math.ceil((hi - off) / ln.S); n++) {
      const h = hash(seed, 'lane', li, n);
      if ((h % 1000) / 1000 > ln.p) continue;
      const r = rng(h);
      const id = r.pick(ln.types);
      const x = n * ln.S + off + r.range(-0.3, 0.3) * ln.S;
      out.push({ id, x, y: 0, z: ln.z + r.range(-0.02, 0.02), s: ln.s * r.range(0.85, 1.1), seed: r.int(0, 9), flip: ln.v < 0, kind: 'boat', reflect: true, speed: Math.abs(ln.v), wake: true });
    }
  });
  AIR.forEach((ln, li) => {
    const [lo, hi] = view.span(ln.z, 400);
    const off = ln.v * t;
    for (let n = Math.floor((lo - off) / ln.S); n <= Math.ceil((hi - off) / ln.S); n++) {
      const h = hash(seed, 'air', li, n);
      if ((h % 1000) / 1000 > ln.p) continue;
      const r = rng(h);
      out.push({ id: ln.id, x: n * ln.S + off, y: ln.y + r.range(-80, 80), z: ln.z, s: ln.s, seed: r.int(0, 9), flip: ln.v < 0, kind: 'air' });
    }
  });
  // cars on the coast roads of the cities in view
  const [lo, hi] = view.span(1.035, 50);
  for (let c = chunkOf(lo); c <= chunkOf(hi); c++) {
    const ch = chunkItems(seed, c);
    for (const it of ch.items) {
      if (!it.road) continue;
      const [ra, rb] = it.road;
      for (const [dir, gap, sp, yo] of [[1, 46, 26, -2.2], [-1, 58, 21, -1.2]]) {
        const off = dir * sp * t;
        for (let n = Math.floor((Math.max(ra, lo) - off) / gap); n <= Math.ceil((Math.min(rb, hi) - off) / gap); n++) {
          const h = hash(seed, 'car', c, dir, n);
          if (h % 10 < 4) continue;
          const x = n * gap + off + ((h >> 8) % 20);
          if (x < ra || x > rb) continue;
          out.push({ id: 'city.car', x, y: yo, z: 1.035, s: 1, seed: h % 97, flip: dir < 0, kind: 'car' });
        }
      }
    }
  }
  return out;
}

// Every item the view can see: static chunks plus traffic. Depth-sorted, far first.
export function visibleItems(seed, t, view) {
  const [lo, hi] = view.span(0.15, 2600);
  const out = [];
  for (let c = chunkOf(lo); c <= chunkOf(hi); c++) for (const it of chunkItems(seed, c).items) out.push(it);
  for (const it of streams(seed, t, view)) out.push(it);
  return out;
}
export { SPACE_Y, clamp };
