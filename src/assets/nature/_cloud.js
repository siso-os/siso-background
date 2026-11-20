// cloudAsset(def): a cloud as a soft billowed surface. Its density and bumps are baked once per seed (turbulence noise
// gives the rounded billows and the creases between them), then it is lit per quarter hour like every other solid:
// sun side bright, far side in the ambient, thin edges letting the key light through (the silver lining), and a base
// that glows warm when the sun is low.
import { noiseOf, lru, bakeRelief, lightRelief } from './_lib.js';
import { clamp, smooth } from '../../core/rng.js';
import { mix } from '../../core/paint.js';

const BAKES = lru(16), LIT = lru(64);   // the lit picture first, the shape baked only when it is missing (see _range.js)

export function cloudAsset(def) {
  const { id, w, h } = def;
  const bake = (seed, res) => {
    const N = noiseOf(seed * 7 + 900);
    const P = def.prep(seed, N);
    return bakeRelief({
      w, h, res,
      sample(x, y, s) { def.density(x, y, s, N, P); },
      material(x, y, n, m) {
        const crease = m.u; // 0 in a crease .. 1 on a billow top
        m.r = 240; m.g = 242; m.b = 247;
        m.cav = clamp((0.5 - crease) * 0.5) * (def.creaseDark == null ? 0.35 : def.creaseDark);
        const under = smooth(0.2, -0.7, n.y) * smooth(60, 0, -y);
        if (under > 0.02) { m.ek = 1; m.er = 255 * under; m.eg = 150 * under; m.eb = 112 * under; }
      },
    });
  };
  return {
    id, family: 'nature', title: def.title, about: def.about, w, h,
    states: ['idle'], loop: 0, variants: def.variants || 4, ref: def.ref || null,
    draw(ctx, o) {
      const L = o.L, lit = o.lit >= 0 ? 1 : -1, seed = o.seed | 0, sc = o.scale || 1;
      const res = Math.min(def.maxRes || 1, sc >= 1.2 ? 1.4 : sc >= 0.8 ? 1 : sc >= 0.4 ? 0.6 : 0.3);
      const key = `${id}|${seed}|${res}`;
      const low = smooth(0.4, 0.05, L.keyHeight) * (1 - L.night * 0.8);
      const cv = LIT.get(`${key}|${L.q}|${lit}`, () =>
        lightRelief(BAKES.get(key, () => bake(seed, res)), L, lit, { em: [0, 0.55 * low * L.keyAmt, 0, 0], rim: 0.5, thin: def.thin == null ? 0.9 : def.thin, wrap: 0.45, front: 0.22, ambientUp: 0.5,
          amb: mix(mix(L.ambient, L.sky.top, 0.45), L.sky.horizon, 0.2).map((v) => v * 1.12) }));
      ctx.drawImage(cv, -w / 2, -h, w, h);
    },
  };
}
