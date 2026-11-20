// A coastal searchlight: a drum lamp on a yoke on a small concrete plinth, throwing a long beam into the haze.
// sweep: the beam swings slowly across the sky. lock: it holds on o.aim (radians above the horizon, default 1.15).
// The beam is faint by day and carries the scene at night; it leaves the box (free).
import { css, mix, shade, glow, clamp, mat, rim, bake, vgrad, GUNMETAL, CONCRETE, block, noise1, contact, scuffs, rng } from './_lib.js';

const BOX = [-8, -12, 8, 0.55];
const PIV = [0, -8.4];

function paintBase(g, s, o) {
  const L = o.L;
  contact(g, 0, -0.8, 15, 1.35);
  block(g, o, -6, -2.2, 6, 0, CONCRETE, { topH: 0.4 });
  scuffs(g, o, -6, -1.9, 12, 1.84, 63);
  g.fillStyle = mat([60, 62, 66], L, 0); g.fillRect(-3.4, -3, 6.8, 0.8); // turntable
  g.fillStyle = vgrad(g, -8.6, -3, [[0, shade(GUNMETAL, L, -0.2)], [1, shade(GUNMETAL, L, -0.7)]]); g.fillRect(-2.9, -8.6, 0.7, 5.6); // far arm
  g.strokeStyle = mat([47, 44, 39], L, -0.3); g.lineWidth = 0.25;
  g.beginPath(); g.moveTo(-1.2, -2.8); g.bezierCurveTo(-4.2, -3, -3.4, -5.6, -2.6, -5.8); g.stroke();
  rim(g, o, (c) => { c.moveTo(-6, -2.25); c.lineTo(6, -2.25); }, 0.25);
}

export default {
  id: 'defence.searchlight',
  family: 'defence',
  title: 'Searchlight',
  about: 'A coastal searchlight: drum lamp on a yoke; sweep: the beam swings slowly across the sky; lock: it holds on o.aim (radians above the horizon, 1.15). Faint by day, strong at night; the beam leaves the box.',
  w: 16, h: 12,
  states: ['sweep', 'lock'],
  loop: 12,
  variants: 1,
  free: true,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, lock = o.state === 'lock';
      const ang = lock ? (o.aim !== undefined ? o.aim : 1.15) + 0.006 * noise1(t * 3, 5) : 1.05 + 0.42 * Math.sin((t / 12) * Math.PI * 2 + (o.seed || 0));
      const ni = clamp(0.1 + 1.0 * L.night) * (lock ? 1.15 : 1), warm = [255, 244, 222];
      bake(ctx, 'defence.searchlight', BOX, o, (g, s) => paintBase(g, s, o));
      ctx.save(); ctx.translate(PIV[0], PIV[1]); ctx.rotate(-ang);
      // the beam: a wide soft cone and a tight core, both additive, fading with distance into the haze
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const len = 780 - i * 14, sp = 0.087 - i * 0.0105;
        const a = 0.017 + i * 0.006;
        const g = ctx.createLinearGradient(3, 0, len, 0);
        g.addColorStop(0, css(warm, a * ni)); g.addColorStop(0.05, css(warm, a * 0.8 * ni)); g.addColorStop(0.4, css(warm, a * 0.3 * ni)); g.addColorStop(1, css(warm, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(3, -1.7); ctx.lineTo(len, -len * sp - 1.7); ctx.lineTo(len, len * sp + 1.7); ctx.lineTo(3, 1.7); ctx.closePath(); ctx.fill();
      }
      if (ni > 0.15 && o.scale >= 1) {
        const r = rng(182);
        for (let i = 0; i < 34; i++) {
          const distance = 5 + 210 * r() ** 2.7;
          const y = (r() - 0.5) * (2 + distance * 0.11) + 0.65 * Math.sin(t * 1.8 + i);
          const sparkle = (0.57 + 0.43 * Math.sin(t * 2.1 + i * 4.6)) * (1 - distance / 244);
          const radius = 0.026 + 0.12 * r();
          ctx.fillStyle = css(warm, 0.19 * ni * sparkle);
          ctx.beginPath(); ctx.ellipse(distance + 1.2 * Math.sin(t * 1.3 + i), y, radius * 1.6, radius, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      // the drum: a short cylinder lit across its round, with a rear cap and a cooling-fin band
      ctx.fillStyle = vgrad(ctx, -2.2, 2.2, [[0, shade(GUNMETAL, L, 0.9, { gloss: 0.3 })], [0.35, shade(GUNMETAL, L, 0.2)], [1, shade(GUNMETAL, L, -0.9)]]);
      ctx.fillRect(-3.4, -2.2, 6.4, 4.4);
      ctx.fillStyle = css([0, 0, 0], 0.3); for (let x = -2.6; x < -0.4; x += 0.5) ctx.fillRect(x, -2.2, 0.18, 4.4);
      ctx.fillStyle = mat([50, 52, 56], L, 0); ctx.fillRect(-3.8, -1.7, 0.5, 3.4);
      const lens = (x, rx, ry, fill) => {
        ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      };
      lens(2.98, 0.83, 2.34, vgrad(ctx, -2.34, 2.34, [[0, shade([185, 185, 177], L, 0.93)], [0.28, shade([123, 120, 109], L, 0.28)], [1, shade([83, 83, 79], L, -0.55)]]));
      lens(3.21, 0.55, 1.94, vgrad(ctx, -1.94, 1.94, [[0, [146, 176, 193]], [0.4, warm], [0.64, mix(warm, [255, 255, 255], 0.8)], [1, [159, 175, 178]]]));
      lens(3.48, 0.18, 1.1, css([255, 255, 247], 0.75));
      glow(ctx, 3.56, 0, 8, warm, 0.54 * ni); glow(ctx, 3.54, 0, 2.45, [255, 255, 255], 0.92 * ni);
      ctx.restore();
      ctx.fillStyle = vgrad(ctx, -8.6, -3, [[0, shade(GUNMETAL, L, 0.4)], [1, shade(GUNMETAL, L, -0.4)]]); ctx.beginPath(); ctx.roundRect(2.2, -8.85, 0.79, 5.85, 0.26); ctx.fill(); // near arm
      ctx.fillStyle = mat([40, 42, 46], L, 0); ctx.beginPath(); ctx.arc(PIV[0] + 2.55, PIV[1], 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mat([141, 139, 130], L, 0.4);
      ctx.beginPath(); ctx.arc(2.55, PIV[1] - 0.03, 0.22, 0, Math.PI * 2); ctx.fill();
    } finally { ctx.restore(); }
  },
};
