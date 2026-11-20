#!/usr/bin/env node
// node tools/check.mjs [--family <f>[,<f>...]] [--min <n>]
// Draws every asset in every state at noon and midnight in headless Chromium (tools/checkall.html) and fails on a throw,
// an empty drawing, a drawing far outside its box, a missing required id or state, or an asset file missing from its
// family's index. --min <n> also fails when fewer than n assets are registered (for the family given). Last line: PASS or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { withServer, chrome, ROOT } from './chrome.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const family = opt('--family'), min = Number(opt('--min') || 0);
const problems = [];

const dom = await withServer(async (base) =>
  chrome(['--window-size=400,400', '--dump-dom', `${base}/tools/checkall.html${family ? '?family=' + family : ''}`], { budget: 30000 }));
const m = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
let report = null;
try { report = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); }
catch { problems.push('checkall.html did not finish: ' + (m ? m[1].slice(0, 200) : 'no result block (an import failed?)')); }

if (report) {
  problems.push(...report.problems);
  const ids = new Set(report.assets.map((a) => a.id));
  const fams = family ? family.split(',') : fs.readdirSync(path.join(ROOT, 'src/assets')).filter((d) => fs.statSync(path.join(ROOT, 'src/assets', d)).isDirectory());
  for (const f of fams) {
    for (const file of fs.readdirSync(path.join(ROOT, 'src/assets', f))) {
      if (!file.endsWith('.js') || file === 'index.js' || file.startsWith('_')) continue;
      const id = `${f}.${file.replace(/\.js$/, '')}`;
      if (!ids.has(id)) problems.push(`${id}: src/assets/${f}/${file} is not in ${f}/index.js (or its id differs from its file name)`);
    }
  }
  if (report.assets.length < min) problems.push(`only ${report.assets.length} assets registered${family ? ' in ' + family : ''}; want at least ${min}`);
  const draws = report.assets.reduce((n, a) => n + a.results.length, 0);
  console.log(`${report.assets.length} assets, ${draws} drawings checked`);
}
for (const p of problems) console.log(p);
console.log(problems.length ? `FAIL (${problems.length})` : 'PASS');
process.exit(problems.length ? 1 : 0);
