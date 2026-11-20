// A close-in weapon system: a white radome over a rotary cannon on a pedestal. fire (loop): a flickering muzzle flash,
// a stream of tracer rounds out along the barrel and spent-case sparks. o.aim: barrel elevation in radians (0.55).
import { css, mix, shade, glow, clamp, mat, rim, lamp, bake, vgrad, hgrad, GUNMETAL, rng, contact, exhaust, FLAME, scuffs } from './_lib.js';

const BOX = [-8, -20, 8, 0.55];
const DOME_C = [226, 228, 230];

function paint(g, s, o) {
  const L = o.L;
  contact(g, 0, -0.8, 13, 1.35);
  // pedestal: a flared drum
  const ped = new Path2D('M-5 0 L-4 -2 L-2.6 -2.6 L-2.6 -7 L2.6 -7 L2.6 -2.6 L4 -2 L5 0 Z');
  g.fillStyle = hgrad(g, -5, 5, (o.lit > 0 ? (x) => x : (x) => x.map(([s, c]) => [1 - s, c]).reverse())([[0, shade(GUNMETAL, L, -0.9)], [0.6, shade(GUNMETAL, L, 0.4)], [0.85, shade(GUNMETAL, L, 0.9)], [1, shade(GUNMETAL, L, 0.2)]]));
  g.fill(ped);
  g.save(); g.clip(ped);
  g.fillStyle = vgrad(g, -7, -4.6, [[0, [12, 15, 19], 0.63], [1, [12, 15, 19], 0]]);
  g.fillRect(-3, -7, 6, 2.4);
  g.fillStyle = css([15, 18, 21], 0.66); g.fillRect(-1.24, -5.66, 2.48, 2.3);
  g.fillStyle = mat([100, 103, 107], L, -0.07); g.fillRect(-1.1, -5.55, 2.2, 2.07);
  g.fillStyle = css([19, 22, 25], 0.58);
  for (const x of [-3.8, -2.2, 2.2, 3.8]) g.fillRect(x - 0.17, -0.9, 0.34, 0.47);
  g.restore();
  const dome = new Path2D('M-3.55 -9.5 C-3.72 -12.1 -3.9 -14.1 -3.73 -15.78 C-3.53 -18.2 -2.27 -19.54 0 -19.6 C2.27 -19.54 3.53 -18.2 3.73 -15.78 C3.9 -14.1 3.72 -12.1 3.55 -9.5 Z');
  const r = g.createRadialGradient(o.lit * 1.55, -16.7, 0.16, 0, -13.85, 6.1);
  r.addColorStop(0, css(mix(shade(DOME_C, L, 0.95, { gloss: 0.22 }), [255, 255, 255], 0.38 * L.keyAmt)));
  r.addColorStop(0.42, css(shade(DOME_C, L, 0.56, { gloss: 0.17 })));
  r.addColorStop(0.77, css(shade(DOME_C, L, 0.04, { gloss: 0.21 })));
  r.addColorStop(1, css(shade([174, 179, 181], L, -0.8, { gloss: 0.15 })));
  g.fillStyle = r; g.fill(dome);
  g.save(); g.clip(dome);
  g.globalAlpha *= 0.45;
  scuffs(g, o, -3.8, -19.6, 7.6, 10.2, 28);
  g.globalAlpha /= 0.45;
  g.strokeStyle = css([29, 39, 49], 0.35); g.lineWidth = 0.16;
  g.beginPath(); g.moveTo(-3.7, -11.5); g.quadraticCurveTo(0, -10.58, 3.7, -11.5); g.stroke();
  g.fillStyle = vgrad(g, -10.5, -9.5, [[0, [19, 24, 29], 0], [1, [19, 24, 29], 0.61]]);
  g.fillRect(-4, -10.5, 8, 1);
  g.restore();
  // the yoke
  g.fillStyle = mat(GUNMETAL, L, 0); g.fillRect(-3.4, -9.6, 6.8, 2.8);
  g.fillStyle = mat([60, 64, 70], L, 0); g.fillRect(-3.8, -7.2, 7.6, 0.6);
  g.fillStyle = mat([132, 134, 138], L, 0.15); g.fillRect(-3.95, -7.34, 7.9, 0.18);
  for (const x of [-2.8, -1.4, 1.4, 2.8]) {
    g.fillStyle = mat([124, 123, 117], L, 0.33); g.fillRect(x, -8.8, 0.27, 0.22);
  }
  rim(g, o, (c) => { c.moveTo(o.lit * 0.85, -19.5); c.quadraticCurveTo(o.lit * 2.92, -19.2, o.lit * 3.52, -17.15); }, 0.14, 0.73);
}

