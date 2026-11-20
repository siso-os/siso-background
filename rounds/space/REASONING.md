# Space soul: explosions, fire and smoke, the moon, the space palace, portals and aliens

## What these pieces are for, in The brief's words

- fx carries the war: "missiles raining down like rain", "hellfire swarms where it's like 50 missiles", "cities die",
  "flying cities can fall and take down other buildings". Every hit, intercept, burning roof and smoke column on the
  city is one of these pieces, drawn small and often.
- space is where Shift+W ends: "you go into space ... space cities and on the moon ... a floating space palace ... being
  attacked".
- aliens: "sometimes portals and aliens come out and then all of these guys start shooting the aliens".
- The bar for all three: "I like the neon as well but I like it looking hyper realistic", "really, really fucking
  nice", "not too heavy".

## Three moments he sees them

1. A glance at the T3 background while he works. The scene sits dimmed behind the chat; an explosion is 20-60 px, a
   smoke column 80-200 px, a missile trail a hairline. What reads there is motion, brightness and silhouette: a white pop,
   a dark plume leaning in the wind, an orange glow under smoke at night. Detail inside a puff does not read; its lit and
   shadow sides do.
2. The lock screen. One still frame, full size, held for minutes. Here a frozen explosion must look like a photograph
   of one: a hot core, rolling cauliflower smoke with a lit side, sparks frozen as streaks. The moon and the palace are
   the hero shapes of the space level and are judged closest.
3. Scrolling the site with Shift+D. Things slide by at parallax; loops must not visibly repeat in a 10 s window, and a
   once effect must have a shape at every p (no frame where it is a flat disc or nothing).

## What exists

- CONTRACT.md: draw at the origin, bottom centre, facing right; pure function of o.t / o.p / o.seed; light from o.L;
  cache static bodies; never throw; free: true for pieces that leave their box.
- src/core/paint.js: shade(), glow() (additive radial), vgrad/hgrad, windowLights(), cached() (an offscreen canvas per
  key, LRU of 400). src/core/light.js: lightAt() gives key/ambient/haze colours, night, keyHeight, side, and space.
- References: option-d-storm (black oily smoke columns with fire at their feet; missiles with thin grey smoke trails
  and orange heads; the shield-hit as concentric blue rings around a white-hot point), art/isles/fx/city-dust (a
  tan-grey dust billow, warm lit top-left, cool shadow underneath), refs/slice/vertical-slice (the cratered grey moon
  with gold domes on a rock shelf; the white-and-gold palace: a domed, spired cathedral inside a flat elliptical ring,
  hanging spires below, small ships firing orange bolts, sparks and smoke where they hit). refs/elements/portal-
  aliens.webp is named in my brief but has not arrived yet; I will look again before every pass.

## Hardest piece: smoke (it is inside explosion, fireball, smoke, intercept, trail, dust, debris and the fire tops)

1. One radial gradient per puff, many puffs. Cheapest to write and to draw (~1 µs a puff). Reads as soft grey balls:
   no lit side, no billow edges. This is exactly the "clip art" look the bar forbids.
2. Baked lit puff sprites. Once per session bake six 128 px puff shapes: a union of lumps (cauliflower) eroded by
   fractal noise, with normals from the height field, lit from the key side; tint them per (tone, light key) into small
   canvases, cached. A second, fixed-colour emissive sprite, lit from below, is drawn with 'lighter' wherever fire sits
   under the smoke. A frame is then only drawImage calls (~2-4 µs each). Cost: ~5 ms bake per tint the first time a
   light key is seen; ~40 drawImages for a big plume, ~0.15 ms. Gain: real billows with a sunlit side, dark core,
   eroded edges, and fire-lit undersides at night.
3. Per-pixel volume: raymarch 3D noise into ImageData each frame. The truest look, but 10-50 ms a frame per plume,
   and it cannot be cached because it moves.

Pick: 2. The same sprites, tinted differently, give black war smoke, white intercept puffs, tan collapse dust, white
water mist and grey trail smoke, so every fx piece shares one material and they sit together in a frame.

## The details that sell "hyper-real", per family

- fx: light from inside. Fire and fireballs drawn additively so overlapping tongues go white-hot at the core and orange
  at the edge (a blackbody ramp, never a flat orange); the smoke above them lit orange from underneath at night and
  sunlit on the key side by day; sparks as motion-blurred streaks, not dots; a short anamorphic streak on flashes.
- space: hard light, no ambient. One side lit near-white, the other side nearly black except for gold catching the
  light and windows glowing warm from inside; a thin hot rim on the terminator side. The moon's craters lit by raking
  light near its terminator and flat near the bright limb, as a real moon is.
