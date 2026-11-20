// A person about 1.75 tall in seeded clothes and skin tone, lit from the key side. idle shifts weight, run swings
// arms and legs in a stride, cheer throws both arms up and bounces.
import { css, mix, scale, shade, rng } from './_lib.js';

const SKIN = [[236, 196, 164], [210, 160, 120], [176, 120, 84], [130, 86, 58], [92, 60, 42]];
const CLOTH = [[40, 60, 110], [200, 60, 50], [230, 230, 224], [40, 40, 44], [90, 130, 70], [220, 180, 60], [120, 80, 140], [70, 140, 170], [160, 110, 80]];

export default {
  id: 'city.people',
  family: 'city',
  title: 'Person',
  about: 'One person, 1.6 to 1.9 tall, seeded clothes and skin: idle shifts weight, run strides, cheer throws arms up and bounces. Faces +x.',
  w: 2.4, h: 2.2,
  states: ['idle', 'run', 'cheer'],
  loop: 2, variants: 45,
  ref: 'refs/options/option-a-golden.webp',
  draw(ctx, o) {
    const L = o.L, t = o.t || 0, seed = o.seed | 0, r = rng(seed * 31 + 7), st = o.state || 'idle', lit = o.lit >= 0 ? 1 : -1;
    const hgt = 1.62 + r() * 0.28, skin = SKIN[Math.floor(r() * SKIN.length)], top = CLOTH[Math.floor(r() * CLOTH.length)], legs = CLOTH[Math.floor(r() * CLOTH.length)];
    const ph = t * (st === 'run' ? 9 : st === 'cheer' ? 7 : 1.3) + r() * 6;
    const u = hgt / 1.75, hip = -0.92 * u, sh = -1.42 * u, head = 0.12 * u;
    let bob = 0, lean = 0;
    if (st === 'run') { bob = -Math.abs(Math.sin(ph)) * 0.08; lean = 0.18; }
    if (st === 'cheer') bob = -Math.max(0, Math.sin(ph)) * 0.18;
    const limb = (x0, y0, a1, l1, a2, l2, col, w) => { // a two-segment limb, angles from straight down
      const x1 = x0 + Math.sin(a1) * l1, y1 = y0 + Math.cos(a1) * l1, x2 = x1 + Math.sin(a1 + a2) * l2, y2 = y1 + Math.cos(a1 + a2) * l2;
      ctx.strokeStyle = css(col); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const legC = shade(legs, L, 0), legF = shade(legs, L, 0.6 * lit), armB = shade(top, L, -0.2), armF = shade(top, L, 0.6 * lit);
    const hx = lean * 0.3, hy = hip + bob, sx = hx + lean * 0.5, sy = sh + bob;
    let la = [0.06, 0], lb = [-0.06, 0], aa = [0.15, -0.2], ab = [-0.15, -0.2];
    if (st === 'idle') { const s = Math.sin(ph) * 0.04; la = [0.05 + s, 0]; lb = [-0.05 + s, 0]; aa = [0.12, -0.1]; ab = [-0.12, -0.1]; }
    if (st === 'run') { const s = Math.sin(ph); la = [0.8 * s, s > 0 ? -0.3 : -1.2 * -s]; lb = [-0.8 * s, s < 0 ? -0.3 : -1.2 * s]; aa = [-0.9 * s, 1.4]; ab = [0.9 * s, 1.4]; }
    if (st === 'cheer') { const w = Math.sin(ph * 1.3) * 0.25; aa = [2.7 + w, 0.2]; ab = [-2.7 - w, -0.2]; la = [0.1, 0]; lb = [-0.1, 0]; }
    // back limbs, torso, head, front limbs
    limb(hx - 0.04, hy, lb[0], 0.46 * u, -Math.abs(lb[1]), 0.46 * u, legC, 0.17 * u);
    limb(sx - 0.05, sy + 0.05, ab[0], 0.3 * u, ab[1], 0.28 * u, armB, 0.12 * u);
    const tg = ctx.createLinearGradient(sx - 0.2, 0, sx + 0.2, 0);
    tg.addColorStop(0, css(shade(top, L, -0.5 * lit))); tg.addColorStop(1, css(shade(top, L, 0.7 * lit)));
    ctx.strokeStyle = tg; ctx.lineWidth = 0.34 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy - 0.05); ctx.lineTo(sx, sy + 0.08); ctx.stroke();
    const hg = ctx.createRadialGradient(sx + lean * 0.2 + lit * 0.04, sy - head - 0.05, 0.01, sx + lean * 0.2, sy - head, head);
    hg.addColorStop(0, css(shade(skin, L, 0.8 * lit))); hg.addColorStop(1, css(shade(scale(skin, 0.8), L, -0.3)));
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(sx + lean * 0.2, sy - head - 0.02, head, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = css(scale(skin, 0.3)); ctx.beginPath(); ctx.arc(sx + lean * 0.2 - 0.02, sy - head - 0.06, head * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); // hair
    limb(hx + 0.04, hy, la[0], 0.46 * u, -Math.abs(la[1]), 0.46 * u, legF, 0.17 * u);
    limb(sx + 0.05, sy + 0.05, aa[0], 0.3 * u, aa[1], 0.28 * u, armF, 0.12 * u);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-0.3, -0.02, 0.6, 0.04); // contact shadow
  },
};
