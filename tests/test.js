// Run with: node tests/test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = (a, b) => html.split(a)[1].split(b)[0];
const Core = new Function(grab('/*CORE-START*/', '/*CORE-END*/').replace("if (typeof module !== 'undefined') module.exports = Core;", '') + '; return Core;')();
const exampleProject = new Function('Core', grab('/*EXAMPLE-START*/', '/*EXAMPLE-END*/') + '; return exampleProject;')(Core);
const I18N = new Function('Core', grab('/*I18N-START*/', '/*I18N-END*/') + '; return I18N;')(Core);

const rater = (id, t, c, l) => ({ id, name: id, t: t || {}, c: c || {}, l: l || {} });
function proj() {
  const p = Core.blank();
  p.tasks = [{ id: 't1', text: 'A' }, { id: 't2', text: 'B' }, { id: 't3', text: 'C' }, { id: 't4', text: 'D' }];
  p.competencies = [{ id: 'c1', name: 'X' }, { id: 'c2', name: 'Y' }, { id: 'c3', name: 'Z' }];
  return p;
}

// mean ignores zeros and blanks
assert.strictEqual(Core.mean([4, 0, 2]), 3);
assert.strictEqual(Core.mean([0, 0]), null);
assert.strictEqual(Core.mean([]), null);

// tasks
let p = proj();
p.raters = [
  rater('r1', { t1: { imp: 4, freq: 3 }, t2: { imp: 0, freq: 0 }, t3: { imp: 3, freq: 2 }, t4: { imp: 5, freq: 5 } }),
  rater('r2', { t1: { imp: 3, freq: 3 }, t2: { imp: 5, freq: 5 }, t3: { imp: 4, freq: 3 }, t4: { imp: 0, freq: 0 } }),
  rater('r3', { t1: { imp: 2, freq: 4 }, t2: { imp: 5, freq: 5 }, t3: { imp: 5, freq: 3 }, t4: { imp: 5 } }), // t4 incomplete -> ignored
];
let tr = Core.taskResults(p);
assert.strictEqual(tr[0].imp, 3); assert.ok(Math.abs(tr[0].freq - 10 / 3) < 1e-9); assert.strictEqual(tr[0].critical, true);
// t2: one of three rated 0 -> not eliminated, zero excluded from the average
assert.strictEqual(tr[1].eliminated, false); assert.strictEqual(tr[1].imp, 5); assert.strictEqual(tr[1].critical, true);
// t3: frequency 2.67 -> below cutoff
assert.strictEqual(tr[2].critical, false);
// t4: two complete ratings, one is 0 -> exactly half -> eliminated
assert.strictEqual(tr[3].n, 2); assert.strictEqual(tr[3].eliminated, true); assert.strictEqual(tr[3].critical, false);
// rare but important: t3 averages 4.00 on importance but 2.67 on frequency -> flagged, critical only if the analyst keeps it
assert.strictEqual(tr[2].rare, true); assert.strictEqual(tr[2].kept, false); assert.strictEqual(tr[0].rare, false); assert.strictEqual(tr[3].rare, false);
p.keepTasks = { t3: true }; assert.strictEqual(Core.taskResults(p)[2].critical, true); assert.strictEqual(Core.taskResults(p)[2].kept, true);
p.keepTasks = { t1: true }; assert.strictEqual(Core.taskResults(p)[0].kept, false); // keeping only applies to flagged tasks
p.cutoffs.rareImp = 4.5; p.keepTasks = { t3: true }; assert.strictEqual(Core.taskResults(p)[2].critical, false); p.cutoffs.rareImp = 4; p.keepTasks = {};
// unrated task is not critical
assert.strictEqual(Core.taskResults(proj())[0].critical, false);

