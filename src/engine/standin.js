// Quiet stand-in silhouettes for asset ids that are not drawn yet (drawAsset returned false). Each is the right size,
// lit by the same light, with no detail to judge: they exist so the layout, the scale and the haze can be judged until
// the asset souls' real drawings replace them with no change here.

import { byId } from '../assets/registry.js';
import { shade, css, mix, scale, glow, cached, windowLights, vgrad } from '../core/paint.js';
import { rng, clamp } from '../core/rng.js';

// [w, h] in world units, anchored at the bottom centre (the guesses; real assets bring their own).
export const SIZES = {
  'city.skyscraper-glass': [64, 230], 'city.skyscraper-deco': [70, 210], 'city.skyscraper-twist': [56, 240],
  'city.office': [80, 130], 'city.residential': [70, 100], 'city.neon-block': [72, 150], 'city.spire': [46, 260],
  'city.tower-siso': [140, 560], 'city.crane': [150, 220], 'city.car': [9, 4], 'city.people': [20, 8], 'city.bridge': [900, 160],
  'islands.siso-home': [460, 280], 'islands.siso-small': [200, 150], 'islands.enemy': [380, 280], 'islands.enemy-small': [180, 140],
  'nature.mountains-alpine': [2400, 420], 'nature.mountains-desert': [2400, 260], 'nature.mountains-volcanic': [2400, 380],
  'nature.mountains-arctic': [2400, 360], 'nature.cloud-bank': [1600, 380],
  'sea.speedboat': [40, 12], 'sea.police-boat': [72, 26], 'sea.smuggler': [52, 13], 'sea.ferry': [170, 52], 'sea.yacht': [96, 34],
  'sea.cargo': [380, 74], 'sea.warship': [270, 70],
  'air.airliner': [120, 34], 'air.jet-siso': [60, 15], 'air.jet-enemy': [60, 15], 'air.drone': [26, 8], 'air.helicopter': [52, 20],
  'air.rocket-ship': [40, 210], 'air.missile': [22, 5],
  'defence.sam-launcher': [30, 16], 'defence.ciws': [18, 16], 'defence.artillery': [36, 16], 'defence.silo': [30, 10],
  'defence.shield-dome': [520, 300],
  'fx.wake': [220, 14], 'fx.trail': [10, 10],
  'space.moon': [520, 520], 'space.moon-city': [360, 90], 'space.palace': [620, 420], 'space.station': [280, 120],
  'space.satellite': [90, 40], 'space.attack-ship': [50, 16],
  'fx.explosion': [140, 140], 'fx.fireball': [90, 90], 'fx.fire': [40, 56], 'fx.smoke': [120, 170], 'fx.debris': [90, 60],
  'fx.flash': [120, 120], 'fx.intercept': [70, 70], 'fx.shield-hit': [140, 140], 'fx.splash': [44, 30], 'fx.tracer': [70, 3],
  'aliens.portal': [260, 260], 'aliens.walker': [36, 60], 'aliens.flyer': [50, 18], 'aliens.craft': [130, 40],
};

export function sizeOf(id) {
  const a = byId.get(id);
  if (a) return [a.w, a.h];
  return SIZES[id] || [60, 60];
}

const family = (id) => id.split('.')[0];

// draw(ctx, id, o): a stand-in for id at the origin, bottom-centre anchored, in the asset's own frame.
export function drawStandin(ctx, id, o) {
  const [w, h] = sizeOf(id);
  const L = o.L;
  const name = id.split('.')[1] || id;
  const f = family(id);
  if (f === 'city' && name !== 'car' && name !== 'people' && name !== 'bridge' && name !== 'crane') return building(ctx, id, w, h, o);
  if (name === 'crane') return crane(ctx, w, h, o);
  if (name === 'bridge') return bridge(ctx, w, h, o);
  if (name === 'car') return car(ctx, w, h, o);
  if (f === 'islands') return island(ctx, id, w, h, o);
  if (name.startsWith('mountains')) return mountains(ctx, id, w, h, o);
  if (name === 'cloud-bank') return cloudBank(ctx, w, h, o);
  if (f === 'sea') return boat(ctx, id, w, h, o);
  if (f === 'air') return aircraft(ctx, id, w, h, o);
  if (id === 'defence.shield-dome') return dome(ctx, w, h, o);
  if (id === 'fx.wake') return wake(ctx, w, h, o);
  if (id === 'fx.trail') return trail(ctx, o);
  if (id === 'space.moon') return moon(ctx, w, h, o);
  if (f === 'space') return spaceThing(ctx, id, w, h, o);
  if (f === 'fx') return fxThing(ctx, name, w, h, o);
  if (f === 'aliens') return alienThing(ctx, name, w, h, o);
  // anything else: a soft shaded block
  ctx.fillStyle = css(shade([120, 124, 132], L, 0));
  ctx.fillRect(-w / 2, -h, w, h);
  return true;
}

