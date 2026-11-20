// patrol: a police boat chases a smuggler across the bay. Both throw wakes; the police light bar flashes blue and red
// and lights the water under it.

import { clamp } from '../core/rng.js';
import { css } from '../core/paint.js';
import { lightSprite } from '../engine/shore.js';

export default {
  id: 'patrol',
  title: 'Police patrol',
  about: 'A police boat chases a smuggler across the bay, wakes behind them, the light bar lighting the water.',
  dur: 34,
  weight: 3,
  where: null, // every place has a bay
  plan(r, { x0 }) {
    const dir = r() < 0.7 ? 1 : -1;               // most chases run with the drift
    return {
      dir,
      z: r.range(1.2, 1.3),
      vs: dir > 0 ? r.range(120, 135) : r.range(60, 75),  // world u/s; the camera drifts right at 40
      gap: r.range(120, 160),
      start: x0 - dir * 1350,
      sseed: r.int(0, 9), pseed: r.int(0, 9),
    };
  },
  items(ev, t, L) {
    const u = t - ev.t0;
    const sx = ev.start + ev.dir * ev.vs * u;
    const gap = Math.max(40, ev.gap - 2.2 * u);
    const px = sx - ev.dir * gap;
    const flip = ev.dir < 0;
    const bob = (ph) => Math.sin(t * 3.1 + ph) * 0.6;
    const out = [
      { id: 'fx.wake', x: sx - ev.dir * 18, y: 0, z: ev.z + 0.004, s: 1, flip, kind: 'fx', extra: { speed: ev.vs } },
      { id: 'sea.smuggler', x: sx, y: bob(0), z: ev.z + 0.005, s: 1, flip, seed: ev.sseed, state: 'flee', kind: 'boat', reflect: true },
      { id: 'fx.wake', x: px - ev.dir * 26, y: 0, z: ev.z + 0.009, s: 1, flip, kind: 'fx', extra: { speed: ev.vs } },
      { id: 'sea.police-boat', x: px, y: bob(1.7), z: ev.z + 0.01, s: 1, flip, seed: ev.pseed, state: 'chase', kind: 'boat', reflect: true },
    ];
    // the light bar on the water: blue and red in turn, a long wobbling patch under the boat
    const blue = Math.floor(t * 4) % 2 === 0;
    const night = clamp(L.night * 1.2 + 0.25);
    out.push({
      overlay: true, z: ev.z + 0.01,
      draw(ctx, v) {
        const z = ev.z + 0.01;
        const x = v.sx(px, z), y = v.sy(0, z);
        const c = blue ? [70, 130, 255] : [255, 50, 50];
        const r = v.k * z * 38;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 * night;
        ctx.drawImage(lightSprite(c), x - r * 1.4, y - r * 0.12, r * 2.8, r * 0.5);
        // a broken streak of its reflection straight down
        for (let k = 0; k < 7; k++) {
          const yy = y + v.k * z * (4 + k * 5);
          const w = v.k * z * (10 - k) * (0.7 + 0.3 * Math.sin(t * 7 + k * 1.3));
          ctx.fillStyle = css(c, 0.5 * night * (1 - k / 7));
          ctx.fillRect(x - w / 2 + Math.sin(t * 5 + k) * v.k * 2, yy, w, Math.max(1, v.k * z * 1.6));
        }
        ctx.restore();
      },
    });
    return out;
  },
};
