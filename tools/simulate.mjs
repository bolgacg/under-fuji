// Plays many automatic games to check the balance numbers in data/balance.js.
// Usage: node tools/simulate.mjs [games per accuracy, default 2000]
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['data/balance.js', 'data/world.js', 'data/events.js', 'data/lore_questions.js', 'js/engine.js', 'js/combat.js'])
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const { UF } = globalThis, { E, C, B } = UF;
const N = +process.argv[2] || 2000;
const R = Math.random, power = t => (t.own || 0) + (t.other || 0) + (t.combo || 0) / 2 + (t.healAll || 0);

function gear(S) {
  S.P.forEach((p, i) => {
    const atk = p.known.filter(k => power(UF.TECHS[k]) > 0).sort((a, b) => power(UF.TECHS[b]) - power(UF.TECHS[a]));
    p.techs = atk.slice(0, 2).concat(i === 0 ? 'guard' : 'rally').slice(0, 3);
    if (p.techs.length < 3) p.techs.push(i === 0 ? 'rally' : 'guard');
  });
  const charms = S.items.filter(x => E.def(x).t === 'charm').sort((a, b) => b.r - a.r);
  charms.forEach((c, k) => { c.who = k < 2 ? k : undefined; });
  const relics = S.items.filter(x => E.def(x).t === 'relic').sort((a, b) => b.r - a.r);
  relics.forEach((c, k) => { c.on = k < 4; });
  const hs = Object.keys(S.herbs).filter(h => S.herbs[h] > 0);
  while (hs.filter(h => S.herbs[h] > 0).length >= 2) { const [a, b] = hs.filter(h => S.herbs[h] > 0); E.brew(S, a, b); }
}
const hurt = (S, f) => S.P.some((p, i) => p.hp < E.maxHp(S, i) * f);

async function game(p, over, st) {
  const S = E.newGame({ name: 'R', role: 'ronin', ways: [{ id: 'chronicle', d: 1 }, { id: 'earth', d: 1 }] },
    { name: 'T', role: 'talker', ways: [{ id: 'brush', d: 1 }, { id: 'stage', d: 1 }] });
  const io = {
    show: async () => {},
    test: async t => E.simTest(p, t),
    choose: async (ev, opts) => {
      let ok = opts.map((o, k) => k).filter(k => opts[k].ok);
      if (ev.finale) {
        const names = ['fight', 'calming', 'bargain', 'festival', 'kami'];
        ok.forEach(k => { st.avail[names[k]] = (st.avail[names[k]] || 0) + 1; });
        const alt = ok.filter(k => k > 0); return alt.length && R() < 0.7 ? E.pick(alt) : 0;
      }
      const real = ok.filter(k => !(opts[k].c[3] && opts[k].c[3].free && !opts[k].c[1]));
      return E.pick(real.length && R() < 0.9 ? real : ok);
    },
    fight: async id => {
      const c = C.start(S, id);
      while (!c.result) {
        if (hurt(S, 0.4)) {
          if (S.rem.length) E.useRemedy(S, 0, c);
          const it = E.satchel(S).find(x => !c.used[S.items.indexOf(x)] && (E.def(x).fx.heal || E.def(x).fx.healAll || E.def(x).fx.block));
          if (it) C.useItem(S, c, it);
        }
        if (c.round === 1) E.satchel(S).filter(x => C.activeRelic(x) && (E.def(x).fx.body || E.def(x).fx.spirit || E.def(x).fx.boostAll)).forEach(x => C.useItem(S, c, x));
        for (const i of [0, 1]) {
          if (c.result || c.acted[i] || S.P[i].hp <= 0) continue;
          if (C.canFinish(S, c, i) && R() < 0.6) { C.finish(S, c, i, R() < E.simP(p, { d: E.hasWay(S, i, 'chronicle') ? 0 : 1 })); continue; }
          const techs = S.P[i].techs, atk = techs.filter(k => power(UF.TECHS[k]) > 0);
          const tid = R() < 0.8 ? E.pick(atk) : E.pick(techs);
          let mode = 'steady', pr = p;
          if (over && R() < 0.3) { if (R() < 0.6) { mode = 'bold'; pr = E.simP(p, { d: 1 }); } else { mode = 'blind'; pr = E.simP(p, { m: 't' }); } }
          C.act(S, c, i, tid, mode, R() < pr);
        }
      }
      const T = st.tier[c.d.boss ? 4 : c.d.tier] = st.tier[c.d.boss ? 4 : c.d.tier] || { n: 0, rounds: 0, lose: 0, fin: 0 };
      T.n++; T.rounds += c.round; if (c.result === 'lose') T.lose++; if (c.result === 'finish') T.fin++;
      E.afterFight(S, c); return c.result;
    },
  };
  let guard = 0;
  while (!S.over && guard++ < 400) {
    if (S.finale) { st.finaleDay.push(S.day); await E.runEvent(S, 'finale', io); continue; }
    const pl = UF.PLACES[S.at];
    if (pl.shrine) { gear(S); if (hurt(S, 0.6)) { E.rest(S); E.spend(S, 1); continue; } }
    if (hurt(S, 0.5) && S.rem.length) E.useRemedy(S, 0, null);
    const opts = [];
    const kami = E.kamiId(S); if (kami) opts.push([5, () => E.runEvent(S, kami, io)]);
    E.quests(S).forEach(q => opts.push([2, () => E.runEvent(S, q.id, io)]));
    opts.push([3, () => E.runEvent(S, E.exploreId(S), io)]);
    if (pl.market) opts.push([2, () => E.runEvent(S, E.talkId(S), io)]);
    if (pl.herb) opts.push([1, async () => { S.herbs[pl.herb] = (S.herbs[pl.herb] || 0) + (R() < p ? 2 : 1); E.spend(S, 1); }]);
    if (S.at === 'fuji') opts.push([S.day >= 8 ? 5 : 1, () => E.runEvent(S, E.floorId(S), io)]);
    opts.push([hurt(S, 0.5) ? 8 : 3, async () => {
      const ks = Object.keys(UF.PLACES).filter(k => k !== S.at);
      const want = hurt(S, 0.5) ? [E.nearestShrine(S)] : ks.filter(k => UF.PLACES[k].bless && !S.bless.includes(UF.PLACES[k].bless));
      E.travel(S, want.length && R() < 0.7 ? E.pick(want) : E.pick(ks));
      if (S.at === pl) E.spend(S, 1);
    }]);
    let x = R() * opts.reduce((a, o) => a + o[0], 0), k = 0;
    while (x >= opts[k][0]) { x -= opts[k][0]; k++; }
    await opts[k][1]();
  }
  st.end[S.over] = (st.end[S.over] || 0) + 1;
  st.bless += S.bless.length; st.shaken += S.shakenN; st.fights += S.fights; st.coins += S.coins;
  st.dread += S.dread; st.mirth += S.mirth; st.harmony += S.harmony; st.items += S.items.length;
  st.legend += S.items.filter(x => x.r === 4).length;
  st.dmg[0] += S.P[0].dmg; st.dmg[1] += S.P[1].dmg;
}

