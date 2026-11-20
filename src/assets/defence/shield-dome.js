// The energy dome over the SISO island: a nearly clear shell whose edge burns a thin saturated blue where the eye looks
// through the most of it (fresnel), a hex lattice that shows mostly near the rim, a slow shimmer band crossing it.
// hit (once 1.6 s): a hot white-blue core at (o.hitX, o.hitY) in the dome's frame, concentric rings around it lying
// following the curved shell, fading as the ripple reaches its edges.
import { css, glow, clamp, smooth, ease, bake, mix, TAU } from './_lib.js';

const BOX = [-256, -300, 256, 0];
const RX = 250, RY = 296;
const BLUE = [48, 128, 251], SHEEN = [105, 183, 255], HOT = [184, 222, 255];
const arc = (c) => c.ellipse(0, 0, RX, RY, 0, Math.PI, TAU);

function paintHex(g, lit) {
  g.save(); g.beginPath(); arc(g); g.clip();
  const r = 10, step = r * Math.sqrt(3);
  g.strokeStyle = css(HOT); g.lineWidth = 0.55; g.beginPath();
  for (let col = -17; col <= 17; col++) for (let row = 0; row <= 17; row++) {
    const x = col * 1.5 * r, y = -row * step - (col & 1 ? step / 2 : 0);
    g.moveTo(x + r * 0.5, y - step / 2);
    g.lineTo(x + r, y); g.lineTo(x + r * 0.5, y + step / 2); g.lineTo(x - r * 0.5, y + step / 2);
  }
  g.stroke();
  g.globalCompositeOperation = 'destination-in';
  const shine = g.createRadialGradient(lit * 170, -200, 0, lit * 170, -200, 123);
  shine.addColorStop(0, css([0, 0, 0], 0.8)); shine.addColorStop(1, css([0, 0, 0], 0));
  g.fillStyle = shine; g.fillRect(-RX, -RY, RX * 2, RY);
  g.restore();
}

// Circle of constant angular distance on the ellipsoid, projected onto its visible hemisphere.
function wave(ctx, n, angle) {
  const [x, y, z] = n, xy = Math.hypot(x, y);
  const ux = xy > 0.001 ? -y / xy : 1, uy = xy > 0.001 ? x / xy : 0;
  const vx = -z * uy, vy = z * ux, vz = x * uy - y * ux;
  const c = Math.cos(angle), s = Math.sin(angle);
  let visible = false;
  ctx.beginPath();
  for (let i = 0; i <= 90; i++) {
    const a = i * TAU / 90, u = Math.cos(a) * s, v = Math.sin(a) * s;
    const wx = x * c + ux * u + vx * v, wy = y * c + uy * u + vy * v;
    if (z * c + vz * v < 0 || wy > 0) { visible = false; continue; }
    if (visible) ctx.lineTo(wx * RX, wy * RY);
    else ctx.moveTo(wx * RX, wy * RY);
    visible = true;
  }
}

export default {
  id: 'defence.shield-dome',
  family: 'defence',
  title: 'Shield dome',
  about: 'The translucent energy dome over the SISO island: a nearly clear shell with a thin blue fresnel edge and a slow hex shimmer; hit (once 1.6 s): a hot core at o.hitX, o.hitY (dome frame, default on the shell upper right), concentric rings in the shell plane and a ripple spreading over it.',
  w: 512, h: 300,
  states: ['idle', 'hit'],
  loop: 9,
  once: { hit: 1.6 },
  variants: 1,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, hit = o.state === 'hit', p = hit ? clamp(o.p || 0) : 0;
      const lit = o.lit >= 0 ? 1 : -1, night = L.night;
      const pulse = 0.96 + 0.04 * Math.sin(t * 0.7);
      ctx.save();
      ctx.beginPath(); arc(ctx); ctx.closePath(); ctx.clip();
      ctx.save(); ctx.scale(1, RY / RX);
      const fresnel = ctx.createRadialGradient(0, 0, 0, 0, 0, RX);
      for (const [stop, alpha] of [[0, 0], [0.36, 0.012], [0.71, 0.063], [0.88, 0.15], [0.96, 0.29], [1, 0.5]]) {
        fresnel.addColorStop(stop, css(mix(BLUE, SHEEN, stop), alpha * (0.36 + night * 0.64) * pulse));
      }
      ctx.fillStyle = fresnel; ctx.fillRect(-RX, -RX, RX * 2, RX);
      ctx.restore();
      glow(ctx, lit * 155, -232, 110, mix(L.key, HOT, 0.7), 0.055 + 0.075 * night);
      const opacity = ctx.globalAlpha;
      ctx.globalAlpha *= (0.065 + 0.075 * night) * (0.8 + 0.2 * Math.sin(t * 1.15));
      bake(ctx, 'defence.shield-dome:hex', BOX, { L: { q: 0 }, lit }, (g) => paintHex(g, lit));
      ctx.globalAlpha = opacity;
      ctx.restore();

      ctx.globalCompositeOperation = 'lighter';
      const rim = ctx.createLinearGradient(-lit * RX, 0, lit * RX, -RY * 0.65);
      rim.addColorStop(0, css(BLUE, 0.045 + 0.21 * night));
      rim.addColorStop(0.55, css(SHEEN, 0.11 + 0.2 * night));
      rim.addColorStop(1, css(HOT, 0.36 + 0.35 * night));
      ctx.beginPath(); arc(ctx);
      ctx.strokeStyle = css(BLUE, (0.022 + 0.12 * night) * pulse); ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = rim; ctx.lineWidth = 0.94 + 0.5 * night; ctx.stroke();
      for (const x of [-RX, RX]) glow(ctx, x, -3, 15, SHEEN, 0.13 + 0.34 * night);
      if (!hit || p >= 1) return;

      const hx = o.hitX ?? 130, hy = o.hitY ?? -252;
      let nx = hx / RX, ny = Math.min(0, hy / RY);
      const mag = Math.max(1, Math.hypot(nx, ny));
      nx /= mag; ny /= mag;
      const n = [nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))];
      const x = nx * RX, y = ny * RY, flash = 1 - smooth(0, 0.45, p);
      const spread = 0.035 + 1.88 * ease.out(p), strength = (1 - p) ** 1.55;
      const sweep = ctx.createLinearGradient(-lit * RX, 0, lit * RX, -RY * 0.5);
      sweep.addColorStop(0, css(BLUE, 0.06 * strength));
      sweep.addColorStop(0.47, css(SHEEN, 0.3 * strength));
      sweep.addColorStop(1, css(HOT, 0.46 * strength));
      ctx.lineCap = 'round';
      for (const [delay, width, k] of [[0, 19, 0.2], [0, 8, 0.36], [0, 2, 0.74], [0.085, 4.5, 0.32], [0.18, 8, 0.2]]) {
        if (spread <= delay) continue;
        wave(ctx, n, spread - delay);
        ctx.strokeStyle = sweep; ctx.lineWidth = width; ctx.globalAlpha = opacity * k; ctx.stroke();
      }
      ctx.globalAlpha = opacity;
      glow(ctx, x, y, 70, BLUE, 0.65 * flash + 0.21 * strength);
      glow(ctx, x, y, 23, SHEEN, 0.95 * flash + 0.24 * strength);
      glow(ctx, x, y, 6, [255, 255, 255], 0.97 * flash);
    } finally { ctx.restore(); }
  },
};
