// Shared by the fx, space and aliens families: fast noise, the baked smoke material (lit puff sprites), flame
// sprites, the heat ramp and small drawing helpers. Everything is baked once into small canvases and drawn with
// drawImage, so a plume of forty puffs costs well under a millisecond. Pure functions of their inputs.
import { rng, clamp, lerp, smooth, ease } from '../../core/rng.js';
import { css, mix, shade } from '../../core/paint.js';

export { rng, clamp, lerp, smooth, ease, css, mix, shade };

// ---------- fast integer-hash noise (rng.js's hash() builds strings: too slow per pixel) ----------
export function ih(x, y = 0, s = 0) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul((s | 0) + 0x3c6ef372, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vn(x, y, s = 0) { // smooth value noise, 0..1
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = ih(ix, iy, s), b = ih(ix + 1, iy, s), c = ih(ix, iy + 1, s), d = ih(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export function fbm(x, y, s = 0, oct = 4) { // 0..1
  let sum = 0, amp = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { sum += amp * vn(x * f, y * f, s + o * 131); n += amp; amp *= 0.5; f *= 2.03; }
  return sum / n;
}
export const n1 = (x, s = 0) => vn(x, 0.5, s) * 2 - 1; // smooth 1D noise, -1..1
export const frac = (x) => x - Math.floor(x);
export const TAU = Math.PI * 2;

// ---------- canvases ----------
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c;
}
const SPR = new Map();
export function sprite(key, make) {
  let c = SPR.get(key);
  if (!c) { c = make(); SPR.set(key, c); if (SPR.size > 700) SPR.delete(SPR.keys().next().value); }
  return c;
}

// ---------- the heat ramp: what a hot thing glows at, 0 (dull red) .. 1 (white-hot) ----------
const HEAT = [[0, [70, 10, 2]], [0.22, [160, 34, 6]], [0.42, [232, 86, 14]], [0.6, [255, 146, 36]], [0.78, [255, 204, 96]], [0.9, [255, 236, 176]], [1, [255, 252, 238]]];
export function heat(k) {
  k = clamp(k);
  for (let i = 1; i < HEAT.length; i++) {
    if (k <= HEAT[i][0]) { const [a, ca] = HEAT[i - 1], [b, cb] = HEAT[i]; return mix(ca, cb, (k - a) / (b - a)); }
  }
  return HEAT[HEAT.length - 1][1];
}

// ---------- the smoke material ----------
// Six puff shapes, each a union of lumps (cauliflower) eroded by fractal noise, with a height field for normals.
const PS = 128;
export const PUFFS = 6;
const FIELDS = [];
function puffField(i) {
  if (FIELDS[i]) return FIELDS[i];
  const r = rng(9001 + i * 17);
  const lumps = [{ x: (r() - 0.5) * 0.08, y: 0.04, r: 0.6 }];
  const n = 5 + (i % 3);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r() * 0.8;
    const d = 0.3 + r() * 0.16;
    lumps.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.9 - 0.04, r: 0.26 + r() * 0.16 });
  }
  const N = PS * PS, H = new Float32Array(N), A = new Float32Array(N), M = new Float32Array(N);
  for (let py = 0; py < PS; py++) for (let px = 0; px < PS; px++) {
    const u = ((px + 0.5) / PS) * 2 - 1, v = ((py + 0.5) / PS) * 2 - 1;
    const x = u + (vn(u * 2.4, v * 2.4, i + 49) - 0.5) * 0.33;
    const y = v + (vn(u * 2.4, v * 2.4, i + 83) - 0.5) * 0.33;
    let h = 0;
    for (const l of lumps) {
      const dx = x - l.x, dy = y - l.y;
      h += l.r * Math.exp(-(dx * dx + dy * dy) / (l.r * l.r) * 1.25);
    }
    const big = fbm(x * 2.2 + i * 7.1, y * 2.2 - i * 3.3, 77 + i, 4) - 0.5;
    const mid = fbm(x * 5.2 + i * 2.7, y * 5.2, 191 + i, 3) - 0.5;
    const fine = vn(x * 15 + i * 5, y * 15, 307 + i) - 0.5;
    const j = py * PS + px;
    H[j] = h * (1 + 0.48 * big + 0.40 * mid + 0.04 * fine);
    M[j] = clamp(0.5 + big * 0.6 + mid * 0.9 + fine * 0.13);
    const density = h + big * 0.55 + mid * 0.24 + fine * 0.045;
    const edge = Math.hypot(x, y) + 0.24 * big;
    // Deflect the edge with the same eddies that shape the density. The final falloff only keeps it off the tile edge.
    A[j] = smooth(0.025, 0.51, density) * smooth(1.03, 0.57, edge)
      * smooth(1, 0.84, Math.max(Math.abs(u), Math.abs(v)));
  }
  // blur of the height for ambient occlusion in the creases
  const B = new Float32Array(N), T = new Float32Array(N), R = 6;
  for (let y = 0; y < PS; y++) { let s = 0; for (let x = -R; x <= R; x++) s += H[y * PS + clamp(x, 0, PS - 1)]; for (let x = 0; x < PS; x++) { T[y * PS + x] = s / (2 * R + 1); s += H[y * PS + Math.min(PS - 1, x + R + 1)] - H[y * PS + Math.max(0, x - R)]; } }
  for (let x = 0; x < PS; x++) { let s = 0; for (let y = -R; y <= R; y++) s += T[clamp(y, 0, PS - 1) * PS + x]; for (let y = 0; y < PS; y++) { B[y * PS + x] = s / (2 * R + 1); s += T[Math.min(PS - 1, y + R + 1) * PS + x] - T[Math.max(0, y - R) * PS + x]; } }
  const NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N), AO = new Float32Array(N);
  const k = PS / 7;
  for (let y = 0; y < PS; y++) for (let x = 0; x < PS; x++) {
    const j = y * PS + x;
    const gx = (H[y * PS + Math.min(PS - 1, x + 1)] - H[y * PS + Math.max(0, x - 1)]) * k;
    const gy = (H[Math.min(PS - 1, y + 1) * PS + x] - H[Math.max(0, y - 1) * PS + x]) * k;
    const l = Math.hypot(gx, gy, 1);
    NX[j] = -gx / l; NY[j] = -gy / l; NZ[j] = 1 / l;
    AO[j] = clamp(1 - (B[j] - H[j]) * 2.2, 0.5, 1);
  }
  return (FIELDS[i] = { A, H, M, NX, NY, NZ, AO });
}

