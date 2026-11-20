// The harbour police launch: white topsides, a navy POLICE band, a pilothouse with a blue-red light bar that flashes
// in turn and bleeds its colour onto the water. chase: bow up, spray, faster flashes.
import {
  css, mix, shade, glow, vgrad, clamp, mat, up, endFacing, litFill, rim, lamp, floatBody, waterline, bob, spray,
} from './_lib.js';
import { hullForm, skyGlass as glass, ledge, railing, clutter, rake } from './_hull.js';

const BOX = [-23, -21, 24, 3];
const HULL = new Path2D('M-21 -5.6 L-21 1.6 L3 2.6 C12 2.6 18.5 -1.2 22.6 -7.3 L21.6 -7.7 Q4 -5.6 -21 -5.6 Z');
const CABIN = new Path2D('M-8.6 -5.6 L-8.6 -12.1 L-7.9 -12.7 L6.3 -12.7 L10.9 -6.1 L10.9 -5.6 Z');
const BLUE = [40, 120, 255], RED = [255, 40, 50];

// The light bar's state at t: [blue, red] brightness 0..1; quick double flashes, alternating.
function bar(t, fast) {
  const u = ((t * (fast ? 2.4 : 1.6)) % 1 + 1) % 1, side = u < 0.5 ? 0 : 1, v = (u % 0.5) * 2;
  const on = v < 0.3 ? 1 : v < 0.4 ? 0.3 : v < 0.75 ? 0.95 : 0.12;
  return side ? [0.1, on] : [on, 0.1];
}

