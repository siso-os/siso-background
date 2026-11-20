// The renderer: the WebGL backdrop (sky, sun, moon, stars, clouds, sea) on its own canvas, then four 2D layers, each
// its own canvas: far (mountains), mid (far coasts, islands), main (the city on its shore, the middle-distance boats)
// and near (the foreground boats). Each layer is drawn far to near in depth bins; after each bin the haze of that
// depth is laid over everything already in the layer, so farther things collect more of it. Then the water mirrors
// the layer, lights throw streaks down the night sea, and bright lights bloom.

import { drawAsset, byId } from '../assets/registry.js';
import { drawStandin, sizeOf } from './standin.js';
import { makeView, altitudeOf, horizonAt, zoom } from './view.js';
import { visibleItems } from './world.js';
import { Director } from './director.js';
import { Backdrop } from './backdrop.js';
import { css } from '../core/paint.js';
import { clamp } from '../core/rng.js';
import { mirror, grab, bright, bloom, streaks, scratchCanvas } from './water.js';

// The threshold for the night streaks follows the dark: at night any lit window (above about 30%) throws a streak; in
// daylight only near-white (about 85%) does, so sunlit walls stay in the mirror and do not turn into light columns.
function streakPass(L) {
  const th = 0.85 - 0.55 * clamp(L.night * 1.2);
  return { th, gain: 1.5 / th };   // the ramp brightness(0.375 / th) contrast(4) gave: (x - th) * 1.5 / th
}

// Depth bands. bins: the far edge of each haze bin. water: the depth whose waterline the layer mirrors about.
export const LAYERS = [
  { id: 'far', z0: 0, z1: 0.4, bins: [0.21, 0.4], water: 0.2, refl: { squash: 0.55, alpha: 0.16, amp: 1.2 } },
  { id: 'mid', z0: 0.4, z1: 0.9, bins: [0.56, 0.7, 0.8, 0.9], water: 0.5, refl: { squash: 0.6, alpha: 0.24, amp: 1.8 }, lights: true },
  { id: 'main', z0: 0.9, z1: 1.12, bins: [0.95, 0.98, 1.01, 1.04], water: 1.035, refl: { squash: 0.62, alpha: 0.3, amp: 3 }, lights: true, split: 1.04 },
  { id: 'near', z0: 1.12, z1: 99, bins: [99], lights: true },
];
export const layerOf = (z) => LAYERS.find((l) => z >= l.z0 && z < l.z1) || LAYERS[3];

// How much haze lies between the eye and depth z (0 none, 1 all haze).
export function hazeAt(z, L) {
  const hmax = 0.78 * (1 - 0.92 * (L.space || 0)) * (1 + 0.25 * (L.overcast || 0));
  return clamp(hmax * Math.max(0, (1.1 - z) / 1.1) ** 0.75);
}

// Things carried by other things: where they sit (the host asset's slot if it names one, else a share of its box)
// and how big they are (a share of the host's width).
const CARRY = {
  'city.tower-siso': { slot: 'tower', at: [0, -0.62], fit: ['h', 0.5] },
  'defence.shield-dome': { slot: 'dome', at: [0, -0.6], fit: ['w', 1.05] },
  'space.moon-city': { slot: 'city', at: [0, -0.985], fit: ['w', 0.55] },
};

export class Renderer {
  // canvases: { sky, far, mid, main, near }; opts: { seed, preserve, skyPx (max backdrop pixels), dpr }
  constructor(canvases, { seed = 0, preserve = false, skyPx = 2.0e6, dpr = 1.5 } = {}) {
    this.c = canvases;
    this.seed = seed;
    this.skyPx = skyPx;
    this.dpr = dpr;
    this.backdrop = new Backdrop(canvases.sky, { preserve });
    this.g = Object.fromEntries(LAYERS.map((l) => [l.id, canvases[l.id].getContext('2d')]));
    this.errors = 0;
    this.stats = {};
  }

