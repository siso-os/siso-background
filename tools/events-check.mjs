#!/usr/bin/env node
// node tools/events-check.mjs [--no-shots]
// The finish line for the war events. tools/eventscheck.html plays each one through the real director and says whether
// it does what it is for (50 missiles at once, buildings that fall and are rebuilt, a portal that opens and closes...).
// Then the real scene is shot at each event's busiest moment with and without the event: it must change the picture.
// Also wants rounds/events/REASONING.md (Pass 1 to 3, Still weak) and the pass shots. Last line: PASS or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { withServer, chrome, ROOT } from './chrome.mjs';

const shots = !process.argv.includes('--no-shots');
const problems = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'events-check-'));
const W = 1600, H = 900, BAR = 87, MIN_PX = 800;
// magick compare prints the count of differing pixels on stderr ("1234" or "1234 (0.0188)"); exit 1 when they differ.
const changed = (a, b) => {
  const r = spawnSync('magick', ['compare', '-metric', 'AE', '-fuzz', '6%', a, b, 'null:'], { encoding: 'utf8' });
  const m = `${r.stderr || ''} ${r.stdout || ''}`.trim().match(/^[-+.\deE]+/);
  return m ? Number(m[0]) : NaN;
};

await withServer(async (base) => {
  let dom = '';
  try { dom = chrome(['--window-size=400,400', '--dump-dom', `${base}/tools/eventscheck.html`], { budget: 60000, timeout: 240000 }); }
  catch (e) { problems.push('eventscheck.html did not run: ' + String(e.message).slice(0, 160)); }
  const m = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
  let report = null;
  try { report = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); }
  catch { problems.push('eventscheck.html did not finish: ' + (m ? m[1].slice(0, 200) : 'no result block (an import failed?)')); }
  if (!report) return;
  problems.push(...report.problems);
  for (const ev of report.events) {
    for (const p of ev.problems) problems.push(`${ev.id}: ${p}`);
    let px = null;
    if (shots && ev.peakT !== undefined) {
      const shot = (only, name) => {
        const f = path.join(tmp, `${ev.id}-${name}.png`);
        chrome([`--window-size=${W},${H + BAR}`, `--screenshot=${f}`, `${base}/index.html?freeze=1&h=20&t=${ev.peakT}&events=${only}${ev.space ? '&y=-6900' : ''}`], { budget: 8000 });
        execFileSync('magick', [f, '-crop', `${W}x${H}+0+0`, '+repage', f]);
        return f;
      };
      try {
        px = changed(shot(ev.id, 'with'), shot('none', 'without'));
        if (!(px >= MIN_PX)) problems.push(`${ev.id}: the scene at its busiest moment (t=${ev.peakT}) looks the same with and without it (${px} pixels differ; want ${MIN_PX} or more)`);
      } catch (e) { problems.push(`${ev.id}: could not shoot the scene: ${String(e.message).slice(0, 120)}`); }
    }
    console.log(`${ev.ok ? 'ok ' : 'BAD'} ${ev.id.padEnd(14)} t0 ${ev.t0 === undefined ? '-' : ev.t0.toFixed(1)} most ${ev.most ?? '-'} items${px === null ? '' : `, ${px} px changed`}`);
  }
});
fs.rmSync(tmp, { recursive: true, force: true });

const dir = path.join(ROOT, 'rounds', 'events');
const reasoning = path.join(dir, 'REASONING.md');
if (!fs.existsSync(reasoning)) problems.push('no rounds/events/REASONING.md');
else {
  const r = fs.readFileSync(reasoning, 'utf8');
  for (const n of [1, 2, 3]) if (!new RegExp(`^#+ .*pass ${n}`, 'im').test(r)) problems.push(`REASONING.md has no "Pass ${n}" heading`);
  if (!/still weak/i.test(r)) problems.push('REASONING.md has no "Still weak" section');
}
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^pass[123]-.*\.(png|webp|jpg)$/.test(f)) : [];
for (const n of [1, 2, 3]) if (!files.some((f) => f.startsWith(`pass${n}-`))) problems.push(`no rounds/events/pass${n}-*.webp shots`);

for (const p of problems) console.log(p);
console.log(problems.length ? `FAIL (${problems.length})` : 'PASS');
process.exit(problems.length ? 1 : 0);
