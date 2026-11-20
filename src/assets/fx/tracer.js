// A CIWS stream of tracer rounds along o.points, from the gun (first point) to the target (last): 46 rounds a second,
// each a short motion-blurred streak, spreading slightly with range and burning out near the end; a flickering muzzle
// flash and a little gun smoke at the start. fire is red-orange; siso is blue-white.
import { clamp, smooth, frac, ih, vn, smokeTint, puffTinted, put, bloom, css, mix } from './_lib.js';

const RATE = 46, SPEED = 1100, STREAK = 16;
const COL = { fire: { body: [255, 96, 40], head: [255, 214, 150] }, siso: { body: [90, 170, 255], head: [226, 244, 255] } };
const DEF = [[-140, -12], [0, -110], [140, -200]];

function path(pts) {
  const seg = []; let len = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([len, l]); len += l; }
  const at = (s) => {
    s = clamp(s, 0, len);
    for (let i = 0; i < seg.length; i++) {
      const [s0, l] = seg[i];
      if (s <= s0 + l || i === seg.length - 1) {
        const f = l > 0 ? (s - s0) / l : 0, a = pts[i], b = pts[i + 1];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (b[0] - a[0]) / (l || 1), (b[1] - a[1]) / (l || 1)];
      }
    }
    return [pts[0][0], pts[0][1], 1, 0];
  };
  return { len, at };
}

export function tracer(ctx, o, { points, kind = 'fire', seed = 0, t = 0 } = {}) {
  const pts = points && points.length >= 2 ? points : DEF;
  const P = path(pts), C = COL[kind] || COL.fire, L = o.L;
  const spacing = SPEED / RATE, base = (t * RATE) % 1e6, m = Math.floor(base), fr = base - m;
  const n = Math.ceil(P.len / spacing) + 1;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const w = Math.max(1.15, 0.85 / (o.scale || 1));
  for (let j = 0; j < n; j++) {
    const s = (fr + j) * spacing; if (s > P.len) break;
    const id = m - j;
    const [x, y, dx, dy] = P.at(s), [x0, y0] = P.at(Math.max(0, s - STREAK * (0.67 + 0.63 * ih(id, 5, seed))));
    const spread = s * 0.02 * ((ih(id, 1, seed) - 0.5) * 2);
    const ox = -dy * spread, oy = dx * spread;
    const a = smooth(0, 14, s) * (1 - smooth(P.len * 0.82, P.len, s)) * (0.6 + 0.4 * ih(id, 2, seed));
    const g = ctx.createLinearGradient(x0 + ox, y0 + oy, x + ox, y + oy);
    g.addColorStop(0, css(C.body, 0)); g.addColorStop(0.43, css(C.body, a * 0.81)); g.addColorStop(1, css(C.head, a));
    ctx.beginPath(); ctx.moveTo(x0 + ox * 0.9, y0 + oy * 0.9); ctx.lineTo(x + ox, y + oy);
    ctx.strokeStyle = css(C.body, a * (0.16 + 0.15 * L.night));
    ctx.lineWidth = w * 2.7;
    ctx.stroke();
    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  // muzzle
  const [mx, my] = pts[0];
  const fl = ih(Math.floor(t * 30), 3, seed);
  bloom(ctx, mx, my, 19 + 10 * fl, C.body, 0.74 + 0.26 * L.night);
  bloom(ctx, mx, my, 3.5 + 2 * fl, C.head, 1);
  ctx.globalCompositeOperation = 'source-over';
  const tint = smokeTint(L, 'grey', o.lit || 1);
  for (let k = 0; k < 4; k++) {
    const a = frac(t * 0.7 + k / 4);
    put(ctx, puffTinted(k + seed, tint), mx - 4 + a * 14 + vn(t + k, 1, 2) * 3, my - 3 - a * 14, 3 + a * 9, 0.32 * (1 - a) * smooth(0, 0.1, a));
  }
  ctx.globalAlpha = 1;
}

export default {
  id: 'fx.tracer', family: 'fx', title: 'Tracer fire',
  about: 'A CIWS stream of tracer rounds along o.points, from the gun (first) to the target (last), 46 rounds/s with spread and burn-out; muzzle flash and gun smoke. fire is red-orange, siso is blue-white.',
  w: 320, h: 220, states: ['fire', 'siso'], loop: 1, once: {}, variants: 1, free: true,
  ref: 'refs/slice/vertical-slice.webp',
  draw(ctx, o) {
    ctx.save();
    tracer(ctx, o, { points: o.points, kind: o.state === 'siso' ? 'siso' : 'fire', seed: o.seed || 0, t: o.t || 0 });
    ctx.restore();
  },
};
