// A walker: the jellyfish from the portal grown legs. A translucent bell the size of a house rides on four long, thin,
// wet-black legs with the knees high, like a harvestman, picking its way along; glowing joints, a cyan core and green
// organs inside the bell, frilled arms and fine tendrils hanging under it. Faces right. It lives in our air, so its
// skin takes the hour's light; its own light reads mostly at night.
// idle: shifts its weight, the bell breathes. walk: a slow diagonal gait (the engine moves it). die (p): a jolt and a
// flare, the legs give, the bell falls and slumps, glowing fluid spills, the light gutters out.
import { clamp, lerp, smooth, ease, css, mix, shade, bloom, ih, TAU, CYAN, GREEN, VIOLET, SKIN, glowAmt, knee, limb, skin, bell, tentacle, vein } from './_lib.js';

const W = 160, H = 160, BY = -96, A = 64, B = 140, PERIOD = 1.5, STRIDE = 30, LIFT = 14;
// hip x, foot home x, far side, gait phase
const LEGS = [
  { hx: -8, home: -58, far: true, ph: 0.53 },
  { hx: 8, home: 48, far: true, ph: 0.02 },
  { hx: -10, home: -48, far: false, ph: 0.0 },
  { hx: 10, home: 56, far: false, ph: 0.5 },
];

function foot(leg, st, t, die) {
  if (st === 'walk') {
    const c = ((t / PERIOD + leg.ph) % 1 + 1) % 1;
    if (c < 0.62) return [leg.home + STRIDE * (0.5 - c / 0.62), 0];
    const u = (c - 0.62) / 0.38;
    return [leg.home + STRIDE * (-0.5 + ease(u)), -LIFT * Math.sin(Math.PI * u)];
  }
  const shift = st === 'idle' ? Math.sin(t * 0.7 + leg.ph * 9) * 1.2 : 0;
  return [leg.home * (1 + 0.55 * die) + shift, 0];
}

function drawLeg(ctx, L, hip, k, f, far, ga, lit) {
  const base = far ? shade(SKIN, L, -0.4) : shade(SKIN, L, 0.25);
  const style = css(far ? mix(base, L.haze, 0.12) : base);
  const thigh = skin(ctx, k[0] + lit * 2.4, k[1] - 1, k[0] - lit * 2.4, k[1] + 1, L, SKIN, far ? 0.4 : 0.75);
  const pad = far ? 2.4 : 3.8;
  limb(ctx, hip[0], hip[1], lerp(hip[0], k[0], 0.39), lerp(hip[1], k[1], 0.39), pad * 2.2, pad, thigh);
  limb(ctx, hip[0], hip[1], k[0], k[1], far ? 3.6 : 5.3, far ? 2.2 : 3.4, thigh);
  limb(ctx, k[0], k[1], f[0], f[1], far ? 2.2 : 2.8, 0.9, style);
  // a wet highlight on the lit side
  if (!far) {
    ctx.strokeStyle = css(shade([214, 232, 240], L, 1), 0.2 + 0.4 * L.keyAmt); ctx.lineWidth = 0.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hip[0] + lit * 1.1, hip[1] - 0.6); ctx.lineTo(k[0] + lit * 0.9, k[1] - 0.8); ctx.stroke();
    // Reflected light from the knee fades along the wet shin.
    const glint = ctx.createLinearGradient(k[0], k[1], f[0], f[1]);
    glint.addColorStop(0, css([182, 154, 224], 0.34 * Math.min(1, ga)));
    glint.addColorStop(0.52, css([138, 167, 207], 0.28));
    glint.addColorStop(1, css([138, 167, 207], 0.02));
    ctx.strokeStyle = glint; ctx.lineWidth = 0.95;
    ctx.beginPath(); ctx.moveTo(k[0] + lit * 0.9, k[1]); ctx.lineTo(f[0] + lit * 0.4, f[1] - 2); ctx.stroke();
  }
  // toes
  ctx.strokeStyle = style; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.lineTo(f[0] - 3.5, f[1] + 0.6); ctx.moveTo(f[0], f[1]); ctx.lineTo(f[0] + 3.5, f[1] + 0.6); ctx.stroke();
  // the knee: a swollen joint with light inside, and a glowing line down the shin
  ctx.fillStyle = style; ctx.beginPath(); ctx.arc(k[0], k[1], far ? 2.4 : 3.1, 0, TAU); ctx.fill();
  const gk = ga * (far ? 0.55 : 1);
  bloom(ctx, k[0], k[1], 9, far ? GREEN : VIOLET, 0.56 * gk); bloom(ctx, k[0], k[1], 2.4, [220, 255, 255], 0.8 * gk);
  vein(ctx, [[k[0], k[1]], [lerp(k[0], f[0], 0.35), lerp(k[1], f[1], 0.35)]], CYAN, 0.6, 0.35 * gk);
  bloom(ctx, hip[0], hip[1], 5, GREEN, 0.4 * gk);
}

