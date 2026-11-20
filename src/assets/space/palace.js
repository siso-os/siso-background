// The space palace (refs/elements/space-palace): a white and gold cathedral city on a disc, gardens and glass domes on
// its deck, a crown of gothic spires round a tiered central spire, a long gold-banded spire hanging beneath, and three
// banded rings round it (one above the deck, one at it, one below), their far halves behind the palace and their near
// halves in front. Hard sun from o.lit's side, black shadows with a faint blue fill, warm light in every window.
// The body is baked once per light; on top, live: the rings' gold clamps turn, blue nav lights blink at the ring
// ends. attack: the shield bubble flickers and its guns fire. hit (once): vacuum blasts on the hull (no smoke in space) through a flaring shield,
// sparks and venting air, a shudder.
import { clamp, rng, css, mix, cached, sun, lc, dotL, cylX, sphereFill, bloom, nav, bolt, frac, ih, TAU, smooth, vacuumBurst } from './_lib.js';

const W = 640, H = 448;
const WHITE = [236, 230, 216], GOLD = [218, 170, 84], WARM = [255, 198, 112], GREEN = [52, 82, 44];
const DISK = { y: -232, rx: 272, ry: 24, t: 17 };
const LOWER_DECKS = [
  { y: -134, rx: 150, ry: 14, t: 13 },
  { y: -104, rx: 84, ry: 8, t: 9 },
];
const RINGS = {
  upper: { cy: -302, rx: 274, ry: 28, band: 8, speed: 0.05 },
  main: { cy: -226, rx: 306, ry: 36, band: 9, speed: -0.035 },
  lower: { cy: -152, rx: 250, ry: 22, band: 8, speed: 0.06 },
};

// ---- parts ----------------------------------------------------------------------------------------------------
function ringHalf(g, S, R, near) {
  const a0 = near ? 0 : Math.PI, a1 = near ? Math.PI : TAU;
  const gr = g.createLinearGradient(-R.rx, 0, R.rx, 0);
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, nx = u * 2 - 1, nz = Math.sqrt(Math.max(0, 1 - nx * nx)) * (near ? 1 : -0.6);
    gr.addColorStop(u, css(lc(WHITE, S, dotL(S, nx, 0, nz) * 0.85 + 0.12, { spec: 0.35 })));
  }
  const ell = (dy, lw, style, dash) => {
    g.strokeStyle = style; g.lineWidth = lw; if (dash) g.setLineDash(dash);
    g.beginPath(); g.ellipse(0, R.cy + dy, R.rx, R.ry, 0, a0, a1); g.stroke();
    if (dash) g.setLineDash([]);
  };
  ell(0, R.band, gr);
  ell(R.band * 0.48, R.band * 0.14, css(lc(GOLD, S, 0.4, { spec: 0.9 })));
  ell(-R.band * 0.42, R.band * 0.2, css(lc(WHITE, S, 0.9, { spec: 0.6 }), 0.9));
  ell(R.band * 0.04, R.band * 0.2, css(WARM, near ? 0.85 : 0.45), [1.1, 2.4]);
  ell(R.band * 0.04, R.band * 0.32, 'rgba(0,0,0,0.25)', [0.5, 13.5]);
}

