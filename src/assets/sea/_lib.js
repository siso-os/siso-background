// The machines kit, shared by sea, air and defence: baking static bodies, materials under one light, lamps with bloom,
// exhaust flames, bow spray and hulls that sit in the water. Everything is a pure function of o (t, p, seed, L).
import { css, mix, scale, shade, glow, vgrad, hgrad, cached, rimColour, glassColour } from '../../core/paint.js';
import { rng, clamp, lerp, smooth, noise1, hash, ease } from '../../core/rng.js';

export { css, mix, scale, shade, glow, vgrad, hgrad, rimColour, glassColour, rng, clamp, lerp, smooth, noise1, hash, ease };

export const WHITE = [255, 255, 255];
export const TAU = Math.PI * 2;

// Device pixels per world unit right now, read from the transform (covers the engine's scale and the screen's DPR).
export function pxScale(ctx) { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; }

// A private cache for big renders (the probe draws pieces at 5-15 px per unit; cached() stops at 3).
const BIG = new Map();
function bigCanvas(key, w, h, px, paint) {
  const s = Math.min(Math.round(px * 2) / 2, Math.sqrt(6e6 / (w * h)));
  const k = key + '@' + s;
  let c = BIG.get(k);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.ceil(w * s); c.height = Math.ceil(h * s);
  const g = c.getContext('2d');
  g.scale(s, s); g.translate(w / 2, h);
  paint(g, s);
  BIG.set(k, c);
  if (BIG.size > 32) BIG.delete(BIG.keys().next().value);
  return c;
}

// baked(ctx, key, box, o, paint) -> canvas of the static body; box = [x0, y0, x1, y1] in the asset's frame.
// paint(g, s) draws in the asset's own coordinates; s is the detail scale (px per unit) the canvas is baked at.
export function baked(ctx, key, box, o, paint) {
  const px = pxScale(ctx);
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
  const k = `${key}|${o.L.q}|${o.lit}`;
  const wrap = (s) => (g) => { g.translate(-x0 - w / 2, -y0 - h); paint(g, s); };
  if (px > 3) return bigCanvas(k, w, h, px, (g, s) => wrap(s)(g));
  const s = Math.max(0.25, Math.min(3, Math.round(px * 4) / 4));
  return cached(k, w, h, px, wrap(s));
}
export function bake(ctx, key, box, o, paint) {
  const c = baked(ctx, key, box, o, paint);
  ctx.drawImage(c, box[0], box[1], box[2] - box[0], box[3] - box[1]);
}

// Materials. shade() with the facings a side view needs: the side facing the camera, tops facing the sky,
// ends facing toward (1) or away from (-1) the key light.
export const up = (L) => 0.15 + 0.7 * L.keyHeight;
export const mat = (base, L, f = 0, gloss = 0, a = 1) => css(shade(base, L, f, { gloss }), a);
export const endFacing = (o, end) => (end === o.lit ? 1 : -1); // end: 1 = the right (bow) end, -1 = the left

// The water's colour seen at the hull, for the part under the surface.
export function waterTone(L) {
  return mix(mix(scale(L.sky.top, 0.42), scale(L.haze, 0.3), 0.4), [8, 26, 36], 0.45 + 0.2 * L.night);
}

// Fill a path, then lay light over it inside a clip: a vertical shade (sky light on top, dark below) and a horizontal
// one (brighter toward the key light). Used for hulls, fuselages and turrets.
export function litFill(g, path, o, base, { y0, y1, x0, x1, gloss = 0, topLift = 0.25, bottomDrop = 0.45, side = 0.2 }) {
  const L = o.L;
  g.fillStyle = mat(base, L, 0, gloss);
  g.fill(path);
  g.save();
  g.clip(path);
  const topC = shade(base, L, 0.6, { gloss: Math.max(gloss, 0.3) });
  g.fillStyle = vgrad(g, y0, y1, [[0, topC, topLift], [0.45, topC, 0], [0.6, [0, 0, 0], 0], [1, [0, 0, 0], bottomDrop]]);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (side > 0) {
    const k = rimColour(L), lit = o.lit > 0;
    g.fillStyle = hgrad(g, x0, x1, lit
      ? [[0, [0, 0, 0], side * 0.8], [0.55, [0, 0, 0], 0], [1, k, side * 0.6 * L.keyAmt]]
      : [[0, k, side * 0.6 * L.keyAmt], [0.45, [0, 0, 0], 0], [1, [0, 0, 0], side * 0.8]]);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  g.restore();
}

// A thin bright edge where a top surface catches the key light (stronger when the light is low and warm).
export function rim(g, o, draw, width = 0.5, k = 1) {
  const L = o.L;
  const a = (0.25 + 0.55 * L.golden + 0.2 * L.keyAmt) * (1 - 0.6 * L.night) * k;
  if (a <= 0.02) return;
  g.save();
  g.strokeStyle = css(mix(rimColour(L), WHITE, 0.25), clamp(a));
  g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); draw(g); g.stroke();
  g.restore();
}

