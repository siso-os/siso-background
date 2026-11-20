// The boat finish kit, for the sea family only (sea/_lib is shared with air and defence, so this lives apart). What
// makes a painted hull read as a photographed one: the topsides curve, so one light gives a gradient along and down the
// hull and a hot specular line on the sheer; the boot stripe at the waterline is dark and wet; glass is a mirror of the
// sky (dark above, the bright horizon a little under the middle, dark water below it) until the cabin lights come on;
// every overhang throws a soft shadow; rails and antennas are hair-thin and bright. All baked with the static body.
import { css, mix, scale, shade, clamp, smooth, vgrad, hgrad, rng, WHITE } from './_lib.js';

// units of the drawing per device pixel of g (bodies are baked at 0.25 to 15 px a unit)
export const pxOf = (g) => 1 / (Math.hypot(g.getTransform().a, g.getTransform().b) || 1);
// 0 all day (the windows idle at 0.04 to 0.06 by day), 1 once it is dark
export const dusk = (L) => smooth(0.1, 0.6, L.windows);

// hullForm: lay the form of a hull over its flat fill. sheer(c) traces the sheer line from stern to bow (the bow is +x);
// wl is the waterline's y. Call after the hull's own fill and stripes, before its rim.
export function hullForm(g, path, o, { x0, x1, y0, y1, sheer, wl = 0, boot = 0.9 }) {
  const L = o.L, bowLit = o.lit >= 0, ka = L.keyAmt * (1 - 0.75 * L.night), px = pxOf(g);
  const hot = mix(L.key, WHITE, 0.45), len = x1 - x0;
  g.save(); g.clip(path);
  // along the hull: the stern quarter falls into shadow, the flare of the bow turns toward the light or away from it
  g.fillStyle = hgrad(g, x0, x1, bowLit
    ? [[0, [0, 0, 0], 0.3], [0.22, [0, 0, 0], 0.1], [0.55, [0, 0, 0], 0], [0.84, hot, 0.14 * ka], [0.95, hot, 0.22 * ka], [1, [0, 0, 0], 0.1]]
    : [[0, hot, 0.12 * ka], [0.12, [0, 0, 0], 0], [0.5, [0, 0, 0], 0.06], [0.82, [0, 0, 0], 0.22], [1, [0, 0, 0], 0.4]]);
  g.fillRect(x0, y0, len, y1 - y0);
  // down the hull: the topsides' upper curve mirrors the sky; below the turn it mirrors dark water; just above the
  // waterline a faint lift of light thrown back off the sea
  const sky = mix(L.sky.horizon, L.sky.top, 0.3), mid = (y0 + wl) / 2;
  g.fillStyle = vgrad(g, mid, wl, [[0, [0, 0, 0], 0], [0.75, [0, 0, 0], 0.22], [0.92, [0, 0, 0], 0.16], [1, sky, 0.1]]);
  g.fillRect(x0, mid, len, wl - mid);
  if (sheer) {
    const w = Math.max(1.0, 1.6 * px);
    g.save(); g.translate(0, w * 0.75); g.filter = `blur(${Math.max(0.5, (w * 0.4) / px).toFixed(2)}px)`;
    g.strokeStyle = css(mix(sky, WHITE, 0.2), 0.2 * (1 - 0.6 * L.night)); g.lineWidth = w;
    g.beginPath(); sheer(g); g.stroke(); g.restore();
  }
  // the wet boot stripe: dark and glossy, a thin wet gleam along its top edge
  g.fillStyle = vgrad(g, wl - boot, wl + 0.6, [[0, [6, 8, 12], 0.5], [1, [6, 8, 12], 0.72]]);
  g.fillRect(x0, wl - boot, len, boot + 4);
  g.fillStyle = css(mix(sky, WHITE, 0.3), 0.22 * (1 - 0.5 * L.night));
  g.fillRect(x0, wl - boot - Math.max(0.08, 0.5 * px), len, Math.max(0.1, 0.6 * px));
  g.restore();
  // the specular sheer: a hot line, strongest where the bow's curve faces the light; a cold moon sheen after dark
  if (sheer) {
    const k = clamp((0.25 + 0.55 * L.golden + 0.3 * ka) * (1 - 0.7 * L.night) + 0.3 * L.night);
    const c = L.night > 0.5 ? mix(L.key, [210, 226, 255], 0.5) : hot;
    g.save();
    g.strokeStyle = hgrad(g, x0, x1, bowLit ? [[0, c, 0.25 * k], [0.7, c, 0.6 * k], [0.92, WHITE, 0.95 * k], [1, c, 0.5 * k]] : [[0, WHITE, 0.8 * k], [0.25, c, 0.55 * k], [1, c, 0.2 * k]]);
    g.lineWidth = Math.max(0.16, 0.85 * px); g.lineCap = 'round';
    g.beginPath(); sheer(g); g.stroke(); g.restore();
  }
}