// Tones: what the smoke is made of. [base colour, how much sky it scatters]
export const TONES = {
  black: [[53, 47, 43], 0.1], oily: [[34, 30, 28], 0.06], grey: [[118, 116, 114], 0.16], white: [[226, 226, 222], 0.2],
  dust: [[188, 168, 138], 0.12], mist: [[226, 234, 240], 0.28], steam: [[236, 238, 240], 0.24], ash: [[86, 80, 76], 0.12],
};

// smokeTint(L, tone, lit) -> the lit and shadow colours and the light direction for a tone under the light L.
export function smokeTint(L, tone = 'black', lit = 1) {
  const [base, sc] = TONES[tone] || TONES.black;
  const sky = mix(L.sky.horizon, L.haze, 0.5);
  const litC = mix(shade(base, L, 1), sky, sc * 0.6);
  const shC = mix(shade(base, L, -0.7), mix(sky, L.ambient, 0.5), sc);
  const e = lerp(0.3, 1.15, L.keyHeight);
  return { key: `${tone}|${L.q}|${lit}`, lit: litC, shadow: shC, l: [lit * Math.cos(e) * 0.82, -Math.sin(e) * 0.82, 0.56] };
}

// puffTinted(i, tint) -> a 128 px canvas of puff shape i, lit by tint.
export function puffTinted(i, tint) {
  i = ((i % PUFFS) + PUFFS) % PUFFS;
  return sprite(`puff${i}|${tint.key}`, () => {
    const F = puffField(i), c = canvas(PS, PS), g = c.getContext('2d'), img = g.createImageData(PS, PS), d = img.data;
    const [lx, ly, lz] = tint.l, ll = Math.hypot(lx, ly, lz);
    for (let j = 0; j < PS * PS; j++) {
      const a = F.A[j]; if (a < 0.004) continue;
      const dot = (F.NX[j] * lx + F.NY[j] * ly + F.NZ[j] * lz) / ll;
      let s = clamp((dot + 0.3) / 1.3); s = s * s * (3 - 2 * s);
      s *= F.AO[j];
      const t = clamp(0.08 + s * 0.79 + (F.M[j] - 0.5) * 0.24);
      d[j * 4] = lerp(tint.shadow[0], tint.lit[0], t); d[j * 4 + 1] = lerp(tint.shadow[1], tint.lit[1], t);
      d[j * 4 + 2] = lerp(tint.shadow[2], tint.lit[2], t); d[j * 4 + 3] = a * 255;
    }
    g.putImageData(img, 0, 0); return c;
  });
}

