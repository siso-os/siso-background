#!/usr/bin/env node
// node tools/soul-check.mjs <city|machines|space>
// The finish line for an asset soul: its families pass tools/check.mjs with at least its count of assets, and its
// rounds folder holds REASONING.md (with a section per pass) and the pass shots. Last line: PASS or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './chrome.mjs';

const SOULS = {
  city: { families: 'nature,islands,city', min: 23 },
  machines: { families: 'sea,air,defence', min: 20 },
  space: { families: 'fx,space,aliens', min: 22 },
};
const soul = process.argv[2], spec = SOULS[soul];
if (!spec) { console.log('usage: soul-check.mjs <' + Object.keys(SOULS).join('|') + '>'); console.log('FAIL'); process.exit(2); }
const problems = [];
let out = '';
try { out = execFileSync('node', [path.join(ROOT, 'tools/check.mjs'), '--family', spec.families, '--min', String(spec.min)], { encoding: 'utf8', timeout: 300000 }); }
catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
const lines = out.trim().split('\n');
if (lines.at(-1) !== 'PASS') problems.push(...lines.filter((l) => l && !l.startsWith('FAIL')).map((l) => 'check: ' + l));
else console.log(lines[0]);
const dir = path.join(ROOT, 'rounds', soul);
const reasoning = path.join(dir, 'REASONING.md');
if (!fs.existsSync(reasoning)) problems.push(`no rounds/${soul}/REASONING.md`);
else {
  const r = fs.readFileSync(reasoning, 'utf8');
  for (const n of [1, 2, 3]) if (!new RegExp(`^#+ .*pass ${n}`, 'im').test(r)) problems.push(`REASONING.md has no "Pass ${n}" heading`);
  if (!/still weak/i.test(r)) problems.push('REASONING.md has no "Still weak" section');
}
const shots = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^pass[123]-.*\.(png|webp|jpg)$/.test(f)) : [];
for (const n of [1, 2, 3]) if (!shots.some((f) => f.startsWith(`pass${n}-`))) problems.push(`no rounds/${soul}/pass${n}-*.webp shots`);
for (const p of problems) console.log(p);
console.log(problems.length ? `FAIL (${problems.length})` : 'PASS');
process.exit(problems.length ? 1 : 0);
