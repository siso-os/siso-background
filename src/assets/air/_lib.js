// The air family's helpers on top of the machines kit.
export * from '../sea/_lib.js';
import { css, mix, shade, vgrad, hgrad, rimColour, WHITE, TAU } from '../sea/_lib.js';

export function skin(g, path, o, base, { y0, y1, x0, x1, gloss = 0.3 }) {
  const L = o.L;
  const sky = shade(base, L, 0.68, { gloss });
  const top = shade(base, L, 0.93, { gloss: gloss * 0.65 });
  const mid = shade(base, L, 0.26, { gloss: gloss * 0.45 });
  const belly = shade(base, L, -0.9);
  g.fillStyle = vgrad(g, y0, y1, [[0, sky], [0.18, top], [0.42, mid],
    [0.81, belly], [1, mix(belly, L.haze, 0.15 + 0.16 * L.golden)]]);
  g.fill(path);
  const k = rimColour(L), lit = o.lit > 0;
  g.fillStyle = hgrad(g, x0, x1, lit ? [[0, [0, 0, 0], 0.16], [0.6, [0, 0, 0], 0], [1, k, 0.13 * L.keyAmt]]
    : [[0, k, 0.13 * L.keyAmt], [0.4, [0, 0, 0], 0], [1, [0, 0, 0], 0.16]]);
  g.fill(path);
}

export function canopy(g, path, o, { x0, x1, y0, y1, tint = [255, 200, 120], amt = 0.25 }) {
  const L = o.L, h = y1 - y0, w = x1 - x0;
  const sky = mix(L.sky.top, tint, amt);
  const horizon = mix(L.sky.horizon, tint, amt * 0.8);
  const dark = [8, 12, 18], night = 0.76 * L.night;
  g.fillStyle = vgrad(g, y0, y1, [[0, mix(sky, dark, 0.37 + night * 0.5)],
    [0.34, mix(horizon, dark, 0.42 + night * 0.7)], [0.47, mix(horizon, dark, 0.25 + night * 0.8)],
    [0.56, mix(sky, dark, 0.7 + night * 0.3)], [1, dark]]);
  g.fill(path);
  g.save();
  g.clip(path);
  const x = o.lit > 0 ? x0 + w * 0.7 : x0 + w * 0.34;
  const y = y0 + h * 0.28;
  g.strokeStyle = css(mix(rimColour(L), WHITE, 0.68), 0.82 - 0.57 * L.night);
  g.lineWidth = h * 0.07;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - w * 0.15, y + h * 0.04); g.quadraticCurveTo(x - w * 0.05, y - h * 0.06, x + w * 0.06, y); g.stroke();
  g.restore();
}

export function rotor(g, o, x, y, rx, ry, rate, blades) {
  const metal = mix(shade([63, 66, 71], o.L, 0.2), [10, 14, 18], 0.32);
  g.save();
  g.translate(x, y); g.scale(rx, ry);
  g.fillStyle = vgrad(g, -1, 1, [[0, metal, 0.04], [0.46, metal, 0.09], [0.84, metal, 0.27], [1, metal, 0.04]]);
  g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
  for (let i = 0; i < blades; i++) {
    const a = (o.t || 0) * rate + i * TAU / blades;
    g.fillStyle = css(metal, 0.29 + 0.19 * Math.sin(a));
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 0.98, a - 0.33, a); g.fill();
    g.strokeStyle = css(metal, 0.34);
    g.lineWidth = 0.052;
    g.beginPath(); g.arc(0, 0, 0.95, a - 0.54, a - 0.29); g.stroke();
    g.fillStyle = css(metal, 0.53);
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 0.97, a - 0.085, a); g.fill();
  }
  g.restore();
}

// Alternating compressed cells along a jet plume. The surrounding flame fades between them.
export function shockCells(g, x, y, len, r, pal, strength) {
  const fade = hgrad(g, x, x - len, [[0, pal.core, 0.92 * strength], [0.24, pal.core, 0.91 * strength],
    [0.59, pal.core, 0.43 * strength], [1, pal.mid, 0]]);
  g.fillStyle = fade;
  for (let i = 0; i < 4; i++) {
    const at = x - len * i * (0.23 - i * 0.013);
    const half = r * (0.61 - i * 0.115);
    g.beginPath(); g.moveTo(at, y);
    g.quadraticCurveTo(at - len * 0.058, y - half * 1.65, at - len * (0.195 - i * 0.018), y);
    g.quadraticCurveTo(at - len * 0.058, y + half * 1.65, at, y);
    g.fill();
  }
}
