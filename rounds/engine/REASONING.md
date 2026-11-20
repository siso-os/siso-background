# Engine soul: reasoning

## What my pieces are for (The brief's words)

"let's compress this into one scene ... I like how it moves, the background moves and it scrolls horizontally across
... maybe the sky changes slowly ... the stars and sky move slightly differently to the bottom ... shift A to go left,
shift D to go right ... shift W goes up ... you go into space ... I like the neon as well but I like it looking hyper
realistic". And from the 19th: "really, really fucking nice" and "not too heavy".

The engine is the stage every other soul's assets stand on: the sky, the sea, the light that moves through a day, the
camera that drifts and that he can steer, the endless strip of places, and the director that makes things happen at
fixed moments. If the sky and sea are wrong, no asset can rescue the frame; if they are right, even stand-ins read as a
place.

## Three moments he sees it

1. **A glance at the T3 background while he works.** A wide, quiet frame: big sky, a small city on the horizon, the sea.
   It must read in half a second as "golden hour over a bay" and must not flicker or pop. The drift is slow (40 u/s);
   nothing jumps. The sky changes so slowly he notices it only between glances.
2. **The lock screen.** One still frame, full size, scrutinised. Here the hyper-real details carry it: the sun's bloom,
   the glitter path on the water, the haze line at the horizon, the city reflected and broken by ripples, stars that
   are points not blobs.
3. **Scrolling the site with Shift+D.** The parallax must feel physical: stars almost still, far mountains slow, the
   city faster, the near boats fastest, the sea surface scrolling at the speed of the boats that sit on it. Shift+W
   lifts him through the clouds into space in 3 s, and the Earth's limb curves away below.

## What exists

- `CONTRACT.md`: units (view 1080 high, y down, sea at 0, space near -6000), assets anchored bottom centre, `z` depth
  with parallax and haze by `1 - z`, everything a pure function of `t`.
- `src/core/light.js`: `lightAt(hour, {altitude})` gives sky top/horizon, haze, key light, ambient, sun and moon in
  screen fractions, night, windows, neon, stars, and darkens toward space. My shader takes its colours straight from it
  so the sky and every asset share one light.
- `src/core/paint.js`: `shade`, `glow`, `windowLights`, `cached`. The stand-ins use them so they light like the real
  assets will.
