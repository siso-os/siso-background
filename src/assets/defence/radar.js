// An air-search radar: an equipment shelter, a lattice mast and a long curved reflector turning once every 4 s.
// The reflector is drawn as eight strips along its length, each lit by its own normal and painted far-to-near, so the
// dish foreshortens, turns edge-on and shows its ribbed back as it turns. track: a fast sector scan toward the right.
import { css, shade, clamp, mat, rim, lamp, bake, vgrad, beacon, GUNMETAL, TAU, glow, contact, armour, OLIVE } from './_lib.js';

const BOX = [-12, -40, 12, 0.5];
const AY = -34.2, AW = 11, AH = 3.1, DEPTH = 2.2, FEED = 5.6;
const FACE = [163, 168, 171], BACK = [108, 112, 116];

function paintBase(g, s, o) {
  const L = o.L;
  contact(g, 0, -0.8, 23, 1.3);
  // the lattice mast: two tapered legs, X braces, a platform and the turning head
  g.strokeStyle = mat(GUNMETAL, L, 0); g.lineWidth = 0.7; g.beginPath();
  g.moveTo(-5, -8); g.lineTo(-1.8, -29); g.moveTo(5, -8); g.lineTo(1.8, -29); g.stroke();
  g.lineWidth = 0.32; g.beginPath();
  for (let y = -8; y > -28; y -= 4) {
    const w0 = 5 - (3.2 * (-8 - y)) / 21, w1 = 5 - (3.2 * (-4 - y)) / 21;
    g.moveTo(-w0, y); g.lineTo(w1, y - 4); g.moveTo(w0, y); g.lineTo(-w1, y - 4);
  }
  g.stroke();
  g.fillStyle = vgrad(g, -30, -29, [[0, shade(GUNMETAL, L, 0.5)], [1, shade(GUNMETAL, L, -0.5)]]); g.fillRect(-4, -30, 8, 1);
  g.fillStyle = mat([60, 62, 66], L, 0); g.fillRect(-1.3, -31.2, 2.6, 1.3);
  // the shelter: a pale box with a door, louvres and an air conditioner
  const shelter = new Path2D('M-10 0 L-10 -7.2 L-9 -8.15 L9.2 -8.15 L10 -7.45 L10 0 Z');
  armour(g, o, shelter, -10, -8.15, 20, 8.15, 77, OLIVE);
  g.fillStyle = mat([53, 56, 46], L, -0.2); g.fillRect(-9.9, -0.8, 19.8, 0.8);
  g.strokeStyle = mat([48, 52, 46], L, 0.12); g.lineWidth = 0.3;
  g.beginPath(); g.moveTo(3.8, -8); g.bezierCurveTo(3, -15, -0.9, -19, 0, -30); g.stroke();
  g.fillStyle = mat([150, 139, 101], L, 0.32); g.fillRect(-4.9, -5.6, 0.17, 4.8);
  g.fillStyle = css([15, 18, 15], 0.62); g.fillRect(1.8, -6.9, 5.8, 5);
  g.fillStyle = mat([103, 108, 86], L, 0.08); g.fillRect(2.0, -6.7, 5.4, 4.6);
  g.fillStyle = mat([70, 72, 76], L, 0); g.fillRect(-7, -5.6, 2.6, 5.6);
  g.fillStyle = css([0, 0, 0], 0.28); for (let y = -6.4; y < -2.8; y += 0.7) g.fillRect(2.4, y, 4.6, 0.25);
  g.fillStyle = mat([150, 150, 146], L, 0.1); g.fillRect(7.6, -4.2, 2.4, 2.6);
  rim(g, o, (c) => { c.moveTo(-10, -8.05); c.lineTo(10, -8.05); c.moveTo(-4, -30.05); c.lineTo(4, -30.05); }, 0.3);
}

