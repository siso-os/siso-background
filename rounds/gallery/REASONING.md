# The asset page: reasoning

## What it is for, in his words

The owner, 20 Nov 2026: "an asset page, you can show me all the components that we've made that goes together, all the
different buildings, and I can click and see them, scroll through them ... all the different sky things and all the
different assets that we've made and images, just a way to see everything that we've built, and everything goes from
here. That way an agent will never forget what we've already built and where it lives." And: "making it actually
beautiful and really, really fucking nice. Like the components."

So the page has two readers. The owner looks: every asset alive, at a glance, beautiful, one click to play with it. An agent
reads: what exists, what each is called, which file holds it, what it was matched to. The page serves the first; its
twin, `ASSETS.md`, serves the second with the same list as text.

## Three moments

1. **"Show me every building we have."** He opens `assets.html`, clicks City in the side nav, and gets the full grid of
   city assets, each a small live painting at dusk. He hovers one and it moves; he flips the grid's light to Night and
   every tile relights at once. He clicks the tower and it opens large with its states.
2. **"Where does the police boat live?"** An agent (or the owner) presses `/`, types `police`, sees the police boat tile, the
   photo cut-outs and the reference that mention it, opens the asset and reads `src/assets/sea/police-boat.js` with a copy
   button. Or the agent never opens the page: `ASSETS.md` has the same row. `assets.html#sea.police-boat` is a link
   anyone can send.
3. **"Does the code island look like its painting?"** He opens `islands.siso-home`: the live render on the left, the
   reference painting on the right at the same height, the hour slider under the render. He drags the hour to the
   painting's dusk and compares. The painting links to its own page (prompt, file), which links back to every asset
   matched to it.

## Three layouts

| Layout | Cost | Gain |
|---|---|---|
| A. Grid of all tiles, every family stacked; detail in a wide kit drawer | At 70 assets + 68 images it is 8 to 11 screens on a phone: the kit's `endless_page` check fails, and the families under the fold are never seen | Simplest code; one mode |
| B. Split pattern: tile list on the left, the open asset on the right | The live tiles shrink to a 400 px column of rows (the painting is the point, a row of words is not); the open asset gets less than half the width, too little to compare with a painting | Browse and look at once |
| C. **All = one shelf per family (a row that scrolls sideways), a family = its full grid, find = a grid of matches; the open asset in a wide kit drawer (full screen on a phone)** | Two grid modes to keep honest (shelf and wrap); a shelf hides its tail until scrolled | The All view is a fixed ~2 screens however many assets land, every family is above the fold or near it, nothing is cut off (each shelf links to its full grid), and the drawer is wide enough for render and painting side by side |

Pick: **C**. The kit's own rule ("a long list shows its first rows; the rest open in place, so no view is an endless
scroll") says the same thing, and shelves are how people browse big visual catalogues. A family view keeps "two tiles
a row" on a phone; the All view shows two and a peek of the third.

## What I am deliberately not adding

- No thumbnails generated into the repo: the images are 3 to 540 KB each and lazy-loaded; a build step would be one
  more thing to forget.
- No editing, tweaking or saving of asset parameters: the page shows what exists, the files change it.
- No WebGL in tiles: the sky family renders through one shared canvas only when `src/engine/backdrop.js` exists.
- No per-asset tabs: one drawer, one screen on a laptop (render, controls, painting, facts).
- No pagination, sorting menus or favourites.

## Calls I made

- **Hub colour.** The kit has no hue for SISO Background and `kit/` is not mine, so the page uses `data-hub="people"`,
  the kit's default amber, which is also the dusk sun every tile is drawn in.
- **The image list is generated.** A static page cannot list folders, so `tools/index.mjs` writes
  `src/gallery/catalog.json` (every image under `art/` and `refs/` with its size, light, place and prompt, the family
  notes from CONTRACT.md §5, and whether `src/engine/backdrop.js` exists) next to `ASSETS.md`; `--check` checks both.
  Assets are not in it: the page reads `src/assets/registry.js` live, so merged assets appear with no step.
