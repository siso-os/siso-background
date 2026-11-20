// An orbital station seen side-on in hard sunlight, built the way real ones are. A long box truss with a front and a
// back face (the far chords dimmer, struts between them, equipment boxes inside); four pairs of solar wings whose
// cells sit on a bronze backing, which turn on their masts to track the sun, go dark as they turn away, and throw a
// glint that sweeps along them as they swing through the sun's mirror angle; white radiators; pressurised modules in
// stitched white blanket shaded as cylinders, lit on the sun side and black on the other (no air, so no fill but a
// faint blue earthshine on the undersides); crinkled gold foil on the nodes; a docked capsule with its own little
// wings, an arm and a dish; red, green and white strobes. Hard sun from o.lit. The body is baked once per light.
import { clamp, rng, css, mix, cached, sun, lc, dotL, bloom, nav, ih, TAU, sphereFill } from './_lib.js';

const W = 320, H = 160, CY = -80;
const WHITE = [232, 230, 224], GOLD = [228, 172, 72], FRAME = [182, 176, 164], STEEL = [150, 152, 158];
const WING_X = [-132, -84, 84, 132], WING_H = 56, SPAN = 124; // the wings run from CY - 62 to CY + 62

// the kit's sun, swung round to the side: light that grazes the station from the side and a little above, barely from
// in front, so each cylinder is lit on one half and black on the other, the way stations look in photographs
function sideSun(L, side) {
  const S = sun(L, side), d = [S.side * 0.82, -0.5, 0.2], m = Math.hypot(...d);
  return { ...S, dir: d.map((v) => v / m), q: S.q + '|side' };
}
const pxOf = (g) => 1 / (Math.hypot(g.getTransform().a, g.getTransform().b) || 1);
// lit by the sun along a normal (normalised here), with little fill: space shadows are black
function dn(S, x, y, z) { const m = Math.hypot(x, y, z) || 1; return dotL(S, x / m, y / m, z / m); }
const lit = (base, S, d, spec = 0) => lc(base, S, clamp(d, -1, 1), { spec, fill: 0.5 });

// shading across a cylinder lying along x (top to bottom) and standing along y (left to right)
function cylH(g, y0, y1, base, S, spec = 0.35) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (let i = 0; i <= 12; i++) { const u = i / 12, a = (u - 0.5) * Math.PI; gr.addColorStop(u, css(lit(base, S, dn(S, 0.3 * S.side, Math.sin(a), Math.cos(a)), spec))); }
  return gr;
}
function cylV(g, x0, x1, base, S, spec = 0.35) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  for (let i = 0; i <= 12; i++) { const u = i / 12, a = (u - 0.5) * Math.PI; gr.addColorStop(u, css(lit(base, S, dn(S, Math.sin(a), -0.15, Math.cos(a)), spec))); }
  return gr;
}

// crinkled gold foil over a cylindrical patch: the cylinder's shading, broken into small facets that each catch the sun
// at their own angle (a few flash nearly white)
function foil(g, S, x, y0, w, h, seed, along = 'x') {
  const r = rng(seed * 7 + 3), n = Math.ceil((w * h) / 0.55);
  g.save(); g.beginPath(); g.rect(x, y0, w, h); g.clip();
  g.fillStyle = along === 'x' ? cylH(g, y0, y0 + h, GOLD, S, 0.8) : cylV(g, x, x + w, GOLD, S, 0.8);
  g.fillRect(x, y0, w, h);
  for (let i = 0; i < n; i++) {
    const cx = x + r() * w, cy = y0 + r() * h, s = 0.25 + r() * 0.75;
    const u = along === 'x' ? (cy - y0) / h : (cx - x) / w, a = (u - 0.5) * Math.PI, jx = (r() - 0.5) * 1.4, jy = (r() - 0.5) * 1.4;
    const d = along === 'x' ? dn(S, 0.2 * S.side + jx, Math.sin(a) + jy, Math.cos(a)) : dn(S, Math.sin(a) + jx, jy, Math.cos(a));
    g.fillStyle = css(lit(GOLD, S, d, 1.3), 0.8);
    g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s * (0.5 + r()), cy + s * (r() - 0.2)); g.lineTo(cx - s * (0.4 + r()), cy + s * (0.3 + 0.6 * r())); g.closePath(); g.fill();
  }
  g.restore();
}