// rake: the low sun's light laid over the whole painted boat last (source-atop keeps it on the boat). Warm on the end
// that faces the sun and up high, cool blue and darker toward the far end and down low: what gives a white boat at
// golden hour its range from gold to blue-grey, instead of one flat mauve. Fades out by noon and after dark.
export function rake(g, o, [x0, y0, x1, y1]) {
  const L = o.L, bowLit = o.lit >= 0, k = clamp(L.keyAmt * (0.35 + 0.65 * L.golden) * (1 - 0.85 * L.night));
  if (k < 0.02) return;
  const warm = mix(L.key, WHITE, 0.25), cool = mix(scale(L.sky.top, 0.6), [30, 50, 100], 0.45), w = x1 - x0, h = y1 - y0;
  const at = (u) => (bowLit ? u : 1 - u);
  g.save(); g.globalCompositeOperation = 'source-atop';
  g.fillStyle = hgrad(g, x0, x1, [[at(0), cool, 0.34 * k], [at(0.45), cool, 0.1 * k], [at(0.7), cool, 0], [at(1), cool, 0]].sort((a, b) => a[0] - b[0]));
  g.fillRect(x0, y0, w, h);
  g.fillStyle = hgrad(g, x0, x1, [[at(0), warm, 0], [at(0.4), warm, 0.04 * k], [at(0.85), warm, 0.2 * k], [at(1), warm, 0.26 * k]].sort((a, b) => a[0] - b[0]));
  g.fillRect(x0, y0, w, h);
  // the upper works see the sun over everything; the low hull is in the shade of the sea and the boat itself
  g.fillStyle = vgrad(g, y0, y1, [[0, warm, 0.1 * k], [0.55, warm, 0], [0.8, [0, 0, 0], 0], [1, [0, 0, 0], 0.18 * k]]);
  g.fillRect(x0, y0, w, h);
  g.restore();
}

// skyGlass: a window as a curved mirror of the sky, and a lit cabin after dark (some panes dark). Same call as the
// kit's glass(), plus cols for mullions.
export function skyGlass(g, o, x, y, w, h, { tint = [0, 0, 0], lit = 0, warm = [255, 200, 136], cols = 0, seed = 0 } = {}) {
  const L = o.L, n = dusk(L), px = pxOf(g);
  const top = mix(scale(L.sky.top, 0.5), tint, 0.3), hz = mix(L.sky.horizon, WHITE, 0.18 * (1 - L.night));
  const sea = mix(scale(mix(L.sky.top, L.haze, 0.4), 0.3), [6, 12, 18], 0.5);
  g.fillStyle = vgrad(g, y, y + h, [[0, scale(top, 0.75)], [0.46, mix(top, hz, 0.55)], [0.6, mix(hz, tint, 0.15)], [0.64, sea], [1, scale(sea, 0.7)]]);
  g.fillRect(x, y, w, h);
  // a soft diagonal sheen across the pane
  const sx = x + w * 0.3;
  g.fillStyle = hgrad(g, sx - h, sx + h * 1.5, [[0, WHITE, 0], [0.5, WHITE, 0.12 * (1 - 0.7 * L.night)], [1, WHITE, 0]]);
  g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + h * 0.8, y); g.lineTo(sx + h * 0.2, y + h); g.lineTo(sx - h * 0.6, y + h); g.closePath(); g.fill();
  // the cabin after dark: warm light, brightest under the ceiling; the odd pane dark
  if (lit > 0 && n > 0.02) {
    const panes = Math.max(1, cols), pw = w / panes, r = rng(seed * 131 + Math.round(x * 7 + y * 3));
    for (let i = 0; i < panes; i++) {
      if (panes > 2 && r() < 0.18) continue;
      const k = lit * n * (0.75 + 0.25 * r());
      g.fillStyle = vgrad(g, y, y + h, [[0, mix(warm, WHITE, 0.35), 0.95 * k], [0.45, warm, 0.9 * k], [1, scale(warm, 0.55), 0.85 * k]]);
      g.fillRect(x + i * pw, y, pw, h);
    }
  }
  // the frame's shadow over the top of the pane, and the mullions
  g.fillStyle = vgrad(g, y, y + Math.min(h * 0.35, 1.2), [[0, [0, 0, 0], 0.4], [1, [0, 0, 0], 0]]);
  g.fillRect(x, y, w, Math.min(h * 0.35, 1.2));
  if (cols > 1) {
    const mw = Math.max(0.12, 0.6 * px); g.fillStyle = css([14, 16, 20], 0.75);
    for (let i = 1; i < cols; i++) g.fillRect(x + (i * w) / cols - mw / 2, y, mw, h);
  }
}

