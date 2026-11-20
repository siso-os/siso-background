# Events

An event is something that happens in the scene at a planned moment: a police chase across the bay, a jet flyby, a
raid. The director (`src/engine/director.js`) plans them; each lives in one file here and one line in `index.js`.

## When and where

Time is cut into slots of 30 s, on two tracks that run side by side: `ground` (sea level and the clouds) and `space`
(the palace, 6900 units up), so a ground slot is never spent on something nobody at sea level can see. An event joins
the space track with `track: 'space'`. For slot `n` the director seeds `rng(hash(seed, salt, n))`, leaves a share of
slots quiet (ground 0.2, space 0.66), and otherwise picks an event (by `weight`, among those whose `where` allows the
place) and a start `t0 = 30 n + 0..6 s`.

Wars (`war: true`) are rationed: a ground slot asks for a war with chance 0.3, raised to the event's `pull` where an
event with a `pull` fits (the barrage at the home bay and the island fall take 0.9, the raid 0.4), and a slot never
holds a war when the slot before it asked for one. On five seeds that is a war every 2.3 to 2.5 minutes, the median
gap 2 minutes, none back to back; the rest is calm (patrols, flybys, launches). The palace is attacked on about one
visit in three (25 to 42 % over five seeds). The event is placed at `x0 = autoX(t0)`: the world x at the middle of the screen on the camera's
auto path at that moment. So with the camera untouched every event plays on screen, and any `t` shows the same thing
whoever looks (`?t=`, `?freeze=1` and the self-tests rely on this). Someone scrolling away simply misses it.

## The module

```js
export default {
  id: 'patrol',                 // kebab-case, unique; the file is <id>.js
  title: 'Police patrol',       // for people
  about: 'One line on what happens.',
  dur: 34,                      // seconds it runs
  span: 0,                      // optional: seconds its marks last after it starts, if longer than dur (ruins, rebuilds)
  weight: 3,                    // how often it is picked against the others
  where: null,                  // null for anywhere, a list of place types (['home', 'harbour', 'desert', 'neon',
                                // 'opensea', 'arctic']), or a function (place, at) => bool, at = the plan's second arg
  track: 'ground',              // optional: 'space' for an event that plays up at the palace
  war: false,                   // optional: true for a war (rationed, never two back to back)
  pull: 0,                      // optional, wars only: the war chance in slots where this event fits
  plan(r, { t0, x0, place, slot, seed, autoX }) { return { /* the event's own parameters, from r only */ }; },
  items(ev, t, L, view) { return [ /* what is on screen at t */ ]; },
  marks(ev) { return [ /* buildings it changes, see below */ ]; },   // optional
  states(ev, t) { return [ /* states it gives to things the world placed, see below */ ]; },   // optional
};
```

- `plan` gets its own seeded `r` (`rng(hash(seed, id, slot))`, with `r.range`, `r.int`, `r.pick`, `r.chance`) and
  returns plain numbers. Return `null` to skip the slot. The director adds `id, slot, t0, x0, dur` to what it returns.
- `items(ev, t, L, view)` is a pure function of `t`: no state between frames, no `Math.random()`. `u = t - ev.t0` runs
  0 to `dur`. It returns world items the engine draws like any other:
  `{ id, x, y, z, s, flip, seed, state, p, kind, reflect, extra }`, where `extra` is spread into the asset's draw
  options (for example `fx.trail` reads `extra.points`, `fx.wake` reads `extra.speed`). `kind: 'boat'` with
  `reflect: true` gets a broken reflection in the water. It may also return overlays:
  `{ overlay: true, z, draw(ctx, view, L, t) }`, drawn in screen pixels after the haze of its layer, for light on the
  water and other additive glows (`view.sx(x, z)`, `view.sy(y, z)` and `view.k` turn world units into pixels).
  An item may carry `rot` (radians, clockwise on screen, about its anchor) or draw itself: `fn(g, o)` with `w` and `h`
  (for culling) paints in the item's own frame, for an asset clipped or moved (the launch draws the rocket that way).
- An event with a `span` is asked for items until `t0 + span`, so smoke over ruins and the cranes of a rebuild can
  outlive `dur`.
- Depths: `z` picks the layer (far below 0.4, mid to 0.9, main to 1.12, near beyond). The bay's open water runs from
  about `z` 1.05 to 1.4; the city's front row is at 1.0; the sky lanes are at 0.6 to 0.95.

