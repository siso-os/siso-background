// A grey stealth destroyer: faceted superstructure, a lattice mast, a bow gun and a missile cell.
// fire (once): the gun flashes twice with recoil, then a missile leaves the vertical cell on a column of flame and smoke.
import { css, mix, shade, glow, clamp, smooth, mat, up, endFacing, litFill, rim, lamp, floatBody, waterline, bob, exhaust, FLAME, flicker, rng, TAU } from './_lib.js';

const BOX = [-87, -45, 90, 5];
const HULL = new Path2D('M-85 -7 L-85 3 L58 4.6 C74 4.6 84 -3 88.5 -11.2 L87.4 -11.6 Q20 -7.4 -85 -7.4 Z');
const FWD = new Path2D('M-24 -7.4 L-21.5 -23 L6 -23 L13.5 -7.4 Z');
const AFT = new Path2D('M-60 -7.4 L-58 -16.5 L-33 -16.5 L-31 -7.4 Z');
const FUN = new Path2D('M-50 -16.5 L-48.5 -23.5 L-40.5 -23.5 L-39 -16.5 Z');
const MAST = new Path2D('M-14 -23 L-9.5 -40 L-7.5 -40 L-3 -23 Z');
const GREY = [128, 134, 140];
const MUZZLE = [58.5, -10.6], CELL = 31;

function paint(g, s, o) {
  const L = o.L;
  litFill(g, HULL, o, GREY, { y0: -11.6, y1: 4.6, x0: -85, x1: 89, gloss: 0.12, bottomDrop: 0.5, side: 0.25 });
  g.save(); g.clip(HULL);
  g.fillStyle = mat([40, 42, 46], L, -0.2); g.fillRect(-86, -0.3, 176, 6); // dark boot top
  g.fillStyle = css([0, 0, 0], 0.12); g.fillRect(-86, -4.2, 176, 0.2); // knuckle line
  g.restore();
  if (s >= 0.6) { // hull number
    g.save(); g.fillStyle = mat([236, 238, 240], L, 0.2); g.font = '700 4.6px Helvetica, Arial, sans-serif';
    g.textBaseline = 'alphabetic'; g.fillText('07', 64, -2.6); g.restore();
  }
  rim(g, o, (c) => { c.moveTo(-85, -7.45); c.quadraticCurveTo(20, -7.45, 87.6, -11.7); }, 0.4);
  // faceted blocks: the side face plus a sloped end face that turns toward or away from the light
  for (const [P, y0, y1, x0, x1] of [[AFT, -16.5, -7.4, -60, -31], [FWD, -23, -7.4, -24, 13.5], [FUN, -23.5, -16.5, -50, -39]]) {
    litFill(g, P, o, GREY, { y0, y1, x0, x1, gloss: 0.08, bottomDrop: 0.25, side: 0.3 });
  }
  g.fillStyle = mat(GREY, L, endFacing(o, 1) * 0.7); // the forward block's sloped front catches or loses the light
  g.beginPath(); g.moveTo(6, -23); g.lineTo(13.5, -7.4); g.lineTo(11.6, -7.4); g.lineTo(5, -21.5); g.fill();
  g.fillStyle = mat([22, 26, 32], L, 0, 0.5); g.beginPath(); g.moveTo(4.2, -21); g.lineTo(8.6, -21); g.lineTo(9.6, -18.8); g.lineTo(4, -18.8); g.fill(); // bridge glass
  g.fillStyle = mat(mix(GREY, [70, 74, 80], 0.5), L, 0); g.beginPath(); // the flat radar panel
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 8; g.lineTo(-8 + 3.6 * Math.cos(a), -15 + 3.6 * Math.sin(a)); }
  g.fill();
  g.fillStyle = mat(GREY, L, 0.1); g.fill(MAST);
  g.strokeStyle = mat([70, 74, 80], L, 0); g.lineWidth = 0.3;
  g.beginPath(); g.moveTo(-12, -27); g.lineTo(-5, -27); g.moveTo(-11, -32); g.lineTo(-6, -32); g.moveTo(-8.5, -40); g.lineTo(-8.5, -44.5);
  g.moveTo(-12, -38); g.lineTo(-5, -38); g.stroke();
  g.fillStyle = mat([60, 64, 70], L, 0); g.fillRect(-49, -25, 2, 1.6); g.fillRect(-46, -25, 2, 1.6);
  // the cell hatches on the foredeck, the CIWS dome on the bridge roof, the boats' davit block aft
  g.fillStyle = mat([96, 100, 106], L, up(L)); g.fillRect(CELL - 6, -8.4, 12, 1.1);
  g.fillStyle = css([0, 0, 0], 0.25); for (let x = CELL - 5.5; x < CELL + 6; x += 2) g.fillRect(x, -8.4, 0.15, 1.1);
  g.fillStyle = mat([210, 214, 218], L, 0.3, 0.2); g.beginPath(); g.ellipse(-2, -24.6, 1.6, 1.7, 0, 0, TAU); g.fill();
  g.fillStyle = mat(GREY, L, 0); g.fillRect(-3, -23.3, 2, 0.4);
  // helideck markings
  g.fillStyle = mat([200, 204, 208], L, up(L)); g.fillRect(-84, -7.8, 22, 0.35);
  rim(g, o, (c) => { c.moveTo(-58, -16.55); c.lineTo(-33, -16.55); c.moveTo(-21.5, -23.05); c.lineTo(6, -23.05); c.moveTo(-48.5, -23.55); c.lineTo(-40.5, -23.55); }, 0.4);
}

