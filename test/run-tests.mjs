// Runs the engine from index.html in a Node VM and checks it against the known lists.
// Usage: node test/run-tests.mjs
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grab = id => {
  const m = html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`));
  if (!m) throw new Error(`script #${id} not found in index.html`);
  return m[1];
};
const ctx = vm.createContext({ console, btoa, atob });
vm.runInContext(grab('game-data'), ctx, { filename: 'game-data' });
vm.runInContext(grab('engine'), ctx, { filename: 'engine' });
const { GAME, Engine: E } = vm.runInContext('({ GAME, Engine })', ctx);

let pass = 0, fail = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; failures.push(`✗ ${name}\n    ${e.message}`); }
}
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${msg || 'expected equal'}: got ${A}, want ${B}`);
}
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }

const list = (race, faction, scale, units, cards) => E.normalize({
  race, faction, scale, cards,
  units: units.map(([id, n, up]) => ({ id, n, up: up || [] })),
});
const slots = ev => Object.fromEntries(E.SLOTS.filter(t => ev.used[t] || ev.prov[t]).map(t => [t, [ev.used[t], ev.prov[t]]]));
const errs = ev => ev.errors.map(p => p.msg);

// ── every known-legal list (StarCraft TMG Reference/Army-Lists.md) ──
// The app only ships the Founders box lists as examples; the rest live here as test fixtures.
const REFERENCE = [
  { name: `The Golden Armada`, race: 'protoss', faction: 'khalai', scale: 'standard',
    units: [['artanis', 1], ['immortal', 1, ['Shield Overcharge']], ['stalker', 2, ['Path of Shadows', 'Fury of the Nerazim']],
      ['stalker', 1, ['Path of Shadows']], ['zealot', 3, ['Leg Enhancements', 'My Life for Aiur']],
      ['zealot', 3, ['Leg Enhancements', 'My Life for Aiur', 'Zealous Round']], ['adept', 4, ['Glaive Strike', 'Resonating Glaives', 'Guidance']],
      ['sentry', 2, ['Solid-Field Projectors']], ['hightemplar', 2, ['Psionic Storm']]],
    cards: ['gateway', 'robotics', 'twilight-council', 'archives', 'warpprism', 'observer'] },
  { name: `Anvil of Aiur`, race: 'protoss', faction: 'khalai', scale: 'skirmish',
    units: [['artanis', 1], ['immortal', 1, ['Shield Overcharge']],
      ['zealot', 3, ['Leg Enhancements', 'My Life for Aiur', 'We Stand as One', 'Zealous Round']], ['stalker', 1, ['Path of Shadows', 'Fury of the Nerazim']]],
    cards: ['gateway', 'robotics', 'observer'] },
  { name: `Daelaam Stalkers`, race: 'protoss', faction: 'daelaam', scale: 'skirmish',
    units: [['zealot', 3, ['My Life for Aiur', 'Leg Enhancements', 'We Stand as One', 'Zealous Round']],
      ['adept', 4, ['Resonating Glaives', 'Glaive Strike', 'Guidance']], ['sentry', 2, ['Solid-Field Projectors', 'Hallucination']],
      ['stalker', 1, ['Path of Shadows', 'Fury of the Nerazim']], ['stalker', 1, ['Path of Shadows', 'Fury of the Nerazim']]],
    cards: ['forge', 'twilight-council', 'observer'] },
  { name: `Kerrigan's Fist`, race: 'zerg', faction: 'ks', scale: 'standard',
    units: [['kerrigan', 1], ['raptor', 18, ['Shredding Claws', 'Adrenal Glands']], ['zergling', 18, ['Shredding Claws', 'Adrenal Glands']],
      ['ksraptor', 6], ['roach', 3, ['Glial Reconstitution', 'Tunneling Claws', 'Hydriodic Bile']], ['hydralisk', 4, ['Grooved Spines', 'Ancillary Carapace']],
      ['ravager', 2, ['Potent Bile']], ['queen', 1, ['Creep Speed', 'Domineering Presence']]],
    cards: ['creep-malignant', 'warren', 'evo', 'hydraden', 'overlord', 'lair', 'overseer'] },
  { name: `Kerrigan's Fist — Defiler`, race: 'zerg', faction: 'ks', scale: 'standard',
    units: [['kerrigan', 1], ['raptor', 18, ['Shredding Claws', 'Adrenal Glands']], ['zergling', 18, ['Shredding Claws', 'Adrenal Glands']],
      ['ksraptor', 6], ['roach', 3, ['Glial Reconstitution', 'Tunneling Claws']], ['hydralisk', 4, ['Grooved Spines', 'Ancillary Carapace']],
      ['ravager', 1, ['Potent Bile']], ['queen', 1, ['Creep Speed']], ['defiler', 1, ['Plague']]],
    cards: ['creep-malignant', 'warren', 'evo', 'hydraden', 'overlord', 'defilermound', 'overseer'] },
  ...E.EXAMPLES,
];
const ref = name => {
  const x = REFERENCE.find(r => r.name === name);
  return E.normalize({ ...x, units: x.units.map(([id, n, up]) => ({ id, n, up: up || [] })) });
};
const LEGAL = {
  'The Golden Armada': { minerals: 2000, gas: 200, res: 7, slots: { core: [5, 6], elite: [5, 5], support: [2, 4], hero: [1, 1] } },
  'Anvil of Aiur': { minerals: 1000, gas: 85, res: 4, slots: { core: [2, 4], elite: [3, 4], support: [0, 1], hero: [1, 1] } },
  'Founders box — Khalai': { minerals: 1000, gas: 85, res: 4, slots: { core: [3, 6], elite: [2, 2], support: [1, 1], hero: [1, 1] } },
  'Daelaam Stalkers': { minerals: 1000, gas: 95, res: 4, slots: { core: [3, 3], elite: [2, 3], support: [1, 3], air: [0, 1] } },
  "Kerrigan's Fist": { minerals: 2000, gas: 185, res: 7, slots: { core: [5, 7], elite: [6, 6], support: [1, 1], hero: [1, 2] } },
  "Kerrigan's Fist — Defiler": { minerals: 2000, gas: 185, res: 7, slots: { core: [4, 6], elite: [6, 6], support: [2, 2], hero: [1, 2] } },
  "Founders box — Raynor's Raiders": { minerals: 1000, gas: 95, res: 4, slots: { core: [3, 5], support: [1, 3], air: [0, 1], hero: [1, 1] } },
};
REFERENCE.forEach(x => {
  test(`legal: ${x.name}`, () => {
    const want = LEGAL[x.name];
    ok(want, `no expectation for ${x.name}`);
    const ev = E.evaluate(ref(x.name));
    eq(errs(ev), [], 'errors');
    eq(ev.minerals, want.minerals, 'minerals');
    eq(ev.gas, want.gas, 'gas');
    eq(ev.res, want.res, 'resource');
    eq(slots(ev), want.slots, 'slots used/provided');
  });
});
test('every expected list is a fixture', () => eq(REFERENCE.map(x => x.name).sort(), Object.keys(LEGAL).sort()));
test('the app ships only the Founders box lists as examples', () => eq(E.EXAMPLES.map(x => x.name), ['Founders box — Khalai', "Founders box — Raynor's Raiders"]));

