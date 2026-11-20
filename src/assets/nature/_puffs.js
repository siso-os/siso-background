// puffCloud(def): a cloud the way a painter builds one: many soft overlapping puffs. Each puff is lit as a ball (bright
// toward the sun, grey away from it, greyer the lower it sits), the puffs are blurred together into one volume, the
// outline is a soft mask of the same puffs with wisps torn off it, the base is cut flat, and the edge that faces the sun
// gets a bright rim (the light coming through the thin edge). Replaces the relief-baked clouds of round 1, whose bump
// shading read as popcorn.
// def.puffs(seed) -> { puffs: [{ x, y, r, sy?, a?, wisp? }], top, base, blur?, edge? }  (units, y up is negative)
// Cached: the shape per seed and resolution, the lit cloud per quarter hour and side. Drawing is one drawImage.
import { lru, canvasOf } from './_lib.js';
import { clamp, smooth, lerp } from '../../core/rng.js';
import { css, mix } from '../../core/paint.js';

const SHAPES = lru(24), LIT = lru(64);   // the lit picture first, the shape made only when it is missing (see _range.js)
const cl = (c) => [Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2])];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const grey = (c, k) => { const m = (c[0] + c[1] + c[2]) / 3; return mix(c, [m, m, m * 1.03], k); };
// over-bright light keeps its hue (a clamp would turn gold into lemon) and burns toward white
const tone = (c) => {
  const m = Math.max(c[0], c[1], c[2]); if (m <= 255) return c;
  return mix(sc(c, 255 / m), [255, 255, 255], clamp((m - 255) / 420) * 0.7);
};

// The four colours of a cloud under the light L: the sun side, the side away from it, the flat base, and the rim.
export function puffColours(L) {
  const ka = L.keyAmt, night = L.night, low = smooth(0.4, 0.04, L.keyHeight) * (1 - night);
  const sky = mix(mix(L.ambient, L.sky.top, 0.45), L.sky.horizon, 0.28);
  const lit = tone(add(sc(sky, 0.5 + 0.3 * night), sc(L.key, 0.22 + 0.95 * ka + 0.5 * night * ka)));
  // the far side: the sky's light, greyed (cloud is white, so it takes the sky's colour but not all its saturation)
  const skyS = mix(mix(L.ambient, L.sky.top, 0.55), L.sky.horizon, 0.15); // the shadow side sees the blue overhead
  let shadow = cl(add(sc(grey(skyS, 0.4 - 0.2 * low), 0.92 + 0.55 * night), sc(L.key, 0.06 * ka)));
  shadow = mix(shadow, mix(L.sky.top, [104, 74, 124], 0.5), 0.55 * low); // dusk: purple-grey shadow sides
  let base = sc(grey(shadow, 0.35), 0.8);
  // a low sun reaches under the cloud and lights the base rose and gold
  base = mix(base, cl(add(sc(base, 0.4), sc(mix(L.key, [255, 110, 120], 0.4), 0.85 * ka))), 0.6 * low);
  const rim = tone(sc(L.key, 0.5 + 0.7 * ka + 0.4 * night));
  return { lit, shadow, base, rim, low };
}