function paint(g, s, o) {
  const L = o.L;
  // hull: white topsides, band, dark bottom
  litFill(g, HULL, o, [232, 236, 240], { y0: -8, y1: 2.6, x0: -21, x1: 23, gloss: 0.25, bottomDrop: 0.35 });
  g.save(); g.clip(HULL);
  g.fillStyle = mat([22, 48, 116], L, 0, 0.2);
  g.beginPath(); g.moveTo(-22, -4.3); g.lineTo(23, -5.3); g.lineTo(23, -3.4); g.lineTo(-22, -2.6); g.fill();
  g.fillStyle = mat([18, 28, 60], L, -0.2, 0.1);
  g.fillRect(-22, -0.9, 46, 4);
  g.fillStyle = css(shade([235, 240, 245], L, 0.5), 0.55); // spray rail catching light
  g.fillRect(-21, -1.2, 40, 0.28);
  g.restore();
  hullForm(g, HULL, o, { x0: -21, x1: 23, y0: -8, y1: 2.6, wl: 0.2, boot: 1.1, sheer: (c) => { c.moveTo(-21, -5.65); c.quadraticCurveTo(4, -5.65, 22.4, -7.5); } });
  if (s >= 1.5) {
    g.save(); g.fillStyle = mat([240, 244, 248], L, 0.3);
    g.font = '700 1.45px Helvetica, Arial, sans-serif'; g.textBaseline = 'middle';
    g.translate(-2, -3.7); g.rotate(-0.021); g.fillText('POLICE', 0, 0); g.restore();
  }
  // gunwale fender: dark line with a lit top
  g.strokeStyle = mat([30, 32, 36], L, 0); g.lineWidth = 0.55;
  g.beginPath(); g.moveTo(-21, -5.3); g.quadraticCurveTo(4, -5.3, 21.6, -7.4); g.stroke();
  rim(g, o, (c) => { c.moveTo(-21, -5.7); c.quadraticCurveTo(4, -5.7, 21.8, -7.8); }, 0.3);
  // pilothouse
  litFill(g, CABIN, o, [236, 238, 240], { y0: -13, y1: -5.6, x0: -9, x1: 11, gloss: 0.2, bottomDrop: 0.15 });
  g.fillStyle = mat([228, 232, 236], L, up(L)); g.fillRect(-9.2, -13.4, 16.4, 0.75); // roof slab
  g.fillStyle = mat([228, 232, 236], L, endFacing(o, 1) * 0.6); // the slab's front lip
  g.fillRect(7.2, -13.4, 0.5, 0.75);
  const lit = 0.55;
  glass(g, o, -6.6, -11.4, 4.2, 2.9, { lit }); glass(g, o, -1.9, -11.4, 4.6, 2.9, { lit }); glass(g, o, 3.2, -11.4, 3.1, 2.9, { lit });
  g.save(); g.beginPath(); g.moveTo(6.9, -11.4); g.lineTo(8.9, -8.5); g.lineTo(6.9, -8.5); g.closePath(); g.clip();
  glass(g, o, 6.5, -11.6, 3, 3.3, { lit }); g.restore();
  glass(g, o, -8.2, -11, 0.9, 3.6, { lit: lit * 0.6 }); // aft door
  rim(g, o, (c) => { c.moveTo(-9.2, -13.4); c.lineTo(7.2, -13.4); }, 0.3);
  ledge(g, -8.6, 7.2, -12.65, 1.3, 0.38); // the roof's shadow on the cabin front
  clutter(g, o, -20, -10.5, -5.6, 3, 4); // the aft deck
  // radar dome, mast, light bar base, searchlight
  g.fillStyle = mat([214, 218, 222], L, 0.2, 0.2);
  g.beginPath(); g.ellipse(-5.6, -14.6, 1.7, 1.15, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = mat([90, 94, 100], L, 0); g.fillRect(-6, -13.6, 0.8, 0.4);
  g.strokeStyle = mat([60, 64, 70], L, 0); g.lineWidth = 0.22;
  g.beginPath(); g.moveTo(-3.6, -13.4); g.lineTo(-3.1, -20.5); g.stroke();
  g.fillStyle = mat([26, 28, 34], L, 0); g.fillRect(-3, -14.5, 6, 1.15);
  g.fillStyle = mat([200, 204, 210], L, 0.3); g.fillRect(4.6, -14.2, 1.3, 0.9);
  // rails fore and aft
  if (s >= 0.75) {
    const rl = [[-20.4, -8.2, -9, -8.2], [11.5, -8.9, 19.6, -9.6]];
    for (let x = -20.4; x <= -9; x += 2.85) rl.push([x, -5.6, x, -8.2]);
    for (const x of [11.5, 14.2, 16.9, 19.6]) rl.push([x, -5.6 - (x - 11.5) * 0.11, x, -8.9 - (x - 11.5) * 0.09]);
    rl.push([-3.6, -13.4, -3.1, -20.5]); // the whip antenna
    railing(g, o, rl);
  }
  rake(g, o, BOX);
}

const K = 40 / 47; // natural drawing units to the box

export default {
  id: 'sea.police-boat',
  family: 'sea',
  title: 'Police boat',
  about: 'Harbour police launch, white with a navy POLICE band; the light bar flashes blue then red and lights the water (chase: bow up, spray).',
  w: 40, h: 17.9, // the drawing x K; the long side is 2^n or 5x2^n (REASONING, Calls I made)
  states: ['idle', 'chase'],
  loop: 4,
  variants: 1,
  free: true, // the light bar's colour on the water spreads past the hull
  ref: 'art/isles/cutouts/boat-police-day.webp',
  draw(ctx, o) {
    ctx.save();
    try {
      ctx.scale(K, K);
      const L = o.L, t = o.t || 0, chase = o.state === 'chase';
      const b = bob(o, chase ? 0.6 : 1);
      const pitch = (chase ? 0.075 + 0.012 * Math.sin(t * 3.1) : 0) + b.pitch;
      const [kb, kr] = bar(t, chase);
      // colour on the water first, under the hull
      for (const [k, c, x] of [[kb, BLUE, -1.6], [kr, RED, 1.6]]) {
        if (k < 0.1) continue;
        ctx.save(); ctx.translate(x, 1.2); ctx.scale(1, 0.2);
        glow(ctx, 0, 0, 44, c, k * (0.12 + 0.4 * L.night)); ctx.restore();
      }
      floatBody(ctx, o, { key: 'sea.police-boat', box: BOX, pivot: -14, paint: (g, s) => paint(g, s, o) }, { pitch, heave: b.heave });
      // lights ride with the hull
      ctx.save(); ctx.translate(-14, b.heave); ctx.rotate(-pitch); ctx.translate(14, 0);
      lamp(ctx, -1.6, -13.9, BLUE, o, 0.9, kb);
      lamp(ctx, 1.6, -13.9, RED, o, 0.9, kr);
      // spill on the white roof and cabin
      glow(ctx, 0, -12.5, 9, kb > kr ? BLUE : RED, Math.max(kb, kr) * (0.1 + 0.25 * L.night));
      lamp(ctx, 12.5, -7.2, [60, 255, 120], o, 0.35, 0.8 * clamp(L.night * 1.5)); // starboard green
      lamp(ctx, -3.1, -20.4, [255, 250, 240], o, 0.3, 0.9 * clamp(L.night * 1.5)); // masthead
      lamp(ctx, -20.7, -6, [255, 250, 240], o, 0.3, 0.6 * clamp(L.night * 1.5)); // stern
      if (L.night > 0.3) glow(ctx, 5.3, -13.8, 3.5, [255, 250, 230], 0.5 * L.night); // searchlight housing lamp
      ctx.restore();
      waterline(ctx, o, -21, chase ? 12 : 19, { foam: chase ? 0.9 : 0.55, speed: chase ? 1 : 0.2 });
      if (chase) spray(ctx, 14, -0.4, o, { n: 34, power: 1.1, seed: 3, tint: kb > kr ? BLUE : RED });
    } finally { ctx.restore(); }
  },
};
