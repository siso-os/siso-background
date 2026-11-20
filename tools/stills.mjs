#!/usr/bin/env node
// node tools/stills.mjs [--out <dir>] [family ...]
// Paints every asset (every state, by day and by night, on black) and every sky entry to still pictures, for the
// breakdown page (index.html). Writes <out>/<id>/<state>-<day|night>.webp (1280x800), a 480x300 .thumb.webp beside each,
// and <out>/index.json (families, assets, images). Default out: stills/ (not committed; run this after any asset change).
// Last line: PASS or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withServer, chrome, ROOT } from './chrome.mjs';

const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const OUT = path.resolve(oi >= 0 ? args.splice(oi, 2)[1] : path.join(ROOT, 'stills'));
const FAMS = ['sky', 'nature', 'islands', 'city', 'sea', 'air', 'defence', 'fx', 'space', 'aliens'];
const want = args.length ? args : FAMS;
const problems = [];
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

fs.mkdirSync(OUT, { recursive: true });
const index = { made: new Date().toISOString(), families: [], assets: [], images: [] };

await withServer(async (base) => {
  for (const fam of want) {
    let dom = '';
    try { dom = chrome(['--window-size=400,300', '--dump-dom', `${base}/tools/stills.html?family=${fam}`], { budget: 90000, timeout: 600000 }); }
    catch (e) { problems.push(`${fam}: chrome failed: ${String(e.message).slice(0, 160)}`); continue; }
    const m = dom.match(/<pre id="result">(\{[\s\S]*?)<\/pre>/);
    let r = null;
    try { r = JSON.parse(decode(m[1])); } catch { problems.push(`${fam}: no result (${m ? m[1].slice(0, 80) : 'no block'})`); continue; }
    problems.push(...r.problems);
    index.families.push({ id: fam, title: r.familyTitle });
    for (const a of r.assets) {
      const dir = path.join(OUT, a.id);
      fs.mkdirSync(dir, { recursive: true });
      const files = {};
      for (const [state, byHour] of Object.entries(a.stills)) {
        files[state] = {};
        for (const [k, url] of Object.entries(byHour)) {
          const name = `${state}-${k}`;
          const big = path.join(dir, `${name}.webp`);
          fs.writeFileSync(big, Buffer.from(url.split(',')[1], 'base64'));
          execFileSync('magick', [big, '-resize', '480x300', '-quality', '80', path.join(dir, `${name}.thumb.webp`)]);
          files[state][k] = `${a.id}/${name}`;
        }
      }
      delete a.stills;
      index.assets.push({ ...a, files });
    }
    console.log(`${fam.padEnd(8)} ${r.assets.length} assets`);
  }
});

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/gallery/catalog.json'), 'utf8'));
for (const f of cat.families ? Object.entries(cat.families) : []) {
  const fam = index.families.find((x) => x.id === f[0]);
  if (fam) fam.what = f[1].what;
}
index.images = (cat.images || []).map((i) => ({ path: i.path, title: i.title, group: i.group, sub: i.subTitle || i.sub, what: i.what }));
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
const n = index.assets.length;
if (n < 70) problems.push(`only ${n} assets painted; want 70 or more`);
for (const p of problems) console.log(p);
console.log(`${n} assets, ${index.images.length} images -> ${path.relative(ROOT, OUT) || OUT}`);
console.log(problems.length ? `FAIL (${problems.length})` : 'PASS');
process.exit(problems.length ? 1 : 0);
