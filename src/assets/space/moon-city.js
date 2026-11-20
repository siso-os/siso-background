// A city on the moon (refs/elements/moon-city): geodesic glass domes glowing gold from the life inside, two lit
// towers, a tube habitat, boxy modules, a dish and masts, a landing pad with a lander, rovers, and a ring of amber
// lights around it all, on a patch of grey regolith that feathers out at the edges so it sits on any lunar ground.
// Hard sun from o.lit's side, low: long black shadows, no haze. The body is baked once per seed and light; the lights
// blink and a rover drives the ring road.
import { clamp, rng, css, mix, cached, sun, lc, dotL, cylX, cylY, bloom, nav, frac, fbm, ih, TAU } from './_lib.js';

const W = 320, H = 160, GY = -30; // ground line the buildings stand on
const STEEL = [214, 212, 206], CONC = [176, 172, 166], REG = [178, 176, 172], AMBER = [255, 184, 92], WARM = [255, 206, 130];

function shadow(g, S, x, w, h, y = GY) {
  const dx = -S.side * Math.min(h * 1.42, 112 + S.side * x), dy = h * 0.17;
  const shade = g.createLinearGradient(x, y, x + dx, y + dy);
  shade.addColorStop(0, 'rgba(4,5,8,0.88)');
  shade.addColorStop(0.80, 'rgba(4,5,8,0.74)');
  shade.addColorStop(1, 'rgba(4,5,8,0.23)');
  g.fillStyle = shade;
  g.beginPath();
  g.moveTo(x - w * 0.5, y - 0.7);
  g.lineTo(x + w * 0.5, y - 0.7);
  g.lineTo(x + dx + w * 0.30, y + dy);
  g.lineTo(x + dx, y + dy + 1.4);
  g.lineTo(x + dx - w * 0.32, y + dy);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(2,3,5,0.74)';
  g.beginPath(); g.ellipse(x, y, w * 0.54, 2.15, 0, 0, TAU); g.fill();
}

function ground(g, S, r) {
  // Irregular low ridges behind the colony and an apron that fades into surrounding ground.
  const base = lc(REG, S, 0.52, { fill: 0.35 });
  const land = g.createLinearGradient(0, GY - 25, 0, GY + 27);
  land.addColorStop(0, css(base, 0.26));
  land.addColorStop(0.40, css(base, 0.63));
  land.addColorStop(0.63, css(base, 0.50));
  land.addColorStop(1, css(base, 0));
  g.fillStyle = land;
  g.beginPath(); g.moveTo(-158, GY + 10);
  for (let x = -158; x <= 158; x += 2) {
    const taper = Math.max(0, 1 - (x / 158) ** 6);
    const ridge = fbm(x / 15, 4, 70, 4);
    g.lineTo(x, GY + 9 - taper * (11 + ridge * 22));
  }
  g.ellipse(0, GY + 9, 158, 23, 0, 0, Math.PI); g.closePath(); g.fill();
  // Break up the foreground with raking scree across the ridge, leaving the outer edge transparent.
  for (let i = 0; i < 210; i++) {
    const x = r.range(-151, 151), y = GY + r.range(-12, 22);
    const edge = Math.max(0, 1 - (x / 151) ** 2 - ((y - GY - 4) / 23) ** 2);
    const grain = fbm(x / 8, y / 2, 32, 3);
    const w = r.range(0.6, 5.2);
    g.fillStyle = css(lc(REG, S, grain > 0.52 ? 0.87 : -0.4), edge * (0.10 + Math.abs(grain - 0.5) * 0.72));
    g.fillRect(x - w, y, w, 0.4 + edge * 0.45);
  }
  g.save(); g.translate(0, GY + 10); g.scale(1, 0.18);
  for (let k = 0; k < 17; k++) {
    const R = 20 + r() * 37, x = (r() * 2 - 1) * (156 - R), y = (r() * 2 - 1) * 42;
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, css(lc(REG, S, 0.7 + r() * 0.3), 0.14));
    gr.addColorStop(1, css(base, 0));
    g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
  }
  g.restore();
  // small craters: a shadowed bowl, a lit far rim
  for (let k = 0; k < 9; k++) {
    const x = (r() * 2 - 1) * 140, y = GY + 3 + r() * 16, R = 2 + r() * 7, d = 1 - Math.abs(x) / 160;
    g.fillStyle = css(lc(REG, S, -0.6, { fill: 0.3 }), 0.55 * d);
    g.beginPath(); g.ellipse(x, y, R, R * 0.22, 0, 0, TAU); g.fill();
    g.strokeStyle = css(lc(REG, S, 1), 0.5 * d); g.lineWidth = 0.6;
    g.beginPath(); g.ellipse(x, y, R, R * 0.22, 0, S.side > 0 ? -0.4 : Math.PI - 0.6, S.side > 0 ? 1.4 : Math.PI + 1.0); g.stroke();
  }
  // Larger rock fragments frame the road and cast a short down-sun wedge.
  for (let k = 0; k < 42; k++) {
    const x = r.range(-145, 145), y = GY + r.range(11, 25), w = r.range(0.8, 4.8), h = r.range(0.5, 2.8);
    const alpha = (1 - Math.abs(x) / 160) * (1 - (y - GY - 11) / 17);
    g.fillStyle = css([9, 10, 12], alpha * 0.8);
    g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + w, y);
    g.lineTo(x - S.side * h * 2.8, y + h * 0.6); g.closePath(); g.fill();
    g.fillStyle = css(lc(REG, S, 1), alpha * 0.85);
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + S.side * w, y); g.lineTo(x - S.side * w * 0.18, y); g.closePath(); g.fill();
  }
  // grain and rocks, each with its own black shadow
  for (let k = 0; k < 520; k++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.95, x = Math.cos(a) * 160 * d, y = GY + 4 + Math.sin(a) * 24 * d;
    const s = 0.4 + r() * r() * 2.4, edge = (1 - d) * (0.6 + 0.4 * r());
    g.fillStyle = css(lc(REG, S, -0.5, { fill: 0.5 }), 0.7 * edge);
    g.fillRect(x - S.side * s * 0.6, y, s * 1.6, s * 0.45);
    g.fillStyle = css(lc(mix(REG, [190, 186, 180], r()), S, 0.8), edge);
    g.beginPath(); g.ellipse(x, y - s * 0.25, s * 0.7, s * 0.4, 0, 0, TAU); g.fill();
  }
}

