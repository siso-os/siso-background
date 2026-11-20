# v2 art: the style lock

Every prompt in the batches already carries these rules. This page says why, so a soul who has to retry an image
keeps them.

## One world, photographed

- **Hyper-real, live-action cinema photography.** Real rock, steel, glass, brick and water, with fine weathering and
  physical light. Never cartoon, game art, toy scale, plastic or clay. The owner liked the first photo art (the SISO
  Tower day and night, the floating islands, the glass and neon buildings, the ferry). The drawn versions looked worse.
  The references for that look are in `art/isles/cutouts/` and `refs/elements/`.
- **Camera: true side elevation on a long lens.** The scene scrolls sideways, so a sprite has to sit on a flat layer.
  The camera is level with the subject's middle and at most 5 degrees above it. Buildings use a front elevation with
  vertical verticals.
- **The whole subject, with margin.** Nothing is cropped and nothing touches an edge, except strips and foregrounds,
  which run off the left, right and bottom edges by design.

## The three sides

| Side | Looks like |
|---|---|
| SISO (home) | Dark smoked-blue glass, graphite steel, sculpted brushed-silver fins and slim cyan light lines. Levitation engines glow cyan. The SISO lion-head emblem (`refs/brand/siso-lion-ember.png`: a stylised lion face, gold to ember orange) appears where a row asks for it |
| Enemy | Dark red brick and blackened riveted iron, rusted red machinery, soot, black spike finials and amber slit windows. Booster engines fire red-orange. Banners are plain dark red with a black spiked-ring sigil, never letters |
| Alien | Iridescent dark chitin and bone-white ribbed shell, organic curves, teal-cyan bioluminescent veins and amber eyes |

The SISO side always looks more advanced than the enemy, above all the jets: the owner wants the SISO jet to beat the
enemy jet outright.

## Light

Light comes in four states, and they match the live sky so a sprite can sit in it:

- **Day:** warm sun from the upper right, cool sky fill from the left.
- **Dusk:** a low amber sun from the right, violet shadows, the first lights on.
- **Dawn:** a soft peach light from the left.
- **Night:** a cool moon rim from the upper left. The subject's own lights carry it, with a physical glow and no bloom
  haze.

The first light of a subject is its hero. Every other light, angle or frame of that subject is an **edit of the
hero**, so the two images line up when the scene swaps them.

## Backgrounds (so the scene can cut them out)

| Key | Used for | Rule |
|---|---|---|
| transparent | anything, when the tool can | best: no cutting needed |
| magenta `#FF00FF` | most sprites | perfectly flat; no floor, shadow, reflection, gradient, or magenta spill on the edges |
| green `#00FF00` | subjects with pink, magenta or violet in them (neon, blossom) | the same rules |
| black `#000000` | self-lit effects (fire, flashes, portals, holograms, fireworks, cirrus) | screen-blended over the scene, so everything that isn't the effect is exactly black |
| none | plates (Earth from orbit, palace interiors, story keyframes) | the whole frame is the scene |

The first art was shot on a mid-grey background, which made clean cut-outs hard. That's why this list exists.

## Text

None, except where a row allows it: the single word SISO on the tower crown, the SISO stencil and lion on the jet, and
the lion-head emblem on SISO-branded things. Never invented letters, signs or numbers.

## Size

The largest native size the tool offers. At least 2048 px on the long side is asked for; the check fails anything
under 1536 px. Strips and plates are 3:1 panoramas; the tower is the tallest portrait on offer.
