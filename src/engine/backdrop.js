// The backdrop: one WebGL2 full-screen shader for the sky, the sun and moon, the stars, three cloud layers, the sea and,
// as the camera climbs, the curve of the Earth and black space. Its colours come from lightAt(), so it and every asset
// share one light. Clouds and the sea are planes in perspective: clouds shrink toward the horizon, waves stretch
// sideways, a climb takes you through the cloud decks and leaves them below you.
//
// renderBackdrop(canvas, { h, altitude, t, x, horizon }) draws one frame on any canvas (the asset page uses it), and
// SKY_ENTRIES lists the sky family for that page.

import { lightAt } from '../core/light.js';
import { VIEW_H, HORIZON, SPACE_Y, altitudeOf } from './view.js';

const VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// The sea's waves: a seeded spread of directions around "toward the viewer" (crests along the horizon), wavelengths
// from 5 units (the eye is 4 up) down to 0.03. x wave numbers are whole multiples of 2 pi / 64 (the sea's x offset wraps
// at 64) and every wave makes whole cycles in 120 s (the shader's time wraps at 120), so nothing ever jumps. Each wave
// also gets two warp weights (WC): its crests bend along two shared noise fields, each wave differently, so the sum
// breaks into short crests instead of long ruled lines.
const WAVES = (() => {
  const TAU = Math.PI * 2, out = [];
  let a = 12345;
  const rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  const n = 18;
  for (let i = 0; i < n; i++) {
    const lam = 5 * 0.75 ** i;
    const k = TAU / lam;
    const spread = 0.7 + 0.5 * (i / (n - 1));
    const th = (rnd() * 2 - 1) * spread;
    const kx = Math.round((k * Math.sin(th)) / (TAU / 64)) * (TAU / 64);
    const kz = Math.sqrt(Math.max(k * k - kx * kx, 0.01)) * (rnd() < 0.15 ? -1 : 1);
    // the chop in the middle of the range is steepest; the long swells and the finest ripples are gentler
    const slope = 0.11 * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, (i + 1) / (n * 0.75))));
    const w = Math.max(1, Math.round((Math.sqrt(1.2 * k) * 120) / TAU));
    out.push({ kx, kz, A: slope / k, w, ph: rnd() * TAU, c: [rnd() * 2 - 1, rnd() * 2 - 1] });
  }
  return out;
})();
const f = (v) => v.toFixed(6);
const WAVE_GLSL = `const vec2 WK[${WAVES.length}] = vec2[${WAVES.length}](${WAVES.map((w) => `vec2(${f(w.kx)}, ${f(w.kz)})`).join(', ')});
const float WA[${WAVES.length}] = float[${WAVES.length}](${WAVES.map((w) => f(w.A)).join(', ')});
const float WW[${WAVES.length}] = float[${WAVES.length}](${WAVES.map((w) => f(w.w)).join(', ')});
const float WP[${WAVES.length}] = float[${WAVES.length}](${WAVES.map((w) => f(w.ph)).join(', ')});
const vec2 WC[${WAVES.length}] = vec2[${WAVES.length}](${WAVES.map((w) => `vec2(${f(w.c[0])}, ${f(w.c[1])})`).join(', ')});`;
const NW = WAVES.length;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;      // backdrop pixels
uniform float uK;       // backdrop px per world unit at z = 1
uniform float uA;       // horizon, px from the top, at sea level
uniform float uAlt;     // 0 sea level .. 1 space
uniform float uCamY;    // camera world y (0 at sea level, negative up)
uniform float uT;       // seconds, wrapped at 120
uniform float uTL;      // seconds, wrapped at 3600 (slow things)
uniform vec3 uTop, uHor, uHaze, uKey, uAmb;
uniform float uKeyAmt, uNight, uStars, uGolden, uNeon, uOver;
uniform vec4 uSun;      // x px, y px, elevation, visible 0..1
uniform vec4 uMoon;     // x px, y px, elevation, visible 0..1
uniform vec3 uCloudOff; // per cloud layer: wrapped x offset in noise cells
uniform vec3 uCover;    // per cloud layer: coverage 0..1
uniform float uSeaX;    // wrapped sea-plane x offset
uniform float uEarthX;  // wrapped offset for the Earth seen from space
uniform vec2 uStarOff;  // star parallax, px
uniform float uPx;      // backdrop px per css px (keeps stars one pixel)
out vec4 outColor;

