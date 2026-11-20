// Every asset in the scene. Families add their own modules in src/assets/<family>/index.js; nothing is listed here.
import nature from './nature/index.js';
import islands from './islands/index.js';
import city from './city/index.js';
import sea from './sea/index.js';
import air from './air/index.js';
import defence from './defence/index.js';
import fx from './fx/index.js';
import space from './space/index.js';
import aliens from './aliens/index.js';
import { keyedLight } from '../core/light.js';
import { hash } from '../core/rng.js';

export const FAMILIES = [
  { id: 'sky', title: 'Sky and sea' },
  { id: 'nature', title: 'Mountains and clouds' },
  { id: 'islands', title: 'Floating islands' },
  { id: 'city', title: 'City' },
  { id: 'sea', title: 'Boats' },
  { id: 'air', title: 'Aircraft and missiles' },
  { id: 'defence', title: 'Defence' },
  { id: 'fx', title: 'Effects' },
  { id: 'space', title: 'Space' },
  { id: 'aliens', title: 'Aliens' },
];

export const ASSETS = [...nature, ...islands, ...city, ...sea, ...air, ...defence, ...fx, ...space, ...aliens];
export const byId = new Map(ASSETS.map((a) => [a.id, a]));

// drawAsset(ctx, id, o): draw one asset safely. Unknown ids and throws draw nothing and are counted.
export const misses = new Map();
export function drawAsset(ctx, id, o) {
  const a = typeof id === 'string' ? byId.get(id) : id;
  if (!a) { misses.set(id, (misses.get(id) || 0) + 1); return false; }
  ctx.save();
  try {
    const state = a.states.includes(o.state) ? o.state : a.states[0];
    // each body re-bakes at its own moment as the light moves (keyedLight), not all of them in one frame
    const L = o.L && keyedLight(o.L, (hash(a.id, o.seed || 0) % 1024) / 1024);
    a.draw(ctx, { t: 0, p: 0, seed: 0, lit: o.L ? o.L.side : 1, scale: 1, ...o, state, ...(L ? { L } : {}) });
  } catch (e) {
    misses.set(a.id + ':' + e.message, (misses.get(a.id + ':' + e.message) || 0) + 1);
  }
  ctx.restore();
  return true;
}
