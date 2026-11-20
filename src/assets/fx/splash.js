// Something hitting the sea, once: a column of white water thrown up (mist lumps on ballistic arcs), droplets as
// streaks, the column collapsing back, a foam ring spreading on the water and mist drifting off. shell is a gun round
// or a fragment; big is a missile or a falling chunk of island.
import { rng, clamp, smooth, foamColor, puffTinted, put, ballistic, css, mix, lod, TAU, vn, streak } from './_lib.js';

const DUR = { shell: 1.8, big: 2.8 };

export function splash(ctx, o, { p = 0.5, seed = 0, H = 70, dur = 1.8, S = 1 } = {}) {
  const T = p * dur, L = o.L, r = rng(seed * 23 + 4), q = lod(o), lit = o.lit || 1;
  const g = 260 * S, v0 = Math.sqrt(2 * g * H * S);
  const white = foamColor(L, 0.72), shade = foamColor(L, -0.4);
  const mist = { key: `splash-mist|${L.q}|${lit}`, lit: white, shadow: shade, l: [lit * 0.48, -0.65, 0.56] };
  const fade = 1 - smooth(0.75, 1, p);
  const rx = S * (8 + 81 * (1 - Math.exp(-1.6 * T))), ry = rx * 0.16;
  const foam = Math.exp(-T * 0.64) * fade;
  const base = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  base.addColorStop(0, css(white, 0.82 * foam));
  base.addColorStop(0.32, css(shade, 0.41 * foam));
  base.addColorStop(1, css(shade, 0));
  ctx.save();
  ctx.scale(1, 0.21);
  ctx.fillStyle = base;
  ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
  ctx.restore();

  ctx.lineCap = 'round';
  const ripples = Math.round(20 + 8 * q);
  for (let i = 0; i < ripples; i++) {
    const a = (i + r.range(-0.3, 0.3)) * TAU / ripples;
    const b = a + r.range(0.07, 0.38);
    const wob = 1 + r.range(-0.14, 0.14) * (0.7 + 0.3 * Math.sin(T * 3 + i));
    const near = smooth(-0.65, 0.75, Math.sin(a));
    ctx.strokeStyle = css(mix(shade, white, near), foam * r.range(0.25, 0.85) * (0.46 + 0.54 * near));
    ctx.lineWidth = S * r.range(1.1, 3.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * wob, ry * wob, 0, a, b);
    ctx.stroke();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(-4 * H, -4 * H, 8 * H, 4 * H);
  ctx.clip();
  // A broad, textured sheet of aerated water follows the middle jets. Only the outer wisps resolve as streaks.
  const count = Math.round(13 + 10 * q);
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + r.range(-0.32, 0.37) * r.range(0.5, 1);
    const speed = r.range(0.59, 1.16) * v0, delay = r.range(0, 0.24);
    const radius = r.range(4.2, 8.8) * S, density = r.range(0.29, 0.68);
    const time = T - delay;
    if (time <= 0) continue;
    const vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
    const span = Math.min(time, (0.69 - 0.38 * smooth(0.53, 1.38, T)) * Math.sqrt(S));
    const a = density * smooth(0, 0.11, time) * (1 - smooth(dur * 0.46, dur, time)) * fade;
    for (let j = 0; j < 4; j++) {
      const along = (j + 0.39 + 0.21 * vn(i, j, seed)) / 4;
      const [x, y] = ballistic(vx, vy, time - span * (1 - along), 0.62, g);
      if (y >= 0) continue;
      const spread = (0.93 - 0.25 * along) * (1.1 - 0.29 * smooth(0.72, 1.5, time));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.scale(spread, 1.2 + 2.3 * Math.min(1, span) * (1 - along * 0.5));
      put(ctx, puffTinted(i + j * 3 + seed, mist), 0, 0, radius, a * (0.99 - along * 0.27));
      ctx.restore();
    }
  }

  // At its strongest the base is a continuous trunk, edged by the separate sheets and falling spray.
  const jet = smooth(0.04, 0.31, T) * (1 - smooth(0.67, 1.38, T)) * fade;
  if (jet > 0.01) {
    ctx.save();
    ctx.translate(S * 1.5, -H * S * 0.15 * jet);
    ctx.scale(0.72, 2.8 + jet * 1.6);
    put(ctx, puffTinted(seed + 1, mist), 0, 0, S * (6 + 5.2 * jet), jet * 0.88);
    ctx.restore();
  }

  const drops = Math.round(51 * q);
  for (let i = 0; i < drops; i++) {
    const speed = v0 * r.range(0.47, 1.35), angle = -Math.PI / 2 + r.range(-0.78, 0.82);
    const time = T - r.range(0, 0.19), length = r.range(0.03, 0.085), width = S * r.range(0.78, 2.15);
    if (time <= 0) continue;
    const vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
    const [x, y] = ballistic(vx, vy, time, 0.59, g);
    if (y > 0) continue;
    const [x0, y0] = ballistic(vx, vy, Math.max(0, time - length), 0.59, g);
    const sparkle = vn(time * 10, i * 0.81, seed);
    streak(ctx, x0, y0, x, y, width, white, (0.36 + sparkle * 0.61) * fade);
  }

  ctx.restore();
  for (let i = -3; i <= 3; i++) {
    const drift = T * (i + 0.5) * 7.5;
    const rad = S * (6 + 9 * T + 0.9 * Math.abs(i));
    ctx.save();
    ctx.translate(S * (i * 6 + drift), -rad * 0.20);
    ctx.scale(1, 0.26);
    put(ctx, puffTinted(i + seed + 3, mist), 0, 0, rad, 0.64 * smooth(0.04, 0.6, T) * foam);
    ctx.restore();
  }
}

export default {
  id: 'fx.splash', family: 'fx', title: 'Splash',
  about: 'Something hitting the sea, once by o.p: a white water column on ballistic arcs, droplets, a spreading foam ring, drifting mist. shell over 1.8 s, big over 2.8 s.',
  w: 160, h: 160, states: ['shell', 'big'], loop: 0, once: DUR, variants: 4,
  ref: 'refs/elements/sea-day.webp',
  draw(ctx, o) {
    ctx.save();
    const big = o.state === 'big';
    splash(ctx, o, { p: clamp(o.p ?? 0.5), seed: o.seed || 0, H: big ? 150 : 70, dur: big ? 2.8 : 1.8, S: big ? 1 : 0.7 });
    ctx.restore();
  },
};
