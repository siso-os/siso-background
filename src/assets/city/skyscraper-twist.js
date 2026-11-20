// A twisting glass tower: each floor plate turns a little on the one below, so the bright corner spirals up the facade
// and the silhouette breathes in and out; it tapers to a sharp crown.
import { building, floorLights, beacons, crownGlow, lightLayer, pxOf, NEON, css, shade, mix, scale, glassColour, rimColour, glow, clamp } from './_lib.js';

// the signature pairs after dark: the spiral tube and the edge tubes (magenta, cyan and amber lead)
const PAIRS = [[[255, 60, 190], [60, 230, 255]], [[60, 230, 255], [255, 60, 190]], [[255, 176, 48], [60, 230, 255]], [[150, 96, 255], [255, 60, 190]]];

const TINTS = [[110, 150, 176], [90, 140, 150], [140, 150, 168], [160, 140, 120]];

function bands(sp) { // the floor bands with their turn
  const out = [], n = Math.round(sp.h / (sp.band));
  for (let j = 0; j < n; j++) {
    const y1 = -j * sp.band, y0 = y1 - sp.band, u = j / n, ph = sp.phase + j * sp.rate;
    const w = sp.w * (1 - sp.taper * u) * (0.9 + 0.1 * Math.abs(Math.cos(2 * ph)));
    out.push({ x0: -w / 2, x1: w / 2, y0, y1, ph, u });
  }
  return out;
}