// ledge: the soft shadow an overhang throws on the wall under it
export function ledge(g, x0, x1, y, d = 1.2, a = 0.35) {
  g.fillStyle = vgrad(g, y, y + d, [[0, [0, 0, 0], a], [1, [0, 0, 0], 0]]);
  g.fillRect(x0, y, x1 - x0, d);
}

// railing: hair-thin bright tubes (lines: [[x0, y0, x1, y1], ...]), held to about half a device pixel
export function railing(g, o, lines, k = 1) {
  const L = o.L, px = pxOf(g);
  g.save(); g.lineCap = 'round';
  g.strokeStyle = css(shade([214, 220, 228], L, 0.45, { gloss: 0.7 }), 0.9 * k); g.lineWidth = Math.max(0.1, 0.55 * px);
  g.beginPath(); for (const [a, b, c, d] of lines) { g.moveTo(a, b); g.lineTo(c, d); } g.stroke();
  g.restore();
}

// clutter: small deck things between x0 and x1 standing on y: bollards, a raft canister, coiled line, a locker
export function clutter(g, o, x0, x1, y, seed = 0, n = 4) {
  const L = o.L, r = rng(seed * 97 + 11), topF = 0.15 + 0.7 * L.keyHeight, lit = o.lit >= 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.2 + 0.6 * r()) * (x1 - x0) / n, kind = Math.floor(r() * 4);
    if (kind === 0) { // bollard
      g.fillStyle = css(shade([40, 42, 46], L, 0)); g.fillRect(x - 0.3, y - 0.7, 0.6, 0.7);
      g.fillStyle = css(shade([90, 94, 100], L, topF, { gloss: 0.5 })); g.fillRect(x - 0.4, y - 0.8, 0.8, 0.2);
    } else if (kind === 1) { // life-raft canister in its cradle
      g.fillStyle = css(shade([236, 238, 240], L, 0.1, { gloss: 0.3 })); g.beginPath(); g.ellipse(x, y - 0.75, 1.2, 0.55, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = css(shade([236, 238, 240], L, 0.8 * lit)); g.fillRect(x + (lit > 0 ? 0.5 : -0.9), y - 1.1, 0.4, 0.5);
      g.fillStyle = css([0, 0, 0], 0.3); g.fillRect(x - 1.1, y - 0.3, 2.2, 0.3);
    } else if (kind === 2) { // coiled line
      g.strokeStyle = css(shade([170, 146, 108], L, 0.2)); g.lineWidth = 0.18;
      g.beginPath(); g.ellipse(x, y - 0.22, 0.75, 0.2, 0, 0, Math.PI * 2); g.ellipse(x, y - 0.38, 0.6, 0.16, 0, 0, Math.PI * 2); g.stroke();
    } else { // a deck locker
      const w = 1.2 + r() * 1.2, h = 0.6 + r() * 0.5;
      g.fillStyle = css(shade([196, 200, 204], L, 0)); g.fillRect(x - w / 2, y - h, w, h);
      g.fillStyle = css(shade([196, 200, 204], L, topF, { gloss: 0.3 })); g.fillRect(x - w / 2, y - h, w, 0.16);
      g.fillStyle = css([0, 0, 0], 0.25); g.fillRect(x - w / 2, y - 0.15, w, 0.15);
    }
  }
}