// competencies
p.raters[0].c = { c1: { imp: 4, entry: 1, dv: 4 }, c2: { imp: 4, entry: 3, dv: 5 }, c3: { imp: 3, entry: 2, dv: 2 } };
p.raters[1].c = { c1: { imp: 3, entry: 2, dv: 3 }, c2: { imp: 5, entry: 3, dv: 5 }, c3: { imp: 3, entry: 2, dv: 3 } };
p.raters[2].c = { c1: { imp: 2, entry: 3, dv: 2 }, c2: { imp: 5, entry: 2, dv: 5 }, c3: { imp: 4, entry: 0, dv: 2 } };
let cr = Core.compResults(p);
assert.strictEqual(cr[0].imp, 3); assert.strictEqual(cr[0].entry, 2); assert.strictEqual(cr[0].critical, true); assert.strictEqual(cr[0].distinguishing, true);
assert.strictEqual(cr[1].critical, false); // needed late (entry 2.67)
assert.strictEqual(cr[2].critical, true); assert.strictEqual(cr[2].entry, 2); assert.strictEqual(cr[2].distinguishing, false);

// linkage: critical tasks t1,t2 x critical comps c1,c3
let s = Core.linkSets(p);
assert.deepStrictEqual(s, { tasks: ['t1', 't2'], comps: ['c1', 'c3'] });
p.raters[0].l = { 't1|c1': 4, 't1|c3': 2, 't2|c1': 2, 't2|c3': 1 };
p.raters[1].l = { 't1|c1': 3, 't1|c3': 2, 't2|c1': 3, 't2|c3': 2 };
p.raters[2].l = { 't1|c1': 2, 't1|c3': 0, 't2|c1': 3, 't2|c3': 2 };
let L = Core.linkResults(p);
assert.strictEqual(L.cells['t1|c1'].avg, 3); assert.strictEqual(L.cells['t1|c1'].linked, true);
assert.strictEqual(L.cells['t1|c3'].avg, 2); assert.strictEqual(L.cells['t2|c1'].linked, false);
assert.deepStrictEqual(L.finalTasks, ['t1']); assert.deepStrictEqual(L.finalComps, ['c1']);
assert.deepStrictEqual(L.droppedTasks, ['t2']); assert.deepStrictEqual(L.droppedComps, ['c3']);

// cutoffs are adjustable
p.cutoffs.link = 2.5; assert.deepStrictEqual(Core.linkResults(p).finalTasks, ['t1', 't2']); p.cutoffs.link = 3;

// rater files: independent, round-trip
let pk = Core.raterPacket(p, 'r2', 2);
assert.strictEqual(pk.raters.length, 1); assert.strictEqual(pk.raters[0].id, 'r2'); assert.deepStrictEqual(pk.linkTasks, ['t1', 't2']);
assert.ok(!JSON.stringify(pk).includes('"r1"'));
assert.deepStrictEqual(Core.linkSets(pk), { tasks: ['t1', 't2'], comps: ['c1', 'c3'] });
pk.raters[0].l['t2|c3'] = 5;
assert.strictEqual(Core.mergeResponse(p, Core.raterResponse(pk)), null);
assert.strictEqual(p.raters[1].l['t2|c3'], 5); assert.strictEqual(p.raters[1].t.t1.imp, 3); // round 2 leaves round 1 ratings alone
let pk1 = Core.raterPacket(p, 'r1', 1); pk1.raters[0].t.t1 = { imp: 5, freq: 5 };
Core.mergeResponse(p, Core.raterResponse(pk1)); assert.strictEqual(p.raters[0].t.t1.imp, 5); assert.strictEqual(p.raters[0].l['t1|c1'], 4);
assert.ok(Core.mergeResponse(Core.blank(), Core.raterResponse(pk)));