// a pressurised module lying along x: blanket seams, each blanket a slightly different white, a dark end ring with a
// bright lip, yellow handrails, and a thin blue earthshine rim on the black underside
function hmod(g, S, x0, x1, y, r, seed, { base = WHITE, foilAt = null, rails = true } = {}) {
  const p = pxOf(g), len = x1 - x0;
  g.fillStyle = cylH(g, y - r, y + r, base, S); g.fillRect(x0, y - r, len, 2 * r);
  const q = rng(seed);
  for (let x = x0 + 1.4; x < x1 - 1.4; x += 4.4) {
    g.fillStyle = css([0, 0, 0], 0.03 + 0.09 * q()); g.fillRect(x, y - r, Math.min(4.4, x1 - 1.4 - x), 2 * r);
    g.fillStyle = css([0, 0, 0], 0.2); g.fillRect(x, y - r, Math.max(0.25, 0.6 * p), 2 * r);
  }
  g.fillStyle = css([0, 0, 0], 0.14); g.fillRect(x0, y - r * 0.5, len, Math.max(0.2, 0.6 * p));
  if (foilAt) for (const [fx, fw] of foilAt) foil(g, S, fx, y - r, fw, 2 * r, seed + fx);
  if (rails) { g.fillStyle = css(lit([236, 200, 96], S, 0.6), 0.75); g.fillRect(x0 + 2, y - r * 0.72, len - 4, Math.max(0.22, 0.6 * p)); }
  for (const xe of [x0, x1 - 1.3]) {
    g.fillStyle = cylH(g, y - r - 0.35, y + r + 0.35, STEEL, S, 0.9); g.fillRect(xe, y - r - 0.35, 1.3, 2 * r + 0.7);
    g.fillStyle = css([0, 0, 0], 0.55); g.fillRect(xe === x0 ? x0 + 1.3 : xe - Math.max(0.25, 0.6 * p), y - r, Math.max(0.25, 0.6 * p), 2 * r);
  }
  g.fillStyle = css([80, 120, 200], 0.4); g.fillRect(x0 + 1.3, y + r - Math.max(0.25, 0.8 * p), len - 2.6, Math.max(0.25, 0.8 * p));
}

// a pressurised module standing along y: the same blanket, lit on the sun's side, black on the other
function vmod(g, S, x, y0, y1, r, seed, { base = WHITE, shadowTop = 0 } = {}) {
  const p = pxOf(g), q = rng(seed);
  g.fillStyle = cylV(g, x - r, x + r, base, S); g.fillRect(x - r, y0, 2 * r, y1 - y0);
  for (let y = y0 + 1.2; y < y1 - 1.2; y += 4.4) {
    g.fillStyle = css([0, 0, 0], 0.03 + 0.09 * q()); g.fillRect(x - r, y, 2 * r, Math.min(4.4, y1 - 1.2 - y));
    g.fillStyle = css([0, 0, 0], 0.2); g.fillRect(x - r, y, 2 * r, Math.max(0.25, 0.6 * p));
  }
  g.fillStyle = css([0, 0, 0], 0.14); g.fillRect(x - r * 0.45, y0, Math.max(0.2, 0.6 * p), y1 - y0);
  for (const ye of [y0, y1 - 1.2]) { g.fillStyle = cylV(g, x - r - 0.35, x + r + 0.35, STEEL, S, 0.9); g.fillRect(x - r - 0.35, ye, 2 * r + 0.7, 1.2); }
  // the module above throws its shadow down over the top of this one
  if (shadowTop) { const gr = g.createLinearGradient(0, y0, 0, y0 + shadowTop); gr.addColorStop(0, css([0, 0, 0], 0.75)); gr.addColorStop(1, css([0, 0, 0], 0)); g.fillStyle = gr; g.fillRect(x - r, y0, 2 * r, shadowTop); }
  const ex = S.side > 0 ? x - r : x + r - Math.max(0.25, 0.8 * p);
  g.fillStyle = css([80, 120, 200], 0.35); g.fillRect(ex, y0 + 1.2, Math.max(0.25, 0.8 * p), y1 - y0 - 2.4);
}