function spireUp(g, S, x, yb, h, w, { gold = 1, win = 0 } = {}) {
  const tip = yb - h;
  const path = () => {
    g.beginPath(); g.moveTo(x - w / 2, yb);
    g.bezierCurveTo(x - w * 0.42, yb - h * 0.38, x - w * 0.06, yb - h * 0.62, x, tip);
    g.bezierCurveTo(x + w * 0.06, yb - h * 0.62, x + w * 0.42, yb - h * 0.38, x + w / 2, yb);
    g.closePath();
  };
  g.fillStyle = cylX(g, x - w / 2, x + w / 2, WHITE, S, { spec: 0.55 }); path(); g.fill();
  // a crease down the middle and gold on the lit edge
  g.strokeStyle = 'rgba(40,30,20,0.35)'; g.lineWidth = Math.max(0.3, w * 0.03);
  g.beginPath(); g.moveTo(x, yb); g.lineTo(x, tip + h * 0.05); g.stroke();
  if (gold) {
    const sx = S.side;
    g.strokeStyle = css(lc(GOLD, S, 0.9, { spec: 1 })); g.lineWidth = Math.max(0.4, w * 0.06);
    g.beginPath(); g.moveTo(x + sx * w / 2, yb); g.bezierCurveTo(x + sx * w * 0.42, yb - h * 0.38, x + sx * w * 0.06, yb - h * 0.62, x, tip); g.stroke();
    for (const f of [0.06, 0.24, 0.46]) {
      const ww = w * Math.pow(1 - f, 1.9) * 1.04, yy = yb - h * f;
      g.fillStyle = cylX(g, x - ww / 2, x + ww / 2, GOLD, S, { spec: 0.9 }); g.fillRect(x - ww / 2, yy - Math.max(0.6, h * 0.012), ww, Math.max(0.6, h * 0.012) * 2);
    }
  }
  for (let k = 0; k < win; k++) { // narrow lit lancet slits up the face
    const f = 0.1 + k * 0.1, yy = yb - h * f, ww = w * Math.pow(1 - f, 1.6);
    for (const dx of [-0.16, 0.16]) arch(g, x + dx * ww, yy, Math.max(0.5, ww * 0.08), Math.max(1.2, h * 0.05), WARM, 0.9);
  }
}

function spireDown(g, S, x, yt, h, w) {
  g.save(); g.translate(x, yt); g.scale(1, -1);
  spireUp(g, { ...S, dir: [S.dir[0], -S.dir[1] * 0.2 + 0.25, S.dir[2]] }, 0, 0, h, w, { win: 3 });
  g.restore();
}

function arch(g, x, y, w, h, c, a = 1) { // a pointed gothic arch, standing on y
  g.fillStyle = css(c, a);
  g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h * 0.62);
  g.quadraticCurveTo(x - w / 2, y - h * 0.92, x, y - h); g.quadraticCurveTo(x + w / 2, y - h * 0.92, x + w / 2, y - h * 0.62);
  g.lineTo(x + w / 2, y); g.closePath(); g.fill();
}

