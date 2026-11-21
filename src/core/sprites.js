// Painted images in place of the coded art. img/index.json (built by tools/art.py from art/map.json) says which image
// draws which asset, per look (picked by the asset's seed), state and light (day, dusk, night). An image loads the
// first time it is wanted; until it has, or when img/ is missing or ?art=0, the asset's coded drawing is used, so the
// scene never waits on a download and stays interactive.
//
// Geometry: each look is scaled so its idle image fills the asset's box on one side (fit: h or w) and stands on the
// asset's anchor (bottom centre). The other states of that look keep the same scale, so a ruin is as wide as the
// building it was. Lights cross-fade with the hour: day, the low golden sun (dusk), night.

import { smooth, clamp } from './rng.js';

let INDEX = null;
let BASE = 'img/';
const IMGS = new Map();     // name -> Image
const waiting = new Set();  // names still loading
let idle = [];              // resolvers waiting for the loads to finish

export const artOn = () => !!INDEX;

// Read the index. Resolves true when the painted art is on.
export async function loadSprites(base = 'img/') {
  BASE = base;
  try {
    const r = await fetch(base + 'index.json');
    if (!r.ok) return false;
    const j = await r.json();
    if (!j || j.v !== 1 || !j.assets) return false;
    INDEX = j;
    return true;
  } catch { return false; }
}
export function spritesOff() { INDEX = null; }

// Resolves when every image asked for so far has loaded (or failed): a still or a film frame draws again after it.
export function artReady() {
  return waiting.size ? new Promise((res) => idle.push(res)) : Promise.resolve();
}

