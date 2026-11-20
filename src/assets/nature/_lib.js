// Helpers the nature, islands and city families share: a fast seeded noise, a per-pixel relief that is baked once and
// relit per quarter hour with the same light model as shade(), mountain ranges, and soft billowed clouds.
// Pure functions of their inputs: the caches only save work, they never change what is drawn.

import { rng, clamp, lerp, smooth } from '../../core/rng.js';
import { css, mix, scale } from '../../core/paint.js';

// ---------------------------------------------------------------- noise
// Gradient noise on a seeded permutation table. rng.js noise2 hashes through strings (fine for a few samples a frame,
// too slow for a bake of a million pixels); this one is ~40x faster and just as deterministic.
const NOISES = new Map();
export function noiseOf(seed = 0) {
  const k = seed | 0;
  if (NOISES.has(k)) return NOISES.get(k);
  const r = rng(k * 7919 + 101);
  const P = new Uint8Array(512), GX = new Float32Array(256), GY = new Float32Array(256), V = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; const a = r() * Math.PI * 2; GX[i] = Math.cos(a); GY[i] = Math.sin(a); V[i] = r() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  // 2D gradient noise, about -1..1
  const n2 = (x, y) => {
    const xf = Math.floor(x), yf = Math.floor(y);
    const X = xf & 255, Y = yf & 255, fx = x - xf, fy = y - yf;
    const aa = P[P[X] + Y], ab = P[P[X] + Y + 1], ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
    const u = fade(fx), v = fade(fy);
    const x1 = lerp(GX[aa] * fx + GY[aa] * fy, GX[ba] * (fx - 1) + GY[ba] * fy, u);
    const x2 = lerp(GX[ab] * fx + GY[ab] * (fy - 1), GX[bb] * (fx - 1) + GY[bb] * (fy - 1), u);
    return lerp(x1, x2, v) * 1.42;
  };
  // 1D value noise, -1..1
  const n1 = (x) => {
    const xf = Math.floor(x), X = xf & 255, f = x - xf, u = f * f * (3 - 2 * f);
    return lerp(V[P[X]], V[P[X + 1]], u);
  };
  const fbm = (x, y, oct = 4, lac = 2.03, gain = 0.5) => {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * n2(x * f + o * 17.3, y * f - o * 9.1); n += a; a *= gain; f *= lac; }
    return s / n;
  };
  // ridged: sharp crests at the zero crossings, 0..1 (1 on a crest)
  const ridged = (x, y, oct = 4, lac = 2.1, gain = 0.5) => {
    let s = 0, a = 0.5, f = 1, n = 0, w = 1;
    for (let o = 0; o < oct; o++) {
      let v = 1 - Math.abs(n2(x * f + o * 31.7, y * f + o * 7.7)); v *= v; v *= w; w = clamp(v * 1.6);
      s += a * v; n += a; a *= gain; f *= lac;
    }
    return s / n;
  };
  const fbm1 = (x, oct = 4) => { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * n1(x * f + o * 13.1); n += a; a *= 0.5; f *= 2.07; } return s / n; };
  // turbulence: rounded bumps with creases between them (billows, cauliflower), 0..~1
  const turb = (x, y, oct = 4, gain = 0.5) => { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * Math.abs(n2(x * f + o * 5.3, y * f - o * 3.9)); n += a; a *= gain; f *= 2.11; } return s / n * 1.6; };
  // caps: a surface of overlapping sphere caps (one seeded sphere per cell, several sizes): cumulus billows, 0..~1
  const cap1 = (x, y) => {
    const xf = Math.floor(x), yf = Math.floor(y); let best = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xf + i, cy = yf + j, hh = P[(P[cx & 255] + (cy & 255)) & 511];
      const px = cx + 0.5 + 0.38 * GX[hh], py = cy + 0.5 + 0.38 * GY[hh], R = 0.78 + 0.22 * V[hh];
      const d2 = (x - px) * (x - px) + (y - py) * (y - py);
      if (d2 < R * R) { // a soft dome (no vertical rim), merged with a smooth max so billows flow into each other
        const v = Math.pow(1 - d2 / (R * R), 0.7) * (0.75 + 0.25 * R), hk = clamp(0.5 + 0.5 * (v - best) / 0.16);
        best = best + (v - best) * hk + 0.16 * hk * (1 - hk);
      }
    }
    return best;
  };
  const caps = (x, y, oct = 3, gain = 0.45) => { let s = 0, a = 1, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * cap1(x * f + o * 7.7, y * f + o * 3.3); n += a; a *= gain; f *= 2.2; } return s / n; };
  const out = { n1, n2, fbm, ridged, fbm1, turb, caps };
  NOISES.set(k, out);
  return out;
}

