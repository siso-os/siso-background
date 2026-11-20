# Machines: boats, aircraft, missiles, air defence and the shield

## What these pieces are FOR (The brief's words)

"the boats, speedboats, police boats, planes, jet fighters, rocket ships, missiles, hellfire swarms where it's like 50
missiles raining down like rain ... artillery on those islands, air defence ... all of these guys start shooting".
They are the life and the war in the scene: the traffic that makes the bay feel inhabited at a glance, and the
machines that make a raid read as a raid. "I like the neon as well but I like it looking hyper realistic."

## Three moments he sees them

1. **A glance at the T3 background while he works.** A police boat 30 px long, a jet 25 px long. He never studies
   them; he catches a blue-red flash on the water, a hot exhaust streak, a shimmer on the dome. Silhouette, one hot
   light and its bloom carry the piece; detail is invisible here.
2. **The lock screen.** A still frame, bigger, looked at for a few seconds. Here a flat fill or a cartoon shape gives
   the game away: hulls need the sky in their gloss, a dark underside cut by the water, a rim of sun on the deck edge.
3. **Scrolling the site with Shift+D.** Things move past at speed: lights must flash in time, rotors blur, boats bob,
   spray rises and falls, all as pure functions of t so a scrub never pops.

## What exists

- `CONTRACT.md`: anchor at bottom centre, facing right, world units, `o.L` light, `o.lit` side, `o.scale`, no haze.
- `src/core/paint.js`: `shade()` (one light), `glow()` (additive bloom), `vgrad/hgrad`, `windowLights()`, `cached()`.
- Refs: the four options (a police boat with a light bar, two speedboats, jets with afterburners in the storm, the
  missile rain, the blue dome with ripple hits), `art/isles/cutouts/boat-{police,smuggler,ferry,yacht}-*.webp`.

## Sizes (world units; a skyscraper is ~260)

Real scale would make a police boat 12 units, invisible. The options show boats and jets bigger than real against
the skyline (they are nearer the lens). I draw boats and aircraft at about 2 units per metre (buildings are ~0.9), so
a jet is ~36 units (the 20-40 px the brief asks for at z = 1) and a police boat ~44.

## The hardest piece: the shield dome

Three ways to draw it:
1. **Radial gradient shell + rim stroke + a baked hex layer, shimmer by a clipped moving band.** Cost: one gradient
   fill, two strokes, two drawImage of a cached hex canvas: ~0.1 ms. Gain: fresnel edge and hex for nearly free.
2. **Per-hex paths every frame with per-hex alpha from noise.** Rich shimmer, but ~400 hex paths a frame: 1-2 ms. No.
3. **A WebGL shader.** Best fresnel and refraction, but assets are Canvas 2D by contract and the engine owns WebGL. No.

Pick: 1. Hits are rings: an annulus clip around (hitX, hitY) through which the hex layer shows bright, plus a hot
core and two expanding strokes, as in option-d-storm.

## The details that sell "hyper-real", per family

- **Sea:** the hull below the waterline is drawn again tinted by the water (you see it through the sea), a thin broken
  foam line where hull meets water, the sky mirrored in white gloss, a rim of sun along the sheer. At night only the
  lights read: nav lights, cabin glow, and the police bar bleeding blue and red onto the water.
- **Air:** the exhaust is the brightest thing in the frame with a bloom far bigger than the body, so a 25 px jet still
  reads. Top lit, belly dark, a hard rim on top at golden hour. Nav lights and strobes at night.
- **Defence:** dark gunmetal against the sky with one hot event (muzzle flash, launch flash, backblast smoke). The
  dome's fresnel edge is the piece; the shell itself is almost invisible.

## Calls I made

- Boats and aircraft at ~2 units per metre (see Sizes): readable at z = 1, matching the options' proportions.
- A shared kit in `src/assets/sea/_lib.js` (baking with `cached()`, lamps, exhaust flames, spray, floating hulls);
  `air/_lib.js` and `defence/_lib.js` re-export it. One kit, three families, all mine.