export default {
  id: 'defence.ciws',
  family: 'defence',
  title: 'CIWS turret',
  about: 'A close-in weapon system: white radome, rotary cannon; fire (loop): flickering muzzle flash, a tracer stream along the barrel and spent-case sparks. o.aim: barrel elevation in radians (0.55).',
  w: 16, h: 20,
  states: ['idle', 'fire'],
  loop: 2,
  variants: 1,
  free: true,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, fire = o.state === 'fire', aim = o.aim !== undefined ? o.aim : 0.55;
      bake(ctx, 'defence.ciws', BOX, o, (g, s) => paint(g, s, o));
      // the gun: a barrel cluster from the yoke, jittering while it fires
      const jit = fire ? 0.05 * Math.sin(t * 97) : 0, len = 8.5;
      ctx.save(); ctx.translate(1.8, -8.2); ctx.rotate(-aim + jit);
      ctx.fillStyle = vgrad(ctx, -1.2, 1.2, [[0, shade([74, 78, 84], L, 0.7)], [1, shade([44, 48, 52], L, -0.8)]]);
      ctx.fillRect(-0.6, -1.2, 3.2, 2.4); // breech housing
      for (const [dy, f] of [[-0.42, 0.7], [0, 0.15], [0.42, -0.6]]) { // three of the six barrels, lit top to bottom
        ctx.fillStyle = mat([66, 70, 76], L, f, 0.3); ctx.fillRect(2.6, dy - 0.16, len - 2.6, 0.32);
      }
      ctx.fillStyle = mat([40, 42, 46], L, 0); ctx.fillRect(len * 0.62, -0.72, 0.45, 1.44); ctx.fillRect(len - 0.55, -0.68, 0.55, 1.36); // clamp, muzzle ring
      if (fire) {
        const k = 0.6 + 0.4 * Math.abs(Math.sin(t * 71));
        ctx.save(); ctx.translate(len - 0.1, 0); ctx.rotate(Math.PI);
        exhaust(ctx, 0, 0, 3.5 + 4.5 * k, 0.72 + 0.45 * k, FLAME.burner, k, { bloom: 0 });
        ctx.restore();
        glow(ctx, len, 0, 6, [255, 190, 100], 0.57 * k);
        glow(ctx, len + 0.6, 0, 2.2, [255, 250, 230], k);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) { // the tracer stream, each round on its own phase
          const u = (((t * 6 + i / 9) % 1) + 1) % 1, x = len + 0.85 + u * 70, sp = 0.4 * Math.sin(i * 12.9);
          ctx.strokeStyle = css([255, 200, 120], (1 - u * 0.7) * 0.9); ctx.lineWidth = 0.45;
          ctx.beginPath(); ctx.moveTo(x, sp * u * 3); ctx.lineTo(x + 3.2, sp * u * 3); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      if (fire) { // spent cases: sparks tumbling out of the mount
        const r = rng(19); ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) {
          const ph = r(), vx = (r() - 0.7) * 6, a = (t * 2.2 + ph) % 1, b = Math.max(0, a - 0.05);
          ctx.strokeStyle = css([255, 210, 140], 0.85 * (1 - a)); ctx.lineWidth = 0.16;
          ctx.beginPath(); ctx.moveTo(1 + vx * b, -8 + 10 * b * b - 3 * b); ctx.lineTo(1 + vx * a, -8 + 10 * a * a - 3 * a); ctx.stroke();
        }
        ctx.restore();
      }
      lamp(ctx, -1.08, -5.72, [255, 183, 103], o, 0.29, 0.64 * L.night);
      lamp(ctx, 0, -19.8, [255, 50, 40], o, 0.25, clamp(L.night * 1.5) * 0.8);
    } finally { ctx.restore(); }
  },
};