const float PI = 3.14159265;
${WAVE_GLSL}

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 x, float per) {
  vec2 i = floor(x), f = fract(x), u = f * f * (3.0 - 2.0 * f);
  float x0 = mod(i.x, per), x1 = mod(i.x + 1.0, per);
  float a = hash12(vec2(x0, i.y)), b = hash12(vec2(x1, i.y)), c = hash12(vec2(x0, i.y + 1.0)), d = hash12(vec2(x1, i.y + 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 x, float per, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int o = 0; o < 6; o++) {
    if (o >= oct) break;
    s += a * vnoise(x + vec2(0.0, float(o) * 17.13), per); n += a;
    x *= 2.0; per *= 2.0; a *= 0.5;
  }
  return s / n;
}
// fbm whose octaves fade to their mean once they would be finer than a pixel (fp: noise units per pixel, octave 1)
float fbmAA(vec2 x, float per, float fp) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int o = 0; o < 6; o++) {
    float keep = 1.0 - smoothstep(0.12, 0.4, fp);
    s += a * (keep > 0.0 ? mix(0.5, vnoise(x + vec2(0.0, float(o) * 17.13), per), keep) : 0.5); n += a;
    x *= 2.0; per *= 2.0; a *= 0.5; fp *= 2.0;
  }
  return s / n;
}

// The horizon line, which dips and curves into the Earth's limb as the camera climbs.
float horizonY(float px) {
  float c = smoothstep(0.1, 1.0, uAlt);
  float dx = px - uRes.x * 0.5;
  return uA + uRes.y * 0.1 * smoothstep(0.03, 1.0, uAlt) + c * dx * dx / (2.0 * uRes.x * 1.25);
}

// The sky with no clouds, for a point on the screen: the gradient, the warm band under the sun, the sun and the moon.
vec3 sunCol() { return uKey * (0.75 + 0.6 * uKeyAmt); }
vec3 skyAt(vec2 q, float hy, bool withDiscs) {
  float e = clamp((hy - q.y) / max(hy, 1.0), 0.0, 1.0);
  vec3 c = mix(uHor, uTop, pow(e, 0.5));
  // golden hour: the low sun fills the far hazy air and the whole sky warms toward the horizon colour, peach overhead
  // (option a). Only the sky itself: the water close by reflects the cooler sky above (withDiscs is false there).
  float warm = smoothstep(0.62, 0.36, uSun.z) * smoothstep(0.1, 0.26, uSun.z) * (1.0 - uAlt) * (1.0 - uOver * 0.6);
  if (withDiscs) c = mix(c, uHor * mix(vec3(1.0), vec3(0.9, 0.89, 1.12), e), warm * 0.72);
  // night: the sky goes nearly black, a little light left low down (option b)
  c *= 1.0 - uNight * (0.3 + 0.35 * pow(e, 0.6));
  // haze thickens toward the horizon
  c = mix(c, uHaze, exp(-e * 14.0) * 0.55 * (1.0 - uAlt));
  float space = smoothstep(0.35, 0.95, uAlt);
  // the sun
  vec2 d = (q - uSun.xy) / uRes.y;
  float r = length(d * vec2(1.0, 1.0 + 0.6 * exp(-e * 6.0)));
  float vis = uSun.w;
  float halo = exp(-r * 30.0) * 0.5 + exp(-r * 7.0) * 0.28 * (1.0 - space) + exp(-r * 2.2) * 0.16 * (1.0 - space);
  c += sunCol() * halo * vis * (0.55 + 0.45 * uKeyAmt);
  // the warm band along the horizon on the sun's side, which lingers after sunset
  float band = exp(-e * 7.0) * exp(-abs(q.x - uSun.x) / uRes.x * 2.0);
  c += mix(uKey, uHaze, 0.4) * band * (uGolden * 0.5 + 0.25 * smoothstep(-0.25, 0.0, uSun.z) * (1.0 - smoothstep(0.0, 0.25, uSun.z))) * (1.0 - space);
  if (withDiscs) {
    float rr = uRes.y * 0.0165;
    float disc = smoothstep(rr, rr * 0.86, length(q - uSun.xy));
    c = mix(c, vec3(1.0, 0.97, 0.9) * 1.25 + sunCol() * 0.2, disc * vis);
  }
  // the moon: a disc with dark maria and a soft glow
  float mv = uMoon.w * (1.0 - space);
  if (mv > 0.001) {
    vec2 m = q - uMoon.xy;
    float mr = uRes.y * 0.022;
    float ml = length(m);
    c += vec3(0.62, 0.7, 0.86) * (exp(-ml / (mr * 3.0)) * 0.22 + exp(-ml / (mr * 12.0)) * 0.08) * mv;
    if (withDiscs && ml < mr * 1.1) {
      float mar = fbm(m / mr * 2.2 + 3.0, 4096.0, 4);
      vec3 mc = vec3(0.86, 0.87, 0.84) * (0.78 + 0.3 * smoothstep(0.45, 0.62, mar));
      float shade = 0.55 + 0.45 * clamp(dot(normalize(vec3(m / mr, sqrt(max(0.0, 1.0 - dot(m, m) / (mr * mr))))), normalize(vec3(-0.6, -0.2, 0.8))), 0.0, 1.0);
      c = mix(c, mc * shade, smoothstep(mr, mr * 0.9, ml) * mv);
    }
  }
  return c;
}

