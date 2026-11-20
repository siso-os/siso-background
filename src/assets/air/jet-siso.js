// SISO's fighter: sleek, light grey with blue accents, twin canted tails, a blue-white afterburner.
// fire (once, 1.4 s): the cannon flashes and a missile drops off the rail, lights and pulls ahead.
import { FLAME } from './_lib.js';
import { drawJet } from './_jet.js';

const J = {
  id: 'air.jet-siso', seed: 1, base: [172, 180, 190], gloss: 0.35, glass: [255, 190, 90], missile: [226, 230, 236],
  stripe: [40, 120, 255], tailMark: [40, 120, 255], flame: FLAME.siso, burner: 1, gun: [9.2, -5.4],
  fus: 'M19.6 -4.55 Q14 -5.55 9 -5.75 C6.3 -7.65 4.7 -8.2 2.6 -7.88 Q0.2 -7.48 -2 -6.35 L-13 -6.33 L-16.8 -5.83 L-16.8 -3.55 Q-11 -2.62 -2 -2.6 Q3 -2.6 7 -3.25 Q13 -3.75 19.6 -4.55 Z',
  canopy: 'M9 -5.75 C6.3 -7.65 4.7 -8.2 2.6 -7.88 Q0.2 -7.48 -2 -6.35 Q3 -5.95 9 -5.75 Z',
  intake: 'M0.7 -3.62 Q2.15 -4.87 5.58 -5.05 L6.18 -4.83 L4.35 -3.54 Q2.55 -3.15 0.7 -3.62 Z',
  nearWing: 'M4.5 -3.84 Q-5 -3.62 -10 -3.8 L-13.6 -1.85 L-9.7 -1.92 Z',
  farWing: 'M1.8 -6.2 L-8.2 -6.1 L-10.6 -7.4 L-7.4 -7.4 Z',
  nearTail: 'M-8.8 -6.1 L-14.2 -10.3 L-16.7 -10.3 L-16.4 -5.95 Z',
  farTail: 'M-10.3 -6.2 L-15.1 -9.7 L-17.2 -9.7 L-16.9 -6.1 Z',
  hstab: 'M-11.6 -4.4 L-18.3 -4.0 L-18.7 -2.9 L-14.4 -3.3 Z',
  spine: [[19.4, -4.6], [14, -5.6], [9, -5.8], [-13, -6.1]],
  lights: [[-10.6, -0.85, [60, 255, 120], 'n'], [-15.6, -10.2, [255, 255, 255], 's']],
};

export default {
  id: 'air.jet-siso',
  family: 'air',
  title: 'SISO jet',
  about: 'SISO fighter, light grey with blue accents and a blue-white afterburner; fire (once 1.4 s): cannon flash and a missile off the rail (hand the flight to air.missile after).',
  w: 40, h: 10.5,
  states: ['idle', 'fire'],
  loop: 2,
  once: { fire: 1.4 },
  variants: 1,
  ref: 'refs/options/option-d-storm.webp',
  draw(ctx, o) { ctx.save(); try { drawJet(ctx, o, J); } finally { ctx.restore(); } },
};
