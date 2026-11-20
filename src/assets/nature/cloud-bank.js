// A long cumulus bank: a flat grey base, rounded heads that rise and fall along it, small lobes on the sunlit outline,
// wisps torn off the ends. Built from soft puffs (see _puffs.js): white and blue-grey by day, gold tops and rose base at
// sunset, dark slate with a moonlit rim at night.
import { puffCloud } from './_puffs.js';
import { noiseOf } from './_lib.js';
import { rng, clamp, smooth } from '../../core/rng.js';

const W = 1600, H = 320;
export default puffCloud({
  id: 'nature.cloud-bank',
  title: 'Cloud bank',
  about: 'A long lit cumulus bank: gold and rose tops and glowing base at sunset, white by day, grey-blue at night; soft edges.',
  w: W, h: H, variants: 4, maxRes: 0.8, ref: 'refs/elements/sky-day.webp',
  puffs(seed) {
    const N = noiseOf(seed * 7 + 900), r = rng(seed * 17 + 3), ph = r() * 100;
    // the heads: a few domes of very different size with dips between them, one towering (a rolling ridge of equal
    // bumps read as a caterpillar in the scene)
    const nd = 4 + Math.floor(r() * 3), domes = [];
    for (let k = 0; k < nd; k++) domes.push({ c: 0.08 + (0.84 * (k + 0.2 + 0.6 * r())) / nd, h: 118 + 90 * r(), s: 0.06 + 0.07 * r() });
    domes[Math.floor(r() * nd)].h = 236;
    const T = (x) => {
      // never a long thin roll: a low cushion everywhere inside the ends, which taper as a mass
      const u = x / W + 0.5, env = smooth(0, 0.2, u) * smooth(0, 0.2, 1 - u);
      // the domes merge with a soft max, so the dips between heads are shoulders of the same mass, not a flat plate
      let e = Math.exp((84 + 40 * N.fbm1(u * 6 + ph, 2)) / 40);
      for (const d of domes) e += Math.exp((d.h * Math.exp(-Math.pow((u - d.c) / d.s, 2)) * (0.9 + 0.2 * N.fbm1(u * 9 + ph + 7, 2))) / 40) - 1;
      return Math.pow(env, 0.8) * 40 * Math.log(e);
    };
    const P = [];
    let top = 0;
    for (let x = -W * 0.47; x < W * 0.47; x += clamp(T(x) * 0.3, 12, 46) * (0.75 + 0.5 * r())) {
      const t = T(x); if (t < 14) continue;
      top = Math.max(top, t);
      // the body: one or two big puffs sitting on the base
      const rb = Math.min(t * 0.55, 46 + 46 * r());
      P.push({ x: x + (r() - 0.5) * 20, y: -rb * 0.7, r: rb, body: true });
      // the head: a puff reaching the top line
      const rt = clamp(t * 0.36, 14, 80) * (0.8 + 0.35 * r());
      const hy = -(t - rt * 0.9);
      if (hy < -rb * 0.9) {
        P.push({ x: x + (r() - 0.5) * 16, y: (hy - rb * 0.7) / 2, r: (rt + rb) * 0.5, body: true });
      }
      P.push({ x, y: hy, r: rt, body: r() < 0.5 });
      // the lit outline: lobes on the upper half of the head, sunk well in so they bulge it, never stand on it as beads
      const lobes = 2 + Math.floor(r() * 3);
      for (let k = 0; k < lobes; k++) {
        const a = -Math.PI * (0.12 + 0.76 * r()), rl = rt * (0.24 + 0.22 * r());
        const lx = x + Math.cos(a) * rt * 0.6, ly = hy + Math.sin(a) * rt * 0.6;
        P.push({ x: lx, y: ly, r: rl * 1.15 });
        if (r() < 0.35) { const b = a + (r() - 0.5) * 1.2; P.push({ x: lx + Math.cos(b) * rl * 0.5, y: ly + Math.sin(b) * rl * 0.5, r: rl * (0.5 + 0.2 * r()) }); }
      }
      // the face: big lobes inside the head and down its front, each shading the one behind it, so a tall head reads
      // as cauliflower, not a smooth blur with a crinkled rim
      const inner = t > 70 ? 1 + Math.floor(r() * 2 + t / 120) : 0;
      for (let k = 0; k < inner; k++) {
        const a = -Math.PI * (0.05 + 0.9 * r()), d = rt * (0.15 + 0.35 * r());
        const fy = hy + Math.sin(a) * d + (k / Math.max(1, inner)) * (t - rt) * 0.5;
        P.push({ x: x + Math.cos(a) * d, y: Math.min(-rt * 0.4, fy), r: rt * (0.34 + 0.18 * r()) });
      }
    }
    // wisps: thin stretched shreds off the ends and along the top, half see-through
    for (let k = 0; k < 9; k++) {
      const end = r() < 0.5 ? -1 : 1, x = end * W * (0.3 + 0.2 * r());
      P.push({ x, y: -T(x) * (0.3 + 0.6 * r()) - 8, r: 40 + 70 * r(), sy: 0.16 + 0.12 * r(), a: 0.18 + 0.22 * r(), wisp: true });
    }
    return { puffs: P, top: Math.max(60, top), base: -4, baseSoft: 12, blur: 8, edge: 2, rim: 10 };
  },
});