function windowArch(g, x, y, w, h) {
  const gr = g.createLinearGradient(0, y - h, 0, y);
  gr.addColorStop(0, 'rgb(255,226,160)'); gr.addColorStop(0.6, 'rgb(240,170,80)'); gr.addColorStop(1, 'rgb(150,90,40)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h * 0.62); g.quadraticCurveTo(x - w / 2, y - h * 0.92, x, y - h);
  g.quadraticCurveTo(x + w / 2, y - h * 0.92, x + w / 2, y - h * 0.62); g.lineTo(x + w / 2, y); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(60,36,16,0.7)'; g.lineWidth = Math.max(0.3, w * 0.06);
  g.beginPath(); for (let k = 1; k < 3; k++) { g.moveTo(x - w / 2 + (w * k) / 3, y); g.lineTo(x - w / 2 + (w * k) / 3, y - h * 0.8); }
  for (let k = 1; k < 4; k++) { g.moveTo(x - w / 2, y - (h * 0.8 * k) / 4); g.lineTo(x + w / 2, y - (h * 0.8 * k) / 4); }
  g.stroke();
}

function dome(g, S, x, yb, r, rr) {
  const dh = r * 0.42;
  g.fillStyle = cylX(g, x - r, x + r, WHITE, S, { spec: 0.4 }); g.fillRect(x - r, yb - dh, 2 * r, dh);
  const n = Math.max(3, Math.round(r / 3.4));
  for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, xx = x - r + 2 * r * u; windowArch(g, xx, yb - dh * 0.12, (2 * r / n) * 0.55, dh * 0.72); }
  g.fillStyle = css(lc(GOLD, S, 0.5, { spec: 0.8 })); g.fillRect(x - r - 0.5, yb - dh - 0.8, 2 * r + 1, 1.2);
  // the glazed cap: cream glass lit by the sun, warm from inside low down
  const cy = yb - dh;
  g.save(); g.beginPath(); g.ellipse(x, cy, r, r * 0.82, 0, Math.PI, TAU); g.closePath(); g.clip();
  g.fillStyle = sphereFill(g, x, cy, r, mix(WHITE, [200, 190, 170], 0.3), S, { spec: 0.7 }); g.fillRect(x - r, cy - r, 2 * r, r);
  const gw = g.createRadialGradient(x, cy, 0, x, cy, r);
  gw.addColorStop(0, 'rgba(255,190,100,0.55)'); gw.addColorStop(0.7, 'rgba(255,170,80,0.15)'); gw.addColorStop(1, 'rgba(255,170,80,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = gw; g.fillRect(x - r, cy - r, 2 * r, r); g.globalCompositeOperation = 'source-over';
  g.restore();
  // gold ribs (meridians) and a finial
  g.strokeStyle = css(lc(GOLD, S, 0.7, { spec: 0.9 }), 0.9); g.lineWidth = Math.max(0.3, r * 0.05);
  for (let k = -3; k <= 3; k++) {
    const th = (k / 4) * (Math.PI / 2);
    g.beginPath();
    for (let j = 0; j <= 8; j++) { const ph = (j / 8) * (Math.PI / 2); const px = x + r * Math.sin(th) * Math.cos(ph), py = cy - r * 0.82 * Math.sin(ph); j ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
  }
  spireUp(g, S, x, cy - r * 0.8, r * 0.7, r * 0.18, { gold: 1 });
}

function garden(g, S, r) {
  for (let k = 0; k < 140; k++) {
    const a = r() * TAU, d = 0.35 + 0.6 * Math.sqrt(r());
    const x = Math.cos(a) * DISK.rx * d * 0.96, y = DISK.y + Math.sin(a) * DISK.ry * d * 0.9;
    const s = 1.2 + r() * 2.2;
    g.fillStyle = css(lc(GREEN, S, -0.2)); g.beginPath(); g.ellipse(x, y - s * 0.6, s * 0.7, s * 0.9, 0, 0, TAU); g.fill();
    g.fillStyle = css(lc(mix(GREEN, [90, 120, 60], r()), S, 0.8)); g.beginPath(); g.ellipse(x + S.side * s * 0.2, y - s * 0.8, s * 0.45, s * 0.55, 0, 0, TAU); g.fill();
  }
}

function deck(g, S, D, seed) {
  const { y, rx, ry, t } = D;
  const path = (dy = 0) => {
    g.beginPath();
    g.ellipse(0, y + dy, rx, ry, 0, 0, TAU);
  };
  // Each deck is an extrusion with a dark soffit, inset galleries and a sunlit crown.
  const rim = g.createLinearGradient(-rx, 0, rx, 0);
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, nx = u * 2 - 1, d = dotL(S, nx, 0, Math.sqrt(1 - nx * nx));
    rim.addColorStop(u, css(mix(lc(WHITE, S, d, { spec: 0.22 }), [103, 69, 39], 0.16)));
  }
  const front = () => {
    g.beginPath();
    g.ellipse(0, y, rx, ry, 0, 0, Math.PI);
    g.ellipse(0, y + t, rx, ry, 0, Math.PI, 0, true);
    g.closePath();
  };
  g.fillStyle = rim; front(); g.fill();
  const lip = g.createLinearGradient(0, y - ry, 0, y + ry);
  lip.addColorStop(0, css(lc(WHITE, S, 0.18)));
  lip.addColorStop(0.8, css(lc(WHITE, S, 0.62)));
  lip.addColorStop(1, css(lc(WHITE, S, 0.46)));
  g.fillStyle = lip; path(); g.fill();
  const arc = (dy, w, style) => {
    g.lineWidth = w; g.strokeStyle = style;
    g.beginPath(); g.ellipse(0, y + dy, rx, ry, 0, 0.015, Math.PI - 0.015); g.stroke();
  };
  arc(t * 0.64, t * 0.53, 'rgba(32,17,11,0.72)');
  arc(t * 0.90, t * 0.1, 'rgba(235,160,62,0.54)');
  arc(t * 0.07, 0.9, rim);
  const n = Math.ceil(rx * 0.65);
  for (let i = 1; i < n; i++) {
    const a = i * Math.PI / n, x = Math.cos(a) * rx, y0 = y + Math.sin(a) * ry;
    const worn = ih(i, 5, seed), d = dotL(S, Math.cos(a), 0, Math.sin(a));
    if (i % 3 === 0) {
      g.fillStyle = css(lc([40, 35, 31], S, d), 0.64);
      g.fillRect(x, y0 + 1, 0.6, t * 0.27);
    }
    if (worn < 0.23) continue;
    const w = Math.max(0.55, Math.sin(a) * (1.5 + worn * 1.9));
    g.fillStyle = css(WARM, 0.21 + worn * 0.31);
    g.fillRect(x - w * 0.9, y0 + t * 0.46, w * 1.8, t * 0.38);
    g.fillStyle = css(mix(WARM, [255, 235, 181], worn), 0.45 + worn * 0.5);
    g.fillRect(x - w * 0.5, y0 + t * 0.51, w, t * 0.24);
  }
}

function underside(g, S) {
  // Open channels between the buttresses expose the lower decks and the back rails.
  const y = DISK.y + DISK.t;
  for (let i = -6; i <= 6; i++) {
    const u = i / 6, x = u * 239, top = y + 22 * Math.sqrt(1 - u * u);
    const low = -122 - Math.abs(u) * 34, foot = x * 0.37;
    const w = 5 + 12 * (1 - Math.abs(u) * 0.65);
    const gr = g.createLinearGradient(x, top, foot, low);
    const d = dotL(S, u * 0.8, 0.3, 0.6);
    gr.addColorStop(0, css(lc(WHITE, S, d * 0.45)));
    gr.addColorStop(0.32, css(mix(lc(WHITE, S, d), [194, 119, 42], 0.35)));
    gr.addColorStop(0.72, css(mix(lc(GOLD, S, d * 0.4), [108, 57, 26], 0.42)));
    gr.addColorStop(1, '#1a140f');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - w, top - 9);
    g.bezierCurveTo(x - w * 0.5, top + 12, foot - w, low - 32, foot - w * 0.32, low);
    g.lineTo(foot + w * 0.36, low);
    g.bezierCurveTo(foot + w, low - 30, x + w * 1.1, top + 8, x + w, top - 9);
    g.closePath(); g.fill();
    g.strokeStyle = css(mix(lc(GOLD, S, d, { spec: 0.35 }), WARM, 0.38), 0.73);
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x + S.side * w * 0.68, top);
    g.bezierCurveTo(x * 0.93, top + 16, foot + S.side * 3, low - 30, foot, low - 4); g.stroke();
    for (let j = 1; j <= 4; j++) {
      const v = j / 5, xx = foot + (x - foot) * (1 - v) ** 1.5;
      const yy = top + (low - top) * v;
      g.fillStyle = css(WARM, 0.52 + 0.45 * ih(i, j, 14));
      g.fillRect(xx - w * 0.12, yy, w * 0.24, 1 + 2 * (1 - v));
    }
  }
}