// example project produces a complete, sensible result
const ex = exampleProject(), exT = Core.taskResults(ex), exL = Core.linkResults(ex);
assert.strictEqual(exT[9].eliminated, true); assert.strictEqual(exT[11].kept, true); assert.ok(exL.finalTasks.includes('t12'));
assert.ok(exL.finalTasks.length >= 4 && exL.finalComps.length >= 3 && exL.rated === exL.total);
// English example: unchanged by the French edition (same critical items and final lists as before)
assert.deepStrictEqual(exT.filter(t => t.critical).map(t => t.id), ['t1', 't2', 't4', 't6', 't7', 't8', 't11', 't12']);
assert.deepStrictEqual(Core.compResults(ex).filter(k => k.critical).map(k => k.id), ['c1', 'c2', 'c3', 'c4', 'c7']);
assert.deepStrictEqual(exL.finalTasks, ['t1', 't2', 't4', 't6', 't7', 't8', 't12']); assert.deepStrictEqual(exL.finalComps, ['c1', 'c2', 'c3', 'c4', 'c7']);
assert.strictEqual(ex.lang, 'en'); assert.strictEqual(ex.version, 2);

// French example (ROME M1501): every teaching point holds
const fx = exampleProject('fr'), fT = Core.taskResults(fx), fC = Core.compResults(fx), fL = Core.linkResults(fx);
const ids = (a, f) => a.filter(f).map(x => x.id);
assert.strictEqual(fx.lang, 'fr');
assert.deepStrictEqual(ids(fT, t => t.critical), ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't11', 't12']);
assert.strictEqual(fT[11].kept, true); assert.strictEqual(fT[11].rare, true);                      // t12 rare but important, kept
assert.ok(fT[7].freq < 3 && !fT[7].critical && fT[8].freq < 3 && !fT[8].critical);              // t8, t9 below the frequency cutoff
assert.deepStrictEqual(ids(fT, t => t.eliminated), ['t10']);                                      // copied from the old job ad, not performed
assert.deepStrictEqual(ids(fC, k => k.critical), ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10']);
assert.strictEqual(fC[10].critical, false);                                                        // c11 diploma: not critical
assert.deepStrictEqual(ids(fC, k => k.dv < 3), ['c4', 'c9', 'c10', 'c11']);                      // low capacity to discriminate
assert.deepStrictEqual(fL.finalTasks, ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't11', 't12']);
assert.deepStrictEqual(fL.finalComps, ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
assert.deepStrictEqual(fL.droppedComps, ['c10']);                                                 // sounds right, linked to no task
assert.strictEqual(fL.rated, fL.total);
assert.deepStrictEqual(fx.tasks.filter(Core.needsReview).map(t => t.id), ['t11']);               // left in the ROME's wording
assert.deepStrictEqual(fx.tasks[10].origin, { type: 'rome', code: 'M1501', ogr: 482249, version: '62', edited: false });
assert.strictEqual(fx.competencies[10].kind, 'certification');

// v1 files open as v2 without losing anything, including fields this version does not use
const v1 = { kind: 'oja-project', version: 1, id: 'abc', job: { title: 'X', org: 'Y', family: '', analyst: '', date: '2026-11-20', sources: 'S' },
  tasks: [{ id: 't1', text: 'A', source: 'B', origin: { type: 'rome', code: 'M1501', ogr: 1, version: '62', edited: false } }], competencies: [{ id: 'c1', name: 'N', definition: 'D', source: '', kind: 'savoir' }],
  raters: [{ id: 'r1', name: 'R', title: 'T', t: { t1: { imp: 4, freq: 3 } }, c: {}, l: {} }], cutoffs: { taskImp: 2.5 }, decisions: { c1: { assess: true, use: 'Ranking factor', note: 'n' } }, keepTasks: { t1: true }, seq: 4, custom: { keep: 'me' } };
const n2 = Core.normalize(JSON.parse(JSON.stringify(v1)));
assert.strictEqual(n2.version, 2); assert.strictEqual(n2.lang, 'en');
['id', 'job', 'tasks', 'competencies', 'raters', 'decisions', 'keepTasks', 'seq', 'custom'].forEach(k => assert.deepStrictEqual(n2[k], v1[k], k));
assert.strictEqual(n2.cutoffs.taskImp, 2.5); assert.strictEqual(n2.cutoffs.link, 3);
assert.strictEqual(Core.normalize({ kind: 'oja-project', lang: 'fr' }).lang, 'fr');
assert.strictEqual(Core.raterPacket(fx, 'r1', 1).lang, 'fr');                                    // rater files carry the project's language

// file names without accents
assert.strictEqual(Core.slug('Chargé de paie'), 'charge-de-paie');
assert.strictEqual(Core.slug('Œuvre d’Éléonore & Cie'), 'oeuvre-d-eleonore-cie');
assert.strictEqual(Core.slug('', 'analyse-des-emplois'), 'analyse-des-emplois');
assert.strictEqual(Core.slug('HR Assistant (example)'), 'hr-assistant-example');

// numbers and CSV
assert.strictEqual(Core.fmtNum(3.25, 'fr'), '3,25'); assert.strictEqual(Core.fmtNum(3.25, 'en'), '3.25'); assert.strictEqual(Core.fmtNum(null, 'fr'), '–');
assert.strictEqual(Core.fmtCut(2.5, 'fr'), '2,5');
assert.strictEqual(Core.toCSV([['N°', 'Tâche', '3,25'], ['1', 'a;b', 'x']], 'fr'), 'N°;Tâche;3,25\r\n1;"a;b";x');
assert.strictEqual(Core.toCSV([['No', 'Task', '3.25'], ['1', 'a,b', 'x']], 'en'), 'No,Task,3.25\r\n1,"a,b",x');

// dictionaries: same keys in both languages; French scales and typography
const ek = Object.keys(I18N.en).sort(), fk = Object.keys(I18N.fr).sort();
assert.deepStrictEqual(ek.filter(k => !fk.includes(k)), []);
assert.strictEqual(I18N.fr.scales.compDV.label, 'Capacité à départager');
assert.deepStrictEqual(I18N.fr.scales.compDV.opts, ['Sans objet', 'Pas utile', 'Un peu utile', 'Utile', 'Très utile', 'Extrêmement utile']);
assert.ok(I18N.fr.scales.compDV.q.endsWith('acceptable\u00a0?'));
assert.ok(!/ [:;?!»]|« /.test(JSON.stringify(I18N.fr)));                                       // no breaking space before : ; ? ! or inside « »
assert.ok(I18N.fr.entryNote.includes('L.\u00a01221-20') || I18N.fr.entryNote.includes('L. 1221-20'));
assert.strictEqual(I18N.en.entryNote, '');

// ---------- ROME (phase 2) ----------
const vm = require('vm');
function romeData(file) { const box = { F: {}, I: null, C: null, V: null }; const ctx = { OJA_ROME: { add: (c, o) => { box.F[c] = o; }, index: o => { box.I = o; }, current: o => { box.C = o; }, version: o => { box.V = o; } } }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'rome', file), 'utf8'), ctx); return JSON.parse(JSON.stringify(box)); } // copied out of the sandbox

