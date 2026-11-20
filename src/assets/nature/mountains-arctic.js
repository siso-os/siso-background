// Arctic ranges: heavy snow over broad faces, dark rock only on the steepest ribs, glacier blue in the gullies; three
// ridgelines stepping back into cold haze.
import { rangeAsset } from './_range.js';
import { clamp, smooth, lerp } from './_lib.js';

export default rangeAsset({
  id: 'nature.mountains-arctic',
  title: 'Arctic ranges',
  about: 'Snow-buried arctic peaks, three ridges stepping back; dark rock on the cliffs, glacier blue in the gullies.',
  w: 2400, h: 380, variants: 3,
  ref: 'art/isles/plates/arctic-day.webp',
  layers: [
    { base: 0.36, top: 1.0, haze: 0.56, mist: 0.6, freq: 0.8, jag: 0.5, form: 1.15 },
    { base: 0.16, top: 0.72, haze: 0.33, mist: 0.6, freq: 1.15, jag: 0.5, form: 1.2 },
    { base: 0.0, top: 0.4, haze: 0.04, mist: 0.5, freq: 1.6, jag: 0.35, form: 1.45, gully: 0.7 },
  ],
  rangeOpts: { massifs: 2.4, endFall: 0.2 },
  gully: { fx: 1 / 40, fy: 1 / 56, depth: 24, warp: 24 },
  material(x, y, n, m, ly, N) {
    const gul = m.u, dep = m.v;
    const steep = 1 - n.y - 0.2 * N.fbm(x / 70, y / 60, 2);
    const rock = smooth(0.7, 0.86, steep) * smooth(3, 16, dep) * smooth(0.35, 0.75, gul);
    let r = lerp(234, 74, rock), g = lerp(239, 72, rock), b = lerp(248, 78, rock);
    const ice = clamp(Math.pow(1 - gul, 3) * 0.8) * (1 - rock);
    r = lerp(r, 176, ice * 0.45); g = lerp(g, 208, ice * 0.45); b = lerp(b, 236, ice * 0.45);
    const tone = N.fbm(x / 140, y / 80, 2);
    r += 6 * tone; g += 6 * tone; b += 5 * tone;
    m.r = r; m.g = g; m.b = b;
    m.cav = clamp(Math.pow(1 - gul, 2) * 0.4 * smooth(2, 36, dep));
  },
});