function cathedral(g, S) {
  const y0 = DISK.y + 2;
  // flanking great spires and their buttresses
  for (const sx of [-1, 1]) {
    // flying buttresses: tapered arms from the heart out to the deck, lit on top
    const arm = (x0, y0a, cx, cy, x1, y1, w) => {
      g.fillStyle = css(lc(WHITE, S, 0.18 + 0.3 * (sx === S.side ? 1 : 0)));
      g.beginPath(); g.moveTo(x0, y0a - w); g.quadraticCurveTo(cx, cy - w, x1 + sx * w * 0.6, y1); g.lineTo(x1 - sx * w * 0.6, y1); g.quadraticCurveTo(cx, cy + w * 0.4, x0, y0a + w); g.closePath(); g.fill();
      g.strokeStyle = css(lc(GOLD, S, 0.5, { spec: 0.6 }), 0.8); g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(x0, y0a - w); g.quadraticCurveTo(cx, cy - w, x1 + sx * w * 0.6, y1); g.stroke();
    };
    arm(sx * 40, y0 - 64, sx * 92, y0 - 66, sx * 126, y0 - 2, 1.6);
    arm(sx * 30, y0 - 104, sx * 70, y0 - 96, sx * 92, y0 - 30, 1.3);
    spireUp(g, S, sx * 96, y0 - 14, 92, 16, { win: 3 });
    spireUp(g, S, sx * 58, y0 - 10, 140, 20, { win: 4 });
  }
  // The masonry sweeps from the central needle down to the lit front arcade.
  spireUp(g, S, 0, y0, 180, 198, { win: 5 });
  for (const sx of [-1, 1]) {
    dome(g, S, sx * 65, y0 - 7, 32);
    spireUp(g, S, sx * 53, y0 - 3, 155, 25, { win: 3 });
  }
  // the tiered heart: a stack of concave cones, gold-banded, arcades of lit windows
  const tiers = [[y0, 108, 54], [y0 - 54, 80, 34], [y0 - 88, 54, 30], [y0 - 118, 34, 24]];
  for (const [yb, w, h] of tiers) {
    const w2 = w * 0.72;
    g.fillStyle = cylX(g, -w / 2, w / 2, WHITE, S, { spec: 0.5 });
    g.beginPath(); g.moveTo(-w / 2, yb); g.quadraticCurveTo(-w / 2 + 2, yb - h * 0.6, -w2 / 2, yb - h); g.lineTo(w2 / 2, yb - h); g.quadraticCurveTo(w / 2 - 2, yb - h * 0.6, w / 2, yb); g.closePath(); g.fill();
    const n = Math.max(4, Math.round(w / 9));
    for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, x = -w / 2 + w * u, fx = Math.sin((u - 0.5) * Math.PI); windowArch(g, x * 0.96, yb - h * 0.12, (w / n) * 0.5 * Math.cos(fx * 1.2), h * 0.55); }
    g.fillStyle = css(lc(GOLD, S, 0.6, { spec: 0.9 })); g.fillRect(-w / 2 - 1, yb - 1.4, w + 2, 2); g.fillRect(-w2 / 2 - 1, yb - h - 1, w2 + 2, 1.6);
    // pinnacles at the tier's shoulders
    for (const sx of [-1, 1]) spireUp(g, S, sx * w2 * 0.5, yb - h, h * 0.9, 5, { gold: 1 });
  }
  // A continuous front buttress ties the drums to the needle.
  spireUp(g, S, 0, y0 - 2, 203, 60, { win: 4 });
  // the great west window, front and centre, with a gold frame
  windowArch(g, 0, y0 - 2, 26, 44);
  g.strokeStyle = css(lc(GOLD, S, 0.8, { spec: 1 })); g.lineWidth = 1.4; arch(g, 0, y0 - 2, 28, 46, [0, 0, 0], 0);
  g.beginPath(); g.moveTo(-14, y0 - 2); g.lineTo(-14, y0 - 30); g.quadraticCurveTo(-14, y0 - 44, 0, y0 - 48); g.quadraticCurveTo(14, y0 - 44, 14, y0 - 30); g.lineTo(14, y0 - 2); g.stroke();
  for (const sx of [-1, 1]) windowArch(g, sx * 26, y0 - 2, 12, 28);
}