// a box seen a little from below and to the left: a front face, a top face going back up and to the right, a side face
function box(g, S, x, y, w, h, base, dx, dy) {
  g.fillStyle = css(lit(base, S, dn(S, 0, -1, 0), 0.4)); // top
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w + dx, y + dy); g.lineTo(x + dx, y + dy); g.closePath(); g.fill();
  g.fillStyle = css(lit(base, S, dn(S, 1, 0, 0))); // right side
  g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + dx, y + dy); g.lineTo(x + w + dx, y + h + dy); g.lineTo(x + w, y + h); g.closePath(); g.fill();
  g.fillStyle = css(lit(base, S, dn(S, 0, 0, 1), 0.2)); g.fillRect(x, y, w, h); // front
  g.fillStyle = css([0, 0, 0], 0.35); g.fillRect(x, y + h - Math.min(0.5, h * 0.2), w, Math.min(0.5, h * 0.2));
}

// the box truss: the back face first (dimmer, offset up and right), struts between the faces, equipment inside, then
// the front face with its chords shaded as tubes
function truss(g, S, x0, x1, y, h) {
  const p = pxOf(g), dx = 1.2, dy = -2.1, bay = h, lw = (u) => Math.max(u, 0.85 * p);
  const yt = y - h / 2, yb = y + h / 2;
  const lattice = (ox, oy) => {
    g.beginPath();
    for (let x = x0, k = 0; x < x1 - 0.1; x += bay, k++) {
      const xa = x + ox, xb = Math.min(x1, x + bay) + ox;
      g.moveTo(xa, yt + oy); g.lineTo(xa, yb + oy);
      if (k % 2) { g.moveTo(xa, yt + oy); g.lineTo(xb, yb + oy); } else { g.moveTo(xa, yb + oy); g.lineTo(xb, yt + oy); }
    }
    g.stroke();
  };
  // back face
  g.strokeStyle = css(lit(FRAME, S, 0.12)); g.lineWidth = lw(0.4); lattice(dx, dy);
  g.fillStyle = css(lit(FRAME, S, 0.5)); g.fillRect(x0 + dx, yt + dy - 0.35, x1 - x0, lw(0.7));
  g.fillStyle = css(lit(FRAME, S, -0.1)); g.fillRect(x0 + dx, yb + dy - 0.35, x1 - x0, lw(0.7));
  // struts from face to face at each node
  g.strokeStyle = css(lit(FRAME, S, 0.35)); g.lineWidth = lw(0.35);
  g.beginPath(); for (let x = x0; x <= x1 + 0.01; x += bay) { g.moveTo(x, yt); g.lineTo(x + dx, yt + dy); g.moveTo(x, yb); g.lineTo(x + dx, yb + dy); } g.stroke();
  // equipment carried inside the truss: boxes, some white, some grey, a few in gold foil
  const r = rng(91);
  for (let x = x0 + 3; x < x1 - 8; x += bay * (1 + Math.floor(r() * 3))) {
    if (Math.abs(x) < 40 || r() < 0.3) continue;
    const w = bay * (0.6 + r() * 0.9), hh = h * (0.35 + 0.4 * r()), k = r();
    const base = k < 0.5 ? [208, 206, 200] : k < 0.8 ? [118, 120, 126] : GOLD;
    box(g, S, x, yb - hh - 0.6, w, hh, base, dx * 0.7, dy * 0.7);
  }
  // front face
  g.strokeStyle = css(lit(FRAME, S, 0.42, 0.3)); g.lineWidth = lw(0.5); lattice(0, 0);
  g.fillStyle = cylH(g, yt - 0.5, yt + 0.5, FRAME, S, 0.9); g.fillRect(x0, yt - 0.5, x1 - x0, Math.max(1, 1.1 * p));
  g.fillStyle = cylH(g, yb - 0.5, yb + 0.5, FRAME, S, 0.5); g.fillRect(x0, yb - 0.5, x1 - x0, Math.max(1, 1.1 * p));
  // a node cap every third bay
  g.fillStyle = css(lit(FRAME, S, 0.7, 0.6));
  for (let x = x0; x <= x1 + 0.01; x += bay * 3) { g.fillRect(x - 0.6, yt - 0.7, 1.2, 1.4); g.fillRect(x - 0.6, yb - 0.7, 1.2, 1.4); }
}

