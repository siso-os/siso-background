# Polish round: the five weakest-looking things in the real scene

## What these pieces are for, in The brief's words

"I like the neon as well but I like it looking like hyper realistic ... use the images as bases to try to match to and
keep to, and on the third iteration you'll usually get that." (20 Nov) and "making it actually beautiful and really,
really fucking nice. Like the components." (19 Nov).

The mountains, the clouds, the night skyline, the boats and the station are the things the eye lands on first in the
scene: the band of mountains on the horizon in every ground frame, the cloud level when he presses Shift+W, the
skyline every night, the boats crossing the bay, the station when he goes into space. If any of them reads as clip art
the whole frame reads as a game.

Three moments he sees them:
1. A glance at the T3 background while he works: the skyline and the mountains at 40 to 150 px tall, the clouds big.
   Only silhouettes, large light and dark shapes and lights matter here.
2. The lock screen: a still frame, looked at for a few seconds. Gradients, haze and bloom carry it.
3. The asset page and Shift+D scrolling: pieces big, where flat fills and missing detail show.

## What exists

- CONTRACT.md: one light (o.L, o.lit), haze is the engine's (hazeAt(z): about 0.69 for the far mountains at z 0.17),
  pure functions of t, cached bodies.
- core/paint.js: shade(), glow(), cached(), windowLights(); nature/_lib.js: the per-pixel relief bake (also used by the
  islands, so its exported helpers keep their behaviour), noise; sea/_lib.js: the machines kit (re-exported by air and
  defence, so I add boat helpers in a new sea/_hull.js and leave the kit alone); space/_lib.js: the hard space sun (lc,
  cylX, cylY, bloom, nav), owned by the space soul, used read-only.
- The references: refs/elements/mountains.webp (three ridgelines stepping back in pink haze, the front one lit gold on
  its spurs), sky-day/dusk/dawn.webp, option-a/b/c/d, art/isles/cutouts/boat-*.webp.

## Before: what makes each group read as clip art (shot before-*.webp)

1. **Mountains** (before-mountains.webp). Every range is a rectangle: the crest saturates (clamp(v * 1.1)) into a flat
   plateau and the ends drop like walls. The surface is gully noise at 13 world units, which at scene scale (0.12 px a
   unit) is a 2 px crinkle: crumpled cloth. Back ridges are barely hazier than front ones, so there is no air between
   them. The volcano is a smooth cone with thick orange noodles on it.
   Fix: (a) a crest profile with a few dominant peaks, long shoulders and low saddles, no plateau; (b) shading from the
   broad form (the slope of the blurred crest, i.e. one lit face and one shadow face per spur) with gullies at 40+
   units and much weaker; (c) strong internal aerial perspective: each farther ridge mixes toward the sky haze and its
   foot dissolves into mist, so a dark crest stands against the pale foot of the ridge behind it. Volcano: radial
   ribs on the cone, no lava channels; a faint red crater glow, smoke, and one or two hair-thin threads that only show
   at night.
2. **Clouds** (before-clouds.webp). The relief bake gives every cloud a bumped, normal-mapped surface of sphere caps:
   popcorn and snow drifts. Edges are hard and the base is as white as the top.
   Fix: build each cloud from many soft puffs painted as lit radial gradients (bright toward the sun, grey toward the
   base), blurred together; a flat greyer base cut softly; a sun-side rim (the mask minus itself shifted toward the
   sun, blurred, added); thin wisps at the edges. Colours from the hour: white and blue-grey by day, gold tops and rose
   undersides at sunset, dark slate with a moonlit rim at night.
3. **City at night** (before-city-night.webp). Facades go almost black and the lit windows are sub-pixel at true
   scale, so they average to grey; neon lines are 0.6 units wide (a third of a pixel); no light hangs in the air.
   Fix: brighter, more saturated window light (warm homes, cool offices, some floors dark); neon edges and rooftop
   signs wide enough to read, in magenta, cyan and amber on the neon blocks and the twist; a crown light on every tower;
   a soft halo of light in the air around the bright ones; beacons with a hot core. All gated on L.windows / L.neon so
   noon does not change.
4. **Boats** (before-boats.webp). Correct shapes in flat fills: one vertical gradient per hull, glass as a flat tint,
   flat black rectangles for shadows, no specular, no waterline wetness, no clutter.
   Fix: a hull form pass (bright band under the sheer where the flare catches the sky, dark turn of the bilge, the lit
   quarter and the shadowed quarter from o.lit, a sharp specular line along the sheer); wet dark boot stripe with a
   highlight and foam; glass that mirrors the sky (dark top, bright horizon streak) and shows lit cabins at night;
   soft shadows under every overhang; rails and antennas as thin lit lines; deck clutter.
