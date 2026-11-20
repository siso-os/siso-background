// Volcanic ranges: dark basalt ridges stepping back into haze around one cone. The cone is ribbed by radial gullies
// and dusted with pale ash on its upper slopes; a faint red glow in the crater, a drifting plume, and one or two
// hair-thin lava threads below the rim that only show after dark (at noon almost nothing).
import { rangeAsset } from './_range.js';
import { clamp, smooth, lerp, noiseOf } from './_lib.js';
import { css, glow, mix, cached } from '../../core/paint.js';
import { rng } from '../../core/rng.js';

const coneOf = (seed, w, h) => {
  const r = rng(seed * 31 + 9);
  const c = { x: (r() - 0.5) * w * 0.4, R: w * (0.2 + 0.05 * r()), top: h * 0.94, crater: 24 + 10 * r() };
  // the lava threads: where they leave the rim, how far they run, and how they wander
  c.threads = [{ off: (r() - 0.5) * 0.6, len: 0.1 + 0.12 * r(), ph: r() * 9 }];
  if (r() < 0.6) c.threads.push({ off: (r() - 0.5) * 0.9, len: 0.06 + 0.08 * r(), ph: r() * 9 });
  return c;
};

export default rangeAsset({
  id: 'nature.mountains-volcanic',
  title: 'Volcanic ranges',
  about: 'Black basalt ridges around a smoking cone; lava runs glow on its flanks and brighten after dark, the plume drifts.',
  w: 2400, h: 380, variants: 3, loop: 20,
  ref: 'refs/elements/mountains.webp',
  layers: [
    { base: 0.28, top: 0.7, haze: 0.56, mist: 0.6, freq: 0.9, jag: 0.4, form: 1.25 },
    { base: 0.0, top: 1.0, haze: 0.0, mist: 0.4, freq: 1.0, cone: true, gully: 1.0 },
    { base: 0.0, top: 0.3, haze: 0.0, mist: 0.45, freq: 1.8, jag: 0.25, form: 1.6, gully: 0.6 },
  ],
  rangeOpts: { massifs: 2.4, endFall: 0.2 },
  gully: { fx: 1 / 30, fy: 1 / 70, depth: 22, warp: 12 },
  shapeLayers(L, seed) {
    const w = 2400, h = 380, c = coneOf(seed, w, h);
    const base = L[1].H;
    L[1].H = (x) => {
      const d = Math.abs(x - c.x) / c.R;
      // concave flanks steepening to the rim (a stratovolcano), a notch for the crater
      const cone = d < 1 ? c.top * Math.pow(1 - d, 1.7) * (1 + 0.25 * d * (1 - d)) : 0;
      const notch = Math.abs(x - c.x) < c.crater ? (1 - Math.pow((x - c.x) / c.crater, 2)) * 12 : 0;
      return Math.max(base(x) * 0.42, cone - notch);
    };
  },
  emissive: (L) => [0, 0.04 + 0.95 * L.night, 0, 0],
  material(x, y, n, m, ly, N, seed) {
    const gul = m.u, dep = m.v, w = 2400, h = 380, c = coneOf(seed, w, h);
    let r = 66, g = 60, b = 58;
    const ash = smooth(0.1, 0.7, n.y) * 0.4 + 0.15 * N.fbm(x / 120, y / 70, 2);
    r = lerp(r, 108, ash); g = lerp(g, 98, ash); b = lerp(b, 92, ash);
    m.cav = clamp(Math.pow(1 - gul, 2) * 0.6 * smooth(2, 36, dep));
    if (ly.cone) {
      const dx = (x - c.x) / c.R, alt = -y;
      // pale ash and old snow high on the cone, streaked down the ribs
      const high = smooth(c.top * 0.62, c.top * 0.86, alt + 20 * N.n2(x / 50, 4)) * smooth(0.3, 0.7, gul);
      r = lerp(r, 150, high * 0.6); g = lerp(g, 142, high * 0.6); b = lerp(b, 138, high * 0.6);
      for (const th of c.threads) {
        const fall = (c.top - alt) / c.top; // 0 at the rim, growing down the flank
        if (fall < 0 || fall > th.len) continue;
        const px = th.off * c.crater / c.R + Math.sign(th.off || 1) * fall * 0.55 + 0.02 * N.n1(fall * 30 + th.ph);
        const lava = smooth(3.2 / c.R, 0, Math.abs(dx - px)) * smooth(th.len, th.len * 0.4, fall) * smooth(0, 0.01, fall);
        if (lava > 0.02) { m.ek = 1; m.er = 255 * lava; m.eg = 70 * lava; m.eb = 18 * lava; r = lerp(r, 30, lava); g = lerp(g, 18, lava); b = lerp(b, 14, lava); }
      }
    }
    m.r = r; m.g = g; m.b = b;
  },
  live(ctx, o, seed) {
    const L = o.L, w = 2400, h = 380, c = coneOf(seed, w, h), t = o.t || 0;
    const cx = c.x, cy = -c.top + 8;
    // a faint red glow in the crater, lighting the underside of the plume after dark
    glow(ctx, cx, cy + 6, 34, [255, 70, 30], 0.04 + 0.4 * L.night + 0.05 * L.night * Math.sin(t * 2.3));
    // the plume: soft puffs rising and drifting, a pure function of t
    const N = noiseOf(seed + 77), lit = o.lit >= 0 ? 1 : -1;
    const shadow = mix(L.ambient, L.sky.top, 0.3), litC = mix(L.key, shadow, 0.35 + 0.4 * (1 - L.keyAmt));
    // one lit puff, baked per light, stamped at each puff's place and size (26 gradients a frame cost half a ms)
    const P = cached(`volc.puff|${L.q}|${lit}`, 64, 64, 1, (g) => {
      const gr = g.createRadialGradient(lit * 32 * 0.35, -32 - 32 * 0.3, 3.2, 0, -32, 32);
      gr.addColorStop(0, css(mix(litC, [80, 74, 72], 0.4))); gr.addColorStop(0.7, css(mix(shadow, [60, 56, 56], 0.5), 0.8)); gr.addColorStop(1, css(shadow, 0));
      g.fillStyle = gr; g.fillRect(-32, -64, 64, 64);
    });
    const ga = ctx.globalAlpha;
    for (let i = 0; i < 26; i++) {
      const life = ((t / 20) + i / 26) % 1;
      const yy = cy - 10 - life * 190, xx = cx + life * life * 220 + 26 * N.n1(i * 3.1 + t * 0.1);
      const r = 14 + life * 60, a = 0.32 * smooth(0, 0.08, life) * (1 - life);
      if (a > 0.004) { ctx.globalAlpha = ga * a; ctx.drawImage(P, xx - r, yy - r, 2 * r, 2 * r); ctx.globalAlpha = ga; }
      if (life < 0.2) glow(ctx, xx, yy + r * 0.3, r * 0.8, [255, 80, 30], (0.2 - life) * (0.05 + 0.8 * L.night));
    }
  },
});
