// A needle tower: a slim glass shaft that steps in and in, then a long steel spire with a beacon at the tip.
import { building, shaft, neonEdges, beacons, crownGlow, lightRect, pxOf, NEON, css, shade, mix, glow } from './_lib.js';

export default building({
  id: 'city.spire', salt: 79,
  title: 'Needle spire',
  about: 'A slim glass shaft stepping in to a long steel needle, 220 to 300 tall with the needle; a lit ring and a beacon at night.',
  w: 70, h: 320,
  ref: 'refs/options/option-b-neon.webp',
  plan(r) {
    const H = 160 + r() * 70, W = 26 + r() * 14, n = 3 + Math.floor(r() * 2), tiers = [];
    let w = W, prev = 0;
    for (let i = 0; i < n; i++) { const c = H * (i + 1) / n * (1 - 0.06 * (n - 1 - i) * r()); tiers.push({ x0: -w / 2, x1: w / 2, y0: -c, y1: -prev }); prev = c; w *= 0.8 + r() * 0.1; }
    tiers[n - 1].y0 = -H;
    return { w: W, h: H, tiers, needle: Math.min(315 - H, 50 + r() * 60), tint: [[110, 150, 176], [130, 140, 150], [90, 120, 130]][Math.floor(r() * 3)], neon: r() < 0.5 ? NEON[Math.floor(r() * NEON.length)] : null, breakAt: 0.25 + r() * 0.15 };
  },
  paint(g, o, sp, dead, seed) {
    const L = o.L, lit = o.lit >= 0 ? 1 : -1;
    sp.tiers.forEach((t, i) => shaft(g, o, t, { kind: 'glass', tint: sp.tint, mull: 2.2, seed: seed + i }, dead));
    const top = sp.tiers[sp.tiers.length - 1], w = top.x1 - top.x0;
    // the needle: a tapering steel mast in three sections
    const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    const a = shade([190, 192, 198], L, -0.5, { gloss: 0.6 }), b = shade([190, 192, 198], L, 0.9, { gloss: 0.6 });
    gr.addColorStop(0, css(lit > 0 ? a : b)); gr.addColorStop(1, css(lit > 0 ? b : a));
    g.fillStyle = gr; g.beginPath(); g.moveTo(-w * 0.32, top.y0); g.lineTo(-0.4, top.y0 - sp.needle); g.lineTo(0.4, top.y0 - sp.needle); g.lineTo(w * 0.32, top.y0); g.fill();
    g.fillStyle = css(shade([120, 122, 128], L, 0)); for (const f of [0.3, 0.6]) g.fillRect(-w * 0.32 * (1 - f) - 0.3, top.y0 - sp.needle * f, w * 0.64 * (1 - f) + 0.6, 0.8);
    if (!dead && L.windows > 0.2) { const k = Math.max(1, 0.9 * pxOf(g)); lightRect(g, top.x0, top.y0 - k, w, k, css(mix(sp.neon || [200, 230, 255], [255, 255, 255], 0.3), 0.85 * L.windows)); }
    if (sp.neon && !dead && (seed * 0.618 + 0.3) % 1 < 0.35) neonEdges(g, o, sp.tiers, sp.neon, { amt: 0.8, one: true });
  },
  live(ctx, o, sp, seed) {
    const top = sp.tiers[sp.tiers.length - 1];
    crownGlow(ctx, o, 0, top.y0, (top.x1 - top.x0) * 1.1, sp.neon || [200, 230, 255], 0.9);
    beacons(ctx, o, [[0, top.y0 - sp.needle]], seed);
  },
});
