// Three sample assets for the asset page, written to CONTRACT.md section 4 exactly, so the page can be built and
// tested before the real families land. Shown only with assets.html?fixture=1; never registered in the scene.
// One of each kind the page must handle: a building with once states, a small looping boat, and a free-form trail.

import { rng, clamp, lerp, ease, smooth } from '../core/rng.js';
import { css, mix, scale, shade, glow, vgrad, windowLights, glassColour, rimColour } from '../core/paint.js';

const TAU = Math.PI * 2;

// fixture.building: a glass tower. construct rises floor by floor under a work light; collapse leans and sinks into dust.
function towerBody(ctx, o, W, H) {
  const L = o.L, lit = o.lit || 1;
  const steel = [[118, 134, 152], [132, 128, 120], [104, 122, 140]][(o.seed || 0) % 3];
  const split = W * 0.18; // the corner: front face left of it, side face right of it
  const front = shade(steel, L, lit < 0 ? 0.85 : -0.15, { gloss: 0.35 });
  const side = shade(steel, L, lit > 0 ? 0.85 : -0.7, { gloss: 0.2 });
  const top = -H;
  ctx.fillStyle = vgrad(ctx, top, 0, [[0, mix(front, glassColour(L, 0.9), 0.35)], [1, scale(front, 0.78)]]);
  ctx.fillRect(-W / 2, top, W / 2 + split, H);
  ctx.fillStyle = vgrad(ctx, top, 0, [[0, mix(side, glassColour(L, 0.9), 0.2)], [1, scale(side, 0.7)]]);
  ctx.fillRect(split, top + 4, W / 2 - split, H - 4);
  windowLights(ctx, -W / 2 + 4, top + 14, W / 2 + split - 8, H - 34, o, { cols: 7, rows: 26, seed: (o.seed || 0) * 3 + 1, facing: lit < 0 ? 1 : 0 });
  windowLights(ctx, split + 3, top + 18, W / 2 - split - 6, H - 38, o, { cols: 3, rows: 26, seed: (o.seed || 0) * 3 + 2, facing: lit > 0 ? 1 : -1 });
  // floor bands and the plinth
  ctx.fillStyle = css(scale(front, 0.55), 0.35);
  for (let y = top + 70; y < -24; y += 70) ctx.fillRect(-W / 2, y, W, 2.5);
  ctx.fillStyle = css(shade([70, 72, 78], L, 0));
  ctx.fillRect(-W / 2 - 4, -16, W + 8, 16);
  // crown and mast
  ctx.fillStyle = css(scale(front, 0.9));
  ctx.fillRect(-W * 0.3, top - 10, W * 0.5, 10);
  ctx.fillStyle = css(scale(side, 0.9));
  ctx.fillRect(W * 0.2, top - 8, W * 0.06, 8);
  ctx.fillStyle = css(shade([180, 184, 190], L, 0.3));
  ctx.fillRect(-1.5, top - 34, 3, 26);
  // a rim of light on the edge that faces the key light
  const rim = rimColour(L);
  ctx.fillStyle = css(rim, 0.25 + 0.45 * L.keyAmt * (1 - L.keyHeight * 0.5));
  ctx.fillRect(lit > 0 ? W / 2 - 2 : -W / 2, top + 4, 2, H - 20);
}