// ---------------------------------------------------------------- small LRU caches
export function lru(limit) {
  const m = new Map();
  return {
    get(k, make) {
      let v = m.get(k);
      if (v !== undefined) { m.delete(k); m.set(k, v); return v; }
      v = make(); m.set(k, v);
      if (m.size > limit) m.delete(m.keys().next().value);
      return v;
    },
  };
}
export const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

// ---------------------------------------------------------------- relief: bake once, light many times
// bakeRelief({ w, h, res, sample(x, y, out), material(x, y, n, out) })
//   sample: set out.a (0..1 coverage), out.d (depth toward the camera, world units; ridges high, gullies low),
//           out.id (surface id; normals never mix two ids), out.hz (0..1 haze inside the asset)
//   material: given n = { x, y, z } (x right, y up, z to camera) set out.r, out.g, out.b (albedo 0..255),
//             out.cav (0..1 crevice darkening), out.er, out.eg, out.eb (emissive 0..255), out.ek (emissive kind 0..3)
export function bakeRelief({ w, h, res, sample, material }) {
  const W = Math.max(2, Math.ceil(w * res)), H = Math.max(2, Math.ceil(h * res)), N = W * H;
  const A = new Uint8Array(N), D = new Float32Array(N), ID = new Uint8Array(N), HZ = new Uint8Array(N);
  const U = new Float32Array(N), V = new Float32Array(N), X3 = new Float32Array(N);
  const s = { a: 0, d: 0, id: 1, hz: 0, u: 0, v: 0, x3: 0 };
  for (let j = 0; j < H; j++) {
    const y = -h + (j + 0.5) / res;
    for (let i = 0; i < W; i++) {
      const x = -w / 2 + (i + 0.5) / res;
      s.a = 0; s.d = 0; s.id = 1; s.hz = 0; s.u = 0; s.v = 0; s.x3 = 0;
      sample(x, y, s);
      const k = j * W + i;
      A[k] = clamp(s.a) * 255; D[k] = s.d; ID[k] = s.id; HZ[k] = clamp(s.hz) * 255; U[k] = s.u; V[k] = s.v; X3[k] = s.x3;
    }
  }
  const NX = new Int8Array(N), NY = new Int8Array(N), NZ = new Int8Array(N);
  const AL = new Uint8Array(N * 3), CV = new Uint8Array(N), EM = new Uint8Array(N * 3), EK = new Uint8Array(N);
  const m = { r: 0, g: 0, b: 0, cav: 0, er: 0, eg: 0, eb: 0, ek: 0 }, n = { x: 0, y: 0, z: 1 };
  for (let j = 0; j < H; j++) {
    const y = -h + (j + 0.5) / res;
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (A[k] === 0) continue;
      const id = ID[k];
      const kl = i > 0 && ID[k - 1] === id && A[k - 1] ? k - 1 : k, kr = i < W - 1 && ID[k + 1] === id && A[k + 1] ? k + 1 : k;
      const ku = j > 0 && ID[k - W] === id && A[k - W] ? k - W : k, kd = j < H - 1 && ID[k + W] === id && A[k + W] ? k + W : k;
      const dx = (D[kr] - D[kl]) * res / Math.max(1, (kr - kl)), dy = (D[kd] - D[ku]) * res / Math.max(1, (kd - ku) / W);
      // depth grows toward the camera; screen y grows down. normal = (-dD/dx, +dD/dy_screen, 1)
      let nx = -dx, ny = dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      NX[k] = nx * 127; NY[k] = ny * 127; NZ[k] = nz * 127;
      const x = -w / 2 + (i + 0.5) / res;
      n.x = nx; n.y = ny; n.z = nz;
      m.r = 128; m.g = 128; m.b = 128; m.cav = 0; m.er = 0; m.eg = 0; m.eb = 0; m.ek = 0;
      m.u = U[k]; m.v = V[k]; m.x3 = X3[k]; m.hz = HZ[k] / 255;
      material(x, y, n, m, id, D[k]);
      HZ[k] = clamp(m.hz) * 255;
      AL[k * 3] = clamp(m.r, 0, 255); AL[k * 3 + 1] = clamp(m.g, 0, 255); AL[k * 3 + 2] = clamp(m.b, 0, 255);
      CV[k] = clamp(m.cav) * 255; EM[k * 3] = clamp(m.er, 0, 255); EM[k * 3 + 1] = clamp(m.eg, 0, 255); EM[k * 3 + 2] = clamp(m.eb, 0, 255);
      EK[k] = m.ek;
    }
  }
  return { w, h, res, W, H, A, NX, NY, NZ, AL, CV, EM, EK, HZ };
}

