// The two fighters share one painter: a side view seen a touch from below, so the near wing shows as a swept blade
// under the fuselage and the far wing as a dark sliver above. The exhaust is the brightest thing in the frame.
import { css, mix, shade, glow, clamp, smooth, mat, rim, lamp, bake, exhaust, flicker, strobe, skin, canopy, TAU, vgrad, hgrad, rimColour, shockCells, rng } from './_lib.js';

export const JET_BOX = [-20, -10.5, 20, 0];

export function paintJet(g, s, o, J) {
  const L = o.L, P = (d) => new Path2D(d);
  const B = { y0: -6.25, y1: -2.65, x0: -18, x1: 20 };
  skin(g, P(J.farWing), o, J.base, { y0: -7.4, y1: -6, x0: -12, x1: 2 });
  skin(g, P(J.farTail), o, J.base, { y0: -10, y1: -6, x0: -18, x1: -9, gloss: 0.12 });
  skin(g, P(J.hstab), o, J.base, { y0: -4.6, y1: -2.8, x0: -19, x1: -11, gloss: 0.2 });
  const tail = P(J.nearTail);
  skin(g, tail, o, J.base, { y0: -10.6, y1: -6, x0: -17, x1: -8, gloss: J.gloss });
  g.save(); g.clip(tail);
  g.fillStyle = vgrad(g, -10.5, -6, [[0, shade(J.tailMark, L, 0.75)], [1, shade(J.tailMark, L, -0.2)]]);
  g.fill(P('M-17 -10.35 L-15.7 -10.35 L-12.3 -7.5 L-8.5 -6.1 L-14.1 -6.5 Z'));
  g.strokeStyle = css([6, 9, 14], 0.45); g.lineWidth = 0.07;
  g.stroke(P('M-16.2 -9.4 L-14.8 -6.55 L-10.1 -6.33'));
  g.restore();

  const fus = P(J.fus);
  skin(g, fus, o, J.base, { ...B, gloss: J.gloss });
  g.save(); g.clip(fus);
  const radome = P('M14.1 -6.1 Q13.6 -4.63 14.15 -3.65 L20 -4.5 L20 -5.2 Z');
  skin(g, radome, o, J.base.map((v) => v * 0.63), { ...B, y0: -5.8, y1: -3.65, gloss: 0.2 });
  g.fillStyle = vgrad(g, -6.5, -3.9, [[0, shade(J.stripe, L, 0.75)], [1, shade(J.stripe, L, 0.08)]]);
  g.fill(P('M-12.8 -5.98 Q-3 -5.57 7 -4.8 L11.7 -4.19 L6.6 -4.45 L-6.5 -5.32 Z'));
  if (s >= 1.1) {
    const seams = P('M-14.3 -6.32 Q-14.9 -4.35 -14.2 -2.8 M-7.3 -6.5 L-8 -4.9 L-7.8 -2.6 M-1 -6.18 L-1.35 -5.2 L-0.85 -2.5 M8.1 -5.7 L7.8 -4.82 L8.15 -3.18 M-17 -4.36 Q-9 -4.15 -3 -4.54 M8.2 -4.13 L14 -4.5 M10.1 -5.06 h2.3 l.16 .42 h-2.3 Z M14.1 -6.1 Q13.6 -4.63 14.15 -3.65');
    g.strokeStyle = css([12, 14, 19], 0.29); g.lineWidth = 0.061; g.stroke(seams);
    const spine = P('M-15 -5.72 L-12.8 -5.73 M-11.5 -5.95 L-9.6 -5.91 M-7.55 -5.7 L-5.9 -5.64 M-4.95 -5.76 L-3.35 -5.74 M-1.5 -5.55 L-0.22 -5.5 M9.54 -5.27 L12.5 -5.17');
    g.strokeStyle = css(rimColour(L), 0.25 * (1 - L.night)); g.lineWidth = 0.125; g.stroke(spine);
    const rand = rng(J.seed);
    for (let i = 0; i < 40; i++) {
      const x = -14 + rand() * 28, y = -5.82 + rand() * 2.85;
      g.fillStyle = css(i % 3 ? [20, 24, 30] : rimColour(L), 0.10 + rand() * 0.19);
      g.fillRect(x, y, 0.07 + 0.82 * rand(), 0.04 + rand() * 0.04);
    }
  }
  g.restore();

  const intake = P(J.intake);
  g.fillStyle = vgrad(g, -5.13, -3.35, [[0, [5, 8, 12]], [0.46, [13, 18, 23]], [1, shade(J.base, L, -0.2, { gloss: 0.14 })]]);
  g.fill(intake);
  g.save(); g.clip(intake);
  g.fillStyle = vgrad(g, -4.96, -3.4, [[0, [13, 18, 24]], [1, shade(J.base, L, 0.22, { gloss: 0.3 })]]);
  g.fill(P('M5.36 -4.98 L6.35 -4.86 L4.65 -3.36 L2.72 -3.29 Z'));
  if (s >= 1.1) {
    g.strokeStyle = css([88, 103, 115], 0.34);
    g.lineWidth = 0.11;
    g.stroke(P('M1.25 -3.42 L1.55 -4.54 M1.68 -3.42 L1.98 -4.63 M2.11 -3.42 L2.41 -4.73 M2.54 -3.42 L2.84 -4.81'));
  }
  g.restore();
  g.strokeStyle = mat(J.base, L, 0.42, 0.16); g.lineWidth = 0.13; g.stroke(intake);
  if (J.canard) skin(g, P(J.canard), o, J.base, { y0: -5, y1: -3.8, x0: 4, x1: 9.5, gloss: 0.2 });
  skin(g, P(J.nearWing), o, J.base.map((v) => v * 0.75), { y0: -3.95, y1: -0.6, x0: -14, x1: 5, gloss: 0.2 });
  g.fillStyle = css(mix([10, 13, 17], L.haze, 0.06), 0.52);
  g.fill(P('M-11 -3.45 L3.4 -3.65 Q0.9 -2.88 -5 -2.85 L-10.9 -2.98 Z'));
  rim(g, o, (c) => { c.moveTo(-10.9, -3.5); c.quadraticCurveTo(-3, -3.82, 3.1, -3.61); }, 0.1, 0.52);
  if (s >= 1.1) {
    g.strokeStyle = css([9, 14, 21], 0.33);
    g.lineWidth = 0.08;
    g.stroke(P('M-12.35 -2.07 L-9.96 -2.21 L-5.15 -2.89 M-9.16 -2.36 L-8.56 -3.39'));
  }
  const glass = P(J.canopy);
  canopy(g, glass, o, { x0: -2.6, x1: 9, y0: -8, y1: -5.65, tint: J.glass, amt: 0.42 });
  g.save(); g.clip(glass);
  g.fillStyle = css([5, 8, 13], 0.74);
  g.fill(P('M2.05 -5.8 L2.15 -6.7 Q2.31 -7.22 2.85 -7.05 L3.36 -5.8 Z M6.02 -5.76 L5.37 -7.54 L5.54 -7.43 L6.26 -5.76 Z'));
  g.restore();
  const [nose, shoulder, windscreen, tailRoot] = J.spine;
  rim(g, o, (c) => {
    c.moveTo(...nose); c.quadraticCurveTo(...shoulder, ...windscreen);
    c.moveTo(-2.55, -6.35); c.lineTo(...tailRoot);
  }, 0.09, 0.68);
  skin(g, P('M-17.9 -5.46 L-15.35 -5.9 L-15.35 -3.43 L-17.9 -3.86 Z'), o, [87, 79, 73],
    { y0: -5.94, y1: -3.4, x0: -18, x1: -15, gloss: 0.24 });
  g.strokeStyle = css([15, 13, 13], 0.52); g.lineWidth = 0.07;
  g.stroke(P('M-17.84 -5.08 L-15.44 -5.38 M-17.88 -4.64 L-15.42 -4.64 M-17.84 -4.2 L-15.44 -4.03 M-16.08 -5.76 L-16.08 -3.55'));
  g.fillStyle = '#121017';
  g.beginPath(); g.ellipse(-17.82, -4.65, 0.30, 0.79, 0, 0, TAU); g.fill();
}

