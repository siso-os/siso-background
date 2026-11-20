import { cached } from '../../core/paint.js';
// A tall steel rocket on its pad beside a lattice launch tower. idle: vapour venting, pad floods and tower beacons at
// night. launch (once, 14 s): ignition, the trench throws smoke both ways, the rocket climbs on a long flame, the plume
// column widens behind it and the pad glows. The rocket leaves the box upward (free).
import { css, mix, shade, glow, clamp, lerp, smooth, mat, up, rim, lamp, bake, exhaust, flicker, beacon, FLAME, rng, hgrad, vgrad, WHITE, shockCells } from './_lib.js';

const BOX = [-40, -160, 40, 0];
const RX = 6, R = 5.5, BOT = -12, TOP = -128, NOSE = -147;
const STEEL = [196, 200, 206];

// A cylinder lit from one side: shadow edge, body, a hot highlight band toward the light, a soft falloff at the rim.
function cyl(g, x0, x1, o, base, gloss = 0.4) {
  const L = o.L, d = shade(base, L, -1, { gloss: gloss * 0.6 }), m = shade(base, L, 0.2, { gloss }), h = mix(shade(base, L, 1, { gloss }), WHITE, 0.25 * L.keyAmt * (1 - L.night));
  const stops = [[0, d], [0.3, m], [0.72, h], [0.86, m], [1, mix(d, m, 0.5)]];
  return hgrad(g, x0, x1, o.lit > 0 ? stops : stops.map(([s, c]) => [1 - s, c]).reverse());
}

function paintPad(g, s, o) {
  const L = o.L;
  // the pad deck and the flame trench
  g.fillStyle = vgrad(g, -10, 0, [[0, shade([168, 164, 156], L, up(L))], [0.12, shade([150, 146, 138], L, 0)], [1, shade([90, 88, 84], L, -0.5)]]);
  g.fillRect(-40, -10, 80, 10);
  g.fillStyle = mat([20, 20, 22], L, 0); g.fillRect(RX - 9, -9.4, 18, 9.4);
  g.fillStyle = mat([110, 108, 104], L, 0); g.fillRect(RX - 7, -11.4, 3, 1.4); g.fillRect(RX + 4, -11.4, 3, 1.4); // hold-downs
  // the tower: two legs and cross braces, floors every 12 units, a lightning mast
  const tx0 = -23, tx1 = -14;
  g.fillStyle = mat([78, 80, 84], L, 0); g.fillRect(tx0, -150, 1.2, 140); g.fillRect(tx1 - 1.2, -150, 1.2, 140);
  g.strokeStyle = mat([96, 98, 102], L, 0); g.lineWidth = 0.45; g.beginPath();
  for (let y = -10; y > -150; y -= 12) { g.moveTo(tx0, y); g.lineTo(tx1, y - 12); g.moveTo(tx1, y); g.lineTo(tx0, y - 12); g.moveTo(tx0, y); g.lineTo(tx1, y); }
  g.moveTo((tx0 + tx1) / 2, -150); g.lineTo((tx0 + tx1) / 2, -159); g.stroke();
  g.fillStyle = mat([120, 122, 126], L, up(L)); g.fillRect(tx0 - 1, -151, tx1 - tx0 + 2, 1.2);
  rim(g, o, (c) => { c.moveTo(-40, -10.05); c.lineTo(40, -10.05); c.moveTo(tx0 - 1, -151.1); c.lineTo(tx1 + 1, -151.1); }, 0.4);
}
function paintRocket(g, s, o) {
  const L = o.L, x0 = RX - R, x1 = RX + R;
  g.fillStyle = mat([30, 30, 32], L, 0); // engine bells
  for (const dx of [-3, 0, 3]) { g.beginPath(); g.moveTo(RX + dx - 1, BOT); g.lineTo(RX + dx - 1.6, BOT + 2.2); g.lineTo(RX + dx + 1.6, BOT + 2.2); g.lineTo(RX + dx + 1, BOT); g.fill(); }
  g.fillStyle = cyl(g, x0, x1, o, STEEL); g.fillRect(x0, TOP, R * 2, BOT - TOP);
  g.beginPath(); g.moveTo(x0, TOP); g.bezierCurveTo(x0, TOP - 10, RX - 1.6, NOSE + 1, RX, NOSE); g.bezierCurveTo(RX + 1.6, NOSE + 1, x1, TOP - 10, x1, TOP); g.fill();
  g.fillStyle = cyl(g, x0, x1, o, [36, 36, 38], 0.3); g.fillRect(x0, -74, R * 2, 4); // interstage band
  g.fillStyle = css([0, 0, 0], 0.12); for (let y = BOT - 6; y > TOP; y -= 6) g.fillRect(x0, y, R * 2, 0.18); // weld rings
  g.fillStyle = css([255, 255, 255], 0.08); g.fillRect(x0, -64, R * 2, 0.4);
  for (const offset of [-2.8, 2.8]) {
    const x = RX + offset, a = x - 1.42, b = x + 1.42;
    g.fillStyle = cyl(g, a, b, o, [173, 168, 155], 0.31);
    g.fill(new Path2D(`M${x} -59 Q${a} -52 ${a} -42 L${a} -14 Q${x} -12 ${b} -14 L${b} -43 Q${b} -52 ${x} -59 Z`));
    g.fillStyle = cyl(g, a, b, o, [63, 59, 54], 0.18);
    g.fillRect(a, -20, b - a, 0.95);
    g.fillRect(a, -15.3, b - a, 1.65);
  }
  // fins: the near pair as two blades, the shadow side darker
  g.fillStyle = mat([60, 62, 66], L, o.lit > 0 ? -0.6 : 0.6);
  g.beginPath(); g.moveTo(x0, BOT - 16); g.lineTo(x0 - 4.2, BOT - 2); g.lineTo(x0 - 4.2, BOT + 0.4); g.lineTo(x0, BOT); g.fill();
  g.fillStyle = mat([60, 62, 66], L, o.lit > 0 ? 0.6 : -0.6);
  g.beginPath(); g.moveTo(x1, BOT - 16); g.lineTo(x1 + 4.2, BOT - 2); g.lineTo(x1 + 4.2, BOT + 0.4); g.lineTo(x1, BOT); g.fill();
  g.fillStyle = mat([40, 42, 46], L, 0); g.fillRect(x0 - 0.8, TOP + 6, 0.8, 3); g.fillRect(x1, TOP + 6, 0.8, 3); // grid fins
}