function terraces(g, S, r, side) {
  // the town on the deck (refs/elements/space-palace: the disc is built over, not paved): rows of white-and-gold
  // houses on ellipses around the cathedral, small and dim at the back, larger in front, windows lit warm, each
  // block lit by which way its face turns to the sun. side -1 draws the back rows, +1 the front.
  const rows = side < 0 ? [0.9, 0.72, 0.52] : [0.42, 0.62, 0.84];
  for (const k of rows) {
    const y = DISK.y + side * DISK.ry * k * 0.92, sc = 0.7 + 0.45 * (side * k + 1) / 2;
    let x = -DISK.rx * k * 0.96;
    while (x < DISK.rx * k * 0.96) {
      const w = (6 + r() * 10) * sc, h = (5 + r() * r() * 14) * sc, u = (x + w / 2) / DISK.rx;
      if (Math.abs(x + w / 2) < 46 && side < 0) { x += w; continue; }
      const nz = Math.sqrt(Math.max(0, 1 - u * u)), f = dotL(S, u * 0.8, 0, side > 0 ? nz : 0.4);
      g.fillStyle = css(lc(WHITE, S, f * 0.85 + 0.05, { spec: 0.2 })); g.fillRect(x, y - h, w, h);
      g.fillStyle = css(lc(WHITE, S, f * 0.4 - 0.25)); g.fillRect(x + w - 1.2 * sc, y - h, 1.2 * sc, h);
      // a gold cornice, sometimes a little pointed roof
      g.fillStyle = css(lc(GOLD, S, f, { spec: 0.8 })); g.fillRect(x, y - h, w, 0.8 * sc);
      if (r() < 0.35) { g.beginPath(); g.moveTo(x + w * 0.2, y - h); g.lineTo(x + w / 2, y - h - h * 0.7); g.lineTo(x + w * 0.8, y - h); g.closePath(); g.fill(); }
      for (let j = 0; j < h / (3.4 * sc) - 1; j++) for (let i = 0; i < w / (2.6 * sc) - 1; i++) {
        if (r() < 0.35) continue;
        g.fillStyle = css(WARM, (0.5 + 0.5 * r()) * (side < 0 ? 0.7 : 0.9));
        g.fillRect(x + (1 + i * 2.6) * sc, y - h + (2 + j * 3.4) * sc, 1.1 * sc, 1.7 * sc);
      }
      x += w + (r() < 0.2 ? 3 * sc : 0);
    }
  }
}

