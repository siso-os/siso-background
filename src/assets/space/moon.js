// The moon, close: a per-pixel bake. Maria from low-frequency noise on the sphere; a few hundred craters stamped into
// a height field in their true foreshortened shape (squeezed toward the limb), with bowls, raised rims, central peaks
// on the big ones, ejecta blankets and a couple of young rayed craters; Lommel-Seeliger shading (the real moon's flat,
// limb-bright look), crater shadows marched along the sunlight near the terminator, faint blue earthshine on the dark
// side. Lit from o.lit's side; o.phase 0..1 (1 full) or the state picks the phase. Baked once per seed, side, phase
// and pixel size, then drawn as one image.
import { clamp, smooth, rng, fbm, vn, canvas, bloom, pxs, ih } from './_lib.js';

const R = 220, CY = -256;
const PHASE = { gibbous: 0.8, full: 1, half: 0.5, crescent: 0.2 };
const HL = [191, 187, 182], MA = [105, 108, 109], EARTH = [130, 152, 190];
const TEX = new Map();

function craters(seed) {
  const r = rng(seed * 977 + 13), out = [];
  for (let k = 0; k < 1300; k++) {
    const u = r();
    const rc = clamp(0.008 * Math.pow(1 - u * 0.992, -0.62), 0.008, 0.16);
    const lon = (r() * 2 - 1) * 1.62, lat = Math.asin(r() * 2 - 1) * 0.98;
    out.push({ lon, lat, rc, fresh: r() < 0.18, rays: rc > 0.055 && r() < 0.28, age: r(), pattern: k });
  }
  return out;
}