// Buildings: a shaded box with a lit face and a shadow face, glass that mirrors the sky, windows at night.
const PAL = {
  'skyscraper-glass': [[150, 170, 190], 0.55], 'skyscraper-deco': [[196, 184, 160], 0.15], 'skyscraper-twist': [[176, 190, 204], 0.5],
  office: [[170, 168, 160], 0.25], residential: [[200, 190, 172], 0.08], 'neon-block': [[96, 92, 104], 0.2], spire: [[190, 196, 206], 0.45],
};
function building(ctx, id, w, h, o) {
  const name = id.split('.')[1];
  const L = o.L;
  if (name === 'tower-siso') return towerSiso(ctx, w, h, o);
  const st = o.state;
  if (st === 'ruin' || st === 'collapse') {
    const keep = st === 'ruin' ? 0.22 : clamp(1 - o.p * 0.85, 0.15, 1);
    h *= keep;
  } else if (st === 'construct') h *= 0.25 + 0.75 * clamp(o.p);
  const key = `standin:${id}:${o.seed}:${Math.round(h)}:${L.q}`;
  const [base, gloss] = PAL[name] || [[160, 160, 160], 0.2];
  const c = cached(key, w + 2, h + 2, o.scale || 1, (g) => {
    const r = rng(o.seed * 31 + 7);
    const lit = o.lit || 1;
    const sideW = w * 0.32;
    // the face toward the light and the face away
    const front = shade(base, L, 0.15, { gloss }), side = shade(base, L, -0.6, { gloss: gloss * 0.6 });
    const litFace = shade(base, L, 0.9, { gloss });
    g.fillStyle = vgrad(g, -h, 0, [[0, scale(litFace, 1.05)], [1, scale(front, 0.82)]]);
    g.fillRect(-w / 2, -h, w, h);
    g.fillStyle = vgrad(g, -h, 0, [[0, side], [1, scale(side, 0.8)]]);
    if (lit > 0) g.fillRect(-w / 2, -h, sideW, h); else g.fillRect(w / 2 - sideW, -h, sideW, h);
    // a crown
    if (name === 'spire' || name === 'skyscraper-deco') {
      g.fillStyle = css(litFace);
      g.beginPath(); g.moveTo(-w * 0.12, -h); g.lineTo(0, -h - h * 0.0); g.lineTo(w * 0.12, -h); g.fill();
    }
    windowLights(g, -w / 2 + w * 0.08, -h + h * 0.06, w * 0.84, h * 0.9, { ...o, seed: o.seed }, {
      cols: Math.max(2, Math.round(w / 9)), rows: Math.max(3, Math.round(h / 7)), gapX: 0.45, gapY: 0.4, facing: 0.2,
      coolShare: name === 'skyscraper-glass' || name === 'spire' ? 0.6 : 0.2,
    });
    // a soft rim of light on the sun side
    const rim = mix(L.key, [255, 255, 255], 0.2);
    g.fillStyle = css(rim, 0.25 * L.keyAmt * (1 - L.night));
    if (lit > 0) g.fillRect(w / 2 - 1.2, -h, 1.2, h); else g.fillRect(-w / 2, -h, 1.2, h);
    void r;
  });
  ctx.drawImage(c, -(w + 2) / 2, -(h + 2) + 1, w + 2, h + 2);
  // neon edges after dark
  if (name === 'neon-block' || name === 'skyscraper-twist' || name === 'skyscraper-glass') {
    const n = L.neon;
    if (n > 0.05) {
      const r = rng(o.seed * 13 + 3);
      const cols = [[255, 60, 170], [60, 220, 255], [170, 90, 255], [255, 140, 60]];
      const nc = cols[Math.floor(r() * cols.length)];
      ctx.fillStyle = css(nc, 0.85 * n);
      ctx.fillRect(-w / 2, -h, 1.4, h);
      ctx.fillRect(w / 2 - 1.4, -h, 1.4, h);
      ctx.fillRect(-w / 2, -h, w, 1.4);
    }
  }
  return true;
}

