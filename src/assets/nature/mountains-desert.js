// Desert ranges: the low warm ranges behind the city in all four options. Three ridgelines stepping back into haze,
// broad spurs lit gold on the sun side, faint strata, pale fans at the foot.
import { rangeAsset } from './_range.js';
import { clamp, smooth, lerp } from './_lib.js';

export default rangeAsset({
  id: 'nature.mountains-desert',
  title: 'Desert ranges',
  about: 'Low eroded desert ranges, three ridges stepping back into haze; strata bands, dark gullies, pale fans at the foot.',
  w: 2400, h: 240, variants: 3,
  ref: 'refs/elements/mountains.webp',
  layers: [
    { base: 0.24, top: 1.0, haze: 0.56, mist: 0.6, freq: 0.8, jag: 0.4, form: 1.3 },
    { base: 0.1, top: 0.74, haze: 0.32, mist: 0.6, freq: 1.1, jag: 0.45, form: 1.25, gully: 0.85 },
    { base: 0.0, top: 0.44, haze: 0.0, mist: 0.5, freq: 1.5, jag: 0.4, form: 1.4 },
  ],
  rangeOpts: { massifs: 2.2, endFall: 0.2 },
  gully: { fx: 1 / 44, fy: 1 / 50, depth: 16, warp: 26 },
  material(x, y, n, m, ly, N) {
    const gul = m.u, dep = m.v, Hx = m.x3;
    const t = dep / Math.max(20, Hx);
    let r = 176, g = 140, b = 112;
    // strata: broad faint bands, bent by the slope
    const st = Math.sin((y + x * 0.03 + 16 * N.fbm(x / 300, y / 90, 2)) * 0.16);
    const band = smooth(0.2, 0.95, st) * smooth(4, 30, dep);
    r -= 16 * band; g -= 18 * band; b -= 14 * band;
    const tone = N.fbm(x / 180, y / 80 + 3, 2);
    r += 14 * tone; g += 10 * tone; b += 7 * tone;
    const fan = smooth(0.6, 1.0, t) * (0.6 + 0.4 * N.fbm(x / 90, 9, 2));
    r = lerp(r, 212, fan * 0.5); g = lerp(g, 182, fan * 0.5); b = lerp(b, 146, fan * 0.5);
    m.r = r; m.g = g; m.b = b;
    m.cav = clamp(Math.pow(1 - gul, 2) * 0.5 * smooth(2, 36, dep) + (1 - n.z) * 0.1);
  },
});