function bake(seed, side, phase, N) {
  const c = canvas(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  const half = N / 2, inv = 1 / half;
  const H = new Float32Array(N * N), A = new Float32Array(N * N), M = new Float32Array(N * N);
  // albedo: highlands and maria, sampled on the sphere so they foreshorten
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i + 0.5) * inv - 1, y = (j + 0.5) * inv - 1, rr = x * x + y * y;
    if (rr > 1.02) continue;
    const z = Math.sqrt(Math.max(0, 1 - rr)), lon = Math.atan2(x, z), lat = Math.asin(clamp(-y, -1, 1));
    const m = fbm(lon * 1.75 + 3, lat * 2.2 + 1, seed + 5, 5);
    const basins = fbm(lon * 3.4 - 2, lat * 4.1, seed + 56, 3);
    const coast = fbm(lon * 9, lat * 9, seed + 9, 3);
    const mare = smooth(0.35, 0.66, m * 0.72 + basins * 0.28 + (coast - 0.5) * 0.23);
    const fine = fbm(lon * 26, lat * 26, seed + 2, 3);
    const idx = j * N + i;
    M[idx] = mare * (0.67 + 0.66 * basins);
    A[idx] = (1 - mare) * (0.92 + (fine - 0.5) * 0.34) + mare * (0.95 + (fine - 0.5) * 0.32 + (coast - 0.5) * 0.2);
    H[idx] = (fine - 0.5) * 0.002 + (vn(lon * 60, lat * 60, seed + 7) - 0.5) * 0.001;
  }
  // craters, stamped in their foreshortened shape
  for (const k of craters(seed)) {
    const cz0 = Math.cos(k.lat) * Math.cos(k.lon);
    if (cz0 < 0.02) continue;
    const cx = Math.cos(k.lat) * Math.sin(k.lon), cy = -Math.sin(k.lat), cz = cz0;
    const cl = Math.hypot(cx, cy), ex = cl > 1e-4 ? cx / cl : 1, ey = cl > 1e-4 ? cy / cl : 0;
    const reach = k.rays ? 5.8 : 2.1;
    const spokes = k.rays ? Array.from({ length: 16 }, (_, i) => ih(i, k.pattern, seed)) : null;
    const x0 = Math.max(0, Math.floor((cx - k.rc * reach + 1) * half)), x1 = Math.min(N - 1, Math.ceil((cx + k.rc * reach + 1) * half));
    const y0 = Math.max(0, Math.floor((cy - k.rc * reach + 1) * half)), y1 = Math.min(N - 1, Math.ceil((cy + k.rc * reach + 1) * half));
    const big = smooth(0.04, 0.12, k.rc), depth = 0.14 * k.rc * (1 - 0.63 * k.age), rimH = (0.018 + 0.032 * (1 - k.age)) * k.rc;
    const inMare = M[Math.round((cy + 1) * half) * N + Math.round((cx + 1) * half)] || 0;
    if (inMare > 0.5 && k.age < 0.6 && k.rc < 0.08 && ((k.lon * 1000) | 0) % 3) continue; // maria are younger: fewer craters
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const x = (i + 0.5) * inv - 1, y = (j + 0.5) * inv - 1;
      if (x * x + y * y > 1) continue;
      const dx = x - cx, dy = y - cy;
      const pr = (dx * ex + dy * ey) / Math.max(cz, 0.06), pt = -dx * ey + dy * ex;
      const q = Math.hypot(pr, pt) / k.rc;
      if (q > reach) continue;
      const idx = j * N + i;
      let h = 0, a = 0;
      if (q < 1) {
        const fl = big * 0.55; // big craters have flat floors
        const qq = Math.max(q, fl);
        h = depth * ((qq * qq - fl * fl) / (1 - fl * fl) - 1);
        h += big * depth * 0.5 * Math.exp(-((q / 0.13) ** 2)); // central peak
        a -= (big * 0.13 + 0.07) * (1 - smooth(0.55, 0.94, q)); // old big floors flooded darker
      }
      h += rimH * Math.exp(-(((q - 1.02) / 0.105) ** 2));
      if (q > 1) h += rimH * 0.35 * Math.exp(-(q - 1) * 2.5);
      if (k.fresh) a += 0.16 * Math.exp(-(((q - 1.18) / 0.48) ** 2));
      if (k.rays && q > 1) {
        const ang = Math.atan2(pt, pr) / (Math.PI * 2) + 0.5;
        const spoke = ang * spokes.length, j = Math.floor(spoke) % spokes.length;
        const offset = spoke % 1 - 0.2 - spokes[j] * 0.6;
        const ray = Math.exp(-((offset / (0.16 / Math.sqrt(q))) ** 2));
        const dust = 0.4 + 0.6 * vn(x * 91, y * 91, seed + k.pattern);
        a += 0.68 * spokes[j] * ray * dust * Math.exp(-(q - 1) / 2.7);
      }
      H[idx] += h * (1 - 0.6 * (k.age > 0.85 ? 1 : 0)); A[idx] += a * (0.6 + 0.4 * (1 - k.age));
    }
  }
  // light
  const ph = (1 - phase) * Math.PI;
  let lx = side * (0.22 + 0.78 * Math.sin(ph)), ly = -0.21, lz = Math.cos(ph);
  const lm = Math.hypot(lx, ly, lz); lx /= lm; ly /= lm; lz /= lm;
  const sl = Math.hypot(lx, ly) || 1, sx = lx / sl, sy = ly / sl;
  const K = half * 0.49; // central difference in world units, with vertical exaggeration
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i + 0.5) * inv - 1, y = (j + 0.5) * inv - 1, rr = x * x + y * y;
    if (rr > 1.02) continue;
    const idx = j * N + i;
    const z = Math.sqrt(Math.max(0.0004, 1 - rr));
    const gx = (H[i < N - 1 ? idx + 1 : idx] - H[i > 0 ? idx - 1 : idx]) * K;
    const gy = (H[j < N - 1 ? idx + N : idx] - H[j > 0 ? idx - N : idx]) * K;
    let nx = x - gx * z * 1.4, ny = y - gy * z * 1.4, nz = z + (gx * x + gy * y) * 0.4;
    const nm = Math.hypot(nx, ny, nz); nx /= nm; ny /= nm; nz /= nm;
    let mu0 = nx * lx + ny * ly + nz * lz;
    const mu = Math.max(z, 0.05);
    // shadow march toward the sun near the terminator
    if (mu0 > 0 && mu0 < 0.45) {
      const tanE = mu0 / Math.sqrt(1 - mu0 * mu0) / half;
      let sh = 1;
      for (let s = 1; s <= 14; s++) {
        const px = Math.round(i + sx * s * 1.5), py = Math.round(j + sy * s * 1.5);
        if (px < 0 || py < 0 || px >= N || py >= N) break;
        const dh = H[py * N + px] - H[idx] - s * 1.5 * tanE * 0.9;
        if (dh > 0) { sh = Math.max(0, 1 - dh * half * 6); if (sh <= 0) break; }
      }
      mu0 *= sh;
    }
    const mare = M[idx];

    const alb = A[idx];
    let b;
    if (mu0 > 0) b = (0.62 * (2 * mu0 / (mu0 + mu)) + 0.38 * mu0 * 1.4) * alb;
    else b = 0;
    const earth = 0.019 * alb * (0.6 + 0.4 * z);
    const edge = clamp((1 - Math.sqrt(rr)) * half * 1.2 + 0.5);
    const o4 = idx * 4;
    d[o4] = clamp(((HL[0] + (MA[0] - HL[0]) * mare) * b * 1.08 + EARTH[0] * earth) / 255) * 255;
    d[o4 + 1] = clamp(((HL[1] + (MA[1] - HL[1]) * mare) * b * 1.06 + EARTH[1] * earth) / 255) * 255;
    d[o4 + 2] = clamp(((HL[2] + (MA[2] - HL[2]) * mare) * b * 1.02 + EARTH[2] * earth) / 255) * 255;
    d[o4 + 3] = edge * 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function moonTex(seed, side, phase, N) {
  const q = Math.round(phase * 100) / 100;
  const k = `${seed}|${side}|${q}|${N}`;
  let c = TEX.get(k);
  if (!c) { c = bake(seed, side, q, N); TEX.set(k, c); if (TEX.size > 12) TEX.delete(TEX.keys().next().value); }
  return c;
}

