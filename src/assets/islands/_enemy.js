// enemyIsland(def): the enemy's floating fortress. A walled town of weathered red brick on a slab of grey rock: round
// towers with machicolations and iron finials, slate roofs climbing to a citadel, a gatehouse with banners, cannon in the
// curtain wall, and brass engine drums hanging under the rock. States: idle, boost, fire (muzzle and launch flashes in
// sequence), hit (scorched, burning), fall (p 0..1: tilts over, engines sputter out, smoke, pieces break off).
import { cached } from '../../core/paint.js';
import { drawRock, flame, fireAt, smokeColumn, glow, css, mix, scale, shade, rng, clamp, rimColour, noiseOf } from './_lib.js';

const ORANGE = [255, 110, 40], WARM = [255, 170, 90];
const BRICK = [152, 77, 60], BRICK2 = [127, 66, 53], SLATE = [70, 72, 82], IRON = [62, 60, 66];
const BRASS = [150, 106, 66], RUST = [122, 64, 44], BANNER = [150, 28, 26];

// the tone of a surface turned `f` toward the sun (-1 away .. 1 square on), pulled into the haze with distance
const tone = (base, L, f, haze = 0) => mix(shade(base, L, f), L.haze, haze);

// the side gradient of a body: a cylinder (round) or a flat wall turned slightly to the sun
function body(g, x0, w, base, L, lit, round, haze) {
  const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
  const st = round ? [[0, -0.9], [0.38, -0.15], [0.72, 0.8], [0.9, 0.55], [1, 0.05]] : [[0, -0.05], [1, 0.3]];
  for (const [k, f] of st) gr.addColorStop(lit > 0 ? k : 1 - k, css(tone(base, L, f, haze)));
  return gr;
}

// brickwork: the body, brick-by-brick tone (bucketed into a few fills), grime at the foot, rain streaks, a sun rim
function brick(g, x0, y0, w, h, o, seed, { base = BRICK, round = false, haze = 0, fine = true } = {}) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1, r = rng(seed * 13 + 7);
  g.fillStyle = body(g, x0, w, base, L, lit, round, haze); g.fillRect(x0, y0, w, h);
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  if (fine) {
    const B = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const bw = 2.8, bh = 1.3;
    for (let y = y0, row = 0; y < y0 + h; y += bh, row++) {
      for (let x = x0 - (row % 2) * bw * 0.5; x < x0 + w; x += bw) B[(r() * 4) | 0].rect(x, y, bw - 0.35, bh - 0.3);
    }
    const fills = ['rgba(18,6,4,0.26)', 'rgba(18,6,4,0.12)', 'rgba(255,196,160,0.05)', 'rgba(255,200,170,0.11)'];
    B.forEach((p, i) => { g.fillStyle = fills[i]; g.fill(p); });
    const n = noiseOf(seed + 15), salts = new Path2D(), soot = new Path2D();
    for (let y = y0; y < y0 + h; y += 0.64) for (let x = x0; x < x0 + w; x += 0.78) {
      const patch = n.n2(x / 5, y / 7);
      if (patch > 0.25 && r() < 0.27) salts.rect(x, y, 0.25 + r() * 0.85, 0.16 + r() * 0.55);
      if (patch < -0.2 && r() < 0.19) soot.rect(x, y, 0.34 + r() * 0.53, 0.35 + r() * 0.75);
    }
    g.fillStyle = css(shade([177, 171, 154], L, 0.38), 0.5); g.fill(salts);
    g.fillStyle = css([35, 20, 21], 0.46); g.fill(soot);
  }
  const gr = g.createLinearGradient(0, y0, 0, y0 + h);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(14,6,4,0.06)'); gr.addColorStop(1, 'rgba(14,6,4,0.42)');
  g.fillStyle = gr; g.fillRect(x0, y0, w, h);
  g.fillStyle = 'rgba(22,10,8,0.18)';
  for (let i = 0; i < w / 7; i++) { const x = x0 + r() * w; g.fillRect(x, y0, 0.5 + r() * 0.6, h * (0.2 + 0.6 * r())); }
  g.restore();
  if (!round) { g.fillStyle = css(rimColour(L), 0.15 + 0.5 * L.golden); g.fillRect(lit > 0 ? x0 + w - 0.7 : x0, y0, 0.7, h); }
}