function radiator(g, S, x, y0, len, w, lean) {
  // three white panels hanging from the truss, leaning a little: fine ribs across them, a lit face and a dark edge
  const p = pxOf(g);
  g.save(); g.translate(x, y0); g.transform(1, 0, lean, 1, 0, 0);
  const seg = len / 3;
  for (let i = 0; i < 3; i++) {
    const y = i * seg + 0.6, d = dn(S, 0.35 * S.side, 0.1, 1) - i * 0.04;
    const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    gr.addColorStop(0, css(lit(WHITE, S, d - 0.18 * S.side, 0.5))); gr.addColorStop(1, css(lit(WHITE, S, d + 0.18 * S.side, 0.5)));
    g.fillStyle = gr; g.fillRect(-w / 2, y, w, seg - 1.2);
    g.fillStyle = css([0, 0, 0], 0.13); for (let yy = y + 1.1; yy < y + seg - 1.4; yy += 1.6) g.fillRect(-w / 2, yy, w, Math.max(0.18, 0.5 * p));
    g.fillStyle = css([0, 0, 0], 0.45); g.fillRect(S.side > 0 ? -w / 2 : w / 2 - 0.5, y, 0.5, seg - 1.2);
  }
  g.fillStyle = css(lit(STEEL, S, 0.4)); g.fillRect(-0.4, -2, 0.8, len + 2);
  g.restore();
}

function capsule(g, S, x, y) {
  // docked below a module: docking collar, the round orbital module, the bell of the descent module, the service
  // module in foil with its two small dark wings
  g.fillStyle = cylV(g, x - 2, x + 2, STEEL, S, 0.6); g.fillRect(x - 2, y, 4, 2);
  g.fillStyle = sphereFill(g, x, y + 5.6, 4, [176, 182, 166], S, { spec: 0.4 }); g.beginPath(); g.arc(x, y + 5.6, 4, 0, TAU); g.fill();
  g.fillStyle = cylV(g, x - 4.6, x + 4.6, [128, 116, 92], S, 0.5);
  g.beginPath(); g.moveTo(x - 3, y + 9); g.lineTo(x + 3, y + 9); g.lineTo(x + 4.6, y + 14.5); g.lineTo(x - 4.6, y + 14.5); g.closePath(); g.fill();
  foil(g, S, x - 4.4, y + 14.5, 8.8, 8, 77, 'y');
  g.fillStyle = css([0, 0, 0], 0.5); g.fillRect(x - 4.4, y + 14.5, 8.8, 0.6);
  for (const sx of [-1, 1]) {
    const xa = sx < 0 ? x - 16 : x + 4.6, xb = sx < 0 ? x - 4.6 : x + 16;
    g.fillStyle = css(lit([150, 140, 120], S, 0.4)); g.fillRect(xa, y + 18, xb - xa, 0.35);
    g.fillStyle = css(lit([40, 40, 80], S, dn(S, 0, -0.5, 1), 0.6)); g.fillRect(xa + (sx < 0 ? 0 : 1), y + 16.6, xb - xa - 1, 3);
    g.fillStyle = css([150, 120, 70], 0.35); for (let xx = xa + 1.5; xx < xb - 1; xx += 1.7) g.fillRect(xx, y + 16.6, 0.2, 3);
  }
  g.fillStyle = cylV(g, x - 3, x + 3, [70, 70, 76], S, 0.6); g.fillRect(x - 3, y + 22.5, 6, 1.6);
}

