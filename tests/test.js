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

console.log('All tests passed. Example: ' + exT.filter(t => t.critical).length + ' critical tasks, ' + Core.compResults(ex).filter(k => k.critical).length + ' critical competencies, final ' + exL.finalTasks.length + ' tasks / ' + exL.finalComps.length + ' competencies; dropped', exL.droppedTasks, exL.droppedComps);