function box(g, S, x, y, w, h, d, base) {
  // a module: front face, a sunlit or shadowed end, a top
  const front = lc(base, S, dotL(S, 0, 0, 1)), top = lc(base, S, dotL(S, 0, -1, 0.2)), end = lc(base, S, dotL(S, S.side, 0, 0));
  g.fillStyle = css(top); g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w, y - h); g.lineTo(x + w + d * 0.6, y - h - d * 0.35); g.lineTo(x + d * 0.6, y - h - d * 0.35); g.closePath(); g.fill();
  g.fillStyle = css(front); g.fillRect(x, y - h, w, h);
  g.fillStyle = css(end); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + d * 0.6, y - d * 0.35); g.lineTo(x + w + d * 0.6, y - h - d * 0.35); g.lineTo(x + w, y - h); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y - 1, w, 1);
}

function windows(g, x, y, w, h, r, lit = 0.6) {
  for (let i = 0; i < w / 3; i++) for (let j = 0; j < h / 3; j++) {
    if (r() > lit) continue;
    g.fillStyle = css(mix(AMBER, WARM, r()), 0.7 + 0.3 * r());
    g.fillRect(x + i * 3 + 0.6, y + j * 3 + 0.8, 1.4, 1.1);
  }
}

function geodome(g, S, x, R, r) {
  const hgt = R * 0.92, y = GY;
  // interior: warm life seen through the glass
  g.save();
  g.beginPath(); g.ellipse(x, y, R, hgt, 0, Math.PI, TAU); g.closePath(); g.clip();
  const gi = g.createRadialGradient(x, y - hgt * 0.15, R * 0.1, x, y - hgt * 0.3, R * 1.1);
  gi.addColorStop(0, 'rgb(213,151,90)'); gi.addColorStop(0.35, 'rgb(119,83,56)'); gi.addColorStop(0.75, 'rgb(70,44,24)'); gi.addColorStop(1, 'rgb(18,14,12)');
  g.fillStyle = gi; g.fillRect(x - R, y - hgt, 2 * R, hgt);
  // the town inside, in three depths: far blocks melt into the warm air of the dome, near ones are dark against it;
  // windows are tiny, so it reads as a lit town behind glass and not as boxes
  for (let layer = 0; layer < 3; layer++) {
    const n = 4 + layer * 2, fade = [0.35, 0.6, 0.9][layer], top = [0.75, 0.55, 0.35][layer];
    for (let k = 0; k < n; k++) {
      const bw = R * (0.1 + 0.16 * r()), bh = hgt * top * (0.4 + 0.6 * r()), bx = x - R * 0.85 + r() * (R * 1.7 - bw);
      const tone = mix([150, 96, 48], [34, 24, 18], layer / 2);
      g.fillStyle = css(tone, fade); g.fillRect(bx, y - bh, bw, bh);
      g.fillStyle = css(mix(tone, [255, 210, 140], 0.35), fade * 0.6); g.fillRect(bx, y - bh, bw, 0.5);
      for (let i = 0; i < bw / 2.2; i++) for (let j = 0; j < bh / 2.4; j++) {
        if (r() > 0.45) continue;
        g.fillStyle = css(mix(AMBER, WARM, r()), (0.5 + 0.5 * r()) * (0.5 + 0.5 * fade));
        g.fillRect(bx + i * 2.2 + 0.5, y - bh + j * 2.4 + 0.7, 0.9, 0.8);
      }
    }
  }
  // a warm floor glow in front of the town
  const gf = g.createLinearGradient(x, y - hgt * 0.35, x, y);
  gf.addColorStop(0, 'rgba(255,190,110,0)'); gf.addColorStop(1, 'rgba(255,190,110,0.35)');
  g.fillStyle = gf; g.fillRect(x - R, y - hgt * 0.35, 2 * R, hgt * 0.35);
  // the glass reflects black sky above, the sun on its lit shoulder
  const gs = g.createLinearGradient(x, y - hgt, x, y);
  gs.addColorStop(0, 'rgba(6,8,14,0.75)'); gs.addColorStop(0.5, 'rgba(6,8,14,0.18)'); gs.addColorStop(1, 'rgba(6,8,14,0)');
  g.fillStyle = gs; g.fillRect(x - R, y - hgt, 2 * R, hgt);
  const hx = x + S.side * R * 0.45, hy = y - hgt * 0.7;
  const gh = g.createRadialGradient(hx, hy, 0, hx, hy, R * 0.5);
  gh.addColorStop(0, css(S.key, (S.key[0] / 270) * 0.23)); gh.addColorStop(1, 'rgba(255,250,236,0)');
  g.fillStyle = gh; g.fillRect(x - R, y - hgt, 2 * R, hgt);
  g.restore();
  // the geodesic frame: latitude rings, meridians and the diagonals between them, lit on the sun side
  g.lineWidth = Math.max(0.25, R / 140);
  const rows = Math.max(3, Math.round(R / 6)), cols = Math.max(8, Math.round(R / 2.8));
  const pt = (u, v) => { const th = (u - 0.5) * Math.PI, ph = v * Math.PI / 2; return [x + Math.sin(th) * Math.cos(ph) * R, y - Math.sin(ph) * hgt, Math.cos(th) * Math.cos(ph)]; };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const u0 = i / cols, u1 = (i + 1) / cols, v0 = j / rows, v1 = (j + 1) / rows;
    const a = pt(u0, v0), b = pt(u1, v0), c = pt(u0 + (j % 2 ? 0.5 : 0) / cols, v1);
    const nx = Math.sin((u0 - 0.5) * Math.PI), d = dotL(S, nx, -v0, a[2]);
    g.strokeStyle = css(lc(STEEL, S, d, { spec: 0.6 }), 0.32 + 0.3 * Math.max(0, d));
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); g.stroke();
  }
  // Glass reflects a narrow arc of vacuum light on the exposed shoulder.
  g.strokeStyle = css(lc(STEEL, S, 0.92, { spec: 0.4 }), 0.75);
  g.lineWidth = 0.75;
  const a0 = S.side > 0 ? 4.74 : 3.26;
  g.beginPath(); g.ellipse(x, y, R, hgt, 0, a0, a0 + 1.29); g.stroke();
  // the concrete ring it sits on
  g.fillStyle = css(lc(CONC, S, 0.3)); g.fillRect(x - R - 1, y - 2.2, 2 * R + 2, 2.6);
  g.fillStyle = css(lc(CONC, S, 0.9)); g.fillRect(x - R - 1, y - 2.2, 2 * R + 2, 0.7);
}

