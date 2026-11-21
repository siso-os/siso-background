// The SISO tower: a slim dark-glass shaft on four swept white legs, a crown drum with SISO glowing in it, twin needles
// above. shield pulses blue up the spine into the crown; barrage opens the launch ports in turn; hit sparks and flickers.
import { cached, css, mix, scale, shade, glow, rimColour, glassColour, floorLights, clamp, rng, smokeColumn, withBloom, nightAir, crownGlow, dusk } from './_lib.js';

const W = 96, H = 290, SHAFT = 15, CROWN_Y = -196, CROWN_H = 16, CROWN_W = 44;
const CYAN = [80, 220, 255], BLUE = [70, 150, 255];
const PORTS = [[-1, -96], [1, -112], [-1, -128], [1, -144], [-1, -160], [1, -176]];

function legs(g, o, front) { // swept legs from a wide foot to the shaft
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  for (const s of front ? [-1, 1] : [-1, 1]) {
    const foot = front ? 38 : 26, top = front ? -104 : -120, inner = SHAFT / 2 - (front ? 0 : 2);
    const facing = s * lit * (front ? 0.7 : 0.3);
    const base = front ? [228, 230, 234] : [176, 180, 188];
    const gr = g.createLinearGradient(s * foot, 0, s * inner, top);
    gr.addColorStop(0, css(shade(base, L, facing - 0.2, { gloss: 0.4 }))); gr.addColorStop(1, css(shade(base, L, facing + 0.3, { gloss: 0.4 })));
    g.fillStyle = gr; g.beginPath();
    g.moveTo(s * foot, 0); g.quadraticCurveTo(s * (inner + 4), -18, s * inner, top);
    g.lineTo(s * (inner - 3), top + 6); g.quadraticCurveTo(s * (inner - 2), -14, s * (foot - 9), 0); g.closePath(); g.fill();
    g.strokeStyle = css(rimColour(L), (0.3 + 0.5 * L.golden) * (s === lit ? 1 : 0.25)); g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(s * foot, 0); g.quadraticCurveTo(s * (inner + 4), -18, s * inner, top); g.stroke();
  }
}