// puffGlow(i, kind, T): an emissive puff drawn with 'lighter'.
//   kind 'under': fire light on the underside of smoke (fixed orange).
//   kind 'hot': an incandescent fireball puff at temperature T (1 white-hot .. 0.2 dull red), thick parts hottest.
//   kind 'tint': a coloured inner glow; T is an [r,g,b] colour (portal mist, alien light).
export function puffGlow(i, kind = 'under', T = 1) {
  i = ((i % PUFFS) + PUFFS) % PUFFS;
  const tk = Array.isArray(T) ? T.map((v) => Math.round(v / 8) * 8).join(',') : Math.round(T * 10) / 10;
  return sprite(`glow${i}|${kind}|${tk}`, () => {
    const F = puffField(i), c = canvas(PS, PS), g = c.getContext('2d'), img = g.createImageData(PS, PS), d = img.data;
    for (let j = 0; j < PS * PS; j++) {
      const a = F.A[j]; if (a < 0.004) continue;
      const th = clamp(F.H[j] / 0.6);
      let col, e;
      if (kind === 'hot') {
        const fold = smooth(0.24, 0.7, F.M[j]);
        const k = clamp((0.30 + 0.54 * th + 0.57 * fold) * T - (1 - F.AO[j]) * 0.30);
        col = heat(k); e = a * clamp(0.38 + th * 0.83);
      } else if (kind === 'tint') {
        col = T; e = a * clamp(0.25 + th * 0.9) * (1.1 - F.AO[j] * 0.3);
      } else {
        const v = Math.floor(j / PS) / PS; // lower in the puff is nearer the fire
        const under = smooth(0.12, 1, clamp(F.NY[j] * 0.53 + v * 0.95));
        col = heat(0.5 + 0.25 * th); e = a * under * (0.5 + 0.5 * th);
      }
      d[j * 4] = col[0]; d[j * 4 + 1] = col[1]; d[j * 4 + 2] = col[2]; d[j * 4 + 3] = clamp(e) * 255;
    }
    g.putImageData(img, 0, 0); return c;
  });
}

// put(ctx, img, x, y, r, a): draw a square sprite centred at (x, y) with radius r, at alpha a. Mirror with r < 0.
export function put(ctx, img, x, y, r, a = 1) {
  if (a <= 0.004 || r === 0) return;
  ctx.globalAlpha = Math.min(1, a);
  if (r < 0) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(img, r, r, -2 * r, -2 * r); ctx.restore(); }
  else ctx.drawImage(img, x - r, y - r, 2 * r, 2 * r);
}

