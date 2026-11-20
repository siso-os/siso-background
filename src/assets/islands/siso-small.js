// A small SISO outpost island: a lens of the same layered sandstone, a grass cap with one lab, a glass dome and a mast,
// three blue thrusters under it. slots.tower takes a small tower or a gun.
import { cached } from '../../core/paint.js';
import { drawRock, enginePod, flame, labBlock, dome, trees, glow, css, shade, rng } from './_lib.js';

const W = 200, H = 140, TOP = -92, BOTTOM = -40;
const BLUE = [83, 178, 255];

function layout(seed) {
  const r = rng(seed * 41 + 9);
  const drips = [[-45 + r() * 6, 4 + r() * 5, 28 + r() * 4], [19 + r() * 6, 8 + r() * 7, 32 + r() * 5]];
  const pods = [[-57, -46, 6], [55, -46, 6], [-14, -27, 10]];
  return { drips, pods, flip: r() < 0.5 ? -1 : 1 };
}

function top(g, o, seed) {
  const L = o.L, y0 = TOP + 1, f = layout(seed).flip;
  labBlock(g, -34 * f, y0, 34, 15, o, { seed: seed + 2, bands: 2 });
  dome(g, 30 * f, y0, 13, o, { glass: true, drum: 0.2 });
  trees(g, -66 * f, y0 + 2, 5, o, seed + 1, 3);
  trees(g, 62 * f, y0 + 2, 4, o, seed + 3, 2);
  g.fillStyle = css(shade([141, 144, 130], L, 0.22)); g.fillRect(-64, y0 + 0.5, 127, 2.2);
  g.fillStyle = css(shade([72, 76, 65], L, -0.3));
  for (const x of [-46, -17, 16, 44]) g.fillRect(x, y0 + 0.5, 0.5, 2.2);
  // a lattice mast with a red light
  g.strokeStyle = css(shade([180, 184, 190], L, 0)); g.lineWidth = 0.8;
  const mx = 6 * f;
  g.beginPath(); g.moveTo(mx - 2.5, y0); g.lineTo(mx, y0 - 30); g.lineTo(mx + 2.5, y0); g.stroke();
  for (let k = 1; k < 5; k++) { const yy = y0 - k * 6, hw = 2.5 * (1 - k / 5); g.beginPath(); g.moveTo(mx - hw, yy); g.lineTo(mx + hw, yy); g.stroke(); }
}

export default {
  id: 'islands.siso-small',
  family: 'islands',
  title: 'SISO small island',
  about: 'A small SISO outpost island with one lab, a glass dome and a mast; blue thrusters, boost flares them. slots.tower is the flat pad.',
  w: W, h: H,
  states: ['idle', 'boost'],
  loop: 4, variants: 4,
  ref: 'refs/options/option-c-painted.webp',
  slots: { tower: [0, TOP], gun: [0, TOP], engines: [[0, BOTTOM + 6]] },
  draw(ctx, o) {
    const seed = o.seed | 0, L = o.L, t = o.t || 0, lit = o.lit >= 0 ? 1 : -1, sc = o.scale || 1;
    const lay = layout(seed);
    drawRock(ctx, o, { key: 'siso-small', seed, w: W, top: TOP, bottom: BOTTOM, drips: lay.drips, lip: 8, palette: 'siso', strata: 10 });
    ctx.drawImage(cached(`islands.siso-small|pods|${seed}|${L.q}|${lit}`, W, H, sc, (g) => {
      for (const [x, y, s] of lay.pods) enginePod(g, x, y, s, o, BLUE, { long: 0.84 });
    }), -W / 2, -H, W, H);
    ctx.drawImage(cached(`islands.siso-small|top|${seed}|${L.q}|${lit}`, W, H, sc, (g) => top(g, o, seed)), -W / 2, -H, W, H);
    const boost = o.state === 'boost' ? 1 : 0, pw = 0.75 + 0.1 * Math.sin(t * 2.6 + seed) + boost * 0.75;
    lay.pods.forEach(([x, y, s], i) => flame(ctx, x, y + s * 0.3, s * 1.3, 9 + s + 7 * boost, t, BLUE, i + seed, pw));
    if ((t * 0.8 + seed * 0.21) % 1 < 0.12) glow(ctx, 6 * lay.flip, TOP - 31, 4, [255, 40, 30], 0.9);
  },
};
