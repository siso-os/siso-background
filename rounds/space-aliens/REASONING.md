# Space and alien polish

“Space cities and on the moon … a floating space palace … being attacked” and “sometimes portals and aliens come out” describe two beats in the same scene. In a glance behind T3, the shape and a handful of practical lights carry it. On the lock screen the still should reward a close look at material and scale. With Shift+D, the hard-lit side, running lights and movement have to hold as objects pass in parallax.

The existing contract puts the anchor at bottom centre and derives every frame from time, seed and light. The space material already supplies a hard sun and a cache, and the alien material already supplies translucency and additive sprites. The standalone references give the construction of the palace, the balance of lit windows to dark regolith, and the portal's colour and silhouette. The vertical slice supplies the wider space context.

- Palace. Empty space between rails and a shadowy triangular belly flatten the deck stack. Put two inhabited concourses under the main deck, light the bays against their support ribs, and remove shield fill from the city.
- Moon and city. Maria compete with the craters, and the city reads as a strip of modules above a smudge. Separate ejecta, shadowed floors and irregular mare tone. Ground the colony with textured slopes, directional silhouettes, and pools of light.
- Ships. Solar grids overpower the glass, and the gunship is an unbroken side wedge. Give the panels dark seams and moving reflections. Break the gunship into inset armour, shadowed gun housings and small red running lights.
- Aliens. The two flyer wings largely overlap. Spread the pale wings on an oblique front-quarter axis. Use bone plates and dark joint gaps on the craft, and refracted tissue and violet-green light on the drifter and walker.
- Portal. The ring already has fine filaments, but the interior reads as a dark graphic with dots and loose arcs. Give it a distant star field, a nearer spiral, branching strikes with dark gaps between them, and colour spill concentrated around bright knots.

## Hardest piece

The portal has to preserve the black well inside a bright ring at noon and remain legible at 0.3 scale. One broad live gradient and arc paths would be cheap but would read as a diagram. A per-frame volumetric simulation could produce more depth, at the expense of many pixels updated per frame and no simple deterministic seek. Keep the cached filament layers and add a procedurally baked star field. Use bounded live paths and small sprites for the nearby flashes and arrivals.

## Calls I made

- The same grouped canvas URL is used for each before/after pair so every asset and state appears in the five requested comparisons. Direct reference comparisons use the repository's reference files.

## Pass 1

Viewed all ten four-hour probe grids at 1600×900. The saved pass separates the palace’s lower decks from its rails, adds crater ejecta, darkens the satellite’s inter-cell seams, and gives the portal real forks. The rough edges were visible without zooming.

- Palace. The underside is warm, but narrow. The crown is a stack of drums where the reference has a continuous sweep of buttresses. The shield arcs are still conspicuous on a blue sky.
- Moon. The broader maria and the floors around the terminator read well. A short flat stretch on the full moon’s limb gives away the extent of the bake. Moon city. The black shadows anchor the towers, but the edges of the grey apron read as a saucer, and the dome glass looks uniformly stippled.
- Attack ship. The hull has a clear black underside, but the rear fin, leading bevel and flat canopy still look like a model kit. Satellite. Its wings are dark again, but each cell is a single flat tile, with little difference between the two banks.
- Flyer. Both wings are present, but the small far wing still reads as a dorsal fin. Craft. The nacelles help, while the tall wing hump and pointed nose still make it look like a side view. Walker. The bell is visible in daylight, but the upper legs look like straight rods. Drifter. The core reads, but the regular rim highlight and vertical tentacles feel stiff.
- Portal. The forks survive the dark background. In the hold state the depth collapses into a flecked centre, and the brightest sectors trend toward cyan. The open and close states need to keep their colour as the ring changes size.

## Pass 2

Viewed the ten `pass2-*.webp` side-by-side comparisons at 1600×900. These record the comparison that informed the changes below. The two ships use the vertical slice for size and lighting. It shows the palace escort at a distance and has no close view of a satellite. The portal group uses the shared arrival painting, which shows the drifters and flyers clearly but has no standing walker.

- Palace. The real crown has a broad base, a continuous white front buttress and a heavier rail. Added two shoulder domes and a buttress from the foot of the main window to the needle. Widened the lower decks and shortened the shield glints so the hull stays prominent.
- Moon and city. Kept the visible mare mottling and crater shadows, strengthened the rays, and extended shading to the edge texels for a round limb. For the colony, faded the apron, broke up the ground with scree and made the glass panes larger so the lit interiors show through.
- Ships. Lowered the gunship’s fin and broke the main panel with recessed service covers. Kept small red markers visible between blinks. Increased the difference in lighting between the satellite banks and added fine in-cell conductors visible in a close pass.
- Aliens. Stretched the flyer’s far wing into clear space and moved the craft’s far tip forward for a front-quarter view. Added shoulder tissue and wet droplets to the walker. Tilted the drifter and made its tentacles sweep unevenly behind it. Gave their shared bell a second, fainter refracted rim.
- Portal. The reference has broad, separate sectors of green and violet, and the dust streams recede off-centre. Gave the cached arc forks more room to extend, widened the colour sectors, and offset and brightened the dust lanes inside a slightly elliptical opening.

## Pass 3

(Written by the Opus finisher from the pass3-*.webp shots; the Sol run ran out of limit after shooting them.) In the
family lineup at dusk and night (pass3-lineup-dusk.webp, pass3-lineup-night.webp) the palace and the portal carry the
scene: the gold underside tiers and the thin shield arcs read at 0.42, and the portal's green and violet ring with its
spiral holds its colour on both skies. The moon's lit crater rims and hard terminator read at true size. At 400x250
(pass3-<id>.webp) the palace, moon and portal stay legible; the ships, satellite, flyer and walker shrink to a few
pixels, where only their running lights and the walker's cyan core tell them apart.

## Still weak

- Flyer, satellite and attack ship are specks at true size: the flyer is about 10 px across in pass3-flyer.webp and
  pass3-lineup-night.webp, with no bright point to find it by.
- The moon lost its maria: the after face is an even grey of craters with no dark seas of uneven tone, so the full
  moon reads less like the Moon than before (after-moon.webp, top two rows).
- Moon city still sits on a saucer-shaped apron rather than on the ground, and at night its glow is the same as by
  day (after-moon.webp, bottom rows).
- The palace shows no lit windows at night: idle at 22h looks like idle at 12h (after-palace.webp).
- Satellite at 22h: the far wing fades to a ghost instead of a hard black shadow side (after-ships.webp, top right).
- Walker barely changed from the before; its legs are still straight rods (after-aliens.webp, third column).