function body(g, S) {
  for (const sx of [-1, 1]) radiator(g, S, sx * 58, CY + 4, 34, 10, -sx * 0.16);
  truss(g, S, -150, 150, CY, 7);
  // rotary joints, and the boxes the wing masts fold out of
  for (const sx of [-1, 1]) {
    g.fillStyle = cylH(g, CY - 5, CY + 5, STEEL, S, 0.8); g.fillRect(sx * 66 - 2.2, CY - 5, 4.4, 10);
    g.fillStyle = css([0, 0, 0], 0.4); g.fillRect(sx * 66 - 0.3, CY - 5, 0.6, 10);
  }
  for (const x of WING_X) for (const up of [-1, 1]) foil(g, S, x - 3.5, up < 0 ? CY - 7.6 : CY + 3.6, 7, 4, 13 + x + up, 'x');
  // the modules
  hmod(g, S, -52, -40, CY + 0.5, 5.8, 3, { foilAt: [[-50, 8]], rails: false });
  hmod(g, S, -40, 14, CY + 0.5, 7, 5);
  hmod(g, S, 14, 24, CY + 0.5, 6.2, 7, { foilAt: [[15.5, 7]], rails: false });
  hmod(g, S, 24, 48, CY + 0.5, 5.6, 9, { base: mix(WHITE, [236, 226, 200], 0.4) });
  vmod(g, S, 2, CY - 31, CY - 6.4, 5, 11);
  vmod(g, S, -18, CY + 7.4, CY + 27, 5, 12, { shadowTop: 4 });
  vmod(g, S, 18, CY + 6.6, CY + 21, 4.4, 13, { base: mix(WHITE, GOLD, 0.18), shadowTop: 3.5 });
  // the upper module's hard shadow across the top of the long one, thrown away from the sun
  {
    const sd = -S.side, x = 2 + sd * 5;
    g.save(); g.beginPath(); g.rect(-40, CY - 6.5, 54, 7); g.clip();
    g.fillStyle = css([0, 0, 0], 0.55);
    g.beginPath(); g.moveTo(x, CY - 6.5); g.lineTo(x + sd * 9, CY - 6.5); g.lineTo(x + sd * 13, CY - 1.5); g.lineTo(x + sd * 4, CY - 1.5); g.closePath(); g.fill();
    g.restore();
  }
  capsule(g, S, -18, CY + 27);
  // a dish on a short mast over the upper module
  g.fillStyle = css(lit(STEEL, S, 0.5)); g.fillRect(1.6, CY - 37, 0.8, 6);
  g.save(); g.translate(2, CY - 38); g.rotate(-0.35 * S.side);
  g.fillStyle = css(lit(WHITE, S, dn(S, 0.3 * S.side, -0.8, 0.5), 0.5)); g.beginPath(); g.ellipse(0, 0, 4, 1.4, 0, Math.PI, TAU); g.fill();
  g.fillStyle = css(lit(WHITE, S, -0.3)); g.beginPath(); g.ellipse(0, 0, 4, 0.6, 0, 0, Math.PI); g.fill();
  g.restore();
  // the arm: two white booms and their joints, folded over the long module
  const pts = [[-26, CY - 7], [-42, CY - 22], [-30, CY - 33]];
  g.lineCap = 'round';
  g.strokeStyle = css(lit(WHITE, S, -0.3)); g.lineWidth = 2.1; g.beginPath(); g.moveTo(pts[0][0], pts[0][1] + 0.3); for (const [x, y] of pts.slice(1)) g.lineTo(x, y + 0.3); g.stroke();
  g.strokeStyle = css(lit(WHITE, S, 0.8, 0.6)); g.lineWidth = 1.1; g.beginPath(); g.moveTo(pts[0][0] + 0.2 * S.side, pts[0][1] - 0.35); for (const [x, y] of pts.slice(1)) g.lineTo(x + 0.2 * S.side, y - 0.35); g.stroke();
  for (const [x, y] of pts) { g.fillStyle = sphereFill(g, x, y, 1.5, STEEL, S, { spec: 0.6 }); g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill(); }
  // portholes: dark glass with a hint of a lit cabin
  for (const [x, y] of [[-30, CY + 1], [-16, CY + 1], [-2, CY + 1], [32, CY + 1], [2, CY - 22]]) {
    g.fillStyle = css([12, 12, 16]); g.beginPath(); g.arc(x, y, 1, 0, TAU); g.fill();
    g.fillStyle = css([255, 196, 120], 0.55); g.beginPath(); g.arc(x, y + 0.2, 0.55, 0, TAU); g.fill();
  }
}