// The stars: single pixels that twinkle, two fields, sliding with the camera at a tiny parallax.
float starField(vec2 q, float cell, float density, float seed) {
  vec2 s = q / cell; vec2 id = floor(s); vec2 f = s - id;
  float h = hash12(id + seed);
  if (h > density) return 0.0;
  vec2 pos = vec2(hash12(id + seed + 13.1), hash12(id + seed + 71.7)) * 0.8 + 0.1;
  float dd = length((f - pos) * cell) / uPx;
  float mag = pow(hash12(id + seed + 5.3), 5.0);
  float size = 0.5 + mag * 0.9;
  float tw = 0.7 + 0.3 * sin(uT * 2.0 * PI * floor(30.0 + 90.0 * h / density) / 120.0 + h * 400.0);
  return exp(-dd * dd / (size * size)) * (0.1 + 1.5 * mag) * tw;
}
vec3 stars(vec2 q) {
  vec2 s = q + uStarOff;
  float a = starField(s, 7.0 * uPx, 0.16, 0.0) + starField(s, 23.0 * uPx, 0.5, 41.0) * 1.3;
  float hue = hash12(floor(s / (7.0 * uPx)));
  vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.78), hue);
  // a faint milky way across the sky
  vec2 mw = s / uRes.y;
  float band = exp(-pow((mw.y - 0.35 + 0.42 * (mw.x - 0.5)) / 0.16, 2.0));
  float dust = fbm(mw * 7.0 + 11.0, 4096.0, 5);
  vec3 milky = vec3(0.55, 0.58, 0.72) * band * smoothstep(0.4, 0.8, dust) * 0.12;
  return tint * a + milky;
}

// A cloud deck: a horizontal plane at world height layerY. Above the eye you see its underside, below the eye its top.
// kind 0 cumulus, 1 altocumulus, 2 cirrus. Returns colour and alpha.
vec4 cloudDeck(vec2 q, float hy, float layerY, float scale, float off, float cover, int kind, float thick, vec3 skyHere) {
  if (cover <= 0.01) return vec4(0.0);
  float Fp = uRes.y * 1.05;
  float hAbove = (uCamY - layerY);            // world units, positive when the deck is above the eye
  float r = hy - q.y;                         // px above the horizon
  if (abs(hAbove) < 1.0 || r * hAbove <= 0.0) return vec4(0.0);
  float Z = abs(hAbove) * Fp / abs(r);        // distance along the ground, world units
  float fade = exp(-Z / (abs(hAbove) * 11.0 + 3000.0));
  if (fade < 0.01) return vec4(0.0);
  float X = (q.x - uRes.x * 0.5) / Fp * Z;
  vec2 P = vec2(X / scale + off, Z / scale);
  float per = 256.0;
  vec2 sunDir = normalize(vec2((uSun.x - uRes.x * 0.5) / Fp, 1.0)) * (kind == 2 ? 0.08 : 0.05);
  float n, n2;
  if (kind == 2) {
    vec2 w = vec2(P.x * 0.6, P.y * 2.6);
    w.x += 0.6 * fbm(w * 0.5 + 7.0, per * 0.3, 3);
    n = fbm(w, per * 0.6, 5);
    n2 = fbm(w + vec2(sunDir.x * 0.6, sunDir.y * 2.6), per * 0.6, 5);
  } else {
    // fewer octaves far away, where they would only sparkle
    float o = clamp(5.0 - log2(max(Z / (abs(hAbove) * 4.0), 1.0)), 2.0, 5.0);
    vec2 w = P + 0.35 * vec2(vnoise(P * 0.5 + 3.1, per * 0.5), vnoise(P * 0.5 + 8.7, per * 0.5));
    n = fbm(w, per, int(o));
    n2 = fbm(w + sunDir, per, int(o));
  }
  float lo = 1.0 - cover;
  float soft = kind == 2 ? 0.35 : 0.3;
  float dens = smoothstep(lo, lo + soft, n);
  if (dens <= 0.0) return vec4(0.0);
  float dens2 = smoothstep(lo, lo + soft, n2);
  float sinA = abs(r) / sqrt(r * r + Fp * Fp);
  float tau = dens * thick / max(sinA, 0.04);
  float alpha = (1.0 - exp(-tau)) * fade;
  // light: the edge toward the sun is lit, the far side is in shadow; thin edges glow
  float lit = clamp(0.55 + (dens - dens2) * 1.6, 0.0, 1.0);
  float under = hAbove > 0.0 ? 1.0 : 0.0;
  vec3 shadowC = uAmb * (0.62 + 0.15 * (1.0 - under)) + uTop * 0.12;
  vec3 litC = uKey * uKeyAmt * (under > 0.5 ? 0.95 : 1.25) + uAmb * 0.35;
  vec3 col = mix(shadowC, litC, clamp(lit * 0.85 + (1.0 - dens) * 0.35, 0.0, 1.0));
  // the low sun lights the undersides gold and rose, strongest on the sun's side
  float sunSide = exp(-abs(q.x - uSun.x) / uRes.x * 1.4);
  float low = uGolden + 0.6 * smoothstep(-0.2, 0.0, uSun.z) * (1.0 - smoothstep(0.0, 0.15, uSun.z));
  col += uKey * low * under * (0.35 + 0.65 * sunSide) * (0.5 + 0.5 * (1.0 - dens)) * 0.75;
  // forward scattering near the sun
  vec2 ds = (q - uSun.xy) / uRes.y;
  col += sunCol() * exp(-length(ds) * 6.0) * 0.6 * (1.0 - dens * 0.6) * uSun.w;
  // at night clouds are dark shapes against the sky, faintly warm underneath from the city
  col = mix(col, skyHere * 0.55 + vec3(0.05, 0.03, 0.02) * under * uNeon * exp(-abs(r) / uRes.y * 6.0), uNight * 0.75);
  // far clouds melt into the sky
  col = mix(skyHere, col, 0.25 + 0.75 * fade);
  return vec4(col, alpha);
}

