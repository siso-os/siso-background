// Embers drifting up over a burning block: hot specks that rise in the fire's updraught, swirl, cool from yellow to
// red and wink out. Barely there by day, a field of sparks at night. rise is a steady burn; storm is a firestorm.
import { clamp, smooth, frac, ih, n1, vn, bloom, heat, streak, lod } from './_lib.js';

export function embers(ctx, o, { n = 46, W = 140, H = 240, wind = 0.3, seed = 0, speed = 1 } = {}) {
  const t = o.t || 0, L = o.L, q = lod(o);
  n = Math.round(n * q);
  const vis = 0.43 + 0.57 * L.night;
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < n; j++) {
    const a = frac((t / 6) * speed * (0.7 + 0.6 * ih(j, 1, seed)) + ih(j, 2, seed));
    const x0 = (ih(j, 3, seed) - 0.5) * W;
    const x = x0 * (1 - 0.3 * a) + wind * 80 * a * a + n1(t * 0.9 + j * 1.7, 3) * 18 * a;
    const y = -(0.65 * a + 0.35 * a * a) * H - 6;
    const tw = 0.55 + 0.45 * vn(t * 7 + j * 3.1, 1.5, 9);
    const k = 0.92 - 0.6 * a;
    const al = smooth(0, 0.05, a) * (1 - smooth(0.6, 1, a)) * tw * vis;
    const s = 0.8 + 1.1 * ih(j, 4, seed);
    const trail = (1.6 + 3.4 * ih(j, 6, seed)) * (0.75 + speed * 0.35);
    const curl = n1(t * 0.9 + j * 1.7 - 0.1, 3) * 2.2;
    streak(ctx, x - wind * trail + curl, y + trail, x, y, s, heat(k), al);
    if (j % 4 === 0) bloom(ctx, x, y, 4 + 3 * s, heat(k - 0.1), al * 0.72);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

export default {
  id: 'fx.embers', family: 'fx', title: 'Embers',
  about: 'Hot specks rising and swirling over a burning block, cooling as they climb; faint by day, bright at night. o.w is the base width (default 140); o.wind leans them; storm is a firestorm.',
  w: 200, h: 256, states: ['rise', 'storm'], loop: 6, once: {}, variants: 4,
  ref: 'refs/options/option-b-neon.webp',
  draw(ctx, o) {
    ctx.save();
    const storm = o.state === 'storm';
    embers(ctx, o, { n: storm ? 110 : 46, W: clamp(o.w ?? 140, 10, 800), wind: o.wind ?? 0.3, seed: o.seed || 0, speed: storm ? 1.8 : 1 });
    ctx.restore();
  },
};
