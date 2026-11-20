# SISO Background

One endless, living scene drawn entirely in code: a small coastal city under a big sky, the SISO floating island and
its tower, enemy islands, boats, jets, missiles, portals and aliens, and space above. It scrolls sideways on its own and
the day turns slowly. Now and then a war breaks out: raids, a hellfire swarm of fifty missiles, a falling island, a
portal full of aliens, an attack on the space palace, a rocket launch. Cities burn, fall and are rebuilt.

Live: https://background.sisolabs.space is every asset broken down on a black page; click one to flip through them
all. The scene itself is at https://background.sisolabs.space/scene.

Keys: Shift+A / Shift+D move left and right, Shift+W climbs above the clouds and then to space, Shift+S comes back down.
Left alone, it drives itself.

- `index.html`: the scene. `breakdown.html`: every asset as stills on black, with a viewer that flips through them and
  plays one live (run `node tools/stills.mjs` first; the stills are not committed). `assets.html`: the older live
  gallery, every asset playing at once.
- `CONTRACT.md`: how every piece is made (read it before you add one). `ASSETS.md`: every asset, its states and file.
- `src/core/`: light, paint and seeded randomness, shared by every asset.
- `src/assets/<family>/`: one file per asset; `src/assets/registry.js` lists them all.
- `src/engine/`: the camera, the world, the director that schedules events, the WebGL sky and sea.
- `src/events/`: one file per event (patrols, flybys, the wars); `src/events/README.md` says how to add one.
- `refs/`: the reference paintings assets are matched to. `art/`: the earlier photo art, kept as references.
- `rounds/<name>/`: each build round's reasoning and before/after shots.
- `tools/`: `serve.py`, `probe.html` (one asset, every state), `shoot.mjs`, and the checks below.

Run it: `python3 tools/serve.py 8765`, then open http://127.0.0.1:8765/. Query options: `?h=21` starts at 9 pm, `?zoom=1` the
whole width (1.25 by default), `?stats=1` frame times,
`&freeze=1&t=30` holds one moment, `&events=hellfire` plays only that event, `&y=-6900` starts in space.

Check it (each prints PASS or FAIL last; they need Chromium and ImageMagick):
`node tools/check.mjs` (every asset), `node tools/engine-check.mjs`, `node tools/events-check.mjs`,
`node tools/gallery-check.mjs`, `node tools/stills.mjs` (paints the stills), `node tools/perf.mjs` (frame times;
FAIL on a stall).
`node tools/clean-check.mjs` fails if any file names a path on someone's own machine: this folder is published as
it is.

Publish the site: `tools/site.sh` builds it into `site/` (the breakdown at `/`, the scene at `/scene`), then
`npx wrangler deploy` from this folder puts it on background.sisolabs.space. The code is public at
https://github.com/siso-os/siso-background.

Made by SISO. Code: MIT. The photo art under `art/isles/marina` and `art/isles/fx` is MIT, from an earlier SISO project.