// lightRelief(rel, L, lit, { em: [k0, k1, k2, k3], rim, hazeTint }) -> canvas W x H.
// The same light as shade(): ambient * 0.78 plus the key colour by how much the surface faces the key, a little sky
// light from above, a bright rim where a sun-facing surface meets the sky, and the asset's own inner haze.
export function lightRelief(rel, L, lit, { em = [1, 1, 1, 1], rim = 1, haze = null, ambientUp = 0.45, thin = 0, wrap = 0.12, amb = null, front = 0.42 } = {}) {
  const { W, H, A, NX, NY, NZ, AL, CV, EM, EK, HZ } = rel;
  const c = canvasOf(W, H), g = c.getContext('2d');
  const img = g.createImageData(W, H), px = img.data;
  const kh = L.keyHeight, e = (0.06 + 0.5 * kh) * Math.PI / 2; // a little lower than true: modelling over flatness
  let lx = lit * Math.cos(e) * 0.9, ly = Math.sin(e), lz = front; const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;
  const kAmt = L.keyAmt * (0.55 + 0.45 * kh);
  const k0 = L.key[0] / 255, k1 = L.key[1] / 255, k2 = L.key[2] / 255;
  const AM = amb || L.ambient, a0 = AM[0] / 255 * 0.78, a1 = AM[1] / 255 * 0.78, a2 = AM[2] / 255 * 0.78;
  const hzC = haze || mix(L.haze, L.sky.horizon, 0.35);
  const rimK = rim * (0.35 + 0.9 * L.golden) * L.keyAmt;
  const rc = [L.key[0] * rimK, L.key[1] * rimK, L.key[2] * rimK];
  const rimStep = Math.max(1, Math.round(rel.res * 1.6));
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i, a = A[k];
      if (!a) continue;
      const nx = NX[k] / 127, ny = NY[k] / 127, nz = NZ[k] / 127;
      const dot = nx * lx + ny * ly + nz * lz;
      let f = clamp((dot + wrap) / (1 + wrap)); f = f * kAmt * (1 + (dot > 0.6 ? 0.25 * (1 - kh) : 0));
      const cav = 1 - CV[k] / 255;
      const up = 1 - ambientUp + ambientUp * (0.5 + 0.5 * ny);
      const occ = cav * cav;
      const r0 = AL[k * 3] / 255, g0 = AL[k * 3 + 1] / 255, b0 = AL[k * 3 + 2] / 255;
      let r = 255 * r0 * (a0 * up * occ + k0 * f * (0.35 + 0.65 * cav));
      let gg = 255 * g0 * (a1 * up * occ + k1 * f * (0.35 + 0.65 * cav));
      let b = 255 * b0 * (a2 * up * occ + k2 * f * (0.35 + 0.65 * cav));
      // rim: a sun-facing pixel with sky next to it toward the light
      if (rimK > 0.02 && nx * lit > -0.1) {
        const ii = i + lit * rimStep, jj = j - rimStep;
        const out = ii < 0 || ii >= W || jj < 0 || !A[jj * W + ii] || !A[j * W + ii] || !A[jj * W + i];
        if (out) { const t = 0.55 + 0.45 * clamp(nx * lit + ny); r += rc[0] * t * r0 * 1.4; gg += rc[1] * t * g0 * 1.4; b += rc[2] * t * b0 * 1.4; }
      }
      if (thin) { // thin edges let the key light through (the silver lining of a cloud)
        const tk = thin * Math.sqrt(1 - a / 255) * (0.45 + 0.55 * clamp(nx * lit + 0.3)) * L.keyAmt;
        r += L.key[0] * tk; gg += L.key[1] * tk; b += L.key[2] * tk;
      }
      const ek = EK[k];
      if (ek) { const s = em[ek] || 0; r += EM[k * 3] * s; gg += EM[k * 3 + 1] * s; b += EM[k * 3 + 2] * s; }
      const hz = HZ[k] / 255;
      if (hz) { r = lerp(r, hzC[0], hz); gg = lerp(gg, hzC[1], hz); b = lerp(b, hzC[2], hz); }
      const p = k * 4;
      px[p] = r; px[p + 1] = gg; px[p + 2] = b; px[p + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// The bake resolution for a draw scale: few tiers, so a cache serves many frames.
export const resFor = (scale, cap = 2) => Math.min(cap, scale >= 1.6 ? 2 : scale >= 0.9 ? 1 : scale >= 0.45 ? 0.6 : 0.35);

// ---------------------------------------------------------------- mountain ranges
// A range is several ridges stepping back. Each layer: { base (0..1 of h from the bottom where its foot sits),
// top (0..1 of h, highest peak), rough, freq, haze }. Heights fall to 0 at both ends so ranges join.
export function rangeLayers(seed, w, h, layers, { endFall = 0.07, peakiness = 1.4, massifs = 2.6, jag = 0.5 } = {}) {
  const N = noiseOf(seed);
  return layers.map((ly, li) => {
    const off = li * 913.7 + seed * 37.1;
    const fr = ly.freq || 1, jg = ly.jag == null ? jag : ly.jag;
    const H = (x) => {
      const u = x / w + 0.5; // 0..1 across
      const env = smooth(0, endFall, u) * smooth(0, endFall, 1 - u);
      // a few massifs carry the height; peaks ride on them; saddles fall low between
      const big = smooth(-0.42, 0.5, N.fbm1(u * massifs * fr + off, 3)) * 0.9 + 0.1;
      const pk = N.ridged(u * 9 * fr + off, off * 0.13, 5, 2.2, 0.48);
      const fine = N.fbm1(u * 60 * fr + off * 2, 3);
      const v = Math.pow(big, peakiness) * (1 - jg + jg * pk) + 0.03 * fine;
      return env * (ly.base * h + (ly.top - ly.base) * h * clamp(v * 1.1));
    };
    return { ...ly, H, li };
  });
}

// ---------------------------------------------------------------- soft billowed clouds (vector, cached per light)
// billows: [{ x, y, r, depth }] in the cloud's frame (y up negative). Lit from the key, shadowed with the ambient.
export function cloudColours(L, { warmth = 1 } = {}) {
  const k = L.keyAmt;
  const lit = mix(scale(L.key, 0.62 + 0.42 * k), [255, 255, 255], 0.12 * (1 - L.golden) * (1 - L.night));
  const litW = mix(lit, mix(lit, [255, 160, 120], 0.35), L.golden * warmth);
  const shadow = mix(scale(L.ambient, 0.92), L.sky.top, 0.28);
  const base = mix(scale(L.ambient, 0.72), L.sky.top, 0.18);
  const mid = mix(litW, shadow, 0.55);
  return { lit: litW, mid, shadow, base };
}

export function paintBillows(g, billows, L, lit, { soft = 0.2, baseY = 0, baseFade = 30, colours, alpha = 1 } = {}) {
  const C = colours || cloudColours(L);
  const kh = L.keyHeight;
  const ox = lit * (0.42 - 0.18 * kh), oy = -(0.25 + 0.3 * kh);
  for (const b of billows) {
    const { x, y, r } = b;
    const sh = b.shade == null ? 0 : b.shade; // 0 lit .. 1 in the shadow of others
    const litC = mix(C.lit, C.mid, sh * 0.7), midC = mix(C.mid, C.shadow, sh * 0.6);
    const lowness = clamp((y - (baseY - baseFade * 3)) / (baseFade * 3)); // near the base: darker
    const shC = mix(C.shadow, C.base, lowness * 0.8);
    const gr = g.createRadialGradient(x + ox * r * 0.9, y + oy * r * 0.9, r * 0.05, x, y, r);
    const a = alpha * (b.a == null ? 1 : b.a);
    gr.addColorStop(0, css(litC, a));
    gr.addColorStop(0.42, css(mix(litC, midC, 0.55), a));
    gr.addColorStop(0.78, css(mix(midC, shC, 0.6), a));
    gr.addColorStop(1 - soft * 0.5, css(shC, a * 0.85));
    gr.addColorStop(1, css(shC, 0));
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}

// A silver lining: light added along the sun side of the outer billows (they are the edge the low sun shines through).
export function silverLining(g, billows, L, lit, amt = 1) {
  const k = amt * L.keyAmt * (0.25 + 0.9 * L.golden);
  if (k < 0.03) return;
  const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
  for (const b of billows) {
    if (!b.edge) continue;
    const ang = Math.atan2(-0.8, lit * 1);
    const x = b.x + Math.cos(ang) * b.r * 0.78, y = b.y + Math.sin(ang) * b.r * 0.78;
    const gr = g.createRadialGradient(x, y, 0, x, y, b.r * 0.55);
    gr.addColorStop(0, css(L.key, 0.22 * k)); gr.addColorStop(1, css(L.key, 0));
    g.fillStyle = gr; g.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
  }
  g.globalCompositeOperation = op;
}

// Darken the flat base of a cloud already painted on g (its own offscreen canvas), and dissolve its lowest edge.
export function cloudBase(g, x0, x1, yTop, yBase, L, colours) {
  const C = colours || cloudColours(L);
  const op = g.globalCompositeOperation;
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, yTop, 0, yBase);
  gr.addColorStop(0, css(C.base, 0)); gr.addColorStop(0.7, css(C.base, 0.45)); gr.addColorStop(1, css(C.base, 0.75));
  g.fillStyle = gr; g.fillRect(x0, yTop, x1 - x0, yBase - yTop + 2);
  g.globalCompositeOperation = 'destination-out';
  const fd = g.createLinearGradient(0, yBase - (yBase - yTop) * 0.22, 0, yBase + 2);
  fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,0.9)');
  g.fillStyle = fd; g.fillRect(x0, yBase - (yBase - yTop) * 0.22, x1 - x0, (yBase - yTop) * 0.22 + 4);
  g.globalCompositeOperation = op;
}

export { rng, clamp, lerp, smooth };
