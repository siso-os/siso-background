#!/usr/bin/env node
// node tools/engine-check.mjs
// The finish line for the engine: index.html?selftest=1 reports every self-test passing, and shots of the scene behave:
// noon is brighter than midnight, space is dark at the top with stars, the view moves on its own over time, and a jump
// to the same moment draws the same frame. Last line: PASS or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { withServer, chrome, ROOT } from './chrome.mjs';

const NEED = ['keys-move-camera', 'autoscroll', 'climb-to-space', 'deterministic', 'day-cycle', 'layers-parallax', 'no-console-errors'];
const problems = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-check-'));
const mean = (f, crop) => Number(execFileSync('magick', [f, ...(crop ? ['-crop', crop, '+repage'] : []), '-colorspace', 'gray', '-format', '%[fx:mean]', 'info:'], { encoding: 'utf8' }));
// magick compare prints "1234.5 (0.0188)" on stderr and exits 1 when the pictures differ, 0 when they match.
const diff = (a, b) => {
  const r = spawnSync('magick', ['compare', '-metric', 'MAE', a, b, 'null:'], { encoding: 'utf8' });
  const m = `${r.stderr || ''} ${r.stdout || ''}`.match(/\(([-+.\deE]+)\)/);
  return m ? Number(m[1]) : NaN;
};

await withServer(async (base) => {
  const dom = chrome(['--window-size=1280,800', '--dump-dom', `${base}/index.html?selftest=1`], { budget: 30000 });
  const m = dom.match(/<pre id="selftest"[^>]*>([\s\S]*?)<\/pre>/);
  let st = null;
  try { st = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch { problems.push('index.html?selftest=1 wrote no <pre id="selftest"> JSON'); }
  if (st) {
    for (const k of NEED) { const c = (st.checks || []).find((x) => x.name === k); if (!c) problems.push(`selftest lacks ${k}`); else if (!c.ok) problems.push(`selftest ${k} failed: ${c.note || ''}`); }
    for (const c of st.checks || []) if (!NEED.includes(c.name) && !c.ok) problems.push(`selftest ${c.name} failed: ${c.note || ''}`);
  }
  const shot = (q, name) => { const f = path.join(tmp, name + '.png'); chrome([`--window-size=1280,887`, `--screenshot=${f}`, `${base}/index.html?${q}`], { budget: 8000 }); execFileSync('magick', [f, '-crop', '1280x800+0+0', '+repage', f]); return f; };
  const noon = shot('freeze=1&h=12&t=30', 'noon'), night = shot('freeze=1&h=0&t=30', 'night');
  const space = shot('freeze=1&h=12&t=30&y=-7000', 'space'), later = shot('freeze=1&h=12&t=90', 'later'), again = shot('freeze=1&h=12&t=30', 'again');
  const mn = mean(noon), mni = mean(night), msTop = mean(space, '1280x300+0+0'), mnTop = mean(noon, '1280x300+0+0');
  if (!(mn > mni + 0.15)) problems.push(`noon (${mn.toFixed(3)}) is not clearly brighter than midnight (${mni.toFixed(3)})`);
  // midnight is dark, not black: a layer drawn opaque over the sky (a glow pass that kept its black) read 0.002, a real night 0.07
  if (!(mni > 0.02)) problems.push(`midnight (${mni.toFixed(3)}) is black: something covers the sky and the stars`);
  if (!(msTop < 0.12 && msTop < mnTop - 0.3)) problems.push(`space at noon is not dark at the top (${msTop.toFixed(3)} vs ground sky ${mnTop.toFixed(3)})`);
  const stars = Number(execFileSync('magick', [space, '-crop', '1280x300+0+0', '+repage', '-colorspace', 'gray', '-threshold', '60%', '-format', '%[fx:mean*w*h]', 'info:'], { encoding: 'utf8' }));
  if (!(stars >= 40)) problems.push(`space shows ${Math.round(stars)} bright star pixels at the top; want 40 or more`);
  const dMove = diff(noon, later), dSame = diff(noon, again);
  if (!(dMove > 0.02)) problems.push(`the view does not move on its own between t=30 and t=90 (MAE ${dMove})`);
  if (!(dSame < 0.004)) problems.push(`the same moment draws differently twice (MAE ${dSame}); everything must be a function of time`);
  console.log(`noon ${mn.toFixed(3)} night ${mni.toFixed(3)} spaceTop ${msTop.toFixed(3)} stars ${Math.round(stars)} move ${dMove.toFixed(4)} same ${dSame.toFixed(4)}`);
});
fs.rmSync(tmp, { recursive: true, force: true });
for (const p of problems) console.log(p);
console.log(problems.length ? `FAIL (${problems.length})` : 'PASS');
process.exit(problems.length ? 1 : 0);
