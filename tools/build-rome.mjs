#!/usr/bin/env node
// Builds the ROME data files used by Open Job Analysis from France Travail's open data.
//
//   node tools/build-rome.mjs                       download the latest open data and build
//   node tools/build-rome.mjs --zip RefRomeJson.zip [--arbo arboprincipale.xlsx]
//
// Sources (Licence Ouverte / Etalab, France Travail):
//   - all ROME data, JSON:  https://api.francetravail.fr/api-nomenclatureemploi/v1/open-data/json
//   - main tree, xlsx (used only to place the 475 "rarely used" job titles under their profile):
//     the "Arborescence principale" file listed on https://www.data.gouv.fr/datasets/58da857388ee384902e505f5/
//
// Output, next to index.html:
//   data/rome/current.js            which version the app loads
//   data/rome/v<N>/version.js       version, dates, licence, attribution
//   data/rome/v<N>/index.js         job titles for the search (one line per title)
//   data/rome/v<N>/<CODE>.js        one file per ROME profile
// Each file is a plain script (OJA_ROME.add(...)), so the app can load it with a <script> tag:
// that works on a web server and when index.html is opened straight from the disk.
//
// No npm dependencies: the zip and xlsx readers below use Node's zlib only.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const JSON_URL = 'https://api.francetravail.fr/api-nomenclatureemploi/v1/open-data/json';
export const DATASET_URL = 'https://www.data.gouv.fr/api/1/datasets/58da857388ee384902e505f5/';

// ---------- zip reader ----------
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a zip file (no end of central directory).');
  const count = buf.readUInt16LE(eocd + 10), cdOff = buf.readUInt32LE(eocd + 16);
  const files = {};
  let p = cdOff;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Corrupt zip central directory.');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf8');
    const lnlen = buf.readUInt16LE(loc + 26), lelen = buf.readUInt16LE(loc + 28);
    const data = buf.slice(loc + 30 + lnlen + lelen, loc + 30 + lnlen + lelen + csize);
    if (method === 0) files[name] = Buffer.from(data);
    else if (method === 8) files[name] = zlib.inflateRawSync(data);
    else throw new Error('Unsupported zip compression method ' + method + ' for ' + name);
    p += 46 + nlen + elen + clen;
  }
  return files;
}

// ---------- text decoding ----------
// The ROME JSON files are Windows-1252 (cp1252), not UTF-8; version.txt is UTF-8. Try strict UTF-8 first.
const CP1252 = { 0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d,
  0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178 };
export function decodeCp1252(buf) {
  let s = '';
  for (let i = 0; i < buf.length; i++) { const b = buf[i]; s += String.fromCharCode(b >= 0x80 && b <= 0x9f && CP1252[b] ? CP1252[b] : b); }
  return s;
}
export function decodeText(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) buf = buf.slice(3);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { return decodeCp1252(buf); }
}

