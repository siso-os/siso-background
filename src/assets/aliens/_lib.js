// Shared material for the aliens (refs/elements/portal-aliens): strange but believable, wet and bioluminescent.
// Their bodies are translucent like deep-sea animals: the sky shows through the middle, the edges catch light
// (fresnel), organs glow cyan and green inside, and a wet specular streak sits on the side facing the sun.
// They live in our air, so they take the hour's light (paint.shade); their own glow does not care what hour it is
// but reads far more at night.
import { rng, clamp, lerp, smooth, ease as EASE } from '../../core/rng.js';
export const ease = (x) => EASE.inOut(clamp(x));
import { css, mix, shade } from '../../core/paint.js';
import { bloom, ih, vn, frac, TAU } from '../space/_lib.js';
export { rng, clamp, lerp, smooth, css, mix, shade, bloom, ih, vn, frac, TAU };

export const CYAN = [90, 232, 255], GREEN = [110, 255, 170], VIOLET = [176, 100, 255], SKIN = [34, 42, 50], BONE = [196, 196, 186];

// how strongly the glow reads at this hour: present by day, vivid at night
export const glowAmt = (L) => 0.55 + 0.45 * L.night;

// a translucent body: fill path() with a fresnel gradient (clear centre, lit rim), centred at x, y with radius r
export function jelly(ctx, path, L, x, y, r, { tint = CYAN, a = 1, lit = 1 } = {}) {
  const sky = mix(L.sky.horizon, L.sky.top, 0.4);
  const rim = mix(shade([210, 236, 246], L, 0.6), tint, 0.35 * glowAmt(L));
  const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
  g.addColorStop(0, css(mix(sky, tint, 0.25), 0.1 * a));
  g.addColorStop(0.6, css(mix(sky, rim, 0.5), 0.22 * a));
  g.addColorStop(0.9, css(rim, 0.55 * a));
  g.addColorStop(1, css(rim, 0.8 * a));
  ctx.fillStyle = g; path(); ctx.fill();
  // wet specular streak on the sun side
  const hx = x + lit * r * 0.45, hy = y - r * 0.45;
  const h = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.4);
  h.addColorStop(0, `rgba(255,255,255,${0.6 * a * (0.4 + 0.6 * L.keyAmt)})`); h.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = h; path(); ctx.fill();
}

// wet dark skin lit by the hour: a gradient across a limb from its lit edge to its shadow edge
export function skin(ctx, x0, y0, x1, y1, L, base = SKIN, gloss = 0.5) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, css(shade(base, L, 1, { gloss: gloss * 0.4 })));
  g.addColorStop(0.18, css(mix(shade(base, L, 1), [255, 255, 255], 0.25 * gloss * L.keyAmt)));
  g.addColorStop(0.45, css(shade(base, L, 0.2)));
  g.addColorStop(1, css(shade(base, L, -0.6)));
  return g;
}

// a tapering limb from a to b: width w0 at a, w1 at b, filled with style
export function limb(ctx, ax, ay, bx, by, w0, w1, style) {
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.moveTo(ax + nx * w0 / 2, ay + ny * w0 / 2); ctx.lineTo(bx + nx * w1 / 2, by + ny * w1 / 2);
  ctx.lineTo(bx - nx * w1 / 2, by - ny * w1 / 2); ctx.lineTo(ax - nx * w0 / 2, ay - ny * w0 / 2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, w1 / 2, 0, TAU); ctx.fill();
}

// two-bone IK: hip h, foot f, segment lengths a, b; bend 1 or -1 picks which side the knee goes
export function knee(hx, hy, fx, fy, a, b, bend = 1) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy);
  d = clamp(d, Math.abs(a - b) + 0.01, a + b - 0.01);
  const ca = (a * a + d * d - b * b) / (2 * a * d), ang = Math.atan2(dy, dx) - bend * Math.acos(clamp(ca, -1, 1));
  return [hx + Math.cos(ang) * a, hy + Math.sin(ang) * a];
}

// a glowing vein: a stroked path with a soft additive sheath
export function vein(ctx, pts, c, w, a) {
  if (a <= 0) return;
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [k, al] of [[3, 0.18], [1, 0.8]]) {
    ctx.strokeStyle = css(c, a * al); ctx.lineWidth = w * k;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  ctx.globalCompositeOperation = op;
}

// A jellyfish bell: a dome over a scalloped margin. bx, by = centre of the margin, w = half width, h = dome height.
export function bellPath(ctx, bx, by, w, h, t = 0, lobes = 9, ruffle = 0.1) {
  ctx.beginPath();
  ctx.moveTo(bx - w, by);
  ctx.bezierCurveTo(bx - w * 1.02, by - h * 1.333, bx + w * 1.02, by - h * 1.333, bx + w, by);
  for (let i = lobes; i > 0; i--) {
    const x0 = bx - w + (2 * w * i) / lobes, x1 = bx - w + (2 * w * (i - 1)) / lobes;
    const d = h * ruffle * (1 + 0.5 * Math.sin(t * 3 + i * 1.7));
    ctx.quadraticCurveTo((x0 + x1) / 2, by + d * 2, x1, by);
  }
  ctx.closePath();
}

