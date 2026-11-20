#!/usr/bin/env bash
# tools/site.sh: build the public site into site/ (not committed): the breakdown (every asset as stills on black) at /,
# the live scene at /scene, the README's media at /media/ and the T3 chapters at /chapters/ when tools/cut.py has cut
# them. Publish it with `npx wrangler deploy` from this folder (wrangler.jsonc).
# Needs Node and Chromium, as tools/stills.mjs paints the stills. Last line: PASS or FAIL.
set -euo pipefail
cd "$(dirname "$0")/.."
trap 'echo FAIL' ERR
node tools/clean-check.mjs
rm -rf site && mkdir -p site
cp -r src refs art LICENSE site/
cp -r media site/
if [ -f chapters/index.json ]; then cp -r chapters site/; else echo "no chapters/: T3 keeps the ones it has (python3 tools/cut.py)"; fi
cp breakdown.html site/index.html
cp index.html site/scene.html
node tools/stills.mjs --out "$PWD/site/stills" | tail -3
test -s site/stills/index.json
find site -name '.*' -prune -exec rm -rf {} +
du -sh site
echo PASS
