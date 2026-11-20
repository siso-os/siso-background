#!/usr/bin/env node
// node tools/index.mjs [--check]
// Writes ASSETS.md, the text list of every asset and image for agents, and src/gallery/catalog.json, the image list
// the asset page (assets.html) reads. Assets come from the files under src/assets/<family>/ (imported in Node with a
// no-op DOM, or read as text when an import fails); images from art/ and refs/ with their manifests and prompts.
// --check writes nothing and exits 1 when either file is stale. Run it after adding an asset or an image.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const at = (...p) => path.join(ROOT, ...p);
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const read = (f) => (fs.existsSync(at(f)) ? fs.readFileSync(at(f), 'utf8') : null);
const json = (f) => { const t = read(f); try { return t ? JSON.parse(t) : null; } catch { return null; } };
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);

// ---------- a do-nothing DOM, so asset modules that build a Path2D or a canvas at load can be imported in Node ----------
function stub() {
  const fn = function () {};
  return new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === 'then') return undefined;
      if (k === Symbol.iterator) return function* () {};
      return stub();
    },
    apply: () => stub(), construct: () => stub(), set: () => true,
  });
}
for (const k of ['document', 'window', 'Path2D', 'OffscreenCanvas', 'Image', 'ImageData', 'HTMLCanvasElement', 'DOMMatrix',
  'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'devicePixelRatio', 'localStorage', 'location'])
  if (!(k in globalThis)) globalThis[k] = stub();

// ---------- families and the ids the contract asks for ----------
const contract = read('CONTRACT.md') || '';
const FAMILY_NOTES = {};
for (const m of contract.matchAll(/^\| `([a-z]+)` \| (.+?) \| (.+?) \|$/gm)) FAMILY_NOTES[m[1]] = { what: m[2].trim(), owner: m[3].trim() };

let FAMILIES = [], REQUIRED = {}, registered = new Set();
try { const r = await import(pathToFileURL(at('src/assets/registry.js'))); FAMILIES = r.FAMILIES; registered = new Set(r.ASSETS.map((a) => a.id)); }
catch (e) {
  const t = read('src/assets/registry.js') || '';
  FAMILIES = [...t.matchAll(/\{ id: '([a-z]+)', title: '([^']+)' \}/g)].map((m) => ({ id: m[1], title: m[2] }));
  console.error(`registry.js did not import in Node (${e.message}); read FAMILIES as text`);
}
try { REQUIRED = (await import(pathToFileURL(at('src/assets/required.js')))).REQUIRED; } catch { REQUIRED = {}; }

// ---------- assets: one file each under src/assets/<family>/ ----------
const ASSET_RE = /^src\/assets\/[^/]+\/[^_/][^/]*\.js$/;
const assetFiles = walk(at('src/assets')).map(rel).filter((f) => ASSET_RE.test(f) && !f.endsWith('/index.js'));

function fromText(src) { // the fields an asset declares, read from its source when it cannot be imported
  const str = (k) => { const m = src.match(new RegExp(`\\b${k}:\\s*(['"\`])((?:\\\\.|(?!\\1).)*)\\1`)); return m ? m[2] : undefined; };
  const num = (k) => { const m = src.match(new RegExp(`\\b${k}:\\s*([0-9.]+)`)); return m ? Number(m[1]) : undefined; };
  const st = src.match(/\bstates:\s*\[([^\]]*)\]/);
  const once = src.match(/\bonce:\s*\{([^}]*)\}/);
  return {
    id: str('id'), family: str('family'), title: str('title'), about: str('about'), w: num('w'), h: num('h'),
    states: st ? [...st[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [],
    once: once ? Object.fromEntries([...once[1].matchAll(/['"]?([\w-]+)['"]?\s*:\s*([0-9.]+)/g)].map((m) => [m[1], Number(m[2])])) : undefined,
    variants: num('variants'), loop: num('loop'),
    ref: /\bref:\s*null/.test(src) ? null : str('ref'),
  };
}

const assets = [];
for (const file of assetFiles) {
  const [, family, name] = file.match(/^src\/assets\/([^/]+)\/(.+)\.js$/);
  const id = `${family}.${name}`;
  let a = null, note = '';
  try { a = (await import(pathToFileURL(at(file)))).default; if (!a || typeof a !== 'object') throw new Error('no default export'); }
  catch (e) { a = fromText(read(file) || ''); note = `read as text: ${e.message}`; }
  assets.push({
    id, family, file, title: a.title || name, about: a.about || '', w: a.w, h: a.h,
    states: Array.isArray(a.states) ? a.states : [], once: a.once || {}, variants: a.variants || 1, loop: a.loop || 0,
    ref: a.ref || null, idOk: a.id === id, registered: registered.has(id), note,
  });
}

// ---------- the sky family: entries in src/engine/backdrop.js, when the engine has landed ----------
const backdrop = fs.existsSync(at('src/engine/backdrop.js'));
let sky = [], skyNote = '';
if (backdrop) {
  try { sky = ((await import(pathToFileURL(at('src/engine/backdrop.js')))).SKY_ENTRIES || []).map((e) => ({ id: e.id, title: e.title || e.id, about: e.about || '' })); }
  catch (e) { skyNote = `SKY_ENTRIES could not be read in Node (${e.message}); see the file.`; }
}

// ---------- images: every picture under art/ and refs/ (sources excluded, as the page check does) ----------
const IMG_RE = /\.(webp|png|jpg)$/;
const imageFiles = [...walk(at('art')), ...walk(at('refs'))].map(rel).filter((f) => IMG_RE.test(f) && !f.includes('/source/'));

function imageSize(file) {
  const b = fs.readFileSync(at(file));
  let w = null, h = null;
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const c = b.toString('ascii', 12, 16);
    if (c === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3); }
    else if (c === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
    else if (c === 'VP8L') { const v = b.readUInt32LE(21); w = (v & 0x3fff) + 1; h = ((v >> 14) & 0x3fff) + 1; }
  } else if (b.readUInt32BE(0) === 0x89504e47) { w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
  return { w, h, bytes: b.length };
}

const prompts = {}; // art/isles/PROMPTS.md: "## <name>" then the prompt
{
  const t = read('art/isles/PROMPTS.md') || '';
  for (const m of t.matchAll(/^## (\S+)\n+([\s\S]*?)(?=\n## |\s*$)/gm)) prompts[m[1]] = m[2].trim();
}
const refPrompts = Object.fromEntries((json('refs/manifest.json') || []).map((r) => [r.file, r]));
const isles = json('art/isles/manifest.json') || {};
const marina = json('art/isles/marina/manifest.json') || {};
const islesLight = Object.fromEntries([...Object.values(isles.plates || {}), ...Object.values(isles.cutouts || {})].map((e) => [e.file, e.light]));
const marinaLight = Object.fromEntries([...Object.values(marina.plates || {}), ...Object.values(marina.cutouts || {})].map((e) => [e.file, e.light]));

const SUBJECT = {
  tower: 'SISO tower', 'isle-home': 'Home island', 'isle-enemy': 'Enemy island', 'isle-small': 'Small island',
  'bld-glass': 'Glass tower', 'bld-deco': 'Art deco tower', 'bld-brick': 'Brick block', 'bld-stone': 'Stone block',
  'bld-modern': 'Modern block', 'bld-neon': 'Neon block', 'boat-police': 'Police boat', 'boat-smuggler': 'Smuggler boat',
  'boat-ferry': 'Ferry', 'boat-yacht': 'Yacht',
};
const CITY = { arctic: 'Arctic city', desert: 'Desert city', harbor: 'Harbour city', neon: 'Neon city', marina: 'Marina' };
const REF = {
  'sky-dawn': ['Sky at dawn', 'dawn', 'Sky'], 'sky-day': ['Sky by day', 'day', 'Sky'], 'sky-dusk': ['Sky at dusk', 'dusk', 'Sky'],
  'sky-night': ['Sky at night', 'night', 'Sky'], 'sea-day': ['Sea by day', 'day', 'Sea'], 'sea-night': ['Sea at night', 'night', 'Sea'],
  'siso-island': ['SISO home island', 'dusk', 'The SISO island and tower'], 'enemy-island': ['Enemy island', 'dusk', 'The enemy fortress island'],
  'moon-city': ['Moon city', 'space', 'The moon'], mountains: ['Mountain ranges', 'dusk', 'Behind the city'],
  'space-palace': ['Space palace', 'space', 'Orbit'], 'option-a-golden': ['Option A, golden hour', 'golden hour', 'The whole scene'],
  'option-b-neon': ['Option B, neon night', 'night', 'The whole scene'], 'option-c-painted': ['Option C, painted dusk', 'dusk', 'The whole scene'],
  'option-d-storm': ['Option D, storm and war', 'overcast', 'The whole scene'], 'vertical-slice': ['Sea to space', 'day to space', 'Sea, sky and orbit'],
};
const SUBS = [ // [prefix, group, sub, sub title, kind]
  ['art/isles/cutouts/', 'art', 'cutouts', 'Cut-outs', 'cutout'],
  ['art/isles/plates/', 'art', 'plates', 'City plates', 'plate'],
  ['art/isles/marina/', 'art', 'marina', 'Marina (MIT)', 'cutout'],
  ['art/isles/fx/', 'art', 'fx', 'Dust (MIT)', 'sprite'],
  ['refs/elements/', 'refs', 'elements', 'Elements', 'element'],
  ['refs/options/', 'refs', 'options', 'Whole scene', 'option'],
  ['refs/slice/', 'refs', 'slice', 'Sea to space', 'slice'],
];
const LIGHTS = ['dawn', 'day', 'golden hour', 'dusk', 'night', 'overcast', 'space', 'day to space'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const human = (stem) => cap(stem.replace(/[-_]+/g, ' '));
const lc = (s) => (/^SISO\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

function describe(file) {
  const stem = path.basename(file).replace(IMG_RE, '');
  const sub = SUBS.find(([p]) => file.startsWith(p));
  const [group, subId, subTitle, kind0] = sub ? sub.slice(1) : [file.startsWith('refs/') ? 'refs' : 'art', path.dirname(file).split('/').pop(), human(path.dirname(file).split('/').pop()), 'element'];
  let kind = kind0, title = human(stem), light = (stem.match(/(dawn|day|dusk|night)$/) || [])[1] || null, place = null, what = '', prompt = null, promptFrom = null, license = null;
  if (subId === 'cutouts' && group === 'art') {
    const subject = stem.replace(/-(dawn|day|dusk|night)$/, '');
    title = `${SUBJECT[subject] || human(subject)}, ${light || 'any light'}`;
    light = light || islesLight[`cutouts/${path.basename(file)}`] || null; place = 'SISO Isles';
    what = `Photo cut-out of the ${lc(SUBJECT[subject] || human(subject))} in ${light} light.`;
  } else if (subId === 'plates') {
    const city = stem.replace(/-(dawn|day|dusk|night)$/, '');
    place = CITY[city] || human(city); title = `${place}, ${light}`;
    what = `City plate: the ${place.toLowerCase()} at ${light}, a whole backdrop in one photo.`;
  } else if (subId === 'marina') {
    license = 'MIT, from github.com/alj04ofm-svg/ALJ-HERDR-WEB-UI (art/isles/marina/LICENSE)';
    const key = rel(at(file)).replace('art/isles/marina/', '');
    light = marinaLight[key] || light; place = 'Marina';
    if (key.startsWith('plates/')) { kind = 'plate'; title = `Marina, ${light || 'night'}`; what = 'City plate: the marina at night (MIT art).'; }
    else { const b = stem.replace(/^city-/, ''); title = `Marina ${b} block`; what = `Building cut-out for the marina city, ${b} (MIT art).`; }
  } else if (subId === 'fx') {
    license = 'MIT, from github.com/alj04ofm-svg/ALJ-HERDR-WEB-UI (art/isles/fx/LICENSE)';
    title = /-\d+$/.test(stem) ? `City dust, ${stem.match(/(\d+)$/)[1]} px` : 'City dust';
    what = 'Dust cloud sprite for a falling building (MIT art).';
  } else if (group === 'refs') {
    const r = REF[stem];
    if (r) { [title, light, place] = r; }
    what = kind === 'option' ? `A whole-scene look option: ${title.replace(/^Option [A-Z], /, '')}. One of four moments of the same world.`
      : kind === 'slice' ? 'The climb from the sea to space in one tall painting: city, island, clouds, Earth, the moon and the palace.'
      : `Reference painting of the ${lc(title)}; assets are matched to it.`;
  }
  if (group === 'art' && prompts[stem] && subId !== 'marina') { prompt = prompts[stem]; promptFrom = 'art/isles/PROMPTS.md'; }
  const rp = refPrompts[file.replace(/^refs\//, '')];
  if (group === 'refs' && rp) { prompt = rp.prompt; promptFrom = 'refs/manifest.json'; }
  const fit = ['plate', 'option'].includes(kind) || /^(sky|sea)-/.test(stem) ? 'cover' : 'contain';
  return { path: file, group, sub: subId, subTitle, kind, fit, title, light, place, what, ...imageSize(file), prompt, promptFrom, license };
}

const subRank = (i) => { const k = SUBS.findIndex(([p]) => i.path.startsWith(p)); return k < 0 ? 99 : k; };
const lightRank = (l) => { const k = LIGHTS.indexOf(l); return k < 0 ? 50 : k; };
const images = imageFiles.map(describe).sort((a, b) => (a.group === b.group ? 0 : a.group === 'art' ? -1 : 1) || subRank(a) - subRank(b)
  || a.path.replace(/-(dawn|day|dusk|night)\.\w+$/, '').localeCompare(b.path.replace(/-(dawn|day|dusk|night)\.\w+$/, ''))
  || lightRank(a.light) - lightRank(b.light) || a.path.localeCompare(b.path));

// ---------- write ----------
const catalog = {
  about: 'Generated by node tools/index.mjs from art/, refs/, CONTRACT.md and src/engine/. Do not edit by hand.',
  backdrop, families: FAMILY_NOTES, images,
};

const md = [];
const code = (s) => '`' + s + '`';
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const kb = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB');
const stateList = (a) => a.states.map((s) => (a.once[s] ? `${s} (once, ${a.once[s]} s)` : s)).join(', ');
md.push('# SISO Background: everything we have built',
  '',
  'Every asset drawn in code and every image, with the file it lives in. Generated by `node tools/index.mjs` from',
  '`src/assets/`, `src/engine/backdrop.js`, `art/` and `refs/`; do not edit by hand (`--check` fails when it is stale).',
  'See them live, playing, in `assets.html`; `assets.html#<id>` or `assets.html#<image path>` opens one. How an asset is',
  'made: `CONTRACT.md`.',
  '',
  `${assets.length + sky.length} assets in code, ${images.length} images.`,
  '');
for (const f of FAMILIES) {
  const note = FAMILY_NOTES[f.id];
  if (f.id === 'sky') {
    md.push(`## ${f.title} (${code('sky')})`, '');
    if (note) md.push(`${cap(note.what)}. Owner: ${note.owner}.`, '');
    if (!backdrop) md.push('Drawn by the engine from `src/engine/backdrop.js` (`SKY_ENTRIES`, `renderBackdrop`), which has not landed yet.', '');
    else if (skyNote) md.push(skyNote, '');
    else if (!sky.length) md.push('`src/engine/backdrop.js` exports no `SKY_ENTRIES` yet.', '');
    else {
      md.push('| id | title | file | about |', '|---|---|---|---|');
      for (const e of sky) md.push(`| ${code(e.id)} | ${esc(e.title)} | ${code('src/engine/backdrop.js')} | ${esc(e.about)} |`);
      md.push('');
    }
    continue;
  }
  const list = assets.filter((a) => a.family === f.id);
  md.push(`## ${f.title} (${code(f.id)})`, '');
  if (note) md.push(`${cap(note.what)}. Owner: ${note.owner}.`, '');
  if (!list.length) {
    const want = Object.entries(REQUIRED).filter(([id]) => id.startsWith(f.id + '.'));
    md.push(want.length ? `None yet. CONTRACT.md §6 asks for ${want.length}, each at ${code(`src/assets/${f.id}/<name>.js`)}: ${want.map(([id, s]) => code(id) + (s.length ? ` (${s.join(', ')})` : '')).join(', ')}.` : 'None yet.', '');
    continue;
  }
  md.push('| id | title | file | states | reference |', '|---|---|---|---|---|');
  for (const a of list) {
    const flags = [!a.registered && 'not in its index.js', !a.idOk && 'its id differs from its file name', a.note].filter(Boolean);
    md.push(`| ${code(a.id)} | ${esc(a.title)}${flags.length ? ` (${esc(flags.join('; '))})` : ''} | ${code(a.file)} | ${esc(stateList(a))} | ${a.ref ? code(a.ref) : 'none'} |`);
  }
  md.push('');
}
const stray = assets.filter((a) => !FAMILIES.some((f) => f.id === a.family));
if (stray.length) {
  md.push('## Not in a known family', '', '| id | title | file | states | reference |', '|---|---|---|---|---|');
  for (const a of stray) md.push(`| ${code(a.id)} | ${esc(a.title)} | ${code(a.file)} | ${esc(stateList(a))} | ${a.ref ? code(a.ref) : 'none'} |`);
  md.push('');
}

md.push('## Images', '',
  'Kept as references and shown on the asset page; assets never load them. Prompts: `art/isles/PROMPTS.md` and `refs/manifest.json`.', '');
let lastSub = '';
for (const i of images) {
  const key = `${i.group}/${i.sub}`;
  if (key !== lastSub) {
    if (lastSub) md.push('');
    const dir = path.dirname(i.path) + '/';
    md.push(`### ${i.group === 'art' ? 'Photo art' : 'References'}: ${i.subTitle} (${code(i.sub === 'marina' ? 'art/isles/marina/' : dir)})`, '',
      '| file | what it is | light | size |', '|---|---|---|---|');
    lastSub = key;
  }
  md.push(`| ${code(i.path)} | ${esc(i.title)}. ${esc(i.what)} | ${esc(i.light || '')} | ${i.w}x${i.h}, ${kb(i.bytes)} |`);
}
md.push('',
  '## Where things live', '',
  '- `src/assets/<family>/<name>.js`: one file per asset (id `<family>.<name>`); `src/assets/<family>/index.js` lists them and `src/assets/registry.js` joins the families.',
  '- `src/core/`: `light.js`, `paint.js` and `rng.js`, the one light and the painting helpers every asset shares.',
  '- `src/engine/`: the scene (`index.html`) and the sky, sea and clouds (`backdrop.js`, the `sky` family).',
  '- `art/isles/`: the earlier photo art (cut-outs, city plates), with `PROMPTS.md` and `manifest.json`.',
  '- `refs/`: the reference paintings assets are matched to, with `manifest.json` (prompts).',
  '- `assets.html` and `src/gallery/`: this list, live; `tools/index.mjs` writes this file and `src/gallery/catalog.json`.',
  '');

const outMd = md.join('\n');
const outCat = JSON.stringify(catalog, null, 2) + '\n';
const targets = [['ASSETS.md', outMd], ['src/gallery/catalog.json', outCat]];
if (process.argv.includes('--check')) {
  const stale = targets.filter(([f, t]) => read(f) !== t).map(([f]) => f);
  if (stale.length) { console.log(`stale: ${stale.join(', ')}. Run node tools/index.mjs`); console.log('FAIL'); process.exit(1); }
  console.log(`${assets.length + sky.length} assets, ${images.length} images: up to date`); console.log('PASS');
} else {
  for (const [f, t] of targets) { fs.mkdirSync(path.dirname(at(f)), { recursive: true }); fs.writeFileSync(at(f), t); }
  console.log(`wrote ASSETS.md and src/gallery/catalog.json: ${assets.length + sky.length} assets, ${images.length} images`);
}
