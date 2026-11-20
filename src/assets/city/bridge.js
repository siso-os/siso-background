// A suspension bridge, 720 across: two portal towers, the main cables hung between them and down to the anchorages,
// suspenders every few units, a deck on a truss, piers into the water. After dark lights run along the cables and the
// deck lamps come on; red lights on the tower tops.
import { cached, css, mix, scale, shade, glow, rimColour, withBloom, lightRect, pxOf, clamp, dusk } from './_lib.js';

const W = 720, H = 170, DECK = -34, TOWER = 158, TX = 200, SAG = DECK - 10;

function cableY(x) { // the main cable: catenary-like between the towers, straight back-stays to the anchorages
  const ax = Math.abs(x);
  if (ax <= TX) { const u = x / TX; return SAG - (TOWER + SAG) * u * u * (0.92 + 0.08 * u * u); }
  const u = (ax - TX) / (W / 2 - TX); return -TOWER + (-TOWER - (DECK - 2)) * -u * 0.98;
}

function body(g, o, seed) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  const steel = [196, 74, 50 + (seed % 3) * 30], deckC = [120, 118, 116];
  // piers below the towers
  for (const s of [-1, 1]) {
    const gr = g.createLinearGradient(s * TX - 9, 0, s * TX + 9, 0);
    gr.addColorStop(0, css(shade([150, 146, 138], L, -0.5 * lit))); gr.addColorStop(1, css(shade([150, 146, 138], L, 0.6 * lit)));
    g.fillStyle = gr; g.fillRect(s * TX - 9, DECK, 18, -DECK);
    g.fillStyle = 'rgba(30,40,40,0.35)'; g.fillRect(s * TX - 9, -6, 18, 6);
  }
  // suspenders
  g.strokeStyle = css(shade(scale(steel, 0.8), L, 0), 0.85); g.lineWidth = 0.35; g.beginPath();
  for (let x = -W / 2 + 6; x < W / 2 - 6; x += 7) { if (Math.abs(Math.abs(x) - TX) < 3) continue; const cy = cableY(x); if (cy < DECK - 1) { g.moveTo(x, cy); g.lineTo(x, DECK - 3); } }
  g.stroke();
  // the deck and its truss
  const dg = g.createLinearGradient(0, DECK - 4, 0, DECK + 4);
  dg.addColorStop(0, css(shade(deckC, L, 0.7))); dg.addColorStop(0.4, css(shade(deckC, L, 0))); dg.addColorStop(1, css(shade(scale(deckC, 0.6), L, -0.4)));
  g.fillStyle = dg; g.fillRect(-W / 2, DECK - 3.5, W, 7.5);
  g.strokeStyle = css(shade(scale(deckC, 0.55), L, -0.2), 0.8); g.lineWidth = 0.35; g.beginPath();
  for (let x = -W / 2; x < W / 2; x += 6) { g.moveTo(x, DECK + 0.5); g.lineTo(x + 3, DECK + 4); g.lineTo(x + 6, DECK + 0.5); }
  g.stroke();
  g.fillStyle = css(rimColour(L), 0.3 + 0.4 * L.golden); g.fillRect(-W / 2, DECK - 3.6, W, 0.5);
  // main cables
  g.strokeStyle = css(shade(steel, L, 0.3, { gloss: 0.4 })); g.lineWidth = 1.1; g.beginPath();
  for (let x = -W / 2; x <= W / 2; x += 4) { const y = cableY(x); if (x === -W / 2) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
  // towers: two legs, portal beams, a lit edge
  for (const s of [-1, 1]) {
    for (const lx of [-4.5, 4.5]) {
      const x = s * TX + lx, gr = g.createLinearGradient(x - 2, 0, x + 2, 0);
      gr.addColorStop(0, css(shade(steel, L, -0.5 * lit))); gr.addColorStop(1, css(shade(steel, L, 0.7 * lit)));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - 2.4, DECK + 4); g.lineTo(x - 1.6, -TOWER); g.lineTo(x + 1.6, -TOWER); g.lineTo(x + 2.4, DECK + 4); g.fill();
    }
    g.fillStyle = css(shade(steel, L, 0.2));
    for (const y of [-TOWER + 2, -TOWER * 0.72, -TOWER * 0.42]) g.fillRect(s * TX - 6.5, y, 13, 3.2);
  }
  // lights after dark: strings along the cables, deck lamps
  if (L.windows > 0.15) {
    const a = Math.min(1, L.windows * 1.2), op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
    const k = Math.max(1, 0.9 * pxOf(g)), kd = Math.max(0.8, 1.1 * pxOf(g));
    for (let x = -W / 2 + 3; x < W / 2; x += Math.max(5, 2.5 * k)) { const y = cableY(x); lightRect(g, x - k / 2, y - k / 2, k, k, css([255, 236, 190], 0.9 * a)); g.fillStyle = css([255, 220, 160], 0.12 * a); g.fillRect(x - 2, y - 2, 4, 4); }
    for (let x = -W / 2 + 10; x < W / 2; x += 20) { lightRect(g, x - kd / 2, DECK - 6, kd, kd, css([255, 214, 150], 0.9 * a)); const gr = g.createRadialGradient(x, DECK - 5, 0, x, DECK - 5, 7); gr.addColorStop(0, css([255, 210, 140], 0.3 * a)); gr.addColorStop(1, css([255, 210, 140], 0)); g.fillStyle = gr; g.fillRect(x - 7, DECK - 12, 14, 14); }
    g.globalCompositeOperation = op;
  }
}

export default {
  id: 'city.bridge',
  family: 'city',
  title: 'Suspension bridge',
  about: 'A suspension bridge 720 across, towers 158 tall, deck at 34: cables, suspenders, truss deck, piers; cable and deck lights after dark.',
  w: W, h: H,
  states: ['idle'],
  loop: 4, variants: 3,
  ref: 'refs/options/option-a-golden.webp',
  slots: { deck: [[-W / 2, DECK - 3.5], [W / 2, DECK - 3.5]] },
  draw(ctx, o) {
    const L = o.L, seed = (o.seed | 0) % 3, lit = o.lit >= 0 ? 1 : -1, t = o.t || 0;
    ctx.drawImage(cached(`city.bridge|${seed}|${L.q}|${lit}`, W, H, o.scale || 1, (g) => withBloom(g, dusk(L), () => body(g, o, seed))), -W / 2, -H, W, H);
    if (((t * 0.6) % 1) < 0.2 || L.windows > 0.3) for (const s of [-1, 1]) glow(ctx, s * TX, -TOWER - 1, 4, [255, 40, 30], ((t * 0.6) % 1) < 0.2 ? 0.95 : 0.35);
  },
};
