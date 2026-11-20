// Debris: concrete lumps (a lit face and a shadow face), glass shards that flash as they turn to the light, and bent
// steel, each dragging dust. burst throws them out once and lets them land and settle as rubble; fall rains them down
// through the box on a loop (under a falling island or a collapsing tower).
import { rng, clamp, smooth, frac, ih, smokeTint, puffTinted, put, ballistic, css, mix, shade, lod, TAU } from './_lib.js';

const CONC = [150, 146, 140], STEEL = [70, 66, 64];

function chunk(ctx, o, kind, x, y, sz, ang, seed, a) {
  const L = o.L, lit = o.lit || 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = a;
  if (kind === 'glass') {
    const face = Math.cos(ang * 2 + seed); // turning: flashes when it faces the light
    const sky = mix(L.sky.horizon, L.sky.top, 0.4);
    ctx.fillStyle = css(mix(shade([90, 110, 120], L, 0), mix(sky, L.key, 0.5), clamp(face * face * face)), 0.85);
    ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.2); ctx.lineTo(sz * 0.9, -sz * 0.5); ctx.lineTo(sz * 0.3, sz * 0.4); ctx.closePath(); ctx.fill();
  } else if (kind === 'steel') {
    ctx.strokeStyle = css(shade(STEEL, L, 0.2)); ctx.lineWidth = Math.max(0.5, sz * 0.25);
    ctx.beginPath(); ctx.moveTo(-sz * 1.4, 0); ctx.lineTo(0, sz * 0.2); ctx.lineTo(sz * 1.2, -sz * 0.3); ctx.stroke();
  } else {
    const r = rng(seed);
    const pts = [];
    for (let i = 0; i < 6; i++) { const t2 = (i / 6) * TAU + r() * 0.6; const rr = sz * (0.6 + r() * 0.5); pts.push([Math.cos(t2) * rr, Math.sin(t2) * rr]); }
    ctx.fillStyle = css(shade(CONC, L, -0.6));
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
    // the face turned to the light (rotates with the chunk, so it flickers as it tumbles)
    const f = Math.cos(ang - (lit > 0 ? 0 : Math.PI));
    ctx.fillStyle = css(shade(CONC, L, clamp(f, -1, 1)));
    ctx.beginPath(); ctx.moveTo(pts[5][0], pts[5][1]); ctx.lineTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[1][0] * 0.2, pts[1][1] * 0.2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function burst(ctx, o, { p = 0.5, seed = 0, R = 1, cy = -20 } = {}) {
  const T = p * 2.6, r = rng(seed * 41 + 9), q = lod(o), L = o.L;
  const dust = smokeTint(L, 'dust', o.lit || 1);
  const fade = 1 - smooth(0.8, 1, p);
  // a dust cloud where it came from
  for (let k = 0; k < 15; k++) {
    const ang = -Math.PI * (0.1 + r() * 0.8), d = (30 + r() * 30) * R * (1 - Math.exp(-2.5 * T));
    put(ctx, puffTinted(k + seed, dust), Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.6 - T * 8, R * (11 + 34 * Math.min(1, T)), 0.42 * smooth(0, 0.15, T) * (1 - smooth(1.2, 2.6, T)));
  }
  const n = Math.round(26 * q);
  for (let k = 0; k < n; k++) {
    const kind = k % 5 === 0 ? 'glass' : k % 7 === 0 ? 'steel' : 'conc';
    const ang = -Math.PI * (0.08 + r() * 0.84), sp = (70 + r() * 150) * R, sz = (1.4 + r() * 3.6) * R, spin = (r() - 0.5) * 16;
    const [dx, dy] = ballistic(Math.cos(ang) * sp, Math.sin(ang) * sp, T, 0.5, 320);
    let x = dx, y = cy + dy, rot = spin * T;
    // land and settle as rubble on the ground line
    if (y > -sz * 0.5) {
      let tl = T; // find when it landed (a few halvings is enough)
      let lo = 0, hi = T;
      for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; const [, yy] = ballistic(Math.cos(ang) * sp, Math.sin(ang) * sp, m, 0.5, 320); if (cy + yy > -sz * 0.5) hi = m; else lo = m; }
      tl = hi; [x] = ballistic(Math.cos(ang) * sp, Math.sin(ang) * sp, tl, 0.5, 320); y = -sz * 0.5; rot = spin * tl;
    } else {
      for (let j = 7; j >= 1 && kind === 'conc'; j--) {
        const age = j * 0.043;
        if (age >= T) continue;
        const [bx, by] = ballistic(Math.cos(ang) * sp, Math.sin(ang) * sp, T - age, 0.5, 320);
        const drift = (ih(k, 3, seed) - 0.29) * 86 * age * age;
        put(ctx, puffTinted(k + j, dust), bx + drift, cy + by - 13 * age, sz * (0.85 + j * 0.43), 0.57 * (1 - j / 8) * fade);
      }
    }
    chunk(ctx, o, kind, x, y, sz, rot, seed * 100 + k, fade);
  }
  ctx.globalAlpha = 1;
}

export function rain(ctx, o, { seed = 0, H = 220, W = 160, n = 22 } = {}) {
  const t = o.t || 0, L = o.L, q = lod(o), dust = smokeTint(L, 'dust', o.lit || 1);
  n = Math.round(n * q);
  for (let k = 0; k < n; k++) {
    const a = frac(t / 2.4 + ih(k, 1, seed));
    const sz = 1.4 + ih(k, 2, seed) * 4;
    const x0 = (ih(k, 3, seed) - 0.5) * W, drift = (ih(k, 4, seed) - 0.5) * 30;
    const y = -H + a * a * (H + 10), x = x0 + drift * a;
    const al = smooth(0, 0.08, a) * (1 - smooth(0.92, 1, a));
    const kind = k % 5 === 0 ? 'glass' : k % 7 === 0 ? 'steel' : 'conc';
    if (kind === 'conc') for (let j = 6; j >= 1; j--) {
      const aj = Math.max(0, a - j * 0.018), curl = Math.sin(a * 7 + k) * j * j * 0.12;
      put(ctx, puffTinted(k + j, dust), x0 + drift * aj + curl, -H + aj * aj * (H + 10), sz * (0.95 + j * 0.48), 0.58 * al * (1 - j / 7));
    }
    chunk(ctx, o, kind, x, y, sz, (ih(k, 5, seed) - 0.5) * 20 * a, seed * 100 + k, al);
  }
  ctx.globalAlpha = 1;
}

export default {
  id: 'fx.debris', family: 'fx', title: 'Debris',
  about: 'Concrete, glass and steel with dust trails. burst throws them out once over 2.6 s and lets them land as rubble; fall rains them through the box on a loop. o.size scales burst (default 1).',
  w: 256, h: 256, states: ['burst', 'fall'], loop: 2.4, once: { burst: 2.6 }, variants: 4, free: true,
  ref: 'art/isles/fx/city-dust.webp',
  draw(ctx, o) {
    ctx.save();
    if (o.state === 'fall') rain(ctx, o, { seed: o.seed || 0 });
    else burst(ctx, o, { p: clamp(o.p ?? 0.5), seed: o.seed || 0, R: o.size ?? 1 });
    ctx.restore();
  },
};
