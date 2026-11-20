// A twin-engine airliner seen a touch from below: white fuselage, grey belly, a coloured tail, the near wing and engine
// under it. Nav lights: green on the near wingtip, red on the far one, white strobes and a red beacon that blink.
import { css, mix, shade, glow, clamp, mat, rim, lamp, bake, strobe, beacon, skin, canopy, TAU, vgrad, rng } from './_lib.js';

const BOX = [-40, -22, 40, 0];
const FUS = new Path2D('M39.6 -9.75 C39.9 -10.93 37.64 -11.5 36.2 -13.33 Q34.34 -15.74 29.9 -15.77 L-19.8 -15.63 Q-29.5 -15.62 -39 -15.58 L-39.4 -14.6 C-34.9 -13.65 -28.7 -9.7 -23.3 -8.51 Q-21 -7.85 -17.8 -7.57 Q2 -6.32 31.5 -7.12 Q38.6 -7.31 39.6 -9.75 Z');
const COCKPIT = new Path2D('M36.5 -12.93 L34.35 -14.3 L33.28 -14.25 L33.64 -13.3 L36.88 -12.64 Z');
const FIN = new Path2D('M-24.8 -14.01 Q-28.1 -15.39 -34.32 -21.6 L-38.45 -21.6 L-38.6 -15.4 Z');
const STAB_FAR = new Path2D('M-31 -14.4 L-37.6 -16.9 L-39.4 -16.9 L-38.4 -14.8 Z');
const STAB = new Path2D('M-30.5 -13.2 L-37.8 -10.9 L-39.6 -10.9 L-37.4 -13.6 Z');
const WING_FAR = new Path2D('M6 -13.11 L-6.6 -13.21 L-20.09 -18.3 L-17.03 -18.41 Z');
const WING = new Path2D('M10.5 -8.36 L-6.4 -8.36 L-23.3 -1.46 L-22.88 -0.64 L-19.51 -0.76 Z');
const NAC = new Path2D('M6.6 -6.4 Q6.6 -8.2 4.6 -8.2 L-3.4 -8.2 Q-5.2 -7.4 -5.2 -6.4 Q-5.2 -5.4 -3.4 -4.6 L4.6 -4.6 Q6.6 -4.6 6.6 -6.4 Z');
const TAILS = [[24, 44, 96], [150, 30, 40], [20, 110, 100], [40, 40, 44]];

function engine(g, o) {
  const L = o.L;
  skin(g, NAC, o, [223, 226, 228], { y0: -8.2, y1: -4.6, x0: -5.2, x1: 6.6, gloss: 0.28 });
  const lip = vgrad(g, -8.35, -4.4, [[0, shade([215, 218, 220], L, 0.9)],
    [0.42, shade([160, 164, 170], L, 0.12)], [1, shade([212, 215, 218], L, 0.58, { gloss: 0.32 })]]);
  for (const [x, y, rx, ry, fill] of [[6.08, -6.4, 0.99, 1.82, lip],
    [6.21, -6.4, 0.71, 1.48, '#171e28'], [6.08, -6.4, 0.33, 0.57, '#485263']]) {
    g.fillStyle = fill;
    g.beginPath(); g.ellipse(x, y, rx, ry, -0.12, 0, TAU); g.fill();
  }
}