// ---------- xlsx (only what the main tree needs: first sheet with data, cell text) ----------
export function readXlsxRows(buf) {
  const z = readZip(buf);
  const ss = z['xl/sharedStrings.xml'] ? z['xl/sharedStrings.xml'].toString('utf8') : '';
  const strings = [];
  (ss.match(/<si>[\s\S]*?<\/si>/g) || []).forEach(si => { strings.push(unxml((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(t => t.replace(/<t[^>]*>|<\/t>/g, '')).join(''))); });
  const sheets = Object.keys(z).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  let best = [];
  sheets.forEach(n => {
    const xml = z[n].toString('utf8'), rows = [];
    (xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []).forEach(r => {
      const row = [];
      (r.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).forEach(c => {
        const ref = (c.match(/ r="([A-Z]+)\d+"/) || [])[1]; const col = ref ? ref.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1 : row.length;
        const type = (c.match(/ t="(\w+)"/) || [])[1]; const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1]; const is = (c.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];
        row[col] = type === 's' ? strings[+v] : type === 'inlineStr' ? unxml(is || '') : v === undefined ? '' : unxml(v);
      });
      rows.push(row);
    });
    if (rows.length > best.length) best = rows;
  });
  return best;
}
function unxml(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&'); }

// ---------- build ----------
const CERT = 'Certifications et habilitations';
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pick(files, re, what) {
  const k = Object.keys(files).find(n => re.test(path.basename(n)));
  if (!k) throw new Error('Missing ' + what + ' in the ROME zip (looked for ' + re + ').');
  return files[k];
}
function parseVersion(txt) {
  const num = (txt.match(/Num[ée]ro de version\s*:\s*(\d+)/i) || [])[1];
  const pub = (txt.match(/Date de publication\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i) || []);
  const fiches = (txt.match(/passe ainsi à\s*(\d+)\s*métiers/i) || [])[1];
  if (!num) throw new Error('Could not read the version number from version.txt.');
  return { version: num, published: pub[3] ? pub[3] + '-' + pub[2] + '-' + pub[1] : '', announcedFiches: fiches ? +fiches : null };
}
function items(groups, withCore) {
  const out = [];
  (groups || []).forEach(g => (g.items || []).forEach(it => out.push(withCore ? [g.libelle, it.libelle, it.code_ogr, it.coeur_metier === 'Principale' ? 1 : 0] : [g.libelle, it.libelle, it.code_ogr])));
  return out;
}
const LS = new RegExp('\\u2028', 'g'), PS = new RegExp('\\u2029', 'g');
const js = v => JSON.stringify(v).replace(LS, '\\u2028').replace(PS, '\\u2029');

// Builds everything in memory. Returns { version, files: { relativePath: text }, stats }.
export function buildRome({ zip, arboXlsx = null, expect = {} }) {
  const files = readZip(zip);
  const ver = parseVersion(decodeText(pick(files, /^version\.txt$/i, 'version.txt')));
  const J = (re, what) => JSON.parse(decodeText(pick(files, re, what)));
  const fiches = J(/^unix_fiche_emploi_metier_v\d+\.json$/i, 'the profiles file (unix_fiche_emploi_metier)');
  const apps = J(/^unix_referentiel_appellation_v\d+\.json$/i, 'the job titles file (unix_referentiel_appellation)');
  const tree = J(/^unix_arborescence_principale_v\d+\.json$/i, 'the main tree (unix_arborescence_principale)');

  // Professional domain (e.g. M15 "Ressources humaines") for each profile code.
  const domain = {};
  (tree.arbo_principale || []).forEach(g => (g.liste_domaine_prof || []).forEach(d => (d.liste_metier || []).forEach(m => { domain[m.code_rome] = d.libelle; })));

  const out = {}, codes = [], titleOf = {};
  fiches.forEach(f => {
    const code = f.rome.code_rome, c = f.competences || {};
    codes.push(code); titleOf[code] = f.rome.intitule;
    const sv = items((c.savoirs || {}).categories, true);
    const fiche = {
      code, t: f.rome.intitule, dom: domain[code] || '',
      a: (f.appellations || []).map(a => a.libelle),
      d: f.definition || '', acc: f.acces_metier || '',
      sf: items((c.savoir_faire || {}).enjeux, true),
      se: items((c.savoir_etre_professionnel || {}).enjeux, false).map(x => [x[1], x[2]]),
      sv: sv.filter(x => x[0] !== CERT), cert: sv.filter(x => x[0] === CERT).map(x => [x[1], x[2]]),
      ctx: (f.contextes_travail || []).flatMap(g => (g.items || []).map(it => [g.libelle, it.libelle, it.code_ogr]))
    };
    out[code] = fiche;
  });
  codes.sort();
  const fi = {}; codes.forEach((c, i) => { fi[c] = i; });

  // Job titles: the profile's own title (principal), its usual titles, and the rarely used ones.
  const usualOgr = new Map();
  fiches.forEach(f => (f.appellations || []).forEach(a => usualOgr.set(a.code_ogr, f.rome.code_rome)));
  const searchRows = [];
  codes.forEach(c => searchRows.push([titleOf[c], fi[c], 1]));
  let principal = 0, usual = 0, rare = 0, unplaced = [];
  const rareRows = apps.filter(a => a.peu_usite === 'O');
  let rareMap = {};
  if (arboXlsx) {
    // Rows: [domain letter, domain no., profile no., label, OGR]. A row with an OGR under a profile is a job title.
    let cur = null;
    readXlsxRows(arboXlsx).forEach(r => {
      const a = (r[0] || '').trim(), b = (r[1] || '').trim(), c = (r[2] || '').trim(), ogr = +((r[4] || '').trim());
      if (/^[A-Z]$/.test(a) && /^\d{2}$/.test(b) && /^\d{2}$/.test(c)) { cur = a + b + c; if (ogr) rareMap[ogr] = cur; }
    });
  }
  apps.forEach(a => {
    if (a.classification === 'PRINCIPALE') { principal++; return; }
    if (a.peu_usite === 'O') {
      const code = rareMap[a.code_ogr];
      if (code && fi[code] !== undefined) { searchRows.push([a.libelle, fi[code], 2]); rare++; } else unplaced.push(a.code_ogr);
      return;
    }
    const code = usualOgr.get(a.code_ogr);
    if (code) { searchRows.push([a.libelle, fi[code], 0]); usual++; } else unplaced.push(a.code_ogr);
  });

  const stats = { version: ver.version, published: ver.published, fiches: codes.length, titles: apps.length, principal, usual, rare, rareTotal: rareRows.length, unplaced: unplaced.length, indexed: searchRows.length };
  // Checks: fail loudly rather than ship a partial reference.
  const problems = [];
  if (ver.announcedFiches && ver.announcedFiches !== codes.length) problems.push('version.txt announces ' + ver.announcedFiches + ' profiles, the file has ' + codes.length);
  if (expect.fiches && expect.fiches !== codes.length) problems.push('expected ' + expect.fiches + ' profiles, found ' + codes.length);
  if (expect.titles && expect.titles !== apps.length) problems.push('expected ' + expect.titles + ' job titles, found ' + apps.length);
  if (principal !== codes.length) problems.push(principal + ' principal titles for ' + codes.length + ' profiles');
  if (usual + principal + rareRows.length !== apps.length) problems.push('job titles do not add up: ' + principal + ' + ' + usual + ' + ' + rareRows.length + ' ≠ ' + apps.length);
  if (arboXlsx && unplaced.length) problems.push(unplaced.length + ' job titles could not be placed under a profile (first: ' + unplaced.slice(0, 5).join(', ') + ')');
  if (!arboXlsx && unplaced.length !== rareRows.length) problems.push((unplaced.length - rareRows.length) + ' usual job titles could not be placed under a profile');
  if (problems.length) { const e = new Error('ROME build checks failed:\n - ' + problems.join('\n - ')); e.stats = stats; throw e; }

  const [y, m] = ver.published ? ver.published.split('-').map(Number) : [0, 0];
  const meta = {
    version: ver.version, published: ver.published, fiches: codes.length, titles: searchRows.length,
    licence: 'Licence Ouverte / Open Licence (Etalab)', producer: 'France Travail',
    attribution: {
      fr: 'Source : France Travail, ROME 4.0 version ' + ver.version + (y ? ' (' + MONTHS_FR[m - 1] + ' ' + y + ')' : '') + ', Licence Ouverte.',
      en: 'Source: France Travail, ROME 4.0 version ' + ver.version + (y ? ' (' + MONTHS_EN[m - 1] + ' ' + y + ')' : '') + ', Licence Ouverte (Etalab open licence).'
    }
  };
  const dir = 'v' + ver.version;
  const res = {};
  const head = '// ROME 4.0 version ' + ver.version + ' – France Travail – Licence Ouverte (Etalab). Generated by tools/build-rome.mjs; do not edit.\n';
  res['current.js'] = head + 'OJA_ROME.current(' + js({ version: ver.version, dir }) + ');\n';
  res[dir + '/version.js'] = head + 'OJA_ROME.version(' + js(meta) + ');\n';
  res[dir + '/index.js'] = head + 'OJA_ROME.index(' + js({ version: ver.version, meta, fiches: codes.map(c => [c, titleOf[c]]), titles: searchRows }) + ');\n';
  codes.forEach(c => { res[dir + '/' + c + '.js'] = head + 'OJA_ROME.add(' + js(c) + ',' + js(out[c]) + ');\n'; });
  return { version: ver.version, files: res, stats, fiches: out };
}

export function writeOutput(result, outDir) {
  const dir = path.join(outDir, 'v' + result.version);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });
  Object.entries(result.files).forEach(([rel, text]) => fs.writeFileSync(path.join(outDir, rel), text, 'utf8'));
}