function towerSiso(ctx, w, h, o) {
  const L = o.L;
  const body = shade([70, 84, 100], L, 0.2, { gloss: 0.6 });
  ctx.fillStyle = vgrad(ctx, -h, 0, [[0, scale(body, 1.25)], [1, scale(body, 0.8)]]);
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, 0); ctx.quadraticCurveTo(-w * 0.08, -h * 0.35, -w * 0.06, -h * 0.82);
  ctx.lineTo(0, -h); ctx.lineTo(w * 0.06, -h * 0.82); ctx.quadraticCurveTo(w * 0.08, -h * 0.35, w * 0.5, 0);
  ctx.closePath(); ctx.fill();
  const crown = [90, 220, 255];
  ctx.fillStyle = css(mix(body, crown, 0.4 + 0.6 * L.neon));
  ctx.fillRect(-w * 0.16, -h * 0.84, w * 0.32, h * 0.035);
  glow(ctx, 0, -h * 0.82, w * 0.5, crown, 0.25 + 0.5 * L.neon);
  return true;
}

function crane(ctx, w, h, o) {
  const c = css(shade([200, 160, 60], o.L, 0.2));
  ctx.fillStyle = c;
  ctx.fillRect(-2, -h, 4, h);
  ctx.fillRect(-w * 0.25, -h, w * 0.75, 3);
  ctx.fillRect(-w * 0.25, -h + 3, 10, 8);
  return true;
}
function bridge(ctx, w, h, o) {
  const L = o.L;
  const c = shade([150, 150, 156], L, 0);
  ctx.fillStyle = css(c);
  ctx.fillRect(-w / 2, -h * 0.28, w, 6);
  for (const x of [-w * 0.25, w * 0.25]) ctx.fillRect(x - 4, -h, 8, h);
  ctx.strokeStyle = css(mix(c, [255, 220, 160], L.windows * 0.8), 0.8);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.28); ctx.quadraticCurveTo(-w * 0.375, -h * 0.4, -w * 0.25, -h);
  ctx.quadraticCurveTo(0, -h * 0.25, w * 0.25, -h); ctx.quadraticCurveTo(w * 0.375, -h * 0.4, w / 2, -h * 0.28);
  ctx.stroke();
  return true;
}
function car(ctx, w, h, o) {
  const L = o.L;
  const r = rng(o.seed);
  ctx.fillStyle = css(shade([[200, 40, 40], [230, 230, 230], [40, 60, 90], [30, 30, 34]][r.int(0, 3)], L, 0.3, { gloss: 0.3 }));
  ctx.fillRect(-w / 2, -h, w, h);
  if (L.windows > 0.15) {
    glow(ctx, w / 2, -h / 2, 6, [255, 240, 200], 0.7 * L.windows);
    glow(ctx, -w / 2, -h / 2, 4, [255, 40, 30], 0.6 * L.windows);
  }
  return true;
}

// Islands: a terraced top and a rock underside that narrows to a root, with booster glows.
function island(ctx, id, w, h, o) {
  const L = o.L;
  const enemy = id.includes('enemy');
  const key = `standin:${id}:${o.seed}:${L.q}`;
  const c = cached(key, w, h, o.scale || 1, (g) => {
    const top = -h * 0.62;
    const rock = shade(enemy ? [90, 70, 64] : [120, 100, 80], L, -0.2);
    const rockLit = shade(enemy ? [110, 84, 74] : [150, 124, 96], L, 0.8);
    g.fillStyle = vgrad(g, top, 0, [[0, rockLit], [0.4, rock], [1, scale(rock, 0.55)]]);
    g.beginPath();
    g.moveTo(-w / 2, top);
    g.bezierCurveTo(-w * 0.42, top + h * 0.25, -w * 0.15, -h * 0.12, 0, 0);
    g.bezierCurveTo(w * 0.15, -h * 0.12, w * 0.42, top + h * 0.25, w / 2, top);
    g.closePath(); g.fill();
    // the top surface
    g.fillStyle = css(shade(enemy ? [100, 82, 76] : [92, 130, 70], L, 0.4));
    g.fillRect(-w / 2, top - 6, w, 8);
    // buildings on top
    const r = rng(o.seed + (enemy ? 99 : 7));
    for (let i = 0; i < 9; i++) {
      const bx = (r() - 0.5) * w * 0.8, bw = 10 + r() * 22, bh = (enemy ? 30 : 14) + r() * (enemy ? 60 : 30);
      g.fillStyle = css(shade(enemy ? [130, 70, 60] : [226, 222, 214], L, r() < 0.5 ? 0.6 : -0.3));
      g.fillRect(bx - bw / 2, top - 4 - bh, bw, bh);
    }
  });
  ctx.drawImage(c, -w / 2, -h, w, h);
  // the boosters
  const bc = enemy ? [255, 110, 50] : [80, 200, 255];
  const boost = o.state === 'boost' ? 1.6 : 1;
  for (const fx of [-0.28, 0, 0.28]) glow(ctx, fx * w, -h * (fx === 0 ? 0.02 : 0.25), w * 0.06 * boost, bc, 0.8);
  return true;
}