export default building({
  id: 'city.skyscraper-twist', salt: 37,
  title: 'Twisting skyscraper',
  about: 'A glass tower whose floors turn as they rise: the lit corner spirals up it and the outline breathes; tapers to a sharp crown.',
  w: 100, h: 290,
  ref: 'refs/options/option-b-neon.webp',
  plan(r) {
    const sp = { h: 180 + r() * 85, w: 40 + r() * 20, band: 3.6 * (1 + Math.floor(r() * 2)), rate: 0.035 + r() * 0.05, phase: r() * 6.28, taper: 0.15 + r() * 0.2, tint: TINTS[Math.floor(r() * TINTS.length)], neon: r() < 0.4 ? NEON[Math.floor(r() * NEON.length)] : null, breakAt: 0.25 + r() * 0.15 };
    sp.bands = bands(sp);
    const top = sp.bands[sp.bands.length - 1];
    sp.tiers = [{ x0: -sp.w / 2, x1: sp.w / 2, y0: -sp.h * 0.5, y1: 0 }, { x0: top.x0, x1: top.x1, y0: -sp.h, y1: -sp.h * 0.5 }];
    sp.base = { x0: sp.bands[0].x0, x1: sp.bands[0].x1 };
    sp.crown = Math.min(285 - sp.h, 16 + r() * 16);
    const pr = PAIRS[Math.floor(r() * PAIRS.length)];
    sp.spiral = sp.neon || pr[0]; sp.edgeCol = pr[1]; sp.edgeSide = r() < 0.5 ? -1 : 1;
    return sp;
  },
  paint(g, o, sp, dead, seed) {
    const L = o.L, lit = o.lit >= 0 ? 1 : -1, night = clamp(L.windows * 1.6) * (dead ? 0 : 1);
    const top = mix(mix(glassColour(L, 1), L.sky.top, 0.3), sp.tint, 0.3), low = mix(scale(glassColour(L, 0.2), 0.75), scale(sp.tint, 0.5), 0.4);
    for (const b of sp.bands) {
      const w = b.x1 - b.x0, base = mix(low, top, 1 - b.u * 0.2 - 0.4 + b.u * 0.6);
      // the corner between two faces sits at c (0..1 across); the face toward the sun is brighter
      const c = 0.5 + 0.45 * Math.sin(b.ph), cx = b.x0 + c * w;
      const fA = shade(base, L, -0.25 * lit, { gloss: 0.6 }), fB = shade(base, L, 0.75 * lit, { gloss: 0.6 });
      const gr = g.createLinearGradient(b.x0, 0, b.x1, 0);
      gr.addColorStop(0, css(scale(fA, 0.92))); gr.addColorStop(Math.max(0.001, c - 0.002), css(fA)); gr.addColorStop(Math.min(0.999, c + 0.002), css(fB)); gr.addColorStop(1, css(scale(fB, 0.9)));
      g.fillStyle = gr; g.fillRect(b.x0, b.y0, w, b.y1 - b.y0);
      g.fillStyle = css(mix(L.key, [255, 255, 255], 0.3), (0.25 + 0.5 * L.golden) * L.keyAmt * (1 - L.night)); g.fillRect(cx - 0.3, b.y0, 0.6, b.y1 - b.y0);
      if (night > 0.02) floorLights(g, b.x0, b.y0, w, b.y1 - b.y0, o, { cols: Math.max(2, Math.round(w / 2.8)), rows: Math.round(sp.band / 3.6), gapX: 0.12, gapY: 0.18, seed: seed * 131 + Math.round(b.y0), cool: 0.55 });
      g.fillStyle = css(scale(sp.tint, 0.3), 0.45); g.fillRect(b.x0 - 0.3, b.y1 - 0.5, w + 0.6, 0.6); // slab edge
      if (dead) { g.fillStyle = 'rgba(18,14,12,0.5)'; g.fillRect(b.x0, b.y0, w, b.y1 - b.y0); }
    }
    // the crown: a tapering blade
    const tb = sp.bands[sp.bands.length - 1];
    const gr = g.createLinearGradient(tb.x0, 0, tb.x1, 0);
    const a = shade(mix(glassColour(L, 1), sp.tint, 0.3), L, -0.4, { gloss: 0.6 }), b = shade(mix(glassColour(L, 1), sp.tint, 0.3), L, 0.9, { gloss: 0.6 });
    gr.addColorStop(0, css(lit > 0 ? a : b)); gr.addColorStop(1, css(lit > 0 ? b : a));
    g.fillStyle = gr; g.beginPath(); g.moveTo(tb.x0, tb.y0); g.lineTo((tb.x0 + tb.x1) / 2 + lit * 2, tb.y0 - sp.crown); g.lineTo(tb.x1, tb.y0); g.fill();
    if (!dead && L.neon > 0.03) { // neon after dark: a tube riding the spiral corner, two more tracing the breathing edges and the blade
      const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
      const a = L.neon, px = pxOf(g), core = Math.max(0.7, 1.05 * px), halo = Math.max(5, 4.5 * px), lay = lightLayer();
      const tube = (x, y0, h, col, k) => {
        g.fillStyle = css(col, 0.16 * a * k); g.fillRect(x - halo / 2, y0, halo, h);
        g.fillStyle = css(mix(col, [255, 255, 255], 0.45), 0.95 * a * k); g.fillRect(x - core / 2, y0, core, h);
        if (lay) { lay.fillStyle = css(col, a * k); lay.fillRect(x - core / 2, y0, core, h); }
      };
      for (const b of sp.bands) {
        const h = b.y1 - b.y0 + 0.05;
        tube(b.x0 + (0.5 + 0.45 * Math.sin(b.ph)) * (b.x1 - b.x0), b.y0, h, sp.spiral, 1);
        tube(sp.edgeSide < 0 ? b.x0 + core / 2 : b.x1 - core / 2, b.y0, h, sp.edgeCol, 0.8);
      }
      const cx = (tb.x0 + tb.x1) / 2 + lit * 2, apex = tb.y0 - sp.crown;
      for (const [c, w] of [[sp.edgeCol, halo], [mix(sp.edgeCol, [255, 255, 255], 0.45), core]]) for (const ctxx of lay ? [g, lay] : [g]) {
        ctxx.strokeStyle = css(ctxx === g ? c : sp.edgeCol, (w === halo ? 0.16 : 0.95) * a); ctxx.lineWidth = w; ctxx.lineJoin = 'miter';
        ctxx.beginPath(); ctxx.moveTo(tb.x0, tb.y0); ctxx.lineTo(cx, apex); ctxx.lineTo(tb.x1, tb.y0); ctxx.stroke();
      }
      g.globalCompositeOperation = op;
    }
  },
  live(ctx, o, sp, seed) {
    const tb = sp.bands[sp.bands.length - 1], cx = (tb.x0 + tb.x1) / 2 + (o.lit >= 0 ? 2 : -2);
    crownGlow(ctx, o, cx, tb.y0 - sp.crown * 0.4, (tb.x1 - tb.x0) * 0.8, mix(sp.edgeCol, [255, 230, 200], 0.4), 0.9 * o.L.neon + 0.3);
    beacons(ctx, o, [[cx, tb.y0 - sp.crown]], seed);
  },
});
