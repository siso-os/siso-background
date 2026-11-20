// Shared by the city: building(def) turns a seeded plan (tiers of facade, a crown, neon edges) into an asset with the
// four life states. The finished body, its bare frame and its ruined stump are each painted once per seed and quarter
// hour (cached); construct reveals frame then facade bottom-up under a scaffold, collapse drops the top in slices into
// its own dust and ends on the ruin, and every frame is a few drawImage calls plus small live lights.
import { cached, css, mix, scale, shade, glow, rimColour, glassColour, windowLights } from '../../core/paint.js';
import { rng, clamp, lerp, smooth } from '../../core/rng.js';
import { smokeColumn } from '../islands/_lib.js';

export { cached, css, mix, scale, shade, glow, rimColour, glassColour, windowLights, rng, clamp, lerp, smooth, smokeColumn };

export const FLOOR = 3.6; // one storey in world units (a person is about 1.8)
export const NEON = [[60, 230, 255], [255, 60, 190], [255, 176, 48], [150, 96, 255], [70, 255, 170]];
// how far into the evening it is, from the windows: 0 all day (L.windows idles at 0.04 to 0.06 by day), 1 once it is dark.
// Every night-only light here hangs off this, so the day look is untouched.
export const dusk = (L) => smooth(0.1, 0.6, L.windows);
const sideOf = (o) => (o.lit >= 0 ? 1 : -1);

// The light layer: while a body bakes, every light (windows, neon) is painted a second time into a separate canvas,
// which is then blurred and added back over the body. So the bloom comes only from lights, never from the dark walls (a
// blur of the whole body would ring the tower with a dark fringe). Only set inside withBloom(); nothing survives a bake.
let LAYER = null;
export const lightLayer = () => (LAYER ? (LAYER.setTransform(LAYER.__g.getTransform()), LAYER) : null);
// units of the asset per device pixel of whatever g draws into (a cached body is baked at 0.25 to 3 px a unit)
export const pxOf = (g) => 1 / Math.max(0.05, Math.hypot(g.getTransform().a, g.getTransform().b));
export function withBloom(g, amt, paint, { tight = 1.3, wide = 6, a = 1 } = {}) {
  if (amt < 0.03 || typeof document === 'undefined') { paint(); return; }
  const c = g.canvas, lc = document.createElement('canvas'); lc.width = c.width; lc.height = c.height;
  const l = lc.getContext('2d'); l.__g = g;
  const prev = LAYER; LAYER = l;
  try { paint(); } finally { LAYER = prev; }
  const s = Math.hypot(g.getTransform().a, g.getTransform().b) || 1;
  // small in the scene, the renderer's own bloom and night streaks already spread every light: a full glow of our own
  // on top doubled it, and the streaks clipped to white bars on the water
  const k = a * (0.35 + 0.65 * smooth(0.3, 1.0, s));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter';
  g.filter = `blur(${Math.max(0.6, tight * s).toFixed(2)}px)`; g.globalAlpha = Math.min(1, 0.5 * amt * k); g.drawImage(lc, 0, 0);
  g.filter = `blur(${Math.max(1.6, wide * s).toFixed(2)}px)`; g.globalAlpha = Math.min(1, 0.45 * amt * k); g.drawImage(lc, 0, 0);
  g.restore();
}
// clip g, and the light layer with it, to a path; undo with unclipBoth
export function clipBoth(g, path) {
  g.save(); g.beginPath(); path(g); g.clip();
  const l = lightLayer(); if (l) { l.save(); l.beginPath(); path(l); l.clip(); }
}
export function unclipBoth(g) { g.restore(); if (LAYER) LAYER.restore(); }
// fill a rect on g and, while baking, into the light layer too
export function lightRect(g, x, y, w, h, fill) {
  g.fillStyle = fill; g.fillRect(x, y, w, h);
  const l = lightLayer(); if (l) { l.fillStyle = fill; l.fillRect(x, y, w, h); }
}

