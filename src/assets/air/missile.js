// A missile in flight: the body and its exhaust only, pointing right (the smoke trail is fx.trail).
// siso: white body, blue band, blue-white flame. enemy: dark body, red band, red-orange flame. idle: a plain one.
import { css, mix, shade, glow, vgrad, hgrad, mat, bake, exhaust, flicker, FLAME, pxScale, TAU } from './_lib.js';

const BOX = [-10, -5, 10, 0];
const KIND = {
  idle: { body: [214, 216, 218], band: [120, 124, 130], flame: FLAME.burner },
  siso: { body: [228, 232, 238], band: [40, 120, 255], flame: FLAME.siso },
  enemy: { body: [64, 66, 70], band: [200, 40, 30], flame: FLAME.enemy },
};
const Y = -2.5, R = 0.62, TAIL = -0.6, NOSE = 9.6;

function paint(g, s, o, k) {
  const L = o.L;
  const body = new Path2D(`M${TAIL} ${Y - R} L7.4 ${Y - R} Q9 ${Y - R * 0.8} ${NOSE} ${Y} Q9 ${Y + R * 0.8} 7.4 ${Y + R} L${TAIL} ${Y + R} Z`);
  g.fillStyle = mat(k.body, L, -0.6); // fins in shadow behind and in front
  g.beginPath(); g.moveTo(0.4, Y - R); g.lineTo(-0.6, Y - R - 1.3); g.lineTo(-1.1, Y - R - 1.3); g.lineTo(-0.6, Y - R); g.fill();
  g.fillStyle = vgrad(g, Y - R, Y + R, [[0, shade(k.body, L, 0.34, { gloss: 0.36 })],
    [0.2, shade(k.body, L, 0.86, { gloss: 0.2 })], [0.42, shade(k.body, L, 0.24)],
    [0.85, shade(k.body, L, -1)], [1, shade(k.body, L, -0.3, { gloss: 0.22 })]]);
  g.fill(body);
  g.save(); g.clip(body);
  g.fillStyle = vgrad(g, Y - R, Y + R, [[0, shade(k.band, L, 0.67)], [0.38, shade(k.band, L, 0.2)], [1, shade(k.band, L, -0.7)]]);
  g.fillRect(5.6, Y - R, 0.54, R * 2);
  g.fillRect(1.23, Y - R, 0.27, R * 2);
  g.fillStyle = hgrad(g, 6.7, NOSE, [[0, [6, 9, 14], 0.46], [1, [6, 9, 14], 0.73]]);
  g.fillRect(6.7, Y - R, NOSE - 6.7, R * 2);
  g.restore();
  g.fillStyle = mat(k.body, L, -0.2);
  g.beginPath(); g.moveTo(0.6, Y + R); g.lineTo(-0.5, Y + R + 1.4); g.lineTo(-1.1, Y + R + 1.4); g.lineTo(-0.6, Y + R); g.fill();
  g.fillStyle = mat([30, 30, 32], L, 0); g.fillRect(TAIL - 0.25, Y - R * 0.7, 0.3, R * 1.4);
}

export default {
  id: 'air.missile',
  family: 'air',
  title: 'Missile',
  about: 'A missile body and its exhaust, pointing right; siso blue-white, enemy red-orange, idle neutral. Nozzle at (-0.6, -2.5); the caller rotates it and draws fx.trail behind.',
  w: 20, h: 5,
  states: ['idle', 'siso', 'enemy'],
  loop: 1,
  variants: 1,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    try {
      const k = KIND[o.state] || KIND.idle, t = o.t || 0, f = flicker(t, (o.seed || 0) * 7 + 1, 37);
      const scale = o.scale ?? pxScale(ctx);
      if (scale < 0.5) {
        const motor = TAIL - 0.28, radius = 0.55 / Math.max(scale, 0.15);
        const len = 7.5 + 2 * f;
        ctx.fillStyle = hgrad(ctx, motor, motor - len, [[0, k.flame.core, 1], [0.34, k.flame.core, 0.73], [0.7, k.flame.mid, 0.42], [1, k.flame.edge, 0]]);
        ctx.beginPath(); ctx.moveTo(motor, Y - radius * 0.86);
        ctx.quadraticCurveTo(motor - len * 0.47, Y - radius * 0.66, motor - len, Y);
        ctx.quadraticCurveTo(motor - len * 0.47, Y + radius * 0.66, motor, Y + radius * 0.86);
        ctx.fill();
        glow(ctx, motor, Y, radius * 2.4, k.flame.mid, 0.54);
        ctx.fillStyle = css(k.flame.core);
        ctx.beginPath(); ctx.arc(motor, Y, radius, 0, TAU); ctx.fill();
        return;
      }
      exhaust(ctx, TAIL, Y, 7.7 * f, 0.26, k.flame, 0.91, { night: o.L.night, bloom: 1.3 });
      bake(ctx, 'air.missile:' + (o.state || 'idle'), BOX, o, (g, s) => paint(g, s, o, k));
      glow(ctx, TAIL - 0.35, Y, 0.95 + 0.65 * o.L.night, k.flame.mid, 0.50);
      ctx.fillStyle = css(mix(k.flame.core, [255, 255, 255], 0.67));
      ctx.beginPath(); ctx.ellipse(TAIL - 0.28, Y, 0.42, 0.24, 0, 0, TAU); ctx.fill();
    } finally { ctx.restore(); }
  },
};
