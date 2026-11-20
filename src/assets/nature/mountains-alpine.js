// Alpine ranges: sharp grey peaks with snow on the high faces, four ridgelines stepping back into blue haze, dark
// forest on the soft front foothills.
import { rangeAsset } from './_range.js';
import { clamp, smooth, lerp } from './_lib.js';

export default rangeAsset({
  id: 'nature.mountains-alpine',
  title: 'Alpine ranges',
  about: 'Jagged alpine peaks, four ridges stepping back; snow on the high slopes, lit on the sun side, forest on the foothills.',
  w: 2400, h: 420, variants: 3,
  ref: 'refs/elements/mountains.webp',
  layers: [
    { base: 0.22, top: 1.0, haze: 0.58, mist: 0.6, freq: 0.9, jag: 0.6, form: 1.05 },
    { base: 0.12, top: 0.74, haze: 0.38, mist: 0.6, freq: 1.2, jag: 0.55, form: 1.1 },
    { base: 0.04, top: 0.48, haze: 0.17, mist: 0.55, freq: 1.5, jag: 0.45, form: 1.25, gully: 0.85 },
    { base: 0.0, top: 0.22, haze: 0.0, mist: 0.45, freq: 2.0, jag: 0.15, form: 1.8, gully: 0.4 },
  ],
  rangeOpts: { massifs: 2.4, endFall: 0.2 },
  gully: { fx: 1 / 38, fy: 1 / 60, depth: 26, warp: 26 },
  material(x, y, n, m, ly, N) {
    const gul = m.u, dep = m.v, alt = -y;
    let r = 112, g = 108, b = 106;
    const tone = N.fbm(x / 160, y / 90, 2);
    r += 18 * tone; g += 17 * tone; b += 16 * tone;
    // forest on the low front slopes
    const forest = (ly.li >= 2 ? 1 : 0) * smooth(0.3, 0.6, dep / Math.max(20, m.x3)) * smooth(0.25, 0.7, n.y + 0.2 * N.fbm(x / 60, y / 60, 2));
    r = lerp(r, 42, forest); g = lerp(g, 56, forest); b = lerp(b, 46, forest);
    // snow: high and not too steep, ragged at the edge, lying in the gullies longer than on the ribs
    const line = 236 - ly.li * 46 + 34 * N.fbm(x / 110, y / 80, 2) - 20 * (1 - gul);
    const snow = smooth(line, line + 30, alt) * smooth(0.05, 0.45, n.y + 0.25 * gul) * (ly.li >= 3 ? 0 : 1);
    r = lerp(r, 236, snow); g = lerp(g, 240, snow); b = lerp(b, 247, snow);
    m.r = r; m.g = g; m.b = b;
    m.cav = clamp(Math.pow(1 - gul, 2) * 0.55 * smooth(2, 40, dep) * (1 - snow * 0.6));
  },
});
