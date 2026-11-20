// A strike on the SISO shield, once over 1.2 s: a white-hot point, a soft wavefront of light racing out across the
// field (as in option-d-storm), the shield's hex cells showing faintly and patchily where the wave passes, and
// branching crackles of discharge crawling over the surface. Nothing is a drawn line or a perfect ring: it should
// read as energy in a surface, not a target on a screen. A few sparks skate off. o.tilt lays it on the dome (0.9).
import { rng, clamp, smooth, ease, bloom, streak, css, lod, ih, TAU } from './_lib.js';

const CY = -120;
const HEXR = 9;
let HEX = null;
function hexCells() { // axial hex grid, flat-top, within a radius of 8 rings
  if (HEX) return HEX;
  HEX = [];
  for (let qq = -9; qq <= 9; qq++) for (let rr = -9; rr <= 9; rr++) {
    if (Math.abs(qq + rr) > 9) continue;
    const x = HEXR * 1.5 * qq, y = HEXR * Math.sqrt(3) * (rr + qq / 2);
    HEX.push([x, y, Math.hypot(x, y)]);
  }
  return HEX;
}

export function shieldHit(ctx, o, { p = 0.5, seed = 0, tilt = 0.9, S = 1, cy = CY } = {}) {
  const T = p * 1.2, r = rng(seed * 7 + 1), q = lod(o);
  const blue = [110, 196, 255], pale = [200, 236, 255];
  const k = 1 - p, rw = 112 * ease.out(Math.min(1, p * 1.25)) * S;
  ctx.save(); ctx.translate(0, cy); ctx.scale(1, tilt);
  ctx.globalCompositeOperation = 'screen';
  // the field itself brightens under the strike
  bloom(ctx, 0, 0, 150 * S, blue, 0.52 * k * k);
  // hex cells: faint, patchy (each cell has its own charge), lit only where the wave is; bucketed into few strokes
  if (q > 0.4) {
    const buckets = [[], [], [], []];
    hexCells().forEach(([x, y, d], n) => {
      const dd = d * S, patch = 0.35 + 0.65 * ih(n, 3, seed);
      const a = (Math.exp(-(((dd - rw) / (12 * S)) ** 2)) * 0.8 + Math.exp(-dd / (20 * S)) * 0.5 * k) * Math.pow(k, 1.2) * smooth(118 * S, 70 * S, dd) * patch;
      if (a < 0.06) return;
      buckets[Math.min(3, Math.floor(a * 4))].push([x * S, y * S]);
    });
    ctx.lineWidth = 0.5 * S;
    buckets.forEach((cells, b) => {
      if (!cells.length) return;
      ctx.strokeStyle = css(blue, (b + 0.5) / 4 * 0.45);
      ctx.beginPath();
      for (const [x, y] of cells) {
        const R = HEXR * S * 0.9;
        for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU; const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      }
      ctx.stroke();
    });
  }
  // the wavefront: a soft band of light, bright at its leading edge, smeared behind (no stroked circle)
  for (let i = 0; i < 3; i++) {
    const radius = 112 * S * ease.out(clamp((p - i * 0.055) * 1.25));
    if (radius < 2) continue;
    const width = (5.5 + 11 * p + i * 2) * S;
    const x = Math.sin(seed + i * 1.8) * radius * 0.042;
    const y = Math.cos(seed * 0.5 + i * 1.3) * radius * 0.065;
    const outer = radius + width * 0.44, inner = Math.max(0, radius - width);
    const g = ctx.createRadialGradient(x, y, inner, x, y, outer);
    const intensity = k * (0.57 + 0.43 * o.L.night) / (1 + i * 0.32);
    g.addColorStop(0, css(blue, 0));
    g.addColorStop(0.51, css(blue, 0.24 * intensity));
    g.addColorStop(0.78, css(pale, 0.48 * intensity));
    g.addColorStop(1, css(blue, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, outer, 0, TAU);
    ctx.fill();
  }
  // crackles: branching discharge crawling out over the surface, re-struck every 1/24 s, dying with the hit
  const nc = Math.round(7 * (0.5 + 0.5 * q)), fr = Math.floor(T * 24);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let c = 0; c < nc; c++) {
    const life = 0.35 + 0.5 * ih(c, 4, seed);
    if (T > life) continue;
    const kk = 1 - T / life, ang0 = ih(c, 5, seed) * TAU, reach = rw * (0.55 + 0.45 * ih(c, 6, seed)) + 8 * S;
    const pts = [[0, 0]];
    let ang = ang0;
    for (let i = 1; i <= 7; i++) {
      ang += (ih(c * 13 + i, fr, seed) - 0.5) * 1.1;
      const d = reach * (i / 7);
      pts.push([Math.cos(ang) * d, Math.sin(ang) * d]);
    }
    for (const [lw, al, col] of [[3.2, 0.12, blue], [0.6, 0.62, pale]]) {
      ctx.strokeStyle = css(col, al * kk); ctx.lineWidth = lw * S;
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      // a side branch off the middle
      const m = pts[3 + (c % 3)], ba = ang0 + (ih(c, fr, 9) - 0.5) * 2.4, bl = reach * 0.35;
      ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0] + Math.cos(ba) * bl * 0.5 + (ih(c, fr, 11) - 0.5) * 4 * S, m[1] + Math.sin(ba) * bl * 0.5); ctx.lineTo(m[0] + Math.cos(ba) * bl, m[1] + Math.sin(ba) * bl);
      ctx.stroke();
    }
  }
  ctx.restore();
  // the point of impact (not squashed)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const hot = Math.exp(-T / 0.18);
  bloom(ctx, 0, cy, 76 * S, blue, (0.43 + 0.44 * o.L.night) * k);
  bloom(ctx, 0, cy, 28 * S, pale, 0.84 * k + hot * 0.28);
  bloom(ctx, 0, cy, 10 * S, [255, 255, 255], k);
  bloom(ctx, 0, cy, 22 * S, [255, 160, 70], hot * 0.8); // the warhead's own fire, for an instant
  const ns = Math.round(14 * q);
  for (let i = 0; i < ns; i++) {
    const ang = r() * TAU, sp = (90 + r() * 160) * S, life = 0.25 + r() * 0.4;
    if (T > life) continue;
    const d1 = sp * T, d0 = sp * Math.max(0, T - 0.05), kk = 1 - T / life;
    streak(ctx, Math.cos(ang) * d0, cy + Math.sin(ang) * d0 * tilt, Math.cos(ang) * d1, cy + Math.sin(ang) * d1 * tilt, 1 * S, pale, kk);
  }
  ctx.restore();
}

export default {
  id: 'fx.shield-hit', family: 'fx', title: 'Shield hit',
  about: 'A strike on the SISO shield, once over 1.2 s by o.p: a white-hot point, a soft wavefront racing out, faint patchy hex cells where it passes, branching crackles of discharge over the surface. o.tilt (default 0.9) lays it on the dome; o.size scales it.',
  w: 256, h: 256, states: ['hit'], loop: 0, once: { hit: 1.2 }, variants: 1,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    const s = o.size ?? 1;
    shieldHit(ctx, o, { p: clamp(o.p ?? 0.5), seed: o.seed || 0, tilt: o.tilt ?? 0.9, S: s, cy: CY * s });
    ctx.restore();
  },
};