// The sea: a plane below the eye, waves summed as directional sines with analytic slopes, periodic in x so the camera
// offset can wrap. Returns the colour.
vec3 waveSlope(vec2 P, float t, float fx, float fz, out float hgt, out float lostVar) {
  // generated in JS (WAVES below): x components are multiples of 2 pi / 64 so x can wrap at 64, whole cycles per 120 s
  const float TAU = 6.2831853;
  vec2 s = vec2(0.0); hgt = 0.0; lostVar = 0.0;
  // two shared warp fields, periodic in x at 64 like the waves: the coarse one bends the long crests, the fine one
  // breaks the short ones; each fades out where its own cells get smaller than a pixel
  float fpx = max(fx, fz);
  float cw = 1.0 - smoothstep(0.1, 0.4, fpx * 0.25), fw = 1.0 - smoothstep(0.1, 0.4, fpx * 2.0);
  float w1 = (vnoise(P * 0.25, 16.0) - 0.5) * cw, w2 = (vnoise(P * 0.25 + vec2(0.0, 37.0), 16.0) - 0.5) * cw;
  float w3 = fw > 0.0 ? (vnoise(P * 2.0, 128.0) - 0.5) * fw : 0.0, w4 = fw > 0.0 ? (vnoise(P * 2.0 + vec2(0.0, 53.0), 128.0) - 0.5) * fw : 0.0;
  for (int i = 0; i < ${NW}; i++) {
    vec2 K = WK[i];
    float fp = max(abs(K.x) * fx, abs(K.y) * fz) / TAU;   // cycles per pixel
    float keep = 1.0 - smoothstep(0.1, 0.4, fp);
    float kl = length(K);
    float warp = ((w1 * WC[i].x + w2 * WC[i].y) * 1.3 + (w3 * WC[i].y - w4 * WC[i].x) * 0.18) * kl;
    float ph = dot(K, P) - TAU * WW[i] * t / 120.0 + WP[i] + warp;
    float c = cos(ph);
    s += WA[i] * K * c * keep;
    hgt += WA[i] * sin(ph) * keep;
    lostVar += (1.0 - keep) * WA[i] * WA[i] * dot(K, K) * 0.5;
  }
  return vec3(s, 0.0);
}