// Mountains: three seeded ridgelines stepping back, each paler, falling to the base line at both ends.
const MCOL = {
  'nature.mountains-alpine': [[96, 104, 112], [236, 240, 246]], 'nature.mountains-desert': [[168, 128, 96], null],
  'nature.mountains-volcanic': [[70, 64, 66], null], 'nature.mountains-arctic': [[150, 164, 180], [240, 244, 250]],
};
function mountains(ctx, id, w, h, o) {
  const L = o.L;
  const key = `standin:${id}:${o.seed}:${L.q}`;
  const c = cached(key, w, h, Math.min(o.scale || 1, 0.75), (g) => {
    const [base, snow] = MCOL[id] || [[110, 110, 110], null];
    const r = rng(o.seed * 17 + 5);
    for (let ridge = 0; ridge < 3; ridge++) {
      const amp = h * (1 - ridge * 0.22), pal = 0.35 - ridge * 0.15;
      const col = mix(shade(base, L, 0.1), L.haze, clamp(pal));
      g.beginPath(); g.moveTo(-w / 2, 0);
      const n = 60, ph = r() * 100;
      for (let i = 0; i <= n; i++) {
        const x = -w / 2 + (i / n) * w, u = i / n;
        const env = Math.sin(Math.PI * u) ** 0.6;
        const y = -amp * env * (0.45 + 0.35 * Math.sin(u * 7 + ph) * Math.sin(u * 3.3 + ph * 2) + 0.2 * Math.sin(u * 23 + ph));
        g.lineTo(x, Math.min(0, y));
      }
      g.lineTo(w / 2, 0); g.closePath();
      g.fillStyle = vgrad(g, -amp, 0, [[0, scale(col, 1.08)], [1, scale(col, 0.85)]]);
      g.fill();
      if (snow && ridge < 2) {
        g.save(); g.clip();
        g.fillStyle = css(shade(snow, L, 0.6), 0.8);
        g.fillRect(-w / 2, -amp, w, amp * 0.28);
        g.restore();
      }
    }
  });
  ctx.drawImage(c, -w / 2, -h, w, h);
  return true;
}
function cloudBank(ctx, w, h, o) {
  const L = o.L;
  const key = `standin:cloud:${o.seed}:${L.q}`;
  const c = cached(key, w, h, Math.min(o.scale || 1, 0.5), (g) => {
    const r = rng(o.seed * 5 + 1);
    const lit = mix(shade([250, 250, 252], L, 0.9), L.key, 0.25 * L.golden), dark = shade([176, 184, 200], L, -0.5);
    // many wide, faint puffs, piled higher in the middle: a bank, not cotton balls
    for (let i = 0; i < 70; i++) {
      const u = r() - 0.5;
      const tall = 1 - Math.abs(u) * 1.5;
      const rr = h * (0.1 + r() * 0.22) * (0.5 + tall);
      // every puff stays inside the canvas (a puff cut by its edge left a hard vertical seam in the bank)
      const x = u * Math.max(0, w - 3.9 * rr);
      const y = -rr * 0.55 - r() * h * 0.45 * Math.max(0.2, tall);
      g.save(); g.translate(x, y); g.scale(1.9, 1);
      const gr = g.createRadialGradient(0, -rr * 0.25, 0, 0, 0, rr);
      // the puff fades out in its own lit colour; the underside gradient below does the shading (a darker rim drew a
      // smoky outline round every puff)
      gr.addColorStop(0, css(lit, 0.42)); gr.addColorStop(0.55, css(mix(lit, dark, 0.1), 0.26)); gr.addColorStop(1, css(mix(lit, dark, 0.15), 0));
      g.fillStyle = gr; g.fillRect(-rr, -rr, rr * 2, rr * 2);
      g.restore();
    }
    // the base is flat and grey: shade the underside, then cut it level
    g.globalCompositeOperation = 'source-atop';
    const sh = g.createLinearGradient(0, -h * 0.55, 0, 0);
    sh.addColorStop(0, css(dark, 0)); sh.addColorStop(1, css(dark, 0.75));
    g.fillStyle = sh; g.fillRect(-w / 2, -h, w, h);
    g.globalCompositeOperation = 'destination-in';
    const cut = g.createLinearGradient(0, -h * 0.16, 0, -h * 0.02);
    cut.addColorStop(0, 'rgba(0,0,0,1)'); cut.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = cut; g.fillRect(-w / 2, -h, w, h);
    g.globalCompositeOperation = 'source-over';
  });
  ctx.drawImage(c, -w / 2, -h, w, h);
  return true;
}