// floorLights: windows lit the way buildings are: whole floors on or off (about a third dark at night, a few burning end
// to end), runs of neighbouring windows, warm homes and cool offices in a few shades. Unlit windows are left alone so the
// glass or stone under them shows. Seeded: the same floors stay lit.
const WARM = [[255, 196, 118], [255, 214, 160], [255, 180, 98], [255, 226, 186]], COOL = [[206, 226, 255], [176, 210, 255], [226, 236, 255]];
export function floorLights(g, x0, y0, w, h, o, { cols = 6, rows = 10, gapX = 0.2, gapY = 0.25, seed = 0, cool = 0.4, amt = 1 } = {}) {
  const L = o.L, occ = L.windows * amt; if (occ < 0.02) return;
  const r = rng(seed * 7919 + 13), cw = w / cols, rh = h / rows, ww = cw * (1 - gapX), wh = rh * (1 - gapY);
  const lay = lightLayer();
  // big enough to see single windows: each pane on its own, a little brighter under its ceiling light, the odd one
  // dimmed by a blind (runs drawn as one strip read as a barcode up close)
  const panes = cw / pxOf(g) >= 3;
  for (let j = 0; j < rows; j++) {
    // late evening, not a lit grid: about half the floors lit and those patchy (the night ref's towers are mostly dark)
    const v = r(), lit = v < occ * 0.52, full = v < occ * 0.06;
    const dens = full ? 0.96 : lit ? 0.3 + 0.42 * r() : 0.025 * occ;
    const pal = r() < cool && !full ? COOL : WARM, col = pal[Math.floor(r() * pal.length)], br = full ? 0.82 : 0.42 + 0.42 * r();
    for (let i = 0; i < cols;) {
      const run = 1 + Math.floor(r() * 4), n = Math.min(run, cols - i);
      if (r() < dens) {
        const y = y0 + j * rh + (rh - wh) / 2;
        if (panes) {
          for (let k = 0; k < n; k++) {
            const b = br * (0.62 + 0.38 * r()) * (r() < 0.12 ? 0.45 : 1), x = x0 + (i + k) * cw + (cw - ww) / 2, f = css(col, b);
            g.fillStyle = f; g.fillRect(x, y, ww, wh);
            g.fillStyle = css(mix(col, [255, 255, 255], 0.5), 0.3 * b); g.fillRect(x, y, ww, wh * 0.32);
            if (lay) { lay.fillStyle = f; lay.fillRect(x, y, ww, wh); }
          }
        } else {
          const f = css(col, br * (0.78 + 0.22 * r())), x = x0 + i * cw + (cw - ww) / 2, wd = n * cw - (cw - ww);
          g.fillStyle = f; g.fillRect(x, y, wd, wh);
          if (lay) { lay.fillStyle = f; lay.fillRect(x, y, wd, wh); }
        }
      }
      i += run;
    }
  }
}

