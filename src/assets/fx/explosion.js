// An explosion, played once over 3.2 s by o.p: a white flash, an incandescent fireball of lumps flung out against air
// drag that cools from white through orange to dull red as it rolls up into black smoke, a shock ring, sparks as
// motion-blurred streaks, and dark debris arcing out with dust behind it. ground sits on what it hit; air is a mid-air
// burst centred above the anchor.
import { rng, clamp, lerp, smooth, ease, smokeTint, puffTinted, puffGlow, put, bloom, streak, ballistic, heat, css, lod, TAU } from './_lib.js';

const DUR = 3.2;

export function blast(ctx, o, { R = 70, cy = -40, air = false, seed = 0, p = 0.5, smokeTone = 'black', debris = 1, ring = 1, sparks = 1, flash = 1 } = {}) {
  const L = o.L, T = p * DUR, r = rng(seed * 97 + 5), q = lod(o);
  const tint = smokeTint(L, smokeTone, o.lit || 1);
  const soot = smokeTint(L, smokeTone === 'black' ? 'oily' : smokeTone, o.lit || 1);
  const fade = 1 - smooth(0.62, 1, p);
  // 1. flash: the first tenth of a second
  const fl = (T < 0.06 ? T / 0.06 : Math.exp(-(T - 0.06) * 9)) * flash;
  bloom(ctx, 0, cy, R * (1.9 + 3.0 * Math.min(1, T * 8)), [255, 236, 200], fl);
  bloom(ctx, 0, cy, R * 5.1, [255, 144, 64], fl * 0.64 + 0.36 * Math.exp(-T * 1.55) * (0.5 + 0.5 * L.night));
  // 2. shock ring (a thin condensation shell racing out)
  if (T < 0.55 && ring > 0) {
    const rr = R * (0.5 + 5 * ease.out(T / 0.55)), a = (1 - T / 0.55) * 0.55;
    const g = ctx.createRadialGradient(0, cy, rr * 0.86, 0, cy, rr);
    g.addColorStop(0, css([255, 255, 255], 0)); g.addColorStop(0.75, css(mix3(L), a * 0.6)); g.addColorStop(1, css([255, 255, 255], 0));
    ctx.fillStyle = g; ctx.beginPath();
    if (air) ctx.arc(0, cy, rr, 0, TAU); else ctx.ellipse(0, cy * 0.4, rr, rr * 0.55, 0, Math.PI, TAU);
    ctx.fill();
  }
  // 3. the fireball lumps
  const n = Math.round(30 * (0.6 + 0.4 * q)); // many smaller lumps: a few big ones read as cotton balls
  const ps = [];
  for (let k = 0; k < n; k++) {
    const ang = air ? r() * TAU : -Math.PI + r() * Math.PI, sp = (0.45 + r() * 0.75) * R * 2.2;
    const life = 0.34 + r() * 1.13, rs = 0.4 + r() * 0.5, sh = Math.floor(r() * 6);
    const dk = 3.2;
    const d = (sp / dk) * (1 - Math.exp(-dk * T));
    const rise = -R * 0.55 * Math.pow(T, 1.35) * (air ? 0.6 : 1) - (air ? 0 : R * 0.25 * T);
    const roll = ang + Math.sin(ang * 2 + rs * 12) * 0.54 * (1 - Math.exp(-T * 2));
    const x = Math.cos(roll) * d * (0.76 + 0.40 * life);
    const y = cy + Math.sin(roll) * d * (air ? 0.85 : 0.6) + rise;
    const rad = R * rs * (0.32 + 0.68 * (1 - Math.exp(-7 * T))) * (1 + 0.55 * T);
    const temp = Math.exp(-T / life) * (1 - 0.68 * smooth(0.58, 1.43, T));
    ps.push({ x, y, rad, temp, sh, d });
  }
  // the stem of a ground burst: dust and smoke dragged up behind the rising ball
  // (many small lumps, jittered and twisting, so it is a column and not a stack of discs)
  if (!air) for (let k = 0; k < 14; k++) {
    const f = k / 14, x = (r() - 0.5) * R * 0.3 + Math.sin(f * 7 + seed) * R * 0.06 * T;
    const top = cy - R * 0.55 * Math.pow(T, 1.35) - R * 0.25 * T;
    ps.push({ x, y: lerp(cy * 0.3, top + R * 0.3, f) + (r() - 0.5) * R * 0.1, rad: R * (0.24 + 0.22 * f + 0.1 * r()) * Math.min(1, T * 2.5), temp: Math.exp(-T / 0.4) * 0.7, sh: k + 2, d: -1 });
  }
  ps.sort((a, b) => b.d - a.d);
  // each lump is fire (opaque incandescent gas) cooling into smoke, drawn back to front so lumps overlap like a volume
  const under = (0.3 + 0.7 * L.night) * clamp(Math.exp(-T / 1.2)) * fade;
  for (const p2 of ps) {
    const tk = p2.temp, sm = smooth(0.05, 0.6, T) * (1 - tk * 0.7);
    // smoke lumps overlap at part alpha, so the cloud is a volume with soft insides, not a pile of balls
    put(ctx, puffTinted(p2.sh + seed, tk < 0.27 ? soot : tint), p2.x, p2.y, p2.rad * 1.12, clamp(0.17 + sm) * 0.61 * fade);
    if (tk > 0.05) put(ctx, puffGlow(p2.sh + seed, 'hot', Math.round(clamp(tk * 1.28) * 10) / 10), p2.x, p2.y, p2.rad * 0.91, clamp(tk * 1.25) * fade);
    if (under > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, puffGlow(p2.sh + seed, 'under'), p2.x, p2.y, p2.rad, under * sm * 0.55);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  const coreY = cy - R * (0.16 + 0.29 * T);
  const core = (1 - smooth(0.26, 0.86, T)) * fade;
  bloom(ctx, 0, coreY, R * 2.3, [255, 112, 27], core * (0.45 + L.night * 0.40));
  if (core > 0.03) {
    put(ctx, puffGlow(seed + 3, 'hot', 1), R * 0.09, coreY, R * 0.58, core * 0.85);
    bloom(ctx, R * 0.06, coreY, R * 0.63, [255, 216, 132], core);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  // 4. sparks
  const ns = Math.round(40 * q * sparks);
  for (let k = 0; k < ns; k++) {
    const ang = air ? r() * TAU : -Math.PI * (0.05 + r() * 0.9), sp = R * (2.5 + r() * 5);
    const life = 0.38 + r() * 1.15, sw = 0.65 + r() * 1.5;
    if (T > life) continue;
    const [x1, y1] = ballistic(Math.cos(ang) * sp, Math.sin(ang) * sp, T, 2.2, 260);
    const [x0, y0] = ballistic(Math.cos(ang) * sp, Math.sin(ang) * sp, Math.max(0, T - (0.052 + sw * 0.024)), 2.2, 260);
    const k2 = 1 - T / life;
    const color = heat(0.45 + 0.55 * k2);
    streak(ctx, x0, cy + y0, x1, cy + y1, sw, color, k2);
    if (k % 3 === 0) bloom(ctx, x1, cy + y1, sw * 3, color, k2 * 0.75);
  }
  ctx.globalCompositeOperation = 'source-over';
  // 5. debris: dark chunks with a little dust behind each
  if (debris > 0) {
    const nd = Math.round(10 * q * debris), dt = smokeTint(L, 'dust', o.lit || 1);
    const body = shadeChunk(L);
    for (let k = 0; k < nd; k++) {
      const ang = air ? r() * TAU : -Math.PI * (0.12 + r() * 0.76), sp = R * (1.6 + r() * 2.6), sz = 1.5 + r() * 3.5, spin = (r() - 0.5) * 14;
      const [x, y] = ballistic(Math.cos(ang) * sp, Math.sin(ang) * sp, T, 0.6, 300);
      if ((!air && cy + y > 2) || T < 0.05) continue;
      for (let j = 1; j <= 3; j++) {
        const [bx, by] = ballistic(Math.cos(ang) * sp, Math.sin(ang) * sp, Math.max(0, T - j * 0.07), 0.6, 300);
        put(ctx, puffTinted(k + j, dt), bx, cy + by, sz * (1.2 + j * 0.8), 0.22 * (1 - j / 4) * fade);
      }
      ctx.save(); ctx.translate(x, cy + y); ctx.rotate(spin * T);
      ctx.globalAlpha = fade; ctx.fillStyle = css(body);
      ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.4); ctx.lineTo(sz * 0.3, -sz * 0.8); ctx.lineTo(sz, sz * 0.2); ctx.lineTo(-sz * 0.2, sz * 0.7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
const mix3 = (L) => [Math.min(255, L.haze[0] + 120), Math.min(255, L.haze[1] + 120), Math.min(255, L.haze[2] + 120)];
const shadeChunk = (L) => [24 + L.ambient[0] * 0.15, 22 + L.ambient[1] * 0.15, 22 + L.ambient[2] * 0.15];

export default {
  id: 'fx.explosion', family: 'fx', title: 'Explosion',
  about: 'A hit, played once by o.p over 3.2 s: flash, fireball rolling up into black smoke, shock ring, sparks, debris. ground sits on what it hit; air bursts above the anchor. o.size scales it (default 1).',
  w: 300, h: 320, states: ['ground', 'air'], loop: 0, once: { ground: DUR, air: DUR }, variants: 4, free: true,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) {
    ctx.save();
    const s = o.size ?? 1, air = o.state === 'air';
    if (s !== 1) ctx.scale(s, s);
    blast(ctx, o, { R: 62, cy: air ? -170 : -34, air, seed: o.seed || 0, p: clamp(o.p ?? 0.5) });
    ctx.restore();
  },
};