function img(name) {
  let im = IMGS.get(name);
  if (!im) {
    if (typeof Image === 'undefined') return null;
    im = new Image();
    im.decoding = 'async';
    waiting.add(name);
    const done = () => { waiting.delete(name); if (!waiting.size) { const r = idle; idle = []; r.forEach((f) => f()); } };
    im.onload = done; im.onerror = done;
    im.src = BASE + name + '.webp';
    IMGS.set(name, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}

// How much of each light, from L: night as the sun goes down, dusk while it is low and golden. Lights a look lacks
// pass their share on (dusk to day, night to dusk or day).
function weights(L, set) {
  const n = smooth(0.2, 0.85, L.night || 0);
  const g = clamp((L.golden || 0) * 1.4) * (1 - n);
  const w = { day: (1 - n) * (1 - g), dusk: g, night: n };
  if (!set.night) { if (set.dusk) w.dusk += w.night * 0.6, w.day += w.night * 0.4; else w.day += w.night; w.night = 0; }
  if (!set.dusk) { w.day += w.dusk; w.dusk = 0; }
  if (!set.day) { if (set.dusk) w.dusk += w.day; else w.night += w.day; w.day = 0; }
  return w;
}

// The look for an asset and seed, with its scale (world units per source pixel), or null.
function lookOf(a, seed) {
  const e = INDEX && INDEX.assets[a.id];
  if (!e) return null;
  const look = e.pool[(((seed | 0) % e.pool.length) + e.pool.length) % e.pool.length];
  const ref = INDEX.img[look.idle.day || look.idle.dusk || look.idle.night];
  if (!ref) return null;
  const k = e.fit === 'w' ? a.w / ref.sw : a.h / ref.sh;
  return { e, look, k, ref };
}

// Draw one light set (one state's images) bottom-centre on the anchor, cross-fading the lights. fitTo: the idle box
// side every light is stretched to on that side, so the lights line up; otherwise each keeps the look's scale.
// Returns false if no image of the set has loaded yet.
function drawSet(ctx, set, L, k, fit, fitTo, alpha = 1) {
  const w = weights(L, set);
  const order = Object.keys(set).filter((l) => w[l] > 0.003).sort((p, q) => w[q] - w[p]);
  if (!order.length) order.push(Object.keys(set)[0]);
  let sum = 0, drew = false;
  const a0 = ctx.globalAlpha;
  for (const l of order) {
    const name = set[l], m = INDEX.img[name], im = m && img(name);
    sum += w[l] || 1;
    if (!im) continue;
    const s = fitTo ? (fit === 'w' ? fitTo / m.sw : fitTo / m.sh) : k;
    const dw = m.sw * s, dh = m.sh * s;
    ctx.globalAlpha = a0 * alpha * (drew ? (w[l] || 1) / sum : 1);
    if (m.add) { const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(im, -dw / 2, -dh, dw, dh); ctx.globalCompositeOperation = op; }
    else ctx.drawImage(im, -dw / 2, -dh, dw, dh);
    drew = true;
  }
  ctx.globalAlpha = a0;
  return drew;
}

// Draw asset a in state with the painted art. Returns true if it drew (the caller then skips the coded body).
export function drawSprite(ctx, a, o, state) {
  if (!INDEX || o.art === false) return false;
  const lk = lookOf(a, o.seed);
  if (!lk) return false;
  const { e, look, k, ref } = lk;
  const L = o.L || { night: 0, golden: 0 };
  const side = e.fit === 'w' ? a.w : a.h;
  const idleSet = look.idle;
  // the image sets this state needs; if any has nothing loaded yet, the coded drawing stands in for this frame
  const need = state === 'construct' && look.construct ? [look.construct, idleSet, ...(look.ruin ? [look.ruin] : [])]
    : state === 'collapse' ? [idleSet, ...(look.ruin ? [look.ruin] : [])]
    : state === 'ruin' ? [look.ruin || idleSet]
    : [look[state] || idleSet];
  if (!need.every((set) => Object.values(set).map((n) => img(n)).some(Boolean))) return false;
  const flip = e.flip ? -1 : 1;
  ctx.save();
  if (flip < 0) ctx.scale(-1, 1);
  if (e.rot) ctx.rotate((e.rot * Math.PI) / 180);
  const p = clamp(o.p || 0);
  if (state === 'construct' && look.construct) {
    // the ruin, the new building rising out of it floor by floor, then it settles into the finished one
    if (look.ruin) drawSet(ctx, look.ruin, L, k, e.fit, 0, 1 - smooth(0.55, 0.9, p));
    const m = INDEX.img[Object.values(look.construct)[0]];
    const rise = smooth(0, 0.7, p);
    if (rise > 0) {
      const H = m.sh * k;
      ctx.save(); ctx.beginPath(); ctx.rect(-1e4, -H * rise - 1, 2e4, H * rise + 2); ctx.clip();
      drawSet(ctx, look.construct, L, k, e.fit, 0, 1 - smooth(0.75, 1, p));
      ctx.restore();
    }
    if (p > 0.75) drawSet(ctx, idleSet, L, k, e.fit, side, smooth(0.75, 1, p));
  } else if (state === 'collapse') {
    // it drops into its own dust: the ruin shows through as the building sinks below the ground line
    if (look.ruin) drawSet(ctx, look.ruin, L, k, e.fit, 0, smooth(0.25, 0.8, p));
    ctx.save(); ctx.beginPath(); ctx.rect(-1e4, -1e4, 2e4, 1e4); ctx.clip();
    ctx.translate(Math.sin(p * 40) * 1.5 * (1 - p), p * p * ref.sh * k * 0.9);
    drawSet(ctx, idleSet, L, k, e.fit, side, 1 - smooth(0.6, 1, p));
    ctx.restore();
  } else if (state === 'ruin') {
    drawSet(ctx, look.ruin || idleSet, L, k, e.fit, look.ruin ? 0 : side);
  } else if (look[state] && look[state] !== idleSet) {
    drawSet(ctx, look[state], L, k, e.fit, 0);
  } else {
    drawSet(ctx, idleSet, L, k, e.fit, side);
  }
  ctx.restore();
  return true;
}

// Where a carried thing stands on a painted host (world units from its anchor), or null to use the coded slot.
export function spriteSlot(a, seed, name) {
  const lk = INDEX && a && lookOf(a, seed);
  if (!lk || !lk.e.slots || !lk.e.slots[name]) return null;
  const im = img(lk.look.idle.day || Object.values(lk.look.idle)[0]);
  if (!im) return null;
  const m = lk.ref, s = lk.e.fit === 'w' ? a.w / m.sw : a.h / m.sh;
  const [fx, fy] = lk.e.slots[name];
  return [fx * m.sw * s, fy * m.sh * s];
}

// A painted image by name (one of art/map.json's files), once loaded; null before, or with the art off.
export const paintedImage = (name) => (INDEX && INDEX.img[name] ? img(name) : null);

// Whether the asset's coded drawing should still add its effects over the painting (map: fx).
export const spriteFx = (a) => !!(INDEX && INDEX.assets[a.id] && INDEX.assets[a.id].fx);
