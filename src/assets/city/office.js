// A mid-rise office block: ribbon windows between concrete spandrels, a glass lobby, roof plant; offices lit at night.
import { building, shaft, roofKit, beacons, css, shade, mix } from './_lib.js';

const BASES = [[198, 196, 190], [176, 178, 182], [210, 200, 184], [150, 150, 156], [188, 176, 162]];

export default building({
  id: 'city.office', salt: 41,
  title: 'Office block',
  about: 'A mid-rise office, 80 to 150 tall: ribbon windows, a glass lobby, roof plant; lit floors at night.',
  w: 140, h: 175,
  ref: 'refs/options/option-a-golden.webp',
  plan(r) {
    const H = 80 + r() * 70, W = 70 + r() * 50, two = r() < 0.45;
    const tiers = [];
    if (two) { const h1 = H * (0.55 + r() * 0.2), w2 = W * (0.6 + r() * 0.25), off = (r() - 0.5) * (W - w2); tiers.push({ x0: -W / 2, x1: W / 2, y0: -h1, y1: 0 }, { x0: off - w2 / 2, x1: off + w2 / 2, y0: -H, y1: -h1 }); }
    else tiers.push({ x0: -W / 2, x1: W / 2, y0: -H, y1: 0 });
    return { w: W, h: H, tiers, base: { x0: -W / 2, x1: W / 2 }, col: BASES[Math.floor(r() * BASES.length)], ribbon: 0.4 + r() * 0.25, lobby: 7.2 + Math.floor(r() * 2) * 3.6, breakAt: 0.3 + r() * 0.15 };
  },
  paint(g, o, sp, dead, seed) {
    const L = o.L;
    sp.tiers.forEach((t, i) => {
      const yb = i === 0 ? t.y1 - sp.lobby : t.y1;
      shaft(g, o, { ...t, y1: yb }, { kind: 'grid', base: sp.col, ribbon: sp.ribbon, seed: seed + i }, dead);
      if (i === 0) shaft(g, o, { ...t, y0: yb }, { kind: 'glass', tint: [120, 130, 130], mull: 4, seed: seed + 50, cool: 0.1 }, dead);
      g.fillStyle = css(shade(sp.col, L, 0.4)); g.fillRect(t.x0 - 0.5, t.y0 - 1.6, t.x1 - t.x0 + 1, 1.6);
      roofKit(g, o, t.x0 + 2, t.x1 - 2, t.y0 - 1.6, seed + i * 7);
    });
    if (!dead) { const t = sp.tiers[0]; g.fillStyle = css(shade([60, 62, 66], L, 0)); g.fillRect(t.x0 + 3, t.y1 - sp.lobby - 1.2, t.x1 - t.x0 - 6, 1.2); }
  },
  live(ctx, o, sp, seed) { const t = sp.tiers[sp.tiers.length - 1]; beacons(ctx, o, [[t.x1 - 2, t.y0 - 3]], seed); },
});
