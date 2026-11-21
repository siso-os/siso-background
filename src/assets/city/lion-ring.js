// The SISO lion in its ring: a holo crest that hangs over the home island. An ember ring (red into orange into amber)
// with a slow turning band of ticks, a black glass disc, and the SISO lion in it (the brand mark, painted image
// brand-lion from img/); until that has loaded, or with the art off, SISO in ember letters. flare brightens it (the
// tower's hellfire).
import { css, glow, mix } from '../../core/paint.js';
import { paintedImage } from '../../core/sprites.js';

const S = 240, R = 104, CY = -S / 2;
const RED = [255, 58, 38], ORANGE = [255, 128, 36], AMBER = [255, 196, 92];

export default {
  id: 'city.lion-ring',
  family: 'city',
  title: 'SISO lion ring',
  about: 'The SISO lion in an ember ring, a holo crest hanging over the home island; the ring turns slowly. flare brightens it.',
  w: S, h: S,
  states: ['idle', 'flare'],
  loop: 12, variants: 1,
  ref: 'refs/brand/siso-lion-ember.png',
  draw(ctx, o) {
    const L = o.L || { night: 0.5 }, t = o.t || 0;
    const f = o.state === 'flare' ? 1 + 0.35 * (0.5 + 0.5 * Math.sin(t * 9)) : 1;
    const amt = (0.55 + 0.45 * (L.night ?? 0.5)) * f;
    // the ember halo it throws on the air
    glow(ctx, 0, CY, R * 1.9, mix(RED, ORANGE, 0.5), 0.28 * amt);
    // the black glass disc
    const d = ctx.createRadialGradient(0, CY - R * 0.3, R * 0.1, 0, CY, R * 0.95);
    d.addColorStop(0, 'rgba(26,18,20,0.92)'); d.addColorStop(1, 'rgba(6,4,6,0.95)');
    ctx.fillStyle = d; ctx.beginPath(); ctx.arc(0, CY, R * 0.93, 0, Math.PI * 2); ctx.fill();
    // the ring: a glow pass, then the hot band, then a thin inner line
    const g = ctx.createLinearGradient(-R, CY - R, R, CY + R);
    g.addColorStop(0, css(RED)); g.addColorStop(0.5, css(ORANGE)); g.addColorStop(1, css(AMBER));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = g; ctx.globalAlpha = 0.35 * amt; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(0, CY, R, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = g; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(0, CY, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = css(AMBER, 0.55); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, CY, R * 0.86, 0, Math.PI * 2); ctx.stroke();
    // the turning band of ticks just outside the ring, broken into three arcs
    ctx.save();
    ctx.translate(0, CY); ctx.rotate(t * 0.12);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 72; i++) {
      if (i % 24 > 19) continue;
      const a = (i / 72) * Math.PI * 2, r0 = R + 9, r1 = R + (i % 6 === 0 ? 17 : 13);
      ctx.strokeStyle = css(mix(ORANGE, AMBER, (i % 24) / 24), 0.75 * amt); ctx.lineWidth = i % 6 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
    // the lion
    const im = paintedImage('brand-lion');
    if (im) {
      const h = R * 1.42, w = (h * im.naturalWidth) / im.naturalHeight;
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.92 * f);
      ctx.drawImage(im, -w / 2, CY - h / 2 + 2, w, h);
      ctx.restore();
    } else {
      ctx.save();
      ctx.font = '800 46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = css(ORANGE, 0.95); ctx.fillText('SISO', 0, CY + 2);
      ctx.restore();
    }
  },
};