// The generated data: current version, the search index and the M1501 profile used by the French example.
const cur = romeData('current.js').C;
assert.strictEqual(cur.version, '62');
const idx = romeData('v' + cur.version + '/index.js').I;
assert.strictEqual(idx.fiches.length, 1923);
assert.strictEqual(idx.titles.length, 14330);                                                  // every ROME job title, rarely used ones included
assert.ok(idx.meta.attribution.fr.startsWith('Source : France Travail, ROME 4.0 version 62 (octobre 2026)'));
const m1501 = romeData('v62/M1501.js').F.M1501;
assert.strictEqual(m1501.t, 'Assistant / Assistante Ressources Humaines (RH)');
assert.strictEqual(m1501.sf.length, 44);
assert.strictEqual(m1501.sf.filter(x => x[3]).length, 11);                                    // 11 core savoir-faire in v62 (the plan said 10: it counted a truncated list)
assert.strictEqual(m1501.se.length, 3); assert.strictEqual(m1501.cert.length, 5); assert.strictEqual(m1501.ctx.length, 9);
assert.ok(m1501.d.includes('Ressources Humaines') && /é/.test(m1501.d));                    // decoded from cp1252, accents intact
// Every ROME origin in the French example points to an item that exists in the generated M1501 data.
const ogrs = new Set([].concat(m1501.sf.map(x => x[2]), m1501.sv.map(x => x[2]), m1501.cert.map(x => x[1]), m1501.se.map(x => x[1])));
const exOrigins = fx.tasks.concat(fx.competencies).filter(x => x.origin).map(x => x.origin.ogr);
assert.strictEqual(exOrigins.length, 17);
assert.deepStrictEqual(exOrigins.filter(o => !ogrs.has(o)), []);
assert.deepStrictEqual(fx.job.rome.ctx, m1501.ctx);                                            // the example's working context matches the data

