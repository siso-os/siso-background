// A missile silo: a low concrete apron with a heavy hatch on rails over the shaft.
// open (once 2 s): the hatch slides back and the warhead rises into view. fire (once 3 s): a cold-launch puff, the
// missile clears the shaft, lights its motor with a flash, and climbs out of the box on a smoke column (free).
import { css, mix, shade, glow, clamp, smooth, ease, mat, up, rim, lamp, bake, vgrad, beacon, GUNMETAL, CONCRETE, dart, billow, rng, contact, scuffs } from './_lib.js';

const BOX = [-17, -10, 17, 0.55];
const TOP = -5, HOLE = -5.4, HW = 4.6, SLIDE = 9.2, MLEN = 14;

function paintPad(g, s, o) {
  const L = o.L;
  contact(g, 0, -0.8, 34, 1.35);
  const berm = new Path2D('M-16 0 L-12.4 -5 L12.4 -5 L16 0 Z');
  g.fillStyle = vgrad(g, TOP, 0, [[0, shade(CONCRETE, L, 0.3)], [0.3, shade(CONCRETE, L, -0.05)], [1, shade(CONCRETE, L, -0.55)]]);
  g.fill(berm);
  g.save(); g.clip(berm);
  scuffs(g, o, -16, -5, 32, 5, 51);
  for (const x of [-11, -6, 4, 11]) {
    g.fillStyle = css([24, 24, 23], 0.34); g.fillRect(x, -4.9, 0.12, 4.3);
    g.fillStyle = css([61, 46, 28], 0.2); g.fillRect(x + 0.12, -4.7, 0.35, 2.9);
  }
  g.restore();
  // the slope faces: one toward the key light
  g.fillStyle = mat(CONCRETE, L, o.lit > 0 ? -0.6 : 0.5, 0, 0.6); g.beginPath(); g.moveTo(-16, 0); g.lineTo(-12.4, -5); g.lineTo(-11.4, -5); g.lineTo(-14.6, 0); g.fill();
  g.fillStyle = mat(CONCRETE, L, o.lit > 0 ? 0.5 : -0.6, 0, 0.6); g.beginPath(); g.moveTo(16, 0); g.lineTo(12.4, -5); g.lineTo(11.4, -5); g.lineTo(14.6, 0); g.fill();
  // the top face, seen a little from above, with the dark shaft mouth and its collar
  g.fillStyle = mat([164, 160, 152], L, up(L)); g.fillRect(-12.4, TOP - 0.9, 24.8, 0.9);
  // rails the hatch runs back on, and a vent box
  g.fillStyle = mat([60, 62, 66], L, 0); g.fillRect(-HW - SLIDE - 0.6, TOP - 1.05, SLIDE + 1.2, 0.3);
  g.fillStyle = mat(GUNMETAL, L, 0.2); g.fillRect(7.6, TOP - 2.6, 3, 1.8);
  g.fillStyle = css([0, 0, 0], 0.35); for (let x = 7.9; x < 10.4; x += 0.6) g.fillRect(x, TOP - 2.3, 0.22, 1.2);
  g.fillStyle = css([0, 0, 0], 0.16); g.fillRect(-10, -2.4, 20, 0.2);
  rim(g, o, (c) => { c.moveTo(-12.4, TOP - 0.92); c.lineTo(12.4, TOP - 0.92); }, 0.25);
}

