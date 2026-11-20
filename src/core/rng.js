// Seeded randomness and smooth noise. Never use Math.random() in the scene: every frame must be reproducible.

// mulberry32: a small fast PRNG. rng(seed)() returns 0..1.
export function rng(seed = 1) {
  let a = (hash(seed) ^ 0x9e3779b9) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (arr) => arr[Math.floor(next() * arr.length) % arr.length];
  next.chance = (p) => next() < p;
  return next;
}

// hash(...values) -> uint32. Strings and numbers mix into one seed.
export function hash(...vals) {
  let h = 2166136261 >>> 0;
  for (const v of vals) {
    const s = typeof v === 'number' ? String(Math.round(v * 1000)) : String(v);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= 0x5f; h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// 1D value noise, smooth, -1..1. noise1(x, seed)
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = lattice(i, seed), b = lattice(i + 1, seed);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
function lattice(i, seed) { return (hash(i, seed) / 4294967295) * 2 - 1; }

// fractal 1D noise, -1..1
export function fbm1(x, seed = 0, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += amp * noise1(x * freq, seed + o * 101); norm += amp; amp *= 0.5; freq *= 2.03; }
  return sum / norm;
}

// 2D value noise, -1..1
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const v = (i, j) => (hash(i, j, seed) / 4294967295) * 2 - 1;
  const a = v(ix, iy), b = v(ix + 1, iy), c = v(ix, iy + 1), d = v(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const ease = { out: (t) => 1 - (1 - t) ** 3, in: (t) => t ** 3, inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2) };
