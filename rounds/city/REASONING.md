# City soul: reasoning

## What these pieces are for (The brief's words)

"floating islands, enemy islands, SISO islands, buildings on the islands ... cities die, building animations, construction
animations, different types of buildings, skyscrapers, cars, maybe some people ... different background mountain ranges
... flying cities can fall and take down other buildings and they get rebuilt ... I like the neon as well but I like it
looking hyper realistic". And on 19 Nov: "really, really fucking nice. Like the components" and "not too heavy".

So my pieces are the world's ground and its two characters: the SISO home island with its tower (the hero), the enemy
fortress (the villain), the small city that gets hit, falls and is rebuilt, and the ranges and clouds that give the long
lens its depth. They are drawn small in a big sky, like the four options.

## Three moments he sees them

1. **A glance at the T3 background while he works.** The city is a 150-260 unit band at the bottom of a 1080 view; the
   island hangs a third of the way up. What reads at a glance: the silhouette (spire, sails, twist), the one light
   (a warm sun side and a cool shadow side), lit windows at night, the blue boosters. Detail below 2 px is noise.
2. **The lock screen.** Still, full screen, maybe 4K: here the island and tower are looked at. The rock needs real
   texture and light (strata, crevices, lit rim, bottom in shadow), the tower needs glass that reflects the sky and a
   crown that glows. The mountains must have ridges stepping back in haze, not a flat cut-out.
3. **Scrolling the site with Shift+D.** The skyline goes past: forty buildings must never repeat (seeded heights, crowns,
   palettes), the ranges must join end to end, and a tower building or falling must play cleanly and end exactly on
   its rest look.

## What exists

- `CONTRACT.md`: anchor bottom centre, y down, pure function of t/p/seed, light from `o.L`, cache static bodies.
- `src/core/paint.js`: `shade()` (the one lighting model), `glassColour`, `rimColour`, `glow`, `vgrad`, `windowLights`,
  `cached()`. `src/core/light.js`: `lightAt()` gives key colour/amount/height, ambient, haze, windows, neon, golden.
- `src/core/rng.js`: `rng`, `hash`, `noise1/2`, `fbm1`. Its `noise2` hashes through strings, too slow per pixel, so
  per-pixel bakes use a table noise of my own in `nature/_lib.js`, seeded from `rng()`, equally deterministic.
- References: the four options (scale, palette, the island, fortress, spire and skyline identities), the vertical slice
  (the home island large: layered brown rock, big central engine ring, four blue side thrusters, white domes and
  radar on top), the cut-outs (tower ring crown and fins, isle-home rock with strata and blue pods, isle-small with a
  cyan ring band, isle-enemy red fortress on dark rock with copper nozzles, the bld-* facades), the city plates
  (desert dusk, arctic day with snowy ranges, harbour night, neon night).

## The hardest piece: the rock of the floating islands (and the mountain faces, same problem)

It is the biggest, closest, most looked-at surface I own, and it has to be lit by the one light at any hour.

| Way | Cost | Gain |
|---|---|---|
| A. Vector facets: polygons per rock face, each filled with a lit/shadow gradient | cheap to draw, crisp at any size | reads as low-poly or painted; strata and crevices are hard to make convincing |
| B. Baked photo-like texture per hour: per-pixel noise every light change | full realism | 20-100 ms per hour change per island; too heavy |
| C. **Deferred relief**: bake per-pixel fields once per seed (alpha, normal, albedo, cavity, emissive) with a fast table noise, then light them per quarter-hour with the same model as `shade()` into a cached canvas | bake ~30-80 ms once; relight ~1-5 ms per quarter hour; per frame one `drawImage` | real crevices, strata, rim light and a lit side that follows the sun, and it stays in the same light model as every other piece |

**Pick: C.** One helper (`nature/_lib.js`: `relief()` + `lightRelief()`) serves the island rock, the four ranges and the
ruin rubble. Light moves in quarter hours, so a relight is rare; frames only blit.

## The details that sell "hyper-real", per family

