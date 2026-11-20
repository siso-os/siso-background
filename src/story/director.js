// The story director: plays src/story/script.js as a loop. It answers the renderer the same questions the random
// director does (items, marks, states at t), from the script's events instead of rolled slots, and it also says
// where the camera is (cam), the hour (hour), which beat is on (beat) and how dark the seam's fade is (fade).
//
// Time stays the only state: loop k of the story is the script with every time moved by k x LOOP, each event planned
// with its own seeded rng (the same in every loop) and the absolute t0, so the events that sync with the world's own
// clocks (the tower's ports, the islands' bob) still line up.

import { rng, hash, clamp, smooth, lerp } from '../core/rng.js';
import { EVENTS as ALL } from '../events/index.js';
import { placeAt, chunkOf } from '../engine/world.js';
import { rocketAt } from '../events/launch.js';
import { LEVELS } from '../engine/view.js';
import * as SCRIPT from './script.js';

const SPACE = LEVELS[2];
const mod = (t, n) => ((t % n) + n) % n;
const ease = { io: (u) => u * u * (3 - 2 * u), lin: (u) => u };

// How a followed thing is framed: the camera's x on it, its y a little below the middle of the screen.
const FOLLOWERS = {
  launch(ev, t) {
    const r = rocketAt(ev, t);
    return { x: r.x, y: Math.max(SPACE, Math.min(0, r.y + 205)) };
  },
};

export class StoryDirector {
  constructor({ seed = SCRIPT.SEED, script = SCRIPT, events = ALL } = {}) {
    this.seed = seed; this.S = script; this.loop = script.LOOP;
    this.byId = new Map(events.map((e) => [e.id, e]));
    this.cache = new Map();
    for (const e of script.EVENTS) if (!this.byId.has(e.id)) throw new Error(`story: no event ${e.id}`);
  }

  // ---- the camera: the keys, with the follow windows blended over them (story time, 0..LOOP) ----
  keyCam(ts) {
    const K = this.S.CAMERA;
    if (ts <= K[0].t) return { x: K[0].x, y: K[0].y ?? 0 };
    for (let i = 1; i < K.length; i++) {
      const a = K[i - 1], b = K[i];
      if (ts <= b.t) {
        const u = (ease[b.ease] || ease.io)(clamp((ts - a.t) / Math.max(1e-6, b.t - a.t)));
        return { x: lerp(a.x, b.x, u), y: lerp(a.y ?? 0, b.y ?? 0, u) };
      }
    }
    const z = K[K.length - 1];
    return { x: z.x, y: z.y ?? 0 };
  }
  cam(t) {
    const ts = mod(t, this.loop), k = Math.floor(t / this.loop);
    let c = this.keyCam(ts);
    for (const f of this.S.FOLLOW || []) {
      if (ts < f.from || ts >= f.to) continue;
      const w = smooth(f.from, f.from + f.blendIn, ts) * (1 - smooth(f.to - f.blendOut, f.to, ts));
      const i = this.S.EVENTS.findIndex((e) => e.id === f.event && e.at <= f.to);
      const ev = i >= 0 ? this.ev(i, k) : null;
      if (!ev || !FOLLOWERS[f.event]) continue;
      const g = FOLLOWERS[f.event](ev, k * this.loop + ts);
      c = { x: lerp(c.x, g.x, w), y: lerp(c.y, g.y, w) };
    }
    return c;
  }
  // The auto path the events are planned along: the camera's x at t.
  autoX(t) { return this.cam(t).x; }

  hour(t) {
    const H = this.S.HOURS, ts = mod(t, this.loop);
    for (let i = 1; i < H.length; i++) if (ts <= H[i].t) return lerp(H[i - 1].h, H[i].h, clamp((ts - H[i - 1].t) / (H[i].t - H[i - 1].t)));
    return H[H.length - 1].h;
  }

  // 0 (clear) to 1 (black) at the loop's seam.
  fade(t) {
    const ts = mod(t, this.loop), F = this.S.FADE;
    return Math.max(smooth(this.loop - F.out, this.loop - 0.15, ts), 1 - smooth(0, F.in, ts));
  }

  // The beat on at t: { i, title, line, at, end }.
  beat(t) {
    const B = this.S.BEATS, ts = mod(t, this.loop);
    let i = 0;
    while (i + 1 < B.length && B[i + 1].at <= ts) i++;
    return { i, ...B[i], end: i + 1 < B.length ? B[i + 1].at : this.loop };
  }

  // ---- the events ----
  // Story event i in loop k, planned (or null when its plan finds nothing to do: tools/story-check.mjs fails then).
  ev(i, k) {
    const key = i + ':' + k;
    if (this.cache.has(key)) return this.cache.get(key);
    this.cache.set(key, null);                      // a plan that asks for the camera mid-plan sees no event yet
    const e = this.S.EVENTS[i], m = this.byId.get(e.id);
    const t0 = e.at + k * this.loop;
    const autoX = (t) => this.autoX(t);
    const x0 = e.x ?? autoX(t0);
    const at = { t0, x0, place: placeAt(this.seed, chunkOf(x0)), slot: i, seed: this.seed, autoX, opts: e.opts || null, story: true };
    let ev = null;
    try {
      const params = m.plan(rng(hash(this.seed, m.id, 'story', i)), at);
      if (params) ev = { id: m.id, slot: i, beat: i, t0, x0, dur: m.dur, track: m.track === 'space' ? 'space' : 'ground', ...params, ...(e.set || {}) };
    } catch (err) { console.error(`story event ${i} ${e.id}: ${err.message}`); }
    this.cache.set(key, ev);
    if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value);
    return ev;
  }
  end(ev) { const m = this.byId.get(ev.id); return ev.t0 + Math.max(ev.dur, ev.span ?? m.span ?? 0); }

  // Every planned event whose window holds t, earliest first.
  around(t) {
    const out = [], k = Math.floor(t / this.loop);
    for (const kk of [k - 1, k]) {
      for (let i = 0; i < this.S.EVENTS.length; i++) {
        const ev = this.ev(i, kk);
        if (ev && t >= ev.t0 && t < this.end(ev)) out.push(ev);
      }
    }
    return out;
  }
  active(t) { return this.around(t).filter((ev) => t < ev.t0 + ev.dur); }

  items(t, L, view) {
    const out = [];
    for (const ev of this.around(t)) {
      const m = this.byId.get(ev.id);
      try { for (const it of m.items(ev, t, L, view) || []) out.push(it); } catch (e) { console.error(`story ${ev.id}: ${e.message}`); }
    }
    return out;
  }
  marks(t) {
    const out = [];
    for (const ev of this.around(t)) { const m = this.byId.get(ev.id); if (m.marks) for (const x of m.marks(ev) || []) out.push(x); }
    return out;
  }
  // Later events first: when two give the same thing a state (the barrage burns the island, then the island falls),
  // the later one wins.
  states(t) {
    const out = [];
    for (const ev of this.around(t).reverse()) {
      const m = this.byId.get(ev.id);
      if (!m.states) continue;
      let list = [];
      try { list = m.states(ev, t) || []; } catch (e) { console.error(`story ${ev.id} states: ${e.message}`); }
      for (const s of list) {
        if (t < s.from || t >= s.to) continue;
        out.push({ ...s, p: s.p ?? clamp((t - s.from) / Math.max(1e-6, s.to - s.from)) });
      }
    }
    return out;
  }
}