function body(g, S, seed) {
  const r = rng(seed * 59 + 11);
  // far halves of the rings
  ringHalf(g, S, RINGS.upper, false);
  ringHalf(g, S, RINGS.main, false);
  ringHalf(g, S, RINGS.lower, false);
  // beneath: the fan, the hanging spires, then the lower ring's near half in front of them
  spireDown(g, S, 0, -173, 173, 79);
  for (const D of LOWER_DECKS) {
    for (const x of [-0.82, -0.52, 0.52, 0.82]) spireDown(g, S, x * D.rx, D.y + D.t, D.t * 2.1, 9);
    deck(g, S, D, seed + D.rx);
  }
  underside(g, S);
  for (const sx of [-1, 1]) {
    spireDown(g, S, sx * 150, RINGS.lower.cy + 16, 46, 12);
    spireDown(g, S, sx * 236, RINGS.lower.cy + 4, 30, 9);
    spireDown(g, S, sx * 286, RINGS.main.cy + 18, 36, 10);
    spireDown(g, S, sx * 80, -170, 64, 16);
  }
  ringHalf(g, S, RINGS.lower, true);
  // the deck, its back row of spires and domes, gardens, the cathedral, the front row
  deck(g, S, DISK, seed);
  const back = [[-232, 15, 'd'], [232, 15, 'd'], [-196, 50, 's'], [196, 50, 's'], [-150, 70, 's'], [150, 70, 's'], [-120, 22, 'd'], [120, 22, 'd']];
  for (const [x, s, k] of back) k === 'd' ? dome(g, S, x, DISK.y - 8, s, r) : spireUp(g, S, x, DISK.y - 8, s, s * 0.2, { win: 2 });
  garden(g, S, r);
  terraces(g, S, r, -1);
  cathedral(g, S);
  terraces(g, S, r, 1);
  const front = [[-170, 24, 'd'], [170, 24, 'd'], [-86, 20, 'd'], [86, 20, 'd'], [-246, 36, 's'], [246, 36, 's'], [-128, 44, 's'], [128, 44, 's'], [-212, 30, 's'], [212, 30, 's']];
  for (const [x, s, k] of front) k === 'd' ? dome(g, S, x, DISK.y + 12, s, r) : spireUp(g, S, x, DISK.y + 14, s, s * 0.22, { win: 2 });
  // near halves of the main and upper rings, in front of everything
  ringHalf(g, S, RINGS.main, true);
  ringHalf(g, S, RINGS.upper, true);
}

