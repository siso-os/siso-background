// A car, 4.2 to 5 long, facing +x: a seeded saloon, hatchback, SUV or van in a seeded paint; glass mirroring the sky,
// a highlight along the shoulder, wheels turning with t. After dark the headlights throw a short beam and the tail-lights
// glow red.
import { css, mix, scale, shade, glow, glassColour, rng } from './_lib.js';

const PAINTS = [[200, 30, 36], [236, 236, 232], [30, 32, 36], [40, 80, 150], [150, 152, 158], [200, 160, 40], [24, 90, 70], [120, 26, 40], [70, 120, 160]];
const KINDS = [ // length, roof height, roof start, roof end, bonnet height, body height
  { l: 4.6, roof: 1.42, r0: 0.3, r1: 0.74, bon: 0.82, bh: 0.62 },
  { l: 4.1, roof: 1.48, r0: 0.28, r1: 0.88, bon: 0.85, bh: 0.64 },
  { l: 4.8, roof: 1.72, r0: 0.25, r1: 0.9, bon: 1.0, bh: 0.78 },
  { l: 5.0, roof: 1.95, r0: 0.18, r1: 0.97, bon: 1.05, bh: 0.9 },
];

export default {
  id: 'city.car',
  family: 'city',
  title: 'Car',
  about: 'A car about 4.6 long facing +x (flip the context to face -x): seeded body and paint, sky in the glass, wheels turn with t; headlights and tail-lights after dark.',
  w: 8, h: 2.2,
  states: ['idle'],
  loop: 2, variants: 36,
  ref: 'refs/options/option-a-golden.webp',
  draw(ctx, o) {
    const L = o.L, t = o.t || 0, seed = o.seed | 0, r = rng(seed * 29 + 3), lit = o.lit >= 0 ? 1 : -1;
    const k = KINDS[Math.floor(r() * KINDS.length)], paint = PAINTS[Math.floor(r() * PAINTS.length)];
    const x0 = -k.l / 2, x1 = k.l / 2, wr = 0.33, gy = -wr;
    // body: lower box with a bonnet and boot, then the glasshouse
    const bg = ctx.createLinearGradient(0, -k.bon - 0.1, 0, -0.15);
    bg.addColorStop(0, css(shade(paint, L, 0.8, { gloss: 0.7 }))); bg.addColorStop(0.35, css(shade(paint, L, 0.2, { gloss: 0.4 }))); bg.addColorStop(1, css(shade(scale(paint, 0.6), L, -0.4)));
    ctx.fillStyle = bg; ctx.beginPath();
    ctx.moveTo(x0 + 0.1, -0.22); ctx.lineTo(x0, -k.bh); ctx.quadraticCurveTo(x0 + 0.05, -k.bon, x0 + 0.5, -k.bon);
    ctx.lineTo(x1 - 0.7, -k.bon); ctx.quadraticCurveTo(x1, -k.bon + 0.05, x1, -k.bh * 0.85); ctx.lineTo(x1 - 0.05, -0.22); ctx.closePath(); ctx.fill();
    const rx0 = x0 + k.l * k.r0, rx1 = x0 + k.l * k.r1;
    ctx.beginPath(); ctx.moveTo(rx0 - 0.5, -k.bon); ctx.lineTo(rx0 + 0.2, -k.roof); ctx.lineTo(rx1 - 0.3, -k.roof); ctx.lineTo(rx1 + 0.4, -k.bon); ctx.closePath(); ctx.fill();
    const gl = ctx.createLinearGradient(0, -k.roof, 0, -k.bon);
    gl.addColorStop(0, css(mix(glassColour(L, 1), [255, 255, 255], 0.15))); gl.addColorStop(1, css(scale(glassColour(L, 0.3), 0.55)));
    ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(rx0 - 0.3, -k.bon - 0.04); ctx.lineTo(rx0 + 0.28, -k.roof + 0.08); ctx.lineTo(rx1 - 0.36, -k.roof + 0.08); ctx.lineTo(rx1 + 0.2, -k.bon - 0.04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(shade(paint, L, 0)); ctx.fillRect((rx0 + rx1) / 2 - 0.05, -k.roof + 0.05, 0.1, k.roof - k.bon); // the B pillar
    ctx.fillStyle = css(mix(shade(paint, L, 1, { gloss: 1 }), [255, 255, 255], 0.3), 0.6); ctx.fillRect(x0 + 0.3, -k.bon + 0.06, k.l - 0.9, 0.05); // shoulder highlight
    // wheels and arches
    for (const wx of [x0 + 0.85, x1 - 0.85]) {
      ctx.fillStyle = 'rgba(10,10,12,0.9)'; ctx.beginPath(); ctx.arc(wx, gy, wr + 0.06, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#16161a'; ctx.beginPath(); ctx.arc(wx, gy, wr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = css(shade([170, 172, 176], L, 0.3, { gloss: 0.5 })); ctx.beginPath(); ctx.arc(wx, gy, wr * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = css([40, 40, 44]); ctx.lineWidth = 0.05; const a = t * 12;
      ctx.beginPath(); for (let i = 0; i < 5; i++) { const b = a + i * 1.2566; ctx.moveTo(wx, gy); ctx.lineTo(wx + Math.cos(b) * wr * 0.55, gy + Math.sin(b) * wr * 0.55); } ctx.stroke();
    }
    // contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 + 0.2, -0.04, k.l - 0.4, 0.06);
    // lights: dim lenses by day, lit after dark
    const on = L.windows > 0.25 ? 1 : 0;
    ctx.fillStyle = on ? 'rgba(255,248,226,1)' : css(shade([220, 220, 210], L, 0.3)); ctx.fillRect(x1 - 0.14, -k.bon + 0.1, 0.12, 0.16);
    ctx.fillStyle = on ? 'rgba(255,40,30,1)' : css(shade([150, 30, 30], L, 0)); ctx.fillRect(x0 + 0.01, -k.bh - 0.02, 0.1, 0.16);
    if (on) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const bm = ctx.createLinearGradient(x1, 0, x1 + 1.9, 0); bm.addColorStop(0, 'rgba(255,240,210,0.55)'); bm.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = bm; ctx.beginPath(); ctx.moveTo(x1, -k.bon + 0.16); ctx.lineTo(x1 + 1.9, -k.bon + 0.05); ctx.lineTo(x1 + 1.9, 0); ctx.lineTo(x1, -k.bon + 0.3); ctx.closePath(); ctx.fill();
      ctx.restore();
      glow(ctx, x1 - 0.05, -k.bon + 0.18, 0.7, [255, 244, 220], 0.8); glow(ctx, x0 + 0.05, -k.bh + 0.06, 0.6, [255, 40, 30], 0.7);
    }
  },
};
