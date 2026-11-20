// A rooftop surface-to-air launcher: a plinth, a turntable and a four-cell canister box raised toward the sky.
// fire (once, 1.6 s): a flash at the front cell, the missile leaves along the tube, backblast smoke rolls off the rear.
import { css, mix, shade, glow, clamp, smooth, mat, rim, lamp, bake, vgrad, GUNMETAL, CONCRETE, block, dart, billow, rng, contact, armour, OLIVE, scuffs } from './_lib.js';

const BOX = [-16, -22, 16, 0.55];
const PIV = [-3, -7.2], EL = 0.72, LEN = 21, HT = 5.4; // pivot, elevation (rad), canister box length and height

function paint(g, s, o) {
  const L = o.L;
  contact(g, 0, -0.8, 32, 1.35);
  block(g, o, -14, -3.4, 14, 0, CONCRETE, { topH: 0.5 });
  block(g, o, -8, -6, 4, -3.4, GUNMETAL, { topH: 0.4, slope: 1.2 });
  g.fillStyle = mat([40, 44, 48], L, 0); g.fillRect(-6, -7.2, 6, 1.2); // turntable
  scuffs(g, o, -14, -3, 28, 2.8, 13);
  contact(g, -2, -4, 19, 1.2);
  g.fillStyle = mat([55, 59, 63], L, -0.19);
  g.fillRect(-7.4, -5.12, 8.6, 0.6);
  for (const x of [-6.9, -2.2, 1.7]) {
    g.fillStyle = mat([40, 43, 42], L, -0.3); g.fillRect(x - 0.47, -3.8, 0.94, 0.65);
    g.fillStyle = mat([153, 146, 125], L, 0.35); g.fillRect(x - 0.16, -3.77, 0.32, 0.19);
  }
  g.strokeStyle = mat([39, 36, 31], L, -0.3); g.lineWidth = 0.31;
  g.beginPath(); g.moveTo(-7, -5); g.bezierCurveTo(-14, -4.2, -13, -8.3, -5, -8.6); g.stroke();
  // the lift arm
  { // the lift ram: a fat cylinder and a bright chromed rod
    const ax = 2, ay = -5.8, bx = PIV[0] + Math.cos(EL) * 9, by = PIV[1] - Math.sin(EL) * 9 + 1.2, mx = ax + (bx - ax) * 0.55, my = ay + (by - ay) * 0.55;
    g.lineCap = 'butt';
    g.strokeStyle = mat([54, 58, 62], L, 0.2); g.lineWidth = 1.1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(mx, my); g.stroke();
    g.strokeStyle = mat([190, 194, 198], L, 0.4, 0.6); g.lineWidth = 0.45; g.beginPath(); g.moveTo(mx, my); g.lineTo(bx, by); g.stroke();
  }
  g.save(); g.translate(PIV[0], PIV[1]); g.rotate(-EL);
  const front = LEN - 4;
  const box = new Path2D(`M-4 -1 L-4 ${-HT + 0.75} L-3.25 ${-HT - 0.55} L${front - 0.65} ${-HT - 0.55} L${front + 0.35} ${-HT + 0.3} L${front + 0.2} -0.7 L${front - 0.7} 0 L-3.3 0 Z`);
  armour(g, o, box, -4, -HT - 0.55, LEN + 0.4, HT + 0.55, 59, OLIVE);
  g.fillStyle = mat([65, 69, 60], L, 0.1);
  g.fillRect(-3.45, -1.08, LEN - 0.8, 0.55);
  for (let x = -2.7; x < front - 1.5; x += 4.8) {
    g.strokeStyle = css([18, 21, 15], 0.67); g.lineWidth = 0.12;
    g.strokeRect(x, -HT + 0.4, 4.1, HT - 1.65);
    g.fillStyle = mat([145, 144, 118], L, 0.35); g.fillRect(x + 0.12, -HT + 0.54, 3.8, 0.09);
    g.fillStyle = mat([50, 54, 43], L, 0.05); g.fillRect(x + 0.46, -2, 1.0, 0.27);
    g.fillRect(x + 3.62, -HT + 0.77, 0.19, 0.19);
  }
  g.fillStyle = mat([57, 61, 51], L, o.lit > 0 ? 0.7 : -0.6);
  g.fillRect(front - 0.73, -HT + 0.13, 0.86, HT - 0.86);
  g.fillStyle = css([16, 18, 16], 0.64);
  for (const y of [-4.4, -2.7, -1.45]) g.fillRect(front - 0.57, y, 0.64, 0.52);
  g.restore();
  rim(g, o, (c) => { c.moveTo(-14, -3.45); c.lineTo(14, -3.45); const a = Math.cos(EL), b = Math.sin(EL); const x = PIV[0] - 4 * a + HT * b, y = PIV[1] + 4 * b - HT * a; c.moveTo(x, y); c.lineTo(x + LEN * a, y - LEN * b); }, 0.16, 0.7);
}

