// A boat's wake seen from a low camera across the bay: white churn boiling up at the stern, a rooster tail of spray
// when fast, two broken foam lines (the arms of the V, foreshortened to a narrow wedge on the water) and a pale slick
// of flattened water between them. The foam stays put in the water while the boat moves, so it streams astern.
// The stern is the right end of the box (x = +w/2); the wake trails left.
import { clamp, smooth, vn, ih, frac, foamColor, puffTinted, put, css, lod } from './_lib.js';

const SPEED = { cruise: 0.6, fast: 1, slow: 0.3 };
export const WAKE_W = 512;

export function wake(ctx, o, { speed = 0.6, seed = 0, W = WAKE_W } = {}) {
  const L = o.L, t = o.t || 0, q = lod(o);
  const stern = W / 2, len = Math.min(W, 110 + 300 * speed);
  const v = 40 + 140 * speed;
  const foam = foamColor(L), soft = foamColor(L, -0.35), fa = 1 - L.night * 0.13;
  const near = 13 + 8 * speed, far = -9 - 6 * speed;
  const g = ctx.createLinearGradient(stern, 0, stern - len, 0);
  g.addColorStop(0, css(soft, 0.32 * fa));
  g.addColorStop(0.3, css(soft, 0.16 * fa));
  g.addColorStop(1, css(soft, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(stern, 0);
  ctx.quadraticCurveTo(stern - len * 0.52, far * 0.88, stern - len, far);
  ctx.lineTo(stern - len, near);
  ctx.quadraticCurveTo(stern - len * 0.44, near * 0.72, stern, 0);
  ctx.fill();

  const count = Math.round(46 * (0.55 + 0.45 * q)), step = len / count;
  const mist = { key: `foam|${L.q}|${o.lit}`, lit: foam, shadow: soft, l: [o.lit * 0.48, -0.65, 0.56] };
  ctx.lineCap = 'round';
  for (const [arm, reach] of [[0, far], [1, near]]) {
    for (let i = 0; i < count; i++) {
      const f = i / count, x = stern - 3 - f * len;
      const u = stern - x + t * v * 0.3;
      const turbulence = vn(u * 0.098, arm * 8.3, seed + 11);
      const wave = (vn(u * 0.053, arm, seed + 3) - 0.5) * (2.5 + 6 * f);
      const y = reach * f ** 0.82 + wave;
      const a = (0.33 + 0.66 * smooth(0.21, 0.79, turbulence)) * (1 - f) ** 1.06 * fa;
      if (a < 0.04) continue;
      const r = (1.8 + 2.9 * turbulence) * (1 - f * 0.34);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(step * 1.2 / r, 0.63);
      put(ctx, puffTinted(i + arm + seed, mist), 0, 0, r, a * 0.86);
      ctx.restore();
      if (turbulence < 0.29) continue;
      ctx.strokeStyle = css(foam, a * (arm ? 0.84 : 0.65));
      ctx.lineWidth = (1.6 + 1.9 * turbulence) * (1 - f * 0.46);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - step * 0.32, y + wave * 0.28, x - step * (0.48 + 0.49 * turbulence), y + reach / count);
      ctx.stroke();
    }
  }

  const churn = Math.round((14 + 19 * speed) * q), churnLen = 52 + 94 * speed;
  for (let i = 0; i < churn; i++) {
    const a = frac(t * (0.8 + speed) + i / churn);
    const x = stern - 5 - a * churnLen;
    const offset = (ih(i, 2, seed) - 0.52) * (7 + 20 * a);
    const r = 6 + (8 + 5 * a) * speed * ih(i, 3, seed);
    ctx.save();
    ctx.translate(x, offset - speed * 5 * (1 - a));
    ctx.scale(1.55, 0.39 + speed * 0.22);
    put(ctx, puffTinted(i + seed, mist), 0, 0, r, smooth(0, 0.06, a) * (1 - a) ** 1.12 * fa);
    ctx.restore();
  }

  const spray = smooth(0.45, 1, speed), drops = Math.round(23 * q);
  for (let i = 0; i < drops && spray > 0; i++) {
    const a = frac(t * 1.6 + ih(i, 4, seed));
    const x = stern - 4 - (27 + 65 * ih(i, 5, seed)) * a * spray;
    const y = (-(36 + 34 * ih(i, 6, seed)) * a + 76 * a * a) * spray;
    if (y > 0) continue;
    ctx.fillStyle = css(foam, (1 - a) * fa * spray * 0.92);
    ctx.fillRect(x, y, 0.8 + ih(i, 7, seed) * 1.7, 1.2);
  }
}

export default {
  id: 'fx.wake', family: 'fx', title: 'Wake',
  about: 'A boat wake from a low camera: stern churn, rooster-tail spray when fast, broken V foam lines and a slick. o.speed 0..1 (else the state). The stern is the right end of the box (x = +w/2); place it at stern.x - w/2.',
  w: WAKE_W, h: 40, states: ['cruise', 'fast', 'slow'], loop: 5, once: {}, variants: 4,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    wake(ctx, o, { speed: clamp(o.speed ?? SPEED[o.state] ?? 0.6), seed: o.seed || 0 });
    ctx.restore();
  },
};
