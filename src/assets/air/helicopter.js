// A helicopter in forward flight, nose a little down: a glass-nosed cabin, a tapering tail boom, skids, the main rotor as
// a thin blurred disc with the ghost of its blades, the tail rotor a spinning blur. At night a searchlight cone sweeps
// the water below (o.beam overrides its angle in radians below the horizon). seed 0 police (navy and white), 1 military.
import { css, mix, clamp, mat, rim, lamp, bake, strobe, beacon, skin, canopy, rotor } from './_lib.js';

const BOX = [-16, -12, 16, 0];
const BODY = new Path2D('M9.4 -4.6 Q9.6 -7.6 6.2 -8.6 Q2 -9.4 -2.6 -8.4 L-5 -7.4 L-14.2 -6.6 L-14.4 -5.6 L-5 -4.4 Q-3 -2.6 2 -2.4 Q7.6 -2.4 9.4 -4.6 Z');
const GLASS = new Path2D('M9.2 -5.0 Q9.4 -7.4 6.6 -8.3 L4.2 -8.5 L4.4 -5.0 Z');
const SIDE = new Path2D('M-1.15 -7 Q-1.1 -7.95 0 -8.03 L3.7 -8.1 L3.85 -5.25 L-0.8 -5.43 Q-1.15 -5.46 -1.15 -5.81 Z');
const FIN = new Path2D('M-12.2 -6.6 L-14.6 -9.6 L-15.4 -9.6 L-14.8 -6.0 Z');
const ENG = new Path2D('M3 -8.6 Q1.6 -10.2 -3.4 -9.9 L-5 -7.6 L-2.6 -8.4 Q1 -9.2 3 -8.6 Z');
const COLS = [{ a: [232, 234, 236], b: [24, 44, 110] }, { a: [92, 98, 84], b: [70, 76, 64] }];

