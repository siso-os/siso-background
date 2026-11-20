// The portal (refs/elements/portal-aliens): a ring of crackling filaments, green and violet, tangled like lightning
// caught in a torus, with white-hot knots where they cross. Inside, a dark tunnel goes back further than the sky, and
// specks of light come up it toward us: the aliens arriving. It hangs a little above the sea and the sea under it
// carries its reflection in broken green and violet glints (o.reflect === false turns that off, e.g. over land).
// open (p): a point of light, then the ring spins up and widens; hold: it crackles; close (p): it tightens, burns
// brighter and implodes to a flash and a thin shock ring.
// The filaments are baked into six frames once per seed; a frame costs two image draws and a few dozen dots.
import { rng, clamp, smooth, ease, css, mix, bloom, ih, frac, TAU, CYAN } from './_lib.js';

// the portal's own colours, more saturated than the animals' so they survive being stacked additively
const GREEN = [58, 247, 129], VIOLET = [166, 66, 255];

const W = 440, H = 512, CY = -250, R = 190, E = R * 1.5, FR = 6;
const HOT = [236, 255, 240];

const FRAMES = new Map();
function frame(seed, k, px) {
  const key = `${seed}|${k}|${px}`;
  if (FRAMES.has(key)) return FRAMES.get(key);
  const N = Math.ceil(E * 2 * px), c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.scale(px, px); g.translate(E, E);
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  const r = rng(seed * 977 + k * 131 + 5);
  // a soft torus of light under the filaments
  const tg = g.createRadialGradient(0, 0, R * 0.82, 0, 0, R * 1.18);
  tg.addColorStop(0, css(VIOLET, 0)); tg.addColorStop(0.35, css(VIOLET, 0.1)); tg.addColorStop(0.5, css(GREEN, 0.16));
  tg.addColorStop(0.65, css(VIOLET, 0.1)); tg.addColorStop(1, css(VIOLET, 0));
  g.fillStyle = tg; g.beginPath(); g.arc(0, 0, R * 1.2, 0, TAU); g.fill();
  const strand = (pts, col, wide) => {
    // ends fade: draw in short runs whose alpha follows sin(pi u)
    const n = pts.length - 1, run = 3;
    for (const [lw, al, cc] of [[wide * 6, 0.06, col], [wide * 2.2, 0.15, col], [wide * 0.7, 0.5, mix(col, HOT, 0.18)]]) {
      g.lineWidth = lw;
      for (let i = 0; i < n; i += run) {
        const u = (i + run / 2) / n, a = al * Math.pow(Math.sin(Math.PI * clamp(u)), 0.6);
        g.strokeStyle = css(cc, a); g.beginPath(); g.moveTo(pts[i][0], pts[i][1]);
        for (let j = i + 1; j <= Math.min(n, i + run); j++) g.lineTo(pts[j][0], pts[j][1]);
        g.stroke();
      }
    }
  };
  for (let s = 0; s < 82; s++) {
    const a0 = r() * TAU, span = 0.29 + r() * 1.38, n = Math.max(6, Math.ceil((span * R) / 5));
    const green = Math.sin((a0 + span * 0.5) * 3) > r.range(-0.34, 0.34);
    const col = green ? GREEN : VIOLET;
    const band = green ? 0.09 : 0.2, off = (r() - 0.5) * band * 2, wob = (0.3 + r()) * band, fq = 2 + r() * 6, ph = r() * TAU;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = a0 + span * u;
      const rr = R * (1 + off * Math.sin(u * Math.PI) + wob * Math.sin(u * fq + ph) * 0.5) + (r() - 0.5) * R * 0.045;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    strand(pts, col, 0.5 + r() * 0.7);
    // forks: short jagged branches off the strand, in or out
    for (let f = 0; f < 2; f++) {
      if (r() < 0.45) continue;
      const i0 = Math.floor(r() * n), [x0, y0] = pts[i0], ang = Math.atan2(y0, x0) + (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 1.2;
      const len = R * (0.04 + r() * 0.1), br = [[x0, y0]];
      for (let j = 1; j <= 4; j++) br.push([x0 + Math.cos(ang) * len * j / 4 + (r() - 0.5) * 4, y0 + Math.sin(ang) * len * j / 4 + (r() - 0.5) * 4]);
      strand(br, col, 0.4);
    }
  }
  // Resolved strikes fork into the air and across the mouth of the tunnel.
  for (let i = 0; i < 13; i++) {
    const a = (i + r() * 0.8) * TAU / 13;
    const x = Math.cos(a) * R * r.range(0.92, 1.07), y = Math.sin(a) * R * r.range(0.92, 1.07);
    const colour = Math.sin(a * 4) < 0 ? VIOLET : GREEN;
    const flash = r.range(0.18, 0.65);
    const direction = a + (i % 3 ? 0 : Math.PI) + r.range(-0.67, 0.67);
    const trace = (x0, y0, angle, length, width, forks) => {
      const dx = Math.cos(angle), dy = Math.sin(angle), n = 8;
      const pts = [[x0, y0]];
      for (let j = 1; j <= n; j++) {
        const ripple = r.range(-1, 1) * length * 0.14;
        pts.push([x0 + dx * j / n * length - dy * ripple, y0 + dy * j / n * length + dx * ripple]);
      }
      strand(pts, colour, width);
      if (forks) for (const k of [2, 5]) {
        trace(...pts[k], angle + (k === 2 ? 0.64 : -0.81), length * r.range(0.32, 0.56), width * 0.56, false);
      }
    };
    trace(x, y, direction, R * r.range(0.13, 0.44), 0.82 + flash, true);
    bloom(g, x, y, 24 + flash * 36, colour, flash * 0.36);
  }
  // white-hot knots
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, rr = R * (1 + (r() - 0.5) * 0.12), x = Math.cos(a) * rr, y = Math.sin(a) * rr, s = 6 + r() * 12;
    const kg = g.createRadialGradient(x, y, 0, x, y, s);
    kg.addColorStop(0, css(HOT, 0.85)); kg.addColorStop(0.25, css(r() < 0.5 ? GREEN : VIOLET, 0.35)); kg.addColorStop(1, css(GREEN, 0));
    g.fillStyle = kg; g.fillRect(x - s, y - s, 2 * s, 2 * s);
  }
  if (FRAMES.size > 40) FRAMES.delete(FRAMES.keys().next().value);
  FRAMES.set(key, c);
  return c;
}