// arched windows: dark glass by day, warm lamplight from dusk; a few burn all day deep inside
function windows(g, x0, y0, w, h, o, seed, { cols = 2, rows = 2, ww = 1.3, wh = 2.6, on = 0.25 } = {}) {
  const L = o.L, r = rng(seed * 7 + 3);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + (i + 0.5) * w / cols, y = y0 + (j + 0.5) * h / rows;
    const lit = r() < on + (1 - on) * L.windows * 0.85;
    const k = lit ? clamp(0.18 + L.windows * 1.15) : 0;
    g.fillStyle = css(k > 0 ? mix([54, 30, 22], WARM, k) : [34, 24, 22]);
    g.beginPath(); g.moveTo(x - ww / 2, y + wh / 2); g.lineTo(x - ww / 2, y - wh / 2 + ww / 2);
    g.arc(x, y - wh / 2 + ww / 2, ww / 2, Math.PI, 0); g.lineTo(x + ww / 2, y + wh / 2); g.closePath(); g.fill();
  }
}

// a crenellated parapet on a corbelled band; spikes: iron finials on the merlons
function parapet(g, x0, y, w, o, { base = BRICK, m = 2.2, spikes = 0, round = false, haze = 0 } = {}) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  g.fillStyle = body(g, x0, w, base, L, lit, round, haze); g.fillRect(x0, y - 1.8, w, 1.8);
  g.fillStyle = 'rgba(12,4,2,0.5)';
  for (let x = x0 + 0.4; x < x0 + w - 0.4; x += 1.6) g.fillRect(x, y, 0.8, 0.9);
  const n = Math.max(2, Math.round(w / (m * 2))), step = w / n, mh = m * 1.15;
  for (let i = 0; i < n; i++) {
    const mx = x0 + i * step + step * 0.22, mw = step * 0.56;
    g.fillStyle = body(g, x0, w, base, L, lit, round, haze); g.fillRect(mx, y - 1.8 - mh, mw, mh);
    if (spikes) {
      g.fillStyle = css(tone(IRON, L, 0.2, haze));
      g.beginPath(); g.moveTo(mx + mw / 2 - 0.35, y - 1.8 - mh); g.lineTo(mx + mw / 2, y - 1.8 - mh - spikes); g.lineTo(mx + mw / 2 + 0.35, y - 1.8 - mh); g.fill();
    }
  }
  return 1.8 + mh;
}

// a conical slate roof with a finial
function cone(g, x, yb, w, h, o, haze = 0) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  g.fillStyle = body(g, x - w / 2, w, SLATE, L, lit, true, haze);
  g.beginPath(); g.moveTo(x - w / 2, yb); g.lineTo(x, yb - h); g.lineTo(x + w / 2, yb); g.closePath(); g.fill();
  g.fillStyle = 'rgba(10,8,10,0.35)'; g.fillRect(x - w / 2, yb - 0.6, w, 0.6);
  g.fillStyle = css(tone(IRON, L, 0.3, haze)); g.fillRect(x - 0.3, yb - h - 4, 0.6, 4);
}

