#!/usr/bin/env node
// node tools/shoot.mjs <path-or-url-in-repo> <out.png> [width] [height] [--budget ms] [--exact]
// e.g. node tools/shoot.mjs 'tools/probe.html?asset=city.spire&mode=grid' /tmp/spire.png 1600 1000
//      node tools/shoot.mjs 'index.html?freeze=1&h=20&t=30' /tmp/scene.png 1600 900 --exact
// Headless Chromium loads a page in a viewport 87 px shorter than --window-size and grows it to the full size just
// before the screenshot. A page that draws once at load (the probe, a lineup) is therefore shot taller and cropped;
// a page that follows the window size (index.html, assets.html) needs --exact, or its bottom 87 px are cut off.
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withServer, chrome } from './chrome.mjs';
const CHROME_BAR = 87;
const args = process.argv.slice(2);
const bi = args.indexOf('--budget'); const budget = bi >= 0 ? Number(args.splice(bi, 2)[1]) : 6000;
const ei = args.indexOf('--exact'); const exact = ei >= 0; if (exact) args.splice(ei, 1);
const [page, out, w = '1600', h = '1000'] = args;
if (!page || !out) { console.error('usage: shoot.mjs <page> <out.png> [w] [h] [--budget ms] [--exact]'); process.exit(2); }
await withServer(async (base) => {
  const url = page.startsWith('http') ? page : `${base}/${page.replace(/^\//, '')}`;
  chrome([`--window-size=${w},${Number(h) + (exact ? 0 : CHROME_BAR)}`, `--screenshot=${path.resolve(out)}`, url], { budget });
});
if (!exact) execFileSync('magick', [path.resolve(out), '-crop', `${w}x${h}+0+0`, '+repage', path.resolve(out)]);
console.log(path.resolve(out));