// ---- live -----------------------------------------------------------------------------------------------------
function clamps(ctx, S, t) {
  for (const R of Object.values(RINGS)) {
    const n = 14;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + t * R.speed * TAU;
      const s = Math.sin(a); if (s < 0.05) continue; // near half only
      const x = Math.cos(a) * R.rx, y = R.cy + s * R.ry, wid = R.band * 0.9 * (0.4 + 0.6 * s);
      ctx.fillStyle = css(lc(GOLD, S, dotL(S, Math.cos(a), 0, s), { spec: 1 }));
      ctx.fillRect(x - wid * 0.5, y - R.band * 0.62, wid, R.band * 1.24);
      ctx.fillStyle = 'rgba(30,20,8,0.5)'; ctx.fillRect(x - 0.3, y - R.band * 0.62, 0.6, R.band * 1.24);
    }
  }
}

function shield(ctx, t, k, seed) {
  const rx = 336, ry = 236, cy = -226;
  const tick = Math.floor(t * 11);
  ctx.save(); ctx.translate(0, cy); ctx.scale(1, ry / rx);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const a = ih(i, 2, seed) * TAU + t * (i % 2 ? -0.15 : 0.11);
    const pulse = 0.25 + 0.75 * ih(i, tick, seed);
    const ux = Math.cos(a), uy = Math.sin(a);
    const g = ctx.createLinearGradient(ux * rx * 0.72, uy * rx * 0.72, ux * rx, uy * rx);
    g.addColorStop(0, 'rgba(100,180,255,0)');
    g.addColorStop(1, css([146, 211, 255], 0.27 * pulse * k));
    ctx.strokeStyle = g; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.arc(0, 0, rx, a - 0.28, a + 0.28); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, rx + 1, a - 0.20, a + 0.20); ctx.stroke();
  }
  ctx.restore();
}

const GUNS = [[-226, -214], [226, -214], [-140, -206], [140, -206], [-272, -296], [272, -296], [0, -168], [-60, -290], [60, -290]];
function guns(ctx, t, seed) {
  for (let i = 0; i < GUNS.length; i++) {
    const [gx, gy] = GUNS[i], per = 0.55 + 0.35 * ih(i, 2, seed);
    for (let n = 0; n < 2; n++) {
      const shot = Math.floor(t / per) - n, ts = t - shot * per; // seconds since this shot
      if (ts > 0.5) continue;
      const out = gx === 0 ? (ih(shot, i, seed) < 0.5 ? -1 : 1) : Math.sign(gx);
      const ang = -0.6 + 1.0 * ih(shot, i + 7, seed), dx = Math.cos(ang) * out, dy = Math.sin(ang) * 0.8 - 0.2;
      const d0 = ts * 900, d1 = Math.max(0, d0 - 46);
      bolt(ctx, gx + dx * d1, gy + dy * d1, gx + dx * d0, gy + dy * d0, [110, 200, 255], 1.6, 1 - ts * 1.4);
      if (ts < 0.08) bloom(ctx, gx, gy, 14, [150, 210, 255], 1 - ts / 0.08);
    }
  }
}