- `src/core/rng.js`: `rng`, `hash`, noise. The world and director are seeded from it.
- `src/assets/registry.js`: `drawAsset` returns false for an unknown id: that is my cue to draw a stand-in.
- The refs: the four options (same world: a golden, c painted sunset, b neon night, d storm raid), the sky and sea
  element plates, the vertical slice (sea, city, island amid clouds, the Earth's limb, the moon and the palace).

What the options teach about scale: the horizon sits at about 73% of the frame height; the city is a thin strip sitting
right on it, its tallest spire about 110 px of 667 (about 180 units); the floating islands hang at about half height;
the boats are in the lower quarter; mountains are low (50 to 80 units) and pale with haze.

## The hardest piece: the backdrop (sky, clouds, stars, sea, Earth)

1. **One full-screen WebGL2 fragment shader** that computes the sky gradient, sun and moon with bloom, stars, three fbm
   cloud bands with their own parallax, a plane-projected sea (wave normals, fresnel sky reflection, sun and moon
   glitter, haze line), and the Earth's limb as the camera climbs. Cost: the most code, GLSL to tune, slow under the
   check's software GL. Gain: every pixel is lit by the same `lightAt`, the glitter path follows the sun, clouds turn
   gold at sunset and black at night, nothing tiles or repeats, about 1 ms on an M1 at reduced resolution.
2. **Canvas 2D gradients plus baked noise sprites** (cloud puffs, a tiling sea normal texture drawn with offsets).
   Cost: simple. Gain: none of the light is real: the glitter cannot track the sun, clouds look pasted, and tiles show.
3. **Photo plates crossfaded by hour** (what the isles version did). Ruled out: the contract says everything is code,
   and plates cannot climb to space or scroll forever.

**Pick: 1**, rendered at a capped pixel count (about 2 Mpx) and stretched, with the 2D layers on top at full sharpness.

## Details that sell "hyper-real"

- Sky: the sun's bloom in three falloffs (disc, halo, wide Mie glow) and a warm band along the horizon under it; the
  haze line where sky meets sea; cloud bands lit from the sun side, gold and rose undersides at low sun, nearly black at
  night with a moonlit rim; stars as single pixels that twinkle, sliding at 1/100 of the camera's speed.
- Sea: a real plane projection, so waves shrink toward the horizon and stretch sideways; fresnel, so the far water
  mirrors the sky and the near water is dark; the sun's glitter column broken by the wave normals; at night the moon's
  path and the city's lights as long vertical streaks.
- Layers: aerial perspective (haze that compounds with depth and is thicker near the water), reflections that are
  mirrored, squashed, cut into moving ripple slices and faded, a night bloom around lights.

## Calls I made

- **Where things on the water sit.** A strict pinhole cannot match the options: there the city sits on the horizon and
  the boats, which are drawn far larger than perspective would allow, sit well below it. So a thing on the water at
  depth `z` sits `D(z) = 14 z^7` units below the horizon (city at z 1: 14; near boats at z 1.3: 88; z 1.4: 148) and is
  scaled by `z`. Vertically everything still moves by `z` times the camera's climb. Screen: `sx = W/2 + k z (x - camX)`,
  `sy = horizon + k (z (y - camY) + D(z))`, `k = H/1080`, horizon at 72% of the height. All in `src/engine/view.js`.
- **Haze on the main layer.** The brief says haze by `1 - z`, which gives the city at z 1 none; the options show the
  city clearly hazed. I use `H(z) = hazeMax * ((1.1 - z) / 1.1)^0.7`, so the main layer gets a little, the near layer
  none, and haze compounds from far bins to near ones and is thicker near the water.
- **Camera after keys.** "When keys stop it coasts": the extra speed eases to a stop over about a second, the view
  rests where he left it, and after 15 s idle it eases back up to the drift. Shift is required for A/D/W/S (so plain
  typing never moves it); the arrow keys work with or without Shift.
- **Levels.** Ground y 0, clouds y -1900, space y -6900. A critically damped spring moves between them (settles in
  about 3 s), so a second press mid-climb retargets without a stall.
- **The asset sizes I guessed for stand-ins** live in `src/engine/standin.js`; real assets bring their own `w`/`h`.
  The tower and the shield dome are fitted to the island's width (tower height 0.5x, dome width 1.05x), so they sit
  right whatever size the city soul draws them.
- **`fx.*` and `aliens.*` have stand-ins too.** `src/assets/required.js` lists them and the self-test
  `standins-cover-required` checks every required id has a size, so they get soft glows and dark shapes of the right
  size until the effects and aliens souls draw them.
- **Events are placed on the camera's auto path.** The director puts each event at `x0 = autoX(t0)` (the camera's own
  untouched path), so with no input every event plays on screen and `?t=` shows the same thing to anyone.
- **Determinism is checked with a tolerance, not a hash.** Reading a canvas back once can move it from GPU to CPU
  drawing, which changes antialiasing in the last bit. The self-test draws `t=37.25` twice and requires a mean
  difference under 0.002 per layer (measured: at most 0.0001), and a different `t` to differ by more than 0.01.
- **Freeze mode redraws on resize.** A resize clears every canvas, and headless Chromium resizes once after load, so
  `?freeze=1` frames came out with no 2D layers. `main.js` keeps the frozen `t` and redraws it in the resize handler.
- **`tools/engine-check.mjs` cannot read its own MAE (not mine to edit).** `magick compare -metric MAE` exits 1 and
  writes `x (0.05)` to stderr when the images differ, and exits 0 with nothing on stdout when they are the same. The
  tool does `Number(out.split('(')[1])`, which is `Number("0.05)")` or `Number(undefined)`: NaN either way. So it
  always prints `MAE NaN` and fails both of those checks (`FAIL (2)`). The other measurements it prints pass (noon
  0.634, night 0.064, space top 0.060, 1083 stars). A copy with `parseFloat` in place of `Number` (the only change, plus
  an absolute import path), run from my scratchpad, prints `move 0.0515 same 0.0000` and `PASS`.
- **`tools/shoot.mjs` crops off the bottom 87 px of every shot (not mine to edit).** It opens the window 87 px taller
  and crops the top `h` rows, assuming a browser bar. But headless `--screenshot` uses the whole window as the viewport
  (`--dump-dom` is the mode that loses 87 px: a 1200x600 window reports `innerHeight` 513 there, and a screenshot of
  the same window has the frame filling all 600 rows). So its shots show the top 811 of an 811-row frame cut to 724:
  the horizon lands at 81% instead of 72%, and the sea looks half as deep. My Pass 1 shots went through it; Pass 2 and
  3 shots are taken at exactly `w x h` with no crop, by a copy that drops `CHROME_BAR`.