// ── failures that must be caught ──
const fist = () => ref("Kerrigan's Fist");
test("Kerrigan's Fist with Spawning Pool + Six Pool instead of Lair + Overlord is 2 Elite short", () => {
  const l = fist();
  l.cards = l.cards.filter(id => id !== 'lair' && id !== 'overlord').concat(['pool', 'sixpool']);
  const ev = E.evaluate(l);
  eq(ev.gas, 175, 'gas');
  eq(ev.errors.length, 1, 'one problem');
  ok(/^2 Elite slots short — .*would add Elite/.test(ev.errors[0].msg), ev.errors[0].msg);
  ok(/Hydralisk Den/.test(ev.errors[0].msg), 'suggests Hydralisk Den');
});

const khalaiFounders = () => ref('Founders box — Khalai');
test('Khalai with Sentries but no Support-slot card fails', () => {
  const l = khalaiFounders();
  l.cards = l.cards.filter(id => id !== 'observer');
  const ev = E.evaluate(l);
  eq(ev.errors.length, 1, 'one problem');
  ok(/^1 Support slot short — Khalai has no Support slots; .*Observer/.test(ev.errors[0].msg), ev.errors[0].msg);
});

test("Rulebook Terran Founders list (AGG-12 + Rocket Launcher Marines) is 1,050 at Oct 2026 costs", () => {
  const l = list('terran', 'rr', 'skirmish', [['marine', 6, ['AGG-12', 'Rocket Launcher']], ['raider', 6], ['marauder', 2, ['Kinetic Foam']],
    ['medic', 3, ['Stabilizer Medpacks']], ['raynor', 1]], ['barracks', 'academy', 'orbital']);
  const ev = E.evaluate(l);
  eq(ev.minerals, 1050, 'minerals');
  eq(errs(ev), ['50 Minerals over the 1,000 limit.']);
});

