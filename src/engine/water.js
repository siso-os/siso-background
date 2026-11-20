// What the water does to the 2D layers: mirrored, squashed reflections broken into moving horizontal ripple slices,
// the long vertical streaks lights throw on night water, and the bloom of bright lights. All of it reads the layer
// canvases the renderer has just drawn, so a real asset's reflection appears with no work in the asset.

const scratch = new Map();
function canvas(name, w, h) {
  let c = scratch.get(name);
  if (!c) { c = document.createElement('canvas'); scratch.set(name, c); }
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}

// Draw src rows [sy, sy + sh) (whose bottom row touches the water at screen y yw) mirrored below yw, squashed, in
// slices that slide sideways with the waves and fade with depth.
//   o: { squash, depth (px), slice (px), amp (px), alpha, t, phase, dx }
export function mirror(ctx, src, sx, sy, sw, sh, yw, o) {
  const squash = o.squash ?? 0.8, slice = Math.max(1, o.slice ?? 2), amp = o.amp ?? 2, t = o.t || 0, ph = o.phase || 0;
  const depth = Math.min(o.depth ?? sh * squash, sh * squash);
  const n = Math.ceil(depth / slice);
  if (n <= 0) return;
  const ga = ctx.globalAlpha;
  for (let i = 0; i < n; i++) {
    const d0 = i * slice;
    const s0 = d0 / squash, s1 = (d0 + slice) / squash;
    const f = i / n;
    // a band of ripples: the alpha breathes row to row, so the mirror image reads as broken water
    const rip = Math.max(0, 0.45 + 0.75 * Math.sin(i * 1.9 + t * 2.3 + ph) * Math.sin(i * 0.53 - t * 1.1 + ph * 0.7));
    const a = (o.alpha ?? 0.5) * (1 - f) ** 1.3 * rip;
    if (a < 0.008) continue;
    const off = (Math.sin(t * 1.7 + i * 0.83 + ph) * (0.35 + 1.5 * f) + Math.sin(t * 3.1 - i * 2.3 + ph) * 0.45) * amp;
    ctx.globalAlpha = ga * a;
    ctx.drawImage(src, sx, sy + sh - s1, sw, s1 - s0, (o.dx ?? sx) + off, yw + d0, sw, slice);
  }
  ctx.globalAlpha = ga;
}

// Copy a band of a canvas into a scratch canvas (drawing a canvas into itself, slice by slice, would copy it each time).
export function grab(name, src, sx, sy, sw, sh) {
  const c = canvas(name, sw, sh);
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  return c;
}

// The bright pass: the layer at a quarter of its size, keeping only what is brighter than pass.th (0..1), scaled up by
// pass.gain: (x - th) * gain, the same ramp the brightness/contrast filter gave. Returns the small canvas, with the
// layer's own coverage (where the layer is empty it stays empty, so adding it never covers the sky behind).
// No canvas filter here or in bloom: without a fast GPU path a filter runs on the CPU, and from dusk on (when the
// lights come on) it stalled frames for seconds (tools/perf.html from t=21.6: frames up to 12 s, against 32 ms at noon).
// Two blend fills make the threshold: lighten with th gives max(x, th), difference with th then gives max(0, x - th).
// The gain is the canvas added to itself; then the layer's coverage is put back.
export const BLOOM_PASS = { th: 0.825, gain: 4.24 };
export function bright(name, src, q = 4, pass = BLOOM_PASS) {
  const w = Math.ceil(src.width / q), h = Math.ceil(src.height / q);
  const c = canvas(name, w, h);
  const g = c.getContext('2d');
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, w, h);
  g.drawImage(src, 0, 0, w, h);
  const m = canvas(name + ':cover', w, h), mg = m.getContext('2d');
  mg.clearRect(0, 0, w, h); mg.drawImage(c, 0, 0);
  const v = Math.round(pass.th * 255);
  g.fillStyle = `rgb(${v},${v},${v})`;
  g.globalCompositeOperation = 'lighten'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'difference'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  let have = 1;
  while (have * 2 <= pass.gain) { g.drawImage(c, 0, 0); have *= 2; }
  if (pass.gain > have * 1.02) { g.globalAlpha = pass.gain / have - 1; g.drawImage(c, 0, 0); g.globalAlpha = 1; }
  g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return c;
}