- **The backdrop import is gated on the catalog** (`backdrop: true`) and then done in a try/catch, so the page never
  requests a missing file (a 404 shows as a console error in the kit's page check). After the engine branch lands,
  `node tools/index.mjs` flips it; `gallery-check` fails until then because ASSETS.md is stale, which says so.
- **Plain-mode self-tests need an asset with states.** The registry on this branch is empty, so for `state-buttons` and
  `hour-changes-picture` the self-test opens the first registered asset with two or more states, and while there is
  none it opens `fixture.building` in the drawer only (never as a tile; the note says which it used).
- **Fixture file path.** The three samples live in `src/gallery/fixture.js` and say so in the drawer; their family is
  `fixture`, shown as "Samples" only with `?fixture=1`.
- **Empty families** show as one kit list in the All view ("Still to draw", two columns of rows on a laptop) with the
  number of ids CONTRACT.md §6 asks for and the folder each will live in; a family's own view lists those ids, so an
  agent sees what is missing and where each will go.
- **Find searches the current view** (All by default) and switches to a wrap grid while there is a query.
- **Space assets are drawn in space light** (`lightAt(h, { altitude: 1 })`): dark sky, stars, no sea band. Air, space,
  aliens and effects float centred in their tile; everything else stands on the sea line.
- **Headless virtual time.** `gallery-check` runs Chromium with `--virtual-time-budget`: an idle page jumps straight to
  its next timer (the kit's 30 s clock), while frames, IntersectionObserver callbacks and lazy images only arrive in real
  time. A self-test that waited on frames or `setTimeout` burnt the whole budget before it wrote its result. So: tiles
  are also measured synchronously (`measure()`, from `getBoundingClientRect`, run on every view change); the first
  8 images of each section load eagerly; and the self-test waits by fetching a tiny file
  (`kit/assets/siso-lion.svg?wait=n`, no-store), which holds virtual time while the page catches up. The observer
  still does the work in a real browser.
- **No rings inside the drawer.** The kit page check (rule 7, no box in a box) flagged the stage, the painting, the
  path, the stepper and the prompt, each drawn with a 1 px ring inside the drawer's frame. They keep the sunk fill and
  lose the ring.
- **Shots of the open drawer at 1440 are cut at the bottom.** `tools/shoot.mjs` (not mine) takes a 987 px tall shot and
  crops it to 900; CSS `svh` sees the 987, so a drawer sized to the screen runs 87 px past the crop. In a real 900 px
  window it fits. I left the tool alone.

## Rounds

1. First shots: the drawer opened with a focus ring on "Copy link"; the painting beside the render was cropped by
   `cover`; on a phone tile ids were cut ("fixture.buildi…"). Fixed: the title takes focus (no ring), paintings are
   `contain` on their own light, ids wrap.
2. A small cut-out (the police boat) sat in an 800 px tall dark stage with its glow far below it, and ids broke
   mid-word ("fixture.buildin / g"). Fixed: an image's stage takes the picture's own shape (kept between 0.8 and 2.4),
   and ids break only after a dot or an underscore.
3. Kit page check (`hub.py check --surface dashboard`): the grid failed rule 8 (the "Still to draw" band was ten
   word-only cards); the open drawer failed rule 7 (rings) and the tap-target floor (the painting's path link and the
   "Matched by" links were 18 px tall). Fixed: a kit list of rows, no rings, links 28 px tall (44 px on a phone).
   Re-run: exit 0 at 1440x900 and 390x844 for the grid, the References view, an open asset, an open cut-out and an open
   reference (10 of 10).
4. Against real assets. `main` gained 21 assets (sea, air, defence) after this branch began, so I exported `main`
   into scratch, laid this branch's files over it and ran `node tools/index.mjs` there: `gallery-check` PASS (plain:
   21 asset tiles, 73 image tiles; fixture: 24), and the kit page check exit 0 at both widths for the grid and for
   `#sea.police-boat` open. Shots 11 to 13 are from that copy. After this branch merges, run `node tools/index.mjs`
   and commit ASSETS.md and catalog.json: until then `index.mjs --check` (and so `gallery-check`) says they are stale.

## Still weak

- **This branch's ASSETS.md lists no assets.** It was written from this branch's empty registry; the merge needs one
  `node tools/index.mjs` (round 4). The tile framing (78% of the width, 72% of the height) suits boats, aircraft and
  defence; very wide city assets such as a bridge have not been seen.
- **Sky and sea are untested.** They render through `src/engine/backdrop.js`, which is not on this branch; the code
  path is gated on the catalog and caught, but it has never drawn a pixel.
- **On a phone the painting sits below the controls**, so comparing render and painting takes a scroll.
- **A shelf hides its tail.** On a laptop with a mouse wheel, sideways scroll needs Shift; "See all N" opens the full
  grid, but nothing else hints that the row goes on except the cut-off last tile.
- **A tall cut-out leaves the facts column short**, so the lower right of the drawer is empty.
