// Flames on a roof: tongues from a baked blackbody sprite. A body layer is laid down opaque-ish (so fire reads orange
// against a bright day sky instead of washing to white), then the cores are added with 'lighter' so overlaps go
// white-hot, more so at night. Flicker is two noises (a slow swell, a fast lick); tongues break off and rise; dark
// smoke leaves the tips lit from under; embers lift away; the fire throws light on its surroundings, more at night.
import { clamp, smooth, vn, n1, frac, ih, flame, bloom, smokeTint, puffTinted, puffGlow, put, heat, css, lod } from './_lib.js';

export function flames(ctx, o, { W = 60, H0 = 50, hot = 1, wind = 0.2, smoke = 1, seed = 0, embers = 1 } = {}) {
  const t = o.t || 0, L = o.L, q = lod(o), night = L.night;
  const n = Math.max(3, Math.round((W / 9) * (0.6 + 0.4 * q)));
  const swell = 0.85 + 0.15 * vn(t * 1.3, 0.5, seed + 3);
  bloom(ctx, 0, -H0 * 0.3, (W * 0.8 + H0 * 1.2) * swell, [255, 116, 34], (0.1 + 0.5 * night) * hot);
  // smoke leaving the tips, behind the flames: a continuous dark stream that widens as it climbs
  if (smoke > 0) {
    // many small, faint puffs overlapping into one column (a few big ones read as a chain of cotton balls); each
    // is stretched sideways as it climbs and shears with the wind
    const tint = smokeTint(L, 'black', o.lit || 1), m = Math.max(12, Math.round((W / 1.6) * (0.5 + 0.5 * q)));
    for (let j = 0; j < m; j++) {
      const a = frac(t / 3.2 + j / m + ih(j, 5, seed) * 0.08);
      const x0 = (ih(j, 8, seed) - 0.5) * W * 0.6;
      const x = x0 * (1 - a * 0.5) + wind * 60 * a * a + n1(t * 0.5 + j * 0.7, 4) * 7 * a;
      const y = -H0 * 0.31 - a * (H0 * 1.34 + 45);
      const r = (W * 0.05 + 3) * (0.7 + 0.6 * ih(j, 3, seed)) + (8 + W * 0.2) * a;
      const al = smooth(0, 0.095, a) * (1 - smooth(0.36, 1, a)) * 0.45 * smoke;
      ctx.save(); ctx.translate(x, y); ctx.rotate((ih(j, 2, seed) - 0.5) * 0.8); ctx.scale(1 + 0.3 * a, 1 - 0.1 * a);
      put(ctx, puffTinted(j + seed, tint), 0, 0, r, al);
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, puffGlow(j + seed, 'under'), 0, 0, r, al * (0.3 + 0.7 * night) * (1 - a) * (1 - a) * hot);
      ctx.restore();
    }
  }
  const tongues = [];
  for (let k = 0; k < n; k++) {
    const x = -W / 2 + (k + 0.5) * (W / n) + (ih(k, 1, seed) - 0.5) * (W / n) * 0.8;
    const edge = 1 - Math.pow(Math.abs(x) / (W / 2 + 4), 2.5) * 0.6;
    let hk = H0 * edge * (0.45 + 0.55 * vn(t * 2.1 + k * 1.7, 1.5, seed)) * (0.6 + 0.8 * ih(k, 2, seed)) * swell;
    hk *= 0.8 + 0.32 * vn(t * 8.5 + k * 3.3, 7.5, seed);
    const wk = ((W / n) * 2.55 + 3) * (0.7 + 0.6 * ih(k, 9, seed));
    const lean = wind * 0.45 + n1(t * 2.1 + k * 0.9, seed + 3) * 0.31;
    tongues.push({ x, hk, wk, lean, k, foot: 2 + 3 * n1(t * 0.85 + k * 0.9, seed + 7) });
  }
  // body: drawn over, so it holds its colour on a bright sky
  for (const g of tongues) flame(ctx, g.k + seed + 1, g.x, g.foot, g.wk * 1.3, g.hk * 0.95, g.lean, 0.55, 0.55 * hot);
  // a low bed of fire along the fuel
  flame(ctx, seed + 3, 0, 3, W * 1.25, H0 * 0.32 * swell, wind * 0.1, 0.7, 0.75 * hot);
  ctx.globalCompositeOperation = 'lighter';
  const add = (0.45 + 0.55 * night) * hot;
  for (const g of tongues) flame(ctx, g.k + seed + 2, g.x, g.foot, g.wk * 0.81, g.hk * 1.09, g.lean * 1.1, add, hot);
  // licks that break off the top and rise as they die
  const m = Math.max(2, Math.round(n * 0.6 * q));
  for (let j = 0; j < m; j++) {
    const a = frac(t * 1.6 + ih(j, 3, seed));
    const x = -W * 0.4 + W * 0.8 * ih(j, 4, seed) + wind * 14 * a + n1(t * 2 + j, 9) * 3;
    const y = -H0 * (0.4 + a * 0.55);
    const s = H0 * 0.32 * (1 - a * 0.7);
    flame(ctx, j + 1, x, y, s * 0.6, s, wind * 0.3, (1 - a) * 0.6 * smooth(0, 0.15, a) * add * (0.35 + 0.65 * night), 0.85 * hot);
  }
  if (embers > 0) {
    const e = Math.round((W / 5) * q * embers);
    for (let j = 0; j < e; j++) {
      const a = frac(t * 0.45 + ih(j, 6, seed));
      const x = -W / 2 + W * ih(j, 7, seed) + wind * 50 * a + n1(t * 1.7 + j * 2.3, 11) * 10 * a;
      const y = -H0 * 0.4 - a * (H0 * 1.6 + 40);
      const c = heat(0.75 - a * 0.5), al = (1 - a) * (0.5 + 0.5 * vn(t * 12 + j, 2, 4)) * (0.5 + 0.5 * night);
      ctx.fillStyle = css(c, al);
      ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
    }
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  bloom(ctx, 0, -2, W * 0.73, [255, 168, 69], (0.28 + 0.36 * night) * hot * swell);
}

export default {
  id: 'fx.fire', family: 'fx', title: 'Fire',
  about: 'Looping flames on a roof for burning buildings: o.w is the burning width (default 60), o.wind leans it (default 0.2); low is a dying, smoky fire.',
  w: 80, h: 160, states: ['burn', 'low'], loop: 4, once: {}, variants: 4, free: true,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    const W = clamp(o.w ?? 60, 8, 600), low = o.state === 'low';
    const H0 = clamp(W * 0.75, 18, 70) * (low ? 0.45 : 1);
    flames(ctx, o, { W, H0, hot: low ? 0.7 : 1, wind: o.wind ?? 0.2, smoke: low ? 1.2 : 1, seed: o.seed || 0 });
    ctx.restore();
  },
};
