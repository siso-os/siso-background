// A missile's smoke trail along o.points ([[x, y], ...] in its own frame, newest last): thin and hot at the motor,
// widening, billowing and fading behind. The billows are keyed to world position, so the trail does not crawl as the
// missile flies. enemy is dirty grey with an orange motor; siso is white with a blue-white motor; contrail is a jet's
// thin white line. At small scale (a 50-missile swarm) it drops to a few stroked segments.
import { clamp, smooth, vn, ih, smokeTint, puffTinted, puffGlow, put, bloom, css, mix, streak } from './_lib.js';

const KIND = {
  enemy: { tone: 'black', r0: 1.5, grow: 0.047, dens: 0.91, motor: [255, 150, 50], hot: [255, 214, 140] },
  siso: { tone: 'white', r0: 1.3, grow: 0.039, dens: 0.77, motor: [140, 196, 255], hot: [220, 240, 255] },
  contrail: { tone: 'steam', r0: 1.32, grow: 0.013, dens: 0.76, motor: null, hot: null },
};
const DEF = [[-150, -110], [-100, -88], [-50, -64], [0, -44], [50, -28], [100, -16], [140, -10]];

function resample(pts, maxLen, stepAt) {
  // walk from the newest point backwards, emitting samples every stepAt(s) units: [{x, y, s, nx, ny}]
  const out = [];
  let s = 0, need = 0;
  for (let i = pts.length - 1; i > 0; i--) {
    const [x1, y1] = pts[i], [x0, y0] = pts[i - 1];
    const seg = Math.hypot(x1 - x0, y1 - y0); if (seg < 1e-6) continue;
    const nx = -(y1 - y0) / seg, ny = (x1 - x0) / seg;
    let d = need;
    while (d <= seg) {
      const f = d / seg; out.push({ x: x1 + (x0 - x1) * f, y: y1 + (y0 - y1) * f, s: s + d, nx, ny });
      d += stepAt(s + d);
      if (s + d > maxLen) return out;
    }
    need = d - seg; s += seg;
  }
  return out;
}

export function trail(ctx, o, { points, kind = 'enemy', maxLen = 900, t = 0 } = {}) {
  const K = KIND[kind] || KIND.enemy, L = o.L;
  const pts = points && points.length >= 2 ? points : DEF;
  const sc = o.scale || 1;
  const head = pts[pts.length - 1];
  // total length (capped)
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  len = Math.min(len, maxLen);
  if (len < 1) return;
  const tint = smokeTint(L, K.tone, o.lit || 1);
  const small = (K.r0 + len * K.grow * 0.5) * sc < 3;
  const smoke = mix(tint.lit, tint.shadow, K.motor ? 0.4 : 0.14);
  const color = K.motor
    ? mix(smoke, kind === 'siso' ? [119, 144, 173] : [59, 68, 81], L.night * 0.72)
    : mix([224, 228, 230], [149, 172, 198], L.night);
  const curl = ({ x, y, nx, ny, s }) => {
    const radius = K.r0 + s * K.grow;
    const age = smooth(0, 90, s), drift = t * 0.35;
    const shear = (vn(x * 0.027 + drift, y * 0.027, 17) - 0.5) * radius * age * 1.24;
    const twist = Math.sin(x * 0.061 + y * 0.022 + drift) * radius * age * 0.26;
    return [x + nx * (shear + twist) + s * 0.027 * age, y + ny * (shear + twist) - s * 0.032 * age];
  };
  if (small) {
    // cheap: a few stroked segments, widening and fading
    const S = resample(pts, len, () => Math.min(len * 0.5, Math.max(4, len / 10)));
    ctx.lineCap = 'round';
    if (!S.length) return;
    let [x0, y0] = curl(S[0]);
    for (let i = 1; i < S.length; i++) {
      const f = S[i].s / len, [x, y] = curl(S[i]);
      ctx.strokeStyle = css(color, K.dens * (1 - f) ** 1.54);
      ctx.lineWidth = (K.r0 + S[i].s * K.grow) * 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
      x0 = x; y0 = y;
    }
  } else {
    const S = resample(pts, len, (s) => Math.max(2.5, (K.r0 + s * K.grow) * 0.87));
    for (let i = S.length - 1; i >= 0; i--) {
      const p = S[i], f = p.s / len;
      const variation = vn(p.x * 0.076 - t * 0.16, p.y * 0.076, 5);
      const r = (K.r0 + p.s * K.grow) * (0.73 + 0.59 * variation);
      const al = K.dens * (1 - f) ** 1.25 * smooth(0, 6, p.s) * (0.61 + 0.59 * variation);
      const [x, y] = curl(p);
      const sh = Math.floor(ih(Math.round(p.x / 8), Math.round(p.y / 8), 9) * 6);
      put(ctx, puffTinted(sh, tint), x, y, r * 1.6, al);
      if (!K.motor || L.night > 0.25) {
        put(ctx, puffGlow(sh, 'tint', color), x, y, r * 1.52, al * (K.motor ? L.night * 0.35 : 0.64));
      }
      if (K.motor && p.s < 60 && L.night > 0.2) {
        ctx.globalCompositeOperation = 'lighter';
        const spill = kind === 'siso' ? puffGlow(sh, 'tint', K.motor) : puffGlow(sh, 'under');
        put(ctx, spill, x, y, r * 1.5, al * L.night * (1 - p.s / 60) * 0.72);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  if (K.motor) {
    // the hot section right behind the motor, then the motor's own glow
    const S = resample(pts, 40, () => Math.max(1, Math.min(5, len / 3)));
    const tail = S[S.length - 1];
    ctx.globalCompositeOperation = 'lighter';
    const fl = 0.82 + 0.18 * vn(t * 30, 0.5, 3);
    if (tail?.s > 0) {
      streak(ctx, tail.x, tail.y, ...head, Math.max(1.55 / sc, 4.2) * fl, K.motor, 0.59);
      const core = S[Math.max(1, Math.floor(S.length * 0.56))];
      streak(ctx, core.x, core.y, ...head, Math.max(1.05 / sc, 1.8) * fl, K.hot, 1);
    }
    bloom(ctx, head[0], head[1], Math.max(12, 3.2 / sc) * fl, K.motor, 0.86 + 0.14 * L.night);
    bloom(ctx, head[0], head[1], Math.max(3, 1.4 / sc), [255, 255, 245], 1);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}

export default {
  id: 'fx.trail', family: 'fx', title: 'Missile trail',
  about: 'A smoke trail along o.points ([[x, y], ...], newest last): hot and thin at the motor, billowing and fading behind. o.kind (else the state): enemy orange motor, siso blue-white, contrail white. o.len caps its length (default 900).',
  w: 320, h: 120, states: ['enemy', 'siso', 'contrail'], loop: 2, once: {}, variants: 1, free: true,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    trail(ctx, o, { points: o.points, kind: o.kind || o.state, maxLen: o.len ?? 900, t: o.t || 0 });
    ctx.restore();
  },
};