5. **Station** (before-station.webp). Rectangles with a near-uniform grey, a 2D truss, panels as flat blue grids.
   Fix: cylinders lit hard (specular line, terminator, black lower side, faint blue earthshine), quilted blanket
   seams, gold foil with crinkle highlights; a box truss drawn as a front and a back face so it has depth; solar wings
   with a frame, cell lines and a glint band that slides along them as they turn; radiators; blinking lights.

## The hardest piece: the clouds. Three ways

1. Keep the relief bake and soften it (lower normal strength, bigger caps). Cheap to try, but the look is still a lit
   height field: it can never get the light passing through thin edges or the soft volume. Gain small.
2. Many soft lit puffs into an offscreen canvas, blurred with ctx.filter, with a base and a rim pass, cached per seed
   and quarter hour. Costs a few ms once per bake and a drawImage per frame. Gain large: this is how the soft volume and
   bright edges in sky-day.webp read.
3. A per-pixel volume (density from noise, light marched toward the sun). The most real, but the bake is 10 to 50x the
   cost for clouds 1600 units wide, and it must re-bake each quarter hour. Too heavy.
Pick: 2.

## What sells hyper-real per family

- Mountains: aerial perspective (each ridge paler and bluer than the one in front) and the warm lit face against the
  cool shadow face.
- Clouds: the bright sun-side edge and the grey flat base.
- City at night: bloom and the light hanging in the air; neon edges that spill.
- Boats: the specular line along the sheer and the wet dark waterline with foam.
- Station: hard light: black shadow sides and one specular glint.

## Calls I made

- The brief fixes the URLs only for the clouds and the city at night. The mountains, boats and station are shot from
  rounds/polish/stage.html (show=mountains | boats | station), my own page, the same URL before and after.
- sea/_lib.js is shared by air and defence, nature/_lib.js by the islands: I leave their exported helpers' behaviour
  alone and put new helpers in new files (sea/_hull.js, nature/_puffs.js).
- Mountains: _range.js builds its own ridgelines (a few massifs of very different size on long shoulders, smooth-maxed)
  instead of the shared helper, and the floor of each ridge now undulates and sinks over the outer third, so a high back
  layer ends as a falling shoulder, not a table cut off at a cliff.
- Clouds: all three moved to nature/_puffs.js (soft lit puffs, blurred body, lobe layer, mask, rim). The old _cloud.js
  relief cloud is no longer imported but kept, since nothing is deleted.
- City at night: bloom comes from a separate light layer (windows and neon painted twice, the copy blurred and added),
  never from a blur of the walls, which would ring a tower with a dark fringe. Every night light is gated on
  dusk(L) = smooth(0.1, 0.6, L.windows), so the noon city is pixel-for-pixel the old one.
- Neon: the brief asks for neon on the neon-block and the twist. On glass towers and spires it is now rare (about 1 in
  3 seeds) and only one tube (the sunward edge plus the top roofline). On every edge of every tower it read as a
  wireframe, not a city.
- Windows: when a window is 3 px or more, each pane is drawn on its own with a ceiling highlight and the odd blind.
  Smaller, the old run strips stay (single panes at 1 px read as noise).
- Boats: sea/_lib.js is shared, so the hull form, glass, rails, clutter and the new raking grade (rake(): cool on the far
  end, warm on the sun end, darker low) live in sea/_hull.js.
- Station: the space sun from space/_lib is frontal, so modules had no dark side. station.js swings it to the side
  (sideSun) for its own shading only, so every cylinder has a lit half and a black half. The wings turn on a 60 s loop
  and a glint band sweeps along them with the angle: a pure function of t.
- Volcano: the plume's 26 radial gradients a frame are one cached puff sprite drawn 26 times (0.49 to 0.06 ms).
- Cost: rounds/polish/timing.html times every nature, city and sea piece and the station at s 0.33 over 90 frames.
  Quiet machine (pass 2): every piece this round touched had a mean under 0.15 ms. Pass 3 rerun on a machine at load
  average 34 to 38: ferry 0.43 to 0.55, speedboat 0.40 to 0.45, station 0.28 to 0.30, the rest lower. Pass 3 changed no
  boat code, so I read that as load, not a regression.