function body(g, o) {
  const L = o.L, lit = o.lit >= 0 ? 1 : -1;
  legs(g, o, false);
  // the shaft: dark glass, floors, a few lit
  const sx = -SHAFT / 2;
  const gr = g.createLinearGradient(sx, 0, -sx, 0);
  const dark = mix(scale(glassColour(L, 0.7), 0.45), [20, 30, 44], 0.5);
  const a = shade(dark, L, -0.3, { gloss: 0.7 }), b = shade(dark, L, 0.6, { gloss: 0.8 });
  gr.addColorStop(0, css(lit > 0 ? a : b)); gr.addColorStop(0.5, css(mix(a, b, 0.4))); gr.addColorStop(1, css(lit > 0 ? b : a));
  g.fillStyle = gr; g.fillRect(sx, CROWN_Y, SHAFT, -CROWN_Y);
  floorLights(g, sx + 1, CROWN_Y + 2, SHAFT - 2, -CROWN_Y - 4, o, { cols: 4, rows: 52, gapX: 0.25, gapY: 0.3, seed: 777, cool: 0.7, amt: 0.8 });
  g.fillStyle = css([10, 16, 24], 0.35); for (let y = CROWN_Y + 3.6; y < 0; y += 3.6) g.fillRect(sx, y, SHAFT, 0.35);
  g.fillStyle = css(rimColour(L), 0.3 + 0.5 * L.golden); g.fillRect(lit > 0 ? -sx - 0.6 : sx, CROWN_Y, 0.6, -CROWN_Y);
  // the spine: a thin light line up the middle
  g.fillStyle = css(CYAN, 0.25 + 0.5 * L.night); g.fillRect(-0.4, CROWN_Y, 0.8, -CROWN_Y);
  // launch port hatches
  for (const [s, y] of PORTS) { g.fillStyle = css(shade([60, 66, 76], L, 0.2)); g.fillRect(s > 0 ? 1.6 : -5.6, y - 1.6, 4, 3.2); g.fillStyle = css(shade([140, 150, 160], L, 0.6)); g.fillRect(s > 0 ? 1.6 : -5.6, y - 1.6, 4, 0.4); }
  legs(g, o, true);
  // the crown drum
  const cy = CROWN_Y - CROWN_H, cg = g.createLinearGradient(-CROWN_W / 2, 0, CROWN_W / 2, 0);
  const ca = shade([30, 60, 70], L, -0.3, { gloss: 0.6 }), cb = shade([30, 60, 70], L, 0.6, { gloss: 0.8 });
  cg.addColorStop(0, css(lit > 0 ? ca : cb)); cg.addColorStop(0.5, css(mix(ca, cb, 0.5))); cg.addColorStop(1, css(lit > 0 ? cb : ca));
  g.fillStyle = cg; g.beginPath(); g.moveTo(-CROWN_W / 2 + 3, CROWN_Y); g.lineTo(-CROWN_W / 2, cy + 3); g.lineTo(-CROWN_W / 2 + 2, cy); g.lineTo(CROWN_W / 2 - 2, cy); g.lineTo(CROWN_W / 2, cy + 3); g.lineTo(CROWN_W / 2 - 3, CROWN_Y); g.closePath(); g.fill();
  g.fillStyle = css(mix(CYAN, [255, 255, 255], 0.3), 0.45 + 0.5 * L.windows); g.fillRect(-CROWN_W / 2 + 1, cy + 0.5, CROWN_W - 2, 0.8); g.fillRect(-CROWN_W / 2 + 3, CROWN_Y - 1.2, CROWN_W - 6, 0.8);
  // the needles
  for (const [x, hgt, wd] of [[-7, 62, 2.4], [7, 76, 2.4], [0, 34, 1.4]]) {
    const ng = g.createLinearGradient(x - wd, 0, x + wd, 0);
    ng.addColorStop(0, css(shade([200, 204, 212], L, -0.5 * lit, { gloss: 0.6 }))); ng.addColorStop(1, css(shade([200, 204, 212], L, 0.8 * lit, { gloss: 0.6 })));
    g.fillStyle = ng; g.beginPath(); g.moveTo(x - wd, cy); g.lineTo(x, cy - hgt); g.lineTo(x + wd, cy); g.fill();
  }
}

function crownText(ctx, o, amt) { // SISO glowing in the drum
  const cy = CROWN_Y - CROWN_H / 2;
  glow(ctx, 0, cy, CROWN_W * 0.7, CYAN, 0.35 * amt);
  ctx.save();
  ctx.font = '700 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = css(CYAN, 0.5 * amt); ctx.fillText('SISO', 0, cy + 0.6);
  ctx.fillStyle = css(mix(CYAN, [255, 255, 255], 0.65), 0.95 * Math.min(1, amt)); ctx.fillText('SISO', 0, cy + 0.4);
  ctx.restore();
}