// Boats: a hull cut by the water, a cabin, lights after dark.
function boat(ctx, id, w, h, o) {
  const L = o.L;
  const name = id.split('.')[1];
  const hullC = { 'police-boat': [236, 238, 240], smuggler: [40, 42, 46], cargo: [140, 50, 40], warship: [110, 116, 122], ferry: [236, 236, 230] }[name] || [226, 226, 222];
  const hull = shade(hullC, L, 0.3, { gloss: 0.15 });
  ctx.fillStyle = css(hull);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.45); ctx.lineTo(w / 2, -h * 0.5); ctx.lineTo(w * 0.42, 0); ctx.lineTo(-w * 0.46, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = css(scale(hull, 0.6));
  ctx.fillRect(-w / 2, -h * 0.12, w * 0.92, h * 0.12);
  if (name === 'cargo') {
    const r = rng(o.seed + 3);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = css(shade([[180, 60, 40], [40, 90, 150], [200, 160, 50], [60, 120, 80]][r.int(0, 3)], L, 0.4)); ctx.fillRect(-w * 0.38 + i * w * 0.075, -h * 0.85, w * 0.07, h * 0.4); }
  } else {
    ctx.fillStyle = css(shade(name === 'smuggler' ? [60, 62, 66] : [220, 224, 228], L, 0.5));
    ctx.fillRect(-w * 0.2, -h * 0.95, w * 0.36, h * 0.5);
  }
  if (name === 'police-boat') {
    const blue = Math.floor((o.t || 0) * 4) % 2 === 0;
    const c = blue ? [60, 120, 255] : [255, 40, 40];
    ctx.fillStyle = css(c); ctx.fillRect(-w * 0.04, -h * 1.05, w * 0.12, h * 0.1);
    glow(ctx, w * 0.02, -h, w * 0.35, c, 0.7);
  }
  if (L.windows > 0.2) glow(ctx, 0, -h * 0.6, w * 0.3, [255, 210, 150], 0.25 * L.windows);
  return true;
}
function aircraft(ctx, id, w, h, o) {
  const L = o.L;
  const name = id.split('.')[1];
  const col = shade(name === 'jet-enemy' ? [60, 60, 66] : [214, 218, 224], L, 0.4, { gloss: 0.3 });
  ctx.fillStyle = css(col);
  if (name === 'rocket-ship') { ctx.fillRect(-w / 4, -h, w / 2, h); return true; }
  ctx.beginPath();
  ctx.moveTo(w / 2, -h * 0.5); ctx.lineTo(-w / 2, -h * 0.65); ctx.lineTo(-w / 2, -h * 0.35); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w * 0.05, -h * 0.5); ctx.lineTo(-w * 0.25, -h * 0.05); ctx.lineTo(-w * 0.15, -h * 0.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-w * 0.35, -h * 0.55); ctx.lineTo(-w * 0.5, -h); ctx.lineTo(-w * 0.42, -h * 0.55); ctx.fill();
  const ex = name === 'missile' ? [255, 200, 120] : name.startsWith('jet') ? [255, 160, 90] : null;
  if (ex) glow(ctx, -w / 2, -h * 0.5, w * 0.25, ex, 0.9);
  if (name === 'airliner' && Math.floor((o.t || 0) * 1.2) % 2 === 0) glow(ctx, 0, -h * 0.5, 6, [255, 255, 255], 0.9);
  return true;
}
function dome(ctx, w, h, o) {
  const L = o.L;
  const g = ctx.createRadialGradient(0, 0, h * 0.6, 0, 0, h);
  g.addColorStop(0, css([120, 200, 255], 0.03)); g.addColorStop(0.92, css([140, 210, 255], 0.12 + 0.1 * L.night)); g.addColorStop(1, css([180, 230, 255], 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h, 0, Math.PI, 0); ctx.fill();
  return true;
}
function wake(ctx, w, h, o) {
  const L = o.L;
  const g = ctx.createLinearGradient(-w, 0, 0, 0);
  const c = mix([240, 246, 250], L.haze, 0.3);
  g.addColorStop(0, css(c, 0)); g.addColorStop(1, css(c, 0.55 * (1 - 0.6 * L.night)));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-w, -h * 0.2); ctx.lineTo(-w, h * 0.4); ctx.lineTo(0, 1.5); ctx.fill();
  return true;
}
function trail(ctx, o) {
  const pts = o.points || [];
  if (pts.length < 2) return true;
  const L = o.L;
  const c = o.kind === 'enemy' ? [255, 190, 150] : [240, 244, 250];
  for (let i = 1; i < pts.length; i++) {
    const u = i / (pts.length - 1);
    ctx.strokeStyle = css(mix(shade(c, L, 0.4), L.haze, 0.2), 0.5 * u);
    ctx.lineWidth = (o.width || 3) * (1.6 - u);
    ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
  }
  return true;
}
function moon(ctx, w, h, o) {
  const L = o.L;
  const r = w / 2;
  const g = ctx.createRadialGradient(-r * 0.35 * (o.lit || 1) * -1, -r - r * 0.35, r * 0.1, 0, -r, r);
  g.addColorStop(0, css([220, 218, 210])); g.addColorStop(1, css([70, 70, 74]));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, -r, r, 0, Math.PI * 2); ctx.fill();
  void L;
  return true;
}
// Effects: a soft light or a soft cloud of the right size; no detail.
function fxThing(ctx, name, w, h, o) {
  const L = o.L;
  const r = Math.min(w, h) / 2;
  if (name === 'smoke' || name === 'debris') {
    const c = mix(shade([90, 88, 86], L, 0.3), L.haze, 0.2);
    const g = ctx.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, r);
    g.addColorStop(0, css(c, 0.55)); g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    return true;
  }
  if (name === 'tracer') { ctx.fillStyle = css([255, 220, 160], 0.8); ctx.fillRect(-w / 2, -h, w, h); return true; }
  const c = name === 'shield-hit' ? [120, 200, 255] : name === 'splash' ? [235, 242, 248] : [255, 170, 80];
  glow(ctx, 0, -h * 0.5, r * 1.2, c, 0.85);
  return true;
}

