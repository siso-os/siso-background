// The fx family: one import and one entry per asset file in this folder. See CONTRACT.md section 5.
// Shared material (noise, the baked smoke puffs, flames, the heat ramp) is in _lib.js.
import explosion from './explosion.js';
import fireball from './fireball.js';
import fire from './fire.js';
import smoke from './smoke.js';
import debris from './debris.js';
import flash from './flash.js';
import intercept from './intercept.js';
import shieldHit from './shield-hit.js';
import trail from './trail.js';
import wake from './wake.js';
import splash from './splash.js';
import tracer from './tracer.js';
import dust from './dust.js';
import embers from './embers.js';

export default [
  explosion, fireball, fire, smoke, debris, flash, intercept, shieldHit, trail, wake, splash, tracer, dust, embers,
];