- Pass 3 dims the night city where the engine's water clips. The night streaks in engine/water.js average the lights
  above the waterline and multiply by up to 22, so a brighter city turns them into white bars. The engine is not mine,
  so the city emits less: own bloom scaled down when small (the renderer's bloom already spreads it), fewer and
  patchier lit floors.

## Pass 1: every group from flat fills to lit forms (pass1-*.webp)

- Mountains: two to four ridgelines per range, each farther one paler and bluer with its foot in mist; shading from
  the broad form so each spur has a lit face and a shadow face; gullies broad enough to read at scene size; snow on the
  alpine and arctic crests; the volcano's cone with radial ribs, a crater glow, smoke and thin lava threads at night.
- Clouds: rebuilt as soft puffs (option 2 above): blurred body, lit lobes, a flat grey base, a sun-side rim, wisps;
  gold tops and rose bases at sunset, slate with a moon rim at night.
- City: the light layer and bloom; warm homes and cool offices with whole floors dark; neon tubes wide enough to read;
  beacons with a hot core; a crown glow on the tall ones.
- Boats: hull form (sky band under the sheer, dark bilge, lit and shadowed quarter), specular sheer line, a wet boot
  stripe, glass that mirrors the sky and shows lit cabins at night, rails, antennas, deck clutter.
- Station: first shaded cylinders, foil, a two-face truss, wings with cell lines.

## Pass 2: each group against its reference, the biggest difference fixed (pass2-*.webp)

- Station vs vertical-slice.webp: the biggest gap. Lit from the front, the modules had no black side, the foil read as
  blotches, and the wings were flat. Rebuilt station.js: a side-swung sun (pixel check: shadow half about 20/255, lit
  limb about 235), small high-contrast foil facets, a box truss with a dimmer back face, struts and equipment boxes,
  radiators, a docking capsule, a robot arm, rotary joints, and turning wings with a glint band that slides along them
  (pass2-station is at t 33 to show it).
- Clouds vs sky-day.webp: the lobes stood on the outline like beads. They are now sunk into the head, blurred 7 to 8
  units, with shoulder lobes deeper and bigger, and cumulus heads built as three or four towers of different height.
- City vs option-b: neon on every edge read as wireframe. It is cut to a few towers with one tube each, and large
  windows are single panes.
- Boats vs the boat cutouts: hulls were evenly lit. rake() adds the one light: warm on the sun end, cool on the far one.
  The speedboat's ellipse-and-circle driver is a seated figure now.
- Mountains vs mountains.webp: back layers ended in flat tables. The floor now falls away at the ends. Volcano cost was
  fixed at the same time.

## Pass 3: the real scene, and what looked out of place next to the rest (pass3-*.webp)

Shot index.html?freeze=1&day=999999&t=30 at golden hour (&h=17.4), night (&h=21.5), the cloud level (&h=12&y=-1900)
and space (&h=21.5&y=-6900), all 1600x900 --exact.
- Cloud level: the worst thing in any frame. Each bank was a long loaf with an even crinkled top, a caterpillar next
  to the reference's separate cauliflower heads. The bank's top line is now a soft max of four to six domes of very
  different height (one towering) over a cushion, so the dips between heads are shoulders of one mass. Tall heads get
  big lobes inside the face, each shading the one behind, so the face reads as cauliflower. Noon puffs see a little
  more sun (+0.14 at a high sun), so the tops are white, not grey-blue. The cumulus lost two round "feet": the skirt is
  flattened and kept inside the body. Its towers are spaced and sized unevenly, because an even pair read as a face.
- Night: the city itself matched the reference better than before (warm floors, cool offices, beacons), but its water
  streaks clipped to solid white bars (see Calls I made). After the dimming they carry warm, pink and teal colour again,
  and the towers show dark structure between lit floors, closer to scene-night.jpg's restrained skyline.
- Golden hour: the ranges sit in the haze with their lit faces warm. The skyline and the ferry read at their size.
  Nothing out of place, so no change.
- Space: the station reads at scene size as a truss with four wing pairs and a white module stack. No change.

## Still weak

- Boats: the weakest group. At dusk they are muted and mauve, the speedboat's outboard is a blocky shape at large size,
  and the glass still reads as painted bands, not a reflection. They need a stronger sun-side highlight and a real
  outboard cowling.
- Cumulus: better without the feet and the face, but the side lobes still read as balls stuck on at large size.
- Night water: the streaks are the engine's (engine/water.js). Even with the city dimmed, a dense cluster of towers
  still gives continuous horizontal bars on the left. The fix belongs in the engine (cap the gain, or keep the column
  structure).
- City bodies are dark at large scale at night, and the stage skyline over-shows neon (two twists and two neon-blocks
  in every twelve towers); in the real scene the mix is sparser.
- The station's wings are a warm bronze, darker than the reference's gold-brown, and the modules have no texture
  beyond the blanket seams.
