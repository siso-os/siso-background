// The projection every layer, the backdrop and the events share. World units; the view is 1080 units high.
//   sx = W/2 + k z (x - camX)
//   sy = horizon + k (z (y - camY) + D(z))
// k is device pixels per unit at z = 1. D(z) is how far below the horizon a thing on the water at depth z sits when the
// camera is at sea level: the city (z 1) sits just under the horizon, the near boats (z 1.3) well below it, as in the
// reference paintings. Far things (small z) slide less and sit nearer the horizon.

export const VIEW_H = 1080;
export const HORIZON = 0.72;              // fraction of the screen height where the sea meets the sky at ground level
export const LEVELS = [0, -1900, -6900];  // camera y for ground, clouds, space
export const SPACE_Y = LEVELS[2];
export const D = (z) => 14 * z ** 7;

// How far the view is zoomed in (1: the view is 1080 units high). main.js sets it from ?zoom=. The view zooms about the
// middle of the screen, not the horizon, so the islands above stay in frame and the horizon drops a little.
// The world is placed at zoom 1, so zoom changes only what you see, never where things are.
let ZOOM = 1;
const ANCHOR = 0.5;
export const setZoom = (z) => { ZOOM = Number.isFinite(z) && z > 0 ? z : 1; };
export const zoom = () => ZOOM;
// where the horizon sits on a screen H high at the current zoom
export const horizonAt = (H) => H * (ANCHOR + ZOOM * (HORIZON - ANCHOR));

// The altitude the light and the backdrop use: 0 at sea level, 1 in space.
export const altitudeOf = (camY) => Math.max(0, Math.min(1, -camY / -SPACE_Y));

export function makeView(W, H, camX, camY) {
  const k = (H / VIEW_H) * ZOOM;
  const A = horizonAt(H);
  const v = {
    W, H, k, A, camX, camY,
    sx: (x, z) => W / 2 + k * z * (x - camX),
    sy: (y, z) => A + k * (z * (y - camY) + D(z)),
    // world x at screen x for depth z
    wx: (px, z) => camX + (px - W / 2) / (k * z),
    // world y at screen y for depth z
    wy: (py, z) => camY + ((py - A) / k - D(z)) / z,
    // the visible world-x span at depth z, with a margin in units
    span: (z, m = 0) => [camX - W / 2 / (k * z) - m, camX + W / 2 / (k * z) + m],
  };
  return v;
}