// The shaft mouth and its collar, shown only where the hatch has rolled off it.
function mouth(ctx, o, hx) {
  const L = o.L;
  ctx.save(); ctx.beginPath(); ctx.rect(hx + HW + 0.5, -20, 40, 30); ctx.clip();
  ctx.fillStyle = mat([70, 70, 70], L, 0); ctx.beginPath(); ctx.ellipse(0, HOLE, HW + 0.6, 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = css([6, 7, 9], 1); ctx.beginPath(); ctx.ellipse(0, HOLE, HW - 0.2, 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function hatch(ctx, o, x) {
  const L = o.L, y0 = TOP - 2.5, y1 = TOP - 0.72;
  contact(ctx, x, y1 - 0.18, 2 * HW + 2.1, 0.92);
  const left = x - HW - 0.72, w = 2 * HW + 1.44;
  ctx.fillStyle = vgrad(ctx, y0, y1, [[0, shade([153, 153, 145], L, up(L))], [0.16, shade([127, 125, 115], L, 0.5)], [0.42, shade(GUNMETAL, L, -0.05)], [0.85, shade(GUNMETAL, L, -0.65)], [1, shade(GUNMETAL, L, 0.25)]]);
  ctx.beginPath(); ctx.roundRect(left, y0, w, y1 - y0, 0.23); ctx.fill();
  ctx.fillStyle = css([10, 13, 15], 0.55); ctx.fillRect(left + 0.27, y0 + 0.48, w - 0.54, 0.09);
  for (let i = -2; i <= 2; i++) {
    const dx = x + i * 1.65;
    ctx.fillStyle = css([13, 16, 18], 0.68); ctx.fillRect(dx, y0 + 0.58, 0.15, 0.96);
    ctx.fillStyle = mat([142, 139, 123], L, 0.54); ctx.fillRect(dx + 0.15, y0 + 0.65, 0.11, 0.78);
    ctx.fillStyle = css([13, 16, 18], 0.65); ctx.fillRect(dx + 0.36, y0 + 0.21, 0.13, 0.12);
  }
  // Diagonal warning paint wraps over both ends of the slab.
  for (const start of [left + 0.35, left + w - 2.6]) {
    ctx.fillStyle = mat([35, 33, 29], L, 0.18);
    ctx.fillRect(start, y0 + 0.05, 2.25, 0.47);
    ctx.fillStyle = mat([224, 173, 57], L, 0.66);
    for (let i = 0; i < 4; i++) {
      const dx = start + i * 0.55;
      ctx.beginPath(); ctx.moveTo(dx + 0.24, y0 + 0.05); ctx.lineTo(dx + 0.52, y0 + 0.05);
      ctx.lineTo(dx + 0.27, y0 + 0.52); ctx.lineTo(dx, y0 + 0.52); ctx.fill();
    }
  }
}

export default {
  id: 'defence.silo',
  family: 'defence',
  title: 'Missile silo',
  about: 'A concrete silo apron with a sliding hatch; open (once 2 s): the hatch rolls back and the warhead rises into view; fire (once 3 s): cold-launch puff, the missile clears the shaft, ignites with a flash and climbs out on a smoke column (free). o.kind siso|enemy.',
  w: 32, h: 10,
  states: ['idle', 'open', 'fire'],
  loop: 4,
  once: { open: 2, fire: 3 },
  variants: 1,
  free: true,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, st = o.state, p = st === 'idle' ? 0 : clamp(o.p || 0);
      const slide = st === 'fire' ? 1 : st === 'open' ? ease.inOut(clamp(p / 0.7)) : 0;
      const climb = st === 'fire' ? 440 * Math.max(0, p - 0.03) ** 1.8 : 0;
      const nose = st === 'fire' ? 2.2 + climb : st === 'open' ? 2.2 * smooth(0.6, 1, p) : 0; // nose height above the mouth
      const ign = st === 'fire' ? smooth(0.1, 0.14, p) : 0;
      const smokeC = shade([206, 202, 196], L, 0.4), hot = [255, 170, 90], r = rng(909);
      if (st === 'fire') { // the ignition lights the ground around the silo
        const near = ign * clamp(1 - climb / 220);
        glow(ctx, 0, TOP, 32, hot, 0.26 * near);
      }
      bake(ctx, 'defence.silo', BOX, o, (g, s) => paintPad(g, s, o));
      if (slide > 0) mouth(ctx, o, -SLIDE * slide);
      // the missile: clipped to above the mouth so it seems to rise out of the shaft
      if (nose > 0.01) {
        ctx.save(); ctx.beginPath(); ctx.rect(-400, -2000, 800, 2000 + HOLE); ctx.clip();
        ctx.translate(0, HOLE - nose + MLEN); ctx.rotate(-Math.PI / 2);
        dart(ctx, o, MLEN, o.kind || 'siso', ign);
        ctx.restore();
      }
      hatch(ctx, o, -SLIDE * slide);
      if (st === 'fire') {
        for (let i = 0; i < 16; i++) { // the cold-launch gas and then the motor's smoke rolling out over the apron
          const dir = i % 2 ? 1 : -1, sp = 0.5 + r(), lift = r(), k = smooth(0, 0.55, p * (0.8 + sp * 0.4));
          if (k <= 0) continue;
          const x = dir * (3 + 26 * sp * k), y = TOP - 1 - 6 * lift * k, rad = 2 + 7 * k;
          billow(ctx, o, x, y, rad, mix(smokeC, hot, 0.45 * ign * (1 - k)), 0.55 * (1 - smooth(0.6, 1, p)), i + p * 6);
        }
        const top = HOLE - climb;
        for (let i = 0; i < 18; i++) { // the column the missile leaves behind, oldest and widest at the bottom
          const u = (i + r() * 0.65) / 17.65, y = HOLE - 2 + (top - HOLE + 2) * u, age = (1 - u) * clamp(climb / 200), rad = 0.95 + 10 * age + r() * (1 + 3 * age);
          billow(ctx, o, (r() - 0.5) * (2 + 9 * age) - age * 6, y, rad, mix(smokeC, hot, clamp(1 - (y - top) / 30) * 0.55 * ign), 0.56 * (1 - 0.5 * age) * clamp(climb / 10) * (1 - smooth(0.8, 1, p) * 0.5), i + p * 4);
        }
        const flash = smooth(0.1, 0.12, p) * (1 - smooth(0.13, 0.3, p));
        glow(ctx, 0, HOLE - nose + MLEN + 2, 11, [255, 220, 170], 0.5 * flash);
        const puffK = 1 - smooth(0, 0.12, p); // the first gas burst, before ignition
        glow(ctx, 0, HOLE - 1, 12, [255, 255, 255], 0.25 * puffK * (p > 0 ? 1 : 0));
      }
      const n = clamp(L.night * 1.5);
      lamp(ctx, -12, TOP - 1.2, [255, 50, 40], o, 0.22, (st === 'idle' ? 0.5 : beacon(t * 3, 1)) * Math.max(n, st === 'idle' ? 0 : 0.6));
      lamp(ctx, 12, TOP - 1.2, [255, 50, 40], o, 0.22, (st === 'idle' ? 0.5 : beacon(t * 3, 1, 0.5)) * Math.max(n, st === 'idle' ? 0 : 0.6));
    } finally { ctx.restore(); }
  },
};
