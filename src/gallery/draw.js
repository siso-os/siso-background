// How the asset page paints one asset into a canvas: the light at an hour, a backdrop (the sky gradient with its sun,
// moon, stars and a strip of sea; or flat grey or black, as tools/probe.html does), then the asset fitted and anchored
// as CONTRACT.md section 3 says. Tiles and the large preview both draw through drawScene().

import { lightAt } from '../core/light.js';
import { css, mix, scale, vgrad, glow } from '../core/paint.js';
import { rng, clamp } from '../core/rng.js';
import { drawAsset } from '../assets/registry.js';

// Families that live above the weather: drawn in space light (lightAt with altitude 1), no sea.
const HIGH = new Set(['space']);
// Families with no ground: their anchor is a hover or burst point, so they sit mid-frame instead of on the sea line.
const AFLOAT = new Set(['air', 'space', 'aliens', 'fx']);

export const lightFor = (a, hour) => lightAt(hour, { altitude: HIGH.has(a.family) ? 1 : 0 });

const HORIZON = 0.8; // the sea line, as a fraction of the height
const BASE = 0.885; // where a grounded asset's anchor sits

export function backdrop(ctx, W, H, L, back = 'sky', high = false) {
  if (back === 'grey') { ctx.fillStyle = '#6b6e73'; ctx.fillRect(0, 0, W, H); return; }
  if (back === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
  const hy = high ? H : H * HORIZON;
  ctx.fillStyle = vgrad(ctx, 0, hy, [[0, L.sky.top], [0.72, mix(L.sky.top, L.sky.horizon, 0.55)], [1, L.sky.horizon]]);
  ctx.fillRect(0, 0, W, Math.ceil(hy));
  const u = Math.min(W, H);
  if (L.stars > 0.02) { // seeded, so the stars stay put as the hour moves
    const r = rng(17);
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * hy * 0.85, b = r();
      ctx.fillStyle = `rgba(235,240,255,${(0.25 + 0.6 * b) * L.stars * (1 - y / hy * 0.7)})`;
      const s = Math.max(1, u / 260) * (b > 0.92 ? 1.6 : 1);
      ctx.fillRect(x, y, s, s);
    }
  }
  if (L.sun.up && L.sun.elev > -0.1) { // the sun: a hot core and a wide bloom, lower and warmer at the ends of the day
    const sx = L.sun.x * W, sy = (0.06 + 0.9 * L.sun.y) * hy;
    glow(ctx, sx, sy, u * (0.5 + 0.3 * L.golden), L.key, 0.22 + 0.25 * L.golden);
    glow(ctx, sx, sy, u * 0.05, [255, 250, 236], 0.9);
  } else if (L.moon.up && L.night > 0.5) {
    const mx = L.moon.x * W, my = (0.12 + 0.6 * (1 - L.moon.elev)) * hy;
    glow(ctx, mx, my, u * 0.22, [150, 172, 214], 0.18);
    ctx.fillStyle = 'rgba(232,236,246,0.92)';
    ctx.beginPath(); ctx.arc(mx, my, Math.max(2, u * 0.018), 0, Math.PI * 2); ctx.fill();
  }
  if (high) return;
  // the sea: the horizon haze, darkening to the foreground, with a glitter path under the sun or moon
  const deep = scale(mix(L.ambient, L.sky.top, 0.5), 0.55);
  ctx.fillStyle = vgrad(ctx, hy, H, [[0, mix(L.haze, L.sky.horizon, 0.4)], [0.25, mix(L.haze, deep, 0.5)], [1, deep]]);
  ctx.fillRect(0, Math.floor(hy), W, H - Math.floor(hy));
  const src = L.sun.up ? L.sun : L.moon;
  const gx = src.x * W, ga = (L.sun.up ? 0.35 + 0.4 * L.golden : 0.25 * L.night);
  const r = rng(5), lines = Math.round((H - hy) / Math.max(2, u / 120));
  for (let i = 0; i < lines; i++) {
    const f = i / lines, y = hy + 1 + f * (H - hy);
    const half = (0.02 + 0.12 * f) * W * (0.4 + 0.6 * r());
    ctx.fillStyle = css(L.key, ga * (1 - f * 0.6) * r());
    ctx.fillRect(gx - half + (r() - 0.5) * half, y, half * 2 * (0.3 + 0.7 * r()), Math.max(1, u / 300));
  }
  ctx.fillStyle = css(mix(L.haze, [255, 255, 255], 0.3), 0.35);
  ctx.fillRect(0, Math.floor(hy), W, Math.max(1, u / 240));
}

// fit(a, W, H, zoom): scale and anchor point for an asset in a W x H canvas.
export function fit(a, W, H, zoom = 1) {
  const s = Math.min((W * 0.78) / Math.max(1, a.w), (H * 0.72) / Math.max(1, a.h)) * zoom;
  const afloat = AFLOAT.has(a.family) || (a.family === 'fixture' && a.free);
  const y = afloat ? H / 2 + (a.h * s) / 2 : H * BASE;
  return { s, x: W / 2, y: Math.min(y, H * 0.97) };
}

// The moment a still tile shows: a little way into its loop, or most of the way through a once-only default state.
export function restFrame(a, state = a.states[0]) {
  const once = a.once && a.once[state];
  return { t: once ? once * 0.6 : Math.min(1.5, (a.loop || 3) / 2), p: once ? 0.6 : 0 };
}

// drawScene(canvas, a, { hour, state, t, p, seed, back }) paints one frame. Pure: the same options draw the same pixels.
export function drawScene(canvas, a, { hour = 17.8, state, t = 0, p = 0, seed = 0, back = 'sky', sky } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  if (!W || !H) return false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const L = lightFor(a, hour);
  if (a.sky && sky) { // a sky entry: the engine paints the whole frame
    try { sky(canvas, a, hour, t); return true; } catch (e) { backdrop(ctx, W, H, L, 'black'); return false; }
  }
  backdrop(ctx, W, H, L, back, HIGH.has(a.family));
  const f = fit(a, W, H);
  ctx.save();
  ctx.translate(f.x, f.y); ctx.scale(f.s, f.s);
  const ok = drawAsset(ctx, a, { t, p: clamp(p), state: state || a.states[0], seed, L, lit: L.side, scale: f.s });
  ctx.restore();
  return ok;
}

// The size a canvas should be for its box on this screen (device pixels, capped so a big stage stays cheap).
export function sizeCanvas(canvas, cap = 2) {
  const r = canvas.getBoundingClientRect();
  const d = Math.min(cap, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
  if (canvas.width === w && canvas.height === h) return false;
  canvas.width = w; canvas.height = h;
  return true;
}

// Pixel helpers for the self-test: how much of a canvas differs from another frame, and how bright it is.
export const pixels = (canvas) => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
export function diffShare(a, b) {
  if (a.length !== b.length) return 1;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++;
  return n / (a.length / 4);
}
export function brightness(d) {
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return s / (d.length / 4);
}
