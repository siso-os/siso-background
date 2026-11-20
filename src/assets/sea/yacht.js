// A white motor yacht: sleek glossy hull, long dark glass bands, a flybridge under a hardtop; warm cabins and cyan
// underwater lights after dark.
import { css, mix, shade, glow, clamp, mat, up, litFill, rim, lamp, floatBody, waterline, bob, vgrad } from './_lib.js';
import { hullForm, skyGlass as glass, ledge, railing, rake } from './_hull.js';

const BOX = [-34, -21, 35, 3];
const HULL = new Path2D('M-32 -5.2 L-32 1.8 L19 2.5 C27 2.5 31 -1.6 33.8 -6.9 L33 -7.2 Q6 -5.5 -32 -5.4 Z');
const MAIN = new Path2D('M-27 -5.4 L-27 -10.6 L13.5 -10.6 Q19 -9.4 23.5 -6.0 L23.5 -5.6 Z');
const FLY = new Path2D('M-19 -11.4 L-19 -14.6 L4.5 -14.6 Q8 -13.8 11 -11.4 Z');
const BANDS = [[[8, 12, 18], [234, 236, 238]], [[10, 14, 22], [44, 54, 68]]]; // glass, hull

function paint(g, s, o, v) {
  const L = o.L, [gl, hullC] = BANDS[v], white = [238, 240, 242];
  litFill(g, HULL, o, hullC, { y0: -7.2, y1: 2.5, x0: -32, x1: 34, gloss: 0.45, topLift: 0.35, bottomDrop: 0.45 });
  g.save(); g.clip(HULL);
  g.fillStyle = mat([40, 44, 50], L, -0.2, 0.2); g.fillRect(-33, -0.3, 68, 3); // dark boot stripe at the waterline
  g.restore();
  hullForm(g, HULL, o, { x0: -32, x1: 34, y0: -7.2, y1: 2.5, wl: 0, boot: 0.5, sheer: (c) => { c.moveTo(-32, -5.45); c.quadraticCurveTo(6, -5.6, 33.2, -7.3); } });
  // hull windows: long rounded slots
  for (const [x, w] of [[-14, 9], [-2, 15]]) {
    g.save(); g.beginPath(); g.roundRect(x, -3.4, w, 1.1, 0.55); g.clip(); glass(g, o, x, -3.4, w, 1.1, { tint: gl, lit: 0.6 }); g.restore();
  }
  rim(g, o, (c) => { c.moveTo(-32, -5.45); c.quadraticCurveTo(6, -5.6, 33.2, -7.3); }, 0.3);
  litFill(g, MAIN, o, white, { y0: -10.6, y1: -5.4, x0: -27, x1: 24, gloss: 0.35, bottomDrop: 0.12 });
  g.save(); g.beginPath(); g.moveTo(-24, -9.8); g.lineTo(13, -9.8); g.quadraticCurveTo(17, -8.8, 20.5, -6.7); g.lineTo(-24, -6.7); g.closePath(); g.clip();
  glass(g, o, -24, -9.9, 45, 3.3, { tint: gl, lit: 0.75, cols: 6, seed: 5 }); g.restore();
  g.fillStyle = mat(white, L, up(L), 0.3); g.fillRect(-28.5, -11.4, 45, 0.85); // sundeck overhang
  ledge(g, -27, 16, -10.6, 1.5, 0.4);
  litFill(g, FLY, o, white, { y0: -14.6, y1: -11.4, x0: -19, x1: 11, gloss: 0.35, bottomDrop: 0.1 });
  g.save(); g.clip(FLY); glass(g, o, -16, -13.9, 24, 1.6, { tint: gl, lit: 0.5 }); g.restore();
  // hardtop on posts, radar domes, mast
  g.fillStyle = mat([60, 64, 70], L, 0); g.fillRect(-15, -15.9, 0.4, 1.3); g.fillRect(1.5, -15.9, 0.4, 1.3);
  g.fillStyle = mat(white, L, up(L), 0.3); g.beginPath(); g.moveTo(-20.5, -16.6); g.lineTo(3.5, -16.6); g.quadraticCurveTo(6.4, -16.3, 7.4, -15.7); g.lineTo(-20, -15.8); g.fill();
  g.fillStyle = mat(white, L, 0.3, 0.3);
  g.beginPath(); g.arc(-9, -17.7, 1.2, 0, Math.PI * 2); g.arc(-4.8, -17.2, 0.75, 0, Math.PI * 2); g.fill();
  g.strokeStyle = mat([180, 184, 190], L, 0.2); g.lineWidth = 0.2;
  g.beginPath(); g.moveTo(-1, -16.6); g.lineTo(-0.4, -20.6); g.moveTo(-2, -19); g.lineTo(1.2, -19); g.stroke();
  ledge(g, -19, 7, -15.8, 1.1, 0.35); // the hardtop's shadow on the flybridge
  rim(g, o, (c) => { c.moveTo(-28.5, -11.45); c.lineTo(16.3, -11.45); c.moveTo(-20.5, -16.65); c.lineTo(3.5, -16.65); }, 0.3);
  if (s >= 0.75) {
    const rl = [[17, -8.3, 32, -9.1], [-31, -7.4, -27.5, -7.4], [-19, -15.9, 4, -15.9]];
    for (let x = 17; x <= 32; x += 3) rl.push([x, -6.2 - (x - 17) * 0.05, x, -8.3 - (x - 17) * 0.053]);
    rl.push([-31, -5.4, -31, -7.4], [-29, -5.4, -29, -7.4], [-1, -16.6, -0.4, -20.6], [-2, -19, 1.2, -19]);
    railing(g, o, rl);
  }
  rake(g, o, BOX);
}

const K = 64 / 69; // natural drawing units to the box

export default {
  id: 'sea.yacht',
  family: 'sea',
  title: 'Motor yacht',
  about: 'A white motor yacht with dark glass bands and a flybridge; cabins glow warm and the stern lights the water cyan at night.',
  w: 64, h: 19.5, // the drawing x K; the long side is 2^n or 5x2^n (REASONING, Calls I made)
  states: ['idle'],
  loop: 6,
  variants: BANDS.length,
  ref: 'art/isles/cutouts/boat-yacht-day.webp',
  draw(ctx, o) {
    ctx.save();
    try {
      ctx.scale(K, K);
      const L = o.L, v = (o.seed || 0) % 2 ? 1 : 0, n = clamp(L.night * 1.4);
      const b = bob(o, 0.6, 9 + v);
      if (n > 0.05) for (const x of [-27, -20]) { // underwater lights at the stern
        ctx.save(); ctx.translate(x, 1.6); ctx.scale(1, 0.35); glow(ctx, 0, 0, 9, [40, 220, 255], 0.35 * n); ctx.restore();
      }
      floatBody(ctx, o, { key: 'sea.yacht:' + v, box: BOX, pivot: 0, paint: (g, s) => paint(g, s, o, v) }, b);
      ctx.save(); ctx.translate(0, b.heave); ctx.rotate(-b.pitch);
      if (n > 0.05) { glow(ctx, -4, -8.2, 14, [255, 200, 140], 0.14 * n); glow(ctx, -4, -13, 8, [255, 200, 140], 0.1 * n); }
      lamp(ctx, -0.4, -20.6, [255, 250, 240], o, 0.3, n);
      lamp(ctx, 22, -7.4, [60, 255, 120], o, 0.3, n);
      ctx.restore();
      waterline(ctx, o, -32, 30, { foam: 0.5, speed: 0.2, seed: 5 });
    } finally { ctx.restore(); }
  },
};