function download(url) {
  try { return execFileSync('curl', ['-sSfL', '--max-time', '300', url], { maxBuffer: 1 << 30 }); }
  catch (e) { throw new Error('Download failed (' + url + '). Download the file yourself and pass it with --zip / --arbo.'); }
}
function findArboUrl() {
  const d = JSON.parse(download(DATASET_URL).toString('utf8'));
  const r = (d.resources || []).find(x => /arborescence principale/i.test(x.title) && /xlsx/i.test(x.format || x.url));
  if (!r) throw new Error('Could not find the "Arborescence principale" xlsx on data.gouv.fr. Pass it with --arbo.');
  return r.url;
}

// ---------- command line ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = path.resolve(arg('--out') || path.join(root, 'data', 'rome'));
  const zipPath = arg('--zip'), arboPath = arg('--arbo');
  try {
    console.log(zipPath ? 'Reading ' + zipPath : 'Downloading ' + JSON_URL);
    const zip = zipPath ? fs.readFileSync(zipPath) : download(JSON_URL);
    let arbo = null;
    if (arboPath) arbo = fs.readFileSync(arboPath);
    else if (!process.argv.includes('--no-arbo')) { const u = findArboUrl(); console.log('Downloading ' + u); arbo = download(u); }
    const prev = fs.existsSync(path.join(outDir, 'current.js')) ? (fs.readFileSync(path.join(outDir, 'current.js'), 'utf8').match(/"version":"(\d+)"/) || [])[1] : null;
    const r = buildRome({ zip, arboXlsx: arbo });
    writeOutput(r, outDir);
    const s = r.stats;
    console.log('ROME version ' + s.version + ' (published ' + s.published + '): ' + s.fiches + ' profiles, ' + s.titles + ' job titles (' + s.principal + ' profile titles, ' + s.usual + ' usual, ' + s.rare + ' rarely used), ' + Object.keys(r.files).length + ' files written to ' + path.relative(process.cwd(), outDir));
    if (prev && prev !== s.version) console.log('Previous version was ' + prev + '. Its folder v' + prev + ' is kept so older projects still open with their own wording; delete it when no longer needed.');
  } catch (e) { console.error(e.message); process.exit(1); }
}
