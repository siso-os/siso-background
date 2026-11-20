// A flash of light, played once by o.p over 0.6 s: a blinding core, a wide bloom that lights the air around it, a
// short anamorphic streak (the way a film lens catches a point of light) and a faint ring. flash is a warm detonation;
// blue is a SISO weapon or shield discharge.
import { clamp, bloom, glowSprite, css, TAU } from './_lib.js';

const COL = { flash: { core: [255, 246, 226], glow: [255, 176, 90], streak: [255, 214, 170] }, blue: { core: [236, 246, 255], glow: [90, 170, 255], streak: [160, 210, 255] } };

export function flashAt(ctx, o, x, y, R, I, kind = 'flash') {
  if (I <= 0.01) return;
  const c = COL[kind] || COL.flash, L = o.L;
  const air = 0.55 + 0.45 * L.night; // in daylight the same flash lights less of the sky
  bloom(ctx, x, y, R * 3.0, c.glow, I * 0.68 * air);
  bloom(ctx, x, y, R * (1.0 + 0.55 * I), c.glow, I * 0.65 * air);
  bloom(ctx, x, y, R * 0.32, c.core, I);
  bloom(ctx, x, y, R * 0.12, [255, 255, 255], I);
  // anamorphic streak: the glow sprite squashed flat
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(1, 0.065);
  ctx.globalAlpha = Math.min(1, I * 0.65); const s = glowSprite(c.streak); ctx.drawImage(s, -R * 1.25, -R * 1.25, R * 2.5, R * 2.5);
  ctx.restore();
}

export default {
  id: 'fx.flash', family: 'fx', title: 'Flash',
  about: 'A flash of light played once over 0.6 s by o.p: core, bloom, an anamorphic lens streak and a faint ring. flash is warm (a detonation), blue is a SISO weapon. o.size scales it.',
  w: 256, h: 256, states: ['flash', 'blue'], loop: 0, once: { flash: 0.6, blue: 0.6 }, variants: 1,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    const p = clamp(o.p ?? 0.5), s = o.size ?? 1;
    const I = p < 0.08 ? p / 0.08 : Math.exp(-(p - 0.08) * 6.5);
    flashAt(ctx, o, 0, -120 * s, 110 * s, I, o.state === 'blue' ? 'blue' : 'flash');
    if (p < 0.5 && s > 0) {
      const y = -120 * s, rr = (20 + 240 * p) * s;
      const c = (COL[o.state] || COL.flash).streak;
      const g = ctx.createRadialGradient(0, y, rr * 0.62, 0, y, rr);
      g.addColorStop(0, css(c, 0));
      g.addColorStop(0.78, css(c, I * (1 - p / 0.5) * 0.12));
      g.addColorStop(1, css(c, 0));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, y, rr, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },
};