// a round tower: brick drum, slit windows, a machicolated crown, then merlons with finials or a slate cone
function tower(g, t, o, seed) {
  const { x, w, h, yb } = t, y0 = yb - h, hz = t.haze || 0;
  brick(g, x - w / 2, y0, w, h, o, seed, { round: true, haze: hz, fine: !hz });
  windows(g, x - w * 0.32, y0 + 7, w * 0.64, h * 0.6, o, seed + 1, { cols: w > 14 ? 2 : 1, rows: Math.max(1, Math.round(h / 15)), on: 0.18 });
  const cw = w + 2.6;
  brick(g, x - cw / 2, y0 - 3.4, cw, 3.4, o, seed + 2, { round: true, haze: hz, fine: false });
  g.fillStyle = 'rgba(10,4,2,0.45)'; g.fillRect(x - w / 2, y0, w, 1.1);
  if (t.roof) cone(g, x, y0 - 3.4, cw + 1.4, t.roof, o, hz);
  else parapet(g, x - cw / 2, y0 - 3.4, cw, o, { round: true, spikes: t.spike ? 3.2 : 0, haze: hz });
}

// a town house: brick or plaster, punched windows by floor, a hipped slate roof, sometimes a chimney
function house(g, b, o, seed) {
  const L = o.L, r = rng(seed * 5 + 1), { x, w, h, yb } = b, hz = b.haze || 0, y0 = yb - h;
  brick(g, x - w / 2, y0, w, h, o, seed, { base: r() < 0.5 ? BRICK : BRICK2, haze: hz, fine: false });
  const floors = Math.max(1, Math.floor((h - 3) / 4.6));
  windows(g, x - w / 2 + 1.5, y0 + 2, w - 3, floors * 4.6, o, seed + 9, { cols: Math.max(1, Math.round(w / 3.4)), rows: floors, ww: 1.1, wh: 1.9, on: 0.12 });
  const rh = b.roof, lit = o.lit >= 0 ? 1 : -1;
  if (b.dome) {
    const gr = g.createRadialGradient(x + lit * w * 0.18, y0 - w * 0.32, 0.5, x, y0, w * 0.55);
    gr.addColorStop(0, css(tone([130, 136, 140], L, 0.9, hz))); gr.addColorStop(1, css(tone(SLATE, L, -0.6, hz)));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y0, w * 0.42, Math.PI, 0); g.fill();
    g.fillStyle = css(tone(IRON, L, 0.3, hz)); g.fillRect(x - 0.3, y0 - w * 0.42 - 3, 0.6, 3);
    return;
  }
  g.fillStyle = body(g, x - w / 2, w, SLATE, L, lit, false, hz);
  g.beginPath(); g.moveTo(x - w / 2 - 0.6, y0); g.lineTo(x - w / 2 + rh * 0.7, y0 - rh); g.lineTo(x + w / 2 - rh * 0.7, y0 - rh); g.lineTo(x + w / 2 + 0.6, y0); g.closePath(); g.fill();
  g.fillStyle = css(rimColour(L), 0.12 + 0.4 * L.golden); g.fillRect(x - w / 2 + rh * 0.7, y0 - rh, w - rh * 1.4, 0.45);
  g.fillStyle = 'rgba(10,6,6,0.4)'; g.fillRect(x - w / 2 - 0.6, y0 - 0.5, w + 1.2, 0.5);
  if (r() < 0.45) { const cx = x + (r() - 0.5) * w * 0.6; g.fillStyle = css(tone(BRICK2, L, 0.1, hz)); g.fillRect(cx - 0.8, y0 - rh - 3, 1.6, 3.5); }
}

// a cannon barrel from a port, pointing out and up
function barrel(g, x, y, len, wid, ang, o) {
  const L = o.L;
  g.save(); g.translate(x, y); g.rotate(ang);
  const gr = g.createLinearGradient(0, -wid / 2, 0, wid / 2);
  gr.addColorStop(0, css(shade(BRASS, L, 0.9, { gloss: 0.5 }))); gr.addColorStop(0.5, css(shade(BRASS, L, -0.1))); gr.addColorStop(1, css(shade(IRON, L, -0.8)));
  g.fillStyle = gr; g.fillRect(0, -wid / 2, len, wid);
  g.fillStyle = css(shade(IRON, L, -0.2)); g.fillRect(len - wid * 0.7, -wid * 0.65, wid * 0.7, wid * 1.3);
  g.restore();
}

