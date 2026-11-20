// An art-deco skyscraper: a wedding cake of stone setbacks with deep window piers, a stepped crown and a needle or a
// copper pyramid; floodlit from below after dark.
import { building, shaft, roofKit, beacons, crownGlow, css, shade, mix, scale, glow, rimColour, clamp } from './_lib.js';

const STONES = [[214, 204, 184], [196, 170, 140], [176, 172, 166], [190, 136, 106], [222, 214, 196]];

export default building({
  id: 'city.skyscraper-deco', salt: 23,
  title: 'Art-deco skyscraper',
  about: 'A stone tower in stepped setbacks, deep piers, a stepped crown with a needle or a copper pyramid, floodlit at night.',
  w: 110, h: 290,
  ref: 'refs/options/option-a-golden.webp',
  plan(r) {
    const H = 150 + r() * 95, W = 52 + r() * 30, n = 3 + Math.floor(r() * 3);
    const tiers = []; let w = W, prev = 0;
    const fr = []; let acc = 0;
    for (let i = 0; i < n; i++) { const f = i === 0 ? 0.42 + r() * 0.15 : (1 - acc) * (0.35 + r() * 0.25); acc += f; fr.push(acc); }
    fr[n - 1] = 0.86;
    for (const f of fr) { tiers.push({ x0: -w / 2, x1: w / 2, y0: -H * f, y1: -prev }); prev = H * f; w *= 0.72 + r() * 0.12; }
    const cw = w * 1.1;
    return {
      w: W, h: H, tiers, stone: STONES[Math.floor(r() * STONES.length)], crownW: cw, crownH: H * 0.14,
      needle: r() < 0.6 ? Math.min(280 - H, 18 + r() * 30) : 0, copper: r() < 0.5, breakAt: 0.28 + r() * 0.12,
    };
  },
  paint(g, o, sp, dead, seed) {
    const L = o.L, lit = o.lit >= 0 ? 1 : -1, mat = { kind: 'stone', base: sp.stone, pier: 3.2, seed };
    sp.tiers.forEach((t, i) => {
      shaft(g, o, t, mat, dead);
      g.fillStyle = css(shade(sp.stone, L, 0.6)); g.fillRect(t.x0 - 0.8, t.y0 - 1, t.x1 - t.x0 + 1.6, 1.4); // cornice
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(t.x0 - 0.8, t.y0 + 0.4, t.x1 - t.x0 + 1.6, 0.8);
    });
    // the crown: three narrowing steps with vertical fins, then a needle or a copper pyramid
    const top = sp.tiers[sp.tiers.length - 1], cx = (top.x0 + top.x1) / 2;
    let y = top.y0, w = top.x1 - top.x0;
    for (let k = 0; k < 3; k++) {
      w *= 0.74; const h = sp.crownH / 3;
      shaft(g, o, { x0: cx - w / 2, x1: cx + w / 2, y0: y - h, y1: y }, { kind: 'stone', base: mix(sp.stone, [240, 236, 226], 0.3), pier: 1.8, seed: seed + k }, dead);
      y -= h;
    }
    if (sp.copper) {
      const gr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      const a = shade([96, 150, 128], L, -0.6, { gloss: 0.3 }), b = shade([96, 150, 128], L, 0.8, { gloss: 0.3 });
      gr.addColorStop(0, css(lit > 0 ? a : b)); gr.addColorStop(1, css(lit > 0 ? b : a));
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx - w / 2, y); g.lineTo(cx, y - w * 0.9); g.lineTo(cx + w / 2, y); g.fill();
      y -= w * 0.9;
    }
    if (sp.needle) {
      g.fillStyle = css(shade([200, 200, 206], L, 0.5, { gloss: 0.5 }));
      g.beginPath(); g.moveTo(cx - 1, y); g.lineTo(cx, y - sp.needle); g.lineTo(cx + 1, y); g.fill();
    }
    if (!dead && L.windows > 0.2) { // floodlights washing up the crown
      const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
      const yb = top.y0 + 14, yt = top.y0 - sp.crownH - 4;
      const gr = g.createLinearGradient(0, yb, 0, yt);
      gr.addColorStop(0, css([255, 200, 130], 0.4 * L.windows)); gr.addColorStop(1, css([255, 200, 130], 0));
      g.fillStyle = gr; g.fillRect(top.x0, yt, top.x1 - top.x0, yb - yt);
      g.globalCompositeOperation = op;
    }
  },
  live(ctx, o, sp, seed) {
    const top = sp.tiers[sp.tiers.length - 1], cx = (top.x0 + top.x1) / 2;
    let w = top.x1 - top.x0; for (let k = 0; k < 3; k++) w *= 0.74;
    const yTop = top.y0 - sp.crownH - (sp.copper ? w * 0.9 : 0) - sp.needle;
    crownGlow(ctx, o, cx, top.y0 - sp.crownH * 0.4, (top.x1 - top.x0) * 0.9, [255, 206, 140], 1);
    beacons(ctx, o, [[cx, yTop]], seed);
  },
});