// ---------------------------------------------------------------- facades
// The front of a tier plus a narrow return face on the sun side. mat: { kind: 'glass'|'stone'|'grid'|'res'|'dark', base, ... }
export function shaft(g, o, t, mat, dead = false) {
  const L = o.L, lit = sideOf(o);
  const { x0, x1, y0, y1 } = t, w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const sw = Math.min(w * 0.2, 9), fx0 = lit > 0 ? x0 : x0 + sw, fx1 = fx0 + w - sw, sx0 = lit > 0 ? fx1 : x0;
  const glass = mat.kind === 'glass';
  // the front face
  if (glass) {
    const tint = mat.tint || [120, 150, 170];
    const top = mix(mix(glassColour(L, 1), L.sky.top, 0.35), tint, 0.3), mid = mix(glassColour(L, 0.55), tint, 0.35);
    const low = mix(scale(glassColour(L, 0.15), 0.7), scale(tint, 0.5), 0.4);
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, css(shade(top, L, 0.1, { gloss: 0.7 }))); gr.addColorStop(0.55, css(shade(mid, L, 0, { gloss: 0.6 }))); gr.addColorStop(1, css(shade(low, L, -0.1, { gloss: 0.5 })));
    g.fillStyle = gr; g.fillRect(fx0, y0, fx1 - fx0, h);
    // cloud and sky reflections: soft diagonal bands
    const r = rng((mat.seed || 1) * 31 + Math.round(y0));
    g.save(); g.beginPath(); g.rect(fx0, y0, fx1 - fx0, h); g.clip();
    for (let i = 0; i < 3; i++) {
      const yy = y0 + r() * h, hh = 10 + r() * 30;
      const rg = g.createLinearGradient(0, yy - hh, 0, yy + hh);
      const c = mix(L.sky.horizon, [255, 255, 255], 0.2);
      rg.addColorStop(0, css(c, 0)); rg.addColorStop(0.5, css(c, 0.12 * (1 - L.night * 0.7))); rg.addColorStop(1, css(c, 0));
      g.fillStyle = rg; g.beginPath(); g.moveTo(fx0, yy - hh); g.lineTo(fx1, yy - hh - w * 0.4); g.lineTo(fx1, yy + hh - w * 0.4); g.lineTo(fx0, yy + hh); g.fill();
    }
    g.restore();
  } else {
    const base = mat.base || [200, 196, 188];
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, css(shade(base, L, 0.15))); gr.addColorStop(1, css(shade(scale(base, 0.86), L, -0.05)));
    g.fillStyle = gr; g.fillRect(fx0, y0, fx1 - fx0, h);
  }
  const amb = dusk(L) * (dead ? 0.3 : 1);
  if (amb > 0.03) { // after dark a facade keeps a little of the night sky above and the city's warm glow below: never a black void
    const ag = g.createLinearGradient(0, -260, 0, 0);
    ag.addColorStop(0, css([18, 24, 44], amb)); ag.addColorStop(0.7, css([22, 22, 36], amb)); ag.addColorStop(1, css([34, 24, 22], amb));
    const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; g.fillStyle = ag; g.fillRect(x0, y0, w, h); g.globalCompositeOperation = op;
  }
  // the windows: by material
  const rows = Math.max(1, Math.round(h / FLOOR)), fh = h / rows;
  const night = clamp(L.windows * 1.6) * (dead ? 0 : 1);
  if (glass) {
    const cols = Math.max(2, Math.round((fx1 - fx0) / (mat.mull || 2.8)));
    if (night > 0.02) floorLights(g, fx0, y0, fx1 - fx0, h, o, { cols, rows, gapX: 0.1, gapY: 0.16, seed: mat.seed, cool: mat.cool == null ? 0.55 : mat.cool });
    g.fillStyle = css(scale(mat.tint || [90, 110, 120], 0.35), 0.28);
    for (let i = 1; i < cols; i++) g.fillRect(fx0 + i * (fx1 - fx0) / cols - 0.15, y0, 0.3, h);
    g.fillStyle = css(scale(mat.tint || [90, 110, 120], 0.3), 0.3);
    for (let j = 1; j < rows; j++) g.fillRect(fx0, y0 + j * fh - 0.2, fx1 - fx0, 0.4);
  } else if (mat.kind === 'stone') { // piers and recessed window columns
    const pier = mat.pier || 3.4, cols = Math.max(2, Math.round((fx1 - fx0) / pier));
    const cw = (fx1 - fx0) / cols;
    g.fillStyle = css(shade(scale(mat.base, 0.55), L, -0.3), 0.85);
    for (let i = 0; i < cols; i++) g.fillRect(fx0 + i * cw + cw * 0.3, y0 + 2, cw * 0.4, h - 4);
    if (night > 0.02) floorLights(g, fx0 + cw * 0.3, y0 + 2, fx1 - fx0, h - 4, o, { cols, rows, gapX: 0.6, gapY: 0.25, seed: mat.seed, cool: 0.15 });
    g.fillStyle = css(shade(mat.base, L, 0.45), 0.5); // the lit edge of every pier
    for (let i = 0; i < cols; i++) g.fillRect(fx0 + i * cw + (lit > 0 ? cw * 0.7 : cw * 0.25), y0, 0.35, h);
  } else if (mat.kind === 'grid' || mat.kind === 'dark') { // ribbon windows between spandrels
    const glassC = shade(glassColour(L, 0.5), L, 0, { gloss: 0.5 });
    for (let j = 0; j < rows; j++) { g.fillStyle = css(scale(glassC, 0.8 + 0.2 * ((j * 7) % 3) / 2)); g.fillRect(fx0 + 1, y0 + j * fh + fh * 0.3, fx1 - fx0 - 2, fh * (mat.ribbon || 0.5)); }
    if (night > 0.02) {
      clipBoth(g, (c) => { for (let j = 0; j < rows; j++) c.rect(fx0 + 1, y0 + j * fh + fh * 0.3, fx1 - fx0 - 2, fh * (mat.ribbon || 0.5)); });
      floorLights(g, fx0 + 1, y0, fx1 - fx0 - 2, h, o, { cols: Math.max(2, Math.round((fx1 - fx0) / 3)), rows, gapX: 0.05, gapY: 0, seed: mat.seed, cool: mat.kind === 'dark' ? 0.5 : 0.6 });
      unclipBoth(g);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)'; const cols = Math.max(2, Math.round((fx1 - fx0) / 6));
    for (let i = 1; i < cols; i++) g.fillRect(fx0 + i * (fx1 - fx0) / cols - 0.2, y0, 0.4, h);
  } else if (mat.kind === 'res') { // punched windows, balconies with a shadow under each slab
    const cols = Math.max(2, Math.round((fx1 - fx0) / 4.2)), cw = (fx1 - fx0) / cols;
    const glassC = shade(glassColour(L, 0.5), L, 0, { gloss: 0.4 });
    g.fillStyle = css(scale(glassC, 0.75));
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) g.fillRect(fx0 + i * cw + cw * 0.22, y0 + j * fh + fh * 0.25, cw * 0.56, fh * 0.55);
    if (night > 0.02) floorLights(g, fx0 + cw * 0.22, y0 + fh * 0.25, fx1 - fx0, h, o, { cols, rows, gapX: 0.44, gapY: 0.45, seed: mat.seed, cool: 0.12, amt: 1.15 });
    const every = mat.balc || 2;
    for (let j = 1; j < rows; j++) if (j % every === 0) {
      const y = y0 + j * fh;
      g.fillStyle = css(shade(mat.base, L, 0.5)); g.fillRect(fx0 - 0.6, y - 0.5, fx1 - fx0 + 1.2, 0.7);
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(fx0, y + 0.2, fx1 - fx0, 0.9);
    }
  }
  // the return face toward the sun
  const sideBase = glass ? mix(glassColour(L, 0.7), mat.tint || [120, 150, 170], 0.3) : (mat.base || [200, 196, 188]);
  const sg = g.createLinearGradient(0, y0, 0, y1);
  sg.addColorStop(0, css(shade(sideBase, L, 0.95, { gloss: glass ? 0.6 : 0.1 }))); sg.addColorStop(1, css(shade(scale(sideBase, 0.85), L, 0.6, { gloss: glass ? 0.5 : 0.1 })));
  g.fillStyle = sg; g.fillRect(sx0, y0, sw, h);
  if (night > 0.02 && sw > 2) floorLights(g, sx0, y0, sw, h, o, { cols: Math.max(1, Math.round(sw / 3)), rows, gapX: 0.3, gapY: 0.3, seed: (mat.seed || 0) + 99, cool: 0.4 });
  if (glass) { // the sun glint running down the corner
    const k = L.keyAmt * (0.25 + 0.6 * L.golden) * (1 - L.night);
    if (k > 0.02) {
      const gx = lit > 0 ? fx1 : fx0, gg = g.createLinearGradient(gx - lit * w * 0.5, 0, gx, 0);
      gg.addColorStop(0, css(L.key, 0)); gg.addColorStop(1, css(L.key, 0.35 * k));
      g.fillStyle = gg; g.fillRect(Math.min(gx, gx - lit * w * 0.5), y0, w * 0.5, h);
    }
  }
  // ambient occlusion at the foot of the tier, a rim of light along the top and the sun edge
  const ao = g.createLinearGradient(0, y1 - Math.min(30, h * 0.4), 0, y1);
  ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(6,6,10,0.28)');
  g.fillStyle = ao; g.fillRect(x0, y1 - Math.min(30, h * 0.4), w, Math.min(30, h * 0.4));
  g.fillStyle = css(rimColour(L), 0.25 + 0.5 * L.golden);
  g.fillRect(x0, y0, w, 0.6); g.fillRect(lit > 0 ? x1 - 0.6 : x0, y0, 0.6, h);
  const up = dusk(L) * (dead ? 0 : 1);
  if (up > 0.03 && y1 > -150) { // after dark the street's sodium light washes up the lowest floors and fades with height
    const ty = Math.max(y0, -150), ug = g.createLinearGradient(0, 0, 0, -150);
    ug.addColorStop(0, css([255, 158, 84], 0.26 * up)); ug.addColorStop(0.3, css([255, 168, 100], 0.08 * up)); ug.addColorStop(1, css([255, 170, 110], 0));
    const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
    g.fillStyle = ug; g.fillRect(x0, ty, w, y1 - ty); g.globalCompositeOperation = op;
  }
  if (dead) { // soot and a dull film over everything
    const sg2 = g.createLinearGradient(0, y0, 0, y1);
    sg2.addColorStop(0, 'rgba(18,14,12,0.55)'); sg2.addColorStop(1, 'rgba(18,14,12,0.3)');
    g.fillStyle = sg2; g.fillRect(x0, y0, w, h);
  }
}

