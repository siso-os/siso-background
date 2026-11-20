// The arena: a city landmark of white shell. A low glazed bowl under a broad lattice roof whose white ribs cross in a
// diagrid; by day the shell catches the sun, after dark it glows from inside in a seeded colour. event lights it up.
import { cached, css, mix, scale, shade, glow, rimColour, glassColour, NEON, clamp } from './_lib.js';

const W = 270, H = 90, RX = 128, BOWL = 30, ROOF = 76;

function roofY(x) { const u = clamp(Math.abs(x) / RX); return -BOWL - (ROOF - BOWL) * Math.pow(1 - u * u, 0.6); }

function body(g, o, seed) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1, glowC = NEON[seed % NEON.length];
  // the glazed bowl under the roof
  const gg = g.createLinearGradient(0, -BOWL, 0, 0);
  gg.addColorStop(0, css(shade(glassColour(L, 0.7), L, 0, { gloss: 0.6 }))); gg.addColorStop(1, css(shade(scale(glassColour(L, 0.3), 0.6), L, -0.2)));
  g.fillStyle = gg; g.fillRect(-RX + 8, -BOWL - 2, (RX - 8) * 2, BOWL + 2);
  if (L.windows > 0.05) { g.fillStyle = css(mix([255, 220, 170], glowC, 0.3), 0.55 * L.windows); g.fillRect(-RX + 8, -BOWL + 4, (RX - 8) * 2, BOWL - 10); }
  g.fillStyle = css(shade([220, 220, 216], L, 0.1)); for (let x = -RX + 8; x <= RX - 8; x += 6) g.fillRect(x - 0.4, -BOWL - 2, 0.8, BOWL + 2);
  g.fillStyle = css(shade([200, 198, 192], L, 0.3)); g.fillRect(-RX - 4, -3, (RX + 4) * 2, 3); // plinth
  // the shell: white, lit across from the sun side, with a soft underside shadow
  const sg = g.createLinearGradient(-RX, 0, RX, 0);
  const a = shade([238, 238, 234], L, -0.4), b = shade([238, 238, 234], L, 0.95, { gloss: 0.2 });
  sg.addColorStop(0, css(lit > 0 ? a : b)); sg.addColorStop(0.55, css(mix(a, b, 0.6))); sg.addColorStop(1, css(lit > 0 ? b : a));
  g.fillStyle = sg; g.beginPath(); g.moveTo(-RX, -BOWL + 4);
  for (let x = -RX; x <= RX; x += 2) g.lineTo(x, roofY(x));
  g.lineTo(RX, -BOWL + 4); g.quadraticCurveTo(0, -BOWL - 4, -RX, -BOWL + 4); g.closePath(); g.fill();
  // diagrid ribs and the glazing between them
  g.save(); g.clip();
  const night = clamp(L.windows * 1.3);
  if (night > 0.03) { const ig = g.createLinearGradient(0, -ROOF, 0, -BOWL); ig.addColorStop(0, css(glowC, 0.25 * night * (0.4 + 0.6 * L.neon))); ig.addColorStop(1, css(mix(glowC, [255, 255, 255], 0.4), 0.5 * night)); g.fillStyle = ig; g.fillRect(-RX, -ROOF, RX * 2, ROOF); }
  g.strokeStyle = css(shade([250, 250, 248], L, 0.6), 0.85); g.lineWidth = 0.7; g.beginPath();
  for (let x = -RX * 2; x <= RX * 2; x += 12) { g.moveTo(x, 0); g.lineTo(x + ROOF * 1.2, -ROOF); g.moveTo(x, 0); g.lineTo(x - ROOF * 1.2, -ROOF); }
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.5; g.beginPath();
  for (let x = -RX * 2 + 1; x <= RX * 2; x += 12) { g.moveTo(x, 0); g.lineTo(x + ROOF * 1.2, -ROOF); }
  g.stroke();
  const ug = g.createLinearGradient(0, -BOWL - 12, 0, -BOWL + 4); ug.addColorStop(0, 'rgba(0,0,0,0)'); ug.addColorStop(1, 'rgba(10,10,20,0.3)'); g.fillStyle = ug; g.fillRect(-RX, -BOWL - 12, RX * 2, 16);
  g.restore();
  g.strokeStyle = css(rimColour(L), 0.35 + 0.5 * L.golden); g.lineWidth = 0.8; g.beginPath();
  for (let x = -RX; x <= RX; x += 2) { const y = roofY(x); if (x === -RX) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
}

export default {
  id: 'city.arena',
  family: 'city',
  title: 'Arena',
  about: 'The city landmark: a glazed bowl under a broad white diagrid shell, 256 across and 76 high; the shell glows inside at night in a seeded colour, event floods it with light.',
  w: W, h: H,
  states: ['idle', 'event'],
  loop: 6, variants: 5,
  ref: 'refs/options/option-a-golden.webp',
  draw(ctx, o) {
    const L = o.L, seed = Math.abs(o.seed | 0) % 5, lit = o.lit >= 0 ? 1 : -1, t = o.t || 0;
    ctx.drawImage(cached(`city.arena|${seed}|${L.q}|${lit}`, W, H, o.scale || 1, (g) => body(g, o, seed)), -W / 2, -H, W, H);
    if (o.state === 'event') { // floodlights round the rim and a pulse in the shell
      const c = NEON[seed % NEON.length], pl = 0.6 + 0.4 * Math.sin(t * 3);
      glow(ctx, 0, -BOWL - 20, RX * 1.1, mix(c, [255, 255, 255], 0.4), 0.18 * pl * (0.4 + L.night));
      for (let i = -3; i <= 3; i++) glow(ctx, i * RX / 3.6, roofY(i * RX / 3.6) - 1, 7, [255, 250, 230], 0.8);
    }
  },
};