function paint(g, s, o, v) {
  const L = o.L, white = [236, 238, 240], tc = TAILS[v];
  skin(g, WING_FAR, o, [175, 183, 194], { y0: -18.41, y1: -13, x0: -20.09, x1: 6 });
  g.fillStyle = mat(white, L, -0.7); g.fill(STAB_FAR);
  g.save(); g.translate(12.1, -0.35); g.scale(0.85, 1.1); engine(g, o); g.restore();
  skin(g, FUS, o, white, { y0: -15.77, y1: -6.75, x0: -39, x1: 40, gloss: 0.3 });
  g.save(); g.clip(FUS);
  g.fillStyle = vgrad(g, -11.2, -7.6, [[0, [23, 30, 44], 0], [0.62, [23, 30, 44], 0.17], [1, [23, 30, 44], 0.38]]);
  g.fillRect(-40, -11.2, 80, 4.5);
  g.fillStyle = mat(tc, L, 0, 0.2, 0.64);
  g.fill(new Path2D('M-38 -14.8 Q-30 -11.9 -23 -10.5 L34 -10.34 Q36 -10.32 37.4 -10.65 L36 -10.22 L-23 -10.23 Q-33 -12.02 -38 -14.4 Z'));
  // cabin windows: sky by day, warm at night
  const lit = clamp((L.windows - 0.13) * 1.3);
  const rand = rng(v + 19);
  for (let x = -23; x < 31; x += 1.15) {
    if (x > 6 && x < 8) continue; // the door
    const litWindow = rand() > 0.16 ? lit : lit * 0.14;
    g.fillStyle = css(mix(shade([34, 40, 50], L, 0, { gloss: 0.32 }), [255, 218, 167], litWindow));
    g.beginPath(); g.roundRect(x, -13.41, 0.49, 0.69, 0.15); g.fill();
  }
  g.strokeStyle = css([12, 21, 28], 0.36); g.lineWidth = 0.11;
  for (const x of [-25.5, 6.5, 31.4]) {
    g.beginPath(); g.roundRect(x, -14.02, 1.18, 3.03, 0.29); g.stroke();
  }
  g.restore();
  canopy(g, COCKPIT, o, { x0: 33.28, x1: 36.88, y0: -14.3, y1: -12.64, amt: 0.2 });
  skin(g, FIN, o, tc, { y0: -21.6, y1: -13.3, x0: -39, x1: -27, gloss: 0.25 });
  g.save(); g.clip(FIN); g.fillStyle = mat([220, 180, 80], L, 0.3, 0.2);
  g.beginPath(); g.moveTo(-31, -13); g.lineTo(-36.4, -19.6); g.lineTo(-35.2, -19.6); g.lineTo(-29.6, -13); g.fill(); g.restore();
  skin(g, STAB, o, white, { y0: -13.6, y1: -10.9, x0: -40, x1: -30, gloss: 0.2 });
  skin(g, new Path2D('M11.3 -9.04 Q8.3 -9.72 2.3 -9.41 L-7.5 -9.2 Q-11.2 -8.76 -13.1 -7.86 Q-6.4 -7.15 1.9 -7.55 Q7.9 -7.64 11.3 -9.04 Z'),
    o, [195, 202, 211], { y0: -10.3, y1: -7.26, x0: -13.1, x1: 11.3 });
  skin(g, WING, o, [169, 179, 189], { y0: -8.65, y1: -0.64, x0: -23.3, x1: 10.5, gloss: 0.24 });
  g.strokeStyle = mat([42, 55, 71], L, 0, 0, 0.32);
  g.lineWidth = 0.12;
  g.stroke(new Path2D('M-21.8 -1.26 L-9.8 -5.11 L-2 -7.24 M-10.2 -5.15 L-9.9 -4.33'));
  g.fillStyle = mat([68, 73, 80], L, -0.2, 0.12);
  g.fill(new Path2D('M-4.4 -7.78 L5.5 -8.55 L4.5 -6.7 L-4.6 -6.3 Z'));
  g.save(); g.translate(-0.65, 1.9); g.scale(1.19, 1.30); engine(g, o); g.restore();
  rim(g, o, (c) => { c.moveTo(36.2, -13.33); c.quadraticCurveTo(34.34, -15.74, 29.9, -15.77); c.lineTo(-19.8, -15.63); c.quadraticCurveTo(-29.5, -15.62, -39, -15.58); }, 0.17);
}

export default {
  id: 'air.airliner',
  family: 'air',
  title: 'Airliner',
  about: 'A twin-engine airliner, white with a coloured tail; nav lights green and red, white strobes and a red beacon blink; cabin windows glow at night.',
  w: 80, h: 22,
  states: ['idle'],
  loop: 2.6,
  variants: TAILS.length,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, v = ((o.seed || 0) % TAILS.length + TAILS.length) % TAILS.length;
      bake(ctx, 'air.airliner:' + v, BOX, o, (g, s) => paint(g, s, o, v));
      const n = 0.35 + 0.65 * clamp(L.night * 1.5);
      lamp(ctx, -22.9, -1.26, [60, 255, 120], o, 0.4, 0.9 * n);
      lamp(ctx, -19.35, -18.38, [255, 50, 40], o, 0.35, 0.7 * n);
      lamp(ctx, -22.1, -0.8, [255, 255, 255], o, 0.55, strobe(t, 1.3));
      lamp(ctx, -38.4, -15.2, [255, 255, 255], o, 0.5, strobe(t, 1.3, 0.12));
      lamp(ctx, 0, -15.64, [255, 40, 30], o, 0.4, beacon(t, 1.1));
      lamp(ctx, 2, -7.7, [255, 40, 30], o, 0.4, beacon(t, 1.1, 0.55));
      if (L.night > 0.3) glow(ctx, 0, -10.8, 22, [255, 210, 150], 0.05 * L.night); // the cabin's warm line
    } finally { ctx.restore(); }
  },
};
