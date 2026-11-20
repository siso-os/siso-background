// A dark block hung with signs: vertical neon boards and a rooftop screen, coloured edge lights; by day the boards are
// pale enamel, after dark they burn and spill colour onto the wall.
import { building, shaft, neonEdges, roofKit, beacons, crownGlow, lightLayer, lightRect, pxOf, NEON, css, shade, mix, scale, glow, rng, clamp } from './_lib.js';

const BASES = [[78, 74, 80], [64, 66, 74], [92, 82, 78], [70, 70, 66]];

function glyphs(g, x, y, w, h, col, a, r, day) { // stacked characters made of short strokes: abstract, no words
  const n = Math.max(2, Math.floor(h / (w * 1.05)));
  for (let k = 0; k < n; k++) {
    const cy = y + (k + 0.5) * h / n, s = w * 0.62;
    for (let q = 0; q < 4; q++) {
      const horiz = r() < 0.5, ox = (r() - 0.5) * s * 0.6, oy = (r() - 0.5) * s * 0.6, len = s * (0.4 + r() * 0.5);
      g.fillStyle = day ? css(col, 0.8) : css(mix(col, [255, 255, 255], 0.5), a);
      if (horiz) g.fillRect(x + w / 2 + ox - len / 2, cy + oy - 0.35, len, 0.7); else g.fillRect(x + w / 2 + ox - 0.35, cy + oy - len / 2, 0.7, len);
    }
  }
}