const puff = (ctx, x, y, r, c, a) => {
  if (a <= 0.01 || r <= 0) return;
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.25, 0, x, y, r);
  g.addColorStop(0, css(mix(c, WHITE, 0.15), a)); g.addColorStop(0.55, css(c, a * 0.7)); g.addColorStop(1, css(c, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

// Overlapping, softly fringed lobes form one reusable cloud. Each lobe's hot edge faces the flame below it.
function smokeCloud(o, hot, variant) {
  const L = o.L;
  return cached(`air.rocket-ship:smoke|${variant}|${hot}|${L.q}|${o.lit}`, 96, 96, 1.5, (g) => {
    const r = rng(9159 + variant * 17);
    const shadow = mix(shade([151, 149, 148], L, 0.22), [57, 50, 48], 0.15);
    const fill = mix(shade([194, 187, 176], L, 0.52), [204, 128, 76], hot * 0.53);
    const edge = mix(shade([229, 221, 205], L, 0.79), [255, 189, 112], hot * 0.84);
    const lobes = [[-10, -46, 30], [11, -49, 30], [0, -39, 28]];
    for (let i = 0; i < 57; i++) {
      const a = r() * Math.PI * 2, dis = Math.sqrt(r()), rad = 2.3 + 11 * r() ** 1.6;
      lobes.push([Math.cos(a) * dis * 32, -47 + Math.sin(a) * dis * 24, rad]);
    }
    for (const [x, y, rad] of lobes) {
      const dx = rad * (hot ? 0.13 : 0.28) * o.lit, dy = rad * (hot ? 0.47 : -0.28);
      const light = g.createRadialGradient(x + dx, y + dy, rad * 0.05, x, y, rad);
      light.addColorStop(0, css(edge, 0.9));
      light.addColorStop(0.37, css(mix(edge, fill, 0.54), 0.79));
      light.addColorStop(0.61, css(fill, 0.52));
      light.addColorStop(0.83, css(mix(fill, shadow, 0.22), 0.23));
      light.addColorStop(1, css(fill, 0));
      g.fillStyle = light;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
}

function paintExhaustClouds(ctx, o, p, rise, near) {
  const r = rng(4242), top = -12 - rise;
  const smoke = (x, y, size, alpha, warmth, variant) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(smokeCloud(o, 0, variant), x - size, y - size, size * 2, size * 2);
    if (warmth > 0.03) {
      ctx.globalAlpha = alpha * warmth;
      ctx.drawImage(smokeCloud(o, 1, variant), x - size, y - size, size * 2, size * 2);
    }
  };
  ctx.save();
  const fade = 1 - smooth(0.74, 1, p);
  for (let i = 0; i < 17; i++) {
    const dir = i % 2 ? 1 : -1, sp = 0.4 + r(), lift = r(), phase = r() * 0.3;
    const k = smooth(0, 0.44, p * (0.8 + sp * 0.4) - phase * 0.2);
    if (k <= 0.01 || fade <= 0.01) continue;
    const x = RX + dir * (2 + 66 * sp * k), y = -1 - (11 + 29 * lift) * k;
    smoke(x, y, 8 + 34 * k * (0.52 + sp * 0.42), (0.53 + lift * 0.32) * k * fade,
      near * (1.2 - sp * 0.55), i % 5);
  }
  const groundRoll = smooth(0.025, 0.22, p) * fade;
  if (groundRoll > 0.01) {
    const size = 10 + 23 * smooth(0.03, 0.35, p);
    smoke(RX - 16, -10, size, 0.54 * groundRoll, near * 0.86, 2);
    smoke(RX + 15, -7, size * 0.85, 0.61 * groundRoll, near * 0.9, 0);
  }
  const spread = clamp(rise / 270), opacity = clamp(rise / 20);
  if (opacity > 0.01) {
    for (let i = 0; i < 26; i++) {
      const u = i / 25, y = lerp(-13, top + 9, u), age = (1 - u) * spread;
      const rad = 4 + 37 * (1 - u) * clamp(rise / 105) + 7 * r();
      const x = RX + (r() - 0.5) * (3 + 25 * age) - age * 14;
      smoke(x, y, rad, (0.39 + 0.49 * u) * opacity, smooth(0.17, 0.88, u), (i + 2) % 5);
    }
  }
  ctx.restore();
}

export default {
  id: 'air.rocket-ship',
  family: 'air',
  title: 'Rocket ship',
  about: 'A tall steel rocket on a pad with a lattice tower; idle venting, launch (once 14 s): ignition, trench smoke, lift-off on a long flame and plume, the pad glowing. Leaves the box upward.',
  w: 80, h: 160,
  states: ['idle', 'launch'],
  loop: 6,
  once: { launch: 14 },
  variants: 1,
  free: true,
  ref: 'refs/slice/vertical-slice.webp',
  draw(ctx, o) {
    ctx.save();
    try {
      const L = o.L, t = o.t || 0, launch = o.state === 'launch', p = launch ? clamp(o.p || 0) : 0;
      const rise = launch ? 900 * Math.max(0, (p - 0.06) / 0.94) ** 2 : 0, burn = launch ? smooth(0, 0.05, p) : 0;
      const smokeC = shade([214, 210, 204], L, 0.4), hot = [255, 170, 90];
      const near = burn * clamp(1 - rise / 260); // how much the flame still lights the pad
      if (near > 0) glow(ctx, RX, -10, 115, hot, 0.37 * near);
      bake(ctx, 'air.rocket-ship:pad', BOX, o, (g, s) => paintPad(g, s, o));
      // the access arm: swings clear at ignition
      ctx.save(); ctx.translate(-14, -112); ctx.rotate(-1.2 * smooth(0, 0.04, p));
      ctx.fillStyle = mat([96, 98, 102], L, 0); ctx.fillRect(0, -1.2, RX - R + 14, 1.6); ctx.restore();
      if (launch) paintExhaustClouds(ctx, o, p, rise, near);
      ctx.save(); ctx.translate(0, -rise);
      if (burn > 0) {
        const len = 24 + 70 * smooth(0.06, 0.45, p);
        ctx.save(); ctx.translate(RX, BOT + 2); ctx.rotate(-Math.PI / 2);
        const plume = Math.min(len, rise * 0.79 + 11) * flicker(t, 9, 23);
        exhaust(ctx, 0, 0, plume, 4.8, FLAME.rocket, burn * 0.53, { night: L.night, bloom: 1.26 });
        const core = hgrad(ctx, 0, -plume, [[0, WHITE, burn], [0.13, WHITE, burn * 0.95],
          [0.31, FLAME.rocket.core, burn * 0.55], [0.76, FLAME.rocket.edge, 0]]);
        ctx.fillStyle = core;
        ctx.fill(new Path2D(`M0 -2.9 Q${-plume * 0.22} -4.6 ${-plume * 0.71} 0 Q${-plume * 0.26} 4.1 0 2.9 Z`));
        shockCells(ctx, 0, 0, plume * 0.72, 5.5, FLAME.rocket, burn);
        ctx.restore();
      }
      bake(ctx, 'air.rocket-ship:body', BOX, o, (g, s) => paintRocket(g, s, o));
      if (burn > 0) {
        glow(ctx, RX, BOT - 8, 26, hot, 0.25 * burn);
        glow(ctx, RX, BOT + 8, 21, [255, 190, 115], 0.33 * burn);
      } // the flame lights its own skin
      ctx.restore();
      if (!launch) { // vapour venting from the tank vents, drifting down the side
        const r = rng(77);
        for (let i = 0; i < 10; i++) {
          const ph = r(), vy = r() > 0.5 ? -100 : -56, a = ((t * 0.35 + ph) % 1);
          puff(ctx, RX + R + 1 + a * 9, vy + a * 22, 2 + a * 6, smokeC, 0.4 * (1 - a));
        }
      }
      const n = clamp(L.night * 1.5);
      lamp(ctx, -18.5, -159, [255, 40, 30], o, 0.8, beacon(t, 1.6) * (0.3 + 0.7 * n));
      lamp(ctx, -18.5, -100, [255, 40, 30], o, 0.6, beacon(t, 1.6, 0.4) * n);
      if (n > 0.05 && !launch) { // floodlights from the pad on the rocket's skin
        for (const x of [-34, 34]) lamp(ctx, x, -11, [255, 236, 200], o, 0.7, n);
        glow(ctx, RX, -60, 40, [255, 236, 200], 0.12 * n); glow(ctx, RX, -110, 30, [255, 236, 200], 0.08 * n);
      }
    } finally { ctx.restore(); }
  },
};