  resize(cssW, cssH) {
    const d = Math.min(window.devicePixelRatio || 1, this.dpr);
    this.W = Math.round(cssW * d); this.H = Math.round(cssH * d);
    this.cssW = cssW; this.cssH = cssH;
    for (const l of LAYERS) { const c = this.c[l.id]; if (c.width !== this.W || c.height !== this.H) { c.width = this.W; c.height = this.H; } }
    const native = cssW * cssH * (window.devicePixelRatio || 1) ** 2;
    const s = Math.min(1, Math.sqrt(this.skyPx / native)) * (window.devicePixelRatio || 1);
    this.skyW = Math.max(2, Math.round(cssW * s)); this.skyH = Math.max(2, Math.round(cssH * s));
  }

  // frame: { t, camX, camY, L, director }
  draw({ t, camX, camY, L, director = null }) {
    const t0 = performance.now();
    const st = { items: 0, drawn: 0, layers: {} };
    // the backdrop at its own resolution
    const bk = (this.skyH / 1080) * zoom();   // the sky and sea zoom with the layers, so the sea stays under the boats
    this.backdrop.render({ W: this.skyW, H: this.skyH, k: bk, A: horizonAt(this.skyH), camX, camY, t, L, px: this.skyH / this.cssH, seed: this.seed });
    st.sky = performance.now() - t0;

    const v = makeView(this.W, this.H, camX, camY);
    const items = visibleItems(this.seed, t, v);
    let marks = [];
    this.live = [];   // states events give to world things now (director.states): the tower's barrage, a falling island
    if (director) {
      for (const it of director.items(t, L, v)) items.push(it);
      marks = director.marks(t);
      if (director.states) this.live = director.states(t);
    }
    st.items = items.length;
    const per = { far: [], mid: [], main: [], near: [] };
    for (const it of items) per[layerOf(it.z).id].push(it);
    for (const l of LAYERS) {
      const a = performance.now();
      const list = per[l.id].sort((p, q) => p.z - q.z);
      st.layers[l.id] = { n: this.layer(l, list, v, L, t, marks), ms: 0 };
      st.layers[l.id].ms = performance.now() - a;
      st.drawn += st.layers[l.id].n;
    }
    st.total = performance.now() - t0;
    this.stats = st;
    return st;
  }

  layer(l, list, v, L, t, marks) {
    const g = this.g[l.id];
    const { W, H } = v;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    const box = { top: Infinity, bottom: -Infinity };
    const overlays = [];
    let n = 0, i = 0;
    const yw = v.sy(0, l.water ?? 1);
    const shore = l.split ? list.filter((it) => it.z < l.split) : list;
    const water = l.split ? list.filter((it) => it.z >= l.split) : [];

    // the bins, far to near, each followed by its haze
    const edges = l.bins;
    const zRep = edges.map((e, k) => { const lo = k ? edges[k - 1] : l.z0; return (lo + Math.min(e, l.z1 + 0.4)) / 2; });
    const Hz = zRep.map((z) => hazeAt(z, L));
    for (let b = 0; b < edges.length; b++) {
      while (i < shore.length && shore[i].z < edges[b]) {
        const it = shore[i++];
        if (it.overlay) { overlays.push(it); continue; }
        if (this.item(g, it, v, L, t, marks, box)) n++;
      }
      const next = b + 1 < Hz.length ? Hz[b + 1] : 0;
      const a = 1 - (1 - Hz[b]) / (1 - next);
      if (a > 0.004 && box.top < box.bottom) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = css(L.haze, a);
        g.fillRect(0, Math.max(0, box.top - 2), W, Math.min(H, box.bottom + 2) - Math.max(0, box.top - 2));
        g.globalCompositeOperation = 'source-over';
      }
    }
    while (i < shore.length) { const it = shore[i++]; if (it.overlay) overlays.push(it); else if (this.item(g, it, v, L, t, marks, box)) n++; }

    // low haze: the feet of far things sink into the air over the water
    // (the haze is densest just over the water, so the feet of the city and the hills are paler than their tops)
    if (l.id !== 'near' && box.top < box.bottom && yw > 0) {
      const gh = { far: 0.42, mid: 0.3, main: 0.32 }[l.id] * (1 - 0.92 * (L.space || 0)) * (1 - 0.5 * L.night);
      const reach = { far: 0.09, mid: 0.1, main: 0.16 }[l.id] * H;
      const gr = g.createLinearGradient(0, yw - reach, 0, yw + 1);
      gr.addColorStop(0, css(L.haze, 0)); gr.addColorStop(0.6, css(L.haze, gh * 0.45)); gr.addColorStop(1, css(L.haze, gh));
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = gr; g.fillRect(0, Math.max(0, yw - reach), W, reach + 1);
      g.globalCompositeOperation = 'source-over';
    }

