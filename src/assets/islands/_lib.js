// Shared by the floating islands: the rock underside (a per-pixel relief, baked once per seed and relit per quarter
// hour), the engine pods and their flames, fire and smoke for hits and falls.
import { noiseOf, lru, bakeRelief, lightRelief, resFor } from '../nature/_lib.js';
import { rng, clamp, lerp, smooth } from '../../core/rng.js';
import { css, mix, scale, shade, glow, rimColour, windowLights, vgrad } from '../../core/paint.js';

export { clamp, lerp, smooth, rng, css, mix, scale, shade, glow, rimColour, noiseOf };

const BAKES = lru(24), LIT = lru(48);

// rock spec: { key, w (rim width), top (rim y), bottom (lowest rock y), drips: [[x, len, width]], lip (grass thickness),
//   palette: 'siso' | 'enemy', seed, strata (typical bed height), plates (0..1 share of metal plating) }
function bakeRock(R, res) {
  const N = noiseOf(R.seed * 11 + 501);
  const half = R.w / 2, depth = R.bottom - R.top, enemy = R.palette === 'enemy';
  function profile(y) {
    const u = clamp((y - R.top) / depth);
    if (!enemy) return [half * (1 - u ** 1.2) ** 0.72, half * 0.055 * u];
    // A broad shelf overlies a narrower, off-centre keel.
    const shoulder = 1 - 0.22 * smooth(0.04, 0.34, u);
    const taper = clamp((u - 0.19) / 0.81);
    return [half * shoulder * (1 - taper ** 0.92), -half * 0.24 * taper];
  }
  const drips = R.drips || [];
  const lipT = (x) => (R.lip || 0) * (0.75 + 0.45 * (0.5 + 0.5 * N.fbm(x / 26, 4, 2)));
  const bw = R.w + 40, bh = (R.bottom - R.top) + 70 + (R.lip || 0) + 20;
  const y0 = R.top - (R.lip || 0) - 12;
  const SH = R.strata || 13; // stratum height
  const strat = (x, y) => { const v = (y - R.top + 9 * N.fbm(x / 48, y / 27, 2) + 3 * N.n1(x / 17 + y / 10)) / SH; const k = Math.floor(v); return [k, v - k]; };
  const rel = bakeRelief({
    w: bw, h: bh, res,
    sample(x, yy, s) {
      const y = yy + bh + y0;
      const rimY = R.top + 3.0 * N.n2(x / 19, 2) + 1.4 * N.n1(x / 6);
      if (y < rimY) { // the grass lip on top of the rim, in terraces
        const lt = lipT(x);
        if (!lt || y < rimY - lt || Math.abs(x) > half * (0.985 + 0.02 * N.n1(x / 9))) return;
        const d = Math.min(rimY - y + 0.5, (y - (rimY - lt)) + 0.5, (half - Math.abs(x)));
        s.a = clamp(d * res + 0.4); s.id = 2;
        const step = ((rimY - y) / 3.2) % 1;
        s.d = Math.sqrt(Math.max(0, half * half - x * x)) * 0.9 + 3 * N.caps(x / 6, y / 4, 2) + 2.5 * step - (rimY - y) * 0.4;
        s.u = step; s.v = 0; s.x3 = 0; return;
      }
      const [w, centre] = profile(y);
      const offset = x - centre;
      let dist = y > R.bottom ? -2 : w - Math.abs(offset) + Math.min(1, w / 20) * (14 * N.fbm(x / 42, y / 22, 3) + 5 * N.fbm(x / 10, y / 8, 2));
      if (enemy && y > R.bottom) return;
      let drip = 0;
      for (const [dx, len, dw] of drips) { // rock fingers hanging under the bowl
        const top = R.top + depth * 0.17, bot = R.bottom + len, u = (y - top) / (bot - top);
        if (u < 0 || u > 1) continue;
        const ww = dw * Math.pow(1 - u, 0.85) + 0.4;
        const dd = ww - Math.abs(x - dx - 3 * N.n1(y / 16 + dx * 0.1));
        if (dd > dist) { dist = dd; drip = 1; }
      }
      if (dist < -1) return;
      s.a = clamp(dist * res + 0.5); s.id = 1;
      const [k, fr] = strat(x, y);
      const sh = Math.sin(k * 91.7 + R.seed) * 43758.5453; const off = (sh - Math.floor(sh)) * 300;
      const joint = N.ridged((x + off) / 21, (y + off) / 34, 2); // vertical joints, broken at every stratum
      const body = Math.sqrt(Math.max(0, w * w - offset * offset)) * (enemy ? 0.43 : 0.62);
      const bedBreak = smooth(0.18, 0.56, N.n2(x / 36 + off, y / 29)) * 0.62;
      const ledge = (smooth(0.06, 0.23, fr) - smooth(0.55, 1, fr) * 0.65) * (1 - bedBreak);
      s.d = body + (enemy ? 2.5 : 4.4) * ledge + 13 * N.fbm((x + y * (enemy ? 0.47 : 0.22)) / 24, y / 21, 3) + 7 * joint
        + 2.4 * N.fbm(x / 5, y / 4, 2) + drip * 3 * Math.sqrt(Math.max(0, dist));
      s.u = joint; s.v = (y - R.top) / depth; s.x3 = drip * 4 + fr;
    },
    material(x, yy, n, m, id) {
      const y = yy + bh + y0;
      if (id === 2) { // grass and soil terraces
        const g = N.fbm(x / 6, y / 4, 2);
        if (enemy) { m.r = 74 + 14 * g; m.g = 58 + 10 * g; m.b = 44 + 8 * g; }
        else { m.r = 104 + 43 * g; m.g = 120 + 38 * g; m.b = 53 + 23 * g; const dry = smooth(0.2, 0.7, N.fbm(x / 40, 7, 2)); m.r += 36 * dry; m.g += 14 * dry; }
        m.cav = m.u < 0.15 ? 0.45 : 0.08; return;
      }
      const u = m.v, joint = m.u, drip = m.x3 >= 2 ? 1 : 0, fr = m.x3 - drip * 4;
      const [k] = strat(x, y);
      const kh = Math.sin(k * 12.9898 + R.seed * 3.3) * 43758.5453, band = kh - Math.floor(kh);
      const tone = N.fbm(x / 30, y / 22, 3);
      let r, g, b;
      if (enemy) {
        // weathered grey-brown rock with a rust stain in some beds
        r = 96 + 18 * band; g = 86 + 12 * band; b = 80 + 10 * band;
        r += 22 * tone; g += 17 * tone; b += 15 * tone;
        if (band > 0.72) { r += 18; g -= 2; b -= 6; }
      } else {
        // sandstone strata: tan, rust and grey bands
        const pal = band < 0.4 ? [135, 127, 118] : band < 0.7 ? [151, 95, 72] : [117, 119, 116];
        r = pal[0] + 26 * tone; g = pal[1] + 20 * tone; b = pal[2] + 16 * tone;
        const moss = smooth(0.25, 0.8, n.y) * smooth(0.5, 0.05, u) * (0.4 + 0.6 * N.fbm(x / 14, y / 10, 2));
        r = lerp(r, 82, moss); g = lerp(g, 104, moss); b = lerp(b, 54, moss);
      }
      const low = smooth(0.45, 1, u) * 0.21 + drip * 0.15;
      r *= 1 - low; g *= 1 - low; b *= 1 - low;
      if (R.plates) { // metal plating bolted to the rock
        const cx = Math.floor(x / 26), cy = Math.floor(y / 16), h = Math.abs((Math.sin(cx * 12.9898 + cy * 78.233 + R.seed) * 43758.5453) % 1);
        if (h < R.plates && u > 0.08 && u < 0.8 && !drip) {
          const fx = x / 26 - cx, fy = y / 16 - cy, edge = Math.min(fx, 1 - fx, fy, 1 - fy);
          m.r = 88 + 30 * h; m.g = 86 + 26 * h; m.b = 90 + 24 * h; m.cav = edge < 0.06 ? 0.5 : 0.04; return;
        }
      }
      m.r = r; m.g = g; m.b = b;
      m.cav = clamp(Math.pow(1 - joint, 3) * 0.5 + (fr > 0.9 ? 0.27 : 0) + (n.y < -0.4 ? 0.12 : 0));
      // Keep the stone unlit. The engines and occupied structures cast the local colour.
      const grain = N.n2(x * 1.36, y * 1.22);
      m.r += grain * 10; m.g += grain * 9; m.b += grain * 8;
    },
  });
  return { rel, box: { bw, bh, y0 } };
}