export default {
  id: 'defence.sam-launcher',
  family: 'defence',
  title: 'SAM launcher',
  about: 'A rooftop surface-to-air launcher with a four-cell canister box; fire (once 1.6 s): front-cell flash, the missile leaves along the tube, backblast smoke (o.kind siso|enemy for its flame).',
  w: 32, h: 20,
  states: ['idle', 'fire'],
  loop: 4,
  once: { fire: 1.6 },
  variants: 1,
  free: true,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, fire = o.state === 'fire', p = fire ? clamp(o.p || 0) : 0;
      bake(ctx, 'defence.sam-launcher', BOX, o, (g, s) => paint(g, s, o));
      const a = Math.cos(EL), b = Math.sin(EL);
      const mouth = [PIV[0] + (LEN - 4) * a + HT * 0.75 * b, PIV[1] - (LEN - 4) * b - HT * 0.75 * a];
      const rear = [PIV[0] - 4 * a + HT * 0.75 * b, PIV[1] + 4 * b - HT * 0.75 * a];
      if (fire) {
        const smoke = shade([200, 196, 188], L, 0.4), r = rng(55);
        for (let i = 0; i < 13; i++) { // backblast: a jet of hot gas off the rear that hits the roof and rolls along it
          const sp = 0.5 + r(), along = r(), k = smooth(0, 0.6, p * (0.6 + 0.6 * sp));
          if (k <= 0) continue;
          const x = rear[0] - (3 + 18 * along) * k, y = Math.min(-3.6 - 1.5 * r(), rear[1] + 1.5 + 9 * along * k) - 2.5 * k * r();
          const hotK = 0.7 * (1 - smooth(0, 0.25, p)) * (1 - along);
          billow(ctx, o, x, y, 1.9 + 5.8 * k * (0.5 + along), mix(smoke, [255, 170, 90], hotK), 0.59 * (1 - smooth(0.55, 1, p)), i + p * 5);
        }
        const fl = 1 - smooth(0, 0.18, p);
        glow(ctx, mouth[0], mouth[1], 22, [255, 190, 110], 0.8 * fl);
        glow(ctx, rear[0], rear[1], 14, [255, 170, 90], 0.6 * fl);
        const d = 70 * p ** 1.6; // the missile, out along the tube
        ctx.save(); ctx.translate(mouth[0] - 6 * a + d * a, mouth[1] + 6 * b - d * b); ctx.rotate(-EL);
        dart(ctx, o, 7, o.kind || 'siso', smooth(0, 0.06, p)); ctx.restore();
      }
      lamp(ctx, 2.25, -4.0, [255, 181, 93], o, 0.44, 0.75 * L.night);
      lamp(ctx, -12.6, -3.8, [255, 50, 40], o, 0.25, clamp(L.night * 1.5) * (0.6 + 0.4 * Math.sin(t * 2)));
    } finally { ctx.restore(); }
  },
};