export default {
  id: 'city.tower-siso',
  family: 'city',
  title: 'SISO tower',
  about: 'The SISO tower, 290 tall: dark glass shaft on four swept legs, a crown drum with SISO glowing, twin needles. shield pulses blue up the spine, barrage fires the ports in turn, hit sparks and flickers.',
  w: W, h: H,
  states: ['idle', 'shield', 'barrage', 'hit'],
  loop: 4, variants: 1,
  ref: 'refs/options/option-c-painted.webp',
  slots: { crown: [0, CROWN_Y - CROWN_H / 2], tip: [7, CROWN_Y - CROWN_H - 76], ports: PORTS.map(([s, y]) => [s * 4, y]) },
  draw(ctx, o) {
    const L = o.L, t = o.t || 0, st = o.state || 'idle', lit = o.lit >= 0 ? 1 : -1;
    const own = o.body !== false;   // false: the painted tower is the body; draw only the effects over it
    if (own) {
      nightAir(ctx, o, -CROWN_W / 2, CROWN_W / 2, CROWN_Y - CROWN_H, mix(CYAN, [255, 220, 170], 0.3), 1.2);
      ctx.drawImage(cached(`city.tower-siso|${L.q}|${lit}`, W, H, o.scale || 1, (g) => withBloom(g, dusk(L), () => body(g, o))), -W / 2, -H, W, H);
      crownGlow(ctx, o, 0, CROWN_Y - CROWN_H / 2, CROWN_W * 0.8, CYAN, 0.9);
    }
    let crown = 0.55 + 0.45 * L.windows;
    if (st === 'shield') { // a pulse of blue running up the spine into the crown, the crown breathing
      const ph = (t * 0.9) % 1, y = -ph * -CROWN_Y;
      glow(ctx, 0, y, 14, BLUE, 0.9);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createLinearGradient(0, y + 40, 0, y); sg.addColorStop(0, css(BLUE, 0)); sg.addColorStop(1, css(mix(BLUE, [255, 255, 255], 0.5), 0.9));
      ctx.fillStyle = sg; ctx.fillRect(-1.2, y, 2.4, 40); ctx.restore();
      const br = 0.5 + 0.5 * Math.sin(t * 6.28);
      crown = 1 + 0.6 * br;
      glow(ctx, 0, CROWN_Y - CROWN_H / 2, 60 + 20 * br, BLUE, 0.25 + 0.2 * br);
    }
    if (st === 'hit') crown *= (Math.sin(t * 37) > -0.3 ? 1 : 0.15);
    if (own) crownText(ctx, o, crown);
    if (st === 'barrage') PORTS.forEach(([s, y], i) => { // hatches open, a flash, a missile leaving on a trail
      const ph = (t * 1.4 + i / PORTS.length) % 1, x = s > 0 ? 3.6 : -3.6;
      ctx.fillStyle = css([255, 150, 70], 0.8); ctx.fillRect(x - 2, y - 1.2, 4, 2.4);
      const fl = Math.exp(-ph * 12);
      glow(ctx, x + s * 3, y, 14 * (0.5 + fl), [255, 210, 150], 0.9 * fl);
      if (ph < 0.5) {
        const d = ph * 120, mx = x + s * d * 0.5, my = y - d;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const tg = ctx.createLinearGradient(x, y, mx, my); tg.addColorStop(0, 'rgba(255,170,90,0)'); tg.addColorStop(1, 'rgba(255,230,190,0.85)');
        ctx.strokeStyle = tg; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mx, my); ctx.stroke(); ctx.restore();
        glow(ctx, mx, my, 5, [255, 240, 210], 0.95);
      }
    });
    if (st === 'hit') { // sparks off the shaft, a burn, smoke
      const r = rng(Math.floor(t * 8)), hx = 3 * lit, hy = -150;
      glow(ctx, hx, hy, 24, [255, 140, 60], 0.5 + 0.3 * Math.sin(t * 20));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,220,150,0.9)'; ctx.lineWidth = 0.5;
      for (let i = 0; i < 9; i++) { const a = r() * 6.28, l = 4 + r() * 12; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * l, hy + Math.sin(a) * l + l * 0.3); ctx.stroke(); }
      ctx.restore();
      smokeColumn(ctx, hx, hy, 5, t, 3, o, { amt: 0.7, rise: 60, drift: 18, n: 6, dark: 0.7 });
    }
    // beacons on the needle tips
    if (((t * 0.7) % 1) < 0.18) { glow(ctx, 7, CROWN_Y - CROWN_H - 76, 5, [255, 40, 30], 0.95); glow(ctx, -7, CROWN_Y - CROWN_H - 62, 4, [255, 40, 30], 0.9); }
  },
};