// The distant well and dust lanes are baked once per variant and slowly rotate behind the live arrivals.
const STARFIELDS = new Map();
function starfield(seed) {
  if (STARFIELDS.has(seed)) return STARFIELDS.get(seed);
  const size = 320, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d'), r = rng(seed * 911 + 6);
  g.translate(size / 2, size / 2);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2600; i++) {
    const depth = r(), rad = 5 + depth ** 1.38 * 145;
    const lane = r.int(0, 2), angle = lane * TAU / 3 + depth * 5.5 + r.range(-0.45, 0.45);
    const x = Math.cos(angle) * rad, y = Math.sin(angle) * rad * 0.91;
    const colour = lane % 2 ? VIOLET : GREEN;
    const outer = smooth(0.93, 0.69, depth), thicken = Math.sin(Math.PI * depth) ** 0.5;
    const dust = i % 8 !== 0, aperture = (dust ? 0.54 : 0.85) + r() ** 2 * (dust ? 2.2 : 1.6);
    g.fillStyle = css(mix(colour, HOT, dust ? 0.04 : 0.66), outer * (dust ? 0.17 * thicken : 0.14 + 0.49 * r()));
    g.fillRect(x, y, aperture, aperture * 0.77);
  }
  STARFIELDS.set(seed, c);
  return c;
}

function tunnelStars(ctx, Rs, vx, vy, t, D, seed) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, Rs * 0.97, Rs * 0.97, 0, 0, TAU); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(vx, vy);
  ctx.rotate(t * 0.15);
  const size = Rs * 2.15;
  ctx.globalAlpha = D;
  ctx.drawImage(starfield(seed), -size / 2, -size / 2, size, size);
  ctx.restore();
}

// the reflection on the sea: broken horizontal glints under the ring, shimmering
function reflection(ctx, t, I, s, seed) {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const rw = R * s * 0.7;
  ctx.save(); ctx.scale(1, 260 / rw);
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
  cg.addColorStop(0, css(GREEN, 0.16 * I)); cg.addColorStop(0.45, css(VIOLET, 0.08 * I)); cg.addColorStop(1, css(VIOLET, 0));
  ctx.fillStyle = cg; ctx.fillRect(-rw, 0, 2 * rw, rw);
  ctx.restore();
  // glints: rows closer together far off, further apart near; each glint reflects a bright part of the ring, so they
  // gather in three lanes, under its green left side, under its bottom, under its violet right side
  const P = [[new Path2D(), new Path2D(), new Path2D()], [new Path2D(), new Path2D(), new Path2D()]], ring = R * s;
  for (let row = 0; row < 64; row++) {
    const y = 2 + row * row * 0.07 + row * 0.5, b = row < 20 ? 0 : row < 42 ? 1 : 2, slot = Math.floor(t * 6 + ih(row, 9, seed) * 6);
    for (let k = 0; k < 7; k++) {
      const h0 = ih(row * 11 + k, slot, seed), h1 = ih(row * 11 + k, slot + 17, seed + 1);
      if (h0 < 0.22) continue;
      const lane = k % 3, x = (lane - 1) * ring * 0.8 + (h1 - 0.5) * ring * (lane === 1 ? 0.7 : 0.32) + Math.sin(t * 1.3 + row * 0.7) * 2.5;
      const len = (1.5 + h0 * 6) * (0.7 + row / 50), c = lane === 0 ? 0 : lane === 2 ? 1 : h1 < 0.5 ? 0 : 1;
      P[c][b].moveTo(x - len, y); P[c][b].quadraticCurveTo(x, y - 0.7, x + len, y);
    }
  }
  [GREEN, VIOLET].forEach((col, c) => P[c].forEach((path, b) => {
    ctx.strokeStyle = css(mix(col, HOT, 0.15), (0.6 - b * 0.15) * I); ctx.lineWidth = 1 + b * 0.5; ctx.stroke(path);
  }));
  ctx.globalCompositeOperation = op;
}

