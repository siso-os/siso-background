// A sport runabout: deep-V hull, a raked windscreen, one driver, an outboard on the transom. run: bow up and spray.
import { css, mix, shade, clamp, mat, up, litFill, rim, lamp, floatBody, waterline, bob, spray, seeded } from './_lib.js';
import { hullForm, skyGlass as glass, railing, rake } from './_hull.js';

const BOX = [-12.5, -7, 13, 2];
const HULL = new Path2D('M-10 -2.7 L-10 0.9 L1.5 1.35 C6.5 1.35 9.6 -0.5 11.8 -3.4 L11.1 -3.6 Q2 -2.9 -10 -2.9 Z');
const PAL = [ // topsides, stripe
  [[238, 240, 242], [180, 30, 36]], [[236, 238, 240], [24, 44, 98]], [[34, 36, 40], [200, 200, 204]], [[240, 238, 232], [16, 120, 140]],
];

function paint(g, s, o, v) {
  const L = o.L, [top, stripe] = PAL[v];
  litFill(g, HULL, o, top, { y0: -3.6, y1: 1.4, x0: -10, x1: 12, gloss: 0.3, bottomDrop: 0.4 });
  g.save(); g.clip(HULL);
  g.fillStyle = mat(stripe, L, 0, 0.25);
  g.beginPath(); g.moveTo(-10.5, -1.9); g.lineTo(12, -2.9); g.lineTo(12, -2.3); g.lineTo(-10.5, -1.4); g.fill();
  g.fillStyle = mat(mix(stripe, [10, 10, 14], 0.4), L, -0.2, 0.1); g.fillRect(-11, -0.35, 24, 2);
  g.restore();
  hullForm(g, HULL, o, { x0: -10, x1: 12, y0: -3.6, y1: 1.4, wl: 0, boot: 0.3, sheer: (c) => { c.moveTo(-10, -2.95); c.quadraticCurveTo(2, -2.95, 11.2, -3.65); } });
  rim(g, o, (c) => { c.moveTo(-10, -2.95); c.quadraticCurveTo(2, -2.95, 11.2, -3.65); }, 0.25);
  // outboard: cowling on the transom, leg into the water
  g.fillStyle = mat([22, 24, 28], L, 0, 0.35);
  g.beginPath(); g.moveTo(-10.1, -2.4); g.lineTo(-10.1, -4.6); g.quadraticCurveTo(-11.9, -4.8, -12.2, -3.4); g.lineTo(-11.8, -2.2); g.closePath(); g.fill();
  g.fillRect(-11.6, -2.4, 0.9, 3.4);
  rim(g, o, (c) => { c.moveTo(-10.2, -4.65); c.quadraticCurveTo(-11.8, -4.8, -12.15, -3.5); }, 0.2, 0.8);
  // console, windscreen and driver
  g.fillStyle = mat(mix(top, [120, 120, 124], 0.25), L, 0); g.fillRect(-1.2, -3.9, 2.8, 1.1);
  g.save(); g.beginPath(); g.moveTo(0.8, -2.9); g.lineTo(2.2, -4.9); g.lineTo(3.6, -4.9); g.lineTo(5, -3.1); g.closePath(); g.clip();
  glass(g, o, 0.6, -5, 4.6, 2.2); g.restore();
  railing(g, o, [[0.8, -2.9, 2.2, -4.9], [2.2, -4.9, 3.6, -4.9], [6, -3.2, 9.5, -3.45], [-9.5, -3.3, -7, -3.3]]);
  const skin = [196, 150, 118], shirt = seeded({ seed: v }, 5).pick([[30, 40, 60], [220, 220, 220], [150, 40, 40]]);
  // the driver, seated behind the screen: shoulders and back, a lit side, the head turned forward with dark hair
  g.fillStyle = mat(shirt, L, 0);
  g.beginPath(); g.moveTo(-1.35, -2.9); g.lineTo(-1.3, -4.25); g.quadraticCurveTo(-1.2, -4.75, -0.6, -4.8); g.lineTo(0.05, -4.75); g.quadraticCurveTo(0.45, -4.6, 0.4, -4.1); g.lineTo(0.5, -2.9); g.closePath(); g.fill();
  g.fillStyle = mat(shirt, L, 0.7 * (o.lit >= 0 ? 1 : -1), 0.2); g.fillRect(o.lit >= 0 ? 0.05 : -1.3, -4.6, 0.35, 1.7);
  g.fillStyle = mat(skin, L, -0.1); g.fillRect(-0.55, -5.05, 0.4, 0.35);
  g.fillStyle = mat(skin, L, 0.25); g.beginPath(); g.ellipse(-0.3, -5.45, 0.38, 0.46, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = mat([34, 26, 22], L, 0, 0.2); g.beginPath(); g.ellipse(-0.42, -5.62, 0.4, 0.32, -0.3, Math.PI * 0.95, Math.PI * 2.15); g.fill();
  g.fillStyle = mat(mix(top, [60, 60, 64], 0.5), L, 0); g.fillRect(-6.5, -3.6, 3, 0.8); // rear bench back
  rake(g, o, BOX);
}

const K = 20 / 25.5; // natural drawing units to the box

export default {
  id: 'sea.speedboat',
  family: 'sea',
  title: 'Speedboat',
  about: 'A sport runabout with an outboard and a driver; run (default): bow up and bow spray; idle: drifting.',
  w: 20, h: 5.5, // the drawing x K; the long side is 2^n or 5x2^n (REASONING, Calls I made)
  states: ['run', 'idle'],
  loop: 4,
  variants: PAL.length,
  ref: 'refs/options/option-a-golden.webp',
  draw(ctx, o) {
    ctx.save();
    try {
      ctx.scale(K, K);
      const L = o.L, run = o.state !== 'idle', v = ((o.seed || 0) % PAL.length + PAL.length) % PAL.length;
      const b = bob(o, run ? 0.5 : 1.2, v);
      const pitch = (run ? 0.07 + 0.015 * Math.sin((o.t || 0) * 4.2) : 0) + b.pitch;
      floatBody(ctx, o, { key: 'sea.speedboat:' + v, box: BOX, pivot: -7, paint: (g, s) => paint(g, s, o, v) }, { pitch, heave: b.heave });
      ctx.save(); ctx.translate(-7, b.heave); ctx.rotate(-pitch); ctx.translate(7, 0);
      const n = clamp(L.night * 1.6);
      lamp(ctx, 3.2, -5, [255, 250, 240], o, 0.2, 0.8 * n);
      lamp(ctx, 10.4, -3.6, [60, 255, 120], o, 0.2, 0.7 * n);
      ctx.restore();
      waterline(ctx, o, -10, run ? 6 : 11, { foam: run ? 0.9 : 0.4, speed: run ? 1 : 0, seed: v });
      if (run) spray(ctx, 8.2, -0.2, o, { n: 22, power: 0.6, seed: 11 + v });
    } finally { ctx.restore(); }
  },
};
