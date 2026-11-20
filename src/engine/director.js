// The director: plans events from (seed, slot) at fixed times and fixed world x along the auto path, so any t shows the
// same thing whoever looks. It also answers what state each building is in at t (idle, collapse, ruin, construct), from
// the marks the events leave, and what state an event gives to things the world already placed (the tower, the dome,
// an enemy island, the palace). See src/events/README.md for the event module shape.
//
// Two tracks run in parallel, each with its own slots: the ground track (sea level and the clouds) and the space track
// (the palace, 6900 units up), so a ground slot is never spent on something nobody at sea level can see.

import { rng, hash, clamp } from '../core/rng.js';
import { EVENTS } from '../events/index.js';
import { placeAt, chunkOf } from './world.js';

export const SLOT = 30;          // seconds between event slots (both tracks)
// quiet: the share of slots with nothing planned. war: the share of ground slots that ask for a war, before the rule
// that a war never follows a war (so about war x (1 - war) of slots end up at war: 0.3 -> one slot in 4.8, 2.4 min).
export const TRACKS = {
  ground: { salt: 'slot', quiet: 0.2, war: 0.3 },
  space: { salt: 'space', quiet: 0.66, war: 0 },   // an attack on about one palace visit in three
};
const TRACK_IDS = Object.keys(TRACKS);
const trackOf = (e) => (e.track === 'space' ? 'space' : 'ground');

// Whether an event's `where` lets it play here: null (anywhere), a list of place types, or a function (place, at).
function allowed(e, at) {
  if (!e.where) return true;
  if (typeof e.where === 'function') { try { return !!e.where(at.place, at); } catch (err) { console.error(`event ${e.id} where: ${err.message}`); return false; } }
  return e.where.includes(at.place.type);
}

export class Director {
  // autoX(t): the world x at the centre of the screen on the auto path at time t.
  constructor({ seed = 0, autoX = (t) => t * 40, events = EVENTS, only = null } = {}) {
    this.seed = seed; this.autoX = autoX; this.events = only ? events.filter((e) => only.includes(e.id)) : events;
    this.byId = new Map(this.events.map((e) => [e.id, e]));
    this.tracks = Object.fromEntries(TRACK_IDS.map((k) => [k, this.events.filter((e) => trackOf(e) === k)]));
    this.lookback = Math.max(...this.events.map((e) => Math.max(e.dur, e.span || 0)), SLOT);
    this.cache = new Map();
  }

  // What slot n of a track rolls, before the never-two-wars rule: { t0, x0, place, war, wars, calm, u } or null.
  // Pure in (seed, track, n), so a slot can ask about the slot before it without a chain back to slot 0.
  roll(n, track) {
    const T = TRACKS[track], list = this.tracks[track];
    if (!list || !list.length) return null;
    const r = rng(hash(this.seed, T.salt, n));
    if (r() < T.quiet) return null;
    const t0 = n * SLOT + r.range(0, 6);
    const x0 = this.autoX(t0);
    const place = placeAt(this.seed, chunkOf(x0));
    const at = { t0, x0, place, slot: n, seed: this.seed, autoX: this.autoX };
    const ok = list.filter((e) => allowed(e, at));
    const wars = ok.filter((e) => e.war), calm = ok.filter((e) => !e.war);
    // a war that only fits a few places (the home bay, an island over a city) pulls the war chance up where it fits
    const pull = wars.reduce((m, e) => Math.max(m, e.pull || 0), T.war);
    const war = r() < pull && wars.length > 0;
    return { t0, x0, place, war, wars, calm, u: r() };
  }

