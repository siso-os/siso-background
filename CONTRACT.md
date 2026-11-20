# SISO Background: the contract

Every piece of the scene follows this file, so pieces built by different agents fit together and the asset page can
show every one of them. Change it only by PR, with the reason in the PR.

The owner, 20 Nov 2026: "make all of these assets ourselves in code ... and you can reuse them, tweak them slightly ...
use the images as bases to try to match to and keep to ... I like it looking hyper realistic ... we have an asset
page ... all the components that we've made ... that way an agent will never forget what we've already built and
where it lives".

## 1. The look

- **Hyper-real, cinematic, long lens.** Lighting does the work: one sun (or moon) for the whole frame, a lit side and a
  shadow side on every solid thing, a rim of light on the sun side, haze that grows with distance, lights that bloom at
  night, reflections on the water. No outlines, no flat fills, no cartoon shapes, no game-art bevels.
- **Small cities, big sky.** At the main depth a tall skyscraper is about 260 world units in a 1080-unit-high view.
- **Match the references.** `refs/` holds the paintings each asset is matched to (from Sol, `refs/manifest.json`),
  and `art/` holds the earlier photo cut-outs (tower, islands, buildings, boats). Three passes per asset: build, compare
  your render beside the reference, fix the worst difference.
- **Everything is code.** Canvas 2D for every asset; the engine's WebGL shader for the sky, the sea and the clouds. No
  image files inside an asset. (Images stay in `art/` and `refs/` as references and in the asset page.)

## 2. Time is the only state

Everything on screen is a pure function of time. Nothing accumulates frame by frame, so any moment can be drawn on its
own: the engine can jump to 21:00 or to second 12 of a raid, the asset page can scrub, and a check can shoot any frame.
Randomness comes from `rng(seed)` in `src/core/rng.js`, never `Math.random()`.

## 3. Units and coordinates

- World units. The view is 1080 units high whatever the screen; the engine scales to pixels.
- `y` grows **downward** as in canvas. Sea level is `y = 0`; the sky is negative `y`; space starts near `y = -6000`.
- An asset draws itself **at the origin, anchored at its bottom centre** (the point that sits on the ground, the
  water or the hover point), at scale 1, facing right. The caller translates, scales and flips.
- Depth: every placed thing has `z` in (0, 1.5]. `z = 1` is the main plane (the city), smaller is farther. The engine
  scrolls a thing by `z` times the camera move and hazes it by `1 - z`. Assets never apply haze themselves.

## 4. An asset module

One file per asset: `src/assets/<family>/<name>.js`, default export:

```js
export default {
  id: 'city.tower-siso',      // '<family>.<name>', unique, kebab-case; the file name is <name>.js
  family: 'city',             // one of FAMILIES below
  title: 'SISO tower',        // what a person reads in the asset page
  about: 'The SISO spire on the home island; raises the shield and fires the barrage.', // one line
  w: 140, h: 560,             // bounding box in world units, anchor at bottom centre (x from -w/2 to w/2, y from -h to 0)
  states: ['idle', 'shield', 'barrage', 'hit'],   // first is the default; the asset page shows one button each
  loop: 8,                    // seconds the asset page loops t over for looping states (0 = still)
  once: { construct: 6, collapse: 4 },  // states that play once: seconds; o.p runs 0 to 1 over that time
  variants: 4,                // how many seeded looks it has (o.seed 0..variants-1); 1 if none
  ref: 'refs/elements/siso-island.webp',   // the image it is matched to, or null
  draw(ctx, o) { },           // draws it. Must leave ctx's transform, alpha and composite as it found them
};
```

`o`, the draw options, always has:

| Field | Meaning |
|---|---|
| `t` | seconds since the scene started (looping states read this) |
| `p` | 0 to 1 progress through a once state; 0 otherwise |
| `state` | one of `states` |
| `seed` | integer; the variant and any per-instance randomness: `rng(o.seed)` |
| `L` | the light at this moment: `lightAt()` in `src/core/light.js` (sun, sky colours, night amount, windows lit) |
| `lit` | which side the key light hits in the asset's own frame: `1` right, `-1` left (the engine sets it after a flip) |
| `scale` | how many screen pixels one world unit is now: draw less detail below 0.5 |

Extra fields an asset reads (a target, a path, a colour) are named in its `about` line and have defaults.

Rules:
- **Light it from `o.L`.** Base colours go through `shade()`, windows through `windowLights()`, glows through `glow()`
  (all in `src/core/paint.js`). A building at 03:00 and at 13:00 must look like the same building in different light.
