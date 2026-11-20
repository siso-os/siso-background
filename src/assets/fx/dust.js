// The dust of a building coming down (art/isles/fx/city-dust): a tan-grey billow dumped along the base, rolling out
// sideways along the ground faster than it rises (as a real collapse cloud does), warm on its lit top and cool in its
// shadowed underside. billow plays once over 6 s; hang loops the settled cloud drifting and thinning.
import { rng, clamp, smooth, frac, TAU, smokeTint, puffTinted, put, lod } from './_lib.js';

export function billow(ctx, o, { p = 0.5, seed = 0, W = 160 } = {}) {
  const T = p * 6, L = o.L, r = rng(seed * 71 + 3), q = lod(o);
  const tint = smokeTint(L, 'dust', o.lit || 1);
  // many part-transparent puffs, never few: at a small scale a handful of opaque ones reads as cotton balls
  const n = Math.round(26 + 22 * q), ps = [];
  for (let k = 0; k < n; k++) {
    const x0 = (r() - 0.5) * W, birth = r() * 1.4, rs = 0.45 + r() * 0.75, sh = Math.floor(r() * 6), up = r();
    const out = (x0 / (W / 2)) * (46 + 96 * r());
    const tk = T - birth; if (tk <= 0) continue; // the middle stays, the edges roll out: one cloud, not two
    const x = x0 + (out / 1.1) * (1 - Math.exp(-1.1 * tk));
    const rad = rs * (12 + 46 * (1 - Math.exp(-0.9 * tk)) + 4 * tk);
    // The dense centre rolls up behind a low leading skirt on each side.
    const centre = 1 - smooth(0, W * 0.74, Math.abs(x));
    const y = -rad * 0.47 - up * (9 + (10 + 42 * centre) * (1 - Math.exp(-tk))) - 2.5 * tk;
    const al = smooth(0, 0.35, tk) * (1 - smooth(4.2, 6, T)) * 0.6;
    ps.push({ x, y, rad, al, sh: sh + seed, d: -y });
  }
  ps.sort((a, b) => b.d - a.d);
  // the cloud hugs the ground: spread wide, squat
  ctx.save(); ctx.scale(1.2, 0.86);
  for (const p2 of ps) put(ctx, puffTinted(p2.sh, tint), p2.x, p2.y, p2.rad, p2.al);
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function hang(ctx, o, { seed = 0, W = 160 } = {}) {
  const t = o.t || 0, L = o.L, r = rng(seed * 71 + 5), q = lod(o), P = 14;
  const tint = smokeTint(L, 'dust', o.lit || 1);
  const n = Math.round(18 + 16 * q), ps = [];
  for (let k = 0; k < n; k++) {
    const a = frac(t / P + k / n), x0 = (r() - 0.5) * W, rs = 0.7 + r() * 0.6, sh = Math.floor(r() * 6);
    const rad = rs * (30 + 30 * a);
    const x = x0 + 50 * a + Math.sin(TAU * t / P + k) * 6;
    const y = -rad * 0.57 - 17 * a - r() * 18;
    const al = smooth(0, 0.2, a) * (1 - smooth(0.6, 1, a)) * 0.5;
    ps.push({ x, y, rad, al, sh: sh + seed, d: -y });
  }
  ps.sort((a, b) => b.d - a.d);
  for (const p2 of ps) put(ctx, puffTinted(p2.sh, tint), p2.x, p2.y, p2.rad, p2.al);
  ctx.globalAlpha = 1;
}

export default {
  id: 'fx.dust', family: 'fx', title: 'Collapse dust',
  about: 'The dust of a building coming down: billow plays once over 6 s (dumped along the base, rolling out along the ground); hang loops the settled cloud. o.w is the base width (default 160).',
  w: 512, h: 240, states: ['billow', 'hang'], loop: 14, once: { billow: 6 }, variants: 4,
  ref: 'art/isles/fx/city-dust.webp',
  draw(ctx, o) {
    ctx.save();
    const W = clamp(o.w ?? 160, 20, 800);
    if (o.state === 'hang') hang(ctx, o, { seed: o.seed || 0, W });
    else billow(ctx, o, { p: clamp(o.p ?? 0.5), seed: o.seed || 0, W });
    ctx.restore();
  },
};