// neon strips up the corners and along each roofline, coming up with L.neon. Widths are held to at least about one
// device pixel (a 0.6-unit tube is a fifth of a pixel at the size the scene draws a tower, and vanished), with a halo of
// a few pixels; the tubes go into the light layer, so the bake blooms them.
// one: a single tube up the sunward corner and the top roofline only (an accent, not an outlined box)
export function neonEdges(g, o, tiers, col, { roof = true, amt = 1, one = false } = {}) {
  const a = o.L.neon * amt; if (a < 0.03) return;
  const px = pxOf(g), core = Math.max(0.6, 1.05 * px), halo = Math.max(6, 5 * px), hot = mix(col, [255, 255, 255], 0.45);
  const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
  const lay = lightLayer();
  const lit = sideOf(o), topT = tiers.reduce((p, t) => (t.y0 < p.y0 ? t : p), tiers[0]);
  for (const t of tiers) {
    for (const x of [t.x0 + core / 2, t.x1 - core / 2]) {
      const near = (x > (t.x0 + t.x1) / 2) === (lit > 0);
      if (one && !near) continue;
      const k = near ? 1 : 0.5, ak = a * k;
      const gr = g.createLinearGradient(x - halo / 2, 0, x + halo / 2, 0);
      gr.addColorStop(0, css(col, 0)); gr.addColorStop(0.5, css(col, 0.3 * ak)); gr.addColorStop(1, css(col, 0));
      g.fillStyle = gr; g.fillRect(x - halo / 2, t.y0, halo, t.y1 - t.y0);
      g.fillStyle = css(hot, 0.95 * ak); g.fillRect(x - core / 2, t.y0, core, t.y1 - t.y0);
      if (lay) { lay.fillStyle = css(col, ak); lay.fillRect(x - core / 2, t.y0, core, t.y1 - t.y0); }
    }
    if (roof && (!one || t === topT)) {
      g.fillStyle = css(hot, 0.95 * a); g.fillRect(t.x0, t.y0 - core / 2, t.x1 - t.x0, core);
      if (lay) { lay.fillStyle = css(col, a); lay.fillRect(t.x0, t.y0 - core / 2, t.x1 - t.x0, core); }
    }
  }
  g.globalCompositeOperation = op;
}