// one solar wing: two blankets of blue-black cells on a bronze backing either side of the mast (the backing shows as
// fine lines between the cells), a hinge line every few rows, a thin bright frame
function wingPaint(g) {
  const p = pxOf(g), top = -WING_H + 0.6, hgt = WING_H - 1.2;
  for (const sx of [-1, 1]) {
    const xa = sx < 0 ? -10.6 : 0.9, xb = sx < 0 ? -0.9 : 10.6, cols = 4, rows = 24;
    const cw = (xb - xa) / cols, ch = hgt / rows, gap = Math.max(0.16, 0.45 * p);
    g.fillStyle = 'rgb(156,116,60)'; g.fillRect(xa, top, xb - xa, hgt);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const v = 0.8 + 0.4 * ih(i + (sx > 0 ? 9 : 0), j, 11);
      g.fillStyle = css([44 * v, 36 * v, 60 * v]);
      g.fillRect(xa + i * cw + gap / 2, top + j * ch + gap / 2, cw - gap, ch - gap);
    }
    g.fillStyle = 'rgba(150,118,70,0.8)';
    for (let j = 6; j < rows; j += 6) g.fillRect(xa, top + j * ch - gap * 0.75, xb - xa, gap * 1.5);
    // a soft sheen across each blanket, so the cells read as glass, not paint
    const gr = g.createLinearGradient(xa, top, xb, top + hgt * 0.4);
    gr.addColorStop(0, 'rgba(120,130,200,0.12)'); gr.addColorStop(0.5, 'rgba(200,150,90,0.05)'); gr.addColorStop(1, 'rgba(120,130,200,0.06)');
    g.fillStyle = gr; g.fillRect(xa, top, xb - xa, hgt);
    g.strokeStyle = 'rgba(206,198,180,0.85)'; g.lineWidth = Math.max(0.2, 0.7 * p); g.strokeRect(xa, top, xb - xa, hgt);
  }
}

