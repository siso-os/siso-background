// A harbour ferry: blue hull, two passenger decks, a wheelhouse and funnel on top; the decks glow warm after dark.
import { css, mix, shade, glow, clamp, mat, up, endFacing, litFill, rim, lamp, floatBody, waterline, bob, vgrad } from './_lib.js';
import { hullForm, skyGlass as glass, ledge, railing, clutter, rake } from './_hull.js';

const BOX = [-44, -31, 45, 4];
const HULL = new Path2D('M-42 -7 L-42 2.6 L29 3.6 C37 3.6 41 -2 43.6 -9.2 L42.6 -9.6 Q10 -7.3 -42 -7.3 Z');
const D1 = new Path2D('M-40.5 -7.3 L-40.5 -14.6 L28.5 -14.6 L32.5 -10.2 L32.5 -7.6 Z');
const D2 = new Path2D('M-37.5 -14.6 L-37.5 -21.6 L22 -21.6 L25.5 -17.2 L25.5 -14.6 Z');
const WH = new Path2D('M8 -21.6 L8 -26.2 L21.5 -26.2 L24.5 -22.6 L24.5 -21.6 Z');
const HULLS = [[22, 52, 128], [18, 92, 80], [150, 34, 32]];

function paint(g, s, o, v) {
  const L = o.L, hc = HULLS[v];
  litFill(g, HULL, o, hc, { y0: -9.6, y1: 3.6, x0: -42, x1: 44, gloss: 0.2, bottomDrop: 0.4 });
  g.save(); g.clip(HULL);
  g.fillStyle = mat([236, 238, 240], L, 0, 0.15); g.fillRect(-43, -7.6, 88, 1.1); // white sheer strake
  g.fillStyle = mat([200, 60, 50], L, -0.3); g.fillRect(-43, 0.2, 88, 4); // boot top under the water
  g.restore();
  hullForm(g, HULL, o, { x0: -42, x1: 44, y0: -9.6, y1: 3.6, wl: 0.2, boot: 0.8, sheer: (c) => { c.moveTo(-42, -7.35); c.quadraticCurveTo(10, -7.35, 42.8, -9.7); } });
  rim(g, o, (c) => { c.moveTo(-42, -7.35); c.quadraticCurveTo(10, -7.35, 42.8, -9.7); }, 0.35);
  const white = [234, 236, 238];
  for (const [P, y0, y1, x0, x1] of [[D1, -14.6, -7.3, -40.5, 32.5], [D2, -21.6, -14.6, -37.5, 25.5], [WH, -26.2, -21.6, 8, 24.5]]) {
    litFill(g, P, o, white, { y0, y1, x0, x1, gloss: 0.15, bottomDrop: 0.18, topLift: 0.15 });
    g.fillStyle = mat(white, L, up(L)); g.fillRect(x0 - 0.6, y0 - 0.55, x1 - x0 - 1.5, 0.6); // deck edge lit from above
    ledge(g, x0, x1 - 3, y0, 1.4, 0.34); // shadow under the overhang
  }
  // window rows: the sky by day, warm cabins by night
  const wo = { ...o, seed: 40 + v };
  glass(g, wo, -37, -12.9, 62, 3.1, { cols: 17, lit: 0.9, seed: 40 + v, warm: [255, 206, 140] });
  glass(g, wo, -34, -20, 54, 3.0, { cols: 15, lit: 0.85, seed: 41 + v, warm: [255, 206, 140] });
  g.save(); g.clip(WH); glass(g, o, 10, -25.4, 15, 2.2, { lit: 0.4 }); g.restore();
  // blue trim lines under each window row (as on the reference)
  g.fillStyle = mat([30, 70, 150], L, 0, 0.2); g.fillRect(-40.5, -9.2, 73, 0.6); g.fillRect(-37.5, -16.3, 63, 0.6);
  // lifebuoys
  for (const [x, y] of [[-30, -11.2], [24, -11.4], [-33, -18.4], [17, -18.4]]) {
    g.strokeStyle = mat([230, 70, 50], L, 0.2); g.lineWidth = 0.5;
    g.beginPath(); g.arc(x, y, 0.75, 0, Math.PI * 2); g.stroke();
  }
  // funnel with exhausts, mast with radar
  g.fillStyle = mat(white, L, 0); g.beginPath(); g.moveTo(-15, -21.6); g.lineTo(-14, -27.6); g.lineTo(-8.2, -27.6); g.lineTo(-8.8, -21.6); g.fill();
  g.fillStyle = mat(hc, L, 0); g.fillRect(-14.2, -27.6, 6, 1.2);
  g.fillStyle = mat([30, 30, 34], L, 0); g.fillRect(-13, -29.5, 0.9, 2); g.fillRect(-11.5, -29.8, 0.9, 2.3);
  g.strokeStyle = mat([200, 204, 210], L, 0.2); g.lineWidth = 0.35;
  g.beginPath(); g.moveTo(19, -26.2); g.lineTo(20.5, -30.6); g.moveTo(16.8, -28.6); g.lineTo(22.4, -28.6); g.stroke();
  rim(g, o, (c) => { c.moveTo(-41, -14.65); c.lineTo(28.4, -14.65); c.moveTo(-38, -21.65); c.lineTo(22, -21.65); c.moveTo(8, -26.25); c.lineTo(21.5, -26.25); }, 0.3);
  if (s >= 0.75) { // rails on the open top deck and the bow
    const rl = [[-37, -23, 7.5, -23], [-37, -22.3, 7.5, -22.3], [33, -11.6, 42, -11.6]];
    for (let x = -37; x <= 7.5; x += 2.5) rl.push([x, -21.6, x, -23]);
    for (let x = 34; x <= 42; x += 2.7) rl.push([x, -9.6, x, -11.6]);
    railing(g, o, rl);
    clutter(g, o, -36, 6, -21.6, 7 + v, 5); // the open top deck
  }
  // the door on the open stern deck
  g.fillStyle = mat([60, 64, 70], L, endFacing(o, -1) * 0.5); g.fillRect(-40.5, -12.6, 1.8, 5);
  rake(g, o, BOX);
}