function reflector(ctx, o, th) {
  const L = o.L, c = Math.cos(th), sn = Math.sin(th), N = 14;
  const at = (u, v) => {
    const h = AH * Math.sqrt(Math.max(0, 1 - u ** 8));
    const depth = DEPTH * (u * u + 0.52 * v * v * (1 - u * u));
    return [u * AW * c + depth * sn, AY + v * h, -u * AW * sn + depth * c];
  };
  const strips = [];
  for (let i = 0; i < N; i++) {
    const u0 = -1 + 2 * i / N, u1 = u0 + 2 / N, um = (u0 + u1) / 2;
    const edge = (u) => [-1, -0.5, 0, 0.5, 1].map((v) => at(u, v));
    const a = edge(u0), b = edge(u1);
    const tx = 2 * DEPTH * um / AW;
    strips.push({ a, b, z: (a[2][2] + b[2][2]) / 2, nx: sn - tx * c, nz: c + tx * sn });
  }
  strips.sort((a, b) => a.z - b.z);
  const feed = [FEED * sn, FEED * c];
  const drawFeed = () => {
    ctx.strokeStyle = mat([70, 72, 76], L, 0); ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(0, AY + AH); ctx.lineTo(feed[0], AY + 0.6); ctx.moveTo(0, AY - AH); ctx.lineTo(feed[0], AY - 0.6); ctx.stroke();
    ctx.fillStyle = mat([90, 92, 96], L, sn * (o.lit || 1)); ctx.fillRect(feed[0] - 0.6, AY - 0.8, 1.2, 1.6);
  };
  if (feed[1] < 0) drawFeed();
  for (const s of strips) {
    const front = s.nz > 0, f = clamp((front ? s.nx : -s.nx) * (o.lit || 1) * 0.9 + 0.15 * Math.abs(s.nz), -1, 1);
    const base = front ? FACE : BACK;
    const path = new Path2D();
    path.moveTo(...s.a[0].slice(0, 2));
    for (const [x, y] of s.a.slice(1)) path.lineTo(x, y);
    for (let k = s.b.length - 1; k >= 0; k--) path.lineTo(s.b[k][0], s.b[k][1]);
    path.closePath();
    ctx.fillStyle = vgrad(ctx, AY - AH, AY + AH, [[0, shade(base, L, f + 0.4, { gloss: 0.18 })], [0.28, shade(base, L, f - 0.21)], [0.62, shade(base, L, f + 0.09, { gloss: 0.22 })], [1, shade(base, L, f - 0.5)]]);
    ctx.fill(path);
    ctx.strokeStyle = css(shade(base, L, f), 0.66); ctx.lineWidth = 0.13; ctx.stroke(path);
    ctx.strokeStyle = css(shade([235, 228, 206], L, f + 0.2), front ? 0.35 : 0.21);
    ctx.lineWidth = 0.16; ctx.beginPath(); ctx.moveTo(s.a[0][0], s.a[0][1]); ctx.lineTo(s.b[0][0], s.b[0][1]); ctx.stroke();
    ctx.strokeStyle = css([24, 27, 28], front ? 0.16 : 0.56);
    ctx.beginPath(); ctx.moveTo(s.a[3][0], s.a[3][1]); ctx.lineTo(s.b[3][0], s.b[3][1]); ctx.stroke();
  }
  if (feed[1] >= 0) drawFeed();
}

export default {
  id: 'defence.radar',
  family: 'defence',
  title: 'Radar',
  about: 'An air-search radar on a lattice mast over an equipment shelter; idle: the curved reflector turns once every 4 s; track: a fast sector scan toward the right with the feed pulsing.',
  w: 24, h: 40,
  states: ['idle', 'track'],
  loop: 4,
  variants: 1,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, track = o.state === 'track';
      bake(ctx, 'defence.radar', BOX, o, (g, s) => paintBase(g, s, o));
      const th = track ? 1.05 + 0.75 * Math.sin(t * 2.6) : ((t / 4 + (o.seed || 0) * 0.37) % 1) * TAU;
      reflector(ctx, o, th);
      const n = clamp(L.night * 1.5);
      if (track) glow(ctx, FEED * Math.sin(th), AY, 5, [140, 200, 255], 0.5 * (0.5 + 0.5 * Math.sin(t * 20)));
      lamp(ctx, -3.8, -30.4, [255, 40, 30], o, 0.3, beacon(t, 1.5) * (0.25 + 0.75 * n));
      if (n > 0.05) { lamp(ctx, -5.7, -6.2, [255, 220, 170], o, 0.3, 0.7 * n); }
    } finally { ctx.restore(); }
  },
};