export default {
  id: 'space.moon', family: 'space', title: 'The moon',
  about: 'The moon up close: real maria and craters (foreshortened, rimmed, some rayed), Lommel-Seeliger shading, crater shadows near the terminator, earthshine on the dark side, a soft bloom. Lit from o.lit; o.phase 0..1 (1 full) overrides the state. Disc radius 220, centre 256 above the anchor.',
  w: 512, h: 512, states: ['gibbous', 'full', 'half', 'crescent'], loop: 0, once: {}, variants: 6,
  ref: 'refs/slice/vertical-slice.webp',
  draw(ctx, o) {
    ctx.save();
    const side = (o.lit ?? o.L.side) < 0 ? -1 : 1;
    const phase = clamp(o.phase ?? PHASE[o.state] ?? 0.8);
    const N = Math.max(96, Math.round(2 * R * pxs(o) / 16) * 16);
    const tex = moonTex(((o.seed || 0) % 6 + 6) % 6, side, phase, N);
    // the camera's bloom around a bright body: wider on the lit limb
    const lit = 0.25 + 0.75 * phase;
    bloom(ctx, side * R * 0.25 * (1 - phase), CY, R * 1.22, [190, 196, 210], 0.10 * lit * (0.3 + 0.7 * (o.L.night || 0)));
    // In space the disc hides what is behind it; under air the sky is in front of it, so its dark side is sky-coloured
    // and its lit side adds to the sky. Occlude by the altitude, then add the moonlight.
    const vac = smooth(0.2, 0.9, o.L.space || 0), day = (1 - (o.L.night || 0)) * (1 - vac);
    const occ = 0.09 * (1 - day) + 0.91 * vac;
    ctx.fillStyle = `rgba(0,0,0,${occ})`;
    ctx.beginPath(); ctx.arc(0, CY, R - 0.6, 0, Math.PI * 2); ctx.fill();
    // By day the camera is exposed for a bright sky: the moon is paler and must not clip, so it is screened onto the
    // sky (adds, but saturates softly) instead of added; at night and in space it is added at full strength.
    if (day > 0.01) { ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = day * 0.8; ctx.drawImage(tex, -R, CY - R, 2 * R, 2 * R); }
    if (day < 0.99) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - day; ctx.drawImage(tex, -R, CY - R, 2 * R, 2 * R); }
    ctx.restore();
  },
};
