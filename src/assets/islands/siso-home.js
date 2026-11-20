// The SISO home island: a wide saucer of layered rock with a grass rim, white research buildings, domes and a radar
// dish on top, a big engine ring under its belly and four blue thruster pods. The tower stands on slots.tower.
import { cached } from '../../core/paint.js';
import { drawRock, enginePod, flame, labBlock, dome, trees, dish, glow, css, rng, mix, shade } from './_lib.js';

const W = 460, H = 250, TOP = -150, BOTTOM = -64;
const BLUE = [83, 178, 255];
const MAIN_POD = [-34, -48, 16];

function layout(seed) {
  const r = rng(seed * 53 + 17);
  const drips = [[-95, 5, 31], [37, 20, 67], [96, 4, 31]];
  const pods = [[-105, -64, 9], [103, -62, 9], [-171, -105, 7], [171, -104, 7]]
    .map(([x, y, s]) => [x + (r() - 0.5) * 7, y, s]);
  return { drips, pods };
}

function dressing(g, o, seed) {
  const L = o.L, r = rng(seed * 31 + 5), y0 = TOP + 1;
  // Back row: varied concrete and stained timber around the white domes.
  labBlock(g, -150, y0 - 4, 34, 13, o, { seed: 1 + seed });
  labBlock(g, 150, y0 - 4, 40, 15, o, { seed: 2 + seed, bands: 1 });
  dome(g, -110, y0 - 5, 9, o);
  trees(g, -186, y0 - 2, 6, o, seed + 1, 4);
  trees(g, 188, y0 - 2, 6, o, seed + 2, 4);
  // the tower podium: stepped white rings around the slot
  for (const [w, h, yy] of [[96, 7, 0], [70, 6, -7]]) {
    const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    const lit = o.lit >= 0 ? 1 : -1;
    const a = shade([224, 226, 230], L, -0.4), b = shade([224, 226, 230], L, 0.9);
    gr.addColorStop(0, css(lit > 0 ? a : b)); gr.addColorStop(1, css(lit > 0 ? b : a));
    g.fillStyle = gr; g.fillRect(-w / 2, y0 + yy - h, w, h);
    g.fillStyle = css(mix(shade([110, 160, 190], L, 0.2, { gloss: 0.6 }), [255, 205, 140], L.windows * 0.9));
    g.fillRect(-w / 2 + 4, y0 + yy - h * 0.62, w - 8, h * 0.3);
  }
  // front row: labs, a glass dome greenhouse, an observatory, a radar dish
  labBlock(g, -78, y0 + 1, 42, 20, o, { seed: 3 + seed, bands: 2 });
  labBlock(g, -132, y0 + 1, 30, 14, o, { seed: 4 + seed, glassFront: true, base: [155, 126, 98] });
  dome(g, 112, y0 + 1, 22, o, { glass: true, drum: 0.18 });
  labBlock(g, 70, y0 + 1, 34, 16, o, { seed: 5 + seed, bands: 1, base: [164, 161, 148] });
  dome(g, 160, y0 + 1, 11, o, { drum: 0.5 });
  dish(g, -172, y0 + 1, 18, o, -0.6);
  trees(g, -40, y0 + 2, 5, o, seed + 3, 3);
  trees(g, 40, y0 + 2, 5, o, seed + 4, 3);
  trees(g, 196, y0 + 3, 5, o, seed + 5, 3);
  trees(g, -205, y0 + 3, 4, o, seed + 6, 2);
  for (const [a, b] of [[-197, -69], [-52, 51], [63, 191]]) {
    const wall = g.createLinearGradient(0, y0 - 1, 0, y0 + 6.6);
    wall.addColorStop(0, css(shade([176, 174, 161], L, 0.64)));
    wall.addColorStop(0.2, css(shade([168, 164, 150], L, 0.14)));
    wall.addColorStop(1, css(shade([92, 90, 81], L, -0.62)));
    g.fillStyle = wall; g.beginPath(); g.moveTo(a, y0 + 3); g.lineTo(a + 7, y0 - 0.8);
    g.lineTo(b - 5, y0 - 0.8); g.lineTo(b, y0 + 3.8); g.lineTo(b - 8, y0 + 5.8);
    g.lineTo(a + 5, y0 + 5.4); g.fill();
    for (let x = a + 8; x < b - 8; x += 8 + r() * 8) {
      g.fillStyle = css([37, 36, 31], 0.4); g.fillRect(x, y0 + 1, 0.45, 3.7);
      if (r() < L.windows) {
        glow(g, x + 4, y0 + 1, 5, [255, 201, 124], 0.31 * L.windows);
        g.fillStyle = css([255, 203, 132], L.windows); g.fillRect(x + 3, y0 + 0.6, 2, 0.9);
      }
    }
  }

}

export default {
  id: 'islands.siso-home',
  family: 'islands',
  title: 'SISO home island',
  about: 'The big SISO island: layered rock, grass rim, white labs and domes, blue engines; boost flares them. slots.tower is where the tower stands.',
  w: W, h: H,
  states: ['idle', 'boost'],
  loop: 4, variants: 3,
  ref: 'refs/options/option-c-painted.webp',
  slots: { tower: [0, TOP - 13], dome: [0, TOP], guns: [[-150, TOP - 4], [150, TOP - 4]], engines: [[0, BOTTOM + 10]] },
  draw(ctx, o) {
    const seed = o.seed | 0, L = o.L, t = o.t || 0, lit = o.lit >= 0 ? 1 : -1;
    const lay = layout(seed);
    drawRock(ctx, o, { key: 'siso-home', seed, w: W, top: TOP, bottom: BOTTOM, drips: lay.drips, lip: 11, palette: 'siso' });
    const pc = cached(`islands.siso-home|pods|${seed}|${L.q}|${lit}`, W, H, o.scale || 1, (g) => {
      for (const [x, y, s] of [...lay.pods, MAIN_POD]) enginePod(g, x, y, s, o, BLUE, { long: 0.73 });
    });
    ctx.drawImage(pc, -W / 2, -H, W, H);
    const c = cached(`islands.siso-home|${seed}|${L.q}|${lit}`, W, H, o.scale || 1, (g) => dressing(g, o, seed));
    ctx.drawImage(c, -W / 2, -H, W, H);
    // engines: flames, spill light on the rock, a slow breathing pulse
    const boost = o.state === 'boost' ? 1 : 0;
    const pw = 0.75 + 0.1 * Math.sin(t * 2.2) + boost * 0.75;
    for (const [i, [x, y, s]] of lay.pods.entries()) {
      flame(ctx, x, y + s * 0.25, s * 1.3, 16 + 12 * boost, t, BLUE, i + seed, pw);
      glow(ctx, x, y - s, s * 4, BLUE, 0.1 + 0.12 * boost);
    }
    const [mx, my, r] = MAIN_POD;
    flame(ctx, mx, my + 2, r * 1.3, 24 + 13 * boost, t, BLUE, 9 + seed, pw);
    glow(ctx, mx, my - 5, 54, BLUE, 0.1 + 0.1 * boost + 0.08 * L.night);
    // red beacons on the masts, blinking
    const blink = (t * 0.9 + seed * 0.3) % 1 < 0.12 ? 1 : 0;
    if (blink) { glow(ctx, -172, TOP - 22, 5, [255, 40, 30], 0.9); glow(ctx, 160, TOP - 18, 5, [255, 40, 30], 0.9); }
    // boost: a pulse of light along the rim
    if (boost) glow(ctx, 0, TOP + 10, 240, BLUE, 0.06 + 0.04 * Math.sin(t * 6));
  },
};
