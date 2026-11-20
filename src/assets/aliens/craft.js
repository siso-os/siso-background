// An alien craft (refs/elements/portal-aliens: the big ship in front of the portal): a manta grown in metal. A pale
// bronze-steel hull seen a little from above, wings sweeping back and curling down at the tips, grooves running out
// from the spine like the ribs of a ray, a dark glass dome over the cockpit, green lights under the wings, small amber
// ones along the side, a blue heart at the tail. It is in our air: the hour lights it, and the sky shows in its gloss.
// idle: hangs and drifts, lights breathing. fire: green plasma from under the nose. die (p): a burst inside it, it
// noses over and falls burning, trailing smoke, its lights going out.
import { clamp, lerp, smooth, ease, css, mix, shade, bloom, ih, TAU, GREEN, VIOLET, glowAmt } from './_lib.js';
import { cached } from '../../core/paint.js';
import { blast } from '../fx/explosion.js';
import { puffTinted, smokeTint, put, flame } from '../fx/_lib.js';

const W = 256, H = 80, CY = -40;
const HULL = [233, 225, 205], GOLD = [198, 153, 88], DARK = [44, 41, 41], AMBER = [255, 170, 70], BLUE = [90, 170, 255];

// The planform of a ray: wings that reach out to the side (not swept back like a jet's), their tips curling down,
// a body that runs on behind them into a tapering tail. Seen a little from above, so the near wing hangs below the hull
// and the far wing rises above it. Each wing: leading edge (cubic), tip curl (quadratic), trailing edge (cubic).
const NEAR = { lead: [[58, -2], [31, 4], [-3, 20], [-68, 36]], curl: [[-83, 39], [-82, 36]], trail: [[-82, 36], [-67, 20], [-52, 12], [-83, 4]] };
const FAR = { lead: [[68, -7], [74, -14], [97, -19], [116, -27]], curl: [[119, -29], [113, -30]], trail: [[113, -30], [69, -39], [2, -22], [-76, -8]] };
const bez = (P, u) => { const v = 1 - u; return [0, 1].map((k) => v * v * v * P[0][k] + 3 * v * v * u * P[1][k] + 3 * v * u * u * P[2][k] + u * u * u * P[3][k]); };
function wingPath(g, Wg) {
  const { lead: a, curl: c, trail: t } = Wg;
  g.beginPath(); g.moveTo(...a[0]); g.bezierCurveTo(...a[1], ...a[2], ...a[3]); g.quadraticCurveTo(...c[0], ...c[1]);
  g.bezierCurveTo(...t[1], ...t[2], ...t[3]); g.closePath();
}
// a point on the wing's outer edge, u 0 (wing root at the front) .. 1 (wing root at the back)
const edge = (Wg, u) => (u < 0.55 ? bez(Wg.lead, u / 0.55) : bez(Wg.trail, (u - 0.55) / 0.45));
const root = (Wg, u) => [lerp(Wg.lead[0][0] - 6, Wg.trail[3][0], u), lerp(Wg.lead[0][1], Wg.trail[3][1], u)];
function hull(g) { g.beginPath(); g.moveTo(108, 2); g.bezierCurveTo(105, -7, 69, -18, 30, -17); g.bezierCurveTo(-20, -15, -70, -8, -104, -2); g.lineTo(-124, 0); g.lineTo(-104, 3); g.bezierCurveTo(-70, 9, -10, 11, 40, 9); g.bezierCurveTo(80, 8, 101, 10, 108, 2); g.closePath(); }

// ribs from the body out to the edge, like a ray's cartilage, and scale-like crescents between them
function ribs(g, Wg, n, dark, light) {
  g.lineWidth = 0.7; g.strokeStyle = dark; g.beginPath();
  for (let i = 1; i < n; i++) { const u = i / n, [rx, ry] = root(Wg, u), [ex, ey] = edge(Wg, u); g.moveTo(rx, ry); g.quadraticCurveTo((rx + ex) / 2 + 5, (ry + ey) / 2, ex, ey); }
  g.stroke();
  if (light) {
    g.lineWidth = 0.4; g.strokeStyle = light; g.beginPath();
    for (let i = 1; i < n; i++) { const u = i / n, [rx, ry] = root(Wg, u), [ex, ey] = edge(Wg, u); g.moveTo(rx - 0.8, ry + 0.8); g.quadraticCurveTo((rx + ex) / 2 + 4.2, (ry + ey) / 2 + 0.8, ex - 0.8, ey + 0.8); }
    g.stroke();
  }
}
function scales(g, Wg, n, c) {
  g.lineWidth = 0.5; g.strokeStyle = c; g.beginPath();
  for (let i = 0; i < n; i++) for (let j = 1; j < 6; j++) {
    const u = (i + 0.5) / n, v = j / 6, [rx, ry] = root(Wg, u), [ex, ey] = edge(Wg, u), x = lerp(rx, ex, v), y = lerp(ry, ey, v), s = 2.2 + 1.4 * v;
    g.moveTo(x - s, y); g.quadraticCurveTo(x, y + s * 0.75, x + s, y);
  }
  g.stroke();
}

