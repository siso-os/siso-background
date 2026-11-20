// An artillery emplacement: an armoured turret on a concrete berm with a long barrel and muzzle brake.
// fire (once, 1.5 s): the barrel recoils and runs out again, a muzzle flash with side jets, smoke and dust.
import { css, mix, shade, glow, clamp, smooth, ease, mat, rim, lamp, bake, vgrad, GUNMETAL, CONCRETE, block, puff, exhaust, FLAME, rng, armour, contact, scuffs } from './_lib.js';

const BOX = [-21, -16, 21, 0.6];
const EL = 0.36, PIV = [4.5, -8.6], LEN = 20;
const ARMOUR = [104, 110, 98];

function paint(g, s, o) {
  const L = o.L;
  contact(g, 0, -0.8, 42, 1.4);
  const berm = block(g, o, -19, -1.85, 19, 0, CONCRETE, { topH: 0.22, slope: 1.3 });
  g.save(); g.clip(berm); scuffs(g, o, -19, -1.8, 38, 1.75, 12); g.restore();
  contact(g, -2, -2.4, 30, 1.5);
  g.fillStyle = vgrad(g, -7, -1.85, [[0, shade([68, 68, 62], L, 0.3)], [0.52, [24, 25, 25]], [1, shade([75, 71, 64], L, -0.15)]]);
  g.beginPath(); g.roundRect(-15, -7, 26, 5.15, 2.4); g.fill();
  for (let i = 0; i < 7; i++) {
    const x = -12.15 + i * 3.38, y = -4.45;
    const wheel = g.createRadialGradient(x + o.lit * 0.38, y - 0.52, 0.14, x, y, 1.65);
    wheel.addColorStop(0, mat([137, 136, 101], L, 0.72)); wheel.addColorStop(0.65, mat(ARMOUR, L, 0.05));
    wheel.addColorStop(1, css([19, 21, 19], 0.95));
    g.fillStyle = wheel; g.beginPath(); g.arc(x, y, 1.64, 0, Math.PI * 2); g.fill();
    g.fillStyle = mat([49, 53, 47], L, 0.15);
    g.beginPath(); g.arc(x, y, 0.54, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = vgrad(g, -5.45, -2.7, [[0, [19, 20, 17], 0.71], [0.46, [25, 25, 21], 0.04], [1, [94, 73, 47], 0.42]]);
  g.fillRect(-13.25, -5.45, 22.7, 2.75);
  g.fillStyle = mat([114, 112, 97], L, 0.18);
  for (let x = -12.6; x < 9; x += 0.83) g.fillRect(x, -2.46, 0.44, 0.16);
  const tur = new Path2D('M-14.4 -6.12 L-13.7 -9.75 L-10.4 -11.75 L1.6 -11.75 L7.8 -8.45 L7.4 -6.1 L10.4 -5.85 L9.6 -5.15 L-14.2 -5.15 Z');
  armour(g, o, tur, -14.5, -11.8, 25, 6.7, 81);
  g.fillStyle = mat([82, 87, 67], L, o.lit > 0 ? 0.9 : -0.65);
  g.beginPath(); g.moveTo(1.8, -11.75); g.lineTo(7.8, -8.45); g.lineTo(7, -7.9); g.lineTo(1.6, -10.8); g.fill();
  g.fillStyle = css([17, 21, 17], 0.6); g.fillRect(-12, -6.42, 17.5, 0.17);
  g.strokeStyle = css([23, 27, 20], 0.56); g.lineWidth = 0.15;
  g.strokeRect(-7.8, -9.95, 5.2, 2.1);
  g.fillStyle = mat([137, 135, 102], L, 0.33); g.fillRect(-6.1, -9.47, 1.45, 0.18);
  g.fillStyle = vgrad(g, -11.85, -9.9, [[0, shade([147, 124, 87], L, 0.6)], [1, shade([82, 72, 56], L, -0.48)]]);
  g.beginPath(); g.roundRect(-13.4, -11.85, 4.1, 1.8, 0.66); g.fill();
  g.fillStyle = mat([54, 52, 44], L, 0.1);
  for (const x of [-12.7, -10.45]) g.fillRect(x, -11.85, 0.33, 1.85);
  g.fillRect(-7.25, -12.7, 2.2, 0.92);
  g.fillStyle = mat([65, 64, 51], L, -0.25);
  g.fillRect(-4.2, -11.62, 3.3, 0.38);
  g.fillStyle = mat([156, 140, 102], L, 0.27);
  g.fillRect(-4, -11.76, 2.9, 0.16);
  rim(g, o, (c) => { c.moveTo(-10.2, -11.75); c.lineTo(1.7, -11.75); c.lineTo(7.7, -8.46); }, 0.19);
}

export default {
  id: 'defence.artillery',
  family: 'defence',
  title: 'Artillery',
  about: 'An armoured gun turret on a concrete berm with a long barrel; fire (once 1.5 s): recoil and run-out, muzzle flash with side jets, smoke and dust.',
  w: 40, h: 16,
  states: ['idle', 'fire'],
  loop: 4,
  once: { fire: 1.5 },
  variants: 1,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, fire = o.state === 'fire', p = fire ? clamp(o.p || 0) : 0;
      const recoil = fire ? 3.2 * (p < 0.04 ? ease.out(p / 0.04) : 1 - ease.inOut(clamp((p - 0.04) / 0.5))) : 0;
      const a = Math.cos(EL), b = Math.sin(EL), mz = [PIV[0] + (LEN - recoil) * a, PIV[1] - (LEN - recoil) * b];
      if (fire) { // smoke from the muzzle and dust off the berm, behind the gun
        const r = rng(31), smoke = shade([190, 184, 172], L, 0.4), dust = shade([176, 156, 124], L, 0.3);
        for (let i = 0; i < 10; i++) {
          const k = smooth(0.02, 0.9, p * (0.8 + r() * 0.4)), dx = 4 + r() * 10, dy = -2 - r() * 6;
          puff(ctx, mz[0] + dx * k, mz[1] + dy * k, 2 + 7 * k, mix(smoke, [255, 170, 90], 0.5 * (1 - smooth(0, 0.15, p))), 0.55 * (1 - smooth(0.55, 1, p)) * (k > 0.01 ? 1 : 0));
        }
        for (let i = 0; i < 6; i++) {
          const k = smooth(0, 0.7, p), x = -16 + i * 6.4 + (r() - 0.5) * 3;
          puff(ctx, x, -1.5 - 3 * k, 2 + 4 * k, dust, 0.35 * (1 - smooth(0.4, 1, p)) * (k > 0.01 ? 1 : 0));
        }
      }
      bake(ctx, 'defence.artillery', BOX, o, (g, s) => paint(g, s, o));
      ctx.save(); ctx.translate(PIV[0], PIV[1]); ctx.rotate(-EL);
      ctx.fillStyle = mat(ARMOUR, L, 0); ctx.fillRect(-2, -1.5, 4, 3); // mantlet
      ctx.translate(-recoil, 0);
      ctx.fillStyle = vgrad(ctx, -0.65, 0.65, [[0, shade(GUNMETAL, L, 0.9)], [0.45, shade(GUNMETAL, L, 0.1)], [1, shade(GUNMETAL, L, -0.9)]]);
      ctx.fillRect(1, -0.65, LEN - 1, 1.3);
      ctx.fillRect(1, -1.02, 6.2, 2.04);
      ctx.fillRect(9.7, -0.81, 0.56, 1.62);
      ctx.fillRect(LEN - 2.7, -1.12, 2.7, 2.24);
      ctx.fillStyle = css([9, 11, 13], 0.8);
      for (const x of [LEN - 2.15, LEN - 1.1]) {
        ctx.beginPath(); ctx.roundRect(x, -0.57, 0.58, 1.12, 0.17); ctx.fill();
      }
      ctx.restore();
      if (fire && p < 0.2) {
        const k = 1 - smooth(0, 0.2, p);
        ctx.save(); ctx.translate(mz[0], mz[1]); ctx.rotate(-EL);
        glow(ctx, 3, 0, 34, [255, 180, 100], 0.85 * k);
        ctx.rotate(Math.PI); exhaust(ctx, 0, 0, 12 * k, 2.6 * k, FLAME.burner, k, { bloom: 0 });
        ctx.rotate(-Math.PI / 2); exhaust(ctx, 1.2, 0, 4 * k, 0.9 * k, FLAME.burner, k, { bloom: 0 }); // side jets from the brake
        ctx.rotate(Math.PI); exhaust(ctx, 1.2, 0, 4 * k, 0.9 * k, FLAME.burner, k, { bloom: 0 });
        ctx.restore();
      }
      lamp(ctx, -5.25, -8.42, [255, 183, 103], o, 0.35, 0.63 * L.night);
      lamp(ctx, -12, -10, [255, 50, 40], o, 0.2, clamp(L.night * 1.5) * 0.6);
    } finally { ctx.restore(); }
  },
};