const K = 80 / 89; // natural drawing units to the box

export default {
  id: 'sea.ferry',
  family: 'sea',
  title: 'Ferry',
  about: 'A two-deck harbour ferry with a funnel and wheelhouse; window rows mirror the sky by day and glow warm at night.',
  w: 80, h: 27.9, // the drawing x K; the long side is 2^n or 5x2^n (REASONING, Calls I made)
  states: ['idle'],
  loop: 6,
  variants: HULLS.length,
  ref: 'art/isles/cutouts/boat-ferry-night.webp',
  draw(ctx, o) {
    ctx.save();
    try {
      ctx.scale(K, K);
      const L = o.L, v = ((o.seed || 0) % HULLS.length + HULLS.length) % HULLS.length;
      const b = bob(o, 0.5, 5 + v);
      floatBody(ctx, o, { key: 'sea.ferry:' + v, box: BOX, pivot: 0, paint: (g, s) => paint(g, s, o, v) }, b);
      ctx.save(); ctx.translate(0, b.heave); ctx.rotate(-b.pitch);
      const n = clamp(L.night * 1.4);
      if (n > 0.05) { // the decks' light spilling out (bloom over the window rows)
        for (let x = -30; x <= 20; x += 12.5) { glow(ctx, x, -11.3, 9, [255, 196, 120], 0.12 * n); glow(ctx, x - 3, -18.4, 8, [255, 196, 120], 0.1 * n); }
      }
      lamp(ctx, 20.5, -30.6, [255, 250, 240], o, 0.4, n);
      lamp(ctx, 33, -10.4, [60, 255, 120], o, 0.4, n);
      lamp(ctx, -41.6, -9, [255, 250, 240], o, 0.35, n);
      ctx.restore();
      waterline(ctx, o, -42, 40, { foam: 0.55, speed: 0.3, seed: 3 });
    } finally { ctx.restore(); }
  },
};