    // the water: the layer mirrored, the night streaks, then the things on the water nearer than the shore
    const lit = clamp(L.windows * 1.05 + L.neon * 0.35) * (1 - (L.space || 0));   // lights bloom; sunlit walls do not
    let b = null;
    if (l.lights && lit > 0.06 && box.top < box.bottom) b = bright('bright:' + l.id, this.c[l.id], 4);
    if (l.refl && yw < H && yw > 0 && box.top < yw) {
      const rise = Math.min(yw - Math.max(0, box.top), 0.5 * H);
      if (rise > 2) {
        const band = grab('band:' + l.id, this.c[l.id], 0, yw - rise, W, rise);
        mirror(g, band, 0, 0, W, rise, yw, { ...l.refl, depth: H - yw, slice: Math.max(2, Math.round(v.k * 2)), amp: l.refl.amp * v.k, t, phase: l.water * 7, dx: 0 });
        // streaks come from the lights near the waterline (the shore and the city), not from things flying high above it
        if (b) streaks(g, bright('lights:' + l.id, this.c[l.id], 4, streakPass(L)), 4, yw, Math.min(rise, 0.24 * H), Math.min(H - yw, 0.42 * H), t, clamp(L.windows * 0.85 + L.neon * 0.25) * (1 - (L.space || 0)) * (l.id === 'mid' ? 0.6 : 1), W);
      }
    }
    for (const it of water) { if (it.overlay) overlays.push(it); else if (this.item(g, it, v, L, t, marks, box)) n++; }

