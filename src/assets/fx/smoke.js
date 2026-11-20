// A rising smoke column: thirty baked, lit puffs on a 12 s loop, each one born small at the foot and rising, slowing,
// widening and leaning downwind until it thins away. Lit by the key light on one side; by the fire under it at night.
import { rng, smooth, frac, TAU, smokeTint, puffTinted, puffGlow, put, PUFFS, lod, n1 } from './_lib.js';

const P = 12;
const TONE = { plume: 'black', grey: 'grey', white: 'white' };
const DENS = { plume: 0.96, grey: 0.82, white: 0.72 };

export function plume(ctx, o, { H = 520, base = 18, spread = 1, n = 46, tone = 'black', dens = 0.95, fire = 1, wind = 0.5, period = P, seed = 0 } = {}) {
  const L = o.L, t = o.t || 0, r = rng(seed * 31 + 7);
  const tint = smokeTint(L, tone, o.lit || 1);
  n = Math.max(6, Math.round(n * (0.34 + 0.66 * lod(o))));
  const ps = [];
  for (let k = 0; k < n; k++) {
    const rk = r(), rs = r(), rx = r(), rph = r();
    const a = frac(t / period + k / n + rph * 0.3 / n);
    const y = -H * Math.pow(a, 0.95);
    const rad = (base * 0.9 + 96 * Math.pow(a, 0.75) * spread) * (0.68 + 0.60 * rs);
    const lat = (rx - 0.5) * rad * 0.96;
    const mean = n1(a * 5 - t * 0.18, seed) * rad * 0.62 + Math.sin(TAU * t / period + a * 22) * rad * 0.09;
    const x = wind * 230 * Math.pow(a, 1.7) + lat + mean;
    const al = smooth(0, 0.06, a) * (1 - smooth(0.39, 1, a)) * dens * (0.63 - 0.15 * a);
    ps.push({ a, x, y: y - rad * 0.35, rad, al, i: Math.floor(rk * PUFFS) + seed });
  }
  ps.sort((p, q) => q.a - p.a); // oldest (highest) first, so the dense foot sits in front
  const glowA = fire * (0.2 + 0.90 * L.night);
  for (const p of ps) {
    put(ctx, puffTinted(p.i, tint), p.x, p.y, p.rad, p.al);
    if (glowA > 0.02 && p.a < 0.45) {
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, puffGlow(p.i, 'under'), p.x, p.y, p.rad, p.al * glowA * Math.pow(1 - p.a / 0.45, 1.6) * 0.95);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.globalAlpha = 1;
}

export default {
  id: 'fx.smoke', family: 'fx', title: 'Smoke plume',
  about: 'A rising, drifting smoke column, lit by the fire under it at night. o.wind -1..1 (default 0.5) leans it; o.fire 0..1 (default 1, 0.3 for white) is the glow at its foot.',
  w: 300, h: 640, states: ['plume', 'grey', 'white'], loop: P, once: {}, variants: 4,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    const st = TONE[o.state] ? o.state : 'plume';
    plume(ctx, o, { tone: TONE[st], dens: DENS[st], fire: o.fire ?? (st === 'white' ? 0.3 : 1), wind: o.wind ?? 0.5, seed: o.seed || 0 });
    ctx.restore();
  },
};
