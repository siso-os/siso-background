// Painting helpers every asset shares, so the whole scene is lit the same way.
// Colours are [r, g, b] arrays, 0..255. css() turns one into a canvas colour.

import { rng, clamp, lerp } from './rng.js';

export const css = (c, a = 1) =>
  `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${a})`;
export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const scale = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const hex = (s) => { const n = parseInt(s.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// shade(base, L, facing): the colour of a surface of colour `base` under the light L.
// facing: 1 = turned fully to the key light, 0 = facing the camera, -1 = turned away (the shadow side).
// Use o.lit to turn "left face" / "right face" into facing: facing = side === o.lit ? 1 : -1.
export function shade(base, L, facing = 0, { gloss = 0 } = {}) {
  const f = clamp(0.38 + 0.62 * facing) * L.keyAmt * (0.55 + 0.45 * L.keyHeight + (facing > 0 ? 0.25 * (1 - L.keyHeight) : 0));
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const lightC = (L.ambient[i] / 255) * 0.78 + (L.key[i] / 255) * f;
    out[i] = base[i] * lightC;
  }
  if (gloss > 0) { // a glossy surface also mirrors the sky
    const sky = mix(L.sky.horizon, L.sky.top, 0.35);
    for (let i = 0; i < 3; i++) out[i] = lerp(out[i], sky[i] * (0.55 + 0.45 * (1 - L.night)), gloss);
  }
  return out;
}

// The colour glass shows: the sky it faces, darker at the bottom.
export const glassColour = (L, height = 0.5) => mix(scale(L.sky.horizon, 0.62), scale(L.sky.top, 0.85), clamp(height));

// A thin bright line on the edge that faces the light (only when the light is low or strong).
export function rimColour(L) { return L.key.map((v) => v * (0.5 + 0.5 * L.keyAmt)); }

// glow(ctx, x, y, r, colour, alpha): a soft light that adds to what is under it (bloom).
export function glow(ctx, x, y, r, c, a = 1) {
  if (r <= 0 || a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(c, a));
  g.addColorStop(0.25, css(c, a * 0.45));
  g.addColorStop(1, css(c, 0));
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = op;
}

// vgrad(ctx, y0, y1, [[stop, colour, alpha?], ...]) -> a vertical gradient.
export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [s, c, a = 1] of stops) g.addColorStop(clamp(s), css(c, a));
  return g;
}
export function hgrad(ctx, x0, x1, stops) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [s, c, a = 1] of stops) g.addColorStop(clamp(s), css(c, a));
  return g;
}

// windowLights(ctx, x, y, w, h, o, opts): a grid of windows on a facade from (x, y) to (x+w, y+h).
// By day they mirror the sky; after dark L.windows of them glow warm or cool. Seeded, so the same windows stay lit.
export function windowLights(ctx, x, y, w, h, o, {
  cols = 6, rows = 20, gapX = 0.35, gapY = 0.3, seed = o.seed || 0, facing = 0,
  warm = [255, 198, 128], cool = [196, 222, 255], coolShare = 0.25, flicker = true,
} = {}) {
  const L = o.L, r = rng(seed * 7919 + 13);
  const cw = w / cols, rh = h / rows;
  const ww = cw * (1 - gapX), wh = rh * (1 - gapY);
  const dayGlass = shade(glassColour(L, 0.6), L, facing, { gloss: 0.5 });
  const t = o.t || 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v = r(), c = r(), ph = r();
      const wx = x + i * cw + (cw - ww) / 2, wy = y + j * rh + (rh - wh) / 2;
      const lit = v < L.windows * (0.75 + 0.5 * (1 - j / rows));
      if (lit && L.windows > 0.02) {
        const col = c < coolShare ? cool : warm;
        let a = 0.55 + 0.45 * ph;
        if (flicker && ph > 0.985) a *= 0.6 + 0.4 * Math.sin(t * 9 + i);
        ctx.fillStyle = css(mix(dayGlass, col, clamp(L.windows * 1.3)), a);
      } else {
        ctx.fillStyle = css(scale(dayGlass, 0.7 + 0.3 * ph), 0.9);
      }
      ctx.fillRect(wx, wy, ww, wh);
    }
  }
}

// A tiny cache for costly static bodies: cached(key, w, h, pxScale, paint) -> a canvas drawn once.
// Draw it with ctx.drawImage(c, -w/2, -h, w, h). Keys must include id, seed, state and L.q.
const CACHE = new Map();
export function cached(key, w, h, pxScale, paint) {
  const s = Math.max(0.25, Math.min(3, Math.round(pxScale * 4) / 4));
  const k = key + '@' + s;
  let c = CACHE.get(k);
  if (c) { CACHE.delete(k); CACHE.set(k, c); return c; }
  c = document.createElement('canvas');
  c.width = Math.ceil(w * s); c.height = Math.ceil(h * s);
  const g = c.getContext('2d');
  g.scale(s, s); g.translate(w / 2, h);
  paint(g);
  CACHE.set(k, c);
  if (CACHE.size > 400) CACHE.delete(CACHE.keys().next().value);
  return c;
}