// drawRock(ctx, o, R): the lit rock underside, cached per seed, light and resolution.
export function drawRock(ctx, o, R) {
  const res = resFor(o.scale || 1, 2);
  const key = `${R.key}|${R.seed}|${res}`;
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  // the lit picture first, the rock baked only when it is missing (see nature/_range.js)
  const { cv, box } = LIT.get(`${key}|${L.q}|${lit}`, () => { const { rel, box } = BAKES.get(key, () => bakeRock(R, res)); return { box, cv: lightRelief(rel, L, lit, {
    rim: 1.1, ambientUp: 0.55, front: 0.8, wrap: 0.2,
    amb: scale(L.ambient, 1 + L.night * 0.58),
  }) }; });
  ctx.drawImage(cv, -box.bw / 2, box.y0, box.bw, box.bh);
}

// ---------------------------------------------------------------- engines
// pod(ctx, x, y, r, o, colour): a metal engine pod hanging from the rock, its nozzle ring glowing.
export function enginePod(ctx, x, y, r, o, col, { long = 1 } = {}) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  const top = y - r * 2.1 * long;
  const metal = [133, 138, 144], dark = [60, 66, 75];
  const shell = ctx.createLinearGradient(x - lit * r, 0, x + lit * r, 0);
  for (const [step, f] of [[0, -0.88], [0.37, -0.13], [0.73, 0.74], [0.93, 0.21], [1, -0.28]]) {
    shell.addColorStop(step, css(shade(metal, L, f, { gloss: 0.12 })));
  }
  const pipe = new Path2D();
  for (const side of [-1, 1]) {
    pipe.moveTo(x + side * r * 0.82, top - r * 0.26);
    pipe.bezierCurveTo(x + side * r * 1.6, top + r, x + side * r * 2.1, y - r * 0.32, x + side * r * 0.89, y - r * 0.78);
  }
  ctx.strokeStyle = css(shade([38, 34, 28], L, -0.28)); ctx.lineWidth = r * 0.27; ctx.stroke(pipe);
  ctx.strokeStyle = css(shade([160, 111, 58], L, 0.49, { gloss: 0.1 })); ctx.lineWidth = r * 0.13; ctx.stroke(pipe);
  // The load-bearing saddle overlaps the ledge. Dark gaps divide it from the ceramic collar.
  ctx.fillStyle = vgrad(ctx, top - r * 0.65, top + r * 0.5, [[0, [17, 20, 24], 0], [0.38, shade(dark, L, -0.37)], [0.7, shade(metal, L, 0.26)], [1, shade(dark, L, -0.65)]]);
  ctx.beginPath(); ctx.roundRect(x - r * 1.2, top - r * 0.64, r * 2.4, r * 0.99, r * 0.16); ctx.fill();
  ctx.fillStyle = shell;
  ctx.beginPath(); ctx.roundRect(x - r * 1.03, top, r * 2.06, y - top - r * 0.28, r * 0.3); ctx.fill();
  ctx.fillStyle = vgrad(ctx, top, y - r * 0.1, [[0, [12, 15, 20], 0.61], [0.29, [12, 15, 20], 0.16], [0.7, [12, 15, 20], 0], [1, [12, 15, 20], 0.3]]);
  ctx.fill();
  ctx.fillStyle = css(shade(dark, L, -0.15));
  for (const dx of [-0.76, -0.59, 0.31, 0.5, 0.69]) ctx.fillRect(x + r * dx, top + r * 0.12, r * 0.06, r * 0.42);
  for (const k of [0.43, 0.73, 0.9]) {
    const cy = lerp(top, y, k);
    ctx.fillStyle = css(shade(dark, L, 0.17)); ctx.fillRect(x - r * 1.08, cy, r * 2.16, r * 0.2);
    ctx.fillStyle = css(rimColour(L), 0.22 * L.keyAmt); ctx.fillRect(x - r * 0.96, cy + r * 0.16, r * 1.92, r * 0.055);
  }
  ctx.fillStyle = shell;
  ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 1.03, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = css([12, 17, 25]); ctx.beginPath(); ctx.ellipse(x, y + r * 0.075, r * 0.72, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = css(mix(col, [255, 255, 255], 0.43), 0.83);
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.11, r * 0.56, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
}

