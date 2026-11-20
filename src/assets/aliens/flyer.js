// A flyer (refs/elements/portal-aliens: the swarm of small pale things): part manta, part squid. A translucent
// white mantle with one blue light for an eye at the front, two membrane wings that row the air, glowing veins in
// them, two long fine tails streaming behind with specks of light. Faces right. They come out of the portal in
// swarms; o.seed varies the flap so a swarm does not beat in step.
// idle: hangs in the air, slow wingbeats. fly: fast beats, pitched forward, tails stretched. die (p): the wings
// crumple, the light flickers out, it tumbles and falls, leaking light.
import { clamp, smooth, css, mix, shade, bloom, ih, TAU, CYAN, GREEN, VIOLET, glowAmt } from './_lib.js';

const W = 64, H = 40, CY = -20;
const EYE = [80, 180, 255];

function wing(ctx, L, tipX, tipY, near, ga, alpha, lit) {
  const root = near ? 7 : 5, shoulder = near ? 3 : 18;
  const PALE = [234, 232, 216];
  const tint = near ? GREEN : VIOLET;
  const pale = mix(shade(PALE, L, near ? 0.49 : 0.75), PALE, near ? 0.20 : 0.27);
  const g = ctx.createLinearGradient(root, 0, tipX, tipY);
  g.addColorStop(0, css(mix(pale, tint, 0.16 * ga), 0.94 * alpha));
  g.addColorStop(0.27, css(pale, 0.75 * alpha));
  g.addColorStop(0.76, css(mix(pale, tint, 0.25), 0.61 * alpha));
  g.addColorStop(1, css(mix(pale, [255, 251, 233], 0.38), 0.84 * alpha));
  const path = new Path2D();
  path.moveTo(root, near ? 2 : -2);
  path.bezierCurveTo(shoulder, tipY * 0.38, tipX * 0.49 + 1, tipY * 0.59, tipX, tipY);
  path.bezierCurveTo(tipX * 0.73, tipY * 0.69, tipX * 0.52 - 4, tipY * 0.39, -10, near ? 2 : -3);
  path.quadraticCurveTo(1, 3, root, near ? 2 : -2);
  ctx.fillStyle = g; ctx.fill(path);
  ctx.save(); ctx.clip(path);
  ctx.strokeStyle = css(mix(pale, tint, 0.55), 0.53 * alpha);
  ctx.lineWidth = 0.42;
  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const u = i / 5;
    ctx.moveTo(root - u * 19, 1);
    ctx.quadraticCurveTo(tipX * 0.35 - 2 * u, tipY * (1 - u * 0.53), tipX - u * 4, tipY);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = css([244, 247, 231], (lit * tipX > 0 ? 0.51 : 0.26) * alpha);
  ctx.lineWidth = 0.53; ctx.beginPath();
  ctx.moveTo(root, near ? 2 : -2);
  ctx.bezierCurveTo(shoulder, tipY * 0.38, tipX * 0.49 + 1, tipY * 0.59, tipX, tipY); ctx.stroke();
  bloom(ctx, 3, near ? 4 : -3, 7, tint, 0.29 * ga * alpha);
}

