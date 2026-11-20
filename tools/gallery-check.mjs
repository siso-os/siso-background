#!/usr/bin/env node
// node tools/gallery-check.mjs
// The finish line for the asset page. It loads assets.html twice in headless Chromium (plain, and ?fixture=1 with the
// page's three sample assets) and fails unless: the page's own self-tests pass; every asset file under src/assets and
// every image under art/ and refs/ has a tile (data-asset="<id>" / data-image="<repo path>"); and ASSETS.md, the text
// index for agents, names every one of those files and is up to date. Last line: PASS or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withServer, chrome, ROOT } from './chrome.mjs';

const NEED = ['every-asset-listed', 'every-image-listed', 'paths-shown', 'family-filter', 'find-filters', 'open-detail',
  'state-buttons', 'hour-changes-picture', 'thumbs-painted', 'deep-link', 'no-console-errors'];
const problems = [];
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const assetFiles = walk(path.join(ROOT, 'src/assets')).map(rel).filter((f) => /^src\/assets\/[^/]+\/[^_/][^/]*\.js$/.test(f) && !f.endsWith('/index.js'));
const ids = assetFiles.map((f) => f.replace(/^src\/assets\//, '').replace(/\.js$/, '').replace('/', '.'));
const images = [...walk(path.join(ROOT, 'art')), ...walk(path.join(ROOT, 'refs'))].map(rel).filter((f) => /\.(webp|png|jpg)$/.test(f) && !f.includes('/source/'));
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

await withServer(async (base) => {
  for (const mode of ['', 'fixture=1']) {
    const tag = mode ? 'fixture' : 'plain';
    let dom = '';
    try { dom = chrome(['--window-size=1440,987', '--dump-dom', `${base}/assets.html?selftest=1${mode ? '&' + mode : ''}`], { budget: 40000 }); }
    catch (e) { problems.push(`${tag}: assets.html did not load (${String(e.message).slice(0, 120)})`); continue; }
    const m = dom.match(/<pre id="selftest"[^>]*>([\s\S]*?)<\/pre>/);
    let st = null;
    try { st = JSON.parse(unesc(m[1])); } catch { problems.push(`${tag}: no <pre id="selftest"> JSON`); }
    if (st) for (const k of NEED) { const c = (st.checks || []).find((x) => x.name === k); if (!c) problems.push(`${tag}: selftest lacks ${k}`); else if (!c.ok) problems.push(`${tag}: selftest ${k} failed: ${c.note || ''}`); }
    const shown = new Set([...dom.matchAll(/data-asset="([^"]+)"/g)].map((x) => x[1]));
    const shownImg = new Set([...dom.matchAll(/data-image="([^"]+)"/g)].map((x) => unesc(x[1])));
    for (const id of ids) if (!shown.has(id)) problems.push(`${tag}: no tile for asset ${id}`);
    for (const f of images) if (!shownImg.has(f)) problems.push(`${tag}: no tile for image ${f}`);
    if (mode && [...shown].filter((i) => i.startsWith('fixture.')).length < 3) problems.push('fixture: fewer than 3 fixture.* tiles');
    if (!mode && [...shown].some((i) => i.startsWith('fixture.'))) problems.push('plain: fixture assets are showing without ?fixture=1');
    if (!/class="[^"]*\bk-app\b/.test(dom)) problems.push(`${tag}: the page is not on the kit's side shell (.k-app)`);
    console.log(`${tag}: ${shown.size} asset tiles, ${shownImg.size} image tiles`);
  }
});
const idx = path.join(ROOT, 'ASSETS.md');
if (!fs.existsSync(idx)) problems.push('no ASSETS.md');
else {
  const t = fs.readFileSync(idx, 'utf8');
  for (const f of [...assetFiles, ...images]) if (!t.includes(f)) problems.push(`ASSETS.md does not name ${f}`);
  try { execFileSync('node', [path.join(ROOT, 'tools/index.mjs'), '--check'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { problems.push('node tools/index.mjs --check failed: ASSETS.md is stale or the tool is missing'); }
}
for (const p of problems.slice(0, 40)) console.log(p);
if (problems.length > 40) console.log(`... and ${problems.length - 40} more`);
console.log(problems.length ? `FAIL (${problems.length})` : 'PASS');
process.exit(problems.length ? 1 : 0);