- **Nature:** ridges stepping back, each one mixed further toward the haze colour; the sun side of each spur lit and its
  gullies dark (normals from an eroded height field, not drawn shading); snow brighter on the lit side and blue in
  shadow; the base of every ridge sinks into haze. Clouds: lit tops with a silver rim on the sun side, flat darker bases,
  edges that dissolve, gold and rose at sunset from the key colour itself.
- **Islands:** a lit rim along the sun edge of the rock; the underside going dark away from the sky; booster light
  spilling up onto the rock above each nozzle (blue for SISO, red-orange for the enemy); small warm windows at night.
- **City:** glass that mirrors the sky (dark at the foot, bright up top) with a hot sun-glint band on the lit face at
  golden hour; a one-pixel rim on the sun edge; floors that light up unevenly at night; red aircraft lights blinking on
  the tall ones; neon edge tubes that bloom and come up with `L.neon`.

## Plan of the files

- `nature/_lib.js`: table noise, `relief()` bake, `lightRelief()` relight, ridge helpers, soft billow clouds.
- `city/_lib.js`: `building()` makes an asset with idle / construct / collapse / ruin from one paint function; glass,
  neon, beacons, dust, embers.
- `islands/_lib.js`: rock underside bake, boosters, flames.
- Nature: `mountains-alpine`, `-desert`, `-volcanic`, `-arctic`, `cloud-bank`, `cloud-cumulus`, `cloud-streak`.
- Islands: `siso-home`, `siso-small`, `enemy`, `enemy-small`.
- City: `tower-siso`, `skyscraper-glass`, `-deco`, `-twist`, `office`, `residential`, `neon-block`, `spire`, `crane`,
  `car`, `people`, `bridge`, `arena` (the white shell landmark that sits at the foot of the skyline in every option, pink
  and cyan at night), `quay`.

## Calls I made

- The element references for mountains and the islands (`refs/elements/mountains.webp`, `siso-island`, `enemy-island`)
  were not in `sol-refs` when I started; I matched to crops of the four options first. They arrived before Pass 2, and
  Pass 2 is shot against them (`&ref=refs/elements/...`). Each asset's `ref` field still points at an options image,
  which every worktree has.
- Ranges haze their own back ridges toward `L.haze` (the brief asks for haze inside the range); the engine's depth haze
  still applies on top for the range as a whole.
- Per-pixel bakes use a table noise in `nature/_lib.js` instead of `rng.js` `noise2`, which converts numbers to strings
  per sample and would make a bake take seconds. It is seeded from `rng()` and has no hidden state.
- Sizes: a person is ~1.8 units and a car ~4.6 units long (a 260-unit tower is ~300 m); the tower is 260 units tall
  on a 460-unit island, as in the options.
- City windows use my own `floorLights()` (in `city/_lib.js`), not core `windowLights()`. The core helper lights each
  window on its own coin flip, which reads as confetti on a 200-unit tower. Real offices light by floor and by tenant:
  whole floors on or off, then runs of 1 to 4 windows, warm or cool. Glass towers paint it at partial alpha over the sky
  reflection, so the facade keeps the sky in it by day.