export default {
  id: 'space.station', family: 'space', title: 'Orbital station',
  about: 'An orbital station side-on in hard sun: a box truss with depth, four pairs of solar wings that turn to track the sun, darken as they turn away and throw a glint that sweeps along them, radiators, white pressurised modules lit on one side and black on the other, gold foil, a docked capsule, an arm, a dish, red, green and white strobes.',
  w: W, h: H, states: ['idle'], loop: 60, once: {}, variants: 1,
  ref: 'refs/slice/vertical-slice.webp',
  draw(ctx, o) {
    ctx.save();
    const S = sideSun(o.L, o.lit ?? o.L.side), t = o.t || 0, pxs = (o.scale || 1) * (globalThis.devicePixelRatio || 1);
    // the solar wings turn on their masts: their face shortens, darkens as it turns from the sun, and a glint sweeps
    // along them as they swing through the angle that mirrors the sun at us
    const ang = Math.sin((t / 60) * TAU) * 0.6 + 0.35;
    const face = Math.abs(Math.cos(ang)), sweep = (ang - 0.35) / 0.6;
    const d = dotL(S, Math.sin(ang) * S.side, 0, Math.cos(ang));
    const dark = clamp(0.82 - 0.75 * Math.max(0, d), 0.08, 0.85);
    const P = cached('space.station.wing', 22, WING_H, pxs, wingPaint);
    const hot = mix(S.key, [255, 255, 255], 0.4);
    WING_X.forEach((x, wi) => {
      const pw = 22 * Math.max(0.12, face), v = 0.5 + 0.8 * sweep + 0.07 * (wi - 1.5) * S.side, gl = Math.pow(Math.max(0, 1 - sweep * sweep), 2.5);
      const yc = CY - SPAN / 2 + v * SPAN;
      for (const up of [-1, 1]) {
        const y0 = up < 0 ? CY - 62 : CY + 6;
        ctx.drawImage(P, x - pw / 2, y0, pw, WING_H);
        ctx.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`; ctx.fillRect(x - pw / 2, y0, pw, WING_H);
        // the sun's warm sheen across a wing that faces it (the cells' coating and the bronze backing)
        if (d > 0.05) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = css(mix(hot, [255, 170, 90], 0.4), 0.1 * d); ctx.fillRect(x - pw / 2, y0, pw, WING_H); ctx.globalCompositeOperation = 'source-over'; }
        if (gl > 0.02 && yc > y0 - 16 && yc < y0 + WING_H + 16) {
          const gr = ctx.createLinearGradient(0, yc - 16, 0, yc + 16);
          gr.addColorStop(0, css(hot, 0)); gr.addColorStop(0.42, css(hot, 0.35 * gl)); gr.addColorStop(0.5, css(hot, 0.8 * gl)); gr.addColorStop(0.58, css(hot, 0.35 * gl)); gr.addColorStop(1, css(hot, 0));
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr;
          ctx.fillRect(x - pw / 2, Math.max(y0, yc - 16), pw, Math.min(y0 + WING_H, yc + 16) - Math.max(y0, yc - 16));
          ctx.globalCompositeOperation = 'source-over';
          if (yc > y0 && yc < y0 + WING_H) bloom(ctx, x, yc, 9 + pw * 0.4, hot, 0.22 * gl);
        }
        // the mast down the middle of the wing, out to its tip
        ctx.fillStyle = css(lit(FRAME, S, 0.55, 0.5)); ctx.fillRect(x - 0.55, up < 0 ? CY - 63 : CY + 2, 1.1, up < 0 ? 59 : 61);
      }
    });
    const c = cached(`space.station|${S.q}`, W, H, pxs, (g) => body(g, S));
    ctx.drawImage(c, -W / 2, -H, W, H);
    nav(ctx, -150, CY, [255, 50, 40], t, { period: 1.5, r: 3 });
    nav(ctx, 150, CY, [60, 255, 120], t, { period: 1.5, phase: 0.5, r: 3 });
    nav(ctx, 2, CY - 39, [255, 255, 255], t, { period: 1.1, phase: 0.2, r: 3, duty: 0.06 });
    nav(ctx, -18, CY + 52, [255, 255, 255], t, { period: 2.3, phase: 0.6, r: 2, duty: 0.05 });
    for (const x of [-132, 132]) nav(ctx, x, CY - 63, [255, 170, 60], t, { period: 3.1, phase: x > 0 ? 0.4 : 0, r: 1.8, duty: 0.08 });
    // the lit cabins, a soft glow at a few portholes
    for (const [x, y] of [[-30, CY + 1], [-2, CY + 1], [2, CY - 22]]) bloom(ctx, x, y, 2.4, [255, 200, 130], 0.4);
    ctx.restore();
  },
};
