// A missile killed in mid-air, played once over 2.8 s: a bright pop, a ragged white-grey puff that hangs and drifts,
// and burning fragments that fall away in arcs, each drawing a thin smoke line behind it (the look of a real
// interception seen from a city at night). pop is warm; blue is a SISO interceptor's blue-white kill.
import { rng, clamp, smooth, smokeTint, puffTinted, puffGlow, put, bloom, ballistic, heat, css, lod, TAU, streak, ih } from './_lib.js';
import { flashAt } from './flash.js';

const DUR = 2.8;

export function intercept(ctx, o, { p = 0.5, seed = 0, cy = -170, blue = false, S = 1 } = {}) {
  const T = p * DUR, L = o.L, r = rng(seed * 59 + 2), q = lod(o);
  const fade = 1 - smooth(0.7, 1, p);
  // the pop
  const I = T < 0.04 ? T / 0.04 : Math.exp(-(T - 0.04) * 7.3);
  flashAt(ctx, o, 0, cy, 115 * S, I, blue ? 'blue' : 'flash');
  // the puff
  const tint = smokeTint(L, 'grey', o.lit || 1), tintW = smokeTint(L, 'white', o.lit || 1);
  for (let k = 0; k < 14; k++) {
    const ang = r() * TAU, sp = (30 + r() * 50) * S, rs = 0.7 + r() * 0.6;
    const d = (sp / 3) * (1 - Math.exp(-3 * T));
    const x = Math.cos(ang) * d + 10 * T * S, y = cy + Math.sin(ang) * d * 0.8 - 4 * T * S;
    const rad = S * rs * (6 + 20 * (1 - Math.exp(-3.5 * T)) + 5 * T);
    const al = 0.50 * smooth(0, 0.05, T) * fade;
    put(ctx, puffTinted(k + seed, k % 5 ? tint : tintW), x, y, rad, al);
    const hot = Math.exp(-T / 0.25);
    if (hot > 0.06) {
      if (blue) put(ctx, puffGlow(k + seed, 'tint', [178, 216, 255]), x, y, rad * 0.76, hot * 0.48 * fade);
      else put(ctx, puffGlow(k + seed, 'hot', Math.round(clamp(hot * 1.3) * 10) / 10), x, y, rad * 0.9, hot * fade);
    }
    if (L.night > 0.3 && T < 1) {
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, puffGlow(k + seed, 'under'), x, y, rad, (blue ? 0.16 : 0.34) * L.night * Math.exp(-T / 0.5) * fade);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  // The hot point survives briefly in front of the smoke.
  bloom(ctx, 0, cy, 18 * S, blue ? [200, 233, 255] : [255, 218, 150], Math.exp(-T * 4.9));
  // Burning fragments pull smoke along their falling arcs.
  const nf = Math.round(14 * q), dt = 0.07, smokeC = mix3(tint.lit, tint.shadow);
  for (let k = 0; k < nf; k++) {
    const ang = Math.PI / 2 + (r() - 0.5) * 2.6, sp = (50 + r() * 120) * S, life = 0.8 + r() * 1.6;
    const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp - 40 * S;
    ctx.lineCap = 'round';
    const steps = 9;
    let prev = ballistic(vx, vy, T, 1.1, 150 * S);
    for (let j = 1; j <= steps; j++) {
      const tj = T - j * dt; if (tj < 0) break;
      const cur = ballistic(vx, vy, tj, 1.1, 150 * S);
      const age = j / steps;
      cur[0] += (4 + 12 * ih(k, 2, seed)) * age * age * S;
      cur[1] -= 8 * age * age * S;
      ctx.strokeStyle = css(smokeC, 0.59 * (1 - age) * fade); ctx.lineWidth = S * (0.8 + age * 2.4);
      ctx.beginPath(); ctx.moveTo(prev[0], cy + prev[1]); ctx.lineTo(cur[0], cy + cur[1]); ctx.stroke();
      prev = cur;
    }
    if (T < life) {
      const [x, y] = ballistic(vx, vy, T, 1.1, 150 * S), k2 = 1 - T / life;
      bloom(ctx, x, cy + y, S * (3 + 5 * k2), blue ? [150, 200, 255] : heat(0.5 + 0.4 * k2), 0.9 * k2);
      const [x0, y0] = ballistic(vx, vy, Math.max(0, T - 0.07 - k2 * 0.025), 1.1, 150 * S);
      const c = blue ? [177, 218, 255] : heat(0.59 + 0.41 * k2);
      streak(ctx, x0, cy + y0, x, cy + y, (1.1 + 0.6 * ih(k, 8, seed)) * S, c, k2);
    }
  }
  ctx.globalAlpha = 1;
}
const mix3 = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

export default {
  id: 'fx.intercept', family: 'fx', title: 'Intercept',
  about: 'A missile killed in mid-air, once over 2.8 s by o.p: a pop, a hanging puff, burning fragments falling with thin smoke lines. pop is warm, blue is a SISO interceptor. o.size scales it.',
  w: 220, h: 256, states: ['pop', 'blue'], loop: 0, once: { pop: DUR, blue: DUR }, variants: 4, free: true,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    const s = o.size ?? 1;
    intercept(ctx, o, { p: clamp(o.p ?? 0.5), seed: o.seed || 0, cy: -170 * s, blue: o.state === 'blue', S: s });
    ctx.restore();
  },
};