// nightAir(ctx, o, x0, x1, ytop, col, amt): the soft glow hanging in the air round a lit tower after dark (a tall faint
// ellipse in its light's colour) and the warm spill of the street at its foot. Drawn live, so it is never clipped to
// the cached body's box.
export function nightAir(ctx, o, x0, x1, ytop, col = [255, 196, 130], amt = 1) {
  const a = dusk(o.L) * amt; if (a < 0.03) return;
  const w = x1 - x0, cx = (x0 + x1) / 2, h = -ytop, R = w * 0.95 + 14;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, ytop + h * 0.42); ctx.scale(1, Math.max(1, (h * 0.78) / R));
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, css(col, 0.085 * a)); g.addColorStop(0.45, css(col, 0.04 * a)); g.addColorStop(1, css(col, 0));
  ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const Rs = w * 0.8 + 10; ctx.translate(cx, -2); ctx.scale(1, 0.32);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, Rs);
  g.addColorStop(0, css([255, 176, 96], 0.2 * a)); g.addColorStop(0.5, css([255, 170, 96], 0.07 * a)); g.addColorStop(1, css([255, 170, 96], 0));
  ctx.fillStyle = g; ctx.fillRect(-Rs, -Rs, Rs * 2, Rs * 2);
  ctx.restore();
}

// crownGlow: the floodlit top of a tower after dark, a soft light of at least a few pixels round its crown
export function crownGlow(ctx, o, x, y, w, col = [255, 222, 176], amt = 1) {
  const a = dusk(o.L) * amt; if (a < 0.03) return;
  const px = pxOf(ctx);
  glow(ctx, x, y, Math.max(w * 0.9, 7 * px), col, 0.3 * a);
  glow(ctx, x, y, Math.max(w * 0.3, 2 * px), mix(col, [255, 255, 255], 0.4), 0.35 * a);
}

// rooftop plant: boxes, vents, a water tank or a mast
export function roofKit(g, o, x0, x1, y, seed, { tank = false, mast = 0 } = {}) {
  const L = o.L, r = rng(seed * 13 + 5), lit = sideOf(o);
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const w = 3 + r() * 7, h = 1.5 + r() * 3, x = x0 + 1 + r() * Math.max(1, x1 - x0 - w - 2);
    g.fillStyle = css(shade([150, 150, 154], L, -0.1)); g.fillRect(x, y - h, w, h);
    g.fillStyle = css(shade([150, 150, 154], L, 0.8)); g.fillRect(lit > 0 ? x + w - 0.8 : x, y - h, 0.8, h);
  }
  if (tank) {
    const x = lerp(x0 + 4, x1 - 8, r());
    g.fillStyle = css(shade([110, 84, 64], L, 0.1)); g.fillRect(x, y - 7, 5, 4.5);
    g.beginPath(); g.moveTo(x - 0.4, y - 7); g.lineTo(x + 2.5, y - 9); g.lineTo(x + 5.4, y - 7); g.fill();
    g.fillStyle = css(shade([70, 66, 64], L, 0)); g.fillRect(x + 0.4, y - 2.5, 0.5, 2.5); g.fillRect(x + 4.1, y - 2.5, 0.5, 2.5);
  }
  if (mast) {
    const x = lerp(x0, x1, 0.3 + 0.4 * r());
    g.fillStyle = css(shade([170, 170, 176], L, 0.3)); g.fillRect(x - 0.35, y - mast, 0.7, mast);
    g.fillRect(x - 1.2, y - mast * 0.6, 2.4, 0.4);
  }
}

// ---------------------------------------------------------------- the life states
function paintFrame(g, o, sp) { // the bare frame: concrete core, steel columns, floor slabs
  const L = o.L, lit = sideOf(o);
  const conc = shade([158, 154, 148], L, 0.1), steel = shade([92, 80, 72], L, 0.1), slab = shade([186, 180, 172], L, 0.55);
  for (const t of sp.tiers) {
    const w = t.x1 - t.x0, cx = (t.x0 + t.x1) / 2, cw = w * 0.32;
    g.fillStyle = css(conc); g.fillRect(cx - cw / 2, t.y0, cw, t.y1 - t.y0);
    g.fillStyle = css(shade([158, 154, 148], L, 0.9)); g.fillRect(lit > 0 ? cx + cw / 2 - 1 : cx - cw / 2, t.y0, 1, t.y1 - t.y0);
    g.fillStyle = css(steel);
    const n = Math.max(2, Math.round(w / 8));
    for (let i = 0; i <= n; i++) g.fillRect(t.x0 + (i / n) * w - 0.45, t.y0, 0.9, t.y1 - t.y0);
    g.fillStyle = css(slab);
    for (let y = t.y1 - FLOOR; y > t.y0 - 0.1; y -= FLOOR) g.fillRect(t.x0 - 0.6, y, w + 1.2, 0.75);
    g.fillStyle = 'rgba(0,0,0,0.2)';
    for (let y = t.y1 - FLOOR; y > t.y0 - 0.1; y -= FLOOR) g.fillRect(t.x0, y + 0.75, w, 0.5);
  }
}

function jagTop(sp, seed) { // the broken top of the stump: a jagged line with a column or two still standing
  const r = rng(seed * 101 + 7), x0 = sp.base.x0, x1 = sp.base.x1, hb = sp.h * sp.breakAt, pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    let y = -hb + (r() - 0.5) * 12 + (i === 0 || i === n ? 6 : 0);
    if (r() < 0.16) y -= 10 + r() * 14;
    pts.push([x, y]);
  }
  return pts;
}

