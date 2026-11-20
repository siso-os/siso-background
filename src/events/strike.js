// strike: up in space, an enemy wing holds station over the planet and a SISO rocket comes up through it. Its
// warheads split off and take the ships one by one (a white flash, a fireball, a spray of fragments, the wreck
// tumbling away); the rocket itself goes into the command ship last, and the biggest blast of the loop lights the sky.
// The story plays it where the rocket it follows up comes out (src/story/script.js); the random director may also
// pick it on the space track, rarely.

import { clamp, smooth, hr, missile, blast, flush, bez3 } from './_war.js';
import { LEVELS, D, VIEW_H, HORIZON } from '../engine/view.js';

const N = 6;                       // ships in the wing, the last one the command ship
const SY = LEVELS[2];              // the space view's camera y
const yAt = (f, z) => SY + ((f - HORIZON) * VIEW_H - D(z)) / z;   // world y that sits at screen fraction f there

export default {
  id: 'strike',
  title: 'Space strike',
  about: 'An enemy wing holds over the planet; a SISO rocket comes up through it, its warheads take the ships one by one and the rocket hits the command ship.',
  track: 'space',
  dur: 18,
  weight: 1,
  war: false,          // the space track has no war slots (src/engine/director.js TRACKS); it plays as a calm pick there
  plan(r, { t0, autoX, story }) {
    if (!story && r() < 0.8) return null;   // rare in the open world: about one space slot in sixteen
    const cx = autoX(t0 + 6);
    const ships = [];
    for (let k = 0; k < N; k++) {
      const boss = k === N - 1;
      const z = boss ? 0.78 : [0.7, 0.82, 0.66, 0.74, 0.86][k];
      const f = boss ? 0.42 : r.range(0.22, 0.6);
      const x = cx + (boss ? 120 : (k - 2) * r.range(260, 360) + r.range(-60, 60)) / z;
      // when it is hit: the escorts 2.4 to 8 s in, the command ship last
      const hit = boss ? 10.5 : 2.4 + k * 1.3 + r.range(-0.3, 0.3);
      ships.push({ x, y: yAt(f, z), z, s: boss ? 1.5 : r.range(0.62, 0.8), hit, flip: r() < 0.3, vx: r.range(-14, 14), spin: r.range(-0.9, 0.9), seed: k, boss });
    }
    // where the warheads come up from: below the frame, left of the middle (the rocket's own path)
    const from = [cx - 700, SY + 900, 0.9];
    return { cx, ships, from, seed: r.int(0, 99) };
  },
  states() { return []; },
  items(ev, t, L, view) {
    const u = t - ev.t0, out = [], lights = [], flashes = [];
    for (const sh of ev.ships) {
      const du = u - sh.hit;
      const bob = Math.sin(u * 0.7 + sh.seed) * 6;
      const x = sh.x + sh.vx * u, y = sh.y + bob;
      if (du < 0) {
        // holding station; the escorts open up on the incoming rocket in the last seconds before they are hit
        const firing = u > 0.8 && du > -1.6 && !sh.boss;
        out.push({ id: 'space.attack-ship', x, y, z: sh.z, s: sh.s, state: firing ? 'fire' : 'idle', flip: sh.flip, seed: sh.seed, kind: 'space', rot: 0.04 * Math.sin(u * 0.5 + sh.seed) });
        lights.push({ x, y, z: sh.z, r: 60 * sh.s, c: [255, 120, 80], a: 0.35, water: false });
        // its warhead coming in: from below, curving up into it
        const fl = sh.boss ? 4.2 : 2.2, tl = sh.hit - fl;
        if (u >= tl) {
          const to = [x, y - 20 * sh.s, sh.z + 0.002];
          const c1 = [ev.from[0] + (sh.x - ev.from[0]) * 0.2, ev.from[1] - 500, ev.from[2]];
          const c2 = [to[0] - 260, to[1] + 420, sh.z];
          missile(out, { path: (f) => bez3(ev.from, c1, c2, to, f), t0: ev.t0 + tl, t1: ev.t0 + sh.hit, t, state: 'siso', s: sh.boss ? 1.6 : 0.9, view, back: 1.4, len: 420, seed: sh.seed, lights, glow: 1.6 });
        }
        continue;
      }
      // hit: a flash, a fireball, fragments; the wreck tumbles away and fades
      const size = sh.boss ? 1.5 : 0.62;
      blast(out, lights, flashes, { x, y, z: sh.z + 0.002, th: ev.t0 + sh.hit, t, size, state: 'air', seed: sh.seed, sky: sh.boss ? 1 : 0.25, light: sh.boss ? 2 : 1, colour: [255, 190, 130] });
      if (du < 3) out.push({ id: 'fx.debris', x, y: y + 20, z: sh.z + 0.003, s: sh.boss ? 1.2 : 0.6, state: 'burst', p: du / 3, seed: sh.seed, kind: 'fx', extra: { size: sh.boss ? 1.6 : 0.8 } });
      if (sh.boss && du < 2.2) out.push({ id: 'fx.fireball', x, y: y + 60, z: sh.z + 0.004, s: 2.4, state: 'burst', p: du / 2.2, seed: 3, kind: 'fx' });
      const fade = 1 - smooth(1.2, 6, du);
      if (!sh.boss && fade > 0.02) {
        // the wreck: the ship turning over and falling away, dimmer as it goes
        out.push({ id: 'space.attack-ship', x: x + sh.vx * du * 3, y: y + 22 * du * du, z: sh.z - 0.001, s: sh.s * (1 - 0.15 * smooth(0, 6, du)), state: 'idle', flip: sh.flip, seed: sh.seed, kind: 'space', rot: sh.spin * du, alpha: fade });
      }
      if (du < 1.4) lights.push({ x, y, z: sh.z, r: sh.boss ? 900 : 300, c: [255, 210, 170], a: (sh.boss ? 1.6 : 0.9) * Math.exp(-du * 2.2), water: false });
    }
    // the command ship's shockwave ring: a thin bright ring growing and fading
    const boss = ev.ships[N - 1], db = u - boss.hit;
    if (db >= 0 && db < 2.4) {
      const bx = boss.x + boss.vx * u, by = boss.y;
      out.push({
        overlay: true, z: boss.z + 0.01,
        draw(ctx, v) {
          const X = v.sx(bx, boss.z), Y = v.sy(by, boss.z), R = v.k * boss.z * (60 + 900 * smooth(0, 2.4, db) ** 0.6);
          const a = 0.55 * (1 - smooth(0.2, 2.4, db));
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineWidth = Math.max(1, v.k * 10 * (1 - db / 2.4));
          ctx.strokeStyle = `rgba(255, 220, 180, ${a})`;
          ctx.beginPath(); ctx.ellipse(X, Y, R, R * 0.32, -0.08, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        },
      });
    }
    return flush(out, lights, flashes);
  },
};

export { clamp, hr };