  // The event planned for slot n of a track ('ground' by default), or null. Pure: the same (seed, track, n) always
  // plans the same event.
  plan(n, track = 'ground') {
    const key = track + ':' + n;
    if (this.cache.has(key)) return this.cache.get(key);
    let ev = null;
    const a = this.roll(n, track);
    if (a) {
      let pool = a.war ? a.wars : a.calm;
      if (a.war) { const b = this.roll(n - 1, track); if (b && b.war) pool = a.calm; }   // never two wars back to back
      const total = pool.reduce((s, e) => s + (e.weight || 1), 0);
      let pick = a.u * total, mod = null;
      for (const e of pool) { pick -= e.weight || 1; if (pick <= 0) { mod = e; break; } }
      if (mod) {
        const params = mod.plan(rng(hash(this.seed, mod.id, n)), { t0: a.t0, x0: a.x0, place: a.place, slot: n, seed: this.seed, autoX: this.autoX });
        if (params) ev = { id: mod.id, slot: n, t0: a.t0, x0: a.x0, dur: mod.dur, track, ...params };
      }
    }
    this.cache.set(key, ev);
    if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value);
    return ev;
  }

  // Every event (both tracks) whose window [t0, t0 + max(dur, span)) holds t.
  around(t) {
    const out = [];
    for (const track of TRACK_IDS) {
      if (!this.tracks[track].length) continue;
      for (let n = Math.floor((t - this.lookback - 6) / SLOT); n <= Math.floor(t / SLOT); n++) {
        const ev = this.plan(n, track);
        if (!ev) continue;
        const mod = this.byId.get(ev.id);
        if (t >= ev.t0 && t < ev.t0 + Math.max(ev.dur, mod.span || 0)) out.push(ev);
      }
    }
    return out;
  }
  active(t) { return this.around(t).filter((ev) => t < ev.t0 + ev.dur); }

  // The items every event adds at t (world items, and overlays drawn additively in screen space). An event is asked
  // for as long as its span lasts, so smoke over ruins and the cranes of a rebuild can outlive its dur.
  items(t, L, view) {
    const out = [];
    for (const ev of this.around(t)) {
      const mod = this.byId.get(ev.id);
      if (t >= ev.t0 + ev.dur && !mod.span) continue;
      try { for (const it of mod.items(ev, t, L, view) || []) out.push(it); } catch (e) { console.error(`event ${ev.id}: ${e.message}`); }
    }
    return out;
  }

  // Building marks live at t: { x0, x1, z0, z1, at, fall, ruin, build } from events' marks(ev).
  marks(t) {
    const out = [];
    for (const ev of this.around(t)) {
      const mod = this.byId.get(ev.id);
      if (mod.marks) for (const m of mod.marks(ev) || []) out.push(m);
    }
    return out;
  }

  // States events give to things the world already placed, live at t: [{ id, x0, x1, state, p, dx, dy, rot, hide,
  // extra }] from events' states(ev, t), each entry { id, x0, x1, from, to, state, p? ... } kept while from <= t < to.
  // p, when the entry leaves it out, runs 0 to 1 across from..to (for a once state).
  states(t) {
    const out = [];
    for (const ev of this.around(t)) {
      const mod = this.byId.get(ev.id);
      if (!mod.states) continue;
      let list = [];
      try { list = mod.states(ev, t) || []; } catch (e) { console.error(`event ${ev.id} states: ${e.message}`); }
      for (const s of list) {
        if (t < s.from || t >= s.to) continue;
        out.push({ ...s, p: s.p ?? clamp((t - s.from) / Math.max(1e-6, s.to - s.from)) });
      }
    }
    return out;
  }

  // The live state entry for a world thing (id at world x), or null.
  static stateOf(states, id, x) {
    for (const s of states) if (s.id === id && x >= s.x0 && x <= s.x1) return s;
    return null;
  }

  // The state of a building at t: { state, p }. it is a world item with x and z.
  static stateFrom(marks, it, t) {
    for (const m of marks) {
      if (it.x < m.x0 || it.x > m.x1 || it.z < (m.z0 ?? 0) || it.z > (m.z1 ?? 9)) continue;
      const fall = m.fall ?? 4, ruin = m.ruin ?? 40, build = m.build ?? 8;
      const u = t - m.at;
      if (u < 0) continue;
      if (u < fall) return { state: 'collapse', p: clamp(u / fall) };
      if (u < fall + ruin) return { state: 'ruin', p: 0 };
      if (u < fall + ruin + build) return { state: 'construct', p: clamp((u - fall - ruin) / build) };
    }
    return null;
  }
}