export function drawJet(ctx, o, J) {
  const L = o.L, t = o.t || 0, fire = o.state === 'fire', p = fire ? clamp(o.p || 0) : 0;
  bake(ctx, J.id, JET_BOX, o, (g, s) => paintJet(g, s, o, J));
  // missile off the rail: drops, lights, pulls ahead
  if (fire) {
    const drop = 1.4 * smooth(0, 0.2, p) ** 2, lit = p > 0.17, run = lit ? 46 * (p - 0.17) ** 2 : 0;
    ctx.save(); ctx.translate(-2.5 + run, -2.2 + drop); ctx.rotate(lit ? 0 : 0.06 * smooth(0, 0.2, p));
    if (lit) exhaust(ctx, -3.6, 0, 6 * flicker(t, 3), 0.5, J.flame, smooth(0.17, 0.25, p), { night: L.night, bloom: 0.9 });
    ctx.fillStyle = mat(J.missile, L, 0.3, 0.2); ctx.fillRect(-3.6, -0.32, 6.4, 0.64);
    ctx.beginPath(); ctx.moveTo(2.8, -0.32); ctx.lineTo(4, 0); ctx.lineTo(2.8, 0.32); ctx.fill();
    ctx.fillStyle = mat(J.missile, L, -0.3); ctx.beginPath(); ctx.moveTo(-3.6, -0.3); ctx.lineTo(-2.6, -0.3); ctx.lineTo(-3.8, -1.1); ctx.fill();
    ctx.restore();
    if (p > 0.05 && p < 0.75) { // cannon: a flickering muzzle flash and short tracer dashes
      const k = (Math.sin(t * 88) > -0.2 ? 1 : 0.25) * (1 - smooth(0.6, 0.75, p));
      glow(ctx, J.gun[0] + 1, J.gun[1], 7, [255, 200, 120], 0.55 * k);
      glow(ctx, J.gun[0] + 0.8, J.gun[1], 1.8, [255, 250, 230], 0.9 * k);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const u = ((t * 9 + i / 3) % 1), x = J.gun[0] + 2 + u * 14;
        ctx.strokeStyle = css([255, 214, 150], 0.7 * (1 - u) * k); ctx.lineWidth = 0.28;
        ctx.beginPath(); ctx.moveTo(x, J.gun[1] - u * 0.3); ctx.lineTo(x + 2.4, J.gun[1] - u * 0.3 - 0.05); ctx.stroke();
      }
      ctx.restore();
    }
  }
  // afterburner: the hot part that carries the jet at 25 px
  const ab = J.burner * flicker(t, J.seed);
  const x = -17.9, y = -4.65, len = 9.8 * ab;
  const haze = mix(L.sky.horizon, J.flame.mid, 0.28);
  ctx.fillStyle = hgrad(ctx, x, x - len, [[0, haze, 0], [0.3, haze, 0.2], [1, haze, 0]]);
  for (const side of [-1, 1]) {
    const wave = Math.sin(t * 32 + side) * 0.35;
    ctx.beginPath(); ctx.moveTo(x, y + side * 0.57);
    ctx.bezierCurveTo(x - len * 0.4, y + side * (1.4 + wave), x - len * 0.76, y - wave, x - len, y + side * 0.4);
    ctx.quadraticCurveTo(x - len * 0.5, y + side * 0.55, x, y + side * 0.57); ctx.fill();
  }
  exhaust(ctx, x, y, len * 0.91, 0.65, J.flame, 0.56, { night: L.night, bloom: 1.1 });
  shockCells(ctx, x + 0.12, y, len * 0.88, 0.78, J.flame, 0.82);
  glow(ctx, x - 0.25, y, 2.1, J.flame.mid, 0.28 + 0.18 * L.night);
  const n = clamp(L.night * 1.5);
  for (const [x, y, c, k] of J.lights) lamp(ctx, x, y, c, o, 0.28, n * (k === 's' ? strobe(t, 1.3, J.seed * 0.3) : 0.8));
}
