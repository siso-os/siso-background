// A tower crane: a lattice mast, the cab and slewing ring, a long jib and a short counter-jib with its concrete
// weights, pendant ties to the apex. build swings the jib round (foreshortened as it turns) and runs the hook up and down
// with a beam on it; idle stands still with the hook hauled up. Red lights on the apex and the jib tip.
import { cached, css, mix, shade, glow, rimColour, rng } from './_lib.js';

const W = 170, H = 190, MAST = 152, JIB = 76, CJ = 26, APEX = 16;
const COLS = [[232, 182, 40], [214, 70, 50], [236, 236, 230]];

function lattice(g, x0, y0, x1, y1, w, step) { // a lattice strip from (x0,y0) to (x1,y1) of width w
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < 0.5) return;
  const nx = -dy / len * w / 2, ny = dx / len * w / 2, n = Math.max(1, Math.round(len / step));
  g.beginPath();
  g.moveTo(x0 + nx, y0 + ny); g.lineTo(x1 + nx, y1 + ny); g.moveTo(x0 - nx, y0 - ny); g.lineTo(x1 - nx, y1 - ny);
  for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n, s = i % 2 ? 1 : -1; g.moveTo(x0 + dx * a + nx * s, y0 + dy * a + ny * s); g.lineTo(x0 + dx * b - nx * s, y0 + dy * b - ny * s); }
  g.stroke();
}

function mast(g, o, col) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  g.lineWidth = 0.55; g.strokeStyle = css(shade(col, L, 0.1));
  lattice(g, 0, 0, 0, -MAST, 4.2, 4.2);
  g.strokeStyle = css(rimColour(L), 0.3 + 0.4 * L.golden); g.beginPath(); g.moveTo(lit * 2.1, 0); g.lineTo(lit * 2.1, -MAST); g.stroke();
  g.fillStyle = css(shade([150, 146, 140], L, 0.2)); g.fillRect(-6, -2.5, 12, 2.5); // the footing
}

export default {
  id: 'city.crane',
  family: 'city',
  title: 'Tower crane',
  about: 'A tower crane, 150 tall with a 76 jib: lattice mast, cab, counter-weights. build swings the jib and runs the hook with a beam on it; idle stands still. Red lights at night.',
  w: W, h: H,
  states: ['idle', 'build'],
  loop: 18, variants: 3,
  ref: 'refs/options/option-a-golden.webp',
  draw(ctx, o) {
    const L = o.L, t = o.t || 0, seed = o.seed | 0, lit = o.lit >= 0 ? 1 : -1, col = COLS[Math.abs(seed) % COLS.length];
    ctx.drawImage(cached(`city.crane|mast|${seed % 3}|${L.q}|${lit}`, W, H, o.scale || 1, (g) => mast(g, o, col)), -W / 2, -H, W, H);
    const build = o.state === 'build', r = rng(seed * 5 + 1);
    const ang = build ? 1.1 * Math.sin(t * 0.35 + r() * 6) : 0.25 * (r() - 0.5), c = Math.cos(ang);
    const jy = -MAST - 3, top = jy - APEX;
    // counter-jib, weights, cab, jib, pendants: the jib's far half is drawn thinner as it turns away
    ctx.lineWidth = 0.5; ctx.strokeStyle = css(shade(col, L, 0.2 * lit * Math.sign(c)));
    lattice(ctx, 0, jy, -CJ * c, jy, 3, 3.4);
    ctx.fillStyle = css(shade([150, 148, 142], L, 0.3)); ctx.fillRect(c >= 0 ? -CJ * c : -CJ * c - 6, jy - 1, 6, 6);
    lattice(ctx, 0, jy, JIB * c, jy, 2.6, 3.4);
    ctx.strokeStyle = css(shade(col, L, 0.4)); lattice(ctx, 0, jy, 0, top, 2.4, 3);
    ctx.strokeStyle = css(shade([70, 70, 72], L, 0)); ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(JIB * c * 0.7, jy - 1.3); ctx.moveTo(0, top); ctx.lineTo(-CJ * c, jy - 1.5); ctx.stroke();
    ctx.fillStyle = css(shade([60, 62, 66], L, 0.3 * lit)); ctx.fillRect(1.2 * Math.sign(c || 1) - 2, jy + 1.4, 4, 3.6); // cab
    ctx.fillStyle = css(mix(shade([110, 150, 170], L, 0, { gloss: 0.6 }), [255, 220, 160], L.windows)); ctx.fillRect(1.2 * Math.sign(c || 1) - 1.4, jy + 2, 2.8, 1.6);
    // trolley, hoist rope, hook and load
    const f = build ? 0.45 + 0.35 * Math.sin(t * 0.21 + 1) : 0.35, drop = build ? 30 + 70 * (0.5 + 0.5 * Math.sin(t * 0.5)) : 12;
    const hx = JIB * c * f, hy = jy + 2 + drop;
    ctx.strokeStyle = css(shade([50, 50, 52], L, 0), 0.9); ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(hx - 0.3, jy + 1.5); ctx.lineTo(hx - 0.3, hy); ctx.moveTo(hx + 0.3, jy + 1.5); ctx.lineTo(hx + 0.3, hy); ctx.stroke();
    ctx.fillStyle = css(shade(col, L, 0.3)); ctx.fillRect(hx - 0.9, hy, 1.8, 1.4);
    if (build) { // a steel beam on two slings
      ctx.strokeStyle = css(shade([50, 50, 52], L, 0)); ctx.beginPath(); ctx.moveTo(hx, hy + 1.4); ctx.lineTo(hx - 6, hy + 5); ctx.moveTo(hx, hy + 1.4); ctx.lineTo(hx + 6, hy + 5); ctx.stroke();
      const sw = 14 * (0.4 + 0.6 * Math.abs(Math.cos(ang * 1.7 + t * 0.2)));
      ctx.fillStyle = css(shade([150, 70, 50], L, 0.3 * lit)); ctx.fillRect(hx - sw / 2, hy + 5, sw, 1.4);
    }
    // aircraft warning lights on the apex and jib tip
    const on = ((t * 0.8 + seed * 0.3) % 1) < 0.2;
    if (on || L.windows > 0.3) { glow(ctx, 0, top - 0.5, on ? 4 : 2, [255, 40, 30], on ? 0.95 : 0.4); glow(ctx, JIB * c, jy, on ? 3.5 : 2, [255, 40, 30], on ? 0.9 : 0.35); }
    if (build && L.windows > 0.25) glow(ctx, hx, jy + 3, 9, [255, 240, 210], 0.35 * L.windows); // a work lamp under the trolley
  },
};
