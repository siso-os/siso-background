# Ground polish

The owner wants the islands and defences to feel real while the sky keeps moving around them. At a glance in T3 the island silhouettes and engine colours carry the scene. On the lock screen, window light and shell glow carry it after dark. Scrolling the site with Shift+D brings the terrain and the air-defence details close enough to see where things meet.

The existing assets already expose the states, slots and dimensions the engine uses. Keep those interfaces, use the shared Canvas lighting and rock relief, and match the air-defence and island paintings plus the day, dusk and night cut-outs.

- Launchers look like simple boxes because the seams have no depth and lit faces lack material variation. Use olive and sand panels, scuffed seams and recessed feet. Give silo steel a visible lip and directional hazard stripe, curve the radar edge, and give smoke lit lobes with dense shadow cores.
- Guns have little weight at their bases. Put the artillery on visible tracks with occluded road wheels and stowed kit. Round the CIWS radome with a broad specular shoulder and layer hot gas over the tracer origin. Give the searchlight a rimmed lens and sparse moving dust.
- The dome is mostly an outline with planar rings. A flat radial tint is cheap but the hit floats on the screen. A shader with refraction would bend the skyline but needs the scene buffer. Use a projected wavefront over a hemisphere and layered Fresnel light. That keeps the hit on the shell with a few Canvas paths.
- SISO islands have a thin green edge and visible nozzle rims in the rock. Use an uneven grass cap, jointed strata and a deeper concrete terrace, then lower the nacelles so their casing and service loops hang in the open.
- The enemy rock takes the same rounded form as SISO, and the high brick faces are too even. Use a flat shoulder with a separate diagonal keel, weather the walls unevenly and hang long rusted pods below the shoulder. Carry that silhouette through boost, fire, hit and fall.

## Calls I made

The overview groups three launchers, three guns, the dome, two SISO islands and two enemy islands into five fixed before/after views. The probe grids cover individual assets, with reduced progress in fire and hit states so the effects fit close enough to inspect.

## Pass 1

The three-light probe grids cover all eleven pieces and all their states. The SAM's new paint and cover seams help,
but the base is flat. The silo's dense smoke has a regular string of lobes. The radar's bright strips still read as
a segmented panel. The CIWS radome has depth but its pedestal is bare. Artillery wheels and the brake read immediately,
with little dirt between the wheels. The searchlight still shows squared-off yoke arms and hard bands in the beam.
The dome's daylight rim is quiet, but the impact trails end abruptly. SISO home has a stray vertical rock pixel at
the bowl's bottom and the small island's outer pods appear detached. The enemy keel is longer, but the secondary
rock fingers and the small island's open gaps between the pipes and rock compete with it.

## Pass 2

The air-defence painting is a tower-top assembly. I used it for the metal, the narrow highlights and the recessed
joins while keeping the silhouettes of the standalone equipment. The SAM's base gained fittings, the silo's smoke
picked up uneven lobes, and the radar panel lost the blown-out reflection on the tracking pass. The CIWS pedestal
gained a service hatch, the artillery wheels sit in track and dust shadow, and the searchlight gained a softer beam
edge and a visible power lead. The SISO painting set the width of the shield's translucent shoulder. The hit band
still follows the projected surface, with softer trailing edges.

The SISO home painting called for less regular rock beds and a clearer joint between the pod and rock. Both SISO
islands now have wider saddles above the engine collars and attached outer pods. The small island's cut-out gives
the grass and rock treatment. The brief calls for hanging pods there too, alongside its lab and mast. The enemy
painting has one dominant point, so both enemy islands now use a broad shelf tapering to a single offset keel.
The larger keep uses spiked crowns. Dusk and night grids show the orange engines through boost and fire, soot
during hit, and the tilting, sputtering engines during fall.

## Pass 3

(Written by the Opus finisher from pass3-night.webp and pass3-small-night.webp; the Sol run ran out of limit after
shooting them.) At lineup scale by night the shield dome is the strongest read: a clear blue shell with a bright rim
over the home island, and the engine pods glow blue under SISO and orange under the enemy, so the two sides separate at
a glance. The enemy slabs with their single offset keel read as a different, heavier mass than the SISO bowls. The
searchlight beam leaves the dome as a long pale streak with a slight bend in it. At 400x250 the defences on the deck
are a few pixels; only the dome, the tower and the beam carry them.

## Still weak

- Shield dome hit: the ripple is two near-straight diagonal streaks that stop short at the base, not rings spreading
  from the impact point, and the faint hex pattern the brief asked for is gone (after-dome.webp, lower row).
- CIWS radome by day reads as speckled stucco: the grime noise is too coarse and too even for a smooth white
  fibreglass dome, and the round shading is weak (after-guns.webp, top left).
- Enemy keels are short. The reference's long inverted rock point is about twice the slab's depth; ours is less than
  one (after-islands-enemy.webp).
- SISO boost jets got shorter than before the round, so boost is less dramatic than it was (after-islands-siso.webp).
- Defences vanish at true scale: on the 400x250 night shot the launchers and guns on the home deck cannot be told
  apart (pass3-small-night.webp). The searchlight beam has an odd bend where it leaves the dome (pass3-night.webp).
