// Shared material for the space family. Space has no air: one hard sun, black shadows (only a faint blue earthshine
// fill), no haze. The sun is near white with a quarter of the hour's key colour in it, so a dusk scene still warms the
// palace a little. It comes from o.lit's side (-1 left, 1 right), a little above and a little in front.
import { rng, clamp, lerp, smooth, ease } from '../../core/rng.js';
import { css, mix, scale, cached } from '../../core/paint.js';
export { rng, clamp, lerp, smooth, ease, css, mix, scale, cached };

export const TAU = Math.PI * 2;
export const frac = (x) => x - Math.floor(x);
export function ih(a, b, s = 0) { // integer hash -> 0..1
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vn(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = ih(xi, yi, s), b = ih(xi + 1, yi, s), c = ih(xi, yi + 1, s), d = ih(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, s = 0, oct = 4) {
  let a = 0, w = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { a += w * vn(x, y, s + i * 31); n += w; x *= 2.03; y *= 2.03; w *= 0.5; }
  return a / n;
}

const SUN_W = [255, 250, 240];
export function sun(L, lit = 1) {
  const side = lit < 0 ? -1 : 1;
  const d = [side * 0.82, -0.36, 0.45], m = Math.hypot(...d);
  return {
    side, dir: d.map((v) => v / m),
    key: mix(SUN_W, L.key, 0.25).map((v) => v * 1.05),
    amb: [12, 13, 18], fill: [36, 40, 56], q: `${L.q}|${side}`,
  };
}
// a base colour lit by the sun at cos factor d (-1..1), with the faint fill on the shadow side
export function lc(base, S, d, { spec = 0, fill = 1 } = {}) {
  const k = Math.max(0, d), f = Math.max(0, -d) * 0.5 + 0.2;
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) out[i] = base[i] * (S.amb[i] + S.key[i] * k + S.fill[i] * f * fill) / 255 + S.key[i] * spec * Math.pow(k, 24);
  return out;
}
// the cos factor for a surface normal in the picture plane: nx (right), ny (down), nz (toward us)
export const dotL = (S, nx, ny, nz) => nx * S.dir[0] + ny * S.dir[1] + nz * S.dir[2];

// A vertical cylinder's shading across its width, as a horizontal gradient from x0 to x1.
export function cylX(ctx, x0, x1, base, S, { spec = 0.4, n = 9 } = {}) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (u - 0.5) * Math.PI;
    g.addColorStop(u, css(lc(base, S, dotL(S, Math.sin(a), 0, Math.cos(a)), { spec })));
  }
  return g;
}
// A horizontal cylinder's shading across its height, as a vertical gradient from y0 (top) to y1.
export function cylY(ctx, y0, y1, base, S, { spec = 0.4, n = 9, nx = 0 } = {}) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (u - 0.5) * Math.PI;
    g.addColorStop(u, css(lc(base, S, dotL(S, nx, Math.sin(a), Math.cos(a)), { spec })));
  }
  return g;
}
// A sphere's shading: a radial gradient whose bright centre sits toward the sun, with a hard-ish terminator.
export function sphereFill(ctx, x, y, r, base, S, { spec = 0.5 } = {}) {
  const hx = x + S.dir[0] * r * 0.55, hy = y + S.dir[1] * r * 0.55;
  const g = ctx.createRadialGradient(hx, hy, r * 0.04, x - S.dir[0] * r * 0.15, y - S.dir[1] * r * 0.15, r * 1.12);
  g.addColorStop(0, css(lc(base, S, 1, { spec })));
  g.addColorStop(0.45, css(lc(base, S, 0.6)));
  g.addColorStop(0.72, css(lc(base, S, 0.12)));
  g.addColorStop(0.82, css(lc(base, S, -0.2)));
  g.addColorStop(1, css(lc(base, S, -0.6)));
  return g;
}