function tower(g, S, x, w, h, r) {
  const y = GY;
  g.fillStyle = cylX(g, x - w / 2, x + w / 2, STEEL, S, { spec: 0.5 });
  g.fillRect(x - w / 2, y - h, w, h);
  // glazed floors, warm
  for (let f = 4; f < h - 6; f += 3.2) {
    if (r() < 0.2) continue;
    const a = 0.55 + 0.45 * r();
    g.fillStyle = css(mix(AMBER, WARM, r()), a);
    g.fillRect(x - w / 2 + w * 0.2, y - f - 1.2, w * 0.6, 1.3);
  }
  // ribs and a cap
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - w / 2 + w * 0.17, y - h, 0.6, h); g.fillRect(x + w / 2 - w * 0.2, y - h, 0.6, h);
  g.fillStyle = cylX(g, x - w * 0.6, x + w * 0.6, STEEL, S, { spec: 0.7 });
  g.beginPath(); g.ellipse(x, y - h, w * 0.6, w * 0.25, 0, 0, TAU); g.fill();
  g.fillRect(x - w * 0.6, y - h - 2, w * 1.2, 2);
  g.fillStyle = css(lc(STEEL, S, 0.4)); g.fillRect(x - 0.4, y - h - 9, 0.8, 7);
}

function tube(g, S, x0, x1, y, d, r) {
  g.fillStyle = cylY(g, y - d, y, STEEL, S, { spec: 0.4, nx: 0 });
  g.fillRect(x0, y - d, x1 - x0, d);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let x = x0 + 6; x < x1; x += 9) g.fillRect(x, y - d, 0.7, d);
  for (let x = x0 + 2; x < x1 - 2; x += 2.6) if (r() < 0.8) { g.fillStyle = css(mix(AMBER, WARM, r()), 0.85); g.fillRect(x, y - d * 0.62, 1.5, d * 0.3); }
}