test('faction tags: Praetor Guard needs Khalai', () => {
  const ev = E.evaluate(list('protoss', 'daelaam', 'skirmish', [['praetor', 3]], ['forge']));
  ok(errs(ev).includes('Praetor Guard needs the Khalai faction card.'), errs(ev).join(' | '));
});
test('faction tags: Malignant Creep needs Kerrigan\'s Swarm', () => {
  const ev = E.evaluate(list('zerg', 'zs', 'skirmish', [['zergling', 12]], ['creep-malignant']));
  eq(errs(ev), ["Malignant Creep needs the Kerrigan's Swarm faction card."]);
});
test('faction tags: Void Seeker needs Nerazim', () => {
  const ev = E.evaluate(list('protoss', 'khalai', 'skirmish', [['adept', 4]], ['voidseeker']));
  eq(errs(ev), ['Void Seeker needs the Nerazim faction card.']);
});
test('faction tags: Raynor\'s Raiders units need RR; TERRAN-only units fit any Terran faction', () => {
  const ev = E.evaluate(list('terran', 'taf', 'skirmish', [['raider', 6], ['marine', 6]], []));
  eq(errs(ev), ["Raynor's Raider needs the Raynor's Raiders faction card."]);
});
test('Unique units: max one copy', () => {
  const ev = E.evaluate(list('terran', 'rr', 'standard', [['raynor', 1], ['raynor', 1]], ['supplydepot']));
  ok(errs(ev).includes('Jim Raynor is Unique — you have 2; keep one.'), errs(ev).join(' | '));
});
test('Unique cards: max one copy; non-unique cards may repeat', () => {
  const ev = E.evaluate(list('terran', 'taf', 'standard', [['marine', 6]], ['academy', 'academy', 'barracks', 'barracks']));
  eq(errs(ev), ['Academy is Unique — only one copy allowed.']);
  eq(ev.prov.core, 5, 'two Barracks add 2 Core');
});
test('Nova: only one profile per army', () => {
  const ev = E.evaluate(list('terran', 'nco', 'standard', [['nova-stealth', 1], ['nova-assault', 1]], ['supplydepot']));
  ok(errs(ev).includes('Only one of Nova (Stealth Mode) or Nova (Assault Mode) per army.'), errs(ev).join(' | '));
});
test('Zerg: exactly one Creep card', () => {
  eq(errs(E.evaluate(list('zerg', 'zs', 'skirmish', [['zergling', 12]], []))),
    ['Zerg armies need exactly one Creep card — Accelerating Creep (0 Gas) works with any faction.']);
  eq(errs(E.evaluate(list('zerg', 'ks', 'skirmish', [['zergling', 12]], ['creep-accel', 'creep-malignant']))),
    ['Only one Creep card allowed — you have 2.']);
  eq(errs(E.evaluate(list('zerg', 'zgs', 'skirmish', [['vileling', 18]], ['creep-reactive']))), []);
});
test('new Zerg lists start with Accelerating Creep', () => eq(E.newList({ race: 'zerg' }).cards, ['creep-accel']));
test('no faction card is a problem', () => ok(errs(E.evaluate(list('terran', '', 'skirmish', [], []))).includes('Pick a Faction card.')));
test('illegal squad size is flagged', () => {
  const ev = E.evaluate(list('terran', 'taf', 'skirmish', [['marine', 7]], []));
  ok(errs(ev).includes('Marine can\'t be fielded as 7 — legal sizes: 6 or 9 models.'), errs(ev).join(' | '));
});
test('summoned units cost nothing and are not purchasable', () => {
  const ev = E.evaluate(list('protoss', 'khalai', 'skirmish', [['pylon', 1]], []));
  eq(ev.minerals, 0);
  ok(errs(ev).some(m => /Pylon is summoned/.test(m)), errs(ev).join(' | '));
});
test('Gas over the limit', () => {
  const ev = E.evaluate(list('protoss', 'khalai', 'skirmish', [], ['nexus', 'warpgate', 'powerfield']));
  eq(errs(ev), ['20 Gas over the 100 limit (Gas is 10% of the Mineral limit).']);
});
test('Daelaam needs a Hero slot for a hero; Power Field is suggested', () => {
  const ev = E.evaluate(list('protoss', 'daelaam', 'skirmish', [['zeratul', 1]], []));
  eq(errs(ev), ['1 Hero slot short — Daelaam has no Hero slots; Power Field would add Hero.']);
});
test('Grand Offensive: custom limit, Gas = 10%', () => {
  const l = list('terran', 'taf', 'grand', [], []); l.limit = 3500;
  const ev = E.evaluate(l);
  eq([ev.scale.limit, ev.scale.gasLimit], [3500, 350]);
  l.limit = 1800;
  ok(errs(E.evaluate(l)).some(m => /Grand Offensive starts at 2,001/.test(m)));
});
test('Zagara Broodmother is flagged as a built-in with no cost', () => {
  const ev = E.evaluate(list('zerg', 'zgs', 'skirmish', [['zagara', 1]], ['creep-accel']));
  eq(ev.minerals, 250); eq(errs(ev), []);
  ok(ev.notes.some(n => /Broodmother/.test(n.msg) && /no price/.test(n.msg)));
});

// ── upgrades, costs and the effective datasheet ──
const X = (id, n, up) => E.entry({ uid: 't', id, n, up: up || [] });
test('upgrade cost depends on squad size', () => {
  eq(X('marine', 6, ['Combat Shield']).cost, 190);
  eq(X('marine', 9, ['Combat Shield', 'Slugthrower']).cost, 270);
  eq(X('hydralisk', 4, ['Grooved Spines', 'Ancillary Carapace']).cost, 320);
  eq(X('stalker', 2, ['Path of Shadows', 'Fury of the Nerazim']).cost, 340);
});
test('per-model loadout: Marines with AGG-12 + Rocket Launcher', () => {
  const x = X('marine', 6, ['Rocket Launcher', 'AGG-12']);
  eq(E.loadoutText(E.loadout(x), false), ['Marine 1: AGG-12', 'Marine 2: C-14 Rifle + Rocket Launcher', 'Marines 3–6: C-14 Rifle']);
  eq(E.loadoutText(E.loadout(x))[0], 'Marine 1: AGG-12 · Strike');
});
test('loadout: whole-unit weapon swap applies to every model', () => {
  eq(E.loadoutText(E.loadout(X('zergling', 12, ['Shredding Claws']))), ['Zerglings 1–12: Shredding Claws']);
  eq(E.loadoutText(E.loadout(X('raynor', 1, ['C-14 Rifle'])), false), ['Jim Raynor: C-14 Rifle + "Justice" Revolver']);
});
test('more Specialist upgrades than models is a problem', () => {
  // no legal squad is that small, so use an (also flagged) 1-model Marine squad
  const ev = E.evaluate(list('terran', 'taf', 'skirmish', [['marine', 1, ['AGG-12', 'Rocket Launcher']]], []));
  ok(errs(ev).includes('Marines ×1: 2 Specialist upgrades but only 1 model — each needs its own model.'), errs(ev).join(' | '));
});
test('effective datasheet: Kinetic Foam +1 HP, Laser Targeting → LONG RANGE (16″)', () => {
  const eff = E.effective(X('marauder', 2, ['Kinetic Foam', 'Laser Targeting Systems']));
  eq(eff.stats.hp, 6);
  ok(eff.weapons[0].kw.includes('LONG RANGE (16″)'), eff.weapons[0].kw.join());
});
test('effective datasheet: Guidance replaces ANTI-EVADE (1) with (2)', () => {
  const w = E.effective(X('adept', 4, ['Guidance'])).weapons.find(v => v.name === 'Glaive Cannon');
  eq(w.kw, ['ANTI-EVADE (2)']);
});
test('effective datasheet: Hydriodic Bile sets Surge and S Dice', () => {
  const w = E.effective(X('roach', 3, ['Hydriodic Bile'])).weapons.find(v => v.name === 'Acid Saliva');
  eq([w.surge, w.sd], ['Light', 'D3+1']);
});
test('effective datasheet: Adrenal Glands follows Shredding Claws', () => {
  const ws = E.effective(X('raptor', 18, ['Adrenal Glands', 'Shredding Claws'])).weapons;
  eq(ws.map(w => [w.name, w.kw]), [['Shredding Claws', ['PRECISION (2)']]]);
});
test('Goliath: Scatter and Haywire both replace Hellfire — toggling swaps, validator flags both', () => {
  const e = { uid: 'g', id: 'goliath', n: 1, up: [] };
  E.toggleUpgrade(e, 'Scatter Missiles'); E.toggleUpgrade(e, 'Haywire Missiles');
  eq(e.up, ['Haywire Missiles']);
  const ev = E.evaluate(list('terran', 'taf', 'standard', [['goliath', 1, ['Scatter Missiles', 'Haywire Missiles']]], ['factory']));
  ok(errs(ev).some(m => /all replace Hellfire Missiles/.test(m)), errs(ev).join(' | '));
});
test('Specialist upgrades can stack on one unit (different models)', () => {
  const e = { uid: 'm', id: 'marine', n: 6, up: [] };
  E.toggleUpgrade(e, 'AGG-12'); E.toggleUpgrade(e, 'Rocket Launcher');
  eq(e.up, ['AGG-12', 'Rocket Launcher']);
});