- **Canvases are sized `100%`, not `100vh`.** `100vh` is the large viewport on phones (address bar hidden), which is
  taller than `innerHeight`, the size the canvases are drawn at, so the frame was stretched. `position: fixed; inset:
  0; width: 100%; height: 100%` takes the real viewport.

## Pass 1

Shot with `tools/shoot.mjs` at 1600x900 (so the bottom 87 px are cut off, see above): `pass1-golden.webp` (17.0),
`pass1-dusk.webp` (18.3), `pass1-night.webp` (22.5), `pass1-noon.webp` (12), `pass1-clouds.webp` (cloud level),
`pass1-space.webp` (space). The weakest thing in each piece:

- **Sky (noon):** the sun's halo clipped to white channel by channel, so it showed coloured rings. Now a soft shoulder
  above 0.72 instead of a clip, and a two-sample dither of one full step.
- **Bloom (dusk):** the whole sunlit city glowed; the bright pass took lit walls, and golden light raised the amount.
  Now only windows and neon set the amount, and the threshold went from about 72% to 85%.
- **Night streaks:** almost nothing under the night city. (The real cause turned up in Pass 2.)
- **Clouds level:** the cloud-bank stand-in read as cotton balls (26 opaque round puffs). Now 70 wide, faint puffs
  piled higher in the middle, a grey underside and a flat base.
