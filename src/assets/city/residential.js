// A residential block: punched windows, balcony slabs every floor or two, a water tank and plant on the roof; warm
// windows at night with a few cool television blues.
import { building, shaft, roofKit, css, shade, mix } from './_lib.js';

const BASES = [[226, 214, 192], [196, 126, 98], [182, 190, 196], [214, 186, 150], [160, 92, 74], [204, 204, 196]];

export default building({
  id: 'city.residential', salt: 53,
  title: 'Residential block',
  about: 'An apartment block, 60 to 140 tall: punched windows, balconies, a water tank; warm windows at night.',
  w: 120, h: 160,
  ref: 'refs/options/option-a-golden.webp',
  plan(r) {
    const H = 60 + r() * 80, W = 44 + r() * 46, tiers = [{ x0: -W / 2, x1: W / 2, y0: -H, y1: 0 }];
    if (r() < 0.35) { const w2 = W * 0.7, h2 = 7.2 + Math.floor(r() * 3) * 3.6; tiers.push({ x0: -w2 / 2, x1: w2 / 2, y0: -H - h2, y1: -H }); }
    return { w: W, h: H + (tiers[1] ? tiers[1].y1 - tiers[1].y0 : 0), tiers, col: BASES[Math.floor(r() * BASES.length)], balc: 1 + Math.floor(r() * 2), tank: r() < 0.6, breakAt: 0.3 + r() * 0.2 };
  },
  paint(g, o, sp, dead, seed) {
    const L = o.L;
    sp.tiers.forEach((t, i) => {
      shaft(g, o, t, { kind: 'res', base: sp.col, balc: sp.balc, seed: seed + i }, dead);
      g.fillStyle = css(shade(sp.col, L, 0.5)); g.fillRect(t.x0 - 0.4, t.y0 - 1, t.x1 - t.x0 + 0.8, 1);
    });
    const top = sp.tiers[sp.tiers.length - 1];
    roofKit(g, o, top.x0 + 2, top.x1 - 2, top.y0 - 1, seed, { tank: sp.tank });
    // a shopfront strip at street level
    const t = sp.tiers[0];
    g.fillStyle = css(shade([70, 66, 62], L, 0)); g.fillRect(t.x0, -4.2, t.x1 - t.x0, 4.2);
    if (!dead) { g.fillStyle = css(mix(shade([110, 120, 126], L, 0, { gloss: 0.4 }), [255, 214, 150], L.windows), 0.9); g.fillRect(t.x0 + 2, -3.6, t.x1 - t.x0 - 4, 2.8); }
  },
});