// flame(ctx, x, y, r, len, t, colour, seed, power): a thruster plume pointing down, flickering. power 0..1.5
export function flame(ctx, x, y, r, len, t, col, seed = 0, power = 1) {
  if (power <= 0.01) return;
  const fl = 0.88 + 0.12 * Math.sin(t * 31 + seed * 3.1) * Math.sin(t * 17.3 + seed);
  const L2 = Math.max(1, len * power * fl), pw = Math.min(1.2, power), R = r * 0.62;
  const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  const plume = (rad, ln, stops) => { // a half ellipse hanging from the nozzle, soft all round
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ln / rad);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    for (const [k, c, a] of stops) g.addColorStop(k, css(c, a));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI); ctx.fill(); ctx.restore();
  };
  plume(R * 1.5, L2 * 1.1, [[0, col, 0.5 * pw], [0.5, col, 0.2 * pw], [1, col, 0]]);
  plume(R, L2 * 0.75, [[0, mix(col, [255, 255, 255], 0.6), 0.9 * pw], [0.45, col, 0.55 * pw], [1, col, 0]]);
  plume(R * 0.45, L2 * 0.4, [[0, [255, 255, 255], 0.95 * pw], [0.7, mix(col, [255, 255, 255], 0.7), 0.5 * pw], [1, col, 0]]);
  // Turbulent, refractive-looking streaks soften into the background beyond the hot core.
  if (r > 5) {
    for (let i = 1; i <= 3; i++) {
      const dy = L2 * (0.17 + i * 0.24), bend = Math.sin(t * 22 + i * 2.2 + seed);
      ctx.strokeStyle = css(mix(col, [219, 236, 255], 0.7), 0.10 * pw * (1 - i * 0.19));
      ctx.lineWidth = 0.34 + r * 0.024;
      ctx.beginPath(); ctx.moveTo(x - R * 0.47, y + dy);
      ctx.quadraticCurveTo(x + R * 0.42 * bend, y + dy + L2 * 0.11, x + R * 0.49, y + dy - L2 * 0.045); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = op;
  glow(ctx, x, y + r * 0.3, r * 3.4 * Math.min(1.4, power), col, 0.5 * pw);
}

// ---------------------------------------------------------------- fire and smoke (hits, falls)
export function fireAt(ctx, x, y, s, t, seed, o, amt = 1) {
  const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const ph = seed * 1.7 + i * 2.1;
    const fx = x + Math.sin(t * 5 + ph) * s * 0.25 + (i - 2) * s * 0.18;
    const fh = s * (0.8 + 0.5 * Math.sin(t * 9 + ph * 3)) * amt;
    const g = ctx.createLinearGradient(0, y, 0, y - fh);
    g.addColorStop(0, `rgba(255,220,140,${0.85 * amt})`); g.addColorStop(0.4, `rgba(255,120,30,${0.6 * amt})`); g.addColorStop(1, 'rgba(200,40,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(fx - s * 0.22, y); ctx.quadraticCurveTo(fx - s * 0.1, y - fh * 0.6, fx + Math.sin(t * 7 + ph) * s * 0.1, y - fh);
    ctx.quadraticCurveTo(fx + s * 0.12, y - fh * 0.5, fx + s * 0.22, y); ctx.fill();
  }
  ctx.globalCompositeOperation = op;
  glow(ctx, x, y - s * 0.3, s * 2.4, [255, 120, 40], 0.45 * amt * (0.6 + 0.4 * o.L.night + 0.2));
}

export function smokeColumn(ctx, x, y, s, t, seed, o, { amt = 1, rise = 120, drift = 40, n = 9, dark = 0.6 } = {}) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  const sh = mix(scale(L.ambient, 0.55), [26, 24, 24], dark), li = mix(sh, scale(L.key, 0.5 * L.keyAmt + 0.15), 0.35);
  const m = Math.round(n * 1.8);
  for (let i = 0; i < m; i++) {
    const life = ((t * 0.18 + i / m + seed * 0.13) % 1);
    const yy = y - life * rise, xx = x + life * life * drift + Math.sin(i * 2.3 + seed) * s * 0.35 * (0.3 + life);
    const r = s * (0.9 + life * 2.4) + rise * 0.05 * life, a = amt * 0.34 * smooth(0, 0.08, life) * Math.pow(1 - life, 1.3);
    const g = ctx.createRadialGradient(xx + lit * r * 0.3, yy - r * 0.3, r * 0.1, xx, yy, r);
    g.addColorStop(0, css(li, a)); g.addColorStop(0.5, css(sh, a * 0.75)); g.addColorStop(1, css(sh, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
  }
}

// windows that glow after dark: tiny warm squares on a structure, seeded
export function litDots(ctx, pts, o, col = [255, 196, 120], size = 1.6) {
  const L = o.L; if (L.windows < 0.05) return;
  for (const [x, y, k] of pts) {
    if (k > L.windows * 1.1) continue;
    ctx.fillStyle = css(col, 0.55 + 0.4 * L.windows);
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
}

// ---------------------------------------------------------------- small structures on the islands (cached with the top)
// labBlock: a white modernist block, lit side face, ribbon windows that mirror the sky by day and glow at night.
export function labBlock(g, x, yb, w, h, o, { base = [226, 228, 230], bands = 2, side = 0.24, glassFront = false, seed = 0 } = {}) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1, sw = w * side;
  const fx0 = lit > 0 ? x - w / 2 : x - w / 2 + sw, fx1 = fx0 + w - sw;
  const sx0 = lit > 0 ? fx1 : x - w / 2;
  // side face toward the light
  g.fillStyle = css(shade(base, L, 0.85)); g.fillRect(sx0, yb - h + 1, sw, h - 1);
  // front face, a touch darker at the foot
  const fg = g.createLinearGradient(0, yb - h, 0, yb);
  fg.addColorStop(0, css(shade(base, L, -0.05))); fg.addColorStop(1, css(shade(scale(base, 0.82), L, -0.25)));
  g.fillStyle = fg; g.fillRect(fx0, yb - h, fx1 - fx0, h);
  const r = rng(seed * 47 + 17);
  g.fillStyle = css([37, 32, 27], 0.14);
  for (let col = fx0 + 3; col < fx1 - 1; col += 4 + r() * 7) g.fillRect(col, yb - h + 0.75, 0.32, h - 1);
  g.fillStyle = css(shade([67, 64, 59], L, -0.35));
  g.fillRect(fx0 + 1, yb - h - 0.7, Math.max(1, (fx1 - fx0) * 0.44), 0.95);
  g.fillRect(sx0 + sw * 0.4, yb - 1.9, sw * 0.6, 1.9);
  // roof edge catching the sky
  g.fillStyle = css(shade(base, L, 0.5, { gloss: 0.2 })); g.fillRect(x - w / 2, yb - h, w, Math.max(0.6, h * 0.06));
  // windows
  const gl = shade([95, 120, 144], L, 0.05, { gloss: 0.52 });
  const warm = [255, 198, 120];
  const ww = fx1 - fx0 - w * 0.12;
  const wy = yb - h * (glassFront ? 0.85 : 0.75);
  const wh = h * (glassFront ? 0.77 : 0.59);
  g.fillStyle = css(mix(gl, [18, 21, 24], 0.42));
  g.fillRect(fx0 + w * 0.06, wy, ww, wh);
  windowLights(g, fx0 + w * 0.06, wy, ww, wh, o, {
    cols: Math.round(ww / 4), rows: glassFront ? 1 : bands, gapX: 0.24,
    gapY: glassFront ? 0.17 : 0.49, seed, warm, flicker: false,
  });
  if (L.windows > 0.2) glow(g, x, yb - 0.5, w * 0.48, warm, 0.13 * L.windows);
  // a thin rim on the sun edge
  g.fillStyle = css(rimColour(L), 0.25 + 0.5 * L.golden);
  g.fillRect(lit > 0 ? x + w / 2 - 0.7 : x - w / 2, yb - h, 0.7, h);
}

// dome: an observatory dome (white metal) or a glass dome, lit from the key side.
export function dome(g, x, yb, r, o, { glass = false, base = [232, 234, 238], drum = 0.25 } = {}) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  const dh = r * drum;
  if (dh > 0) { g.fillStyle = css(shade(base, L, -0.1)); g.fillRect(x - r, yb - dh, r * 2, dh); }
  const cy = yb - dh;
  const gr = g.createRadialGradient(x + lit * r * 0.45, cy - r * 0.6, r * 0.05, x, cy, r * 1.05);
  if (glass) {
    const sky = mix(L.sky.horizon, L.sky.top, 0.5);
    gr.addColorStop(0, css(mix(sky, [255, 255, 255], 0.5 + 0.3 * L.golden), 0.85));
    gr.addColorStop(0.5, css(mix(scale(sky, 0.8), [70, 120, 90], 0.35), 0.6));
    gr.addColorStop(1, css(mix(scale(sky, 0.5), [40, 70, 60], 0.4), 0.75));
  } else {
    gr.addColorStop(0, css(shade(base, L, 1, { gloss: 0.3 })));
    gr.addColorStop(0.55, css(shade(base, L, 0.1, { gloss: 0.3 })));
    gr.addColorStop(1, css(shade(base, L, -0.8, { gloss: 0.2 })));
  }
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, cy, r, r, 0, Math.PI, 0); g.closePath(); g.fill();
  if (glass) { // ribs and warm light inside at night
    g.strokeStyle = css(shade([200, 210, 220], L, 0.3), 0.5); g.lineWidth = Math.max(0.3, r * 0.03);
    for (let i = 1; i < 6; i++) { const a = Math.PI + (i / 6) * Math.PI; g.beginPath(); g.moveTo(x, cy - r); g.quadraticCurveTo(x + Math.cos(a) * r * 1.1, cy - r * 0.4, x + Math.cos(a) * r, cy); g.stroke(); }
    if (L.windows > 0.1) { const wg = g.createRadialGradient(x, cy, 0, x, cy, r); wg.addColorStop(0, css([255, 220, 160], 0.55 * L.windows)); wg.addColorStop(1, css([255, 220, 160], 0)); g.fillStyle = wg; g.beginPath(); g.ellipse(x, cy, r, r, 0, Math.PI, 0); g.closePath(); g.fill(); }
  } else { // a slit
    g.fillStyle = css(shade([40, 44, 50], L, 0), 0.8); g.fillRect(x - r * 0.06, cy - r * 0.95, r * 0.12, r * 0.75);
  }
}

