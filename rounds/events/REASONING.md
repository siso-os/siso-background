# Events soul: the war, the portal, the space attack and the launch

## What these are for, in The brief's words

"artillery on those islands, air defence ... jet fighters, rocket ships, missiles, hellfire swarms where it's like 50
missiles raining down like rain ... cities die, building animations, construction animations ... flying cities can fall
and take down other buildings and they get rebuilt ... you go into space ... a floating space palace ... being attacked
... sometimes portals and aliens come out and then all of these guys start shooting the aliens". And from City Wars: the
SISO tower raises a shield and fires a barrage back at the enemy island.

The assets are the actors; the events are the story. Seven of them: `raid`, `hellfire`, `barrage`, `island-fall`,
`portal`, `palace-attack` (up in space) and `launch`. Everything else on screen stays calm (patrols, flybys), so a war
reads as an event, not as wallpaper.

## Three moments he sees them

1. **A glance at the T3 background while he works.** Most of the time it is calm: boats, a flyby, a launch now and
   then. About every two to three minutes something happens on the auto path, and it must read in one glance from the
   corner of an eye: a sheet of orange sparks falling slant across the sky, a city block flaring, a green ring opening
   over the bay. At night the war lights the scene (the water, the faces of the towers, the smoke); in daylight it
   reads through smoke, trails and debris.
2. **The lock screen.** One frozen frame. Any t must be a picture on its own: a jump into the middle of a hellfire must
   show the sheet mid-fall with trails already long, burning blocks already smoking, not a first frame of a cartoon.
   This is why everything is a pure function of (ev, t): trails are computed backwards from the missile's path, fires
   and smoke start at the hit time, ruins and rebuilds come from marks.
3. **Scrolling the site with Shift+D, climbing with Shift+W.** Events are planned on the auto path; someone who scrolls
   away misses them, someone who stops sees the ruins smoke and the cranes rebuild. Following the launch up with
   Shift+W shows the rocket arc over into space; going up near a palace shows it under attack about one visit in three.

## What exists

- The director plans one event per 30 s slot along the auto path; marks drive building states (collapse, ruin,
  construct). The renderer draws world items, overlays, carries the tower and dome on the home island.
- 71 assets: missiles (siso, enemy), trails, explosions, fireballs, fire, smoke, debris, dust, flash, intercept,
  shield-hit, splash, tracer; SAM, CIWS, artillery, warship, jets; the enemy island with fire, hit, fall; the tower with
  shield and barrage; the dome with hit; the palace with attack and hit; attack ships; the portal and four aliens; the
  rocket ship with a 14 s launch.
- References: `refs/elements/hellfire-swarm.webp` (thin parallel grey trails, tiny orange heads, a slanted sheet),
  `refs/options/option-d-storm.webp` (the sheet falling on the right third of the frame onto a small burning city, black
  smoke rolling off it, interceptors crossing flat from the dome), `refs/elements/portal-aliens.webp` (a ring the size
  of a third of the frame, craft and jellyfish streaming out sideways, green and violet on the water).

## The hardest piece: the hellfire sheet

Three ways to draw it:

1. **Every missile a real `air.missile` with its own `fx.trail`.** Cost: about 140 items at the peak, each trail a few
   stroked segments at swarm scale (fx.trail drops to strokes below 3 px). Gain: the real assets, lit by the hour,
   counted by the check, each head blooms; trails billow where they are near.
2. **One overlay painting the whole sheet as streaks.** Cost: next to nothing. Gain: density for free. Loss: not the
   assets, no smoke billows, reads as rain, not missiles; the check counts nothing.
3. **Both: a near sheet of 60 to 70 real missiles with trails, behind it a far sheet of thin streaks in one overlay.**
   The near sheet carries the detail and the light; the far sheet gives the depth of the reference (hundreds of sparks
   receding into the haze) at almost no cost.

Pick: 3. After pass 2 the near sheet is 130 real missiles (87 in the air at once, 253 items at the peak against the
700 cap), spread in depth so far ones are smaller, hazier, with shorter trails; the far sheet is a band of streaks
higher up (y -1700) that lands on the far shore. The impacts roll across the city as a carpet over 6.5 s: a third land
as full `fx.explosion`, the rest as `fx.flash` plus a small `fx.fireball` burst or a `fx.splash` in the bay, so the
frame never holds more than a couple of dozen full explosions.

## What sells "hyper-real"

- **Light.** Night is the money shot: every blast and motor is also a light. Overlays add a warm wash over the
  buildings and smoke around each blast, a broken streak on the water under it, and on the biggest blasts the whole
  sky lifts faintly for a few frames. Fires keep a low flicker on the water as long as they burn.
- **Haze and scale.** Missiles are small, as in the references; far ones sit in the haze. Nothing is a hero render.
- **Persistence.** Smoke from burning blocks drifts with one wind for the whole event; trails hang and widen.
- **Cause and effect.** Every explosion has a missile that made it; every ruin has an explosion; every intercept has
  an interceptor that met a missile. Pure geometry, solved backwards from the hit.

