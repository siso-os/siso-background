# Effects polish

The owner wants «hellfire swarms where it's like 50 missiles raining down like rain» and a background that looks “hyper realistic.” The effects should register in a glance behind T3, give the lock screen depth and scale, and let someone follow a hit from approach to aftermath while scrolling with Shift+D.

The contract gives us world units, seeded time, a common key light, and a headless probe. The existing paint and sprite helpers give us cached texture and additive light. The storm plate supplies the silhouettes, grey daylight and bright water. The hellfire plate supplies the ratio of white motor to darker twisting exhaust.

| Target | What reads as illustration | Change |
| --- | --- | --- |
| Explosions | Overlapping hot discs and a weak flash leave the blast with no distinct centre or cooling front. | Separate the brief core from the growing, folded mass of hot gas. Throw sparks out of its edges and let soot obscure the interior as it cools. |
| Fire and smoke | Repeated puff rims and broad orange tongues give away the sprite boundaries. The dust grows up from the road. | Erode the billow edges at two scales, vary density across the stack, and lean the licks into a hot foot. Drive most collapse dust horizontally. |
| Trails | A succession of dots or strokes reads as a string. The lit part is too even along its length. | Give neighbouring samples a coherent drift and width, and concentrate the brightest material immediately behind the motor. |
| Water | The wake arms nearly coincide and the splash inherits the dark diffuse smoke palette. | Set a minimum fill light for white foam, widen the V, and gather the jet and spray around a dense white sheet at the waterline. |
| Hits | The strike reads as a single stroke ring with much of the brightness in the lines. Sparse puffs give debris and intercept dotted trails. | Put the flare on the impact point, soften and break the ripples, and overlap the residual exhaust along each fragment's arc. |

Smoke is the hardest effect. A live volume could resolve occlusion and fire light well, at the cost of expensive pixel work for every plume. Gradients are cheap but expose the boundary of every disc. Cached noise fields, shaded once and layered in age order, keep the existing draw path and give us lit crests with darker creases at the cost of approximating overlap in 2D.

## Calls I made

- Each fixed pair uses the same lineup URL and covers the whole target together. The unaffected probe has no sea backdrop, so the lineup uses the actual sea shader alongside separate grey and sky probe checks.

## Pass 1

- The blast and fuel fireball gained distinct hot centres and cooling edges. The flash lit a much larger patch of sky, but the air burst still held its orange too long after the flash.
- The roof fire gained a low bed and a taller plume. Daylight still picked out the seams on small batches of puffs, especially white smoke and debris. The dust spread across the ground but had a flat crest. Embers read better against night than noon.
- The missile motor read as a point of light against coherent exhaust, and the tracers gained a glow. The exhaust was fat beside the swarm plate and the contrail was weak at twilight.
- The wake had two arms, but the thin foam merged with the water at a distance. The tall splash was bright enough by day and still read as a cluster of smooth ribbons by night.
- The shield carried several ripples and the two intercepts had separate colours and falling sparks. The shield filled with white at noon. Debris needed denser dust along the trajectories. The missing hits grid was captured from the saved first-run commit.

## Pass 2

The storm plate's smoke has cloudy folds without a bright outline. The puff bake now follows the same turbulence at the edge and through the body, with softer coverage and lower contrast from small surface normals. The main plume packs the overlap tighter. The dust has a rising centre behind its ground-hugging front.

The storm wake has a solid patch of churn at the stern and feathery bands dying away in the waves. The water comparison uses a longer patch of churn and stronger broken foam. The splash replaces the long, smooth blades with overlapping aerated sheets, an uneven foam ring and separate streaks of spray. Both use cool skylight on the foam after dark. The 400 px pass 2 water shot showed both effects, but Chromium's minimum viewport width cropped the right-hand panel.

The trail probes use the hellfire plate for the white-to-grey motor transition and the storm plate to judge how little of the exhaust should stay bright. The hits and debris probes use the shield on the storm plate and the collapse dust cutout. The shield's evenly luminous band and the faint trails on the small debris stood out in the lineup.

## Pass 3

The dusk and night lineups use one scale of 0.30 pixels per world unit across all 14 assets. The contrail gets a pale scattering layer even at sunset, the missile trails were narrowed, and the SISO motor spills blue into its exhaust. The blast cools into soot sooner. The shield's concentric bands are thinner and slightly offset, using screen blending in daylight. Dust trails survive farther behind tumbling debris.

At 400 × 250 the sea views hold both assets at scale 0.30. Added a denser base to the splash and a foam light floor for dusk. The grey and sky panels use the stock probe. The sea panels use the lineup and its real sea shader. The final pair for each target uses the original comparison view at 1600 × 900.

## Still weak

- Fine flakes still show in the dust highlights at noon. At night, falling rubble against dark sky reads mainly in silhouette.
- The slow wake is easy to lose beside bright wave glints. A low camera gives its V very little height.

From the Opus finisher's look at the after shots (after-water.webp shot after the Sol run ran out of limit):
- The splash's foam ring is a dashed ellipse that reads as a diagram, and at night its spray is leaf-shaped blobs
  rather than droplets (after-water.webp, bottom row). The wake is still a thin streak, not a widening white V.
- The shield hit by night is a set of thin concentric rings, which reads graphic; by day it is a soft blue disc with
  no hot impact point (after-hits.webp).
- At 22h the blue intercept and the debris burst nearly vanish (after-hits.webp, bottom rows).