// ── supply plan ──
test('supply pools per Round', () => {
  const l = list('terran', 'rr', 'standard', [], []);
  l.mission = 'Hold Position';
  eq(E.supplyPlan(l).pools.map(String), ['6', '8', '10', '12', 'Infinity']);
  l.scale = 'skirmish'; l.mission = 'Supply Drop';
  eq(E.supplyPlan(l).pools.map(String), ['4', '5', '6', 'Infinity']);
  l.scale = 'standard'; l.mission = 'Fire in the Sky';
  eq(E.supplyPlan(l).pools.map(String), ['5', '8', '11', '14', 'Infinity']);
});
test('Advanced Medic Facilities: 0 for the Supply Pool, still uses its slot', () => {
  const l = list('terran', 'rr', 'skirmish', [['medic', 3, ['Advanced Medic Facilities']]], []);
  const ev = E.evaluate(l);
  eq(ev.used.support, 1, 'slot');
  eq(E.supplyPlan(l).units[0].supply, 0, 'pool');
});
test('auto-plan never overfills a Round', () => {
  const l = fist(); l.mission = 'Hold Position';
  l.deploy = E.autoPlan(l);
  const p = E.supplyPlan(l);
  ok(p.rows.every(r => r.over === 0), JSON.stringify(p.rows.map(r => [r.onTable, r.pool])));
  ok(p.units.every(u => u.round >= 1), 'everything planned');
});

// ── card layout: phases, Models / Supply, cards in play ──
test('ability timing splits into phase, kind, cost and extras', () => {
  eq(E.timing('Assault · Reaction · 0 CP · Once per Game'), { phase: 'Assault', kind: 'Reaction', cost: '0 CP', extra: ['Once per Game'] });
  eq(E.timing('Movement · Active · X CP · REPEATABLE'), { phase: 'Movement', kind: 'Active', cost: 'X CP', extra: ['REPEATABLE'] });
  eq(E.timing('Assault · Active · 1–3 BM').cost, '1–3 BM');
  eq(E.timing('Passive').phase, 'Any');
});
test('Immortal abilities sit in the phases printed on its card', () => {
  const eff = E.effective(X('immortal', 1, ['Shield Overcharge']));
  const at = n => eff.abilities.find(a => a.n === n).phase;
  eq([at('Improved Barrier'), at('Indomitable'), at('Devastating Charge'), at('Shield Overcharge')], ['Any', 'Assault', 'Assault', 'Any']);
});
test('every unit ability, upgrade and card ability has a printed phase', () => {
  const bad = [];
  GAME.units.forEach(u => {
    (u.abilities || []).forEach(a => { if (!E.PHASES.includes(a[1].split(' · ')[0])) bad.push(`${u.id}/${a[0]}`); });
    (u.upgrades || []).filter(x => x.t).forEach(x => { if (!E.PHASES.includes(x.t.split(' · ')[0])) bad.push(`${u.id}/${x.n}`); });
  });
  [...GAME.factions, ...GAME.cards].forEach(c => c.abilities.forEach(a => { if (!E.PHASES.includes(a[1].split(' · ')[0])) bad.push(`${c.id}/${a[0]}`); }));
  eq(bad, []);
});
test('Models / Supply boxes mark the starting bracket', () => {
  eq(E.supplyProfile(E.units.zergling, 18), [{ models: '1-6', supply: '0', cur: false }, { models: '7-12', supply: '1', cur: false }, { models: '13-18', supply: '2', cur: true }]);
  eq(E.supplyProfile(E.units.immortal, 1), [{ models: '1', supply: '2', cur: true }]);
  eq(E.supplyProfile(E.units.pdd, 1), [{ models: '1', supply: '0', cur: true }]);
});
test('summoned units: from the faction card and from units', () => {
  eq(E.summonedUnits(list('terran', 'rr', 'skirmish', [['raven', 1], ['nova-stealth', 1]], [])).map(s => [s.def.id, s.summonedBy]),
    [['pdd', ["Raynor's Raiders"]], ['autoturret', ['Raven']], ['decoy', ['Nova (Stealth Mode)']]]);
  eq(E.summonedUnits(list('protoss', 'khalai', 'skirmish', [['zealot', 3]], [])).map(s => s.def.id), ['pylon']);
  eq(E.summonedUnits(list('zerg', 'zs', 'skirmish', [['zergling', 12]], [])), []);
});
test('Explosive Shrapnel Shells upgrades the Raven\'s Auto-Turret, not the Raven', () => {
  const [t] = E.summonedUnits(list('terran', 'taf', 'skirmish', [['raven', 1, ['Explosive Shrapnel Shells']]], []));
  const g = E.effective(t).weapons.find(w => w.name === 'Gauss Cannon');
  eq([g.surge, g.sd, g.setBy, g.modBy, t.fromUps], ['Light', 'D3+1', ['surge', 'sd'], ['Explosive Shrapnel Shells'], ['Explosive Shrapnel Shells']]);
  eq(E.effective(E.entry({ uid: 'r', id: 'raven', n: 1, up: ['Explosive Shrapnel Shells'] })).weapons.map(w => [w.name, w.surge]), [['Railguns', '–']]);
  const plain = E.effective(E.summonedUnits(list('terran', 'taf', 'skirmish', [['raven', 1]], []))[0]).weapons[0];
  eq([plain.surge, plain.sd], ['–', '–']);
});
test('two Ravens, only one upgraded: two Auto-Turret cards', () => {
  const s = E.summonedUnits(list('terran', 'taf', 'standard', [['raven', 1], ['raven', 1, ['Explosive Shrapnel Shells']]], []));
  eq(s.map(x => [x.def.id, x.fromUps]), [['autoturret', []], ['autoturret', ['Explosive Shrapnel Shells']]]);
  eq(new Set(s.map(x => x.e.uid)).size, 2, 'distinct keys');
});
test('cards in play: faction first, each copy keyed, creep is passive', () => {
  const l = list('zerg', 'ks', 'standard', [], ['creep-malignant', 'pool', 'pool', 'lair']);
  eq(E.cardsInPlay(l).map(c => [c.key, c.passive]), [['fac', false], ['creep-malignant#1', true], ['pool#1', false], ['pool#2', false], ['lair#1', false]]);
});
test('card usage and round survive save/load', () => {
  const l = E.normalize({ ...list('terran', 'rr', 'skirmish', [], ['barracks']), used: { 'barracks#1': true }, round: 3 });
  eq([l.used, l.round], [{ 'barracks#1': true }, 3]);
  eq(E.normalize({}).round, 1);
});

