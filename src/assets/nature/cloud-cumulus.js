// One towering cumulus: a broad flat grey base, a body that narrows and leans as it climbs, and a cauliflower head of
// lobes, lit on the sun side with a bright rim, shadowed blue-grey (purple at dusk) on the other. Built from soft puffs
// (see _puffs.js).
import { puffCloud } from './_puffs.js';
import { noiseOf } from './_lib.js';
import { rng, clamp } from '../../core/rng.js';

const W = 600, H = 460;
export default puffCloud({
  id: 'nature.cloud-cumulus',
  title: 'Cumulus',
  about: 'A single towering cumulus with a cauliflower head; lit side warm at sunset, white by day, moonlit grey at night.',
  w: W, h: H, variants: 4, ref: 'refs/elements/sky-day.webp',
  puffs(seed) {
    const N = noiseOf(seed * 29 + 11), r = rng(seed * 29 + 11), ph = r() * 50;
    const top = H * (0.8 + 0.12 * r()), lean = (r() - 0.5) * 0.22;
    // half width at height y: broad at the base, swelling a little, then rounding into the head
    const hw = (y) => { const u = clamp(-y / top); return W * 0.36 * (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, u * 1.6 + 0.2))) * Math.pow(1 - Math.pow(u, 3), 0.5) * (0.88 + 0.16 * N.n1(u * 4 + ph)); };
    const P = [];
    // the body: a column of big soft puffs
    for (let y = -40; y > -top + 30; y -= 34 + 16 * r()) {
      const w = hw(y), c = lean * -y, n = Math.max(1, Math.round(w / 55));
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : i / (n - 1) - 0.5;
        const rr = Math.max(w * 0.45, Math.min(w * 0.62, 50 + 30 * r()));
        P.push({ x: c + u * Math.max(0, (w - rr) * 1.6), y, r: rr, body: true });
      }
    }
    // the head: a few rounded towers of different heights (the tallest near the middle), each capped with lobes half
    // sunk into it, so the outline is lumpy at two sizes, never a string of equal beads
    const towers = 3 + Math.floor(r() * 2), hwTop = hw(-top * 0.72);
    for (let k = 0; k < towers; k++) {
      // uneven spacing and sizes: an even pair of equal towers, each with its shaded crescent, reads as a face
      const u = (k + 0.5) / towers - 0.5 + (r() - 0.5) * 0.3;
      const rr = (42 + 52 * r()) * (1 - 0.35 * Math.abs(u));
      const ht = top * (0.9 - 0.42 * Math.abs(u) * (0.7 + 0.6 * r())) - rr * 0.15;
      const x = lean * ht + u * hwTop * 1.5;
      P.push({ x, y: -ht + rr, r: rr });
      const caps = 2 + Math.floor(r() * 2);
      for (let j = 0; j < caps; j++) {
        const a = -Math.PI / 2 + (j / Math.max(1, caps - 1) - 0.5) * 1.6 + (r() - 0.5) * 0.35, sr = rr * (0.36 + 0.16 * r());
        P.push({ x: x + Math.cos(a) * rr * 0.6, y: -ht + rr + Math.sin(a) * rr * 0.6, r: sr });
      }
    }
    // the shoulders: medium lobes down both flanks, mostly sunk in the body, fewer and smaller toward the foot
    for (let y = -top * 0.66; y < -top * 0.22; y += 34 + 26 * r()) {
      for (const side of [-1, 1]) {
        if (r() < 0.3) continue;
        const w = hw(y), rr = (30 + 26 * r()) * (0.7 + 0.5 * clamp(-y / top));
        P.push({ x: lean * -y + side * (w - rr * 1.15), y: y + (r() - 0.5) * 12, r: rr });
      }
    }
    // the skirt along the base: flattened and kept inside the body, so the foot is a long flat edge, not two round feet
    const sk = hw(-30) - 40;
    for (let x = -sk; x <= sk; x += 40 + 30 * r()) P.push({ x: x + lean * 30, y: -26, r: 36 + 14 * r(), sy: 0.55, body: true });
    for (let k = 0; k < 4; k++) P.push({ x: (r() - 0.5) * W * 0.85, y: -16 - 50 * r(), r: 50 + 50 * r(), sy: 0.16, a: 0.25, wisp: true });
    return { puffs: P, top, base: -4, baseSoft: 14, blur: 7, bodyBlur: 18, edge: 2.2, rim: 11 };
  },
});
