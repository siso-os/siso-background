// A waterfront quay, 600 long: a granite wall stained dark at the tide line, a paved edge with bollards and a rail,
// steps down to the water, lamp posts that come on at dusk.
import { cached, css, mix, scale, shade, glow, rimColour, rng } from './_lib.js';

const W = 600, H = 26, TOP = -11;

function body(g, o, seed) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1, r = rng(seed * 3 + 1), stone = [168, 160, 150];
  // the wall: coursed granite blocks
  const wg = g.createLinearGradient(0, TOP, 0, 0);
  wg.addColorStop(0, css(shade(stone, L, 0.2))); wg.addColorStop(0.6, css(shade(scale(stone, 0.85), L, 0))); wg.addColorStop(1, css(shade(mix(stone, [40, 60, 50], 0.6), L, -0.2)));
  g.fillStyle = wg; g.fillRect(-W / 2, TOP, W, -TOP);
  g.fillStyle = 'rgba(20,18,16,0.25)';
  for (let y = TOP + 2.6; y < 0; y += 2.6) g.fillRect(-W / 2, y, W, 0.25);
  for (let y = TOP, k = 0; y < 0; y += 2.6, k++) for (let x = -W / 2 + (k % 2) * 3; x < W / 2; x += 6) g.fillRect(x, y, 0.25, 2.6);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.04 + r() * 0.06})`; g.fillRect(-W / 2 + r() * W, TOP + r() * -TOP, 6, 2.6); }
  // the paved edge and its lit lip
  g.fillStyle = css(shade([186, 180, 170], L, 0.6)); g.fillRect(-W / 2, TOP - 1.2, W, 1.2);
  g.fillStyle = css(rimColour(L), 0.3 + 0.4 * L.golden); g.fillRect(-W / 2, TOP - 1.2, W, 0.3);
  // steps down to the water
  for (const sx of [-160 + r() * 30, 120 + r() * 40]) for (let k = 0; k < 7; k++) {
    g.fillStyle = css(shade([180, 172, 162], L, k % 2 ? 0.5 : 0)); g.fillRect(sx + k * 1.6, TOP + k * 1.5, 14 - k * 1.6, 1.5);
  }
  // a rail, bollards
  g.fillStyle = css(shade([50, 54, 58], L, 0.3)); g.fillRect(-W / 2, TOP - 4.4, W, 0.25);
  for (let x = -W / 2 + 2; x < W / 2; x += 4) g.fillRect(x, TOP - 4.4, 0.2, 3.2);
  for (let x = -W / 2 + 15; x < W / 2; x += 30) { g.fillStyle = css(shade([40, 40, 44], L, 0.2 * lit)); g.fillRect(x - 0.5, TOP - 2.2, 1, 1); g.beginPath(); g.arc(x, TOP - 2.2, 0.7, Math.PI, 0); g.fill(); }
  // lamp posts
  for (let x = -W / 2 + 25; x < W / 2; x += 50) {
    g.fillStyle = css(shade([46, 50, 56], L, 0.2)); g.fillRect(x - 0.15, TOP - 9.5, 0.3, 8.3); g.fillRect(x - 0.15, TOP - 9.5, 1.2, 0.25);
    g.fillStyle = L.windows > 0.25 ? css([255, 226, 170]) : css(shade([210, 210, 200], L, 0.2)); g.fillRect(x + 0.6, TOP - 9.3, 0.7, 0.5);
  }
  // tide stain and weed at the waterline
  const tg = g.createLinearGradient(0, -5, 0, 0); tg.addColorStop(0, 'rgba(30,40,30,0)'); tg.addColorStop(1, 'rgba(30,50,36,0.55)');
  g.fillStyle = tg; g.fillRect(-W / 2, -5, W, 5);
}

export default {
  id: 'city.quay',
  family: 'city',
  title: 'Quay',
  about: 'A granite waterfront quay 600 long and 11 high: bollards, a rail, steps to the water, a tide stain; lamps come on at dusk.',
  w: W, h: H,
  states: ['idle'],
  loop: 0, variants: 3,
  ref: 'refs/options/option-a-golden.webp',
  draw(ctx, o) {
    const L = o.L, seed = Math.abs(o.seed | 0) % 3, lit = o.lit >= 0 ? 1 : -1;
    ctx.drawImage(cached(`city.quay|${seed}|${L.q}|${lit}`, W, H, o.scale || 1, (g) => body(g, o, seed)), -W / 2, -H, W, H);
    if (L.windows > 0.25) for (let x = -W / 2 + 25; x < W / 2; x += 50) glow(ctx, x + 0.95, TOP - 9, 6, [255, 214, 150], 0.5 * L.windows);
  },
};