const pct = (a, b) => (b ? (100 * a / b).toFixed(0) + '%' : '-');
for (const over of [false, true]) for (const p of [0.5, 0.7, 0.9]) {
  const st = { tier: {}, end: {}, avail: {}, finaleDay: [], bless: 0, shaken: 0, fights: 0, coins: 0, dread: 0, mirth: 0, harmony: 0, items: 0, legend: 0, dmg: [0, 0] };
  for (let g = 0; g < N; g++) await game(p, over, st);
  console.log(`\n=== ${Math.round(p * 100)}% right, ${over ? 'with overcharge' : 'steady only'}, ${N} games ===`);
  for (const t of [1, 2, 3, 4]) { const T = st.tier[t]; if (T) console.log(`  ${t === 4 ? 'last enemy' : 'tier ' + t}: ${(T.rounds / T.n).toFixed(1)} rounds, lost ${pct(T.lose, T.n)}, finisher ${pct(T.fin, T.n)}, ${(T.n / N).toFixed(1)} fights per game`); }
  console.log(`  per game: ${(st.fights / N).toFixed(1)} fights, ${(st.shaken / N).toFixed(2)} shrine wake-ups, ${(st.bless / N).toFixed(1)} blessings, ${(st.items / N).toFixed(1)} items (${(st.legend / N).toFixed(2)} Legendary), ${(st.coins / N).toFixed(0)} coins left`);
  console.log(`  counters: dread ${(st.dread / N).toFixed(1)}, mirth ${(st.mirth / N).toFixed(1)}, harmony ${(st.harmony / N).toFixed(1)}`);
  console.log(`  damage share: Ronin ${pct(st.dmg[0], st.dmg[0] + st.dmg[1])}, Spirit-Talker ${pct(st.dmg[1], st.dmg[0] + st.dmg[1])}`);
  console.log('  ending open at the finale: ' + Object.entries(st.avail).map(([k, v]) => `${k} ${pct(v, N)}`).join(', '));
  console.log('  ending reached: ' + Object.entries(st.end).map(([k, v]) => `${k} ${pct(v, N)}`).join(', '));
}