// ── export / import ──
REFERENCE.forEach(x => {
  test(`text round trip: ${x.name}`, () => {
    const a = ref(x.name), b = E.fromText(E.toText(a));
    const ea = E.evaluate(a), eb = E.evaluate(b);
    eq([eb.minerals, eb.gas, b.race, b.faction, b.scale, b.units.length, b.name], [ea.minerals, ea.gas, a.race, a.faction, a.scale, a.units.length, a.name]);
    const key = l => l.units.map(u => JSON.stringify([u.id, u.n, [...u.up].sort()])).sort();
    eq(key(b), key(a), 'units (export groups by slot, so order may differ)');
    eq([...b.cards].sort(), [...a.cards].sort());
  });
  test(`share link round trip: ${x.name}`, () => {
    const a = ref(x.name), b = E.decodeShare(E.encodeShare(a));
    eq(E.evaluate(b).minerals, E.evaluate(a).minerals);
    eq(b.units.map(u => [u.id, u.n, u.up]), a.units.map(u => [u.id, u.n, u.up]));
  });
});
// ── NewRecruit text format ──
const armada = () => ref('The Golden Armada');
test('NewRecruit export: Golden Armada', () => {
  eq(E.toNewRecruit(armada()).split('\n'), [
    'Protoss - The Golden Armada (2000 Minerals, 200 Gas)',   // NewRecruit's order: Race - List name
    '13 Supply, 0 CP',
    '',
    'Deployment Maps',
    'Mission Card',
    '',
    '# Faction:',
    'Khalai',
    '',
    '# Tactical:',
    'Gateway', 'Observer', 'Robotics Facility', 'Templar Archives', 'Twilight Council', 'Warp Prism',
    '',
    '# Units:',
    '4x Adepts (210, 1S): Resonating Glaives, Guidance, Glaive Strike',
    '3x Zealots (200, 2S): My Life for Aiur, Leg Enhancements',
    '3x Zealots (210, 2S): My Life for Aiur, Leg Enhancements, Zealous Round',
    '',
    'Immortal (300, 2S): Shield Overcharge',
    '2x Stalkers (340, 2S): Path of Shadows, Fury of the Nerazim',
    'Stalker (180, 1S): Path of Shadows',
    '',
    '2x High Templar (150, 1S): Psionic Storm',
    '2x Sentries (140, 1S): Solid-Field Projector',   // NewRecruit's spelling
    '',
    'Artanis (270, 1S)',
    '',
    '',
    'Created with newrecruit.eu v37.7',   // the Tabletop Simulator importer needs this exact line
  ]);
});
test('NewRecruit export: one line per card copy, and a Creep section', () => {
  const t = E.toNewRecruit(list('zerg', 'ks', 'standard', [['zergling', 12]], ['creep-malignant', 'pool', 'pool']));
  ok(t.includes('# Tactical:\nSpawning Pool\nSpawning Pool\n\n# Creep:\nMalignant Creep\n'), t);
});
test('NewRecruit import: the real newrecruit.eu export of the Golden Armada', () => {
  const pasted = `Protoss - Protoss (2000 Minerals, 200 Gas)
13 Supply, 0 CP

Deployment Maps
Mission Card

# Faction:
Khalai

# Tactical:
Gateway
Observer
Robotics Facility
Templar Archives
Twilight Council
Warp Prism

# Units:
4x Adepts (210, 1S): Guidance, Resonating Glaives, Glaive Strike
3x Zealots (200, 2S): My Life for Aiur, Leg Enhancements
3x Zealots (210, 2S): My Life for Aiur, Zealous Round, Leg Enhancements

Immortal (300, 2S): Shield Overcharge
2x Stalkers (340, 2S): Fury of the Nerazim, Path of Shadows
Stalker (180, 1S): Path of Shadows

High Templar (150, 1S): Psionic Storm
2x Sentries (140, 1S): Solid-Field Projector

Artanis (270, 1S)


Created with newrecruit.eu v37.7`;
  const l = E.fromText(pasted), ev = E.evaluate(l);
  eq([l.name, l.race, l.faction, l.scale], ['Protoss', 'protoss', 'khalai', 'standard']);
  eq(errs(ev), []);
  eq([ev.minerals, ev.gas, ev.entries.length], [2000, 200, 9]);
  eq(l.units.find(u => u.id === 'hightemplar').n, 2, 'High Templar size taken from its cost');
  eq(l.units.find(u => u.id === 'sentry').up, ['Solid-Field Projectors'], 'singular name still matches');
  const key = x => x.units.map(u => JSON.stringify([u.id, u.n, [...u.up].sort()])).sort();
  eq(key(l), key(armada()), 'same units as the built-in Golden Armada');
});
test('NewRecruit: variants carry their base unit, as on the card title', () => {
  const t = E.toNewRecruit(list('zerg', 'ks', 'standard', [['ksraptor', 6]], []));
  ok(t.includes('\n# Tactical:\n\n# Units:\n6x Kerrigan Swarm Raptors (Zergling) (230, 1S)\n'), t);
  const p = E.toNewRecruit(list('protoss', 'khalai', 'standard', [['praetor', 3], ['zealot', 3]], []));
  ok(p.includes('3x Zealots (170, 2S)\n\n3x Praetor Guard (Zealot) (260, 2S)'), p);
  ok(E.toNewRecruit(list('terran', 'nco', 'standard', [['nova-stealth', 1]], [])).includes('\nNova (240, 1S): Stealth Mode\n'), 'Nova as NewRecruit writes it');
});
test('NewRecruit import: the real export of Kerrigan Swarm Raptors', () => {
  const l = E.fromText(`Zerg - Zerg (230 Minerals, 0 Gas)
1 Supply, 0 CP

Deployment Maps
Mission Card

# Faction:
Kerrigan's Swarm

# Tactical:

# Units:
6x Kerrigan Swarm Raptors (Zergling) (230, 1S)


Created with newrecruit.eu v37.7`);
  eq([l.race, l.faction, l.scale], ['zerg', 'ks', 'skirmish']);
  eq(l.units.map(u => [u.id, u.n]), [['ksraptor', 6]]);
  eq(E.evaluate(l).minerals, 230);
  const n = E.fromText('Terran - Terran (240 Minerals, 0 Gas)\n\n# Faction:\nNova Covert Ops\n\n# Units:\nNova (Stealth Mode) (240, 1S)\n');
  eq(n.units.map(u => u.id), ['nova-stealth'], "Nova's own brackets still match");
});
// The Tabletop Simulator importer's line rules (StarCraft roster importer v22, convertNewRecruitText),
// minus its catalogue lookups: section headings, the title/totals lines, no quantity on card lines,
// "N x Name (cost, NS): options" on unit lines, and Nova written as "Nova: <mode>".
function ttsCheck(text) {
  const headings = { faction: 1, factions: 1, tactical: 1, tactics: 1, 'tactical cards': 1, creep: 1, units: 1,
    'pre-game': 0, 'deployment maps': 0, deployments: 0, deployment: 0, 'mission card': 0, 'mission cards': 0, missions: 0, mission: 0 };
  const entry = line => {
    let name = line, details = null;
    if (line.endsWith(')')) {
      const at = line.lastIndexOf('(');
      if (at >= 0) { const suf = line.slice(at + 1, -1).trim(); if (/^[+\d]/.test(suf)) { name = line.slice(0, at).trim(); details = suf; } }
    }
    let supply = null, cost = null;
    if (details) {
      cost = Number((details.match(/^\+?(\d+)/) || [])[1]);
      details.split(',').forEach(p => { const v = p.trim().toLowerCase().match(/^(\d+)\s*s$|^(\d+)\s+supply$/); if (v) supply = Number(v[1] || v[2]); });
    }
    const cm = name.match(/^(\d+)\s*[xX]\s+(.+)$/);
    return cm ? { name: cm[2].trim(), count: Number(cm[1]), supply, cost } : { name, count: null, supply, cost };
  };
  const problems = [];
  let section = null, n = 0, sawFooter = false, units = 0;
  for (const raw of text.split('\n')) {
    n++;
    const line = raw.trim(), folded = line.toLowerCase();
    if (folded.startsWith('created with newrecruit.eu')) { sawFooter = true; break; }
    if (!line) continue;
    let heading = folded.replace(/^#+/, '').trim();
    if (heading.endsWith(':')) heading = heading.slice(0, -1).trim();
    const colon = folded.indexOf(':'), before = colon >= 0 ? folded.slice(0, colon).trim() : null;
    if (heading in headings) { section = headings[heading] ? heading.replace(/s$/, '') : 'skip'; continue; }
    if (before && headings[before] === 0) { section = 'skip'; continue; }
    if (line.startsWith('#')) { problems.push(`${n}: unsupported section ${line}`); continue; }
    if (section === 'skip') continue;
    if (!section) { if (!((folded.includes('minerals') && folded.includes('gas')) || /^\d+\s+supply/.test(folded))) problems.push(`${n}: expected a heading`); continue; }
    if (section === 'unit') {
      const split = line.indexOf(':');
      const head = split >= 0 ? line.slice(0, split) : line, opts = split >= 0 ? line.slice(split + 1).split(',').map(o => o.trim()) : [];
      const e = entry(head.trim());
      if (e.supply == null || e.cost == null) problems.push(`${n}: unit without (cost, Supply): ${line}`);
      if (/^nova/i.test(e.name) && !(e.name === 'Nova' && opts.some(o => /^(stealth|assault) mode$/i.test(o)))) problems.push(`${n}: Nova must be "Nova: <mode>"`);
      opts.forEach(o => { if (!o || entry(o).count) problems.push(`${n}: bad option "${o}"`); });
      units++;
    } else if (entry(line).count) problems.push(`${n}: unsupported card quantity: ${line}`);
  }
  if (!sawFooter) problems.push('missing "Created with newrecruit.eu" footer');
  if (!units) problems.push('no units');
  return problems;
}
REFERENCE.forEach(x => test(`Tabletop Simulator importer accepts: ${x.name}`, () => eq(ttsCheck(E.toNewRecruit(ref(x.name))), [])));
test('Tabletop Simulator importer accepts duplicate cards, Nova and Zerg creep', () => {
  eq(ttsCheck(E.toNewRecruit(list('terran', 'nco', 'standard', [['nova-assault', 1], ['siegetank', 1, ['Mode Transformation']]], ['factory', 'factory', 'supplydepot']))), []);
  eq(ttsCheck(E.toNewRecruit(list('zerg', 'ks', 'standard', [['zergling', 12]], ['creep-malignant', 'pool', 'pool']))), []);
  ok(ttsCheck('X - Terran (1 Minerals, 0 Gas)\n# Tactical:\n2x Factory\n# Units:\nMarine (1, 1S)\nCreated with newrecruit.eu').some(p => /card quantity/.test(p)), 'the check itself catches "2x" cards');
});
test('NewRecruit import: v37.8 export — headings without #, Creep card and Omega Worm under Units', () => {
  const l = E.fromText(`Zerg - Zerg 2K (2000 Minerals, 205 Gas)
13 Supply, 0 CP

Deployment Maps
Mission Card

Faction:
Kerrigan's Swarm

Tactical:
Cocoon
Evolution Chamber
Hydralisk Den
Overseer
Roach Warren
Spawning Pool
Spawning Pool (Six Pool)

Units:
Reactive Creep

2x Ravagers (310, 2S): Potent Bile
Roaches (200, 1S): Roach, Tunneling Claws, Glial Reconstitution, Hydriodic Bile
18x Zerglings (240, 2S): Adrenal Glands, Shredding Claws

4x Hydralisks (330, 3S): Ancillary Carapace, Lurking, Grooved Spines
6x Kerrigan Swarm Raptors (Zergling) (230, 1S)
18x Raptors (Zergling) (290, 2S): Adrenal Glands, Shredding Claws

Queen (150, 1S): Domineering Presence

Kerrigan (250, 1S)

Omega Worm


Created with newrecruit.eu v37.8`);
  eq([l.name, l.race, l.faction, l.scale], ['Zerg 2K', 'zerg', 'ks', 'standard']);
  eq([...l.cards].sort(), ['cocoon', 'creep-reactive', 'evo', 'hydraden', 'overseer', 'pool', 'sixpool', 'warren']);
  eq(l.units.map(u => [u.id, u.n]), [['ravager', 2], ['roach', 3], ['zergling', 18], ['hydralisk', 4], ['ksraptor', 6], ['raptor', 18], ['queen', 1], ['kerrigan', 1]]);
  const ev = E.evaluate(l);
  eq([ev.minerals, ev.gas, E.toNewRecruit(l).split('\n')[1]], [2000, 205, '13 Supply, 0 CP'], 'same totals as NewRecruit');
  eq(errs(ev).map(m => m.replace(/ — .*/, '')), ['5 Gas over the 200 limit (Gas is 10% of the Mineral limit).',
    "Reactive Creep needs the Zagara's Swarm faction card.", '1 Elite slot short']);
});
test('NewRecruit import: older exports with "List name - Race" still read', () => {
  const l = E.fromText('Siege Line - Terran (280 Minerals, 0 Gas)\n\n# Faction:\nTerran Armed Forces\n\n# Units:\nSiege Tank (280, 2S): Mode Transformation, Coordinated Strike, Shaped Blast, Smart Shells\n\n\nCreated with newrecruit.eu v37.7');
  eq([l.name, l.race, l.units.map(u => u.id)], ['Siege Line', 'terran', ['siegetank']]);
});
test('NewRecruit import: Nova written as "Nova: <mode>"', () => {
  const l = E.fromText('Terran - Terran (500 Minerals, 0 Gas)\n\n# Faction:\nNova Covert Ops\n\n# Tactical:\nSupply Depot\nSupply Depot\n\n# Units:\nNova (260, 1S): Assault Mode\n\n\nCreated with newrecruit.eu v37.7');
  eq(l.units.map(u => [u.id, u.up]), [['nova-assault', []]]);
  eq(l.cards, ['supplydepot', 'supplydepot']);
});
REFERENCE.forEach(x => test(`NewRecruit round trip: ${x.name}`, () => {
  const a = ref(x.name), b = E.fromText(E.toNewRecruit(a));
  const key = l => l.units.map(u => JSON.stringify([u.id, u.n, [...u.up].sort()])).sort();
  eq([b.name, b.race, b.faction, b.scale, [...b.cards].sort()], [a.name, a.race, a.faction, a.scale, [...a.cards].sort()]);
  eq(key(b), key(a));
}));

test('text import tolerates loose formatting', () => {
  const l = E.fromText(`Quick list\nRaynor's Raiders skirmish\n- 9x Marines\n  + combat shield, Bayonet\n- Jim Raynor\n- Barracks x2`);
  eq([l.race, l.faction, l.scale], ['terran', 'rr', 'skirmish']);
  eq(l.units.map(u => [u.id, u.n, u.up]), [['marine', 9, ['Combat Shield', 'Bayonet']], ['raynor', 1, []]]);
  eq(l.cards, ['barracks', 'barracks']);
});

// ── data integrity ──
test('data: ids unique', () => {
  for (const k of ['units', 'factions', 'cards']) {
    const ids = GAME[k].map(x => x.id);
    eq(ids.length, new Set(ids).size, `${k} ids`);
  }
});
test('data: weapons, sizes, upgrades and references are well-formed', () => {
  const problems = [];
  GAME.units.forEach(u => {
    if (!u.summoned && !E.SLOTS.includes(u.slot)) problems.push(`${u.id}: bad slot`);
    if (!GAME.races[u.race]) problems.push(`${u.id}: bad race`);
    u.sizes.forEach(s => { if (s.length !== 3 || s.some(v => typeof v !== 'number')) problems.push(`${u.id}: bad size ${s}`); });
    const names = [];
    [...u.weapons, ...(u.upgrades || []).filter(x => x.w).map(x => x.w)].forEach(s => {
      const parts = s.split('|');
      if (parts.length !== 9) problems.push(`${u.id}: weapon needs 9 fields: ${s}`);
      names.push(parts[0].trim());
    });
    (u.upgrades || []).forEach(up => {
      if (Array.isArray(up.c) && up.c.length !== u.sizes.length) problems.push(`${u.id}/${up.n}: cost array length`);
      if (up.rep && !u.weapons.some(w => w.split('|')[0].trim() === up.rep)) problems.push(`${u.id}/${up.n}: replaces unknown ${up.rep}`);
      if (!up.w && !up.d) problems.push(`${u.id}/${up.n}: no weapon or description`);
      (up.fx || []).forEach(f => {
        // an effect on a summoned unit must name one this unit summons, and that unit's weapon
        if (f.unit && !(u.summons || []).includes(f.unit)) problems.push(`${u.id}/${up.n}: fx targets ${f.unit}, which it doesn't summon`);
        const own = f.unit ? (E.units[f.unit] ? E.units[f.unit].weapons.map(s => s.split('|')[0].trim()) : []) : names;
        [].concat(f.w || []).forEach(w => { if (!own.includes(w)) problems.push(`${u.id}/${up.n}: fx on unknown weapon ${w}`); });
      });
    });
    (u.summons || []).forEach(id => { if (!E.units[id] || !E.units[id].summoned) problems.push(`${u.id}: summons unknown ${id}`); });
    u.tags.forEach(t => { if (!GAME.factions.some(f => f.race === u.race && f.tags.includes(t))) problems.push(`${u.id}: tag ${t} on no faction`); });
  });
  GAME.factions.forEach(f => (f.summons || []).forEach(id => { if (!E.units[id]) problems.push(`${f.id}: summons unknown ${id}`); }));
  GAME.cards.forEach(c => Object.keys(c.slots).forEach(t => { if (!E.SLOTS.includes(t)) problems.push(`${c.id}: bad slot ${t}`); }));
  eq(problems, []);
});
test('data: keyword glossary entries are complete', () => {
  const bad = Object.entries(GAME.keywords).filter(([, e]) => e.see ? !GAME.keywords[e.see] || GAME.keywords[e.see].see : !e.d).map(([k]) => k);
  eq(bad, []);
});
test('data: every uppercase keyword in abilities and weapons has a glossary entry', () => {
  const KW = GAME.keywords;
  const re = new RegExp(`\\b(${Object.keys(KW).filter(k => !KW[k].pill).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');
  const texts = [];
  GAME.units.forEach(u => {
    (u.abilities || []).forEach(a => texts.push(a[2]));
    (u.upgrades || []).forEach(x => { if (x.d) texts.push(x.d); if (x.w) texts.push(x.w.split('|')[8]); });
    u.weapons.forEach(w => texts.push(w.split('|')[8]));
  });
  [...GAME.factions, ...GAME.cards].forEach(c => c.abilities.forEach(a => texts.push(a[2])));
  const left = new Set();
  texts.forEach(t => (String(t).replace(re, ' ').match(/\b[A-Z][A-Z-]{2,}(?: [A-Z][A-Z-]{2,})*\b/g) || []).forEach(m => left.add(m)));
  eq([...left], []);
});
test('data: every ability label (kind, cost, once per…) has an explanation', () => {
  const missing = new Set();
  const check = t => { const x = E.timing(t); [x.kind.toUpperCase(), x.cost && x.cost.split(' ').pop(), ...x.extra.map(s => s.toUpperCase())].filter(Boolean).forEach(k => { if (!GAME.keywords[k]) missing.add(k); }); };
  GAME.units.forEach(u => { (u.abilities || []).forEach(a => check(a[1])); (u.upgrades || []).filter(x => x.t).forEach(x => check(x.t)); });
  [...GAME.factions, ...GAME.cards].forEach(c => c.abilities.forEach(a => check(a[1])));
  eq([...missing], []);
});
test('data: unit count matches the reference (44 incl. summoned)', () => {
  // README counts 15 Terran, 17 Zerg (16 + Zagara listed), 13 Protoss = 45 names incl. summoned
  eq(GAME.units.filter(u => u.race === 'terran').length, 15);
  eq(GAME.units.filter(u => u.race === 'zerg').length, 17);
  eq(GAME.units.filter(u => u.race === 'protoss').length, 13);
});

console.log(failures.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