// halve(name, src): src at half its size; drawing at exactly half averages each 2x2 block, so the light is kept.
function halve(name, src) {
  const c = canvas(name, Math.ceil(src.width / 2), Math.ceil(src.height / 2));
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = true;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// Bloom: the bright pass softened and added back over the layer, a tight glow and a wide one. The softening is the pass
// halved again and again and stretched back up (a mip blur): the same light, spread about as far as the old 1.5 px and
// 5 px blurs at a quarter size spread it, without a filter.
export function bloom(ctx, b, W, H, amt) {
  if (amt <= 0.01) return;
  const m1 = halve('bloom:1', b), m2 = halve('bloom:2', m1), m3 = halve('bloom:3', m2), m4 = halve('bloom:4', m3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = true;
  for (const [m, a] of [[m2, 0.55], [m3, 0.25], [m4, 0.2]]) {
    ctx.globalAlpha = Math.min(1, a * amt);
    ctx.drawImage(m, 0, 0, W, H);
  }
  ctx.restore();
}

// Night streaks: every light above the waterline throws a long broken vertical streak down the water (option b).
// The bright band above yw is collapsed to one row by halving (an exact average), then stretched down in slices.
export function streaks(ctx, b, q, yw, rise, len, t, amt, W) {
  if (amt <= 0.01 || len < 4) return;
  const y0 = Math.max(0, Math.floor((yw - rise) / q)), y1 = Math.max(y0 + 1, Math.floor(yw / q));
  let h = y1 - y0;
  let c = canvas('streak:0', b.width, h);
  let g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(b, 0, y0, b.width, h, 0, 0, b.width, h);
  let k = 1;
  while (h > 1) {
    const nh = Math.ceil(h / 2);
    const d = canvas('streak:' + k, b.width, nh);
    const dg = d.getContext('2d');
    dg.clearRect(0, 0, d.width, d.height);
    dg.drawImage(c, 0, 0, b.width, h, 0, 0, b.width, nh);
    c = d; h = nh; k++;
  }
  // the average is dim (a light fills few rows of the band): lift it back by adding the row to itself, which raises
  // its alpha with its colour (a brightness filter leaves alpha alone, and the averaged alpha is what was faint)
  const gain = Math.min(22, (y1 - y0) / 2.2);
  const row = canvas('streak:row', b.width, 1), tmp = canvas('streak:tmp', b.width, 1);
  g = row.getContext('2d');
  const tg = tmp.getContext('2d');
  g.clearRect(0, 0, row.width, 1);
  g.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'lighter';
  let have = 1;
  while (have * 2 <= gain) {
    tg.clearRect(0, 0, tmp.width, 1); tg.drawImage(row, 0, 0);
    g.drawImage(tmp, 0, 0); have *= 2;
  }
  if (gain > have) { tg.clearRect(0, 0, tmp.width, 1); tg.drawImage(row, 0, 0); g.globalAlpha = gain / have - 1; g.drawImage(tmp, 0, 0); g.globalAlpha = 1; }
  g.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const slice = Math.max(2, Math.round(len / 90));
  const n = Math.ceil(len / slice);
  // each slice is a wave face: it catches the light or misses it (gaps), and slides sideways by its own amount, so the
  // streak reads as broken dashes rather than a smooth wiggle. Hashed from the slice and a slowly blended time step.
  const hs = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const ts = t * 3, t0 = Math.floor(ts), tf = ts - t0, sm = tf * tf * (3 - 2 * tf);
  for (let i = 0; i < n; i++) {
    const f = i / n;
    const h1 = hs(i * 1.7 + t0 * 0.37) * (1 - sm) + hs(i * 1.7 + (t0 + 1) * 0.37) * sm;
    const h2 = hs(i * 2.3 + 5.1 + t0 * 0.53) * (1 - sm) + hs(i * 2.3 + 5.1 + (t0 + 1) * 0.53) * sm;
    const rip = Math.max(0, h1 * 1.6 - 0.45) * (0.75 + 0.25 * Math.sin(i * 0.61 - t * 1.3));
    const a = amt * 1.15 * (1 - f) ** 1.5 * rip;
    if (a < 0.01) continue;
    const off = ((h2 - 0.5) * (1 + 6 * f) + Math.sin(t * 2.2 + i * 0.4) * 0.6) * (W / 1600);
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(row, 0, 0, row.width, 1, off, yw + i * slice, W, slice);
  }
  ctx.restore();
}

export { canvas as scratchCanvas };