- The tenth city piece is `city.arena` (the white shell building at the skyline's foot in all four options) and an
  eleventh, `city.quay`.
- **The verifier fails every asset on "draw() left the transform changed", and that is a Chromium float32 quirk, not
  the assets.** `checkall.html` compares `getTransform().a !== s` exactly. Chromium here stores the canvas matrix in
  float32, so for any scale that isn't float32-exact (0.4, 0.533...) the read-back differs in the 8th digit even when
  draw() does nothing. The proof (`evidence-float32-transform.webp`): an empty draw at s = 0.4 reads back
  `a = 0.4000000059604645`, so `eq = false`. I didn't
  edit `tools/` (not mine). I verified with a scratch copy of the checker that compares with a 1e-6 relative tolerance and
  is otherwise identical. Every check passes: 25 assets, 122 drawings. The copy is deleted before commit. A one-line fix
  to the real checker (`Math.abs(m.a - s) > 1e-6 * s`) belongs to the orchestrator.
- Nature's three extra pieces are `cloud-bank`, `cloud-cumulus` and `cloud-streak` (the four ranges are the required ids).
- The enemy islands declare `once: { fall: 5 }` and `{ fall: 4 }`, so `fall` is p-driven like the building states.
- `city.tower-siso` has `variants: 1`. There is one SISO tower; its seed only changes its window pattern.
- Smoke columns are shared from `islands/_lib.js` into `city/_lib.js` (ruins smoke the same way burning islands do).
- The lineup crops each mountain range to a 590-unit window instead of shrinking it. The ranges are 2400 units wide, the
  whole world, and shrinking them would break "real relative sizes".
- Headless Chromium here sometimes hangs a shot until `chrome.mjs` times it out (`spawnSync chromium ETIMEDOUT`). The
  same shot passes on retry in about 11 s, so I retried such shots up to three times.

## Pass 1

I shot all 25 pieces in grid mode (states × 8h, 12h, 18.5h, 22h): `pass1-*.webp`. Looking at each one, then at the
contact sheets small, here is what is weak, worst first:

- **Enemy islands (worst).** A sparse, dark, flat-topped fort on black basalt: a few square towers, one wall, small grey
  pods. At thumbnail size it is a dark smudge with a lid. Nothing says "fortress city". The SISO island next to it is
  richer, which inverts the drama.
- **Smoke reads as beads.** In `hit` and `fall`, and on the ruins, the column is 7 to 9 separate round puffs with gaps
  between them, small at the root.
- **Construction work lights** are white balls 12 units wide, bigger than a floor, and they dominate `construct` at night.
- **Collapse dust** scales with the building's width, so the office and residential raise a fog bank twice their size.
- **The neon block's rooftop screen** is a black slab by day. Real LED boards run all day.
- **The cloud bank** is a lumpy cauliflower mound: too many equal billows, with no flat base or anvil.
- **People** at real size are 2 units; at that size the limbs are thick for the body and the walk is stick-like.
- **Glass towers at dusk** go a flat beige where the reflection gradient meets the warm key light.
- **The twist tower at night** is noisy: the band rotation plus floor lights make a dither.
- **Car headlight beams** are long and strong for a 4.6-unit car.
- **The SISO tower's legs** read as two white swooshes when shot small.

Strongest: the SISO home island's rock (sandstone strata, moss, warm seams glowing along the beds at dusk and night,
blue plumes on boost); the alpine and volcanic ranges; the bridge and arena at night.

## Pass 2

The reference that differed most from its piece was `refs/elements/enemy-island.webp`: a dense red-brick walled town,
round crenellated towers with iron spikes, slate roofs climbing to a citadel, a gate with red banners, on a slab of
grey-brown rock, with big brass engine drums and feed pipes hanging under it, burning orange. Mine was a dark basalt
lump with a few square towers. I rebuilt the enemy painting (`islands/_enemy.js`), and both enemy islands use it:

- Brickwork: a cylinder or wall gradient, then per-brick tone in four bucketed `Path2D` fills, so one layer costs four
  fill calls not thousands. Grime at the foot, rain streaks, a sun rim.
- Round towers with a corbelled machicolation ring, merlons with iron finials, or a slate cone.
- A town generated per seed: two rows of houses (brick, punched windows by floor, hipped slate roofs, chimneys, the odd
  dome), rising toward the middle, the back row hazier. A citadel with corner towers and the twin battery on its roof
  (`slots.tower` still lands on it).
- A curtain wall with buttresses and cannon ports, and a gatehouse with two turrets, a glowing portcullis arch and red
  banners. Torches flicker at the gate after dark, and lamplight glows over the town.
- Engine drums: brass gone to rust, iron bands, a flared nozzle, two feed pipes curving up into the rock. Each sits on
  the rock's underside curve (worked out from the bake's bowl formula), so two drum-widths show below the rock.
- The enemy rock palette moved from near-black basalt to weathered grey-brown with rust in some beds. The bolted plates
  are gone (they read as blocky rectangles).

Smaller fixes from the Pass 1 list:

- **Smoke:** twice the puffs, wider at the root (0.9 s), alpha curved down, so one column reads as one plume. This is
  shared, so the ruins get it too.