// Search: accent- and case-insensitive, by job title or ROME code.
const folded = idx.titles.map(r => Core.fold(r[0]));
assert.strictEqual(Core.fold('Chargé·e d’Œuvre'), 'charge·e d’oeuvre');
assert.strictEqual(Core.romeSearch(idx, folded, 'assistant rh').list[0].code, 'M1501');
assert.strictEqual(Core.romeSearch(idx, folded, 'ASSISTANTE RESSOURCES humaines').list[0].code, 'M1501');
assert.strictEqual(Core.romeSearch(idx, folded, 'secretaire du service personnel').list[0].code, 'M1501'); // found through another job title
assert.strictEqual(Core.romeSearch(idx, folded, 'M1507').list[0].code, 'M1507');
assert.deepStrictEqual(Core.romeSearch(idx, folded, 'm15').list.slice(0, 2).map(h => h.code), ['M1501', 'M1502']);
assert.strictEqual(Core.romeSearch(idx, folded, '   ').total, 0);

// Items offered for import: core savoir-faire ticked as tasks; knowledge, certifications and savoir-être unticked.
const its = Core.romeItems(m1501);
assert.strictEqual(its.filter(x => x.group === 'sf').length, 44);
assert.strictEqual(its.filter(x => x.on).length, 11);
assert.ok(its.filter(x => x.on).every(x => x.group === 'sf' && x.core && x.as === 'task'));
assert.ok(its.filter(x => x.group === 'cert').every(x => x.kind === 'certification' && !x.on));
assert.ok(its.filter(x => x.group === 'se').every(x => x.kind === 'savoir-etre' && !x.on));
assert.ok(its.filter(x => x.group === 'sv').every(x => x.kind === 'savoir' && !x.on));

// Import: origin recorded, duplicates (same OGR code) skipped, savoir-faire can become a competency.
const ip = Core.blank('fr');
assert.strictEqual(Core.romeUsed(ip), false);
const core = its.filter(x => x.on);
let ir = Core.importRome(ip, 'M1501', '62', core, 'Fiche ROME M1501');
assert.deepStrictEqual(ir, { added: 11, skipped: 0 });
assert.strictEqual(ip.tasks.length, 11);
assert.deepStrictEqual(ip.tasks[0].origin, { type: 'rome', code: 'M1501', ogr: core[0].ogr, version: '62', edited: false });
assert.ok(ip.tasks.every(Core.needsReview)); assert.strictEqual(ip.tasks[0].source, 'Fiche ROME M1501');
assert.strictEqual(Core.romeUsed(ip), true); assert.strictEqual(Core.romeVersion(ip), '62');
const sfComp = Object.assign({}, its.find(x => x.group === 'sf' && !x.core), { as: 'comp' });
const se0 = its.find(x => x.group === 'se'), cert0 = its.find(x => x.group === 'cert');
ir = Core.importRome(ip, 'M1501', '62', core.concat([sfComp, se0, cert0]), 'Fiche ROME M1501');
assert.deepStrictEqual(ir, { added: 3, skipped: 11 });
assert.deepStrictEqual(ip.competencies.map(c => c.kind), ['savoir-faire', 'savoir-etre', 'certification']);
assert.ok(ip.competencies.every(c => c.definition === '' && Core.needsReview(c)));
assert.strictEqual(new Set(ip.tasks.concat(ip.competencies).map(x => x.id)).size, 14);          // unique ids
// Imported projects survive a save and reopen.
assert.deepStrictEqual(Core.normalize(JSON.parse(JSON.stringify(ip))).tasks, ip.tasks);