// A whole bell: translucent body, the inner skirt, four glowing horseshoe organs, a core light. ga = glow amount.
export function bell(ctx, L, bx, by, w, h, t, { tint = CYAN, organ = GREEN, ga = 1, lit = 1, a = 1 } = {}) {
  const path = () => bellPath(ctx, bx, by, w, h, t);
  jelly(ctx, path, L, bx, by - h * 0.45, Math.max(w, h) * 1.05, { tint, a, lit });
  // the inner skirt seen through the bell
  ctx.strokeStyle = css(mix(shade([220, 240, 250], L, 0.4), tint, 0.4), 0.35 * a); ctx.lineWidth = Math.max(0.4, w * 0.025);
  ctx.beginPath(); ctx.ellipse(bx, by - h * 0.08, w * 0.9, h * 0.16, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  // Refraction reveals fine radial membranes and obscures their ends near the skirt.
  ctx.save(); path(); ctx.clip();
  const sheen = ctx.createLinearGradient(bx, by - h, bx, by + h * 0.08);
  sheen.addColorStop(0, css(mix(L.key, [190, 226, 241], 0.48), 0.48 * a));
  sheen.addColorStop(0.26, css(tint, 0.11 * a));
  sheen.addColorStop(0.77, css(VIOLET, 0.16 * a));
  sheen.addColorStop(1, css(organ, 0.45 * a));
  ctx.lineWidth = Math.max(0.24, w * 0.019); ctx.strokeStyle = sheen;
  ctx.beginPath();
  for (let i = -5; i <= 5; i++) {
    const u = i / 5 + 0.033 * Math.sin(i * 5 + t * 1.4);
    ctx.moveTo(bx + u * w * 0.39, by - h * (0.88 - 0.18 * Math.abs(u)));
    ctx.bezierCurveTo(bx + u * w * 0.66, by - h * 0.77, bx + u * w * 1.02, by - h * 0.25, bx + u * w * 0.98, by);
  }
  ctx.stroke();
  ctx.strokeStyle = css(mix(organ, VIOLET, 0.65), 0.32 * a);
  ctx.lineWidth = Math.max(0.28, w * 0.016);
  ctx.beginPath();
  ctx.ellipse(bx, by - h * 0.12, w * 0.86, h * 0.22, 0, 0.08, Math.PI - 0.08);
  ctx.stroke();
  if (ga > 0.01) {
    const cx = bx, cy = by - h * 0.42;
    for (let k = 0; k < 5; k++) {
      const bend = (k - 2) * w * 0.13, y = cy + Math.abs(k - 2) * h * 0.022;
      const plume = ctx.createRadialGradient(cx + bend, y + h * 0.16, 0, cx + bend, y + h * 0.17, w * 0.28);
      const c = k % 2 ? organ : VIOLET;
      plume.addColorStop(0, css(mix(c, [227, 255, 246], 0.36), 0.70 * ga * a));
      plume.addColorStop(0.26, css(c, 0.46 * ga * a));
      plume.addColorStop(1, css(c, 0));
      ctx.fillStyle = plume;
      ctx.beginPath(); ctx.ellipse(cx + bend, y + h * 0.13, w * 0.135, h * 0.37, bend / w * -1.5, 0, TAU); ctx.fill();
    }
    // the glowing mass inside: soft, lower in the bell
    const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createRadialGradient(cx, cy + h * 0.15, 0, cx, cy + h * 0.15, w * 0.55);
    mg.addColorStop(0, css(tint, 0.45 * ga * a)); mg.addColorStop(0.5, css(mix(tint, organ, 0.5), 0.16 * ga * a)); mg.addColorStop(1, css(organ, 0));
    ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.15, w * 0.55, h * 0.4, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = op;
    bloom(ctx, cx, cy, w * 0.9, tint, 0.45 * ga * a);
    bloom(ctx, cx, cy + h * 0.1, w * 0.18, [230, 255, 255], 0.55 * ga * a);
  }
  ctx.restore();
  ctx.strokeStyle = css(mix(shade([238, 247, 247], L, 1), tint, 0.32), 0.65 * a);
  ctx.lineWidth = Math.max(0.45, w * 0.025);
  ctx.beginPath();
  const left = lit < 0;
  ctx.ellipse(bx, by, w * 0.995, h * 0.96, 0, left ? 3.24 : 4.82, left ? 4.62 : 6.18);
  ctx.stroke();
}

// A trailing tentacle from (x, y) hanging down length len, waving; specks of light along it. Returns nothing.
export function tentacle(ctx, L, x, y, len, t, { seed = 0, sway = 1, drift = 0, w = 0.6, c = CYAN, ga = 1, a = 1, n = 14, slack = 0 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ph = t * 1.6 - u * 4 + seed * 2.1;
    const dx = (Math.sin(ph) * 4 + Math.sin(ph * 0.53 + seed) * 3) * sway * u + drift * u * u * len * 0.5;
    pts.push([x + dx, y + len * u * (1 - slack * 0.5 * u)]);
  }
  ctx.strokeStyle = css(mix(shade([214, 232, 240], L, 0.3), c, 0.45 * ga), 0.4 * a); ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  if (ga > 0.02) for (let i = 2; i <= n; i += 3) bloom(ctx, pts[i][0], pts[i][1], 2.2 + w * 2, c, 0.5 * ga * a * (0.5 + 0.5 * Math.sin(t * 2 + i + seed)));
  return pts;
}
