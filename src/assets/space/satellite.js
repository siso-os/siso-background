// A satellite: a box wrapped in crinkled gold foil that throws back the sun in hot patches, two dark solar wings on
// booms, a white dish and whip antennas, a thruster cluster; a white strobe. It tumbles very slowly, so the glints
// on the foil and the wings come and go. Hard sun from o.lit.
import { css, mix, cached, sun, lc, cylX, bloom, nav, vn, ih, TAU, canvas, clamp } from './_lib.js';

const W = 128, H = 64, CY = -32;
const GOLD = [214, 160, 64], CELL = [30, 40, 82], WHITE = [228, 226, 220];

const FOIL = new Map();
function foil(seed, side) {
  // crinkled gold foil: facets of noise, each catching the sun differently
  const k = seed + '|' + side;
  if (FOIL.has(k)) return FOIL.get(k);
  const N = 96, c = canvas(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = vn(i / 3, j / 3, seed + 3), b = vn(i / 1.3, j / 1.3, seed + 9);
    const facet = Math.pow(clamp(a * 0.6 + b * 0.4), 4) * 3.2;
    const crease = Math.abs(vn(i / 3.5, j / 3.5, seed + 5) - 0.5) < 0.04 ? 0.5 : 1;
    const face = side * (i / N - 0.5);
    const folds = Math.abs(Math.sin(i * 0.46 + j * 0.08 + a * 2)) ** 9;
    const v = (0.24 + facet * 0.61 + folds * 0.48) * (0.70 + 0.62 * face) * crease;
    const o4 = (j * N + i) * 4;
    d[o4] = clamp(GOLD[0] * v / 255) * 255; d[o4 + 1] = clamp(GOLD[1] * v / 255) * 255; d[o4 + 2] = clamp(GOLD[2] * v * 0.8 / 255) * 255; d[o4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  FOIL.set(k, c); return c;
}

function body(g, S, seed) {
  // booms
  g.fillStyle = css(lc([160, 156, 150], S, 0.4)); g.fillRect(-40, CY - 0.6, 80, 1.2);
  // the bus: foil front, a shaded side
  g.drawImage(foil(seed, S.side), -11, CY - 9, 22, 18);
  g.fillStyle = css(lc(GOLD, S, 0.7, { spec: 0.3 }));
  g.beginPath(); g.moveTo(-11, CY - 9); g.lineTo(-6, CY - 13); g.lineTo(15, CY - 13); g.lineTo(11, CY - 9); g.fill();
  g.fillStyle = css(lc(GOLD, S, S.side > 0 ? 0.91 : -0.6, { spec: 0.25 }));
  g.beginPath(); g.moveTo(11, CY - 9); g.lineTo(15, CY - 13); g.lineTo(15, CY + 5); g.lineTo(11, CY + 9); g.fill();
  for (const y of [CY - 6, CY + 5]) {
    g.fillStyle = 'rgba(32,18,10,0.75)'; g.fillRect(-12, y, 24, 0.9);
    g.fillStyle = css(lc(GOLD, S, 0.78), 0.7); g.fillRect(-12, y - 0.4, 24, 0.4);
  }
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-11, CY + 8, 22, 1);
  // a white dish on top, and whip antennas
  g.save(); g.translate(2, CY - 13); g.rotate(-0.35);
  g.fillStyle = cylX(g, -8, 8, WHITE, S, { spec: 0.7 }); g.beginPath(); g.ellipse(0, 0, 8, 3, 0, 0, TAU); g.fill();
  g.fillStyle = css(lc(WHITE, S, -0.2)); g.beginPath(); g.ellipse(0, 0.6, 7, 2.2, 0, 0, Math.PI); g.fill();
  g.restore();
  g.fillStyle = css(lc(WHITE, S, 0.3)); g.fillRect(1.5, CY - 12, 1, 4);
  g.strokeStyle = css(lc(WHITE, S, 0.4)); g.lineWidth = 0.4;
  g.beginPath(); g.moveTo(-8, CY + 9); g.lineTo(-14, CY + 22); g.moveTo(8, CY + 9); g.lineTo(13, CY + 20); g.stroke();
  // thrusters
  g.fillStyle = css(lc([90, 90, 96], S, 0.3)); g.fillRect(-4, CY + 9, 3, 2.5); g.fillRect(1, CY + 9, 3, 2.5);
}

export default {
  id: 'space.satellite', family: 'space', title: 'Satellite',
  about: 'A satellite: a gold-foil bus that throws back the sun in hot patches, two dark solar wings on booms, a white dish, whip antennas, thrusters, a white strobe. Tumbles very slowly so its glints come and go. Hard sun from o.lit.',
  w: W, h: H, states: ['idle'], loop: 40, once: {}, variants: 3,
  ref: 'refs/slice/vertical-slice.webp',
  draw(ctx, o) {
    ctx.save();
    const S = sun(o.L, o.lit ?? o.L.side), t = o.t || 0, seed = ((o.seed || 0) % 3 + 3) % 3;
    const roll = Math.sin((t / 40) * TAU + seed) * 0.08;
    ctx.translate(0, CY); ctx.rotate(roll); ctx.translate(0, -CY);
    // wings: their tilt to the sun decides how bright and when they glint
    const tilt = Math.sin((t / 40) * TAU * 2 + seed * 2);
    for (const sx of [-1, 1]) {
      const pw = 42, ph = 15 + tilt * 3;
      ctx.save();
      ctx.translate(sx * 17, CY - 0.5);
      ctx.transform(sx, sx * 0.10 + tilt * 0.08, -0.23 * sx, 1, 0, 0);
      const face = clamp(0.31 + 0.26 * tilt + 0.28 * sx * S.side);
      const cell = lc(CELL, S, face);
      ctx.fillStyle = css(lc([115, 103, 86], S, face * 0.7));
      ctx.fillRect(0, -ph / 2, pw, ph);
      ctx.fillStyle = '#080c16'; ctx.fillRect(0.55, -ph / 2 + 0.55, pw - 1.1, ph - 1.1);
      for (let col = 0; col < 6; col++) for (let row = 0; row < 2; row++) {
        const y = row * (ph / 2) - ph / 2, shade = ih(col, row, seed + sx);
        ctx.fillStyle = css(mix(cell, [50, 69, 117], 0.02 + shade * (0.08 + 0.22 * face)));
        const left = col * 7 + 0.65;
        ctx.fillRect(left, y + 0.65, 6.1, ph / 2 - 1.05);
        if (o.scale > 0.5) {
          ctx.fillStyle = css([111, 145, 202], 0.22 * face);
          for (let ribbon = 1; ribbon <= 3; ribbon++) {
            ctx.fillRect(left + ribbon * 1.55, y + 0.65, 0.15, ph / 2 - 1.05);
          }
        }
      }
      const shift = 7 + (0.5 + tilt * 0.5) * 28, sheen = ctx.createLinearGradient(shift - 14, -ph, shift + 9, ph);
      const glint = (0.13 + 0.64 * Math.max(0, tilt) ** 8) * (0.34 + 0.85 * face);
      sheen.addColorStop(0, css([114, 163, 237], 0));
      sheen.addColorStop(0.45, css([114, 163, 237], glint * 0.45));
      sheen.addColorStop(0.55, css([205, 230, 255], glint * 0.68));
      sheen.addColorStop(1, css([114, 163, 237], 0));
      ctx.fillStyle = sheen; ctx.fillRect(0.6, -ph / 2 + 0.6, pw - 1.2, ph - 1.2);
      // The metal leading rail catches a little scattered light even when the cells face away.
      ctx.fillStyle = css([137, 161, 188], 0.20 + 0.15 * face);
      ctx.fillRect(1.2, -ph / 2, pw - 2.4, 0.65);
      ctx.restore();
    }
    const c = cached(`space.satellite|${seed}|${S.q}`, W, H, (o.scale || 1) * (globalThis.devicePixelRatio || 1), (g) => body(g, S, seed));
    ctx.drawImage(c, -W / 2, -H, W, H);
    // foil glints move with the tumble
    const gx = Math.sin(t * 0.4 + seed) * 7, gy = Math.cos(t * 0.3 + seed) * 5;
    bloom(ctx, gx, CY + gy, 6, [255, 226, 160], 0.5 * (0.5 + 0.5 * Math.sin(t * 0.9 + seed)));
    nav(ctx, 0, CY - 18, [255, 255, 255], t, { period: 2.2, phase: seed * 0.3, r: 2.6, duty: 0.06 });
    ctx.restore();
  },
};
