#!/usr/bin/env node
// node tools/clean-check.mjs: this folder is published as it is, so no file may name a path on someone's own machine.
// Fails on an absolute home path (/home/<user>/ or /Users/<user>/) in any text file. Last line: PASS or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', 'site', 'stills']);
const TEXT = /\.(md|json|jsonc|js|mjs|html|css|py|sh|txt|svg|yml|toml)$/;
const BAD = /\/(home|Users)\/[A-Za-z0-9_.-]+\//;
const hits = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith('.chrome-')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (TEXT.test(e.name)) fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (BAD.test(l)) hits.push(`${path.relative(ROOT, p)}:${i + 1}`); });
  }
})(ROOT);
for (const h of hits.slice(0, 40)) console.log(h);
console.log(hits.length ? `FAIL (${hits.length} machine paths)` : 'PASS');
process.exit(hits.length ? 1 : 0);