- `bake()` uses `cached()` up to 3 px per unit; above that (only the probe's big renders) it bakes at the real scale in
  a small private cache so big shots stay crisp instead of upscaled mush.
- `free: true` on pieces whose light legitimately leaves the box: the police boat (its glow on the water), the
  helicopter (searchlight cone), the rocket ship (it lifts off), the silo (its launch), the searchlight (its beam), the CIWS (its tracer stream), the SAM launcher (its backblast and the missile leaving).
- Extra pieces beyond section 6: `defence.radar` (turning dish) and `defence.searchlight` (a sweeping beam for night
  raids), 21 in all.
- `air.jet-siso` and `air.jet-enemy` `fire` is a once state (1.4 s): the cannon flashes and a missile drops off the
  rail, lights and pulls ahead; the event hands the flight over to `air.missile` after.
- Box sizes are chosen so the longest side is 2^n or 5·2^n units (16, 20, 32, 40, 64, 80, 160, 256, 512), and each
  boat draws at its natural length under a `ctx.scale(K, K)`. The reason: Chrome keeps the canvas transform in
  float32, so `checkall`'s `m.a !== s` test fails for any other size even when draw() is empty (for example,
  3.4042553901672363 vs 3.404255319148936). The check should compare with a tolerance; that file is not mine to change.
- `defence.shield-dome` is 512 x 300 (the brief said about 520) for the same reason.

## Pass 1

Shots `pass1-<piece>.webp`: the probe grid at 8 h, 12 h, 18.5 h and 22 h for every state. The weakest point of each:

- **speedboat**: the waterline foam is a row of fat white capsules, and the bow spray sits on top of the hull instead of
  peeling off it.
- **police-boat**: the best of the boats. The light bar and its glow on the water sell it. Weakest: the hull's lower
  half is one flat grey under the band.
- **smuggler**: reads mid-grey, not black, in daylight (the gloss sheen lifts it too much). Its flee spray shows the
  same capsule foam as the speedboat.
- **ferry**: illustrative. Rows of identical windows and flat deck bands, with no weathering or streaks.
- **yacht**: clean and believable. Its dark glazing bands are a little uniform.
- **cargo**: the container stacks are too tidy, with even colours and no gaps or shading between tiers.
- **warship**: good faceted grey and a believable gun sequence. The radar panel is small at scale 0.3.
- **airliner**: reads, but its wing sits flat on the fuselage with no root fairing, and the engine is small.
- **jet-siso**: reads well at 30 px. At dusk the blue afterburner turns pinkish over the orange sky.
- **jet-enemy**: reads dark and angular. At night the engine bloom is a white disc that is too big.
- **drone**: the UAV body is a fat rounded fish that reads cartoonish. It needs a slimmer fuselage and a long straight wing.
- **helicopter**: the shapes are right, but the windows read flat and illustrative.
- **rocket-ship**: the idle steel shading is good. The launch smoke is soft, even fog with no billowing structure.
- **missile**: the daytime exhaust bloom is a big white halo that swamps the body. It should shrink in daylight.
- **sam-launcher**: the backblast is one flat blob, and the lift arm is a plain stick. The highlight along the canister
  top reads as an outline.
- **ciws**: the light rim on the radome is a visible outline. The gun is a single black stick, not a barrel cluster,
  and the spent cases are square dots.
- **artillery**: a believable silhouette, but the turret faces are flat and the dust at fire p 0.5 is barely there.
- **silo**: the shaft mouth shows as a dark ellipse under the closed hatch. At fire p 0.5 the smoke fills the whole
  frame as uniform fog.
- **shield-dome**: reads as an energy shell at night, with a good hit ring. By day the body is milky and too opaque, so
  the sky behind it loses contrast.
- **radar**: the reflector is a tall box that reads as a billboard. It needs a flatter, rounded-end mesh shape.
- **searchlight**: at night the beam is a solid white bar with a hard edge. It needs a lower near-field alpha and a soft edge.

## Pass 2

Shots `pass2-<piece>.webp`: the same grid with the piece's reference beside it where one is set (`refs/options/*`,
`art/isles/cutouts/boat-*`). For pieces with no reference, I judged against the real hardware. The biggest difference
for each, and what changed:

- **shield-dome** against `option-d-storm`: the reference shell is nearly clear, with a thin saturated blue rim, and
  each hit is a hot core inside concentric rings. Mine was milky by day and showed a hit only as one wide ring. I cut
  the body tint by about half, made the rim line more saturated, and added four concentric rings lying in the shell's
  tangent plane (squashed along the surface normal at the hit) around a core that lasts the whole hit.