function paintRuin(g, o, sp, seed, paintBody) {
  const L = o.L, lit = sideOf(o), pts = jagTop(sp, seed);
  g.save(); g.beginPath(); g.moveTo(sp.base.x0 - 2, 2);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.lineTo(sp.base.x1 + 2, 2); g.closePath(); g.clip();
  paintBody(g, true);
  g.restore();
  // rebar and bent columns poking out of the break
  const r = rng(seed * 7 + 3);
  g.strokeStyle = css(shade([70, 56, 48], L, 0)); g.lineWidth = 0.45;
  for (let i = 0; i < 9; i++) {
    const [x, y] = pts[1 + Math.floor(r() * (pts.length - 2))], dx = (r() - 0.5) * 3, len = 3 + r() * 7;
    g.beginPath(); g.moveTo(x + dx, y + 1); g.quadraticCurveTo(x + dx, y - len * 0.6, x + dx + (r() - 0.5) * 6, y - len); g.stroke();
  }
  // a mound of rubble round the foot
  const rw = (sp.base.x1 - sp.base.x0) / 2 + 12, cx = (sp.base.x0 + sp.base.x1) / 2;
  const rub = mix(shade([150, 144, 136], L, 0.2), [40, 36, 34], 0.25);
  for (let k = 0; k < 2; k++) {
    g.fillStyle = css(k ? shade([170, 164, 154], L, 0.7) : rub, k ? 0.5 : 1);
    g.beginPath(); g.moveTo(cx - rw, 0);
    for (let i = 0; i <= 16; i++) { const u = i / 16, x = cx - rw + u * rw * 2; const y = -Math.sin(u * Math.PI) * (9 + 4 * r()) - r() * 2.5; g.lineTo(x + (k ? lit * 1.5 : 0), y + (k ? 1.5 : 0)); }
    g.lineTo(cx + rw, 0); g.closePath(); g.fill();
  }
  for (let i = 0; i < 6; i++) { // slabs leaning in the pile
    const x = cx + (r() - 0.5) * rw * 1.6, y = -2 - r() * 6, a = (r() - 0.5) * 1.2, l = 5 + r() * 8;
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = css(shade([176, 170, 162], L, 0.3 * lit)); g.fillRect(-l / 2, -0.6, l, 1.2); g.restore();
  }
}

function scaffold(ctx, o, x0, x1, ya, yb, t) { // poles, ledgers, braces and netting over the band ya (top) .. yb
  if (yb - ya < 0.5) return;
  const L = o.L;
  ctx.fillStyle = css(mix(shade([60, 110, 130], L, 0), L.haze, 0.2), 0.32); ctx.fillRect(x0 - 2, ya, x1 - x0 + 4, yb - ya);
  ctx.strokeStyle = css(shade([150, 132, 100], L, 0.4), 0.85); ctx.lineWidth = 0.4;
  ctx.beginPath();
  for (const x of [x0 - 2, x0 - 0.6, x1 + 0.6, x1 + 2]) { ctx.moveTo(x, ya); ctx.lineTo(x, yb); }
  for (let y = yb; y > ya; y -= 2) { ctx.moveTo(x0 - 2, y); ctx.lineTo(x0 - 0.6, y); ctx.moveTo(x1 + 0.6, y); ctx.lineTo(x1 + 2, y); }
  for (let y = yb; y > ya + 4; y -= 4) { ctx.moveTo(x0 - 2, y); ctx.lineTo(x0 - 0.6, y - 4); ctx.moveTo(x1 + 2, y); ctx.lineTo(x1 + 0.6, y - 4); }
  ctx.stroke();
}