const HITS = [[-150, -262, 0.0], [190, -214, 0.18], [40, -330, 0.34], [-60, -190, 0.5]];
function hits(ctx, o, S, p) {
  const T = p * 2.6;
  for (let i = 0; i < HITS.length; i++) {
    const [x, y, at] = HITS[i], q = (T - at * 2.6) / 2.2;
    if (q < 0 || q > 1) continue;
    // the shield flares where the round lands, then the blast comes through onto the hull
    ctx.save(); ctx.translate(x * 1.18, y + (y + 232) * 0.18);
    bloom(ctx, 0, 0, 60 * (1 - q), [140, 210, 255], 0.9 * (1 - q));
    ctx.restore();
    vacuumBurst(ctx, x, y, 26, q, (o.seed || 0) * 7 + i);
  }
  // venting air: a white jet from a breach, freezing to mist
  if (T > 0.6) {
    const v = smooth(0.6, 1, T) * (1 - smooth(2.2, 2.6, T));
    for (let k = 0; k < 14; k++) {
      const a = frac(T * 1.8 + k / 14), x = -60 - a * 60, y = -190 + a * 26 - Math.sin(k) * a * 8;
      bloom(ctx, x, y, 4 + a * 14, [210, 220, 235], 0.28 * v * (1 - a));
    }
  }
}

export default {
  id: 'space.palace', family: 'space', title: 'Space palace',
  about: 'The floating space palace: a white and gold cathedral city on a disc with gardens and glass domes, a crown of gothic spires, a long hanging spire, and three banded rings whose gold clamps turn. Hard sun from o.lit. attack: shield bubble flickers and its guns fire blue bolts outward. hit (once, 2.6 s): blasts land on the hull through a flaring shield, air vents, the palace shudders. Anchor is the tip of the hanging spire.',
  w: W, h: H, states: ['idle', 'attack', 'hit'], loop: 12, once: { hit: 2.6 }, variants: 1,
  ref: 'refs/elements/space-palace.webp',
  draw(ctx, o) {
    ctx.save();
    const S = sun(o.L, o.lit ?? o.L.side), t = o.t || 0, p = clamp(o.p ?? 0.5);
    const hit = o.state === 'hit', attack = o.state === 'attack' || hit;
    if (hit) { const sh = (1 - p) * 2.2; ctx.translate((ih(Math.floor(t * 40), 1, 3) - 0.5) * sh, (ih(Math.floor(t * 40), 2, 3) - 0.5) * sh); }
    const c = cached(`space.palace|${S.q}`, W, H, (o.scale || 1) * (globalThis.devicePixelRatio || 1), (g) => body(g, S, 1));
    // a soft warm glow from all those windows first, then the palace
    bloom(ctx, 0, -221, 256, [255, 173, 79], 0.09);
    ctx.drawImage(c, -W / 2, -H, W, H);
    bloom(ctx, 0, -156, 96, [255, 160, 71], 0.12);
    bloom(ctx, 0, -207, 138, [255, 181, 98], 0.07);
    clamps(ctx, S, t);
    for (const sx of [-1, 1]) {
      nav(ctx, sx * (RINGS.main.rx + 3), RINGS.main.cy, [90, 150, 255], t, { period: 1.8, phase: sx > 0 ? 0.5 : 0, r: 3.5 });
      nav(ctx, sx * (RINGS.upper.rx + 2), RINGS.upper.cy, [90, 150, 255], t, { period: 2.2, phase: 0.25, r: 2.8 });
      nav(ctx, sx * (RINGS.lower.rx + 2), RINGS.lower.cy, [90, 150, 255], t, { period: 2.0, phase: 0.75, r: 2.8 });
    }
    nav(ctx, 0, DISK.y - 206, [255, 80, 60], t, { period: 2.4, r: 3 });
    if (attack) { shield(ctx, t, hit ? 1.3 : 1, o.seed || 0); guns(ctx, t, o.seed || 0); }
    if (hit) hits(ctx, o, S, p);
    ctx.restore();
  },
};