function shapeOf(def, seed, res) {
  const S = def.puffs(seed);
  const { w, h } = def, W = Math.ceil(w * res), H = Math.ceil(h * res);
  const m = canvasOf(W, H), g = m.getContext('2d');
  g.setTransform(res, 0, 0, res, (w / 2) * res, h * res);
  for (const p of S.puffs) {
    const a = p.a == null ? 1 : p.a, sy = p.sy || 1, core = p.wisp ? 0.1 : 0.62;
    g.save(); g.translate(p.x, p.y); g.scale(1, sy);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, p.r);
    gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(core, `rgba(255,255,255,${a})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-p.r, -p.r, 2 * p.r, 2 * p.r);
    g.restore();
  }
  // the flat base: cut softly a little above the asset's foot
  const b0 = S.base == null ? -6 : S.base;
  g.globalCompositeOperation = 'destination-in';
  const cut = g.createLinearGradient(0, b0 - (S.baseSoft || 10), 0, b0 + 2);
  cut.addColorStop(0, 'rgba(0,0,0,1)'); cut.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = cut; g.fillRect(-w / 2, -h, w, h);
  // soften the outline a touch (soft edges, no cut-out)
  const mask = canvasOf(W, H), mg = mask.getContext('2d');
  mg.filter = `blur(${Math.max(0.5, (S.edge || 2.2) * res)}px)`; mg.drawImage(m, 0, 0); mg.filter = 'none';
  // the centroid and spread, for the side lighting
  let cx = 0, n = 0, xmin = 1e9, xmax = -1e9;
  for (const p of S.puffs) { if (p.wisp) continue; cx += p.x * p.r; n += p.r; xmin = Math.min(xmin, p.x - p.r); xmax = Math.max(xmax, p.x + p.r); }
  return { S, mask, W, H, cx: n ? cx / n : 0, half: Math.max(40, (xmax - xmin) / 2) };
}

function litOf(def, sh, res, L, lit) {
  const { w, h } = def, { S, W, H } = sh;
  const C = puffColours(L), top = S.top || h;
  // light direction on screen (toward the light): sideways when low, from above when high
  const e = lerp(0.08, 1.15, clamp(L.keyHeight)), dx = lit * Math.cos(e), dy = -Math.sin(e);
  // two layers: the body (big puffs, blurred into one soft mass) and the lobes on the outline (lightly blurred)
  const col = canvasOf(W, H), g0 = col.getContext('2d');
  g0.fillStyle = css(mix(C.shadow, C.lit, 0.35)); g0.fillRect(0, 0, W, H);
  g0.setTransform(res, 0, 0, res, (w / 2) * res, h * res);
  // the base-to-top tone under the puffs: grey at the foot
  const vg = g0.createLinearGradient(0, 0, 0, -top);
  vg.addColorStop(0, css(C.base)); vg.addColorStop(0.35, css(C.shadow)); vg.addColorStop(1, css(mix(C.shadow, C.lit, 0.5)));
  g0.fillStyle = vg; g0.fillRect(-w / 2, -h, w, h);
  const lob = canvasOf(W, H), g1 = lob.getContext('2d');
  g1.setTransform(res, 0, 0, res, (w / 2) * res, h * res);
  const order = S.puffs.filter((p) => !p.wisp).sort((a, b) => b.r - a.r || a.y - b.y);
  const hk = clamp(L.keyHeight);
  for (const p of order) {
    const g = p.body ? g0 : g1;
    const hgt = clamp(-p.y / top), side = clamp((p.x - sh.cx) / sh.half, -1, 1) * Math.sign(dx);
    // how much of the sun this puff sees: high puffs and those on the sun side most; a high sun shadows the low ones
    const see = clamp(0.22 + 0.14 * hk * hk + 0.6 * lerp(0.6, hgt, hk) + 0.4 * side * (1 - 0.4 * hk));
    const pl = mix(mix(C.shadow, C.base, 0.3), C.lit, see);
    let ps = mix(C.base, C.shadow, smooth(0, 0.6, hgt) * (0.7 + 0.3 * see));
    // a lobe's shadow side melts into the body behind it, so the lobes read as one surface, not beads
    if (!p.body) ps = mix(ps, hgt < 0.35 ? mix(C.base, C.shadow, hgt / 0.35) : mix(C.shadow, mix(C.shadow, C.lit, 0.5), (hgt - 0.35) / 0.65), 0.55);
    const sy = p.sy || 1, R = p.r;
    g.save(); g.translate(p.x, p.y); g.scale(1, sy);
    // the shade this puff throws on the puffs behind it: a soft dark crescent on its side away from the light
    if (!p.flat && !p.body) {
      const sx = -dx * R * 0.5, sy2 = (-dy * R * 0.5) / sy;
      const sg = g.createRadialGradient(sx, sy2, R * 0.2, sx, sy2, R * 1.1);
      sg.addColorStop(0, css(C.shadow, 0.28)); sg.addColorStop(1, css(C.shadow, 0));
      g.fillStyle = sg; g.fillRect(sx - R * 1.1, sy2 - R * 1.1, R * 2.2, R * 2.2);
    }
    const ox = dx * R * 0.45, oy = (dy * R * 0.45) / sy;
    const gr = g.createRadialGradient(ox, oy, R * 0.05, ox, oy, R * 1.35);
    gr.addColorStop(0, css(pl)); gr.addColorStop(0.32, css(pl)); gr.addColorStop(0.7, css(mix(pl, ps, 0.6))); gr.addColorStop(1, css(ps));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // blur the body into one volume, lay the lobes over it, then cut to the outline
  const out = canvasOf(W, H), o = out.getContext('2d');
  o.filter = `blur(${Math.max(1.5, (S.bodyBlur || 16) * res)}px)`; o.drawImage(col, 0, 0);
  o.filter = `blur(${Math.max(0.8, (S.blur || 4) * res)}px)`; o.drawImage(lob, 0, 0); o.filter = 'none';
  o.globalCompositeOperation = 'destination-in'; o.drawImage(sh.mask, 0, 0);
  // the rim: the part of the outline whose neighbour toward the light is open sky, coloured by the key, added
  const rimW = (S.rim || 9) * res, rim = canvasOf(W, H), rg = rim.getContext('2d');
  rg.drawImage(sh.mask, 0, 0);
  rg.globalCompositeOperation = 'destination-out'; rg.drawImage(sh.mask, -dx * rimW, -dy * rimW);
  rg.globalCompositeOperation = 'source-in'; rg.fillStyle = css(C.rim); rg.fillRect(0, 0, W, H);
  o.globalCompositeOperation = 'lighter';
  o.globalAlpha = clamp(0.3 + 0.55 * C.low + 0.35 * L.night) * (0.5 + 0.5 * L.keyAmt);
  o.filter = `blur(${Math.max(0.6, 1.6 * res)}px)`; o.drawImage(rim, 0, 0); o.filter = 'none';
  o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
  return out;
}

export function puffCloud(def) {
  const { id, w, h } = def;
  return {
    id, family: 'nature', title: def.title, about: def.about, w, h,
    states: ['idle'], loop: 0, variants: def.variants || 4, ref: def.ref || null,
    draw(ctx, o) {
      const L = o.L, lit = o.lit >= 0 ? 1 : -1, seed = o.seed | 0, s = o.scale || 1;
      const res = Math.min(def.maxRes || 1, s >= 1.2 ? 1.2 : s >= 0.8 ? 0.9 : s >= 0.4 ? 0.6 : 0.32);
      const key = `${id}|${seed}|${res}`;
      const cv = LIT.get(`${key}|${L.q}|${lit}`, () => litOf(def, SHAPES.get(key, () => shapeOf(def, seed, res)), res, L, lit));
      ctx.drawImage(cv, -w / 2, -h, w, h);
    },
  };
}
