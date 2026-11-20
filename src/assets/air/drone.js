// Drones. seed 0: a long-wing surveillance drone (bulbous nose, sensor ball, V-tail, pusher prop).
// seed 1: an enemy delta loitering munition (a dark triangle, tip fins, a buzzing rear prop).
import { glow, clamp, mat, rim, lamp, bake, strobe, skin, canopy, rotor, hgrad } from './_lib.js';

const BOX = [-10, -6, 10, 0];
const UAV = {
  fus: new Path2D('M9.4 -3.75 Q9.3 -4.85 7.2 -4.95 Q3.6 -4.95 0.5 -4.45 L-7.2 -4.05 L-7.6 -3.65 L-7.2 -3.3 L0.5 -3.05 Q4.8 -2.8 7.6 -2.95 Q9.4 -3.05 9.4 -3.75 Z'),
  wing: new Path2D('M2.0 -3.55 L-0.3 -3.55 L-1.8 -0.67 L0.14 -0.67 Z'),
  farWing: new Path2D('M1.6 -4.4 L-0.4 -4.4 L-0.9 -5.4 L0.7 -5.4 Z'),
  vUp: new Path2D('M-5.2 -4.2 L-7.4 -5.9 L-8.2 -5.9 L-7.4 -4.0 Z'),
  vDown: new Path2D('M-5.4 -3.2 L-7.6 -1.3 L-8.3 -1.3 L-7.4 -3.4 Z'),
};
const SENSOR = new Path2D('M5.5 -2.76 A0.72 0.72 0 1 1 6.94 -2.76 A0.72 0.72 0 1 1 5.5 -2.76 Z');
const DELTA = {
  body: new Path2D('M8.4 -3.4 L-6.6 -5.2 L-7.4 -3.4 L-6.6 -1.6 Z'),
  top: new Path2D('M8.4 -3.4 L-6.6 -5.2 L-6.6 -3.6 Z'),
  fin: new Path2D('M-4.6 -4.9 L-6.8 -6.0 L-7.4 -6.0 L-6.8 -4.9 Z'),
};

function paintUAV(g, o) {
  const L = o.L, base = [196, 200, 204];
  g.fillStyle = mat(base, L, -0.7); g.fill(UAV.farWing);
  skin(g, UAV.fus, o, base, { y0: -4.95, y1: -2.8, x0: -7.6, x1: 9.4, gloss: 0.25 });
  skin(g, UAV.vUp, o, base, { y0: -5.9, y1: -4.0, x0: -8.2, x1: -5.2 });
  skin(g, UAV.vDown, o, base, { y0: -3.6, y1: -1.3, x0: -8.3, x1: -5.4 });
  skin(g, UAV.wing, o, [139, 150, 161], { y0: -3.8, y1: -0.67, x0: -1.8, x1: 2 });
  g.strokeStyle = mat([48, 59, 70], L, 0.05, 0, 0.4);
  g.lineWidth = 0.075;
  g.stroke(new Path2D('M0.14 -3.35 L-1.42 -0.74 M-1.04 -1.84 L0.78 -1.87'));
  g.fillStyle = hgrad(g, -7.4, 8.8, [[0, L.haze, 0], [0.74, [18, 28, 40], 0.43], [1, [18, 28, 40], 0]]);
  g.fill(new Path2D('M-7.4 -3.63 Q0.9 -3.27 3.7 -3.48 Q6.8 -3.67 9.17 -3.8 Q8.5 -2.99 7.6 -2.95 Q4.8 -2.8 0.5 -3.05 L-7.2 -3.3 Z'));
  g.strokeStyle = mat([60, 67, 75], L, 0.03, 0.06, 0.43); g.lineWidth = 0.07;
  g.stroke(new Path2D('M3.93 -4.75 Q3.58 -4.19 3.74 -3.45 L4.04 -2.94 M4.57 -4.48 H7.67 Q8.01 -4.43 8.01 -4.26 L7.94 -4.04 H4.55 Z M-5.85 -4.1 L-6.07 -3.3'));
  canopy(g, SENSOR, o, { x0: 5.5, x1: 6.94, y0: -3.48, y1: -2.04, tint: [69, 108, 118] });
  g.strokeStyle = mat([50, 58, 64], L, 0.25, 0.22); g.lineWidth = 0.12; g.stroke(SENSOR);
  rim(g, o, (c) => { c.moveTo(9.2, -4.3); c.quadraticCurveTo(8.8, -4.9, 7.2, -5.0); c.quadraticCurveTo(3.6, -5.0, 0.5, -4.5); c.lineTo(-7.2, -4.1); }, 0.16);
}
function paintDelta(g, o) {
  const L = o.L, base = [52, 54, 50];
  skin(g, DELTA.body, o, base, { y0: -5.2, y1: -1.6, x0: -7.4, x1: 8.4, gloss: 0.15 });
  skin(g, DELTA.top, o, [71, 73, 68], { y0: -5.2, y1: -3.4, x0: -6.6, x1: 8.4, gloss: 0.13 });
  g.fillStyle = mat(base, L, 0.2); g.fill(DELTA.fin);
  g.fillStyle = mat([30, 30, 30], L, 0); g.fillRect(-7.6, -3.9, 1.2, 1);
  rim(g, o, (c) => { c.moveTo(8.2, -3.45); c.lineTo(-6.6, -5.25); }, 0.18);
}

export default {
  id: 'air.drone',
  family: 'air',
  title: 'Drone',
  about: 'A drone: seed 0 a long-wing surveillance drone with a sensor ball and pusher prop; seed 1 an enemy delta loitering munition. Strobes at night.',
  w: 20, h: 6,
  states: ['idle'],
  loop: 1,
  variants: 2,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, v = (o.seed || 0) % 2 ? 1 : 0;
      bake(ctx, 'air.drone:' + v, BOX, o, (g) => (v ? paintDelta(g, o) : paintUAV(g, o)));
      ctx.save(); ctx.translate(-7.9, -3.5); ctx.rotate(-Math.PI / 2);
      rotor(ctx, o, 0, 0, v ? 1.4 : 1.9, 0.42, 47, 2);
      ctx.restore();
      const n = clamp(L.night * 1.5);
      lamp(ctx, v ? -6.2 : -0.91, v ? -1.72 : -0.73, v ? [255, 50, 40] : [60, 255, 120], o, 0.22, n * 0.8);
      if (!v) lamp(ctx, -7.6, -5.8, [255, 255, 255], o, 0.25, strobe(t, 1.6) * (0.3 + 0.7 * n));
      if (v && L.night > 0.2) glow(ctx, -7.6, -3.4, 2.5, [255, 140, 60], 0.3 * L.night); // engine heat
    } finally { ctx.restore(); }
  },
};