    // event light on the water and other additive overlays
    for (const it of overlays) {
      try { g.save(); it.draw(g, v, L, t); } catch (e) { this.err(e); } finally { g.restore(); }
    }
    if (b) bloom(g, b, W, H, lit * (l.id === 'near' ? 0.6 : 1));
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    return n;
  }

  // One item: an asset (or its stand-in), an engine-drawn strip, or a function item. Returns true if drawn.
  item(g, it, v, L, t, marks, box) {
    if (it.screen) {
      if (it.x1 !== undefined && (v.sx(it.x1, it.z) < -50 || v.sx(it.x0, it.z) > v.W + 50)) return false;
      try { g.save(); it.draw(g, v, L, t, it); } catch (e) { this.err(e); } finally { g.restore(); }
      const y = v.sy(0, it.z);
      box.top = Math.min(box.top, y - 40 * v.k); box.bottom = Math.max(box.bottom, y + 30 * v.k);
      return true;
    }
    const z = it.z, s = it.s ?? 1;
    const sc = v.k * z * s;
    if (!(sc > 0)) return false;
    // an event may give a world thing a state, move it (dx, dy), turn it (rot) or hide it: Director.states()
    const ov = this.live && this.live.length && it.id ? Director.stateOf(this.live, it.id, it.x) : null;
    if (ov && ov.hide) return false;
    let y = (it.y || 0) + ((ov && ov.dy) || 0);
    if (it.bob) y += Math.sin(t * 0.42 + (it.seed || 0) * 1.7 + it.x * 0.0013) * 5 * it.bob;
    const X = v.sx(it.x + ((ov && ov.dx) || 0), z), Y = v.sy(y, z);
    const [w, h] = it.fn ? [it.w, it.h] : sizeOf(it.id);
    const hw = w * sc * (it.carry ? 0.6 : 0.5) + 6;
    const up = h * sc * (it.carry ? 2.2 : 1.05) + 6;
    if (X + hw < 0 || X - hw > v.W || Y - up > v.H || Y + 0.4 * h * sc + 6 < 0) return false;

    let state = it.state, p = it.p || 0;
    if (it.kind === 'building' && marks.length) { const s2 = Director.stateFrom(marks, it, t); if (s2) { state = s2.state; p = s2.p; } }
    if (ov) { if (ov.state) state = ov.state; p = ov.p ?? p; }
    const flip = !!it.flip;
    const o = { t, p, state, seed: it.seed || 0, L, lit: flip ? -L.side : L.side, scale: sc, ...(it.extra || {}), ...((ov && ov.extra) || {}) };
    const rot = (it.rot || 0) + ((ov && ov.rot) || 0);   // radians, clockwise on screen, about the anchor

    // a boat on the water: its wake first, then itself drawn once into a scratch canvas so it can be mirrored
    if (it.wake && it.speed > 0) {
      const dir = flip ? -1 : 1;
      this.item(g, { id: 'fx.wake', x: it.x - dir * w * s * 0.42, y: 0, z: z - 0.001, s, flip, extra: { speed: it.speed, length: w * s * 2.2 } }, v, L, t, marks, box);
    }
    if (it.reflect && Y < v.H && Y > 0) {
      const pad = 4;
      const cw = Math.ceil(w * sc + pad * 2), ch = Math.ceil(h * sc * 1.25 + pad * 2);
      if (cw > 2 && ch > 2 && cw < v.W * 1.5) {
        const S = scratchCanvas('item', cw, ch);
        const sg = S.getContext('2d');
        sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, S.width, S.height);
        sg.setTransform(flip ? -sc : sc, 0, 0, sc, cw / 2, ch - pad);
        this.paint(sg, it, o);
        sg.setTransform(1, 0, 0, 1, 0, 0);
        const left = Math.round(X - cw / 2), top = Math.round(Y - (ch - pad));
        mirror(g, S, 0, 0, cw, ch - pad, Y, { squash: 0.9, alpha: 0.42, amp: Math.max(0.6, 2.2 * sc), slice: Math.max(1, Math.round(v.k * 1.5)), t, phase: it.x * 0.01, dx: left, depth: (ch - pad) * 0.9 });
        g.drawImage(S, left, top);
        box.top = Math.min(box.top, top); box.bottom = Math.max(box.bottom, Y + 4);
        return true;
      }
    }
    g.setTransform(flip ? -sc : sc, 0, 0, sc, X, Y);
    if (rot) g.rotate(flip ? -rot : rot);
    const fade = it.alpha ?? 1;                         // an event may fade a thing out (a wreck tumbling away)
    if (fade < 1) g.globalAlpha = Math.max(0, fade);
    this.paint(g, it, o);
    if (it.carry) for (const cid of it.carry) this.carry(g, it, cid, w, h, o);
    if (fade < 1) g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    box.top = Math.min(box.top, Y - h * sc * (it.carry ? 2 : 1)); box.bottom = Math.max(box.bottom, Y + 2);
    return true;
  }

  paint(g, it, o) {
    if (it.fn) { try { g.save(); it.fn(g, o); } catch (e) { this.err(e); } finally { g.restore(); } return; }
    if (drawAsset(g, it.id, o)) return;
    g.save();
    try { drawStandin(g, it.id, o); } catch (e) { this.err(e); }
    g.restore();
  }

  carry(g, host, id, w, h, o) {
    const c = CARRY[id]; if (!c) return;
    const asset = byId.get(host.id);
    const slot = (asset && asset.slots && asset.slots[c.slot]) || [c.at[0] * w, c.at[1] * h];
    const [cw, ch] = sizeOf(id);
    const k = c.fit[0] === 'h' ? (c.fit[1] * w) / ch : (c.fit[1] * w) / cw;
    g.save();
    g.translate(slot[0], slot[1]);
    g.scale(k, k);
    const ov = this.live && this.live.length ? Director.stateOf(this.live, id, host.x) : null;   // the tower's barrage, the dome's hit
    if (ov && ov.hide) { g.restore(); return; }
    const oc = { ...o, scale: o.scale * k, seed: host.seed || 0, state: ov ? ov.state : undefined, p: ov ? ov.p ?? 0 : 0, ...((ov && ov.extra) || {}) };
    if (!drawAsset(g, id, oc)) { try { drawStandin(g, id, oc); } catch (e) { this.err(e); } }
    g.restore();
  }

  err(e) { this.errors++; console.error('render: ' + (e && e.message)); }
}

export { altitudeOf };