## Buildings that fall and rise

An event changes buildings by returning marks:

```js
marks(ev) { return [{ x0: ev.x0 - 120, x1: ev.x0 + 120, z0: 0.95, z1: 1.01, at: ev.t0 + 6, fall: 4, ruin: 40, build: 8 }]; }
```

Every building whose `x` and `z` fall inside a mark goes, from `at`: `collapse` with `p` running 0 to 1 over `fall`
seconds, then `ruin` for `ruin` seconds, then `construct` with `p` 0 to 1 over `build` seconds, then back to `idle`.
The renderer asks `Director.stateFrom(director.marks(t), building, t)` for each building every frame and passes the
state and `p` to the asset, so the building itself only needs to draw those states (the city soul's buildings do).
Set `span` to at least `at - t0 + fall + ruin + build` so the director keeps the mark alive after the event ends.

## Things the world already placed

An event never draws a second tower, dome, enemy island or palace: it gives the one the world placed a state.

```js
states(ev, t) { return [{ id: 'islands.enemy', x0: ev.ix - 1, x1: ev.ix + 1, from: ev.t0 + 2, to: ev.t0 + 9, state: 'fire' }]; }
```

Each entry lives while `from <= t < to`. The renderer gives a world item whose `id` matches and whose `x` lies in
`x0..x1` the entry's `state` and `p` (0 to 1 across from..to unless the entry sets `p`), and applies `dx`, `dy`, `rot`
(moved and turned about its anchor), `hide: true`, and `extra` (spread into the asset's options, e.g. the dome's
`hitX, hitY`). The first live entry for a thing wins, so list the short ones (a hit) before the long ones. The tower and
dome ride on the home island; their entries match on the island's x.

## Shared pieces

`_war.js` (not an event) holds what the wars share: finding cities, buildings, enemy and home islands and palaces near
the auto path; `missile()` (an `air.missile` on a path with its `fx.trail` computed backwards from the path, so a frozen
frame shows the trail already long; `stop` ends it early, at a hit or an intercept, and its trail then hangs for `linger`
seconds, drifting, thinning from its old end, so a hit never wipes the smoke in one frame); `blast()` (explosion, flash, light, sky flash); `burning()`, `collapse()` (dust,
debris, then fire on the ruin), `crane()`, `rising()` (a defence rising out of its pit), and `flush()`, which turns the
lights an event collects into overlays: an additive warm wash on what is near, broken streaks on the water under lights
below 700 units, and a faint lift of the whole sky for the biggest blasts. By day the washes are a quarter as strong.

## The events so far

- `patrol`: a police boat chases a smuggler across the bay, both throwing wakes; the light bar flashes blue and red and
  lights the water under it.
- `flyby`: two to four jets cross high in an echelon with contrails that sag and fade behind them; sometimes enemy jets.
- `raid` (war): an enemy island in reach of a city fires two ripples of thirteen missiles that arc over the bay; SAMs
  and CIWS rise out of the quay to knock some down; the rest land, blocks fall in dust, burn, and are rebuilt under
  cranes.
- `hellfire` (war): a slanted sheet of 130 real missiles with trails (up to 87 in the air at once) over a far
  sheet of streaks in the haze; a carpet of impacts rolls across a city in six seconds, the quay guns fire bursts into
  it, buildings fall, smoke rolls off it all.
- `barrage` (war, home bay only): enemy rounds burst on the SISO dome; the tower goes into `barrage` and its ports throw
  missiles that arc over the bay onto the enemy island, which flares, burns and smokes.
- `island-fall` (war): jets put missiles into an enemy island's engines; it tips, burns and drops into the bay behind
  the city; the crash flattens the blocks in front; a new island is lowered back into place long after.
- `portal` (war): a ring opens over the bay; craft, flyers, drifters and walkers pour out; jets, SAMs, CIWS, a warship
  and artillery shoot them down; the ring closes.
- `palace-attack` (space track): five attack ships strafe the palace; its shield flares, its guns answer, blasts
  flash on the hull.
- `launch`: a rocket on its pad lifts off, climbs out of the frame leaving a billowing column, pitches over and arcs up
  into space (every third ground slot at most, so one launch is over before the next).