// additive glow, cheap: a cached radial sprite
const GL = new Map();
function glowSprite(c) {
  const k = c.join(',');
  let s = GL.get(k);
  if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 64;
  const g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, css(c, 1)); gr.addColorStop(0.18, css(c, 0.5)); gr.addColorStop(0.5, css(c, 0.12)); gr.addColorStop(1, css(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  if (GL.size > 200) GL.delete(GL.keys().next().value);
  GL.set(k, s);
  return s;
}
export function bloom(ctx, x, y, r, c, a = 1) {
  if (r <= 0 || a <= 0.003) return;
  const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowSprite(c.map((v) => Math.round(v))), x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = op; ctx.globalAlpha = ga;
}
// a blinking navigation light: a short bright flash every period seconds
export function nav(ctx, x, y, c, t, { period = 1.6, phase = 0, r = 5, duty = 0.12 } = {}) {
  const f = frac(t / period + phase);
  const on = f < duty ? 1 - f / duty * 0.4 : 0;
  bloom(ctx, x, y, r * 0.7, c, 0.35);
  if (on > 0) { bloom(ctx, x, y, r * 2.4, c, 0.6 * on); bloom(ctx, x, y, r * 0.8, [255, 255, 255], on); }
}
// a bolt of energy: a bright core streak with a coloured sheath
export function bolt(ctx, x0, y0, x1, y1, c, w = 1.6, a = 1) {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, css(c, 0)); g.addColorStop(0.7, css(c, 0.5 * a)); g.addColorStop(1, css(c, a));
  ctx.strokeStyle = g; ctx.lineWidth = w * 3;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const g2 = ctx.createLinearGradient(x0, y0, x1, y1);
  g2.addColorStop(0.3, 'rgba(255,255,255,0)'); g2.addColorStop(1, `rgba(255,250,240,${a})`);
  ctx.strokeStyle = g2; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.3); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.globalCompositeOperation = op;
}
// a canvas of the given size (for per-pixel bakes)
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// pixel scale for a bake from o.scale (CSS px per unit times device pixels), quantised so the cache stays small
export const pxs = (o) => clamp(Math.round((o.scale || 1) * (globalThis.devicePixelRatio || 1) * 4) / 4, 0.25, 2);

// An explosion in vacuum: no air, so nothing billows or rises. A white flash; a sphere of hot gas that expands fast
// and cools white -> orange -> deep red -> gone; sparks and glowing debris flying out in straight lines, tumbling;
// a thin ring of vapour. p 0..1 over its life; R is the final radius.
import { puffGlow, put } from '../fx/_lib.js';
export function vacuumBurst(ctx, x, y, R, p, seed = 0) {
  if (p <= 0 || p >= 1) return;
  const r = rng(seed * 41 + 7);
  const op = ctx.globalCompositeOperation;
  // flash
  const fI = p < 0.04 ? p / 0.04 : Math.exp(-(p - 0.04) * 18);
  bloom(ctx, x, y, R * 2.2 * (0.5 + fI), [255, 236, 200], 0.9 * fI);
  // the hot sphere
  const ex = 1 - Math.pow(1 - Math.min(1, p * 2.2), 3), T = Math.max(0, 1 - p * 1.25);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {
    const a = r() * TAU, d = R * 0.45 * ex * r(), rad = R * (0.35 + 0.35 * r()) * (0.25 + 0.75 * ex);
    put(ctx, puffGlow(k % 6, 'hot', T), x + Math.cos(a) * d, y + Math.sin(a) * d, rad, clamp(T * 1.4) * (1 - smooth(0.7, 1, p)));
  }
  ctx.globalCompositeOperation = op; ctx.globalAlpha = 1;
  // vapour ring
  const rr = R * 1.6 * ex;
  ctx.strokeStyle = css([210, 220, 240], 0.25 * (1 - p)); ctx.lineWidth = Math.max(0.6, R * 0.05);
  ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.9, 0, 0, TAU); ctx.stroke();
  // sparks and debris, straight out
  ctx.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const a = r() * TAU, sp = R * (1.4 + 2.6 * r()), d = sp * p, hot = clamp(1 - p * (1.2 + r()));
    const x1 = x + Math.cos(a) * d, y1 = y + Math.sin(a) * d, tl = Math.min(d, R * 0.35);
    if (k < 18) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = css([255, 200 * hot + 40, 120 * hot], hot); ctx.lineWidth = Math.max(0.5, R * 0.03);
      ctx.beginPath(); ctx.moveTo(x1 - Math.cos(a) * tl, y1 - Math.sin(a) * tl); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalCompositeOperation = op;
    } else {
      const s = R * (0.05 + 0.06 * r());
      ctx.save(); ctx.translate(x1, y1); ctx.rotate(p * 12 * (r() - 0.5));
      ctx.fillStyle = css([70, 66, 62], 1 - smooth(0.8, 1, p)); ctx.fillRect(-s, -s * 0.6, 2 * s, 1.2 * s);
      ctx.restore();
      bloom(ctx, x1, y1, s * 3, [255, 140, 60], hot * 0.8);
    }
  }
}