- **Sea:** glassy, with long ruled lines and no glitter. Fixed in Pass 2.
- **Space:** reads well (limb, rim, stars, the sun's glare). Weakest is the satellites' stand-in crosses, which are
  for the space soul to replace.

## Pass 2

Each option beside my frame at its hour, 2172x724, no crop: `pass2-vs-a.webp` (17.4), `pass2-vs-b.webp` (21.5),
`pass2-vs-c.webp` (18.3); the frames alone are `pass2-a/b/c.webp`. Mean colour of a 6 px row, before and after against
the option:

| row | a before | a after | option a | b before | b after | option b | c before | c after | option c |
|---|---|---|---|---|---|---|---|---|---|
| y 40 (top) | 113,128,168 | 198,168,157 | 220,174,155 | 15,19,36 | 8,10,17 | 2,8,15 | 98,86,122 | 89,77,111 | 97,79,105 |
| y 200 | 141,142,162 | 213,183,154 | 235,181,152 | 20,25,43 | 12,16,26 | 3,12,22 | 127,95,115 | 135,95,105 | 142,91,91 |
| y 690 (sea) | 94,88,83 | 51,50,50 | 54,66,68 | 10,15,26 | 5,9,13 | 17,17,21 | 90,63,59 | 44,33,34 | 48,40,48 |

What changed and why:

- **Scale: the horizon was at 81%, not 72%.** The shooting tool cut off the bottom of the frame (see Calls). With a
  true shot the horizon is at 72%, the option's 73%. The floating islands hung in the middle of the sky; the options
  hang them in the upper third, so they went up about 170 units (home island's underside now at about 25%).
- **Sky, golden hour (a):** the option's whole sky is peach, ours was blue overhead. Between sun elevations 0.62 and
  0.1 the sky now warms toward the horizon colour (pinker overhead), peaking at 17.0 to 17.6 and gone by 18.3, where
  option c's sky is purple overhead again. Only the sky warms: the water reflects the sky without it, so the sea stays
  blue-teal under a peach sky, as in the option.
- **Sky, night (b):** ours was a mid navy; the option is nearly black. The night sky now darkens by 30% at the horizon
  to 65% overhead, faint stars are dimmer, and night clouds are dark shapes (they had been lit brighter than the sky).
- **Sea:** the eye was 1 unit above waves up to 7 units long, so the nearest swells filled a third of the screen and
  read as a glassy pond. The eye is now 4 units up, waves run 5 units down to 0.03, steepest in the middle of the
  range, with a wider spread of directions and each wave's crests bent by two shared noise fields, so the near water
  breaks into chop. The water's own colour is darker and the sky reflection weaker (0.92 to 0.8).
- **Glitter (c had none under the sun):** sub-pixel facets now flash. Each 3x1 px cell gets a random facet tilt as big
  as the waves the pixel can no longer show, redrawn 5 times a second from a hash of the cell and the time step (so a
  given `t` is always the same frame); the few that line up with the sun sparkle, and only inside the glitter path. A
  soft column under the sun is added too. The moon gets the same, dimmer.
- **Night streaks:** the real bug was that a brightness filter never lifts alpha. The streak is the bright band
  averaged down to one row, and the average of a few lit windows over transparent pixels has tiny alpha, so it stayed
  faint however bright it was made. Now the row is added to itself (`lighter`, doubling), which lifts alpha with colour.
  The threshold follows the dark (any lit window at night, near-white only by day, so sunlit walls stay in the mirror),
  only lights within 24% of the frame above the waterline throw streaks (not islands in the sky), and each slice
  catches the light or misses it from a hash, so the streaks are broken dashes like option b's, not smooth wiggles.
- **Reflections:** shorter and weaker (main layer 0.44 to 0.3 alpha, squash 0.85 to 0.62) and broken into gaps, as
  the options' city reflections are short and patchy.

## Pass 3

The climb at 17.4 h, 1600x900, no crop: `pass3-climb-y0/y950/y1900/y4400/y6900.webp`. Then 60 s of auto-scroll, one
frame every 10 s at 1600x600: `pass3-strip-t0` to `pass3-strip-t60.webp`. All of them are in `lineup.html`. What
jarred, and what changed:

- **The Earth from high up was vertical beams of white (y4400, y6900).** Its depth mapping flattened out: from a third
  of the way down the disc to the bottom of the screen, the ground distance changed by only 0.08, so the weather noise
  was constant top to bottom and smeared into stripes. Now the ground is in perspective: distance is `0.5 / (e + 0.15)`
  from the limb down, and across the screen it widens with distance. Far weather is foreshortened into thin bands at the
  limb, near weather is broad, as in the vertical slice. A slow warp bends it into swirls. Each noise octave fades to
  its mean once it would be finer than a pixel (`fbmAA`), so the limb doesn't fizz. City lights fade the same way.
- **The cloud banks had hard vertical seams (y950, y1900).** The stand-in placed puffs across the full width, and the
  ones near the ends ran past its canvas and were cut straight down. Every puff now stays inside. Each puff also faded
  to a darker rim, which drew a smoky outline round every one; it now fades in its own lit colour, and the underside
  gradient alone does the shading.
- **The cirrus overhead made hard rings along the limb (y4400).** The deck at 5200 sits just above the camera there.
  Against a dark sky, its streaks follow the curved horizon and read as planetary rings. Above the horizon it now thins
  by `(1 - space)²`; below the eye it is unchanged.
- **The sea's pixel sparkles showed through the Earth as snow (y4400).** Each sparkle is a sub-pixel facet; from high
  up a pixel is a whole bay. They fade out between altitude 0.2 and 0.5; the soft glitter column stays.
- **The strip had three to five floating islands in every frame.** The options show one or two. The small far island
  now comes in about 30% of chunks, not 60%, and never over the home bay, which already has two. Its random draws are
  still made, so every later placement in the chunk (the city, the boats) stays where Pass 2 tuned it.

The strip shows nothing else jarring. The city, the open sea and the next shore change over in haze. The day moves on,
so the sun sinks across the minute. Boats come in on the events. Nothing pops: the islands bob and the sea moves at
whole cycles per 120 s.

The selftest passes after the changes: all 9 checks, deterministic to 0.0001.

## Still weak

- **Stand-ins carry the frame.** Islands are inverted triangles with blocks, the city is grey boxes, satellites are
  crosses, and the moon city is a brown cap on the moon. Every one is drawn by `standin.js` until the asset souls' real
  drawings land. The engine does the light, haze, reflections and bloom for them with no change.
- **The near sea at golden hour still shows fine horizontal banding** (`pass3-strip-t30.webp`, bottom third): the
  long, shallow swells line up. It is quieter than Pass 1, but option a's near water is choppier and bluer.
- **Moon sparkles at night are a little noisy** (`pass2-b.webp`), because the glitter's 5 Hz step reads as twinkle on
  a dark sea.
- **Cloud banks at the clouds level are soft blurs** (`pass3-climb-y1900.webp`). The stand-in is radial gradients
  cached at half resolution, nowhere near the vertical slice's sunlit cumulus towers. That needs a real asset or a
  volumetric pass, not more puffs.
- **Cost is unmeasured on a real GPU.** Headless Chromium renders WebGL in software, so its timings say nothing about
  the 0.5 ms target. The Earth now does about 30 noise samples a pixel, but only when it is in view (from altitude 0.35
  up). The sea's 18-wave loop is the heaviest per-pixel cost at ground level.