export function dust(ctx, o, cx, y, w, amt, t, seed, rise = 1) { // a billowing dust cloud, lit on the sun side
  if (amt < 0.01) return;
  const L = o.L, lit = sideOf(o), r = rng(seed * 3 + 1);
  const sh = mix(scale(L.ambient, 0.75), [118, 110, 100], 0.45), li = mix(sh, scale(L.key, 0.45 + 0.5 * L.keyAmt), 0.4);
  // a broad soft veil first, then many small billows over it, larger and thinner as they rise
  const hv = 34 * rise * (0.4 + amt), vg = ctx.createRadialGradient(cx, y - hv * 0.3, 0, cx, y - hv * 0.3, w * 0.8 + hv * 0.4);
  vg.addColorStop(0, css(sh, 0.5 * amt)); vg.addColorStop(1, css(sh, 0));
  ctx.fillStyle = vg; ctx.fillRect(cx - w - hv, y - hv * 1.5, (w + hv) * 2, hv * 2);
  for (let i = 0; i < 26; i++) {
    const v = r(), x = cx + (r() - 0.5) * w * (0.8 + 0.6 * amt) * (1 + v * 0.4), yy = y - v * 34 * rise * amt + (r() - 0.5) * 4 - Math.sin(t * 0.6 + i) * v * 2;
    const rad = (3 + r() * 8 + v * 10) * (0.5 + 0.7 * amt), a = 0.42 * amt * (1 - 0.5 * v);
    const gr = ctx.createRadialGradient(x + lit * rad * 0.3, yy - rad * 0.35, rad * 0.05, x, yy, rad);
    gr.addColorStop(0, css(li, a)); gr.addColorStop(0.5, css(mix(li, sh, 0.6), a * 0.8)); gr.addColorStop(1, css(sh, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, yy, rad, 0, Math.PI * 2); ctx.fill();
  }
}

// building(def): def = { id, title, about, w, h, variants, ref, salt, plan(r, seed) -> spec, paint(g, o, spec, dead, seed), live(ctx, o, spec, seed) }
// spec = { w, h, tiers: [{x0, x1, y0, y1}], base: {x0, x1}, breakAt, beacons: [[x, y]] }
export function building(def) {
  const { id, w: BW, h: BH } = def;
  const PLANS = new Map();
  const planOf = (seed) => {
    let p = PLANS.get(seed);
    if (!p) { p = def.plan(rng(seed * 7919 + (def.salt || 1)), seed); p.base = p.base || { x0: p.tiers[0].x0, x1: p.tiers[0].x1 }; p.breakAt = p.breakAt || 0.3; PLANS.set(seed, p); }
    return p;
  };
  const key = (o, seed, what) => `${id}|${what}|${seed}|${o.L.q}|${sideOf(o)}`;
  const body = (o, seed, sp) => cached(key(o, seed, 'body'), BW, BH, o.scale || 1, (g) => withBloom(g, clamp(dusk(o.L) + o.L.neon * 0.5), () => def.paint(g, o, sp, false, seed)));
  const frame = (o, seed, sp) => cached(key(o, seed, 'frame'), BW, BH, o.scale || 1, (g) => paintFrame(g, o, sp));
  const ruin = (o, seed, sp) => cached(key(o, seed, 'ruin'), BW, BH, o.scale || 1, (g) => paintRuin(g, o, sp, seed, (gg, dead) => def.paint(gg, o, sp, dead, seed)));
  const put = (ctx, c) => ctx.drawImage(c, -BW / 2, -BH, BW, BH);
  const air = (ctx, o, sp) => { // the glow in the air round it after dark, stronger round the tall and the neon-lit
    if (dusk(o.L) < 0.03) return;
    const top = Math.min(...sp.tiers.map((t) => t.y0)), col = sp.neon || sp.edge || [255, 200, 140];
    nightAir(ctx, o, sp.base.x0, sp.base.x1, top, mix(col, [255, 206, 150], sp.neon || sp.edge ? 0.35 : 0), clamp(0.35 + sp.h / 260) * (sp.neon || sp.edge ? 1.25 : 1));
  };
  const clipped = (ctx, c, ya, yb) => { // draw only the band ya (top, negative) .. yb of a cached canvas
    if (yb - ya <= 0.01) return;
    const k = c.height / BH, sy = Math.max(0, (BH + ya) * k), ey = Math.min(c.height, (BH + yb) * k);
    if (ey - sy < 0.5) return;
    ctx.drawImage(c, 0, sy, c.width, ey - sy, -BW / 2, sy / k - BH, BW, (ey - sy) / k);
  };

  function ruinLive(ctx, o, sp, seed, amt = 1) {
    const L = o.L, t = o.t || 0, pts = jagTop(sp, seed);
    if (L.night > 0.05 || L.windows > 0.3) { // embers in the break
      const r = rng(seed * 5 + 2), op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) {
        const [x, y] = pts[1 + Math.floor(r() * (pts.length - 2))], f = 0.5 + 0.5 * Math.sin(t * (2 + r() * 4) + i * 1.7);
        ctx.fillStyle = css([255, 120 + 60 * f, 40], 0.75 * f * amt * Math.max(L.night, L.windows * 0.7));
        ctx.fillRect(x + (r() - 0.5) * 4, y + 1 + r() * 5, 0.9, 0.9);
      }
      ctx.globalCompositeOperation = op;
      glow(ctx, (sp.base.x0 + sp.base.x1) / 2, -sp.h * sp.breakAt, (sp.base.x1 - sp.base.x0) * 0.5, [255, 110, 40], 0.12 * amt * L.night);
    }
    smokeColumn(ctx, (sp.base.x0 + sp.base.x1) / 2, -sp.h * sp.breakAt - 4, 4, t, seed, o, { amt: 0.35 * amt, rise: 50, drift: 14, n: 5, dark: 0.5 });
  }

  return {
    id, family: 'city', title: def.title, about: def.about, w: BW, h: BH,
    states: ['idle', 'construct', 'collapse', 'ruin'], loop: 6, variants: def.variants || 40, ref: def.ref || null,
    once: { construct: 6, collapse: 4 },
    plan: planOf,
    draw(ctx, o) {
      const seed = o.seed | 0, sp = planOf(seed), st = o.state || 'idle', p = clamp(o.p || 0), t = o.t || 0, L = o.L;
      ctx.save();
      try {
        if (st === 'idle' || (st === 'construct' && p >= 1)) {
          air(ctx, o, sp);
          put(ctx, body(o, seed, sp));
          if (def.live) def.live(ctx, o, sp, seed);
        } else if (st === 'construct') {
          const H = sp.h, hc = H * smooth(0.02, 0.8, p), hg = H * smooth(0.14, 1, p);
          const bx0 = sp.base.x0, bx1 = sp.base.x1;
          // a footprint of fresh concrete from the start
          ctx.fillStyle = css(shade([170, 166, 158], L, 0.2)); ctx.fillRect(bx0 - 3, -1.2, bx1 - bx0 + 6, 1.2);
          clipped(ctx, frame(o, seed, sp), -hc, -hg);
          clipped(ctx, body(o, seed, sp), -hg, 0);
          const fade = 1 - smooth(0.9, 1, p);
          if (fade > 0) {
            ctx.globalAlpha = fade;
            const tw = sp.tiers.find((tt) => -tt.y0 >= hg - 0.01 && -tt.y1 <= hg + 0.01) || sp.tiers[sp.tiers.length - 1];
            scaffold(ctx, o, tw.x0, tw.x1, -Math.min(H, hc + 6), -Math.max(0, hg - 14), t);
            ctx.globalAlpha = 1;
            // work lights at the top of the frame and welding sparks below it, brighter after dark
            const nl = clamp(L.windows * 1.4 + 0.15), r = rng(seed * 9 + 1);
            for (let i = 0; i < 4; i++) { const lx = lerp(tw.x0, tw.x1, (i + 0.5) / 4); glow(ctx, lx, -hc - 1, 2.6 + 2.2 * nl, [255, 236, 200], 0.4 * nl * fade); glow(ctx, lx, -hc - 1, 0.9, [255, 255, 240], 0.9 * fade); }
            for (let i = 0; i < 3; i++) {
              const on = Math.sin(t * (7 + i * 3.3) + r() * 9) > 0.6;
              if (on) glow(ctx, lerp(tw.x0, tw.x1, r()), -lerp(hg, hc, r()), 3.5, [200, 230, 255], 0.9 * fade);
            }
          }
          if (def.live && p > 0.97) def.live(ctx, o, sp, seed);
        } else if (st === 'collapse' || st === 'ruin') {
          put(ctx, ruin(o, seed, sp));
          if (st === 'ruin') { ruinLive(ctx, o, sp, seed); return; }
          ruinLive(ctx, o, sp, seed, smooth(0.6, 1, p));
          // the top falls in slices into the break and is lost in its own dust
          const H = sp.h, hb = H * sp.breakAt, c = body(o, seed, sp), k = c.height / BH, r = rng(seed * 23 + 9);
          const drop = (H - hb + 40) * Math.pow(clamp(p / 0.85), 2.2), n = 6, lean = (r() < 0.5 ? -1 : 1);
          ctx.save(); ctx.beginPath(); ctx.rect(-BW, -BH * 2, BW * 2, BH * 2 - hb + 4); ctx.clip();
          for (let i = 0; i < n; i++) {
            const ya = -H - 30 + (i / n) * (H + 30 - hb), yb = -H - 30 + ((i + 1) / n) * (H + 30 - hb);
            const d = drop * (1 + 0.05 * (n - i)), jx = lean * d * (0.04 + 0.03 * r()) + (r() - 0.5) * d * 0.05, rot = lean * d * 0.0008 * (1 + r());
            const sy = Math.max(0, (BH + ya) * k), ey = Math.min(c.height, (BH + yb) * k);
            if (ey - sy < 0.5) continue;
            ctx.save(); ctx.translate(jx, d); ctx.rotate(rot);
            ctx.drawImage(c, 0, sy, c.width, ey - sy, -BW / 2, sy / k - BH, BW, (ey - sy) / k);
            ctx.restore();
          }
          ctx.restore();
          const dAmt = smooth(0.03, 0.3, p) * (1 - smooth(0.7, 1, p));
          dust(ctx, o, (sp.base.x0 + sp.base.x1) / 2, -hb + 6, Math.min(90, (sp.base.x1 - sp.base.x0) * 1.1), dAmt, t, seed, 1.4);
          dust(ctx, o, (sp.base.x0 + sp.base.x1) / 2, -2, Math.min(120, (sp.base.x1 - sp.base.x0) * 1.5), dAmt * smooth(0.15, 0.5, p), t, seed + 4, 0.8);
        }
      } finally { ctx.restore(); }
    },
  };
}

// red aircraft lights on a roof or mast, blinking on a slow beat: a hot core and a wide soft halo when on, a faint ember
// between flashes after dark. Sized in device pixels as well as units, so a beacon reads on a tower 80 px tall.
export function beacons(ctx, o, pts, seed = 0) {
  const t = o.t || 0, ph = (t * 0.7 + seed * 0.37) % 1, on = smooth(0, 0.025, ph) * (1 - smooth(0.15, 0.2, ph));
  const night = dusk(o.L), px = pxOf(ctx);
  if (night < 0.05) { if (ph < 0.18) for (const [x, y] of pts) glow(ctx, x, y, 5, [255, 40, 30], 0.95); return; }
  for (const [x, y] of pts) {
    if (on > 0.01) {
      glow(ctx, x, y, Math.max(6, 5.5 * px), [255, 34, 24], (0.22 + 0.28 * night) * on);
      glow(ctx, x, y, Math.max(1.8, 2.4 * px), [255, 150, 130], on);
    } else if (night > 0.1) glow(ctx, x, y, Math.max(1.6, 1.8 * px), [255, 40, 30], 0.3 * night);
  }
}
