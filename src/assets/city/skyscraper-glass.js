// A glass curtain-wall skyscraper: one to three setback tiers of mirror glass in a seeded tint, mullions and spandrels
// down every floor, the sky and clouds reflected in it, a sun glint down the corner, offices lit at night, and coloured
// edge lights on some. Crown: flat with plant, a slanted cut, or a mast.
import { building, shaft, neonEdges, roofKit, beacons, crownGlow, clipBoth, unclipBoth, lightRect, pxOf, NEON, css, shade, mix, scale, rimColour, glow } from './_lib.js';

const TINTS = [[96, 140, 170], [70, 130, 132], [150, 122, 92], [150, 160, 172], [86, 106, 140], [110, 140, 120], [60, 80, 96]];

export default building({
  id: 'city.skyscraper-glass', salt: 11,
  title: 'Glass skyscraper',
  about: 'A mirror-glass tower, 170 to 265 tall, in up to three setbacks; reflects the sky, glints at the corner, lit offices at night, some with neon edges.',
  w: 100, h: 290,
  ref: 'refs/options/option-b-neon.webp',
  plan(r) {
    const H = 170 + r() * 95, W = 42 + r() * 34;
    const nT = 1 + Math.floor(r() * 3);
    const cuts = nT === 1 ? [H] : nT === 2 ? [H * (0.6 + r() * 0.2), H] : [H * (0.45 + r() * 0.12), H * (0.72 + r() * 0.1), H];
    const align = r() < 0.6 ? 0 : (r() < 0.5 ? -1 : 1);
    const tiers = []; let w = W, prev = 0;
    for (const c of cuts) {
      const cx = align * (W - w) / 2;
      tiers.push({ x0: cx - w / 2, x1: cx + w / 2, y0: -c, y1: -prev }); prev = c; w *= 0.7 + r() * 0.16;
    }
    const crown = r() < 0.34 ? 'slant' : (H < 235 && r() < 0.6 ? 'mast' : 'flat');
    return {
      w: W, h: H, tiers, crown, tint: TINTS[Math.floor(r() * TINTS.length)], mull: 2.3 + r() * 1.3,
      neon: r() < 0.45 ? NEON[Math.floor(r() * NEON.length)] : null, slant: (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.4),
      mast: Math.min(285 - H, 20 + r() * 30), breakAt: 0.25 + r() * 0.15,
    };
  },
  paint(g, o, sp, dead, seed) {
    const L = o.L, mat = { kind: 'glass', tint: sp.tint, mull: sp.mull, seed };
    sp.tiers.forEach((t, i) => {
      const last = i === sp.tiers.length - 1;
      if (last && sp.crown === 'slant') {
        const s = (t.x1 - t.x0) * Math.abs(sp.slant), hi = sp.slant > 0 ? t.x1 : t.x0;
        clipBoth(g, (c) => { c.moveTo(t.x0, t.y1); c.lineTo(t.x0, hi === t.x0 ? t.y0 : t.y0 + s); c.lineTo(t.x1, hi === t.x1 ? t.y0 : t.y0 + s); c.lineTo(t.x1, t.y1); c.closePath(); });
        shaft(g, o, t, mat, dead); unclipBoth(g);
        g.strokeStyle = css(rimColour(L), 0.4 + 0.5 * L.golden); g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(t.x0, hi === t.x0 ? t.y0 : t.y0 + s); g.lineTo(t.x1, hi === t.x1 ? t.y0 : t.y0 + s); g.stroke();
      } else shaft(g, o, t, mat, dead);
      if (!last || sp.crown !== 'slant') { // a louvred plant floor under each roof
        g.fillStyle = css(shade(scale(sp.tint, 0.5), L, 0)); g.fillRect(t.x0, t.y0, t.x1 - t.x0, 2.6);
        g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = t.x0 + 0.6; x < t.x1; x += 1.2) g.fillRect(x, t.y0 + 0.4, 0.4, 1.9);
      }
      if (!last) { const n = sp.tiers[i + 1]; roofKit(g, o, t.x0, Math.max(t.x0 + 4, n.x0 - 1), t.y0, seed + i); roofKit(g, o, Math.min(t.x1 - 4, n.x1 + 1), t.x1, t.y0, seed + i + 9); }
    });
    const top = sp.tiers[sp.tiers.length - 1];
    if (sp.crown === 'flat') roofKit(g, o, top.x0 + 2, top.x1 - 2, top.y0, seed + 40);
    if (sp.crown === 'mast') roofKit(g, o, top.x0 + 2, top.x1 - 2, top.y0, seed + 40, { mast: sp.mast });
    if (sp.neon && !dead && (seed * 0.618) % 1 < 0.3) neonEdges(g, o, sp.tiers, sp.neon, { one: true });
    if (!dead && L.windows > 0.3 && sp.crown !== 'slant') { // a lit crown band
      lightRect(g, top.x0, top.y0 + 0.3, top.x1 - top.x0, Math.max(1.2, 0.9 * pxOf(g)), css(mix([255, 236, 200], sp.neon || [255, 236, 200], 0.4), 0.6 * L.windows));
    }
  },
  live(ctx, o, sp, seed) {
    const top = sp.tiers[sp.tiers.length - 1];
    const pts = sp.crown === 'mast' ? [[(top.x0 + top.x1) / 2, top.y0 - sp.mast]] : [[top.x0 + 1, top.y0 - 1], [top.x1 - 1, top.y0 - 1]];
    crownGlow(ctx, o, (top.x0 + top.x1) / 2, top.y0 + 2, (top.x1 - top.x0) * 0.7, mix([255, 226, 186], sp.neon || [255, 226, 186], 0.5), sp.crown === 'slant' ? 0.5 : 0.8);
    beacons(ctx, o, pts, seed);
  },
});