// trees: a clump of rounded crowns, lit side warm, shadow side cool
export function trees(g, x, yb, s, o, seed = 0, n = 4) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1, r = rng(seed * 13 + 7);
  for (let i = 0; i < n; i++) {
    const tx = x + (r() - 0.5) * s * 2.2, rr = s * (0.45 + 0.4 * r()), ty = yb - rr * (0.9 + r() * 0.5);
    const gr = g.createRadialGradient(tx + lit * rr * 0.3, ty - rr * 0.35, rr * 0.04, tx, ty, rr);
    const leaf = [70 + 20 * r(), 96 + 24 * r(), 52];
    gr.addColorStop(0, css(shade(leaf, L, 0.9))); gr.addColorStop(0.7, css(shade(leaf, L, -0.3))); gr.addColorStop(1, css(shade(scale(leaf, 0.7), L, -0.8)));
    g.fillStyle = gr; g.beginPath(); g.arc(tx, ty, rr, 0, Math.PI * 2); g.fill();
  }
}

// dish: a radar dish on a mast
export function dish(g, x, yb, s, o, ang = -0.5) {
  const L = o.L;
  g.fillStyle = css(shade([170, 172, 178], L, 0)); g.fillRect(x - s * 0.06, yb - s * 0.9, s * 0.12, s * 0.9);
  g.save(); g.translate(x, yb - s * 0.95); g.rotate(ang);
  const gr = g.createLinearGradient(-s * 0.5, 0, s * 0.5, 0);
  gr.addColorStop(0, css(shade([236, 238, 240], L, -0.6))); gr.addColorStop(1, css(shade([236, 238, 240], L, 0.9)));
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, s * 0.55, s * 0.22, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = css(shade([120, 124, 130], L, 0)); g.lineWidth = s * 0.04; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * 0.4); g.stroke();
  g.restore();
}