function body(g, L, lit) {
  g.translate(0, CY);
  const sky = mix(L.sky.horizon, L.sky.top, 0.3);
  const top = (f) => mix(shade(HULL, L, f, { gloss: 0.09 }), HULL, 0.15 + 0.21 * Math.max(0, f));
  const material = (x0, y0, x1, y1, stops) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([u, f]) => gr.addColorStop(u, css(top(f))));
    return gr;
  };
  const darkLine = (a) => css(shade(DARK, L, -0.2), a), gold = css(shade(GOLD, L, 0.8, { gloss: 0.2 }), 0.85);
  // far wing: we see its top, tipped away from us
  const fg = material(65 + lit * 29, -35, -37, 4, [[0, 0.88], [0.27, 0.61], [0.62, 0.28], [1, -0.65]]);
  g.fillStyle = fg; wingPath(g, FAR); g.fill();
  g.save(); wingPath(g, FAR); g.clip(); scales(g, FAR, 9, darkLine(0.25)); ribs(g, FAR, 9, darkLine(0.75), css(top(1), 0.37)); g.restore();
  g.strokeStyle = gold; g.lineWidth = 0.7; g.beginPath(); g.moveTo(...FAR.lead[0]); g.bezierCurveTo(...FAR.lead[1], ...FAR.lead[2], ...FAR.lead[3]); g.stroke();
  // hull: lit top, shadowed side, a dark belly line, running back into the tail
  const hg = g.createLinearGradient(lit * 32, -18, -lit * 12, 12);
  hg.addColorStop(0, css(mix(top(1), sky, 0.15))); hg.addColorStop(0.3, css(top(0.7))); hg.addColorStop(0.55, css(top(0.2)));
  hg.addColorStop(0.8, css(shade(HULL, L, -0.4))); hg.addColorStop(1, css(shade(DARK, L, -0.6)));
  g.fillStyle = hg; hull(g); g.fill();
  g.strokeStyle = css(mix(top(1), [255, 255, 255], 0.2 * L.keyAmt), 0.8); g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(104, -2); g.bezierCurveTo(90, -9, 60, -13, 30, -14); g.bezierCurveTo(-20, -14, -70, -7, -104, -1.5); g.stroke();
  g.strokeStyle = darkLine(0.5); g.lineWidth = 0.5; g.beginPath();
  for (const x of [80, 60, 6, -26, -56, -86]) { const yt = x > 30 ? -14 + (x - 30) * 0.13 : -14 + (30 - x) * 0.09; g.moveTo(x, yt + 3); g.quadraticCurveTo(x - 4, 0, x - 2, 8); }
  g.moveTo(104, 2); g.bezierCurveTo(60, 1, 0, 1, -110, 0.5); g.stroke();
  g.strokeStyle = gold; g.beginPath(); g.moveTo(96, -3.4); g.bezierCurveTo(72, -10, 50, -12.6, 30, -13.2); g.stroke();
  // the near wing: big, close, hanging below the hull; its top lit, ribbed and scaled like a ray's back
  const wg = material(lit * 25, -3, -56, 40, [[0, 0.92], [0.14, 0.65], [0.39, 0.1], [0.73, 0.53], [1, -0.34]]);
  g.fillStyle = wg; wingPath(g, NEAR); g.fill();
  g.save(); wingPath(g, NEAR); g.clip();
  scales(g, NEAR, 9, darkLine(0.22));
  ribs(g, NEAR, 8, darkLine(0.72), css(top(1), 0.39));
  for (let i = 0; i < 72; i++) {
    const u = ih(i, 1, 20), v = ih(i, 2, 20);
    const [rx, ry] = root(NEAR, u), [ex, ey] = edge(NEAR, u);
    g.fillStyle = i % 3 ? 'rgba(21,15,12,0.19)' : css(top(0.85), 0.47);
    g.fillRect(lerp(rx, ex, v), lerp(ry, ey, v), 0.5 + u * 1.8, 0.6);
  }
  g.restore();
  // Two darker nacelles are tucked below the bone shell, with inset nozzles.
  const nozzle = g.createLinearGradient(0, 3, 0, 18);
  nozzle.addColorStop(0, css(top(0.72)));
  nozzle.addColorStop(0.32, css(shade(DARK, L, 0.12)));
  nozzle.addColorStop(1, '#090c13');
  g.fillStyle = nozzle;
  g.beginPath(); g.moveTo(-13, 9); g.bezierCurveTo(3, 4, 27, 1, 40, 6);
  g.bezierCurveTo(43, 13, 15, 18, -5, 19); g.quadraticCurveTo(-14, 17, -13, 9); g.fill();
  g.beginPath(); g.moveTo(46, 4); g.quadraticCurveTo(71, 2, 84, 7);
  g.quadraticCurveTo(72, 14, 49, 13); g.closePath(); g.fill();
  g.strokeStyle = css(mix(top(1), [255, 255, 255], 0.25), 0.9); g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(...NEAR.lead[0]); g.bezierCurveTo(...NEAR.lead[1], ...NEAR.lead[2], ...NEAR.lead[3]); g.stroke();
  g.strokeStyle = gold; g.lineWidth = 0.7; g.beginPath(); g.moveTo(NEAR.lead[0][0] - 2, NEAR.lead[0][1] + 1.3);
  g.bezierCurveTo(NEAR.lead[1][0], NEAR.lead[1][1] + 1.3, NEAR.lead[2][0], NEAR.lead[2][1] + 1.3, NEAR.lead[3][0], NEAR.lead[3][1] + 1.3); g.stroke();
  // the curled tip and the trailing edge fall into shadow
  g.strokeStyle = css(shade(DARK, L, -0.5), 0.8); g.lineWidth = 1.3;
  g.beginPath(); g.moveTo(...NEAR.trail[0]); g.bezierCurveTo(...NEAR.trail[1], ...NEAR.trail[2], ...NEAR.trail[3]); g.stroke();
  // the cockpit dome: dark glass with the sky in it and one hard highlight
  const dg = g.createRadialGradient(38 + lit * 6, -21, 1, 38, -14, 17);
  dg.addColorStop(0, css(mix(sky, [255, 255, 255], 0.3))); dg.addColorStop(0.35, css(mix(sky, [10, 14, 20], 0.55))); dg.addColorStop(1, 'rgb(8,10,14)');
  g.fillStyle = dg; g.beginPath(); g.ellipse(38, -13, 17, 7, -0.04, Math.PI, TAU); g.quadraticCurveTo(38, -11, 21, -13); g.fill();
  g.strokeStyle = css(top(0.6)); g.lineWidth = 0.9; g.beginPath(); g.ellipse(38, -13, 17, 7, -0.04, Math.PI, TAU); g.stroke();
  g.strokeStyle = `rgba(255,255,255,${0.35 + 0.4 * L.keyAmt})`; g.lineWidth = 0.8; g.beginPath(); g.ellipse(38, -13, 13, 5, -0.04, Math.PI * 1.15 + (lit > 0 ? 0.35 : 0), Math.PI * 1.5 + (lit > 0 ? 0.35 : 0)); g.stroke();
  // the dark intake for the blue heart, on top of the body behind the wings
  g.fillStyle = css(shade(DARK, L, -0.8)); g.beginPath(); g.ellipse(-100, -1, 3, 3.6, 0, 0, TAU); g.fill();
  g.translate(0, -CY);
}