- **Work lights:** a 0.9-unit hot point with a 3 to 5-unit halo.
- **Collapse dust:** width capped at 90 and 120 units.
- **The neon screen** runs all day, with a picture in its colour and a sky sheen; the slow sweep plays day and night.

Shots: `pass2-enemy.webp` and `pass2-enemy-small.webp` (each grid beside the enemy-island ref), `pass2-siso-home.webp`
(beside the siso-island ref), `pass2-office.webp` (work lights and dust) and `pass2-neon-block.webp`.

Against the ref, the enemy island now has the same read: a red town of towers and roofs, a citadel peak, a gate in the
middle, drums under it. What is still different: the ref's rock is a thick flat slab with an inverted point. Mine is
the shared saucer bowl, and its top lip is thin. The ref's towers are taller relative to the island.

## Pass 3

`rounds/city/lineup.html` draws all 25 pieces (37 placements: a few buildings again with other seeds and states) at one
scale, 1 unit = 1 m on a 2400-unit stage, on the sky of the hour (`?h=18.5` dusk, `?h=21` night; `?rows=` picks rows).
The rows are: clouds; a 590-unit window of each range (each range is 2400 wide, so it is cropped, not shrunk, and the
volcanic window is centred on its cone); the four islands and the bridge; the skyline (every building, the crane
building, a construct and a ruin); the quay with cars and people at true size. Under each piece is its steady-state
draw time: warm caches, then the mean of 30 draws at that scale in headless Chromium (software raster, so pessimistic).

- **Speed:** slowest `islands.siso-home` 0.16 ms at dusk, `islands.enemy` 0.14 ms at night. Every building is 0.00 to
  0.07 ms (cached bodies), and the ranges and clouds are 0.00 to 0.08 ms. All are under the 0.5 ms budget, with no misses.
  Not measured: the one-frame cost of a cache miss when `L.q` ticks over (a relight of the rock or range bake, a
  repaint of a building body). It is paid once per quarter-hour of game light, per piece on screen.
- **Relative sizes hold.** The 290-unit SISO tower stands as tall as the glass towers, and the spire tops them. The
  enemy fortress is about the SISO home island's width. The bridge's towers are about two-thirds of a skyscraper. Cars and
  people are one pixel at this scale, which is right for 1 unit = 1 m.
- **Small (400×250):** `pass3-small-city-dusk`, `-city-noon` and `-islands-night`. The skyline still reads as separate
  towers with lit floors. The islands read by silhouette and engine colour (blue for SISO, orange for the enemy), so
  friend and foe are clear at thumbnail size.
- Seen side by side, the clouds were the worst piece left: every billow shaded as its own sphere (bubble wrap). In this
  pass, `caps` became soft domes merged with a smooth max. Cloud shading now follows a few big billows, with the small
  caps only texturing it. Edges fray over 24 units with noise, the base hazes into the sky, crease darkening dropped,
  and the key light comes more from the side. Noon cumulus now reads as soft white cloud.

Shots: `pass3-lineup-dusk.webp`, `pass3-lineup-night.webp`, `pass3-small-city-dusk.webp`, `pass3-small-city-noon.webp`,
`pass3-small-islands-night.webp`.

## Still weak

- **The volcano cone** is a smooth geometric cone, and its lava runs are even-width glowing squiggles (noodles). The
  flanks need gullies and ash bands at the cone's own scale, and the lava should braid and fade, not loop.
- **Clouds at dusk** go a flat mauve, darker than the sky, with no gold rim or rose underside strong enough to read as
  sunset cloud. Close up, the cumulus outline is still lumpy rather than towering.
- **The arctic range** is over-textured (crumpled paper) next to the alpine. Its relief noise needs a larger scale and
  less amplitude.
- **The enemy rock** is the shared saucer bowl; the reference has a thick flat slab with an inverted point. The SISO
  home island's engines are nozzles in the rock, where the reference has pods hanging below.
- **People** are 2-unit figures with thick limbs; at true size they are a pixel, so this only shows in close-ups.
- **The twist tower at night** dithers, and glass towers at dusk drift beige.
- The verifier's float32 transform bug (see Calls I made) means `soul-check` cannot pass on this machine until the
  checker compares with a tolerance.