// the gun turret and barrel, drawn per frame (it recoils)
function gun(ctx, o, recoil) {
  const L = o.L;
  ctx.fillStyle = mat(GREY, L, 0.1);
  ctx.beginPath(); ctx.moveTo(42, -8); ctx.lineTo(43, -11.2); ctx.lineTo(48.5, -11.6); ctx.lineTo(51, -9); ctx.lineTo(51, -8); ctx.fill();
  ctx.fillStyle = mat(GREY, L, up(L)); ctx.fillRect(43, -11.7, 5.5, 0.5);
  ctx.save(); ctx.translate(49.5, -10.2); ctx.rotate(-0.06); ctx.translate(-recoil, 0);
  ctx.fillStyle = mat([92, 96, 102], L, 0.1); ctx.fillRect(0, -0.35, 9.2, 0.7);
  ctx.restore();
}

const K = 160 / 177; // natural drawing units to the box

export default {
  id: 'sea.warship',
  family: 'sea',
  title: 'Warship',
  about: 'A grey stealth destroyer with a bow gun and a vertical missile cell; fire (once, 2.4 s): two gun flashes with recoil, then a missile launches straight up on flame and smoke.',
  w: 160, h: 40.7, // the drawing x K; the long side is 2^n or 5x2^n (REASONING, Calls I made)
  states: ['idle', 'fire'],
  loop: 8,
  once: { fire: 2.4 },
  variants: 1,
  ref: null,
  draw(ctx, o) {
    ctx.save();
    try {
      ctx.scale(K, K);
      const L = o.L, t = o.t || 0, fire = o.state === 'fire', p = fire ? clamp(o.p || 0) : 0;
      const b = bob(o, 0.2, 13);
      floatBody(ctx, o, { key: 'sea.warship', box: BOX, pivot: 0, paint: (g, s) => paint(g, s, o) }, b);
      ctx.save(); ctx.translate(0, b.heave); ctx.rotate(-b.pitch);
      const shot1 = fire ? Math.max(0, 1 - Math.abs(p - 0.02) / 0.04) : 0, shot2 = fire ? Math.max(0, 1 - Math.abs(p - 0.16) / 0.04) : 0;
      const recoil = fire ? 1.6 * (Math.exp(-Math.max(0, p - 0.02) * 40) * (p > 0.0 ? 1 : 0) + Math.exp(-Math.max(0, p - 0.16) * 40) * (p > 0.14 ? 1 : 0)) : 0;
      gun(ctx, o, clamp(recoil, 0, 1.6));
      const n = clamp(L.night * 1.5);
      lamp(ctx, -8.5, -44.5, [255, 250, 240], o, 0.5, n);
      lamp(ctx, 12, -9, [60, 255, 120], o, 0.4, n);
      lamp(ctx, -84, -9, [255, 250, 240], o, 0.35, n);
      for (const k of [shot1, shot2]) if (k > 0) {
        const [mx, my] = MUZZLE;
        glow(ctx, mx + 2, my - 0.2, 26, [255, 190, 110], 0.7 * k);
        exhaust(ctx, mx + 7 * k, my - 0.4, 7 * k, 1.6 * k, FLAME.burner, k, { bloom: 0 });
      }
      if (fire && p > 0.1) { // smoke left by the gun, drifting aft and up
        const a = clamp((p - 0.04) * 3) * (1 - smooth(0.5, 1, p));
        for (let i = 0; i < 4; i++) {
          const g = ctx.createRadialGradient(56 + i * 2 - p * 8, -11 - i * 0.8 - p * 4, 0, 56 + i * 2 - p * 8, -11 - i * 0.8 - p * 4, 3 + p * 6);
          const sc = shade([170, 168, 162], L, 0.3);
          g.addColorStop(0, css(sc, 0.4 * a)); g.addColorStop(1, css(sc, 0));
          ctx.fillStyle = g; ctx.fillRect(40, -30, 30, 26);
        }
      }
      if (fire && p > 0.28) { // the vertical launch
        const q = (p - 0.28) / 0.72, my = -9 - 60 * q * q - 6 * q, r = rng(91);
        const sc = shade([196, 192, 186], L, 0.4);
        for (let i = 0; i < 16; i++) { // the smoke column, oldest (lowest) widest
          const u = i / 15, y = lerp(-8.5, my + 3, u), age = 1 - u, rad = 1.6 + age * 7 * q + r() * 1.5;
          const g = ctx.createRadialGradient(CELL + (r() - 0.5) * 2 - age * q * 6, y, 0, CELL - age * q * 6, y, rad);
          const warm = mix(sc, [255, 150, 70], clamp(1 - Math.abs(y - my) / 14) * 0.7);
          g.addColorStop(0, css(warm, 0.42 * (0.4 + 0.6 * age) * (1 - 0.5 * q))); g.addColorStop(1, css(warm, 0));
          ctx.fillStyle = g; ctx.fillRect(CELL - 20, y - rad, 40, rad * 2);
        }
        glow(ctx, CELL, -8.5, 22 * (1 - q * 0.6), [255, 170, 90], 0.8 * (1 - q * 0.7)); // flash on the deck
        ctx.save(); ctx.translate(CELL, my); ctx.rotate(-Math.PI / 2);
        exhaust(ctx, -2.2, 0, 10 * flicker(t, 5), 1, FLAME.enemy, 1, { night: L.night, bloom: 1.4 });
        ctx.fillStyle = mat([220, 222, 224], L, 0.3); ctx.fillRect(-2.2, -0.55, 5, 1.1);
        ctx.beginPath(); ctx.moveTo(2.8, -0.55); ctx.lineTo(4.4, 0); ctx.lineTo(2.8, 0.55); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      waterline(ctx, o, -85, 82, { foam: 0.45, speed: 0.15, seed: 17 });
    } finally { ctx.restore(); }
  },
};

const lerp = (a, b, t) => a + (b - a) * t;