// Aliens: a dark body with a faint violet rim.
function alienThing(ctx, name, w, h, o) {
  const L = o.L;
  if (name === 'portal') {
    const g = ctx.createRadialGradient(0, -h / 2, w * 0.1, 0, -h / 2, w / 2);
    g.addColorStop(0, css([20, 6, 40], 0.9)); g.addColorStop(0.8, css([150, 80, 255], 0.5)); g.addColorStop(1, css([150, 80, 255], 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    return true;
  }
  ctx.fillStyle = css(shade([60, 56, 70], L, 0.2));
  ctx.beginPath(); ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
  glow(ctx, 0, -h / 2, Math.max(w, h) * 0.4, [170, 110, 255], 0.25);
  return true;
}

function spaceThing(ctx, id, w, h, o) {
  const L = o.L;
  const name = id.split('.')[1];
  const col = shade(name === 'palace' ? [236, 226, 200] : [200, 204, 210], { ...L, keyAmt: 1, ambient: [40, 44, 60] }, 0.6);
  ctx.fillStyle = css(col);
  if (name === 'palace') {
    ctx.beginPath(); ctx.ellipse(0, -h * 0.45, w / 2, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-w * 0.18, -h * 0.75, w * 0.36, h * 0.32);
    ctx.beginPath(); ctx.moveTo(-w * 0.04, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w * 0.04, -h * 0.75); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w * 0.06, -h * 0.4); ctx.lineTo(0, 0); ctx.lineTo(w * 0.06, -h * 0.4); ctx.fill();
    glow(ctx, 0, -h * 0.5, w * 0.3, [255, 220, 150], 0.25);
  } else if (name === 'moon-city') {
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * w * 0.12, 0, h * (0.3 + 0.2 * ((i + 5) % 3)), Math.PI, 0); ctx.fill(); }
    glow(ctx, 0, -h * 0.3, w * 0.4, [255, 210, 140], 0.3);
  } else {
    ctx.fillRect(-w / 2, -h * 0.6, w, h * 0.2);
    ctx.fillRect(-w * 0.1, -h, w * 0.2, h);
  }
  return true;
}

export const STANDIN_IDS = Object.keys(SIZES);