const building = {
  id: 'fixture.building',
  family: 'fixture',
  title: 'Sample tower',
  about: 'A glass tower that stands, builds itself floor by floor, and collapses into dust; the page\'s own test asset.',
  w: 120, h: 340,
  states: ['idle', 'construct', 'collapse'],
  loop: 6,
  once: { construct: 5, collapse: 4 },
  variants: 3,
  ref: 'art/isles/cutouts/bld-glass-day.webp',
  draw(ctx, o) {
    const v = (o.seed || 0) % 3;
    const W = [96, 108, 88][v], H = [318, 286, 302][v];
    const L = o.L, t = o.t || 0, p = clamp(o.p || 0);
    const state = this.states.includes(o.state) ? o.state : 'idle';
    ctx.save();
    if (state === 'construct') {
      const k = ease.inOut(p), hh = Math.max(0, H * k);
      ctx.save();
      ctx.beginPath(); ctx.rect(-W / 2 - 6, -hh, W + 12, hh + 1); ctx.clip();
      towerBody(ctx, o, W, H);
      ctx.restore();
      if (p < 1) { // scaffold above the working floor and a work light
        ctx.strokeStyle = css(shade([210, 170, 90], L, 0.4), 0.85);
        ctx.lineWidth = 1.5;
        const y0 = -hh, sh = Math.min(26, H - hh);
        for (let x = -W / 2; x <= W / 2 + 0.1; x += W / 6) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 - sh); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-W / 2, y0 - sh); ctx.lineTo(W / 2, y0 - sh); ctx.stroke();
        const spark = 0.6 + 0.4 * Math.sin(t * 23);
        glow(ctx, W * 0.2 * Math.sin(t * 1.7), y0 - 4, 16, [255, 214, 150], (0.45 + 0.5 * L.night) * spark);
      }
    } else if (state === 'collapse') {
      const lean = ease.in(clamp(p * 1.15)) * 0.32 * (o.lit || 1);
      const sink = ease.in(clamp((p - 0.15) / 0.85)) * H * 0.72;
      ctx.save();
      ctx.beginPath(); ctx.rect(-W, -H - 60, W * 2, H + 60); ctx.clip(); // it sinks below the ground line, unseen
      ctx.translate(0, sink); ctx.rotate(lean);
      ctx.globalAlpha = 1 - smooth(0.82, 1, p);
      towerBody(ctx, o, W, H);
      ctx.restore();
      const r = rng((o.seed || 0) + 99), dust = shade([176, 164, 150], L, 0.2);
      for (let i = 0; i < 9; i++) { // dust rolling out from the base
        const dx = (r() - 0.5) * W * 1.1, rr = 14 + r() * 26;
        const a = smooth(0.05, 0.4, p) * (1 - smooth(0.8, 1, p)) * (0.35 + 0.3 * r());
        const g = ctx.createRadialGradient(dx * (0.6 + p), -rr * 0.7, 0, dx * (0.6 + p), -rr * 0.7, rr * (0.7 + p));
        g.addColorStop(0, css(dust, a)); g.addColorStop(1, css(dust, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-W, -rr * 2.4, W * 2, rr * 2.4);
      }
    } else {
      towerBody(ctx, o, W, H);
      const blink = (Math.sin((t / 6) * TAU * 6) > 0.6 ? 1 : 0.15) * (0.25 + 0.75 * L.night);
      glow(ctx, 0, -H - 34, 10, [255, 70, 56], blink);
    }
    ctx.restore();
  },
};

