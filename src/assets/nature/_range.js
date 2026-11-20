// rangeAsset(def): a mountain range asset from layers and a material. Two to four ridgelines step back, each farther
// one paler and bluer with its foot lost in mist, so there is air between them. Each ridge is a few dominant peaks on
// long shoulders with low saddles (no flat-topped wall), and the light comes from per-pixel normals of the broad form:
// one lit face and one shadow face per spur, with gullies broad enough to read at the size the scene draws a range
// (about 0.12 px a unit: a 13-unit gully was a 2 px crinkle that read as crumpled cloth). Baked once per seed, relit per
// quarter hour.
import { noiseOf, lru, bakeRelief, lightRelief, clamp, smooth, lerp } from './_lib.js';
import { mix } from '../../core/paint.js';
import { rng } from '../../core/rng.js';

// The lit picture is looked up first and the shape is baked only when it is missing: looking the shape up first re-baked
// every range on every frame (30-210 ms each) once more ranges were on screen than the shape cache held.
const BAKES = lru(16), LIT = lru(64);

// ridgelines: layer { base, top (0..1 of h), freq, jag, form (1 sharp cusp .. 2 round), haze, mist, gully }
function ridgeLayers(seed, w, h, layers, { endFall = 0.2, massifs = 2.4 } = {}) {
  const N = noiseOf(seed);
  return layers.map((ly, li) => {
    const r = rng(seed * 101 + li * 17 + 3), fr = ly.freq || 1, jg = ly.jag == null ? 0.4 : ly.jag;
    const form = ly.form || 1.25, off = li * 913.7 + seed * 37.1;
    // a few massifs of very different size (a row of equal peaks reads as teeth), each with long uneven shoulders
    const n = Math.max(2, Math.round(massifs * fr * 0.9 + r() * 1.5));
    const peaks = [];
    for (let k = 0; k < n; k++) {
      const c = (k + 0.15 + 0.7 * r()) / n;
      peaks.push({ c, a: 0.28 + 0.55 * r() * r(), sl: (0.07 + 0.15 * r()) / Math.sqrt(fr), sr: (0.07 + 0.15 * r()) / Math.sqrt(fr) });
    }
    peaks[Math.floor(r() * n)].a = 1;
    if (n > 3) peaks[(Math.floor(r() * n) + 1) % n].a = 0.7 + 0.15 * r();
    const raw = (u) => {
      // smooth max of the peaks: shoulders flow into each other, saddles stay low
      let s = 0;
      for (const p of peaks) { const d = u - p.c, sd = d < 0 ? p.sl : p.sr; s += Math.exp(8 * p.a * Math.exp(-Math.pow(Math.abs(d) / sd, form))) - 1; }
      const m = Math.log(1 + s) / 8;
      const pk = N.ridged(u * 16 * fr + off, off * 0.13, 4, 2.1, 0.5);
      return m * (1 - 0.3 * jg + 0.3 * jg * pk) + 0.012 * N.fbm1(u * 70 * fr + off, 2);
    };
    let vmax = 1e-3;
    for (let i = 0; i <= 400; i++) vmax = Math.max(vmax, raw(i / 400));
    // the ridge's floor undulates and sinks gently over the outer third toward each end, so a high back layer ends as
    // a long falling shoulder, not a flat table that drops off a cliff
    const H = (x) => {
      const u = x / w + 0.5, e = smooth(0, endFall, u) * smooth(0, endFall, 1 - u);
      const env = Math.pow(e, 0.7), fall = smooth(0, 0.34, u) * smooth(0, 0.34, 1 - u);
      const floor = ly.base * h * fall * (0.7 + 0.6 * N.fbm1(u * 4.3 + off * 0.21, 2));
      return env * (floor + (ly.top - ly.base) * h * clamp(raw(u) / vmax));
    };
    return { ...ly, H, li };
  });
}