// Build script on a small zip: cp1252 decoding, counts, and checks that fail loudly.
function makeZip(entries) {
  const locals = [], centrals = []; let off = 0;
  entries.forEach(([name, data], k) => {
    const nb = Buffer.from(name), deflate = k % 2 === 0, body = deflate ? zlib.deflateRawSync(data) : data;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(deflate ? 8 : 0, 8); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(deflate ? 8 : 0, 10); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, nb, body); centrals.push(ch, nb); off += 30 + nb.length + body.length;
  });
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat(locals.concat([cd, end]));
}
const zlib = require('zlib');
const cp = s => Buffer.from(Array.from(s).map(ch => ({ 'é': 0xe9, 'è': 0xe8, '’': 0x92, 'œ': 0x9c, 'à': 0xe0 })[ch] || ch.charCodeAt(0)));
const fichesJ = [{ numero: 1, rome: { code_rome: 'Z9901', intitule: 'Ébéniste d’œuvre', code_ogr: 1 }, appellations: [{ libelle: 'Menuisier d’art', code_ogr: 11 }], definition: 'Réalise des meubles.', acces_metier: 'CAP ébéniste.',
  competences: { savoir_faire: { enjeux: [{ libelle: 'Fabrication', items: [{ libelle: 'Assembler des pièces', code_ogr: 101, coeur_metier: 'Principale' }, { libelle: 'Vérifier la qualité', code_ogr: 102, coeur_metier: null }] }] },
    savoir_etre_professionnel: { enjeux: [{ libelle: 'Savoir-être professionnels', items: [{ libelle: 'Être rigoureux', code_ogr: 201 }] }] },
    savoirs: { categories: [{ libelle: 'Certifications et habilitations', items: [{ libelle: 'CAP ébéniste', code_ogr: 301, coeur_metier: null }] }, { libelle: 'Normes et procédés', items: [{ libelle: 'Essences de bois', code_ogr: 302, coeur_metier: null }] }] } },
  contextes_travail: [{ libelle: 'Lieux', items: [{ libelle: 'Atelier', code_ogr: 401 }] }], secteurs_activite: [], mobilites: [] }];
const appsJ = [{ code_ogr: 1, libelle: 'Ébéniste d’œuvre', classification: 'PRINCIPALE', peu_usite: 'N', code_rome_parent: 'Z9901' }, { code_ogr: 11, libelle: 'Menuisier d’art', classification: 'SYNONYME', peu_usite: 'N', code_rome_parent: 'Z9901' }];
const treeJ = { arbo_principale: [{ code_metier: 'Z', libelle: 'Test', liste_domaine_prof: [{ code_metier: 'Z99', libelle: 'Bois', liste_metier: [{ code_ogr: 1, code_rome: 'Z9901', libelle: 'Ébéniste d’œuvre' }] }] }] };
const zipOK = makeZip([
  ['version.txt', Buffer.from('Numero de version : 7\n\nDate de publication : 05/03/2027\n\nLe ROME passe ainsi à 1 métiers.', 'utf8')],
  ['unix_fiche_emploi_metier_v407.json', cp(JSON.stringify(fichesJ))], ['unix_referentiel_appellation_v407.json', cp(JSON.stringify(appsJ))], ['unix_arborescence_principale_v407.json', cp(JSON.stringify(treeJ))]]);