- **missile and jets** against `option-d-storm`: the reference flames are small, hot heads. Mine had a big white
  halo by day. The kit's `exhaust()` now scales its bloom by night (2.6 to 6 r) and lays a thin opaque underlay in
  the flame's own colour, so the siso blue stays blue over the orange dusk sky instead of turning pink.
- **smuggler** against `boat-smuggler-day`: the reference is near-black gloss; mine was mid-grey. The base is darker
  and the gloss and sheen are lower.
- **speedboat (and every hull)** against `option-a-golden`: the reference's white water is a thin bright streak hugging
  the hull; mine was a chain of fat capsules. `waterline()` now draws thin broken streaks that ride up toward the
  bow, plus a soft churn band at speed.
- **ciws** (no reference; the real Phalanx): the radome's outline rim is gone, and the gun is now a breech housing
  with three lit barrels, a clamp and a muzzle ring. Spent cases are short streaks.
- **radar**: the reflector is flatter (AH 3.1), with rounded ends, rolled edges and a spine beam, so it reads as a
  mesh antenna, not a billboard.
- **silo**: the shaft mouth now shows only where the hatch has rolled off it, and the launch smoke is lighter.
- **sam-launcher**: the lift arm is a hydraulic ram (cylinder and chrome rod), the backblast hits the roof and rolls
  along it, and the canister highlight is no longer an outline.
- **searchlight**: four nested cones give the beam a soft edge, with a lower near-field alpha.
- **drone**: the UAV fuselage is slimmer (about 1:8), the wings are short straight slivers, and the sensor ball is smaller.

## Pass 3
`rounds/machines/lineup.html` puts all 21 pieces on one world scale (1350 units across 1600 px, 1.19 px per unit).
The dome sits over a stand-in island strip with the defences under it, the rocket stands on its pad, the boats sit on
the water from cargo to speedboat, and the aircraft fly at altitude. The first row is calm, the second plays the action
states. Shots: `pass3-lineup` (18.5 h and 22 h) and `pass3-lineup-day` (12 h and 22 h). `?frames=40` times every piece.

What was out of place, and the fixes:
- **shield dome**: at true scale the hex read as chicken-wire, and the hit rings read as a target symbol. The lattice
  is now a hint (0.045) that shows mostly near the rim and in the shimmer band. The rings lie in the shell's tangent
  plane (squashed along the normal), thinner and fading faster. See `pass3-shield-dome`.
- **cargo**: next to the warship and ferry, the containers were a toy-box of saturated colour. They are now
  sun-faded toward grey-brown (`pass3-cargo`).
- **cargo timing**: 0.53 ms per draw, because the foam strokes scaled with hull length. They are capped at 48, which
  brings it to 0.2 ms.
- **sizes**: a jet is 48 units long, a missile 24, the airliner 90, cargo 300, the warship 180 and the speedboat 14.
  Side by side, these read right against each other and against the 520-wide dome. Nothing needed rescaling.
- **scale 0.3**: `pass3-small` shows jet-siso, missile, police-boat and ciws at 400x250. Each still reads by
  silhouette, with its lights and flame as the accent.

Timing: averaged over 40 frames after the bake frame, in headless SwiftShader (slower than a GPU). Every piece is at
or under about 0.21 ms per draw. The heaviest are the cargo ship, the warship and the dome; all are under the 0.5 ms
bar. `node tools/check.mjs --family sea,air,defence --min 20` reports PASS: 21 assets, 76 drawings checked.

## Still weak
- **ferry and cargo** still look a little illustrative. The window rows and superstructure are too regular, and they
  need grime, rust streaks and uneven deck clutter.
- **smuggler**: the dark gloss is right, but it lacks the reference's chrome rail reflections and sharp spec hits.
- **helicopter**: the cockpit glass is flat, and the rotor disc blur is too even.
- **rocket launch**: the pad smoke is soft and fog-like, with no billowing cauliflower edge. **silo** fire smoke has
  the same weakness.
- **artillery** is plain: one block hull with a barrel. It needs road wheels, a muzzle brake, stowage and camouflage
  breakup.
- **defences under the dome** are tiny at true scale (a radar is 40 units under a 300-tall dome). That is correct,
  but they will only sell once they sit on the islands family's real ground and get their own contact shadows.
- **dome hit**: the rings still lean slightly graphic at their peak. A distortion or refraction of what is behind the
  shell would sell it better, but that needs a scene buffer, which is core work outside this family.