- **Reuse and tweak.** Variants come from `o.seed`: heights, window rows, colours within a family palette, roof kit.
- **Cheap enough to draw 200 per frame** at 60 fps on a laptop. Cache a static body in an offscreen canvas keyed by
  `(id, seed, state, quantised light)` when it is costly; animate only what moves.
- **Never throw.** An unknown state draws the default.

## 5. Families and owners

| Family | What | Owner (who may edit) |
|---|---|---|
| `sky` | the sky, sun, moon, stars, clouds and sea shader (backdrop entries, not draw modules) | engine |
| `nature` | mountain ranges, cloud banks, rocks | city soul |
| `islands` | SISO islands, enemy islands, small rocks; floating, with boosters | city soul |
| `city` | the SISO tower, buildings, cranes, bridges, cars, people | city soul |
| `sea` | speedboats, police boats, smugglers, ferries, yachts, cargo, warships | machines soul |
| `air` | airliners, jets, drones, helicopters, rocket ships, missiles | machines soul |
| `defence` | air defence, artillery, missile silos, shield domes | machines soul |
| `fx` | explosions, fire, smoke, debris, flashes, trails, wakes, splashes, shield hits | space soul |
| `space` | the moon, moon city, the space palace, stations, satellites, attack ships | space soul |
| `aliens` | portals, aliens, alien craft | space soul |

Each family has `src/assets/<family>/index.js` exporting an array of its modules; `src/assets/registry.js` joins them.
Add an asset by adding its file and one line in its family's index. Nothing else.

## 6. The ids the engine and the events rely on

Events call these by id, so they must exist with at least these states (more is fine):

- `islands.siso-home` (idle, boost), `islands.siso-small` (idle, boost), `islands.enemy` (idle, boost, fire, hit, fall),
  `islands.enemy-small` (idle, boost, fall)
- `city.tower-siso` (idle, shield, barrage, hit), `city.crane` (idle, build)
- buildings, each with (idle, construct, collapse, ruin): `city.skyscraper-glass`, `city.skyscraper-deco`,
  `city.skyscraper-twist`, `city.office`, `city.residential`, `city.neon-block`, `city.spire`
- `city.car`, `city.people` (idle, run, cheer), `city.bridge`
- `nature.mountains-alpine`, `nature.mountains-desert`, `nature.mountains-volcanic`, `nature.mountains-arctic`,
  `nature.cloud-bank`
- `sea.speedboat`, `sea.police-boat` (idle, chase), `sea.smuggler` (idle, flee), `sea.ferry`, `sea.yacht`, `sea.cargo`,
  `sea.warship` (idle, fire)
- `air.airliner`, `air.jet-siso` (idle, fire), `air.jet-enemy` (idle, fire), `air.drone`, `air.helicopter`,
  `air.rocket-ship` (idle, launch), `air.missile` (idle, siso, enemy)
- `defence.sam-launcher` (idle, fire), `defence.ciws` (idle, fire), `defence.artillery` (idle, fire),
  `defence.silo` (idle, open, fire), `defence.shield-dome` (idle, hit)
- `fx.explosion`, `fx.fireball`, `fx.fire`, `fx.smoke`, `fx.debris`, `fx.flash`, `fx.intercept`, `fx.shield-hit`,
  `fx.trail` (reads `o.points`: `[[x, y], ...]` in its own frame, newest last), `fx.wake`, `fx.splash`, `fx.tracer`
- `space.moon`, `space.moon-city`, `space.palace` (idle, attack, hit), `space.station`, `space.satellite`,
  `space.attack-ship` (idle, fire)
- `aliens.portal` (open, hold, close), `aliens.walker` (idle, walk, die), `aliens.flyer` (idle, fly, die),
  `aliens.craft` (idle, fire, die)

## 7. Tools

- `tools/serve.py [port]`: a static server for the repo (ES modules do not load from `file://`).
- `tools/probe.html?asset=<id>&state=<s>&h=<hour>&t=<sec>&p=<0..1>&seed=<n>&bg=sky|grey|black`: draws one asset,
  large, on its own. Its `<pre id="result">` holds JSON: painted pixels, bounds, errors.
- `node tools/shoot.mjs <url> <out.png> [width height]`: a headless Chromium screenshot of any page of the repo
  (it starts and stops its own server).
- `node tools/check.mjs [--family <f>]`: loads every asset in every state at noon and at midnight; fails on a throw, an
  empty drawing, a drawing far outside its box, a missing required id or state, or an asset without a line in its
  family index. Prints PASS or FAIL last.
