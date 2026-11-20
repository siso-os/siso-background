// A ball of fire. burn loops: lumps are born white-hot at the core, roll upward and outward, cool through orange to
// dull red and turn to black smoke at the top (a tank cooking off, a fuel fire on a hit island). burst plays once: a
// fuel fireball that swells and rolls up into smoke, with none of the explosion's flash, ring or sparks.
import { rng, clamp, smooth, frac, n1, vn, smokeTint, puffTinted, puffGlow, put, bloom, lod } from './_lib.js';
import { blast } from './explosion.js';

export function rolling(ctx, o, { R = 34, cy = -40, seed = 0, wind = 0.15, hot = 1 } = {}) {
  const L = o.L, t = o.t || 0, r = rng(seed * 13 + 3), q = lod(o);
  const tint = smokeTint(L, 'black', o.lit || 1);
  const n = Math.max(8, Math.round(24 * q)), P = 1.9;
  const ps = [];
  for (let k = 0; k < n; k++) {
    const rx = r(), rs = r(), ph = r(), sh = Math.floor(r() * 6);
    const a = frac(t / P + k / n + ph * 0.25 / n);
    const x = (rx - 0.5) * R * (0.64 + 1.75 * a) + wind * R * 2.6 * a * a + n1(t * 0.8 + k, 5) * R * 0.28 * a;
    const y = cy - a * R * 1.85 - a * a * R * 1.1;
    const rad = R * (0.38 + 0.75 * a) * (0.8 + 0.4 * rs);
    const temp = Math.pow(clamp(1 - a * 1.35), 1.2);
    ps.push({ a, x, y, rad, temp, sh: sh + seed });
  }
  ps.sort((p, q2) => q2.a - p.a);
  for (const p of ps) {
    const sm = smooth(0.2, 0.65, p.a) * (1 - smooth(0.7, 1, p.a));
    put(ctx, puffTinted(p.sh, tint), p.x, p.y, p.rad * 1.12, sm * 0.68);
    const ha = clamp(p.temp * 1.6) * smooth(0, 0.06, p.a) * hot;
    if (ha > 0.02) put(ctx, puffGlow(p.sh, 'hot', Math.round(clamp(p.temp * 1.1) * 10) / 10), p.x, p.y, p.rad, ha);
    if (p.a < 0.67) {
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, puffGlow(p.sh, 'under'), p.x, p.y, p.rad, sm * (0.25 + 0.65 * L.night) * (1 - p.a) * hot);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  // the core: always the hottest thing in it
  const fl = 0.85 + 0.15 * vn(t * 9, 0.5, seed);
  put(ctx, puffGlow(seed + 2, 'hot', 1), 0, cy, R * 0.62 * fl, 0.9 * hot);
  bloom(ctx, 0, cy - R * 0.08, R * 0.7, [255, 218, 140], hot * 0.8);
  bloom(ctx, 0, cy - R * 0.3, R * 3.2 * fl, [255, 140, 50], (0.2 + 0.45 * L.night) * hot);
  ctx.globalAlpha = 1;
}

export default {
  id: 'fx.fireball', family: 'fx', title: 'Fireball',
  about: 'A rolling ball of fire. burn loops (lumps born white-hot, cooling to black smoke as they rise); burst plays once over 2.4 s (a fuel fireball swelling into smoke). o.wind leans it (default 0.15).',
  w: 160, h: 160, states: ['burn', 'burst'], loop: 3.8, once: { burst: 2.4 }, variants: 4,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    if (o.state === 'burst') blast(ctx, o, { R: 44, cy: -46, seed: o.seed || 0, p: clamp(o.p ?? 0.5) * 0.75, debris: 0, ring: 0, sparks: 0.25, flash: 0 });
    else rolling(ctx, o, { seed: o.seed || 0, wind: o.wind ?? 0.15 });
    ctx.restore();
  },
};