export default {
  id: 'aliens.flyer', family: 'aliens', title: 'Flyer',
  about: 'A small pale manta-squid: translucent mantle, one blue eye-light, membrane wings with glowing veins, two long fine tails with specks of light. Faces right. idle: hangs, slow wingbeats; fly: fast beats, pitched forward; die p: wings crumple, light flickers out, it tumbles and falls leaking light. o.seed desynchronises a swarm.',
  w: W, h: H, states: ['idle', 'fly', 'die'], loop: 2.2, once: { die: 2.2 }, variants: 6, free: true,
  ref: 'refs/elements/portal-aliens.webp',
  draw(ctx, o) {
    ctx.save();
    const L = o.L, t = o.t || 0, st = o.state || 'fly', seed = o.seed || 0, p = clamp(o.p ?? 0.5), lit = o.lit ?? L.side;
    const dying = st === 'die', ph0 = ih(seed, 1, 5) * TAU;
    let ga = glowAmt(L), a = 1;
    const per = st === 'fly' ? 0.44 : 1.1, amp = st === 'fly' ? 1 : 0.7;
    let beat = Math.sin((t / per) * TAU + ph0) * amp;
    let x = 0, y = CY + (st === 'idle' ? Math.sin(t * 1.7 + ph0) * 2 : -beat * 1.2), rot = st === 'fly' ? 0.07 : 0, fold = 0;
    if (dying) {
      fold = smooth(0.05, 0.4, p); beat = beat * (1 - fold) - 0.6 * fold;
      y = CY + 80 * p * p - 8 * p; x = 12 * p; rot = 1.1 * p + 1.6 * p * p;
      ga *= (1 - smooth(0.1, 0.8, p)) * (0.5 + 0.5 * ih(Math.floor(t * 18), 2, seed));
      a = 1 - smooth(0.85, 1, p);
    }
    ctx.translate(x, y); ctx.rotate(rot - 0.10);
    // tails: two fine filaments streaming back, waving, beaded with light
    const stretch = st === 'fly' ? 1.15 : 0.85;
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = css(shade([200, 220, 230], L, 0.4), 0.5 * a); ctx.lineWidth = 0.45; ctx.lineCap = 'round';
      ctx.beginPath();
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10, px = -10 - u * 24 * stretch, py = 1 + k * 1.2 + Math.sin(t * 7 - u * 5 + k + ph0) * 2.2 * u + (st === 'idle' ? u * u * 5 : 0) + fold * u * 6;
        pts.push([px, py]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      for (let i = 3; i <= 10; i += 3) bloom(ctx, pts[i][0], pts[i][1], 2, CYAN, 0.55 * ga * a);
    }
    // far wing (up and behind, foreshortened), body, near wing
    wing(ctx, L, 29 - 14 * fold, -11 - 4 * beat + 6 * fold, false, ga, a, lit);
    // the mantle: a translucent teardrop, brighter at the rim, wet highlight on top
    const mg = ctx.createLinearGradient(4 + lit * 5, -6, 2 - lit * 5, 6);
    const pale = shade([230, 240, 246], L, 0.7);
    mg.addColorStop(0, css(mix(pale, [249, 239, 205], 0.63), 0.97 * a));
    mg.addColorStop(0.47, css(mix(pale, [187, 209, 205], 0.48), 0.82 * a));
    mg.addColorStop(1, css(mix(pale, [19, 36, 43], 0.89), 0.96 * a));
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.moveTo(14, 1);
    ctx.bezierCurveTo(14, -4.5, 5, -7, -2, -4.8);
    ctx.quadraticCurveTo(-8, -2, -12, 2);
    ctx.bezierCurveTo(-2, 2.5, 11, 6.3, 14, 1); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${(0.2 + 0.4 * L.keyAmt) * a})`; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(13, -2.4); ctx.quadraticCurveTo(6, -4.4, -2, -3); ctx.stroke();
    wing(ctx, L, -28 + 13 * fold, 12 + 4 * beat - 4 * fold, true, ga, a, lit);
    // the eye: a blue light in the front of the mantle, its glow spilling through
    bloom(ctx, 11, 0.8, 7, EYE, 0.58 * ga * a);
    bloom(ctx, 3, 2.6, 4.2, GREEN, 0.65 * ga * a);
    bloom(ctx, 11, 0.8, 2.2, [220, 245, 255], 0.98 * ga * a);
    // dying: leaking light
    if (dying) for (let i = 0; i < 6; i++) {
      const q = ((p * 3 + i / 6) % 1), dx = -q * 10 - i, dy = q * 18;
      bloom(ctx, dx, dy, 2.5, CYAN, (1 - q) * 0.7 * (1 - smooth(0.6, 1, p)));
    }
    ctx.restore();
  },
};