export default {
  id: 'aliens.portal', family: 'aliens', title: 'Portal',
  about: 'A ring of crackling green and violet filaments with white-hot knots, a dark tunnel inside with specks of light coming up it, hanging above the sea with its reflection in broken glints (o.reflect=false over land). open p: spins up from a point; hold: crackles; close p: tightens, burns brighter, implodes to a flash and a shock ring.',
  w: W, h: H, states: ['open', 'hold', 'close'], loop: 8, once: { open: 2.5, close: 1.8 }, variants: 3, free: true,
  ref: 'refs/elements/portal-aliens.webp',
  draw(ctx, o) {
    ctx.save();
    const L = o.L, t = o.t || 0, p = clamp(o.p ?? 0.5), seed = ((o.seed || 0) % 3 + 3) % 3, st = o.state || 'hold';
    // how open (s: ring scale), how bright (I), how deep the tunnel (D), how many arrivals (A)
    let s = 1, I = 1 + 0.12 * Math.sin(t * 2.3) + 0.06 * Math.sin(t * 7.1), D = 1, A = 1, spin = 0;
    if (st === 'open') {
      s = ease(smooth(0.06, 0.8, p)); I = smooth(0, 0.12, p) * (1 + 0.6 * (1 - smooth(0.55, 1, p)));
      D = smooth(0.16, 0.69, p); A = smooth(0.40, 0.87, p); spin = (1 - p) * (1 - p) * 6;
    } else if (st === 'close') {
      s = 1 - ease(smooth(0.05, 0.8, p)); I = 1 + 1.1 * smooth(0.2, 0.8, p); D = 1 - smooth(0.36, 0.78, p); A = 1 - smooth(0, 0.3, p); spin = -p * p * 5;
    }
    const night = 0.6 + 0.4 * L.night, px = clamp(Math.round((o.scale || 1) * (globalThis.devicePixelRatio || 1) * 2) / 2, 0.5, 1.5);
    if (o.reflect !== false && s > 0.02) reflection(ctx, t, I * night * Math.min(1, s * 1.5), Math.max(0.3, s), seed);
    ctx.translate(0, CY);
    ctx.scale(0.93, 1);
    // a point of light where it is born or dies
    if (st === 'open' && p < 0.35) { const k = smooth(0, 0.08, p) * (1 - smooth(0.12, 0.35, p)); bloom(ctx, 0, 0, 60 + 120 * p, HOT, k); bloom(ctx, 0, 0, 18, [255, 255, 255], k); }
    if (st === 'close' && p > 0.72) {
      const q = (p - 0.72) / 0.28, k = q < 0.12 ? q / 0.12 : Math.exp(-(q - 0.12) * 6);
      bloom(ctx, 0, 0, 160 * (0.6 + q), HOT, k); bloom(ctx, 0, 0, 40, [255, 255, 255], k);
      ctx.strokeStyle = css(mix(GREEN, HOT, 0.5), 0.5 * (1 - q)); ctx.lineWidth = 2.5 * (1 - q) + 0.5;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.4 * q, 0, TAU); ctx.stroke();
    }
    if (s > 0.01) {
      const Rs = R * s;
      // the air it tears is darkened, a bruise of violet under the light, so the filaments keep their colour even
      // against a bright noon sky (additive light on white only makes white)
      const day = 1 - L.night, bruise = ctx.createRadialGradient(0, 0, Rs * 0.78, 0, 0, Rs * 1.3);
      bruise.addColorStop(0, 'rgba(30,10,50,0)'); bruise.addColorStop(0.35, `rgba(30,10,50,${0.58 * day * Math.min(1, I)})`);
      bruise.addColorStop(0.55, `rgba(24,16,48,${0.32 * day * Math.min(1, I)})`); bruise.addColorStop(1, 'rgba(24,16,48,0)');
      ctx.fillStyle = bruise; ctx.beginPath(); ctx.arc(0, 0, Rs * 1.3, 0, TAU); ctx.fill();
      // light it throws on the sky around it
      bloom(ctx, -Rs * 0.66, Rs * 0.36, Rs * 1.2, GREEN, 0.28 * I * night);
      bloom(ctx, Rs * 0.63, -Rs * 0.26, Rs * 1.19, VIOLET, 0.34 * I * night);
      // the tunnel: darker than any sky, the vanishing point a little up and left
      if (D > 0.01) {
        const vx = -Rs * 0.14, vy = -Rs * 0.17;
        const tg = ctx.createRadialGradient(vx, vy, 0, 0, 0, Rs * 1.02);
        tg.addColorStop(0, `rgba(2,1,6,${0.97 * D})`); tg.addColorStop(0.55, `rgba(8,4,18,${0.93 * D})`);
        tg.addColorStop(0.86, `rgba(20,10,40,${0.78 * D})`); tg.addColorStop(1, 'rgba(20,10,40,0)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(0, 0, Rs * 1.02, 0, TAU); ctx.fill();
        tunnelStars(ctx, Rs, vx, vy, t, D, seed);
        // arrivals: specks coming up the tunnel, growing as they near
        if (A > 0.01) {
          ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
          for (let i = 0; i < 46; i++) {
            const z = frac(t * (0.12 + 0.1 * ih(i, 1, seed)) + ih(i, 2, seed)), a = ih(i, 3, seed) * TAU + z * 0.83 + t * 0.095, rad = Rs * 0.85 * Math.pow(z, 1.6) * (0.3 + 0.7 * ih(i, 4, seed));
            const x = vx * (1 - z) + Math.cos(a) * rad, y = vy * (1 - z) + Math.sin(a) * rad * 0.9, sz = 0.6 + 2.6 * z * z;
            const al = A * D * (i % 3 ? 0.45 : 0.9) * smooth(0, 0.3, z) * (1 - smooth(0.88, 1, z)), tl = 0.04 + 0.1 * z;
            ctx.strokeStyle = css(i % 5 ? CYAN : [220, 240, 255], al); ctx.lineWidth = sz * 0.54;
            ctx.beginPath(); ctx.moveTo(x + (vx - x) * tl, y + (vy - y) * tl); ctx.lineTo(x, y); ctx.stroke();
            if (z > 0.5) bloom(ctx, x, y, sz * 3, CYAN, al * 0.5);
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // the ring: two baked frames cross-faded, each turning slowly
      const fi = t * 9, k0 = ((Math.floor(fi) % FR) + FR) % FR, k1 = (k0 + 1) % FR, wv = frac(fi), extent = E * s;
      ctx.globalCompositeOperation = 'lighter';
      for (const [k, a] of [[k0, 1 - wv], [k1, wv]]) {
        ctx.save();
        ctx.rotate(k * 1.1 + t * 0.07 + spin);
        ctx.globalAlpha = clamp(a * Math.min(1, I) * (0.85 + 0.15 * L.night));
        ctx.drawImage(frame(seed, k, px), -extent, -extent, 2 * extent, 2 * extent);
        if (I > 1) { ctx.globalAlpha = clamp((I - 1) * a * 0.36); ctx.drawImage(frame(seed, k, px), -extent, -extent, 2 * extent, 2 * extent); }
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      // knots that flare and move
      const slot = Math.floor(t * 5);
      for (let i = 0; i < 5; i++) {
        const a = ih(i, slot, seed) * TAU, rr = Rs * (1 + (ih(i, slot + 9, seed) - 0.5) * 0.1), fl = Math.sin(Math.PI * frac(t * 5));
        bloom(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 10 + 14 * fl, i % 2 ? VIOLET : GREEN, 0.7 * fl * Math.min(1.5, I));
        bloom(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 3 + 3 * fl, HOT, 0.9 * fl * Math.min(1, I));
      }
      // motes thrown off the ring, drifting out and fading
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 28; i++) {
        const life = frac(t * 0.35 + ih(i, 5, seed)), a = ih(i, 6, seed) * TAU + life * 0.6, rr = Rs * (1 + 0.45 * life);
        ctx.fillStyle = css(i % 3 ? GREEN : VIOLET, 0.7 * (1 - life) * Math.min(1, I));
        ctx.fillRect(Math.cos(a) * rr - 0.9, Math.sin(a) * rr - 0.9, 1.8, 1.8);
      }
    }
    ctx.restore();
  },
};
