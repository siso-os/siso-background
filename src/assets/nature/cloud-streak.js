// Long thin stratus streaks: shreds of stretched puffs, thicker in the middle of each band, frayed at the ends. Their
// undersides catch a low sun in orange and rose; faint blue-grey at night. Built from soft puffs (see _puffs.js).
import { puffCloud } from './_puffs.js';
import { rng } from '../../core/rng.js';

const W = 1400, H = 110;
export default puffCloud({
  id: 'nature.cloud-streak',
  title: 'Cloud streaks',
  about: 'Long thin stratus streaks; their undersides catch a low sun in orange and rose, faint blue-grey at night.',
  w: W, h: H, variants: 4, ref: 'refs/elements/sky-dusk.webp',
  puffs(seed) {
    const r = rng(seed * 41 + 5), P = [];
    const n = 2 + Math.floor(r() * 3);
    for (let b = 0; b < n; b++) {
      const len = W * (0.35 + 0.5 * r()), x0 = -W * 0.47 + r() * (W * 0.94 - len);
      const y0 = -H * (0.3 + 0.45 * r()), tilt = (r() - 0.5) * 0.05, th = 7 + 10 * r();
      for (let x = x0; x < x0 + len; x += 14 + 22 * r()) {
        const u = (x - x0) / len, k = Math.pow(Math.sin(Math.PI * u), 0.8);
        if (k < 0.08) continue;
        const rr = (30 + 40 * r()) * (0.5 + 0.5 * k);
        P.push({ x, y: y0 + (x - x0) * tilt + (r() - 0.5) * th, r: rr, sy: (th * k) / rr + 0.05, a: 0.45 + 0.4 * k, flat: true });
      }
      P.push({ x: x0 + len * (0.2 + 0.6 * r()), y: y0 - th, r: len * 0.3, sy: 0.05, a: 0.22, wisp: true });
    }
    return { puffs: P, top: H, base: 0, baseSoft: 2, blur: 4, edge: 1.6, rim: 4 };
  },
});
