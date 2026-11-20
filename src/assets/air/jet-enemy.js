// The enemy fighter: dark, angular, canards and a long chined nose, red accents and a red-orange afterburner.
// fire (once, 1.4 s): the cannon flashes and a missile drops off the rail, lights and pulls ahead.
import { FLAME } from './_lib.js';
import { drawJet } from './_jet.js';

const J = {
  id: 'air.jet-enemy', seed: 2, base: [58, 60, 64], gloss: 0.25, glass: [255, 120, 60], missile: [70, 72, 76],
  stripe: [157, 34, 29], tailMark: [190, 30, 30], flame: FLAME.enemy, burner: 1.05, gun: [8.6, -5.5],
  fus: 'M19.8 -4.6 L12 -5.6 L8.6 -5.85 L4.6 -7.4 L0 -7.15 L-2.6 -6.35 L-14 -6.1 L-17 -5.7 L-17 -3.6 L-12 -3.0 L-1 -2.8 L8 -3.4 Z',
  canopy: 'M8.6 -5.85 L4.6 -7.4 L0 -7.15 L-2.6 -6.35 Z',
  intake: 'M0.58 -3.44 L1.4 -4.88 L4.1 -5.19 L5.56 -4.72 L4.46 -3.53 Z',
  canard: 'M9.4 -4.95 L5.6 -4.6 L4.4 -3.85 L7.2 -4.1 Z',
  nearWing: 'M3.4 -3.3 L-11 -3.15 L-13.2 -0.75 L-10.4 -0.75 Z',
  farWing: 'M0.5 -6.2 L-9.5 -6.1 L-11.6 -7.3 L-9.2 -7.3 Z',
  nearTail: 'M-8.4 -6.1 L-13.3 -10.5 L-16.1 -10.5 L-15.7 -6.0 Z',
  farTail: 'M-10 -6.2 L-14.4 -9.9 L-17 -9.9 L-16.7 -6.1 Z',
  hstab: 'M-12.2 -4.3 L-18.4 -3.9 L-18.9 -2.9 L-14.8 -3.2 Z',
  spine: [[19.6, -4.65], [12, -5.65], [8.6, -5.9], [-14, -6.15]],
  lights: [[-12.2, -0.9, [255, 50, 40], 'n'], [-15.2, -10.4, [255, 60, 50], 's']],
};

export default {
  id: 'air.jet-enemy',
  family: 'air',
  title: 'Enemy jet',
  about: 'Enemy fighter, dark and angular with canards, red accents and a red-orange afterburner; fire (once 1.4 s): cannon flash and a missile off the rail.',
  w: 40, h: 10.5,
  states: ['idle', 'fire'],
  loop: 2,
  once: { fire: 1.4 },
  variants: 1,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) { ctx.save(); try { drawJet(ctx, o, J); } finally { ctx.restore(); } },
};