export default building({
  id: 'city.neon-block', salt: 67,
  title: 'Neon block',
  about: 'A dark mid-rise hung with vertical neon boards and a rooftop screen, edge lights in colour; burns after dark.',
  w: 120, h: 200,
  ref: 'refs/options/option-b-neon.webp',
  plan(r) {
    const H = 90 + r() * 80, W = 50 + r() * 40;
    const signs = [], n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const sw = 5 + r() * 4, sh = 24 + r() * 34; signs.push({ x: -W / 2 + 3 + r() * (W - sw - 6), y: -H * (0.35 + r() * 0.5), w: sw, h: Math.min(sh, H * 0.5), col: NEON[Math.floor(r() * NEON.length)] }); }
    return {
      w: W, h: H, tiers: [{ x0: -W / 2, x1: W / 2, y0: -H, y1: 0 }], col: BASES[Math.floor(r() * BASES.length)],
      edge: NEON[Math.floor(r() * NEON.length)], signs, screen: { w: W * (0.5 + r() * 0.3), h: 10 + r() * 8, col: NEON[Math.floor(r() * NEON.length)] }, breakAt: 0.3 + r() * 0.15,
    };
  },
  paint(g, o, sp, dead, seed) {
    const L = o.L, t = sp.tiers[0], neon = dead ? 0 : L.neon;
    shaft(g, o, t, { kind: 'dark', base: sp.col, ribbon: 0.55, seed }, dead);
    roofKit(g, o, t.x0 + 2, t.x1 - 2, t.y0, seed);
    // the rooftop screen on its frame
    const s = sp.screen, sx = -s.w / 2, sy = t.y0 - s.h - 4;
    g.fillStyle = css(shade([60, 60, 64], L, 0)); g.fillRect(sx + 2, sy + s.h, 0.8, 4); g.fillRect(sx + s.w - 2.8, sy + s.h, 0.8, 4);
    g.fillStyle = css(shade([40, 40, 46], L, 0)); g.fillRect(sx, sy, s.w, s.h);
    // an LED screen runs all day: a picture in its colour (a bright panel and a darker field), a sky sheen by day
    const on = dead ? 0 : Math.max(0.72, neon);
    if (on) {
      const gr = g.createLinearGradient(sx, 0, sx + s.w, 0);
      gr.addColorStop(0, css(scale(s.col, 0.55), on)); gr.addColorStop(0.42, css(s.col, on)); gr.addColorStop(0.58, css(mix(s.col, [255, 255, 255], 0.45), on)); gr.addColorStop(1, css(scale(s.col, 0.4), on));
      g.fillStyle = gr; g.fillRect(sx + 0.6, sy + 0.6, s.w - 1.2, s.h - 1.2);
      g.fillStyle = css([255, 255, 255], 0.5 * on); g.fillRect(sx + s.w * 0.12, sy + s.h * 0.62, s.w * 0.3, s.h * 0.12);
      const sheen = g.createLinearGradient(0, sy, 0, sy + s.h);
      sheen.addColorStop(0, css(L.sky.horizon, 0.3 * (1 - L.windows))); sheen.addColorStop(1, css(L.sky.horizon, 0));
      g.fillStyle = sheen; g.fillRect(sx + 0.6, sy + 0.6, s.w - 1.2, s.h - 1.2);
      const lay = lightLayer();
      if (lay && neon > 0.03) { lay.fillStyle = css(s.col, 0.55 * neon); lay.fillRect(sx + 0.6, sy + 0.6, s.w - 1.2, s.h - 1.2); }
      if (neon > 0.03) { // the sign's neon frame, a tube in a second colour
        const fc = sp.edge === s.col ? NEON[(NEON.indexOf(s.col) + 1) % NEON.length] : sp.edge, k = Math.max(0.6, 0.9 * pxOf(g));
        const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
        for (const c of lay ? [g, lay] : [g]) { c.strokeStyle = css(c === g ? mix(fc, [255, 255, 255], 0.4) : fc, 0.95 * neon); c.lineWidth = k; c.strokeRect(sx - k / 2, sy - k / 2, s.w + k, s.h + k); }
        g.globalCompositeOperation = op;
      }
    }
    for (const sg of sp.signs) { // the boards: enamel by day, burning at night with a spill on the wall
      const r = rng(seed * 17 + Math.round(sg.x * 10));
      if (neon > 0.03) glow(g, sg.x + sg.w / 2, sg.y + sg.h / 2, sg.h * 0.7, sg.col, 0.3 * neon);
      g.fillStyle = css(shade([30, 28, 32], L, 0)); g.fillRect(sg.x, sg.y, sg.w, sg.h);
      g.fillStyle = css(shade([214, 206, 190], L, 0.2), 1 - neon * 0.9); g.fillRect(sg.x + 0.5, sg.y + 0.5, sg.w - 1, sg.h - 1);
      glyphs(g, sg.x, sg.y, sg.w, sg.h, neon > 0.03 ? sg.col : scale(sg.col, 0.6), 0.95 * Math.max(neon, 0.001), r, neon < 0.03);
      if (neon > 0.03) {
        const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
        g.fillStyle = css(sg.col, 0.38 * neon); g.fillRect(sg.x + 0.5, sg.y + 0.5, sg.w - 1, sg.h - 1);
        const k = Math.max(0.4, 0.8 * pxOf(g));
        g.strokeStyle = css(mix(sg.col, [255, 255, 255], 0.35), 0.95 * neon); g.lineWidth = k; g.strokeRect(sg.x + k / 2, sg.y + k / 2, sg.w - k, sg.h - k);
        g.globalCompositeOperation = op;
        const lay = lightLayer(); if (lay) { lay.fillStyle = css(sg.col, 0.8 * neon); lay.fillRect(sg.x, sg.y, sg.w, sg.h); }
      }
      g.fillStyle = css(shade([90, 90, 96], L, 0.4)); g.fillRect(sg.x + sg.w / 2 - 0.3, sg.y - 2, 0.6, 2);
    }
    if (!dead) neonEdges(g, o, sp.tiers, sp.edge);
  },
  live(ctx, o, sp, seed) {
    const s = sp.screen, t = sp.tiers[0], L = o.L;
    if (o.state !== 'ruin' && o.state !== 'collapse') { // the screen's picture shifts slowly
      const ph = ((o.t || 0) * 0.25 + seed * 0.13) % 1, sx = -s.w / 2, sy = t.y0 - s.h - 4;
      ctx.fillStyle = css(mix(s.col, [255, 255, 255], 0.6), 0.3 + 0.2 * L.neon);
      ctx.fillRect(sx + 0.6 + ph * (s.w - 6), sy + 0.6, 5, s.h - 1.2);
    }
    if (o.state !== 'ruin' && o.state !== 'collapse') {
      crownGlow(ctx, o, 0, t.y0 - s.h / 2 - 4, s.w * 0.9, s.col, 0.5 + 0.8 * L.neon);
      for (const sg of sp.signs) crownGlow(ctx, o, sg.x + sg.w / 2, sg.y + sg.h / 2, sg.h * 0.55, sg.col, 0.6 * L.neon);
    }
    beacons(ctx, o, [[0, t.y0 - s.h - 5]], seed);
  },
});