// ---------- flames ----------
// flameSprite(i): a tongue of flame, base at the bottom centre, 48 x 128 px, coloured by the heat ramp. Draw 'lighter'.
export const FW = 48, FH = 128;
export function flameSprite(i = 0, hot = 1) {
  i = ((i % 5) + 5) % 5;
  return sprite(`flame${i}|${hot}`, () => {
    const c = canvas(FW, FH), g = c.getContext('2d'), img = g.createImageData(FW, FH), d = img.data;
    // A tongue is not a teardrop: the column is bent by turbulence, its upper half forks into two or three licks
    // (each sprite its own way), and the top is eaten into ragged holes and loose wisps.
    const forks = [2, 3, 1, 2, 3][i], spread = [0.42, 0.5, 0, 0.36, 0.46][i];
    for (let py = 0; py < FH; py++) {
      const v = 1 - (py + 0.5) / FH; // 0 at the base, 1 at the tip
      const wv = 0.92 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.95 + 0.1)), 0.75) * Math.pow(1 - v, 0.4);
      const sway = (fbm(v * 2.6 + i * 5.3, i * 3.1, 31 + i, 3) - 0.5) * 0.9 * v + (fbm(v * 7 + i * 2.1, 4.2 + i, 41 + i, 2) - 0.5) * 0.35 * v;
      const split = smooth(0.32, 0.75, v);
      for (let px = 0; px < FW; px++) {
        const u = ((px + 0.5) / FW) * 2 - 1;
        const curl = (vn(u * 2.2 + i, v * 5.4, 196 + i) - 0.5) * 0.29 * smooth(0.07, 0.8, v);
        let dd = Math.abs(u - sway + curl) / Math.max(wv, 0.02);
        if (forks > 1) {
          // the licks: narrower columns fanning apart as they climb, each with its own wobble
          for (let f = 0; f < forks; f++) {
            const off = (f / (forks - 1) - 0.5) * 2 * spread * split * (0.6 + 0.4 * v);
            const wob = (vn(v * 5 + f * 3.7 + i, f + i * 1.3, 61 + i) - 0.5) * 0.25 * split;
            const w2 = Math.max(wv * (0.55 + 0.15 * (f % 2)), 0.02);
            dd = Math.min(dd * (1 + split * 0.9), Math.abs(u - sway - off - wob) / w2);
          }
        }
        const tex = 0.56 + 0.85 * fbm(u * 3 + i, v * 7 - i * 2, 57 + i, 3);
        let I = Math.pow(clamp(1 - dd), 1.2) * Math.pow(1 - v, 0.6) * tex;
        // erosion: noise bites into the upper flame, so its edge is torn and bits break loose
        const bite = fbm(u * 4.5 + i * 2, v * 10 - i, 83 + i, 3);
        I -= smooth(0.2, 0.9, v) * smooth(0.45, 0.75, bite) * 0.55;
        I *= smooth(0, 0.08, v + 0.02);
        if (I <= 0.01) continue;
        const col = heat(clamp(I * (1.5 + 0.23 * (1 - v)) * hot));
        const j = (py * FW + px) * 4;
        d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = smooth(0.0, 0.5, I) * 255;
      }
    }
    g.putImageData(img, 0, 0); return c;
  });
}
// flame(ctx, i, x, y, w, h, lean, a): one tongue standing at (x, y), w wide, h tall, its tip leaning by `lean` (x per h).
export function flame(ctx, i, x, y, w, h, lean = 0, a = 1, hot = 1) {
  if (a <= 0.004 || h <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, a);
  ctx.transform(w / FW, 0, (-lean * h) / FH, h / FH, x, y); // a sheared frame: the tip sits lean * h to the side
  ctx.drawImage(flameSprite(i, hot), -FW / 2, -FH);
  ctx.restore();
}

// White aerated water still scatters skylight when the key is below the horizon.
export function foamColor(L, facing = 0.5) {
  const scatter = mix(facing > 0 ? [199, 218, 231] : [107, 139, 163], L.key, 0.18);
  const lowLight = Math.max(L.night, L.golden * 0.85);
  return mix(scatter, shade([238, 243, 245], L, facing), 0.88 - lowLight * 0.74);
}

// ---------- small things ----------
// a soft radial glow, cached as a sprite (cheaper than a gradient per call). Draw with 'lighter'.
export function glowSprite(c) {
  const k = c.map((v) => Math.round(v / 6) * 6);
  return sprite('g' + k.join(','), () => {
    const s = 64, cv = canvas(s, s), g = cv.getContext('2d');
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, css(k, 1)); gr.addColorStop(0.18, css(k, 0.55)); gr.addColorStop(0.45, css(k, 0.16)); gr.addColorStop(1, css(k, 0));
    g.fillStyle = gr; g.fillRect(0, 0, s, s); return cv;
  });
}
export function bloom(ctx, x, y, r, c, a = 1) {
  if (a <= 0.004 || r <= 0) return;
  const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  put(ctx, glowSprite(c), x, y, r, a);
  ctx.globalCompositeOperation = op; ctx.globalAlpha = 1;
}

// streak(ctx, x0, y0, x1, y1, w, c, a): a motion-blurred spark, hot at its head (x1, y1).
export function streak(ctx, x0, y0, x1, y1, w, c, a = 1) {
  if (a <= 0.004) return;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, css(c, 0)); g.addColorStop(0.7, css(c, a * 0.7)); g.addColorStop(1, css(mix(c, [255, 255, 240], 0.5), a));
  ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

// ballistic(v0x, v0y, t, drag, grav): where a thrown thing is after t seconds (with air drag and gravity).
export function ballistic(vx, vy, t, k = 1.5, g = 200) {
  const e = (1 - Math.exp(-k * t)) / k;
  return [vx * e, vy * e + (g / k) * (t - e)];
}

// noisy(o): how much of each extra a frame can afford, from the pixel scale: draw less detail when small.
export const lod = (o) => (o.scale >= 0.5 ? 1 : o.scale >= 0.25 ? 0.6 : 0.35);
