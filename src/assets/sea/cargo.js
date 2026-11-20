// A container ship: a long dark hull, bays of stacked containers in faded colours, the bridge and funnel aft.
import { css, mix, shade, glow, clamp, mat, up, endFacing, litFill, rim, lamp, floatBody, waterline, bob, seeded, scale } from './_lib.js';
import { hullForm, ledge, railing, rake } from './_hull.js';
import { windowLights } from '../../core/paint.js';

const BOX = [-122, -57, 123, 8];
const HULL = new Path2D('M-120 -14 L-120 6 L98 8 C111 8 118 0 122.5 -17 L120.5 -17.4 Q40 -14.1 -120 -14.2 Z');
const HULLS = [[120, 34, 30], [24, 40, 70], [30, 32, 34], [26, 70, 60]];
const BOXES = [[156, 52, 38], [38, 72, 128], [44, 104, 70], [196, 196, 190], [210, 120, 40], [150, 140, 60], [30, 110, 120], [110, 40, 50], [90, 96, 104]];

function paint(g, s, o, v) {
  const L = o.L, r = seeded({ seed: v }, 77), hc = HULLS[v];
  litFill(g, HULL, o, hc, { y0: -17.4, y1: 8, x0: -120, x1: 123, gloss: 0.15, bottomDrop: 0.45, side: 0.15 });
  g.save(); g.clip(HULL);
  g.fillStyle = mat([140, 40, 34], L, -0.2); g.fillRect(-121, -0.2, 245, 9); // red bottom paint at the waterline
  g.fillStyle = mat([220, 222, 224], L, 0, 0.1); g.fillRect(-121, -14.6, 245, 0.8); // sheer line
  if (s >= 0.75) { // weld seams and rust streaks
    g.fillStyle = css([0, 0, 0], 0.1);
    for (let x = -112; x < 110; x += 9) g.fillRect(x, -13.5, 0.15, 13);
    g.fillStyle = css([90, 50, 30], 0.18);
    for (let i = 0; i < 14; i++) g.fillRect(-110 + r() * 210, -13.4, 0.35, 2 + r() * 6);
  }
  g.restore();
  hullForm(g, HULL, o, { x0: -120, x1: 123, y0: -17.4, y1: 8, wl: 0, boot: 1.4, sheer: (c) => { c.moveTo(-120, -14.25); c.quadraticCurveTo(40, -14.25, 121, -17.5); } });
  rim(g, o, (c) => { c.moveTo(-120, -14.25); c.quadraticCurveTo(40, -14.25, 121, -17.5); }, 0.45);
  // containers: 12 m boxes, 2.6 high, in bays from the bridge to the bow
  const cw = 12, chH = 2.6, top = up(L);
  for (let bx = -80; bx < 100; bx += cw + 0.6) {
    const tiers = Math.round(3 + r() * 4 - (bx > 70 ? 2 : 0));
    for (let k = 0; k < tiers; k++) {
      const y = -14.2 - (k + 1) * chH, c = mix(r.pick(BOXES), [118, 114, 108], 0.32), dk = 0.8 + r() * 0.35; // sun-faded toward dust
      g.fillStyle = mat(scale(c, dk), L, 0, 0.05); g.fillRect(bx, y, cw, chH - 0.12);
      g.fillStyle = css([0, 0, 0], 0.22); g.fillRect(bx, y + chH - 0.5, cw, 0.38); // shadow under the box above
      if (s >= 1) {
        g.fillStyle = css([0, 0, 0], 0.13);
        for (let x = bx + 0.6; x < bx + cw; x += 0.7) g.fillRect(x, y, 0.12, chH - 0.12);
      }
      if (k === tiers - 1) { g.fillStyle = mat(scale(c, dk), L, top, 0.1); g.fillRect(bx, y - 0.25, cw, 0.3); }
    }
  }
  // the bridge, its wings, the funnel and the mast
  const white = [228, 230, 230];
  const BR = new Path2D('M-110 -14.2 L-110 -42 L-84 -42 L-84 -14.2 Z');
  litFill(g, BR, o, white, { y0: -42, y1: -14.2, x0: -110, x1: -84, gloss: 0.1, bottomDrop: 0.2 });
  windowLights(g, -108, -40, 22, 22, { ...o, seed: 80 + v }, { cols: 8, rows: 7, gapX: 0.45, gapY: 0.55, warm: [255, 214, 160] });
  g.fillStyle = mat(white, L, up(L)); g.fillRect(-114, -43.2, 32, 1.4);
  ledge(g, -110, -84, -41.8, 2.4, 0.35); for (let y = -38.6; y > -41; y -= 3.2) ledge(g, -110, -84, y, 0.8, 0.12);
  g.save(); g.beginPath(); g.rect(-113, -41.8, 30, 1.6); g.clip(); g.fillStyle = mat([20, 28, 36], L, 0, 0.6); g.fillRect(-113, -41.8, 30, 1.6); g.restore();
  g.fillStyle = mat(white, L, endFacing(o, -1) * 0.4); g.beginPath(); g.moveTo(-119, -14.2); g.lineTo(-118, -48); g.lineTo(-111, -48); g.lineTo(-110, -14.2); g.fill();
  g.fillStyle = mat([24, 24, 26], L, 0); g.fillRect(-118.2, -50.4, 7.4, 2.6);
  g.fillStyle = mat(hc, L, 0); g.fillRect(-118.1, -46.5, 7.2, 1.8);
  railing(g, o, [[-97, -43.2, -97, -56], [-101, -52, -93, -52], [118, -17.2, 117.5, -30], [-113, -44.6, -83, -44.6], [-119, -15.6, -81, -15.6], [100, -16.3, 120, -17.2]], 1);
  rim(g, o, (c) => { c.moveTo(-114, -43.25); c.lineTo(-82, -43.25); c.moveTo(-118, -48.05); c.lineTo(-111, -48.05); }, 0.4);
  rake(g, o, BOX);
}

const K = 256 / 245; // natural drawing units to the box

export default {
  id: 'sea.cargo',
  family: 'sea',
  title: 'Container ship',
  about: 'A long container ship: dark hull, bays of stacked containers in faded colours, the bridge and funnel aft; lit bridge and deck lights at night.',
  w: 256, h: 59.6, // the drawing x K; the long side is 2^n or 5x2^n (REASONING, Calls I made)
  states: ['idle'],
  loop: 8,
  variants: HULLS.length,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      ctx.scale(K, K);
      const L = o.L, v = ((o.seed || 0) % HULLS.length + HULLS.length) % HULLS.length;
      const b = bob(o, 0.15, 11 + v);
      floatBody(ctx, o, { key: 'sea.cargo:' + v, box: BOX, pivot: 0, paint: (g, s) => paint(g, s, o, v) }, b);
      ctx.save(); ctx.translate(0, b.heave); ctx.rotate(-b.pitch);
      const n = clamp(L.night * 1.4);
      if (n > 0.05) for (const x of [-60, -10, 40, 90]) glow(ctx, x, -24, 16, [255, 214, 160], 0.08 * n); // deck floods on the boxes
      lamp(ctx, -97, -56, [255, 250, 240], o, 0.6, n);
      lamp(ctx, 117.5, -30, [255, 250, 240], o, 0.6, n);
      lamp(ctx, -84, -42.5, [60, 255, 120], o, 0.5, n);
      ctx.restore();
      waterline(ctx, o, -120, 118, { foam: 0.45, speed: 0.15, seed: 13 });
    } finally { ctx.restore(); }
  },
};
