// The defence family's helpers on top of the machines kit (src/assets/sea/_lib.js).
export * from '../sea/_lib.js';
import { css, mix, shade, vgrad, rng, rimColour, exhaust, flicker, FLAME, mat, WHITE } from '../sea/_lib.js';

export const GUNMETAL = [92, 98, 104];
export const CONCRETE = [150, 146, 138];

// A soft smoke or steam puff, lit a little brighter on top.
export function puff(ctx, x, y, r, c, a) {
  if (a <= 0.01 || r <= 0) return;
  const g = ctx.createRadialGradient(x - r * 0.15, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, css(mix(c, WHITE, 0.12), a)); g.addColorStop(0.55, css(c, a * 0.68)); g.addColorStop(1, css(c, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// A small missile pointing along +x from the origin of the current transform, nozzle at x = 0, with its flame.
export function dart(ctx, o, len, kind = 'siso', flame = 1) {
  const L = o.L, r = len * 0.07, body = kind === 'enemy' ? [64, 66, 70] : [226, 230, 236];
  if (flame > 0) exhaust(ctx, 0, 0, len * 1.1 * flicker(o.t || 0, 3, 37), r * 1.1, kind === 'enemy' ? FLAME.enemy : FLAME.siso, flame, { night: L.night, bloom: 1.4 });
  ctx.fillStyle = vgrad(ctx, -r, r, [[0, shade(body, L, 1)], [0.4, shade(body, L, 0.2)], [1, shade(body, L, -1)]]);
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(len * 0.8, -r); ctx.quadraticCurveTo(len * 0.95, -r * 0.7, len, 0);
  ctx.quadraticCurveTo(len * 0.95, r * 0.7, len * 0.8, r); ctx.lineTo(0, r); ctx.closePath(); ctx.fill();
  ctx.fillStyle = mat(body, L, -0.4);
  ctx.beginPath(); ctx.moveTo(len * 0.12, -r); ctx.lineTo(-len * 0.02, -r * 2.6); ctx.lineTo(-len * 0.06, -r); ctx.fill();
}

// A box with a lit top and a sloped front, used for bases and housings.
export function block(g, o, x0, y0, x1, y1, base, { topH = 0.6, slope = 0 } = {}) {
  const L = o.L;
  const P = new Path2D(`M${x0} ${y1} L${x0} ${y0} L${x1 - slope} ${y0} L${x1} ${y0 + Math.min(slope * 1.2, (y1 - y0) * 0.6)} L${x1} ${y1} Z`);
  g.fillStyle = vgrad(g, y0, y1, [[0, shade(base, L, 0.25)], [1, shade(base, L, -0.35)]]);
  g.fill(P);
  g.fillStyle = css(shade(base, L, 0.15 + 0.7 * L.keyHeight), 1);
  g.fillRect(x0, y0, x1 - x0 - slope, topH);
  return P;
}

export const OLIVE = [114, 120, 85];

export function contact(g, x, y, w, h) {
  g.fillStyle = vgrad(g, y, y + h, [[0, [11, 14, 17], 0], [0.52, [11, 14, 17], 0.76], [1, [11, 14, 17], 0]]);
  g.beginPath(); g.ellipse(x, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
}

// Broad faded paint and fine scuffs share the panel's silhouette and lighting.
export function armour(g, o, path, x, y, w, h, seed, base = OLIVE) {
  const L = o.L;
  g.save(); g.clip(path);
  const facing = g.createLinearGradient(x + w * (o.lit > 0 ? 1 : 0), y, x + w * (o.lit > 0 ? 0 : 1), y + h);
  facing.addColorStop(0, css(shade(base, L, 0.93)));
  facing.addColorStop(0.55, css(shade(base, L, 0.25)));
  facing.addColorStop(1, css(shade(base, L, -0.65)));
  g.fillStyle = facing; g.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < 8; i++) {
    const cx = x + w * (i + r()) / 8, cy = y + h * r(), a = w * (0.08 + r() * 0.13), b = h * (0.2 + r() * 0.4);
    const paint = i % 3 === 0 ? [152, 132, 94] : i % 3 === 1 ? [60, 68, 50] : [99, 106, 76];
    g.fillStyle = css(shade(paint, L, 0.05 + 0.55 * (1 - (cy - y) / h) + o.lit * (cx - x - w / 2) / w * 0.5), 0.72);
    g.beginPath(); g.moveTo(cx - a, cy - b * 0.2);
    g.bezierCurveTo(cx - a * 0.9, cy - b, cx - a * 0.12, cy - b * 0.45, cx + a * 0.2, cy - b);
    g.bezierCurveTo(cx + a * 0.55, cy - b * 0.8, cx + a * 0.1, cy - b * 0.3, cx + a, cy + b * 0.2);
    g.bezierCurveTo(cx + a * 0.5, cy + b, cx - a * 0.2, cy + b * 0.4, cx - a, cy + b * 0.25);
    g.fill();
  }
  scuffs(g, o, x, y, w, h, seed);
  g.restore();
}

export function scuffs(g, o, x, y, w, h, seed) {
  const r = rng(seed);
  const scratches = new Path2D(), pits = new Path2D();
  for (let i = 0; i < 96; i++) {
    const sx = x + w * r(), sy = y + h * r();
    (i % 3 ? pits : scratches).rect(sx, sy, 0.04 + 0.4 * r() ** 2, 0.04 + 0.25 * r() ** 3);
  }
  g.fillStyle = css([20, 17, 14], 0.3); g.fill(pits);
  g.fillStyle = css(rimColour(o.L), 0.36 * o.L.keyAmt); g.fill(scratches);
}

export function billow(g, o, x, y, r, color, opacity, phase) {
  if (opacity < 0.015 || r < 0.2) return;
  const side = o.lit || 1;
  const lobes = o.scale < 0.65 ? 2 : 3;
  for (let i = 0; i < lobes; i++) {
    const angle = phase + i * 2.4;
    const rad = r * (0.57 + i * 0.12 + 0.09 * Math.sin(phase * 3 + i));
    const cx = x + r * 0.39 * Math.cos(angle), cy = y + r * 0.35 * Math.sin(angle);
    const gradient = g.createRadialGradient(cx + side * rad * 0.22, cy - rad * 0.3, 0, cx, cy, rad);
    gradient.addColorStop(0, css(mix(color, WHITE, 0.2), opacity));
    gradient.addColorStop(0.45, css(color, opacity * 0.95));
    gradient.addColorStop(0.76, css(mix(color, [32, 31, 37], 0.38), opacity * 0.62));
    gradient.addColorStop(1, css(color, 0));
    g.fillStyle = gradient; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
}