// an engine drum hanging under the rock: riveted brass gone to rust, iron bands, a flared nozzle, feed pipes
function drum(g, x, y, s, o) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1, bw = s * 0.95, top = y - s * 3.4, foot = y - s * 0.55;
  g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    g.beginPath(); g.moveTo(x + sd * bw * 0.76, y - s * 0.63);
    g.bezierCurveTo(x + sd * bw * 2.34, y - s * 0.72, x + sd * bw * 1.56, y - s * 2.55, x + sd * bw * 1.59, top - s * 1.0);
    g.strokeStyle = css(shade([51, 38, 32], L, -0.45)); g.lineWidth = s * 0.32; g.stroke();
    g.strokeStyle = css(shade(mix(BRASS, RUST, 0.3), L, sd * lit * 0.38 + 0.27, { gloss: 0.16 }));
    g.lineWidth = s * 0.15; g.stroke();
  }
  g.fillStyle = body(g, x - bw * 1.09, bw * 2.18, IRON, L, lit, true, 0);
  g.fillRect(x - bw * 1.09, top - s * 0.52, bw * 2.18, s * 0.65);
  g.fillStyle = body(g, x - bw, bw * 2, mix(BRASS, RUST, 0.4), L, lit, true, 0); g.fillRect(x - bw, top, bw * 2, foot - top);
  for (const k of [0.15, 0.48, 0.8]) {
    const yy = top + (foot - top) * k;
    g.fillStyle = body(g, x - bw - 0.3, bw * 2 + 0.6, IRON, L, lit, true, 0); g.fillRect(x - bw - 0.3, yy, bw * 2 + 0.6, s * 0.2);
    g.fillStyle = 'rgba(255,220,180,0.08)'; g.fillRect(x - bw, yy + s * 0.2, bw * 2, s * 0.06);
  }
  g.fillStyle = 'rgba(30,14,8,0.3)'; g.fillRect(x - bw * 0.2, top, bw * 0.12, foot - top);
  const soot = g.createLinearGradient(0, top, 0, foot);
  soot.addColorStop(0, css([15, 12, 13], 0.68)); soot.addColorStop(0.29, css([15, 12, 13], 0));
  soot.addColorStop(0.74, css([15, 12, 13], 0)); soot.addColorStop(1, css([15, 12, 13], 0.45));
  g.fillStyle = soot; g.fillRect(x - bw, top, bw * 2, foot - top);
  const r = rng(Math.floor(x * 12));
  for (let i = 0; i < 25; i++) {
    const gx = x + (r() - 0.5) * bw * 1.7, gy = top + r() * (foot - top);
    g.fillStyle = i % 3 ? 'rgba(30,20,19,0.4)' : css(rimColour(L), 0.32 * L.keyAmt);
    g.fillRect(gx, gy, s * 0.08, s * r() * 0.17);
  }
  g.fillStyle = body(g, x - bw * 0.9, bw * 1.8, IRON, L, lit, true, 0);
  g.beginPath(); g.moveTo(x - bw * 0.7, foot); g.lineTo(x + bw * 0.7, foot); g.lineTo(x + bw * 0.92, y + s * 0.22); g.lineTo(x - bw * 0.92, y + s * 0.22); g.closePath(); g.fill();
  g.fillStyle = css(mix(ORANGE, [255, 230, 190], 0.45), 0.9);
  g.beginPath(); g.ellipse(x, y + s * 0.24, bw * 0.78, s * 0.14, 0, 0, Math.PI * 2); g.fill();
}