vec3 seaAt(vec2 q, float hy, out float glint) {
  float Fp = uRes.y * 1.1;
  float d = max(q.y - hy, 0.35);
  float he = 4.0 + max(0.0, -uCamY) / 160.0;   // the eye is a few wave-heights up: chop near, glitter far
  float Z = he * Fp / d;
  float X = (q.x - uRes.x * 0.5) / Fp * Z + uSeaX;
  float fx = Z / Fp, fz = Z * Z / (he * Fp);
  float hgt, lost;
  vec3 sl = waveSlope(vec2(X, Z), uT, fx, fz, hgt, lost);
  // fine ripples from noise, faded with the pixel footprint
  float rf = 1.0 - smoothstep(0.05, 0.3, max(fx / 0.16, fz / 0.07));
  if (rf > 0.0) {
    vec2 rp = vec2((X + uT / 120.0 * 8.0) / 0.16, Z / 0.07 - uT * 0.9);
    float e1 = vnoise(rp, 400.0), ex = vnoise(rp + vec2(0.3, 0.0), 400.0), ez = vnoise(rp + vec2(0.0, 0.3), 400.0);
    sl.xy += vec2((ex - e1) * 0.3, (ez - e1) * 0.5) * rf;
  }
  lost += (1.0 - rf) * 0.012;
  vec3 n = normalize(vec3(-sl.x, 1.0, -sl.y));
  vec3 I = normalize(vec3((q.x - uRes.x * 0.5) / Fp, -d / Fp, 1.0));
  vec3 R = reflect(I, n);
  R.y = abs(R.y) + 0.002;
  // the sky in the reflected direction, sun and moon glow included: the glitter path comes from this
  vec2 qr = vec2(uRes.x * 0.5 + R.x / R.z * Fp, hy - R.y / R.z * Fp);
  vec3 refl = skyAt(qr, hy, false);
  float cosT = max(dot(-I, n), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
  // the water's own colour: deep blue-green, lit by the sky
  vec3 deep = vec3(0.004, 0.03, 0.046) + uAmb * 0.05 + uKey * uKeyAmt * 0.02;
  deep += vec3(0.0, 0.05, 0.055) * max(hgt * 14.0, 0.0) * uKeyAmt;  // light through the wave crests
  vec3 col = mix(deep, refl * 0.8, fres);
  // sun and moon glints: sharp where the waves are resolved, a wider column where they are not
  vec3 S = normalize(vec3((uSun.x - uRes.x * 0.5) / Fp, (hy - uSun.y) / Fp, 1.0));
  float rough = 0.0009 + lost * 1.2;
  float shin = 1.0 / rough;
  float sd = max(dot(R, S), 0.0);
  float sunUp = uSun.w * step(0.0, uSun.z + 0.02);
  glint = pow(sd, shin) * min(shin / 700.0, 2.5) * sunUp;
  // glitter: facets smaller than a pixel still flash the light. Each 3x1 px cell gets a random facet tilt as large as
  // the waves the pixel lost, drawn again five times a second (hashed from the cell and the time step, so a given t
  // always gives the same frame); the few that line up with the sun sparkle, so they fall inside the glitter path.
  vec2 cid = floor(vec2(q.x / (3.0 * uPx), q.y / uPx)) + floor(uT * 5.0) * vec2(17.0, 31.0);
  vec2 jit = vec2(hash12(cid), hash12(cid + 7.7)) - 0.5;
  float sig = sqrt(lost) * 3.5 + 0.03;
  vec3 Rm = reflect(I, normalize(vec3(-sl.x - jit.x * sig, 1.0, -sl.y - jit.y * sig)));
  Rm.y = abs(Rm.y) + 0.002;
  float spark = pow(max(dot(Rm, S), 0.0), 2500.0);
  // (the sparkles are pixel-sized facets: from high up they would be whole bays, so they go as the Earth comes in)
  glint += (pow(sd, 90.0) * 0.16 + spark * 2.5 * (1.0 - smoothstep(0.2, 0.5, uAlt))) * sunUp * (1.0 - 0.6 * uOver);
  col += sunCol() * glint * 2.4;
  vec3 M = normalize(vec3((uMoon.x - uRes.x * 0.5) / Fp, (hy - uMoon.y) / Fp, 1.0));
  float md = max(dot(R, M), 0.0);
  float mg = pow(md, shin * 0.8) * min(shin / 900.0, 2.5) + pow(md, 120.0) * 0.1 + pow(max(dot(Rm, M), 0.0), 2500.0) * 0.7;
  col += vec3(0.7, 0.78, 0.95) * mg * uMoon.w * 0.9;
  // nearer water is darker; the far water melts into the haze line
  float near = smoothstep(0.0, uRes.y - uA, d);
  col *= mix(1.0, 0.6, near);
  float hz = exp(-d / (uK * 9.0));
  col = mix(col, mix(uHaze, uHor, 0.5), hz * 0.6 * (1.0 - uAlt));
  return col;
}

// The Earth from high up: ocean, weather and city lights, an atmosphere that thickens to the limb.
vec3 earthAt(vec2 q, float hy) {
  float hp = max(uRes.y - hy, 1.0);
  float e2 = clamp((q.y - hy) / hp, 0.0, 1.0);
  // the ground in perspective: distance grows toward the limb, so the weather there is foreshortened into thin bands
  // and the near weather is broad (before this the depth flattened out and the clouds smeared into vertical beams)
  float zz = 0.5 / (e2 + 0.15);
  float py = zz / (e2 + 0.15) / hp;           // ground distance per pixel down the screen
  vec2 P = vec2((q.x - uRes.x * 0.5) / uRes.y * zz * 1.4 + uEarthX, zz);
  float day = clamp(uKeyAmt * 1.1 + 0.05, 0.0, 1.0) * (1.0 - uNight * 0.85);
  vec3 ocean = mix(vec3(0.010, 0.030, 0.070), vec3(0.03, 0.12, 0.30), day);
  // weather systems: the cloud field is bent by a slow warp so it swirls instead of tiling
  vec2 wq = P + 0.6 * vec2(vnoise(P * 0.9 + 3.0, 4096.0) - 0.5, vnoise(P * 0.9 + 11.0, 4096.0) - 0.5);
  float cl = fbmAA(wq * 3.0 + vec2(uTL * 0.0006, 0.0), 4096.0, py * 3.0);
  float sw = fbmAA(P * 1.2 + 4.0, 4096.0, py * 1.2);
  float clouds = smoothstep(0.5, 0.78, cl + 0.12 * sw);
  vec3 cloudC = mix(vec3(0.06, 0.07, 0.10), vec3(0.95, 0.96, 1.0), day);
  vec3 col = mix(ocean, cloudC, clouds * 0.92);
  // land masses here and there, warm at night with cities
  float land = smoothstep(0.62, 0.68, fbmAA(P * 1.5 + 20.0, 4096.0, py * 1.5));
  col = mix(col, mix(vec3(0.02, 0.025, 0.02), vec3(0.32, 0.30, 0.20), day), land * (1.0 - clouds) * 0.85);
  float lights = smoothstep(0.82, 0.95, vnoise(P * 140.0, 4096.0)) * (1.0 - smoothstep(0.2, 0.6, py * 140.0)) * land * (1.0 - clouds) * uNight;
  col += vec3(1.0, 0.72, 0.4) * lights * 0.8;
  // sun glint on the ocean
  col += sunCol() * exp(-length((q - vec2(uSun.x, hy + (uRes.y - hy) * 0.25)) / uRes.y) * 7.0) * 0.25 * day * (1.0 - clouds);
  // the atmosphere thickens toward the limb
  vec3 atm = mix(vec3(0.03, 0.06, 0.16), vec3(0.32, 0.55, 0.95), day);
  col = mix(col, atm, pow(1.0 - e2, 6.0) * 0.85);
  return col;
}

void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float hy = horizonY(q.x);
  float space = smoothstep(0.35, 0.95, uAlt);
  vec3 col;
  float glint = 0.0;
  if (q.y < hy) {
    col = skyAt(q, hy, true);
    float lum = dot(col, vec3(0.3, 0.55, 0.15));
    col += stars(q) * uStars * (1.0 - smoothstep(0.08, 0.45, lum));
    // the atmosphere's thin blue rim over the limb, seen from high up
    float above = (hy - q.y) / uRes.y;
    col += vec3(0.28, 0.52, 1.0) * (exp(-above / 0.006) * 0.9 + exp(-above / 0.04) * 0.25) * space * (0.35 + 0.65 * (1.0 - uNight * 0.7));
  } else {
    vec3 sea = seaAt(q, hy, glint);
    col = space > 0.0 ? mix(sea, earthAt(q, hy), space) : sea;
  }
  // three cloud decks, far to near: cirrus, altocumulus, low cumulus
  vec3 skyHere = mix(uHor, uHaze, 0.5);
  float cloudFade = 1.0 - smoothstep(0.45, 0.85, uAlt);
  vec4 c0 = cloudDeck(q, hy, -5200.0, 2600.0, uCloudOff.x, uCover.x, 2, 0.5, skyHere);
  // high up, the cirrus still overhead thins out: drawn full against the dark sky it followed the limb in hard rings
  col = mix(col, c0.rgb, c0.a * cloudFade * (q.y < hy ? (1.0 - space) * (1.0 - space) : 1.0));
  vec4 c1 = cloudDeck(q, hy, -2600.0, 1100.0, uCloudOff.y, uCover.y, 1, 0.8, skyHere);
  col = mix(col, c1.rgb, c1.a * cloudFade);
  vec4 c2 = cloudDeck(q, hy, -900.0, 700.0, uCloudOff.z, uCover.z, 0, 1.4, skyHere);
  col = mix(col, c2.rgb, c2.a * cloudFade);
  // a little of the sun's glare over everything
  vec2 ds = (q - uSun.xy) / uRes.y;
  col += sunCol() * exp(-length(ds) * 16.0) * 0.18 * uSun.w;
  // gentle film curve and dither so gradients never band
  vec3 over = max(col - 0.72, 0.0);
  col = min(col, vec3(0.72)) + 0.28 * (1.0 - exp(-over / 0.28));
  col += (hash12(q) + hash12(q + 17.31) - 1.0) / 255.0;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const NAMES = ['uRes', 'uK', 'uA', 'uAlt', 'uCamY', 'uT', 'uTL', 'uTop', 'uHor', 'uHaze', 'uKey', 'uAmb', 'uKeyAmt',
  'uNight', 'uStars', 'uGolden', 'uNeon', 'uOver', 'uSun', 'uMoon', 'uCloudOff', 'uCover', 'uSeaX', 'uEarthX', 'uStarOff', 'uPx'];

const wrap = (v, p) => ((v % p) + p) % p;
const c255 = (c) => [c[0] / 255, c[1] / 255, c[2] / 255];

// Weather: how cloudy each deck is, varying slowly with place and time (pure: a function of x and t only).
export function weather(x, t, seed = 0) {
  const s = (a) => Math.sin(a);
  const u = x / 26000 + seed * 1.37, v = t / 900;
  const base = 0.5 + 0.28 * s(u * 2.1 + 0.4) * s(u * 0.77 + 1.9) + 0.12 * s(v * 2 + u);
  return [
    Math.max(0, Math.min(1, 0.32 + 0.3 * s(u * 1.3 + 2.2) + 0.1 * s(v * 3.1))),   // cirrus
    Math.max(0, Math.min(1, (base - 0.3) * 0.9)),                                  // altocumulus, absent in fair spells
    Math.max(0, Math.min(1, 0.18 + 0.32 * s(u * 1.7 + 4.1) * s(u * 0.53) + 0.08 * s(v * 2.3 + 1))), // low cumulus
  ];
}

export class Backdrop {
  constructor(canvas, { preserve = false } = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, preserveDrawingBuffer: preserve, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    this.prog = p;
    this.u = Object.fromEntries(NAMES.map((n) => [n, gl.getUniformLocation(p, n)]));
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  // s: { W, H (backdrop px), k (px per unit), A (horizon px), camX, camY, t, L, px (backdrop px per css px), seed }
  render(s) {
    const { gl, u } = this;
    const { W, H, L } = s;
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.prog);
    const alt = s.alt ?? altitudeOf(s.camY);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uK, s.k);
    gl.uniform1f(u.uA, s.A);
    gl.uniform1f(u.uAlt, alt);
    gl.uniform1f(u.uCamY, s.camY);
    gl.uniform1f(u.uT, wrap(s.t, 120));
    gl.uniform1f(u.uTL, wrap(s.t, 3600));
    gl.uniform3fv(u.uTop, c255(L.sky.top));
    gl.uniform3fv(u.uHor, c255(L.sky.horizon));
    gl.uniform3fv(u.uHaze, c255(L.haze));
    gl.uniform3fv(u.uKey, c255(L.key));
    gl.uniform3fv(u.uAmb, c255(L.ambient));
    gl.uniform1f(u.uKeyAmt, L.keyAmt);
    gl.uniform1f(u.uNight, L.night);
    gl.uniform1f(u.uStars, L.stars);
    gl.uniform1f(u.uGolden, L.golden);
    gl.uniform1f(u.uNeon, L.neon);
    gl.uniform1f(u.uOver, L.overcast || 0);
    // sun and moon on screen: x from the light, y from the elevation above the (sea-level) horizon
    const hy = s.A + H * 0.1 * smooth(0.03, 1, alt);
    const sunVis = clamp01((L.sun.elev + 0.06) / 0.08);
    gl.uniform4f(u.uSun, L.sun.x * W, hy - L.sun.elev * s.A * 0.92, L.sun.elev, sunVis);
    const moonVis = L.moon.up ? clamp01(L.moon.elev / 0.06) * clamp01(L.night * 1.4) : 0;
    gl.uniform4f(u.uMoon, L.moon.x * W, hy - L.moon.elev * s.A * 0.85, L.moon.elev, moonVis);
    // clouds slide at their own parallax and drift with the wind
    const cover = s.cover || weather(s.camX, s.t, s.seed || 0);
    const over = L.overcast || 0;
    gl.uniform3f(u.uCover, Math.min(1, cover[0] + over * 0.3), Math.min(1, cover[1] + over * 0.5), Math.min(1, cover[2] + over * 0.6));
    gl.uniform3f(u.uCloudOff,
      wrap((s.camX * 0.06 + s.t * 2.0) / 2600, 256),
      wrap((s.camX * 0.12 + s.t * 4.0) / 1100, 256),
      wrap((s.camX * 0.25 + s.t * 6.0) / 700, 256));
    gl.uniform1f(u.uSeaX, wrap(s.camX * 0.0148, 64));
    gl.uniform1f(u.uEarthX, wrap(s.camX * 0.00004, 4096));
    gl.uniform2f(u.uStarOff, wrap(s.camX * 0.012 * s.k, 7 * 23 * 64 * (s.px || 1)), -s.camY * 0.004 * s.k);
    gl.uniform1f(u.uPx, s.px || 1);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// One frame on any canvas, for the asset page: renderBackdrop(canvas, { h, altitude, t, x, horizon }).
const BACKDROPS = new WeakMap();
export function renderBackdrop(canvas, { h = 17.5, altitude = 0, t = 0, x = 0, horizon = HORIZON, seed = 0, cover = null, overcast = 0 } = {}) {
  let b = BACKDROPS.get(canvas);
  if (!b) { b = new Backdrop(canvas, { preserve: true }); BACKDROPS.set(canvas, b); }
  const W = canvas.width || canvas.clientWidth || 640, H = canvas.height || canvas.clientHeight || 360;
  const camY = altitude * SPACE_Y;
  const L = lightAt(h, { altitude, overcast });
  b.render({ W, H, k: H / VIEW_H, A: H * horizon, camX: x, camY, alt: altitude, t, L, px: 1, seed, cover });
  return b;
}

// The sky family, shown on the asset page beside the drawn assets.
export const SKY_ENTRIES = [
  { id: 'sky.dawn', title: 'Sky at dawn', about: 'Blue overhead, rose at the horizon, the sun just up on the left.', h: 6.2, altitude: 0, ref: 'refs/elements/sky-dawn.webp' },
  { id: 'sky.day', title: 'Sky by day', about: 'Deep blue to pale horizon haze, cumulus and cirrus lit from the sun side.', h: 12.5, altitude: 0, ref: 'refs/elements/sky-day.webp' },
  { id: 'sky.dusk', title: 'Sky at dusk', about: 'The sun on the horizon, a warm band under it, clouds gold and rose underneath.', h: 18.3, altitude: 0, ref: 'refs/elements/sky-dusk.webp' },
  { id: 'sky.night', title: 'Sky at night', about: 'Stars that twinkle, the milky way, the moon and its glow, clouds nearly black.', h: 22.5, altitude: 0, ref: 'refs/elements/sky-night.webp' },
  { id: 'sky.sea', title: 'The sea', about: 'Waves in perspective, fresnel sky reflection, the sun\'s glitter path, the haze line.', h: 17.4, altitude: 0, horizon: 0.25, ref: 'refs/elements/sea-day.webp' },
  { id: 'sky.sea-night', title: 'The sea at night', about: 'Dark water with the moon\'s path; the city lights streak into it from the 2D layers.', h: 23.5, altitude: 0, horizon: 0.25, ref: 'refs/elements/sea-night.webp' },
  { id: 'sky.stars', title: 'The stars', about: 'Two star fields and a faint milky way; they slide at 1/80 of the camera\'s speed.', h: 1.0, altitude: 0.2, horizon: 0.98, ref: null },
  { id: 'sky.clouds', title: 'The cloud decks', about: 'Cirrus, altocumulus and cumulus decks in perspective; a climb passes through them.', h: 15.5, altitude: 0.18, horizon: 0.62, ref: null },
  { id: 'sky.earth', title: 'The Earth from space', about: 'The limb\'s curve, its thin blue atmosphere rim, weather and city lights, black space.', h: 13.0, altitude: 1, ref: 'refs/slice/vertical-slice.webp' },
];