(async () => {
  const B = await import(path.join(__dirname, '..', 'tools', 'build-rome.mjs'));
  assert.strictEqual(B.decodeText(cp('Ébéniste d’œuvre')), 'Ébéniste d’œuvre');               // cp1252 bytes
  assert.strictEqual(B.decodeText(Buffer.from('Ébéniste d’œuvre', 'utf8')), 'Ébéniste d’œuvre'); // UTF-8 still read as UTF-8
  const r = B.buildRome({ zip: zipOK, expect: { fiches: 1, titles: 2 } });
  assert.deepStrictEqual(r.stats, { version: '7', published: '2027-03-05', fiches: 1, titles: 2, principal: 1, usual: 1, rare: 0, rareTotal: 0, unplaced: 0, indexed: 2 });
  const f = r.fiches.Z9901;
  assert.strictEqual(f.t, 'Ébéniste d’œuvre'); assert.strictEqual(f.dom, 'Bois');
  assert.deepStrictEqual(f.sf, [['Fabrication', 'Assembler des pièces', 101, 1], ['Fabrication', 'Vérifier la qualité', 102, 0]]);
  assert.deepStrictEqual(f.cert, [['CAP ébéniste', 301]]); assert.deepStrictEqual(f.sv, [['Normes et procédés', 'Essences de bois', 302, 0]]);
  assert.deepStrictEqual(f.se, [['Être rigoureux', 201]]); assert.deepStrictEqual(f.ctx, [['Lieux', 'Atelier', 401]]);
  assert.deepStrictEqual(Object.keys(r.files).sort(), ['current.js', 'v7/Z9901.js', 'v7/index.js', 'v7/version.js']);
  assert.ok(r.files['v7/version.js'].includes('(mars 2027)'));
  // The generated files load as scripts and give back the same profile.
  const box = {}; vm.runInNewContext(r.files['v7/Z9901.js'], { OJA_ROME: { add: (c, o) => { box[c] = o; } } }); assert.deepStrictEqual(JSON.parse(JSON.stringify(box.Z9901)), f);
  // Fails loudly when counts do not match what was expected.
  assert.throws(() => B.buildRome({ zip: zipOK, expect: { fiches: 1923 } }), /expected 1923 profiles, found 1/);
  const appsBad = appsJ.concat([{ code_ogr: 12, libelle: 'Titre orphelin', classification: 'SYNONYME', peu_usite: 'N', code_rome_parent: 'Z9901' }]);
  const zipBad = makeZip([['version.txt', Buffer.from('Numero de version : 7\nDate de publication : 05/03/2027', 'utf8')], ['unix_fiche_emploi_metier_v407.json', cp(JSON.stringify(fichesJ))], ['unix_referentiel_appellation_v407.json', cp(JSON.stringify(appsBad))], ['unix_arborescence_principale_v407.json', cp(JSON.stringify(treeJ))]]);
  assert.throws(() => B.buildRome({ zip: zipBad }), /could not be placed under a profile/);
  assert.throws(() => B.readZip(Buffer.from('not a zip')), /Not a zip file/);
  console.log('ROME tests passed: data v' + cur.version + ', ' + idx.fiches.length + ' profiles, ' + idx.titles.length + ' job titles; M1501 has ' + m1501.sf.length + ' savoir-faire (' + m1501.sf.filter(x => x[3]).length + ' core).');
})().catch(e => { console.error(e); process.exit(1); });

console.log('All tests passed. Example: ' + exT.filter(t => t.critical).length + ' critical tasks, ' + Core.compResults(ex).filter(k => k.critical).length + ' critical competencies, final ' + exL.finalTasks.length + ' tasks / ' + exL.finalComps.length + ' competencies; dropped', exL.droppedTasks, exL.droppedComps);