// the town inside the walls: two rows of houses climbing toward the middle, a few spiked towers among them
function townOf(def, lay, seed) {
  const r = rng(seed * 29 + 5), out = [[], []], { span, peak } = lay.town, wh = lay.wall.h, yb = def.top - 0.5;
  for (let row = 0; row < 2; row++) {
    let x = -span + r() * 5;
    while (x < span) {
      const w = 7 + r() * 12, cx = x + w / 2, f = Math.max(0, 1 - Math.abs(cx) / (span + 8));
      const h = wh + 4 + (row === 0 ? 1.2 : 0.64) * peak * Math.pow(f, 1.3) * (0.6 + 0.5 * r()) + 4 * r();
      const haze = row === 0 ? 0.14 : 0.05;
      if (row === 0 && r() < 0.16) out[row].push({ kind: 'tower', x: cx, w: 7 + r() * 4, h: h + 8 + r() * 12, yb, roof: r() < 0.5 ? 7 + r() * 6 : 0, spike: 1, haze });
      else out[row].push({ kind: 'house', x: cx, w, h, yb, haze, roof: 2.5 + r() * 4, dome: r() < 0.06 });
      x += w * (0.7 + r() * 0.35);
    }
  }
  return out;
}

export function enemyIsland(def) {
  const { id, w: W, h: H, top: TOP, bottom: BOTTOM } = def;
  const LAYS = new Map();
  const layout = (seed) => {
    if (!LAYS.has(seed)) { const lay = def.layout(seed, rng(seed * 61 + 3)); lay.townRows = townOf(def, lay, seed); LAYS.set(seed, lay); }
    return LAYS.get(seed);
  };
  const paintBody = (g, o, seed, scorched) => {
    const lay = layout(seed), L = o.L, wl = lay.wall;
    const draw = (b, i) => (b.kind === 'tower' ? tower(g, b, o, seed * 31 + i) : house(g, b, o, seed * 31 + i));
    lay.townRows[0].forEach(draw);
    if (lay.keep) { // the citadel: a tall block with a battery on its roof, two corner towers with slate cones
      const k = lay.keep, y0 = TOP - k.h;
      brick(g, k.x - k.w / 2, y0, k.w, k.h, o, seed + 70, { haze: 0.08 });
      windows(g, k.x - k.w / 2 + 3, y0 + 6, k.w - 6, k.h * 0.62, o, seed + 77, { cols: Math.round(k.w / 6), rows: Math.round(k.h / 11), ww: 1.5, wh: 3, on: 0.3 });
      parapet(g, k.x - k.w / 2 - 1, y0, k.w + 2, o, { spikes: 0, haze: 0.08 });
      for (const sd of [-1, 1]) tower(g, { x: k.x + sd * k.w / 2, w: 11, h: k.h + 14, yb: TOP, roof: W < 300 ? 12 : 0, spike: 1, haze: 0.06 }, o, seed + 80 + sd);
      const tx = k.x, ty = y0 - 4;
      g.fillStyle = css(shade(IRON, L, 0.2, { gloss: 0.4 }));
      g.beginPath(); g.ellipse(tx, ty, k.w * 0.22, k.w * 0.14, 0, Math.PI, 0); g.fill();
      g.fillRect(tx - k.w * 0.24, ty, k.w * 0.48, 4);
      barrel(g, tx - 2, ty - k.w * 0.07, k.w * 0.48, 2.4, Math.PI + 0.42, o);
      barrel(g, tx - 2, ty - k.w * 0.01, k.w * 0.48, 2.4, Math.PI + 0.36, o);
    }
    lay.townRows[1].forEach((b, i) => draw(b, i + 500));
    // the curtain wall: brick, buttresses, crenels, gun ports with cannon
    brick(g, wl.x0, TOP - wl.h, wl.x1 - wl.x0, wl.h, o, seed + 5);
    for (let x = wl.x0 + 14; x < wl.x1 - 8; x += 22) {
      g.fillStyle = 'rgba(16,6,4,0.22)'; g.fillRect(x + (o.lit >= 0 ? -2.2 : 2.6), TOP - wl.h + 2, 0.9, wl.h - 2);
      g.fillStyle = 'rgba(255,210,180,0.06)'; g.fillRect(x - 1.3, TOP - wl.h + 2, 2.6, wl.h - 2);
    }
    parapet(g, wl.x0, TOP - wl.h, wl.x1 - wl.x0, o, { m: 2.4 });
    for (const [px, ang] of lay.ports) {
      g.fillStyle = css([18, 10, 8]); g.fillRect(px - 2.4, TOP - wl.h * 0.45 - 2.2, 4.8, 4.4);
      barrel(g, px, TOP - wl.h * 0.45, 9, 2.1, ang, o);
    }
    // the gatehouse: taller block, two turrets, a glowing arch, banners either side
    const gw = lay.gate || 26, gh = wl.h + 9, gy = TOP - gh;
    brick(g, -gw / 2, gy, gw, gh, o, seed + 6);
    parapet(g, -gw / 2 - 0.8, gy, gw + 1.6, o, { m: 2 });
    for (const sd of [-1, 1]) tower(g, { x: sd * gw / 2, w: 8, h: gh + 6, yb: TOP, spike: 1 }, o, seed + 60 + sd);
    const aw = gw * 0.38, ah = gh * 0.58, k = clamp(L.windows * 1.15);
    const spring = TOP - ah + aw / 2;
    g.beginPath(); g.moveTo(-aw / 2, TOP); g.lineTo(-aw / 2, spring);
    g.arc(0, spring, aw / 2, Math.PI, 0); g.lineTo(aw / 2, TOP); g.closePath();
    g.strokeStyle = css(shade(BRICK, L, 0.54)); g.lineWidth = 1.5; g.stroke();
    const ag = g.createLinearGradient(0, TOP - ah, 0, TOP);
    ag.addColorStop(0, css([21, 13, 11])); ag.addColorStop(0.6, css(mix([39, 23, 18], [143, 73, 32], k)));
    ag.addColorStop(1, css(mix([47, 27, 20], [235, 138, 56], k)));
    g.fillStyle = ag; g.fill();
    g.save(); g.clip();
    g.fillStyle = 'rgba(16,10,8,0.64)';
    for (let x = -aw / 2 + 1; x < aw / 2; x += 1.6) g.fillRect(x, TOP - ah, 0.48, ah);
    g.restore();
    for (const bx of lay.banners) {
      const bh = wl.h * 0.7, top = TOP - wl.h + 1.5;
      const bg = g.createLinearGradient(bx - 2.2, 0, bx + 2.2, 0);
      bg.addColorStop(0, css(shade(BANNER, L, -0.5))); bg.addColorStop(0.6, css(shade(BANNER, L, 0.5))); bg.addColorStop(1, css(shade(BANNER, L, -0.2)));
      g.fillStyle = bg; g.beginPath(); g.moveTo(bx - 2.2, top); g.lineTo(bx + 2.2, top); g.lineTo(bx + 2.2, top + bh); g.lineTo(bx, top + bh - 2); g.lineTo(bx - 2.2, top + bh); g.closePath(); g.fill();
      g.fillStyle = css(shade([20, 14, 14], L, 0)); g.beginPath(); g.arc(bx, top + bh * 0.35, 1.1, 0, Math.PI * 2); g.fill();
    }
    // the wall towers in front
    lay.towers.forEach((t, i) => tower(g, { ...t, yb: TOP }, o, seed * 7 + i));
    if (scorched) { // Soot stains the masonry and fades at the silhouette.
      g.save();
      g.globalCompositeOperation = 'source-atop';
      const r = rng(seed * 7 + 1);
      for (let i = 0; i < 9; i++) {
        const x = wl.x0 + r() * (wl.x1 - wl.x0), y = TOP - r() * (lay.keep ? lay.keep.h : wl.h * 1.5), s = 8 + r() * 14;
        const gr = g.createRadialGradient(x, y, 0, x, y, s);
        gr.addColorStop(0, 'rgba(8,6,6,0.85)'); gr.addColorStop(0.6, 'rgba(14,10,10,0.45)'); gr.addColorStop(1, 'rgba(14,10,10,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
  };
  const pods = (g, o, seed) => { for (const [x, y, s] of layout(seed).engines) drum(g, x, y, s, o); };

  // where each gun's muzzle is, for the fire state
  const muzzles = (lay) => {
    const out = [];
    const wl = lay.wall;
    for (const [px, ang] of lay.ports) out.push([px + Math.cos(ang) * 9, TOP - wl.h * 0.45 + Math.sin(ang) * 9, 0.7]);
    if (lay.keep) { const k = lay.keep, a = Math.PI + 0.39; out.push([k.x - 2 + Math.cos(a) * k.w * 0.48, TOP - k.h - 4 - k.w * 0.04 + Math.sin(a) * k.w * 0.48, 1.4]); }
    return out;
  };

  return {
    id, family: 'islands', title: def.title, about: def.about, w: W, h: H,
    states: def.states, loop: 3, variants: 4, ref: def.ref || null, once: def.once,
    slots: def.slots,
    draw(ctx, o) { ctx.save(); try { this.paint(ctx, o); } finally { ctx.restore(); } },
    paint(ctx, o) {
      const seed = o.seed | 0, L = o.L, t = o.t || 0, lit = o.lit >= 0 ? 1 : -1, sc = o.scale || 1;
      const st = o.state || 'idle', p = clamp(o.p == null ? 0 : o.p);
      const lay = layout(seed);
      const falling = st === 'fall', scorched = st === 'hit' || falling;
      if (falling) { // tip over about the rock's middle, nose down on the far side
        const tilt = Math.pow(p, 1.5) * 0.4 * lay.fallDir;
        ctx.translate(0, (TOP + BOTTOM) / 2); ctx.rotate(tilt); ctx.translate(0, -(TOP + BOTTOM) / 2);
      }
      drawRock(ctx, o, { key: id, seed, w: lay.rockW, top: TOP, bottom: lay.keel, lip: 3, palette: 'enemy', strata: 18 });
      ctx.drawImage(cached(`${id}|drums|${seed}|${L.q}|${lit}`, W, H, sc, (g) => pods(g, o, seed)), -W / 2, -H, W, H);
      ctx.drawImage(cached(`${id}|town|${seed}|${L.q}|${lit}|${scorched ? 1 : 0}`, W, H, sc, (g) => paintBody(g, o, seed, scorched)), -W / 2, -H, W, H);
      // lamplight over the town after dark, torches at the gate
      if (L.windows > 0.1) {
        glow(ctx, 0, TOP - 18, lay.town.span * 0.9, WARM, 0.07 * L.windows);
        const fk = 0.8 + 0.2 * Math.sin(t * 13 + seed) * Math.sin(t * 7.7);
        for (const sd of [-1, 1]) glow(ctx, sd * ((lay.gate || 26) / 2 + 5), TOP - lay.wall.h * 0.28, 8, [255, 160, 70], 0.68 * L.windows * fk);
      }

      // engines: steady, hard burn on boost, sputtering out as it falls
      let pw = 0.8 + 0.1 * Math.sin(t * 2 + seed);
      if (st === 'boost') pw = 1.55;
      if (falling) { const k = Math.pow(1 - p, 2); const sput = Math.sin(t * 23 + seed) * Math.sin(t * 9.1) > -0.2 + 0.9 * p ? 1 : 0.15; pw = k * sput * 0.9; }
      lay.engines.forEach(([x, y, s], i) => flame(ctx, x, y + s * 0.3, s * 1.3, 16 + 2.2 * s, t, ORANGE, i + seed, pw));
      if (pw > 0.05) for (const [x, y, s] of lay.engines) {
        glow(ctx, x, y - s * 0.85, s * 4.2, ORANGE, (0.08 + 0.18 * L.night) * pw);
      }

      if (st === 'fire') { // each gun fires in turn: flash, a star of light, a puff of smoke
        muzzles(lay).forEach(([x, y, s], i) => {
          const ph = (t * 0.9 + i * 0.37 + seed * 0.11) % 1, fl = Math.exp(-ph * 16);
          if (fl > 0.02) {
            glow(ctx, x, y, 22 * s * (0.6 + fl), [255, 210, 140], 0.95 * fl);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = css([255, 236, 190], fl);
            ctx.translate(x, y); ctx.rotate(-0.4);
            for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-9 * s * fl - 2, -0.5, 18 * s * fl + 4, 1); }
            ctx.restore();
          }
          if (ph < 0.6) smokeColumn(ctx, x - 6 * s * ph * 8, y - 2, 3 * s, ph * 4, i + seed, o, { amt: (1 - ph / 0.6) * 0.8, rise: 24, drift: -10, n: 3, dark: 0.3 });
        });
        if (lay.keep) { // a missile launch from the keep roof
          const ph = (t * 0.45 + seed * 0.07) % 1, k = lay.keep, lx = k.x + k.w * 0.3, ly = TOP - k.h - 2;
          if (ph < 0.35) {
            const yy = ly - ph * 260, fl = Math.exp(-ph * 9);
            glow(ctx, lx, ly, 26, [255, 200, 120], 0.8 * fl);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const tr = ctx.createLinearGradient(0, yy, 0, ly); tr.addColorStop(0, 'rgba(255,230,180,0.9)'); tr.addColorStop(1, 'rgba(255,140,60,0)');
            ctx.fillStyle = tr; ctx.fillRect(lx - 1.2, yy, 2.4, ly - yy); ctx.restore();
            glow(ctx, lx, yy, 6, [255, 240, 200], 0.9);
          }
        }
      }
      if (st === 'hit' || falling) { // burning in several places, black smoke trailing up
        const amt = falling ? 0.6 + 0.6 * p : 1;
        lay.fires.forEach(([x, y, s], i) => {
          fireAt(ctx, x, y, s, t, seed + i, o, amt);
          smokeColumn(ctx, x, y - s, s * 0.9, t, seed + i * 3, o, { amt: 0.8 * amt, rise: 70 + 40 * amt, drift: 26, n: 7, dark: 0.75 });
        });
      }
      if (falling) { // chunks of rock and wall breaking away and dropping
        const r = rng(seed * 17 + 11);
        for (let i = 0; i < 7; i++) {
          const side = r() - 0.5, x0 = side * lay.rockW * 0.48;
          const y0 = TOP + (lay.keel - TOP) * (0.2 + 0.25 * (1 - Math.abs(side) * 2));
          const s = 4 + r() * 7, start = 0.15 + r() * 0.5;
          const speed = 0.7 + 0.6 * r(), drift = (r() - 0.5) * 30, spin = (r() - 0.5) * 6;
          if (p < start) continue;
          const q = (p - start) / (1 - start), dy = q * q * 90 * speed;
          ctx.save(); ctx.translate(x0 + drift * q, y0 + dy); ctx.rotate(q * spin);
          ctx.fillStyle = css(shade(i % 3 ? [98, 88, 82] : BRICK, L, lit * 0.4));
          ctx.beginPath(); ctx.moveTo(-s, -s * 0.4); ctx.lineTo(-s * 0.2, -s * 0.8); ctx.lineTo(s * 0.9, -s * 0.2); ctx.lineTo(s * 0.5, s * 0.7); ctx.lineTo(-s * 0.6, s * 0.5); ctx.closePath(); ctx.fill();
          ctx.fillStyle = css(rimColour(L), 0.3 + 0.4 * L.golden); ctx.fillRect(lit > 0 ? s * 0.3 : -s, -s * 0.5, s * 0.6, 0.8);
          ctx.restore();
        }
      }
      // red warning lamps on the tallest towers
      if ((t * 1.1 + seed * 0.3) % 1 < 0.15) for (const tw of lay.towers) if (tw.spike) glow(ctx, tw.x, TOP - tw.h - 10, 3.5, [255, 40, 24], 0.85);
    },
  };
}