const LIGHTS = { green: [[-14, 19], [-42, 23], [9, 15], [64, 9]], violet: [[-71, 32], [30, -22], [47, 11]], amber: [[80, 0], [60, 1], [40, 2], [-30, 3]] };

export default {
  id: 'aliens.craft', family: 'aliens', title: 'Alien craft',
  about: 'A manta grown in metal: bone-white plated hull seen a little from above, wings sweeping back and curling down, ribbed grooves, dark glass cockpit dome, green lights under the wings, amber along the side, a blue heart at the tail; lit by the hour, the sky in its gloss. idle: hangs and drifts; fire: green plasma from under the nose; die p: a burst inside, it noses over and falls burning, trailing smoke.',
  w: W, h: H, states: ['idle', 'fire', 'die'], loop: 4, once: { die: 3 }, variants: 1, free: true,
  ref: 'refs/elements/portal-aliens.webp',
  draw(ctx, o) {
    ctx.save();
    const L = o.L, t = o.t || 0, st = o.state || 'idle', p = clamp(o.p ?? 0.5), lit = (o.lit ?? L.side) < 0 ? -1 : 1, seed = o.seed || 0;
    const dying = st === 'die', ga = glowAmt(L);
    // where it is: hanging, or falling after the hit
    const fallP = dying ? smooth(0.12, 1, p) : 0;
    const dx = dying ? 60 * fallP : 0, dy = dying ? 260 * fallP * fallP : Math.sin(t * 1.3) * 2.5;
    const rot = dying ? 0.7 * ease(fallP) : Math.sin(t * 0.9) * 0.015;
    const lights = dying ? (p < 0.1 ? 1 : (1 - smooth(0.1, 0.5, p)) * (ih(Math.floor(t * 16), 1, seed) > 0.4 ? 1 : 0.2)) : 1;
    // smoke trail behind the fall: puffs at where it was, older ones bigger and fainter
    if (dying && p > 0.12) {
      const tint = smokeTint(L, 'black', lit);
      for (let i = 14; i >= 1; i--) {
        const pp = p - i * 0.035; if (pp < 0.12) continue;
        const f = smooth(0.12, 1, pp), age = (p - pp) / 0.5;
        put(ctx, puffTinted(i + seed, tint), -20 + 60 * f - 30 * age, CY + 260 * f * f - 18 * age, 9 + 17 * age, 0.58 * (1 - age * 0.65));
      }
      ctx.globalAlpha = 1;
    }
    ctx.translate(dx, dy); ctx.translate(0, CY); ctx.rotate(rot); ctx.translate(0, -CY);
    // the blue heart at the tail, behind the hull
    const hb = 0.85 + 0.15 * Math.sin(t * 3.1);
    bloom(ctx, -100, CY - 1, 26 * hb, BLUE, 0.5 * lights * (0.6 + 0.4 * ga)); bloom(ctx, -100, CY - 1, 6, [220, 240, 255], 0.9 * lights);
    const c = cached(`aliens.craft|0|${st}|${L.q}|${lit}`, W, H, (o.scale || 1) * (globalThis.devicePixelRatio || 1), (g) => body(g, L, lit));
    ctx.drawImage(c, -W / 2, -H, W, H);
    // lights: green under the wing, amber along the side, breathing in a slow wave
    for (const [x, y] of LIGHTS.green) { const b = 0.7 + 0.3 * Math.sin(t * 2 - x * 0.05); bloom(ctx, x, CY + y, 9, GREEN, 0.55 * b * lights * ga); bloom(ctx, x, CY + y, 2.2, [230, 255, 240], 0.9 * b * lights); }
    for (const [x, y] of LIGHTS.violet) bloom(ctx, x, CY + y, 10, VIOLET, 0.56 * ga * lights);
    for (const [x, y] of LIGHTS.amber) bloom(ctx, x, CY + y, 4, AMBER, 0.7 * lights * (0.5 + 0.5 * ga));
    if (st === 'fire') {
      // green plasma from two emitters under the nose: a charge glow, then a bolt that flies out of the box
      const per = 0.24;
      for (let n = 0; n < 4; n++) {
        const shot = Math.floor(t / per) - n, ts = t - shot * per, side = ((shot % 2) + 2) % 2, ey = CY + (side ? 5 : 7.5), ex = side ? 96 : 88, d = ts * 820;
        const op = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = css(GREEN, 0.35); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ex + d - 30, ey); ctx.lineTo(ex + d, ey); ctx.stroke();
        ctx.strokeStyle = 'rgba(230,255,240,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + d - 16, ey); ctx.lineTo(ex + d, ey); ctx.stroke();
        ctx.globalCompositeOperation = op;
        bloom(ctx, ex + d, ey, 12, GREEN, 0.8);
        if (ts < 0.06) bloom(ctx, ex, ey, 16, GREEN, 1 - ts / 0.06);
      }
      const charge = ((t % per) / per);
      bloom(ctx, 92, CY + 6, 4 + 6 * charge, GREEN, 0.3 + 0.5 * charge);
    }
    if (dying) {
      // fire on the hull where it was hit, leaning back in the wind of the fall
      const fireA = smooth(0.06, 0.2, p) * (1 - smooth(0.85, 1, p));
      if (fireA > 0) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) flame(ctx, (i + Math.floor(t * 12)) % 6, -10 - i * 12, CY - 4 + i * 2, 12, 24 + 8 * Math.sin(t * 9 + i), -1.1, fireA, 0.9);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        bloom(ctx, -20, CY, 40, [255, 140, 50], 0.4 * fireA);
      }
    }
    ctx.restore();
    // the burst itself stays where the hit happened
    if (dying && p < 0.55) { ctx.save(); blast(ctx, o, { R: 22, cy: CY, air: true, seed, p: p / 0.55 * 0.7, debris: 1, ring: 1 }); ctx.restore(); }
  },
};