## Calls I made

Hooks outside `src/events/` (the brief allows small ones in director, renderer and world):

- `src/engine/director.js`: two tracks, `ground` (salt 'slot', quiet 0.2, war 0.3) and `space` (salt 'space', quiet 0.66,
  war 0), each with its own 30 s slots, so a ground slot is never spent on the palace nobody at sea level can see. A
  module may say `war: true`, `pull` (a war that only fits a few places raises the war chance where it fits),
  `track: 'space'`, `where` as a function `(place, at)`, `span` (asked for items past `dur`: ruins smoke, cranes
  rebuild) and `states(ev, t)` (states for things the world already placed: the enemy island firing, the tower shield,
  the dome hit, the palace attacked). `roll(n)` is pure in (seed, track, n) so the never-two-wars-in-a-row rule reads
  the slot before without a chain back to slot 0.
- `src/engine/renderer.js`: world items take their state from `Director.stateOf`; items carry `rot`; an item may be
  `{ fn(g, o), w, h }`, drawn in the item's frame (used to split the rocket from its pad and to raise defences out of
  the quay deck).
- `src/engine/selftest.js` (one line, not on the brief's list of hook files): `events-planned` now walks both tracks,
  or it would fail for the palace attack, which only plays in space. Nothing else in the check changed.
- `src/engine/world.js`: untouched.

Calls inside the events:

- **Cadence (seed 0, 1, 2, 3, 7, 480 ground slots = 4 h):** a war every 2.31 to 2.53 min (95 to 104 wars), median gap
  1.5 to 2 min, never two wars back to back (0 in all five seeds). Weights: barrage 5 and island-fall 5 (pull 0.9, they
  only fit the home bay or an island over a city), raid 3 (pull 0.4), hellfire 2, portal 1 (it fits anywhere, so it is
  the war the others leave over). Seed 0 shows all nine ids in its first 60 slots.
- **Space:** quiet 0.66 on the space track. Over 48 palace visits (one per 30 s slot while the camera sits at the
  palace) the attack plays on 25%, 33%, 42%, 33% and 38% of visits for seeds 0, 1, 2, 3, 7: about one visit in three.
- **Launch:** at most every third ground slot (90 s apart) so one launch is over before the next can start. After the
  asset's own 14 s launch (900 units up) the event takes over: the rocket is clipped out of the asset and flown on a
  path that pitches over to 0.52 rad, climbs past 1500 units and crosses the space band (y -7650 to -6630) from about
  48 s to 52 s after t0; the asset's pad stays, clipped around the rocket; the steam plume is the event's own puffs
  along the path, aged by when the rocket passed each point.
- **Raid:** the launchers stand on the quay, not on rooftops (a roof can collapse from under them, and the asset's
  box sits too high on a roof). Island-fall lowers the replacement island back in from above when the ruin is done.
- **No Math.random anywhere:** every jitter is `r()` at plan time or `hr(i, salt)` at draw time.

## Pass 1

All seven, end to end, at night (`&h=20&day=999999`), 5 frames each unless named:
`pass1-raid-strip`, `pass1-hellfire-strip`, `pass1-barrage-strip`, `pass1-island-fall-strip`, `pass1-portal-strip`,
`pass1-palace-attack-strip` (y -6900), `pass1-launch-strip` and `pass1-launch-space` (3 frames, y -6900).

- **raid:** reads: salvo off the island, blocks flare and fall in dust, fires and black smoke by u 24. First shots had
  the launchers floating on rooftops (shot before the quay move); re-shot.
- **hellfire:** the sheet falls, the carpet rolls, the water burns orange under it. But the live heads stacked into one
  narrow dark column over the impact point: see pass 2.
- **barrage:** shield up on the tower, interceptors cross to the island, it bursts at u 9 and burns. Reads.
- **island-fall:** the island burns, tilts and drops; the city under it goes up in a lit cloud, then burns. Reads.
- **portal:** ring opens, aliens out, jets and the quay shoot them down, the ring collapses to a point at u 28. The
  centre glowed bright teal and the aliens were few and scattered: see pass 2. The water under it was a column of
  even dashes; it is now a glitter path (broken, tapering, flickering) for every light near the water.
- **palace-attack:** fighters with tracers circle the palace, its shield ripples where they hit. Reads, small.
- **launch:** pad, ignition glow, the climb on its flame, the steam column leaning as it pitches over. The first space
  frames (u 45 to 48) were too early: the rocket enters the space view at u 48.5 and leaves the top at u 52.4; re-shot
  at u 49, 50.5, 52.

## Pass 2

Against the three references, night (`h=20`) and noon (`h=12`): `pass2-hellfire-night`, `pass2-hellfire-noon`,
`pass2-raid-night`, `pass2-raid-noon`, `pass2-portal-night`, `pass2-portal-noon`.

- **hellfire vs `hellfire-swarm` / `option-d-storm`. Biggest gap: density and shape.** The reference is a wide slanted
  sheet of parallel thin trails; mine was a narrow dark column (every missile aimed at its impact point, launched so all
  arrived on the carpet, so the heads stacked). Fix: the missiles no longer all aim at one spot. Each falls on one slant
  (0.95), at its own speed (300 units/s, 0.8 to 1.2 of it), from its own start, so the sheet is a slab of parallel
  trails sliding down at an angle; the near sheet went from 60 to 130 missiles (87 in the air at once); the far sheet
  starts higher (y -1700) so it never pops in inside the frame. At noon the sheet reads as grey trails over the city
  and the carpet as dust and black smoke, which is what the reference does by day.
- **raid vs `option-d-storm`. Biggest gap: scale.** The blasts were mushrooms as wide as a block row; the reference's
  hits are small against the city. Fix: the blast is sized to the block it hits (0.28 plus up to 0.16 by width), and
  the salvo is two ripples of 13 (26 missiles, 7 hits) so the sky holds more trails than blasts.
- **portal vs `portal-aliens`. Biggest gap: light.** My centre lights made the inside of the ring a teal disc; in the
  reference the inside is dark and the light is in the rim. Fix: eight lights travelling round the rim (green and
  violet), none in the centre, and a swarm of 40 small flyers streaming sideways out of the ring for the whole time it
  is open, so it pours as the reference does instead of releasing a handful of aliens.

## Pass 3

`pass3-hellfire-sequence`: twelve frames 0.5 s apart (u 8 to 13.5) through the hellfire carpet at night, the busiest
stretch of any event (253 items, 87 missiles in the air). Beside the frames, a frame-to-frame pop finder (every item of
every event stepped 0.05 s apart, flagging anything that appears, vanishes or jumps more than a few pixels between
two steps) ran over all nine events. What it and the frames found, and the fixes:

- **Smoke wiped in one frame.** A missile shot down or landing took its whole 300-unit trail with it. Now `missile()`
  has `stop` and `linger`: at the hit the body goes, the trail hangs on for 1.2 to 1.6 s, still drifting and sagging,
  and thins from its old end. Every event uses it.
- **Intercepts that burst late.** In the hellfire the burst of a missile shot down was skipped until the time it
  would have landed, so 11 intercepts popped in up to 91 px late; fixed by handling kills before the landing test.
- **Tracer streams that switched on and off at full length.** The gun streams now reach out from the muzzle at the
  rounds' speed, and after the kill the last rounds fly on and the stream leaves the muzzle (raid, portal); the
  hellfire guns fire 0.25 s bursts, each at one missile chosen at the start of the burst, so the stream no longer
  jumps from missile to missile mid-burst.
- **Fires that started at half size.** `burning()` flames now catch from 15 % and grow over 1.5 s; the island's
  engine fires die into the crash in 0.5 s instead of vanishing with the island.
- **The falling island's smoke column cut off at the crash.** It now stays where the island went in and thins away
  over 8 s.
- **A white core where the carpet is densest.** Thirty lights summed to white. `flush()` now has a soft knee: past a
  total of 4 the lights add a third as much, so the blasts keep their shape and colour and the city still glows.

After the fixes the pop finder flags only boxes, not pixels: `fx.trail` and `fx.tracer` items whose drawn length grows
from zero inside a fixed box, the launch split (the rocket handed from the asset to the event's own path, drawn in the
same place), cranes and defences rising out of a deck, and the launch steam's box growing as puffs are added.

In the twelve frames the sheet slides down its slant without a stutter, the carpet rolls left to right, smoke builds
over the ruins behind it, nothing pops, and every frame is a picture on its own.

## Still weak

- **The explosion asset reads as clip art up close.** Its mushroom caps and dust balls are round, dark and flat-shaded;
  at hellfire density they stack into a row of brown blobs, and the flak bursts (`fx.intercept`) read as grey rocks.
  The events shrank and spread them as far as sizing goes; the shapes are the asset's (`src/assets/fx`), out of bounds.
- **The portal at noon** is a dark ring with a bruise-coloured halo from the asset's glow; it only sells at night.
- **The palace attack is small**: five ships and the shield ripple at the palace's scale read as a skirmish, not a
  battle. More ships would need the palace asset's hit states to keep up.
- **The rocket crosses the space band in about 4 s** (u 48.5 to 52.4), so the launch is easy to miss up there, and the
  pad's steam column stops changing once the asset's own launch is over.
- **The guns' barrels jump** from one target to the next between bursts (CIWS in raid and hellfire) with no slew;
  the barrel is a few pixels, so it shows only in motion.
- **The water reflections of the city lights** under the hellfire are strong striped columns; they belong to the
  world's water, not to the event, but at night they compete with the fire's own light on the bay.
