// The smuggler: a black go-fast boat, long, low and sharp, a smoked canopy, two big outboards. flee: bow up, spray.
import { css, mix, shade, glow, clamp, mat, up, litFill, rim, lamp, floatBody, waterline, bob, glass, spray, vgrad } from './_lib.js';

const BOX = [-16, -7, 16, 2];
const HULL = new Path2D('M-13 -3.3 L-13 1.1 L3 1.5 C9 1.5 13 -0.4 15.6 -2.6 L15.2 -2.95 Q4 -3.6 -13 -3.5 Z');
const DECK = new Path2D('M-11.5 -3.45 Q2 -3.9 15 -2.95 Q4 -4.1 -6 -4.2 L-11.5 -4.0 Z');
const CANOPY = new Path2D('M-6.2 -4.05 L-4.4 -5.9 L1.4 -6.0 L5.6 -3.7 Z');

function paint(g, s, o, v) {
  const L = o.L;
  const base = v ? [20, 24, 21] : [13, 14, 17];
  litFill(g, HULL, o, base, { y0: -4.2, y1: 1.6, x0: -13, x1: 16, gloss: 0.3, topLift: 0.25, bottomDrop: 0.55, side: 0.3 });
  g.save(); g.clip(HULL);
  // the sheen of black gelcoat: a long soft sky reflection along the flank, and the strake line under it
  g.fillStyle = vgrad(g, -3.1, -1.3, [[0, shade([160, 170, 180], L, 0.4, { gloss: 0.8 }), 0], [0.5, shade([160, 170, 180], L, 0.4, { gloss: 0.8 }), 0.2], [1, [0, 0, 0], 0]]);
  g.fillRect(-13, -3.1, 28, 1.8);
  g.strokeStyle = css(shade([200, 206, 212], L, 0.5, { gloss: 0.6 }), 0.35); g.lineWidth = 0.15;
  g.beginPath(); g.moveTo(-13, -0.6); g.quadraticCurveTo(4, -0.9, 13.5, -1.6); g.stroke();
  g.restore();
  g.fillStyle = mat(mix(base, [60, 62, 66], 0.3), L, up(L), 0.4); g.fill(DECK);
  rim(g, o, (c) => { c.moveTo(-12, -3.55); c.quadraticCurveTo(4, -3.75, 15.3, -3.0); }, 0.25, 1.2);
  // canopy: smoked glass under a black frame
  g.save(); g.clip(CANOPY); glass(g, o, -6.5, -6.1, 12.3, 2.5, { tint: [10, 14, 20] }); g.restore();
  g.strokeStyle = mat([18, 18, 20], L, 0); g.lineWidth = 0.22; g.stroke(CANOPY);
  rim(g, o, (c) => { c.moveTo(-4.4, -5.95); c.lineTo(1.4, -6.05); c.lineTo(5.6, -3.75); }, 0.2, 0.9);
  // twin outboards
  for (const dx of [0, 1.1]) {
    g.fillStyle = mat([16, 16, 18], L, 0, 0.45);
    g.beginPath(); g.moveTo(-13 - dx, -3); g.lineTo(-13 - dx, -6.1); g.quadraticCurveTo(-15.3 - dx, -6.3, -15.6 - dx, -4.5); g.lineTo(-15.1 - dx, -2.8); g.closePath(); g.fill();
    g.fillRect(-14.9 - dx, -3, 1.0, 3.8);
  }
  rim(g, o, (c) => { c.moveTo(-14.2, -6.15); c.quadraticCurveTo(-16.4, -6.35, -16.7, -4.6); }, 0.2, 0.8);
}

const K = 32 / 32; // natural drawing units to the box

export default {
  id: 'sea.smuggler',
  family: 'sea',
  title: 'Smuggler',
  about: 'A black go-fast boat, long and low with twin outboards and no lights; flee: bow up, spray, running dark.',
  w: 32, h: 7.0, // the drawing x K; the long side is 2^n or 5x2^n (REASONING, Calls I made)
  states: ['idle', 'flee'],
  loop: 4,
  variants: 2,
  ref: 'art/isles/cutouts/boat-smuggler-day.webp',
  draw(ctx, o) {
    ctx.save();
    try {
      ctx.scale(K, K);
      const L = o.L, flee = o.state === 'flee', v = (o.seed || 0) % 2 ? 1 : 0;
      const b = bob(o, flee ? 0.5 : 1, 2 + v);
      const pitch = (flee ? 0.085 + 0.02 * Math.sin((o.t || 0) * 5.1) : 0) + b.pitch;
      floatBody(ctx, o, { key: 'sea.smuggler:' + v, box: BOX, pivot: -9, paint: (g, s) => paint(g, s, o, v) }, { pitch, heave: b.heave });
      // only the dim glow of the dash through the canopy at night
      ctx.save(); ctx.translate(-9, b.heave); ctx.rotate(-pitch); ctx.translate(9, 0);
      if (L.night > 0.2) glow(ctx, 0, -4.6, 2.2, [90, 200, 255], 0.25 * L.night);
      ctx.restore();
      waterline(ctx, o, -13, flee ? 6 : 15, { foam: flee ? 1 : 0.4, speed: flee ? 1.2 : 0, seed: 7 });
      if (flee) spray(ctx, 9.5, -0.2, o, { n: 30, power: 0.9, seed: 21 });
    } finally { ctx.restore(); }
  },
};