- aliens: wet and alive. Dark glossy skin with a specular streak on the key side, translucent membranes back-lit by
  their own green-violet bioluminescence, glow that pulses slowly like breathing. The portal lights the sea under it.

## Calls I made

- Space light. Space has no air, so space pieces do not take the hour's sky colour: their key light is near-white sun
  (a quarter of L.key mixed in, so dusk still warms it a little) at full strength from o.lit, with almost no ambient.
  This lives in src/assets/space/_lib.js.
- fx.wake: the stern is the right end of the box (x = +w/2) and the wake trails to the left, so the asset page shows
  it centred and the box holds it. The engine places it at stern.x - w/2.
- fx.trail and fx.tracer read o.points; with none they draw a default arc so the asset page shows them. Trail kind is
  o.kind, else the state (enemy, siso, contrail). Both are free: true.
- fx.tracer: points run from the gun (first) to the target (last); the rounds travel that way.
- Two pieces beyond the brief, both reuse the smoke material: fx.dust (the tan collapse billow from art/isles/fx, for
  "cities die") and fx.embers (sparks drifting up over a burning block at night).
- Box sizes. tools/check.mjs compares Chrome's float32 getTransform() with a double scale using !==, so any box whose
  160/max(w,h) is not exact in float32 fails "left the transform changed" even when draw() does nothing. I sized every
  box so max(w,h) is one of 32, 40, 64, 80, 128, 160, 256, 320, 512, 640. The tools owner should compare with a
  tolerance; then the boxes can be anything.
- fx.fire is free: true. Its smoke and embers rise out of the box by design.
- Space fill light. Hard black shadows hid the palace's dark side completely; a real station's shadow side is lit faintly
  by the planet below, so the space light has a cool fill (36, 40, 56) and ambient (12, 13, 18).
- space.moon in air: the dark limb is occluded by how much air there is (L.space), and the lit face is added on top, so
  the night sky shows through the unlit part, the way the real moon looks from the ground. States are phases
  (gibbous, full, half, crescent); o.phase overrides with any 0..1.
- space.moon-city has a night state (the sun on the far side; only its own lights).
- space.palace hit is once, 2.6 s. Hits on it are vacuum bursts (space/_lib vacuumBurst): flash, a hot sphere that
  cools and fades, sparks and debris in straight lines, a vapour ring, no rising smoke.
- aliens: a fifth piece, aliens.drifter (the jellyfish), because the reference is full of them. The walker is the same
  animal on legs, so the family reads as one species tree. The portal draws its reflection on the sea under it unless
  o.reflect === false (over land).

## Pass 1

All 25 pieces built; `tools/check.mjs --family fx,space,aliens` passes. Shots: pass1-<name>.webp (the probe's grid:
every state at 8h, 12h, 18.5h, 22h). Weakest first:

- space.moon: blown out by day. The lit face is added ('lighter') onto a bright blue sky, so it clips to white and the
  maria vanish. Good at night. Biggest single fault in the family.
- aliens.portal: by day the additive filaments sum to white on the blue sky and the green and violet are lost; it only
  reads at dusk and night. The tunnel is good; the open state's middle is milky grey.
- aliens.craft: reads as a white delta jet, a paper plane, not the ref's bronze biomech manta; the die blast is a brown
  ball four times the craft's size that hides it.
- fx.splash: cotton balls sitting on the water. A shell splash is a column of spray: thin, jagged, translucent, falling
  back; mine is opaque puffs.
- fx.shield-hit: concentric rings and a hex grid, a target from a UI, not light on a field.
- fx.fire: the flames are a row of identical orange spikes; clip art at this size.
- fx.explosion, fx.debris burst, fx.dust billow, fx.intercept: the same fault, smoke that reads as balls of cotton
  (round puffs of even size with soft edges). Better than flat fills, not yet real.
- aliens.flyer: a shark fin. The ref's flyers spread both wings like a manta seen from the front quarter.
- space.station: a diagram: flat panels on a line, no depth, ladders not wings.
- space.satellite: at night the wings become a white wireframe grid.
- aliens.walker: reads well (the harvestman legs are the right strange); the bell's organs are cartoon squiggles.
- aliens.drifter: the best of the aliens; same organ squiggles.
- space.palace, space.moon-city: hold up at this scale. The palace is the strongest piece.
- fx.trail, fx.tracer, fx.smoke, fx.embers, fx.flash: fine at this scale; the wake is nearly invisible at grid size.

## Pass 2

Each piece beside its reference (probe `&ref=` or the strip page), the biggest difference fixed. Shots: pass2-<name>.webp.

- space.moon (ref vertical-slice): by day the moon is now screened onto the sky, not added, so it can't clip; the
  occluding disc is sky-coloured under air and black in vacuum. The maria now show at noon. pass2-moon.