export function rangeAsset(def) {
  const { id, w, h, layers, variants = 3 } = def;
  const bake = (seed, res) => {
    const N = noiseOf(seed * 13 + 5);
    const L = ridgeLayers(seed, w, h, layers, def.rangeOpts || {});
    if (def.shapeLayers) def.shapeLayers(L, seed, N);
    const W = Math.max(2, Math.ceil(w * res));
    // per column heights and running sums for blurred heights (the broad form of each spur)
    const cols = L.map((ly) => {
      const Hc = new Float32Array(W), S = new Float64Array(W + 1);
      for (let i = 0; i < W; i++) { Hc[i] = ly.H(-w / 2 + (i + 0.5) / res); S[i + 1] = S[i] + Hc[i]; }
      const box = (i, r) => { const a = Math.max(0, i - r), b = Math.min(W - 1, i + r); return (S[b + 1] - S[a]) / (b - a + 1); };
      // a fractional radius, so the broad form changes smoothly with depth (a rounded radius stepped the normals into
      // horizontal terraces)
      const blur = (i, rf) => { const r0 = Math.floor(rf), f = rf - r0; return lerp(box(i, r0), box(i, r0 + 1), f); };
      return { Hc, blur };
    });
    const gfx = def.gully || { fx: 1 / 42, fy: 1 / 70, depth: 24, warp: 30 };
    return bakeRelief({
      w, h, res,
      sample(x, y, s) {
        const i = clamp(Math.floor((x + w / 2) * res), 0, W - 1);
        for (let k = L.length - 1; k >= 0; k--) {
          const ly = L[k], c = cols[k], Hx = c.Hc[i], ry = -Hx;
          if (y < ry - 1 / res) continue;
          let a = clamp((y - ry) * res + 0.5);
          if (a < 1) { // the edge of a front ridge over a back ridge stays solid, so no sky seam shows between them
            for (let kk = k - 1; kk >= 0; kk--) if (y >= -cols[kk].Hc[i]) { a = 1; break; }
          }
          const dep = y - ry; // world units below this ridge's crest
          const r = Math.max(1, (10 + dep * 0.7) * res);
          const Hb = c.blur(i, r);
          const sl = clamp((c.blur(Math.min(W - 1, i + 1), r) - c.blur(Math.max(0, i - 1), r)) / (2 / res), -1.5, 1.5);
          // spurs and gullies run down the fall line: tilted away from the crest on each flank
          const wx = x + dep * sl * 0.45 + gfx.warp * N.fbm(x / 220, y / 220 + k * 5, 2);
          const gul = N.ridged(wx * gfx.fx + k * 3.1, y * gfx.fy, 3);
          const gd = gfx.depth * smooth(0, 50, dep) * (ly.gully == null ? 1 : ly.gully);
          s.a = a; s.id = k + 1;
          s.d = 0.8 * dep + 1.5 * Hb + gd * gul + 1.5 * N.fbm(x / 34, y / 30 + k, 2);
          const t = dep / Math.max(24, Hx);
          // aerial perspective inside the range: the layer's own haze, and mist rising from its foot
          s.hz = clamp((ly.haze || 0) + (1 - (ly.haze || 0)) * (ly.mist == null ? 0.45 : ly.mist) * smooth(0.25, 1.0, t));
          s.u = gul; s.v = dep; s.x3 = Hx;
          if (def.sampleExtra) def.sampleExtra(x, y, s, ly, N, seed);
          return;
        }
      },
      material(x, y, n, m, idv) {
        const k = idv - 1;
        def.material(x, y, n, m, L[k], N, seed, { w, h });
      },
    });
  };
  return {
    id, family: 'nature', title: def.title, about: def.about, w, h,
    states: def.states || ['idle'], loop: def.loop || 0, variants, ref: def.ref || null,
    draw(ctx, o) {
      const L = o.L, lit = o.lit >= 0 ? 1 : -1;
      // the scene draws its ranges at 0.15 to 0.25 px a unit: a bake finer than about 1.2 times that costs time (a new range
      // scrolling in was a 135 ms frame) and adds nothing the screen can show
      const res = def.res ? def.res(o.scale || 1) : (o.scale >= 0.8 ? 0.75 : o.scale >= 0.4 ? 0.6 : o.scale >= 0.22 ? 0.35 : 0.25);
      const seed = (o.seed | 0);
      const key = `${id}|${seed}|${res}`;
      const em = def.emissive ? def.emissive(L) : [0, 1, 1, 1];
      // the haze inside the range leans to the sky overhead: farther ridges go paler and bluer, not just paler
      const haze = mix(mix(L.haze, L.sky.horizon, 0.45), L.sky.top, 0.22);
      const cv = LIT.get(`${key}|${L.q}|${lit}`, () => lightRelief(BAKES.get(key, () => bake(seed, res)), L, lit, { em, rim: def.rim == null ? 0.8 : def.rim, haze, wrap: 0.0, front: 0.2 }));
      ctx.drawImage(cv, -w / 2, -h, w, h);
      if (def.live) def.live(ctx, o, seed);
    },
  };
}

export { lerp };
