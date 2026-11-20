// The engine's own ground: the land under a city (it spans depths, so it is drawn in screen space), the quay along its
// front with street lights, and the far coast along the horizon with its strip of tiny buildings and lights.
// None of these is an asset: they are the stage the assets stand on.

import { rng, hash, clamp } from '../core/rng.js';
import { shade, css, mix, scale, cached } from '../core/paint.js';
import { keyedLight } from '../core/light.js';

const GROUND = { concrete: [128, 128, 118], sand: [204, 176, 130], snow: [228, 234, 240] };

// A soft round light sprite per colour, drawn additively; much cheaper than a gradient per light.
const SPRITES = new Map();
export function lightSprite(c) {
  const key = c.join(',');
  let s = SPRITES.get(key);
  if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 64;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},1)`);
  gr.addColorStop(0.12, `rgba(${c[0]},${c[1]},${c[2]},0.55)`);
  gr.addColorStop(0.4, `rgba(${c[0]},${c[1]},${c[2]},0.12)`);
  gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  SPRITES.set(key, s);
  return s;
}
export function spriteGlow(ctx, x, y, r, c, a) {
  if (a <= 0.01 || r < 0.5) return;
  const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(lightSprite(c), x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = op; ctx.globalAlpha = ga;
}

// The land under a city, from its far edge (z 0.93) to the quay (z 1.035), tapering at both ends.
export function landBand(seed, i, shore) {
  const base = GROUND[shore] || GROUND.concrete;
  const r = rng(hash(seed, 'land', i));
  const dots = [];
  for (let n = 0; n < 260; n++) dots.push([r(), r(), r(), r() < 0.25]);
  return (ctx, v, L, t, it) => {
    const zt = 0.925, zb = 1.035;
    const yT = v.sy(0, zt), yB = v.sy(0, zb) + v.k * 0.6;
    if (yT > v.H + 4) return;
    const xa = it.x0, xb = it.x1, taper = 220;
    const far = mix(shade(base, L, 0.2), L.haze, 0.45), nearC = scale(shade(base, L, 0.35), 0.78);
    const g = ctx.createLinearGradient(0, yT, 0, yB);
    g.addColorStop(0, css(far)); g.addColorStop(1, css(nearC));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(v.sx(xa, zt), yT + 0.5);
    ctx.lineTo(v.sx(xa + taper, zt), yT);
    ctx.lineTo(v.sx(xb - taper, zt), yT);
    ctx.lineTo(v.sx(xb, zt), yT + 0.5);
    ctx.lineTo(v.sx(xb + 40, zb), yB);
    ctx.lineTo(v.sx(xa - 40, zb), yB);
    ctx.closePath(); ctx.fill();
    // lights between the buildings after dark
    const w = L.windows;
    if (w > 0.08) {
      for (const [u, d, b, cool] of dots) {
        if (b > w * 1.1) continue;
        const z = zt + (zb - zt) * d;
        const x = v.sx(xa + taper * 0.5 + (xb - xa - taper) * u, z), y = v.sy(0, z) - v.k * 0.6;
        const c = cool ? [190, 220, 255] : [255, 196, 120];
        ctx.fillStyle = css(c, clamp(w * 1.2));
        const s = Math.max(1, v.k * 0.9);
        ctx.fillRect(x, y, s, s);
      }
    }
  };
}

// The quay along the front of a city: a lit top edge, a darker face to the water, street lights after dark.
export function quay(seed, i, shore) {
  const base = GROUND[shore] || GROUND.concrete;
  return (ctx, v, L, t, it) => {
    const z = 1.035;
    const y0 = v.sy(0, z), top = y0 - v.k * z * 2.6;
    if (top > v.H + 4) return;
    const xa = v.sx(it.x0 - 40, z), xb = v.sx(it.x1 + 40, z);
    ctx.fillStyle = css(scale(shade(base, L, 0.1), 0.55));
    ctx.fillRect(xa, top, xb - xa, y0 - top);
    ctx.fillStyle = css(shade(base, L, 0.95, { gloss: 0.1 }));
    ctx.fillRect(xa, top, xb - xa, Math.max(1, v.k * 0.7));
    const w = L.windows;
    if (w > 0.1) {
      const step = 26;
      const first = Math.ceil((it.x0 - 20) / step) * step;
      for (let x = first; x < it.x1 + 20; x += step) {
        const sx = v.sx(x, z);
        if (sx < -20 || sx > v.W + 20) continue;
        const ly = top - v.k * z * 5;
        ctx.fillStyle = css([255, 214, 150], clamp(w * 1.3));
        ctx.fillRect(sx, ly, Math.max(1, v.k), Math.max(1, v.k));
        spriteGlow(ctx, sx, ly, v.k * 9, [255, 190, 120], 0.35 * w);
      }
    }
  };
}

// The far coast: a strip of land on the horizon with tiny buildings and, after dark, a string of lights. An item
// drawn in its own frame (3000 wide, 30 high, bottom-centre at the chunk's middle) and cached per light.
export function farCoast(seed, i, shore, z) {
  const base = GROUND[shore] || GROUND.concrete;
  const r = rng(hash(seed, 'coast', i));
  const blocks = [], lights = [];
  let x = -1500;
  while (x < 1500) {
    const w = r.range(6, 22), dense = 0.5 + 0.5 * Math.sin((x / 3000) * Math.PI * 2 + i);
    if (r() < 0.35 + 0.5 * dense) blocks.push([x, w, r.range(3, 10 + 22 * dense * r()), r()]);
    x += w + r.range(0, 30) * (1.2 - dense);
  }
  for (let n = 0; n < 420; n++) lights.push([r.range(-1500, 1500), r.range(0, 1), r(), r() < 0.22]);
  const draw = (ctx, o) => {
    const L = keyedLight(o.L, (hash(seed, i, shore) % 1024) / 1024);
    const c = ownCache(`coast:${seed}:${i}:${shore}:${L.q}`, 3000, 40, o.scale, (g) => {
      const land = mix(shade(base, L, 0.2), L.haze, 0.3);
      g.fillStyle = css(land);
      // a low coastline that rises and falls
      g.beginPath(); g.moveTo(-1500, 0);
      for (let k = 0; k <= 60; k++) { const u = -1500 + k * 50; g.lineTo(u, -3 - 2.5 * Math.sin(u * 0.004 + i) - 1.5 * Math.sin(u * 0.017)); }
      g.lineTo(1500, 0); g.closePath(); g.fill();
      for (const [bx, bw, bh, s] of blocks) {
        g.fillStyle = css(mix(shade([196, 196, 200], L, s < 0.5 ? 0.6 : -0.2, { gloss: 0.2 }), L.haze, 0.2));
        g.fillRect(bx, -3 - bh, bw, bh);
      }
      if (L.windows > 0.05) {
        for (const [lx, ly, b, cool] of lights) {
          if (b > L.windows) continue;
          g.fillStyle = css(cool ? [200, 226, 255] : [255, 200, 130], 0.95);
          g.fillRect(lx, -2 - ly * 9, 2.2, 1.6);
        }
      }
    });
    ctx.drawImage(c, -1500, -40, 3000, 40);
  };
  void z;
  return draw;
}

// A cache at the exact pixel scale (paint.js's cached() rounds to quarters, too coarse for a 3000-unit strip).
const OWN = new Map();
function ownCache(key, w, h, pxScale, paint) {
  const s = Math.max(0.05, Math.round(pxScale * 50) / 50);
  const k = key + '@' + s;
  let c = OWN.get(k);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.ceil(w * s); c.height = Math.ceil(h * s);
  const g = c.getContext('2d');
  g.scale(s, s); g.translate(w / 2, h);
  paint(g);
  OWN.set(k, c);
  if (OWN.size > 40) OWN.delete(OWN.keys().next().value);
  return c;
}