function dish(g, S, x, h) {
  const y = GY;
  g.fillStyle = css(lc(STEEL, S, 0.2)); g.fillRect(x - 0.6, y - h, 1.2, h);
  g.save(); g.translate(x, y - h - 2); g.rotate(-0.5 * S.side);
  g.fillStyle = cylX(g, -8, 8, STEEL, S, { spec: 0.8 });
  g.beginPath(); g.ellipse(0, 0, 8, 3.2, 0, 0, TAU); g.fill();
  g.strokeStyle = css(lc(STEEL, S, 0.5)); g.lineWidth = 0.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -6); g.stroke();
  g.restore();
}

function lander(g, S, x) {
  const y = GY + 4;
  g.strokeStyle = css(lc(STEEL, S, 0.3)); g.lineWidth = 0.7;
  g.beginPath(); g.moveTo(x - 5, y - 6); g.lineTo(x - 8, y); g.moveTo(x + 5, y - 6); g.lineTo(x + 8, y); g.stroke();
  g.fillStyle = cylX(g, x - 4.5, x + 4.5, [232, 230, 226], S, { spec: 0.8 });
  g.beginPath(); g.moveTo(x - 4.5, y - 5); g.lineTo(x - 4.5, y - 16); g.quadraticCurveTo(x, y - 26, x + 4.5, y - 16); g.lineTo(x + 4.5, y - 5); g.closePath(); g.fill();
  g.fillStyle = 'rgba(10,12,18,0.85)'; g.fillRect(x - 1.8, y - 18, 3.6, 1.4);
}

function body(g, S, seed) {
  const r = rng(seed * 131 + 7);
  ground(g, S, r);
  // shadows first, all on the ground
  shadow(g, S, -20, 80, 40); shadow(g, S, -120, 34, 16); shadow(g, S, 92, 46, 22);
  shadow(g, S, 132, 12, 21, GY + 4); shadow(g, S, 40, 12, 84); shadow(g, S, 20, 10, 58); shadow(g, S, -88, 2, 32); shadow(g, S, -112, 1, 42);
  // ring road and the landing pad
  g.strokeStyle = css(lc(CONC, S, 0.4), 0.55); g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(0, GY + 1, 150, 9, 0, 0, TAU); g.stroke();
  g.fillStyle = css(lc(CONC, S, 0.5)); g.beginPath(); g.ellipse(132, GY + 3, 24, 3.6, 0, 0, TAU); g.fill();
  g.strokeStyle = css(lc([220, 200, 120], S, 0.4), 0.8); g.lineWidth = 0.6; g.beginPath(); g.ellipse(132, GY + 3, 17, 2.4, 0, 0, TAU); g.stroke();
  // back row: masts, dish, towers
  g.fillStyle = css(lc(STEEL, S, 0.2));
  g.fillRect(-112.4, GY - 42, 0.8, 42); g.fillRect(-60.4, GY - 36, 0.8, 36);
  for (let k = 0; k < 6; k++) { g.fillRect(-114, GY - 40 + k * 6, 4, 0.5); }
  dish(g, S, -88, 30);
  tower(g, S, 20, 10, 58, r);
  tower(g, S, 40, 12, 84, r);
  // modules and tubes
  box(g, S, -104, GY, 30, 11, 8, CONC); windows(g, -103, GY - 9, 28, 6, r, 0.5);
  box(g, S, -72, GY, 22, 8, 6, STEEL);
  box(g, S, 54, GY, 22, 13, 8, CONC); windows(g, 55, GY - 11, 20, 8, r, 0.5);
  tube(g, S, 26, 86, GY, 9, r);
  box(g, S, 104, GY, 12, 6, 5, STEEL);
  // the domes
  geodome(g, S, -120, 17, r);
  geodome(g, S, 92, 23, r);
  geodome(g, S, -20, 42, r);
  lander(g, S, 132);
  // rovers parked by the modules
  for (const [x, c] of [[-60, CONC], [-40, STEEL], [70, CONC]]) { box(g, S, x, GY + 3, 7, 3.2, 3, c); }
}

