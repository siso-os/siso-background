// flyby: two to four jets cross high in formation, laying contrails that hang, widen and fade behind them.

export default {
  id: 'flyby',
  title: 'Jet flyby',
  about: 'Two to four jets cross high in formation with contrails.',
  dur: 18,
  weight: 2,
  where: null,
  plan(r, { x0 }) {
    const dir = r() < 0.5 ? 1 : -1;
    const n = r.int(2, 4);
    const enemy = r() < 0.3;
    return {
      dir, n, enemy,
      z: r.range(0.82, 0.95),
      y: -r.range(760, 940),
      v: r.range(480, 560),
      start: x0 - dir * 2600,
      climb: r.range(-12, 12),          // u/s, a gentle climb or descent
      seeds: Array.from({ length: n }, () => r.int(0, 9)),
    };
  },
  items(ev, t) {
    const u = t - ev.t0;
    const out = [];
    const id = ev.enemy ? 'air.jet-enemy' : 'air.jet-siso';
    for (let j = 0; j < ev.n; j++) {
      // an echelon: each wingman a little behind and below the one before
      const back = j * 46, down = j * 14 * (j % 2 ? 1 : -0.6);
      const lag = back / ev.v;
      const x = ev.start + ev.dir * (ev.v * u - back);
      const y = ev.y + down + ev.climb * u;
      const tail = Math.min(7, u - lag);
      if (tail > 0) {
        // the contrail, in the jet's frame: older points behind, sagging and drifting a little
        const pts = [];
        for (let k = 12; k >= 0; k--) {
          const tau = (k / 12) * tail;
          pts.push([-ev.v * tau, -ev.climb * tau + tau * tau * 0.35]);
        }
        out.push({ id: 'fx.trail', x: x - ev.dir * 14, y, z: ev.z - 0.002, s: 1, flip: ev.dir < 0, kind: 'fx', extra: { points: pts, kind: 'contrail', width: 2.2 } });
      }
      out.push({ id, x, y, z: ev.z, s: 1, flip: ev.dir < 0, seed: ev.seeds[j], state: 'idle', kind: 'air' });
    }
    return out;
  },
};
