#!/usr/bin/env node
// node tools/polish-check.mjs [round]
// The finish line for a polish round: its families still pass tools/check.mjs with every asset they had, and
// rounds/<round> holds REASONING.md (Pass 1 to 3, Still weak) and, for each target, a before and an after shot of the
// same view that really differ. Rounds: polish (the default), air, ground, space-aliens, fx. Last line: PASS or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT } from './chrome.mjs';

const ROUNDS = {
  polish: { families: null, min: 0, targets: ['mountains', 'clouds', 'city-night', 'boats', 'station'] },
  air: { families: 'air', min: 7, targets: ['jets', 'airliner', 'rotors', 'rocket', 'missiles'] },
  ground: { families: 'defence,islands', min: 11, targets: ['launchers', 'guns', 'dome', 'islands-siso', 'islands-enemy'] },
  'space-aliens': { families: 'space,aliens', min: 11, targets: ['palace', 'moon', 'ships', 'aliens', 'portal'] },
  fx: { families: 'fx', min: 14, targets: ['explosions', 'fire-smoke', 'trails', 'water', 'hits'] },
};
const round = process.argv[2] || 'polish', spec = ROUNDS[round];
if (!spec) { console.log('usage: polish-check.mjs [' + Object.keys(ROUNDS).join('|') + ']'); console.log('FAIL'); process.exit(2); }
const TARGETS = spec.targets;
const problems = [];
let out = '';
const cargs = spec.families ? ['--family', spec.families, '--min', String(spec.min)] : [];
try { out = execFileSync('node', [path.join(ROOT, 'tools/check.mjs'), ...cargs], { encoding: 'utf8', timeout: 300000 }); }
catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
const lines = out.trim().split('\n');
if (lines.at(-1) !== 'PASS') problems.push(...lines.filter((l) => l && !l.startsWith('FAIL')).map((l) => 'check: ' + l));
else console.log(lines[0]);

const dir = path.join(ROOT, 'rounds', round);
const reasoning = path.join(dir, 'REASONING.md');
if (!fs.existsSync(reasoning)) problems.push(`no rounds/${round}/REASONING.md`);
else {
  const r = fs.readFileSync(reasoning, 'utf8');
  for (const n of [1, 2, 3]) if (!new RegExp(`^#+ .*pass ${n}`, 'im').test(r)) problems.push(`REASONING.md has no "Pass ${n}" heading`);
  if (!/still weak/i.test(r)) problems.push('REASONING.md has no "Still weak" section');
}
const size = (f) => execFileSync('magick', ['identify', '-format', '%wx%h', f], { encoding: 'utf8' }).trim();
for (const t of TARGETS) {
  const a = path.join(dir, `before-${t}.webp`), b = path.join(dir, `after-${t}.webp`);
  if (!fs.existsSync(a) || !fs.existsSync(b)) { problems.push(`${t}: needs rounds/${round}/before-${t}.webp and after-${t}.webp`); continue; }
  if (size(a) !== size(b)) { problems.push(`${t}: before (${size(a)}) and after (${size(b)}) must be the same view at the same size`); continue; }
  const r = spawnSync('magick', ['compare', '-metric', 'MAE', a, b, 'null:'], { encoding: 'utf8' });
  const m = `${r.stderr || ''} ${r.stdout || ''}`.match(/\(([-+.\deE]+)\)/);
  const d = m ? Number(m[1]) : NaN;
  if (!(d > 0.004)) problems.push(`${t}: before and after look the same (MAE ${d})`);
  else console.log(`${t}: changed (MAE ${d.toFixed(4)})`);
}
for (const p of problems) console.log(p);
console.log(problems.length ? `FAIL (${problems.length})` : 'PASS');
process.exit(problems.length ? 1 : 0);