- aliens.portal (ref portal-aliens): white mixing cut, the green and violet saturated, a dark bruise annulus around
  the ring by day so the light has something to glow against, a reflection pool under it. pass2-portal.
- aliens.craft (ref portal-aliens): a new manta planform (curled wing tips, a long tail, scales and ribs), bronze
  and gold, not white; the die blast is sized to the craft. pass2-craft.
- fx.splash: the cotton column is now 56 ballistic jets of water, each a tapering streak with a droplet at its tip,
  a white root and flat mist. pass2-splash.
- space.moon-city (ref moon-city): the biggest difference was the bright grey plate under the city. Now the apron
  is overlapping soft drifts of regolith kept inside the bake (the old one was cut off square at the bake's edge),
  with craters, at the ref's mid grey; warm light from the domes pools on the ground. Dome interiors are a town in
  three depths with tiny windows, not boxes; the lattice is denser; the towers are shorter (the ref's are about
  twice the big dome, mine were nearly three times). pass2-moon-city.
- space.palace (ref space-palace): the deck was an empty grey plate; the ref's disc is built over. Added rows of
  white-and-gold houses with lit windows on ellipses around the cathedral, small and dim behind, larger in front.
  pass2-palace.
- fx.fire: the flame sprite was a teardrop, so every tongue was the same spike. Now each of the 5 sprites forks
  into 1 to 3 licks, the column is bent by turbulence and the top is eaten into ragged holes. The smoke was a
  chain of 8 cotton balls; now 12 to 40 faint puffs overlap into one column, stretched and sheared as they climb.
  Day licks are dimmed so they don't sum to white on a blue sky. pass2-fire.
- fx.shield-hit: no stroked circles. A soft wavefront band, the hex cells faint and patchy where it passes, and
  branching crackles of discharge re-struck 24 times a second. pass2-shield-hit.
- fx.explosion (and so the craft's death and intercept): 30 smaller lumps at part alpha instead of 16 opaque ones,
  and a stem of 14 jittered lumps instead of 6 discs. pass2-explosion.

Not reached this pass: flyer (still a fin from the side), station (flat), satellite's night wireframe, the walker's
organ squiggles. `tools/check.mjs --family fx,space,aliens --min 22`: 25 assets, 114 drawings, PASS.

## Pass 3

`rounds/space/lineup.html?h=<hour>&s=<scale>`: all 25 pieces at one scale (0.42 px per unit, so their sizes are true to
each other), sky things on one band and ground things on another, under the hour's light. Each label carries the
piece's warm draw time (mean of 12 draws after the one that bakes its caches). Shots: pass3-lineup-dusk.webp (18.5h),
pass3-lineup-night.webp (22h), pass3-scale03-night.webp (8 key pieces at scale 0.3 in 400x250 cells).

What the lineup showed, and what I fixed:
- aliens.walker: at its true size beside the palace it was an "M" of legs; the bell (30 wide, clear jelly) vanished
  against a dusk sky. The bell is now 42 x 36 with a dense gut-and-muscle mass inside it, so it holds a shape by day
  and glows at night.
- fx.dust: at a small scale lod cut it to a few opaque puffs, cotton balls again, and pushed them into two clumps.
  Now 26 to 48 part-transparent puffs whatever the scale, squat and wide along the ground, the middle stays put: one
  cloud.
- Timing: quiet machine, `node $S/dom.mjs rounds/space/lineup.html?h=22`: worst piece 0.24 ms (portal), and 0.33 ms
  at 18.5h (shield-hit), every piece under the 0.5 ms bar. The dusk shot was taken while the machine was loaded (an
  earlier headless run timed out), so its labels read up to 2.4 ms (smoke); those numbers are load, not the pieces.
- At scale 0.3 the palace, portal, moon-city and explosion read at a glance; the walker is a small cyan glow on
  legs; the craft is a dark manta with green bolts.

## Still weak

- fx.splash and fx.wake: nearly invisible at true scale against the ground band and at night; they need water and
  the scene's fire light under them to read. Not checked over water.
- space.station: still a diagram (flat panels on a truss), the weakest space piece; satellite's wings go to a white
  grid at night.
- aliens.flyer: a fin seen from the side, not the ref's manta-from-the-front-quarter.
- The smoke material (puff sprites) still shows each puff's rim when few overlap; denser, fainter puffs fixed fire,
  explosion and dust, but debris and intercept still use few.
- aliens.portal draws its reflection column under it unless the scene passes `reflect: false`; in the sky the
  scene must pass it.
- space.palace: the deck is built over now, but the ref's warm, gold-lit undersides and its second and third disc
  tiers are still missing; the shield bubble greys it out by day.