function paint(g, s, o, v) {
  const L = o.L, C = COLS[v];
  skin(g, BODY, o, C.a, { y0: -9.4, y1: -2.4, x0: -14.4, x1: 9.6, gloss: 0.3 });
  g.save(); g.clip(BODY);
  skin(g, new Path2D('M-15 -5.45 Q-3 -5.05 1 -4.42 Q6 -3.55 10 -4.25 L10 -2 L-15 -3.99 Z'),
    o, C.b, { y0: -5.45, y1: -2.4, x0: -15, x1: 10, gloss: 0.15 });
  g.strokeStyle = css([10, 16, 23], 0.44); g.lineWidth = 0.1;
  g.stroke(new Path2D('M-1.65 -7.77 Q-1.65 -8.21 -.75 -8.26 L3.8 -8.29 L4.1 -3.32 L-1.28 -3.69 Z M-0.9 -5.04 h1.05'));
  g.fillStyle = mat([67, 72, 77], L, -0.1); g.fillRect(-4.22, -7.16, 1.25, 0.20);
  g.restore();
  skin(g, ENG, o, C.a, { y0: -10.2, y1: -7.6, x0: -5, x1: 3 });
  canopy(g, GLASS, o, { x0: 4.2, x1: 9.2, y0: -8.5, y1: -5, tint: [74, 122, 146], amt: 0.22 });
  canopy(g, SIDE, o, { x0: -1.15, x1: 3.85, y0: -8.1, y1: -5.25, tint: [74, 122, 146], amt: 0.22 });
  g.fillStyle = mat([13, 19, 26], L, -0.45, 0.08, 0.82);
  g.fill(new Path2D('M4.58 -5.01 L4.7 -6.57 Q5.34 -6.92 5.74 -6.37 L6.22 -5.01 Z M7.27 -5.03 L7.53 -5.87 L8.94 -5.65 L9.11 -5.03 Z'));
  g.strokeStyle = mat([36, 46, 56], L, 0.04, 0.14); g.lineWidth = 0.13;
  g.stroke(GLASS); g.stroke(SIDE);
  g.stroke(new Path2D('M6.25 -8.32 Q7.44 -7.24 7.59 -5.02'));
  skin(g, FIN, o, C.b, { y0: -9.6, y1: -6, x0: -15.4, x1: -12.2 });
  g.strokeStyle = mat([40, 42, 46], L, 0); g.lineWidth = 0.32; // skids
  g.beginPath(); g.moveTo(-3.8, -0.6); g.lineTo(6.6, -0.6); g.quadraticCurveTo(8, -0.7, 8.4, -1.4);
  g.moveTo(-1.6, -0.6); g.lineTo(-1.2, -2.6); g.moveTo(4.4, -0.6); g.lineTo(4.2, -2.5); g.stroke();
  g.fillStyle = mat([40, 42, 46], L, 0); g.fillRect(-0.5, -11, 1, 1.3); // rotor mast
  rim(g, o, (c) => { c.moveTo(9.3, -5.6); c.quadraticCurveTo(9.2, -7.6, 6.2, -8.65); c.moveTo(3, -8.65); c.quadraticCurveTo(1.6, -10.25, -3.4, -9.95); c.moveTo(-5, -7.45); c.lineTo(-14.2, -6.65); }, 0.2);
}
export default {
  id: 'air.helicopter',
  family: 'air',
  title: 'Helicopter',
  about: 'A helicopter in forward flight with a blurred rotor; at night a searchlight cone sweeps below (o.beam: angle below the horizon in radians). seed 0 police, 1 military.',
  w: 32, h: 12,
  states: ['idle'],
  loop: 4,
  variants: 2,
  free: true, // the searchlight cone reaches the water
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, v = (o.seed || 0) % 2 ? 1 : 0;
      // searchlight first, so the body sits in front of its source
      const night = clamp((L.night - 0.25) * 1.6);
      if (night > 0) {
        const ang = o.beam !== undefined ? o.beam : 1.05 + 0.25 * Math.sin(t * 0.5), len = 150;
        ctx.save(); ctx.translate(7.4, -2.21); ctx.rotate(ang);
        ctx.globalCompositeOperation = 'lighter';
        const light = [222, 236, 255];
        for (const [width, a] of [[0.19, 0.055], [0.15, 0.075], [0.11, 0.11], [0.065, 0.12]]) {
          const falloff = ctx.createLinearGradient(0, 0, len, 0);
          falloff.addColorStop(0, css(light, a * night));
          falloff.addColorStop(0.35, css(light, a * night * 0.47));
          falloff.addColorStop(1, css(light, 0));
          ctx.fillStyle = falloff;
          ctx.beginPath(); ctx.moveTo(0, -0.24); ctx.lineTo(len, -len * width); ctx.lineTo(len, len * width); ctx.lineTo(0, 0.24); ctx.fill();
        }
        ctx.restore();
      }
      ctx.save(); ctx.rotate(0.08); // nose down in forward flight
      bake(ctx, 'air.helicopter:' + v, BOX, o, (g, s) => paint(g, s, o, v));
      rotor(ctx, o, 0, -11.1, 15.5, 0.9, 31, 4);
      ctx.save(); ctx.translate(-14.6, -7.6); ctx.rotate(-Math.PI * 0.48);
      rotor(ctx, o, 0, 0, 2.04, 0.45, 53, 2);
      ctx.restore();
      const n = clamp(L.night * 1.5);
      lamp(ctx, -2, -9.9, [255, 40, 30], o, 0.35, beacon(t, 1.2) * (0.4 + 0.6 * n));
      lamp(ctx, -14.8, -9.6, [255, 255, 255], o, 0.3, strobe(t, 1.5, 0.4) * n);
      lamp(ctx, 3.4, -3.4, [60, 255, 120], o, 0.25, 0.8 * n);
      if (night > 0) lamp(ctx, 7.2, -2.8, [235, 242, 255], o, 0.5, night);
      if (v === 0 && n > 0.1) { // police: blue flasher on the belly
        const k = ((t * 2) % 1) < 0.3 ? 1 : 0.1; lamp(ctx, 0.5, -2.3, [40, 120, 255], o, 0.35, k * n);
      }
      ctx.restore();
    } finally { ctx.restore(); }
  },
};