// fixture.boat: a police launch that rides the swell; blue lights and a wake.
const boat = {
  id: 'fixture.boat',
  family: 'fixture',
  title: 'Sample launch',
  about: 'A small patrol launch riding the swell, nav lights and a blue beacon after dark; variant 1 is the orange rescue livery.',
  w: 60, h: 22,
  states: ['idle'],
  loop: 4,
  once: {},
  variants: 2,
  ref: 'art/isles/cutouts/boat-police-day.webp',
  draw(ctx, o) {
    const L = o.L, t = o.t || 0, lit = o.lit || 1;
    const bob = Math.sin((t / 4) * TAU) * 0.9, roll = Math.sin((t / 4) * TAU + 1) * 0.025;
    const stripe = (o.seed || 0) % 2 ? [236, 120, 40] : [40, 84, 196];
    ctx.save();
    // wake: foam trailing from the stern along the water line
    const foam = shade([236, 240, 244], L, 0.2);
    ctx.fillStyle = vgrad(ctx, -2, 0, [[0, foam, 0], [1, foam, 0.55]]);
    ctx.beginPath(); ctx.moveTo(-28, -1.5); ctx.quadraticCurveTo(-29, 0, -30, 0); ctx.lineTo(10, 0); ctx.quadraticCurveTo(-10, -2.2, -28, -1.5); ctx.fill();
    ctx.translate(0, bob - 1); ctx.rotate(roll);
    // hull
    ctx.fillStyle = vgrad(ctx, -9, 0, [[0, shade([232, 234, 236], L, lit > 0 ? 0.6 : -0.2)], [1, shade([150, 156, 164], L, -0.5)]]);
    ctx.beginPath(); ctx.moveTo(-26, -9); ctx.lineTo(24, -9); ctx.quadraticCurveTo(29, -8.5, 30, -7); ctx.quadraticCurveTo(22, 0, 12, 0); ctx.lineTo(-24, 0); ctx.quadraticCurveTo(-26, -4, -26, -9); ctx.fill();
    ctx.fillStyle = css(shade(stripe, L, 0.3));
    ctx.fillRect(-25, -6, 47, 2.2);
    // cabin
    ctx.fillStyle = css(shade([214, 218, 222], L, lit > 0 ? 0.7 : -0.1));
    ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(-10, -17); ctx.lineTo(6, -17); ctx.lineTo(11, -9); ctx.fill();
    ctx.fillStyle = css(mix(glassColour(L, 0.7), [255, 214, 160], clamp(L.windows * 1.2)), 0.95);
    ctx.fillRect(-8.5, -15.5, 6, 4); ctx.fillRect(-1, -15.5, 6, 4);
    // mast and lights
    ctx.fillStyle = css(shade([60, 64, 70], L, 0)); ctx.fillRect(-3.5, -22, 1.2, 5);
    const n = 0.25 + 0.75 * L.night;
    glow(ctx, -2.9, -22, 5, [80, 140, 255], n * (Math.sin(t * 9) > 0 ? 1 : 0.15));
    glow(ctx, 27, -7.5, 4, [80, 255, 140], n * 0.8);
    glow(ctx, -25, -7.5, 4, [255, 60, 50], n * 0.8);
    ctx.restore();
  },
};

// fixture.trail: free-form; reads o.points ([x, y] pairs in its own frame, oldest first, the head last).
const DEFAULT_POINTS = [[-92, -6], [-62, -34], [-24, -64], [22, -90], [86, -110]];
const trail = {
  id: 'fixture.trail',
  family: 'fixture',
  title: 'Sample trail',
  about: 'A missile\'s smoke trail with a burning head along o.points (oldest first; default a climbing arc); free-form, it may leave its box.',
  w: 200, h: 120,
  free: true,
  states: ['idle'],
  loop: 3,
  once: {},
  variants: 1,
  ref: null,
  draw(ctx, o) {
    const L = o.L, t = o.t || 0;
    const pts = Array.isArray(o.points) && o.points.length > 1 ? o.points : DEFAULT_POINTS;
    // lengths along the path, so puffs space evenly
    const seg = [0];
    for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = seg[seg.length - 1] || 1;
    const at = (d) => {
      let i = 1; while (i < seg.length - 1 && seg[i] < d) i++;
      const f = clamp((d - seg[i - 1]) / ((seg[i] - seg[i - 1]) || 1));
      return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
    };
    const smoke = shade([214, 214, 218], L, 0.3);
    const r = rng((o.seed || 0) + 7);
    ctx.save();
    const n = 34, drift = (t / 3) % 1;
    for (let k = 0; k < n; k++) {
      const u = (k + drift) / n; // 0 at the tail, 1 at the head
      const [x, y] = at(u * total);
      const age = 1 - u, rr = 3 + age * 13 + r() * 2;
      const wob = Math.sin(k * 1.7 + t * 1.3) * age * 3;
      const g = ctx.createRadialGradient(x + wob, y - age * 6, 0, x + wob, y - age * 6, rr);
      const a = (0.1 + 0.32 * u) * smooth(0, 0.12, u);
      g.addColorStop(0, css(smoke, a)); g.addColorStop(1, css(smoke, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x + wob - rr, y - age * 6 - rr, rr * 2, rr * 2);
    }
    const [hx, hy] = pts[pts.length - 1];
    const flick = 0.85 + 0.15 * Math.sin(t * 31);
    glow(ctx, hx, hy, 22 * flick, [255, 150, 70], 0.55 + 0.35 * L.night);
    glow(ctx, hx, hy, 6, [255, 240, 210], 0.95);
    ctx.restore();
  },
};

export { building, boat, trail };
export const FIXTURE_FILE = 'src/gallery/fixture.js';
export default [building, boat, trail];