export default {
  id: 'space.moon-city', family: 'space', title: 'Moon city',
  about: 'A lunar city: gold-lit geodesic glass domes, lit towers, a tube habitat, modules, a dish, masts, a landing pad and lander, on a regolith apron that feathers out (so it sits on any lunar ground). Hard low sun from o.lit with long black shadows; blinking masts and a ring of amber lights; a rover drives the ring road.',
  w: W, h: H, states: ['idle', 'night'], loop: 8, once: {}, variants: 3,
  ref: 'refs/elements/moon-city.webp',
  draw(ctx, o) {
    ctx.save();
    const S = sun(o.L, o.lit ?? o.L.side), t = o.t || 0, seed = ((o.seed || 0) % 3 + 3) % 3;
    const dark = o.state === 'night';
    const S2 = dark ? { ...S, key: S.key.map((v) => v * 0.12), q: S.q + '|n' } : S;
    const c = cached(`space.moon-city|${seed}|${S2.q}`, W, H, (o.scale || 1) * (globalThis.devicePixelRatio || 1), (g) => body(g, S2, seed));
    ctx.drawImage(c, -W / 2, -H, W, H);
    // the life inside the domes glows out through the glass
    const gl = dark ? 1 : 0.55;
    bloom(ctx, -20, GY - 14, 70, [255, 170, 80], 0.14 * gl);
    bloom(ctx, -120, GY - 6, 30, [255, 170, 80], 0.13 * gl);
    bloom(ctx, 92, GY - 8, 38, [255, 170, 80], 0.13 * gl);
    // and pools on the regolith in front of them
    ctx.save(); ctx.scale(1, 0.2);
    for (const [x, rr] of [[-20, 80], [-120, 34], [92, 44]]) bloom(ctx, x, (GY + 3) / 0.2, rr, [255, 168, 84], 0.16 * gl);
    ctx.restore();
    // the ring of amber ground lights, a chase running round it
    for (let k = 0; k < 44; k++) {
      const a = (k / 44) * TAU, x = Math.cos(a) * 150, y = GY + 1 + Math.sin(a) * 9;
      const chase = Math.pow(frac(k / 44 - t * 0.25), 18);
      bloom(ctx, x, y, 2.2 + 3 * chase, AMBER, 0.55 + 0.45 * chase);
    }
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; bloom(ctx, 132 + Math.cos(a) * 20, GY + 3 + Math.sin(a) * 3, 2, AMBER, 0.8); }
    // masts and tower tops blink red
    nav(ctx, -112, GY - 43, [255, 60, 40], t, { period: 1.4, r: 2.4 });
    nav(ctx, -60, GY - 37, [255, 60, 40], t, { period: 1.4, phase: 0.5, r: 2.2 });
    nav(ctx, 40, GY - 94, [255, 60, 40], t, { period: 2, phase: 0.2, r: 2.6 });
    nav(ctx, 20, GY - 61, [255, 255, 255], t, { period: 1.1, phase: 0.7, r: 2 });
    // a rover on the ring road, headlights first
    const a = (t / 8) * TAU, rx = Math.cos(a) * 150, ry = GY + 1 + Math.sin(a) * 9, dir = -Math.sin(a) >= 0 ? 1 : -1;
    if (Math.sin(a) > -0.2) {
      ctx.fillStyle = css(lc(STEEL, S2, 0.4)); ctx.fillRect(rx - 3, ry - 3, 6, 2.6);
      bloom(ctx, rx + dir * 3.2, ry - 1.8, 3, [255, 244, 220], 0.9);
    }
    ctx.restore();
  },
};
