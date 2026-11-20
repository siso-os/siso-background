// A drifter (refs/elements/portal-aliens: the big jellyfish beside the portal): a glass bell with a cyan heart and
// green organs, frilled arms and long fine tentacles beaded with light, swimming through the air the way a jellyfish
// swims: the bell pulls in and pushes, it rises a little and glides. Not one of the four required aliens: an extra,
// because the reference is full of them.
// idle: drifts and pulses. die (p): the light stutters out, the bell goes slack and it sinks, tentacles trailing up.
import { clamp, smooth, ease, bloom, ih, CYAN, GREEN, VIOLET, glowAmt, bell, tentacle } from './_lib.js';

const W = 128, H = 160, PULSE = 2.4;

export default {
  id: 'aliens.drifter', family: 'aliens', title: 'Drifter',
  about: 'A jellyfish of the air: a glass bell with a cyan heart and green organs, frilled arms and long fine tentacles beaded with light. idle: pulses, rises a little and glides. die p: the light stutters out, the bell goes slack and it sinks.',
  w: W, h: H, states: ['idle', 'die'], loop: PULSE * 3, once: { die: 3 }, variants: 4, free: true,
  ref: 'refs/elements/portal-aliens.webp',
  draw(ctx, o) {
    ctx.save();
    const L = o.L, t = o.t || 0, seed = o.seed || 0, p = clamp(o.p ?? 0.5), dying = o.state === 'die', lit = (o.lit ?? L.side) < 0 ? -1 : 1;
    const ph = ((t + ih(seed, 1, 3) * PULSE) / PULSE) % 1;
    // a jellyfish stroke: a quick squeeze (ph 0..0.3) then a slow open; it rises on the squeeze
    const sq = ph < 0.3 ? Math.sin((ph / 0.3) * Math.PI) : 0;
    let rise = -6 * ease(Math.min(1, ph / 0.45)) + 6 * smooth(0.45, 1, ph);
    let ga = glowAmt(L), a = 1, slack = 0, sink = 0;
    if (dying) {
      ga *= (1 - smooth(0.05, 0.75, p)) * (0.4 + 0.6 * ih(Math.floor(t * 14), 2, seed));
      slack = smooth(0.1, 0.6, p); sink = 90 * p * p; rise *= 1 - slack; a = 1 - smooth(0.8, 1, p);
    }
    const s = dying ? 0 : sq;
    const bw = 43 * (1 - 0.14 * s) * (1 + 0.15 * slack), bh = 30 * (1 + 0.12 * s) * (1 - 0.3 * slack), by = -118 + rise + sink;
    ctx.translate(0, by);
    ctx.rotate(-0.14 + 0.09 * Math.sin(t * 1.3 + seed) + slack * 0.33);
    ctx.translate(0, -by);
    // tentacles first (behind the bell's front), then the bell
    for (let i = 0; i < 12; i++) {
      const x = (i - 5.5) * bw * 0.15, len = (68 + 48 * ih(i, 3, seed)) * (1 - 0.15 * s) * (1 - 0.3 * slack);
      tentacle(ctx, L, x, by + 1, len, t + i * 0.13, { seed: i + seed, sway: 1.5 + slack, drift: dying ? -0.28 * slack : -0.36 + 0.22 * ih(i, 5, seed), w: 0.45, c: i % 4 === 0 ? VIOLET : i % 3 ? CYAN : GREEN, ga: ga * 0.9, a, n: 14, slack: dying ? slack : 0 });
    }
    for (let i = 0; i < 4; i++) tentacle(ctx, L, (i - 1.5) * bw * 0.2, by + 2, 46 * (1 - 0.2 * slack), t * 0.7 + i, { seed: i * 3 + seed, sway: 0.6, w: 2.2, c: GREEN, ga: ga * 0.6, a: 0.6 * a, n: 9 });
    bloom(ctx, bw * 0.43, by - 4, bw * 0.8, VIOLET, 0.21 * ga * a);
    bell(ctx, L, 0, by, bw, bh, t, { ga, lit, a });
    bloom(ctx, 0, by - bh * 0.4, bw * 2.6, CYAN, 0.12 * ga * a * (0.5 + 0.5 * L.night));
    ctx.restore();
  },
};