// A lamp: a hot core and a bloom that grows after dark. k scales it (blink), size in world units.
export function lamp(ctx, x, y, c, o, size = 1, k = 1) {
  if (k <= 0.01) return;
  const n = o.L.night;
  glow(ctx, x, y, size * (4 + 10 * n), c, (0.18 + 0.4 * n) * k);
  glow(ctx, x, y, size * 1.7, mix(c, WHITE, 0.55), (0.55 + 0.4 * n) * k);
}

// Strobe shapes, all functions of t: a short double flash every `period` seconds, offset by `ph`.
export function strobe(t, period = 1.2, ph = 0) {
  const u = (((t + ph) / period) % 1 + 1) % 1;
  return u < 0.05 ? 1 : u > 0.12 && u < 0.16 ? 0.8 : 0;
}
export function beacon(t, period = 1.4, ph = 0) {
  const u = (((t + ph) / period) % 1 + 1) % 1;
  return u < 0.18 ? Math.sin((u / 0.18) * Math.PI) : 0;
}

// An exhaust flame pointing along -x from the nozzle at (x, y): plume, hot core, nozzle bloom. pal = { core, mid, edge }.
export function exhaust(ctx, x, y, len, r, pal, k = 1, { bloom = 1, diamonds = 0, night = 1 } = {}) {
  if (k <= 0.01 || len <= 0) return;
  const op = ctx.globalCompositeOperation;
  // an opaque underlay in the flame's own colour: pure additive light turns a blue flame pink over an orange sky
  let g = ctx.createLinearGradient(x, 0, x - len * 0.7, 0);
  g.addColorStop(0, css(pal.edge, 0.32 * k)); g.addColorStop(1, css(pal.edge, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y - r);
  ctx.bezierCurveTo(x - len * 0.25, y - r * 1.25, x - len * 0.7, y - r * 0.5, x - len, y);
  ctx.bezierCurveTo(x - len * 0.7, y + r * 0.5, x - len * 0.25, y + r * 1.25, x, y + r);
  ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  g = ctx.createLinearGradient(x, 0, x - len, 0);
  g.addColorStop(0, css(pal.mid, 0.9 * k)); g.addColorStop(0.3, css(pal.edge, 0.55 * k)); g.addColorStop(1, css(pal.edge, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y - r);
  ctx.bezierCurveTo(x - len * 0.25, y - r * 1.25, x - len * 0.7, y - r * 0.5, x - len, y);
  ctx.bezierCurveTo(x - len * 0.7, y + r * 0.5, x - len * 0.25, y + r * 1.25, x, y + r);
  ctx.closePath(); ctx.fill();
  g = ctx.createLinearGradient(x, 0, x - len * 0.45, 0);
  g.addColorStop(0, css(pal.core, k)); g.addColorStop(1, css(pal.core, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.6);
  ctx.quadraticCurveTo(x - len * 0.2, y - r * 0.5, x - len * 0.45, y);
  ctx.quadraticCurveTo(x - len * 0.2, y + r * 0.5, x, y + r * 0.6);
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < diamonds; i++) { // shock diamonds in an afterburner
    const dx = x - r * (1.6 + i * 1.5), s = r * (0.45 - i * 0.07);
    ctx.fillStyle = css(pal.core, 0.55 * k * (1 - i / (diamonds + 1)));
    ctx.beginPath(); ctx.moveTo(dx + s * 1.3, y); ctx.lineTo(dx, y - s); ctx.lineTo(dx - s * 1.3, y); ctx.lineTo(dx, y + s); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = op;
  // the bloom is the eye's glare around a hot point: small and faint against a bright day sky, wide at night
  if (bloom > 0) glow(ctx, x - r * 0.6, y, r * (2.6 + 3.4 * night) * bloom, pal.mid, (0.18 + 0.27 * night) * k);
}
export const FLAME = {
  siso: { core: [235, 248, 255], mid: [120, 190, 255], edge: [60, 110, 255] },
  enemy: { core: [255, 246, 210], mid: [255, 150, 60], edge: [230, 60, 20] },
  burner: { core: [255, 244, 214], mid: [255, 168, 80], edge: [255, 90, 40] },
  rocket: { core: [255, 250, 232], mid: [255, 196, 110], edge: [255, 120, 50] },
};

// A flicker in 0.8..1.2 for flames, from noise on t.
export const flicker = (t, seed = 0, rate = 31) => 1 + 0.2 * noise1(t * rate, seed);

// Bow spray: droplets thrown up and back from (x, y), each on its own looping life, pure in t. power 0..1+.
export function spray(ctx, x, y, o, { n = 36, power = 1, seed = 0, size = 1, tint = null } = {}) {
  if (power <= 0.01) return;
  const L = o.L, t = o.t || 0, r = rng(seed * 31 + 7), P = power * size;
  const col = mix(shade([236, 242, 248], L, 0.7), tint || WHITE, tint ? 0.45 * L.night : 0);
  const lift = 1 + 0.12 * Math.sin(t * 7.3 + seed) + 0.08 * Math.sin(t * 13.1);
  ctx.save();
  // the bow sheet: water peeled off the stem, curling up and back, thin and translucent
  for (const [k, h, a] of [[1, 1, 0.45], [0.7, 1.5, 0.3]]) {
    const H = 4.2 * P * h * lift, Lb = 11 * P * k;
    const g = ctx.createLinearGradient(x, 0, x - Lb, 0);
    g.addColorStop(0, css(col, a)); g.addColorStop(0.5, css(col, a * 0.55)); g.addColorStop(1, css(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x + 0.6, y);
    ctx.bezierCurveTo(x - 0.5 * P, y - H * 0.8, x - Lb * 0.35, y - H * 1.1, x - Lb, y - H * 0.55);
    ctx.bezierCurveTo(x - Lb * 0.6, y - H * 0.35, x - Lb * 0.3, y - 0.2, x - Lb * 0.1, y + 0.3);
    ctx.closePath(); ctx.fill();
  }
  // droplets: short streaks along their flight, thrown up and back, falling
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ph = r(), sp = 0.9 + r() * 0.9, vx = -(0.3 + r()) * 15 * P, vy = -(0.5 + r() * 0.9) * 10 * P;
    const sz = (0.12 + r() * 0.3) * size, dx = (r() - 0.5) * 2.5 * P;
    const a = (((t * sp + ph) % 1) + 1) % 1;
    const px = x + dx + vx * a, py = y + vy * a + 18 * P * a * a;
    if (py > y + 0.5) continue;
    const ux = vx * 0.05, uy = (vy + 36 * P * a) * 0.05;
    ctx.strokeStyle = css(col, (1 - a) * 0.8);
    ctx.lineWidth = sz * (1 + a);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - ux, py - uy); ctx.stroke();
  }
  // the mist that hangs over the spray
  const mx = x - 6 * P, my = y - 2.5 * P;
  const g = ctx.createRadialGradient(mx, my, 0, mx, my, 10 * P);
  g.addColorStop(0, css(col, 0.28)); g.addColorStop(1, css(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(mx - 10 * P, my - 10 * P, 20 * P, 12 * P);
  ctx.restore();
}

// A floating hull: the body baked once, drawn above the water in full and below it tinted by the water, pitched about
// the waterline (pitch in radians, + raises the bow) and heaving. spec = { key, box, paint, pivot, draft }.
export function floatBody(ctx, o, spec, { pitch = 0, heave = 0 } = {}) {
  const [x0, y0, x1, y1] = spec.box;
  const body = baked(ctx, spec.key, spec.box, o, spec.paint);
  const sub = baked(ctx, spec.key + ':sub', spec.box, o, (g, s) => {
    spec.paint(g, s);
    const wt = waterTone(o.L);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = vgrad(g, 0, y1, [[0, wt, 0.55], [1, wt, 0.92]]);
    g.fillRect(x0, 0, x1 - x0, y1);
    g.globalCompositeOperation = 'source-over';
  });
  const place = () => { ctx.translate(spec.pivot || 0, heave); ctx.rotate(-pitch); ctx.translate(-(spec.pivot || 0), 0); };
  const W = x1 - x0, pad = W;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - pad, y0 - pad, W + 2 * pad, -(y0 - pad)); ctx.clip();
  place(); ctx.drawImage(body, x0, y0, W, y1 - y0);
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - pad, 0, W + 2 * pad, y1 + pad); ctx.clip();
  place(); ctx.globalAlpha = 0.8; ctx.drawImage(sub, x0, y0, W, y1 - y0);
  ctx.restore();
}

// Where the hull meets the water: a dark contact shadow just under the line and a thin broken foam edge on it.
export function waterline(ctx, o, xa, xb, { foam = 0.5, seed = 0, speed = 0 } = {}) {
  const L = o.L, t = o.t || 0;
  const len = xb - xa;
  ctx.save();
  ctx.fillStyle = hgrad(ctx, xa, xb, [[0, [0, 0, 0], 0], [0.1, [0, 0, 0], 0.28], [0.9, [0, 0, 0], 0.28], [1, [0, 0, 0], 0]]);
  ctx.fillRect(xa, 0, len, Math.max(0.6, len * 0.02));
  const fc = shade([235, 240, 245], L, 0.5);
  if (speed > 0) { // churned white water hugging the hull, thickest toward the bow
    ctx.fillStyle = hgrad(ctx, xa, xb, [[0, fc, 0], [0.5, fc, 0.12 * foam * speed], [1, fc, 0.3 * foam * speed]]);
    ctx.fillRect(xa, -0.35 - 0.25 * speed, len, 0.55 + 0.25 * speed);
  }
  const n = clamp(Math.round(len / 1.1), 10, 48); // a cap keeps a long hull's foam inside the frame budget
  ctx.lineCap = 'butt';
  for (let i = 0; i < n; i++) {
    const u = i / n, v = 0.5 + 0.5 * noise1(u * 13 + t * (0.8 + speed * 3), seed);
    const a = foam * v * (0.3 + 0.7 * smooth(0.5, 1, u) * (0.6 + speed));
    if (a < 0.06) continue;
    const seg = (0.35 + 0.6 * v) * len / n, y = -0.05 - 0.3 * v * speed * smooth(0.6, 1, u);
    ctx.strokeStyle = css(fc, clamp(a));
    ctx.lineWidth = 0.1 + 0.2 * v * (0.4 + speed);
    ctx.beginPath(); ctx.moveTo(xa + u * len, y); ctx.lineTo(xa + u * len + seg, y); ctx.stroke();
  }
  ctx.restore();
}

// A gentle bob for anything afloat, pure in t: { pitch, heave }.
export function bob(o, k = 1, seedPh = 0) {
  const t = (o.t || 0) + seedPh;
  return {
    pitch: k * (0.012 * Math.sin(t * 1.3) + 0.006 * Math.sin(t * 2.7 + 1)),
    heave: k * (0.35 * Math.sin(t * 1.1 + 0.5) + 0.15 * Math.sin(t * 2.3)),
  };
}

// Window glass: sky-coloured by day, with a soft vertical sheen; dark by night unless lit.
export function glass(g, o, x, y, w, h, { tint = [0, 0, 0], lit = 0, warm = [255, 196, 130] } = {}) {
  const L = o.L;
  const sky = shade(glassColour(L, 0.7), L, 0, { gloss: 0.7 });
  const base = mix(mix(sky, tint, 0.35), [6, 10, 16], 0.25 + 0.5 * L.night);
  g.fillStyle = vgrad(g, y, y + h, [[0, mix(base, WHITE, 0.12 * (1 - L.night))], [1, scale(base, 0.6)]]);
  g.fillRect(x, y, w, h);
  if (lit > 0) {
    g.fillStyle = css(warm, lit * clamp(L.windows * 1.15));
    g.fillRect(x, y, w, h);
  }
}

// Seeded helpers for variants.
export const seeded = (o, salt = 0) => rng(hash(o.seed || 0, salt));