export default {
  id: 'aliens.walker', family: 'aliens', title: 'Walker',
  about: 'A translucent jellyfish bell the size of a house on four long thin wet-black legs, knees high like a harvestman; glowing joints, cyan core, green organs, frilled arms and tendrils under the bell. idle: shifts and breathes; walk: slow diagonal gait (the engine moves it); die p: jolt, legs give, bell falls and slumps, glowing fluid spills, light gutters out.',
  w: W, h: H, states: ['idle', 'walk', 'die'], loop: 6, once: { die: 2.6 }, variants: 1,
  ref: 'refs/elements/portal-aliens.webp',
  draw(ctx, o) {
    ctx.save();
    const L = o.L, t = o.t || 0, st = o.state || 'idle', lit = (o.lit ?? L.side) < 0 ? -1 : 1, p = clamp(o.p ?? 0.5);
    const dying = st === 'die';
    // collapse k: 0 standing .. 1 down
    const k = dying ? Math.pow(smooth(0.08, 0.55, p), 1.6) : 0;
    let ga = glowAmt(L);
    if (dying) {
      const fl = 0.55 + 0.45 * ih(Math.floor(t * 22), 3, 1);
      ga *= p < 0.08 ? 1 + 10 * p : (1 - smooth(0.12, 0.92, p)) * fl * 1.8;
    }
    const bob = st === 'walk' ? Math.sin((t / PERIOD) * TAU * 2) * 2.5 : st === 'idle' ? Math.sin(t * 1.1) * 2 : 0;
    const jolt = dying ? -8 * Math.sin(Math.PI * clamp(p / 0.12)) : 0;
    const bx = (st === 'idle' ? Math.sin(t * 0.8) * 1.5 : 0) + (dying ? 6 * k : 0);
    const by = lerp(BY + bob, -14, k) + jolt;
    const breathe = st === 'die' ? 0 : Math.sin(t * 2.1) * 0.05;
    const bw = 42 * (1 + breathe + 0.3 * k), bh = 36 * (1 - breathe - 0.5 * k);
    const feet = LEGS.map((g) => foot(g, st, t, k));
    const hips = LEGS.map((g) => [bx + g.hx, by - 4 + (g.far ? -2 : 0)]);
    const knees = LEGS.map((g, i) => knee(hips[i][0], hips[i][1], feet[i][0], feet[i][1], A, B, g.home > 0 ? 1 : -1));
    // far legs, behind everything
    LEGS.forEach((g, i) => g.far && drawLeg(ctx, L, hips[i], knees[i], feet[i], true, ga, lit));
    // under the bell: frilled arms and fine tendrils, slack as it falls
    const hang = 1 - 0.75 * k;
    for (let i = 0; i < 7; i++) {
      const x = bx + (i - 3) * bw * 0.22, len = (i % 2 ? 58 : 34) * hang;
      tentacle(ctx, L, x, by + 1, len, t, { seed: i, sway: 0.8, drift: dying ? 0.3 : st === 'walk' ? -0.25 : 0, w: i % 2 ? 0.5 : 1.3, c: i % 3 ? CYAN : GREEN, ga: ga * 0.8, n: 10, slack: k });
    }
    // a dense body inside the bell (gut and muscle), so the bell holds its shape against a bright sky and not only
    // at night; the jelly is drawn over it
    const mg = ctx.createRadialGradient(bx + lit * bw * 0.15, by - bh * 0.6, 1, bx, by - bh * 0.4, bw * 0.8);
    mg.addColorStop(0, css(mix(shade([84, 110, 118], L, 0.7), GREEN, 0.23 * Math.min(1, ga)), 0.75 * (1 - 0.3 * k)));
    mg.addColorStop(0.65, css(shade([30, 44, 52], L, -0.1), 0.55 * (1 - 0.3 * k)));
    mg.addColorStop(1, css(shade([30, 44, 52], L, -0.1), 0));
    ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(bx, by - bh * 0.42, bw * 0.8, bh * 0.62, 0, 0, TAU); ctx.fill();
    bloom(ctx, bx - lit * bw * 0.38, by - bh * 0.15, bw * 0.68, VIOLET, 0.24 * ga);
    bell(ctx, L, bx, by, bw, bh, t, { ga, lit, a: 1 - 0.25 * k });
    // near legs over the bell's skirt
    LEGS.forEach((g, i) => !g.far && drawLeg(ctx, L, hips[i], knees[i], feet[i], false, ga, lit));
    // dying: glowing fluid thrown out and falling, a pool of light where it lies
    if (dying && p > 0.04) {
      const T = (p - 0.04) * 2.6;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 22; i++) {
        const a = -Math.PI * (0.1 + 0.8 * ih(i, 1, 7)), sp = 30 + 60 * ih(i, 2, 7);
        const x = bx + Math.cos(a) * sp * T, y = Math.min(0, BY + 10 + Math.sin(a) * sp * T + 0.5 * 160 * T * T);
        const al = (1 - smooth(0.5, 1, p)) * (y >= -0.5 ? 0.5 : 0.9);
        ctx.fillStyle = css(i % 4 === 0 ? VIOLET : i % 3 ? GREEN : CYAN, al);
        ctx.beginPath(); ctx.ellipse(x, y, 0.65 + ih(i, 5, 7) * 0.9, y === 0 ? 0.45 : 1.65, a * 0.4, 0, TAU); ctx.fill();
        bloom(ctx, x, y, 4, i % 3 ? GREEN : CYAN, al * 0.4);
      }
      ctx.globalCompositeOperation = 'source-over';
      bloom(ctx, bx, -2, 40 * smooth(0.3, 0.8, p), GREEN, 0.3 * (1 - smooth(0.7, 1, p)) * (0.4 + 0.6 * L.night));
    }
    ctx.restore();
  },
};
