// Game state and rules that need no screen. Used by the page and by tools/simulate.mjs.
(function () {
  const UF = globalThis.UF, B = UF.B, E = UF.E = {};
  const rnd = E.rnd = n => Math.floor(Math.random() * n);
  E.pick = a => a[rnd(a.length)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  E.newGame = (a, b) => {
    const mk = p => ({ name: p.name, role: p.role, hp: B.hp, ways: p.ways, techs: ['strike', 'guard', 'rally'],
      known: ['strike', 'guard', 'rally'], dmg: 0, rec: {} });
    return { v: 1, day: 1, act: B.actions, at: 'edo', coins: B.coins, P: [mk(a), mk(b)], items: [], herbs: {}, rem: [],
      bless: [], dread: 0, mirth: 0, harmony: 0, flags: {}, seen: [], done: {}, usedQ: [], usedL: [], lead: 0, floor: 0,
      shop: null, help: { fifty: 0, swap: 0 }, finale: false, over: null, fights: 0, shakenN: 0, wins: 0, pts: 0, undos: 0 };
  };

  // ---------- items ----------
  E.def = it => UF.ITEMS[it.b];
  const WHOLE = { heal: 1, healAll: 1, spirit: 1, body: 1, hp: 1 }; // amounts shown and used as whole numbers
  E.vals = it => {
    const v = {}, d = E.def(it);
    for (const k in d.fx) { const x = d.fixed ? d.fx[k] : d.fx[k] * (1 + B.rbonus[it.r]); v[k] = WHOLE[k] ? Math.round(x) : x; }
    return v;
  };
  E.uses = it => 1 + (it.r >= 2 ? 1 : 0) + (it.r >= 4 ? 1 : 0);
  E.itemName = it => B.rarity[it.r] + ' ' + E.def(it).n;
  E.itemText = it => E.def(it).d(E.vals(it), E.uses(it));
  E.satchel = S => S.items.filter(x => x.on);
  E.charm = (S, i, k) => { const it = S.items.find(x => x.who === i); return it && E.def(it).fx[k] ? E.vals(it)[k] : 0; };
  E.maxHp = (S, i) => Math.round(B.hp + E.charm(S, i, 'hp'));
  E.hasWay = (S, i, w) => S.P[i].ways.some(x => x.id === w);
  E.rollItem = (table, shift, S) => {
    const w = B.loot[table]; let x = Math.random() * w.reduce((a, b) => a + b, 0), r = 0;
    while (r < 4 && x >= w[r]) { x -= w[r]; r++; }
    r = Math.min(4, r + (shift || 0));
    // named treasures: one of a kind, never found twice
    const named = Object.keys(UF.ITEMS).filter(k => UF.ITEMS[k].named && UF.ITEMS[k].r === r && !(S && S.items.some(x => x.b === k)));
    if (named.length && Math.random() < B.namedChance) return { b: E.pick(named), r };
    const ids = Object.keys(UF.ITEMS).filter(k => !UF.ITEMS[k].u && !UF.ITEMS[k].named);
    return { b: E.pick(ids), r };
  };
  E.addItem = (S, b, r) => {
    const it = { b, r };
    if (UF.ITEMS[b].t === 'relic') { if (E.satchel(S).length < 4) it.on = true; }
    else { const free = [0, 1].find(i => !S.items.some(x => x.who === i)); if (free !== undefined) it.who = free; }
    S.items.push(it); return it;
  };
  E.helpReset = S => {
    const h = { fifty: 0, swap: 0 };
    E.satchel(S).forEach(it => { const f = E.def(it).fx; if (f.fifty) h.fifty += E.uses(it); if (f.swap) h.swap += E.uses(it); });
    [0, 1].forEach(i => { if (E.hasWay(S, i, 'mind')) h.fifty++; if (E.hasWay(S, i, 'game')) h.swap++; });
    S.help = h;
  };

  // ---------- resolve, herbs, remedies ----------
  E.heal = (S, i, x) => { S.P[i].hp = clamp(S.P[i].hp + x, 0, E.maxHp(S, i)); };
  E.hurt = S => (S.P[0].hp / E.maxHp(S, 0) <= S.P[1].hp / E.maxHp(S, 1) ? 0 : 1);
  E.rest = S => [0, 1].forEach(i => { S.P[i].hp = E.maxHp(S, i); });
  E.useHerb = (S, id) => { if (!S.herbs[id]) return; S.herbs[id]--; E.heal(S, E.hurt(S), B.herbHeal); };
  E.remKey = (a, b) => [a, b].sort().join('+');
  E.brew = (S, a, b) => { S.herbs[a]--; S.herbs[b]--; const k = E.remKey(a, b); S.rem.push(k); return UF.REMEDIES[k]; };
  E.useRemedy = (S, idx, c) => {
    const r = UF.REMEDIES[S.rem[idx]]; S.rem.splice(idx, 1);
    if (r.full) E.rest(S);
    if (r.heal) E.heal(S, E.hurt(S), r.heal);
    if (r.healAll) [0, 1].forEach(i => E.heal(S, i, r.healAll));
    if (r.fifty) S.help.fifty += r.fifty;
    if (c) {
      if (r.boostAll) { c.boost[0] += r.boostAll; c.boost[1] += r.boostAll; }
      if (r.weaken) c.weak = Math.min(c.weak, B.weaken[0]);
      if (r.spirit) UF.C.hit(c, 'spirit', r.spirit);
    }
    return r;
  };

  // ---------- map and clock ----------
  E.dist = (a, b) => {
    if (a === b) return 0;
    const seen = { [a]: 0 }, q = [a];
    while (q.length) {
      const x = q.shift();
      for (const [u, v] of UF.ROADS) {
        const y = u === x ? v : v === x ? u : null;
        if (y && !(y in seen)) { seen[y] = seen[x] + 1; if (y === b) return seen[y]; q.push(y); }
      }
    }
    return 99;
  };
  E.spend = (S, n) => {
    for (let k = 0; k < n; k++) {
      S.act--;
      if (S.act <= 0) { S.day++; S.act = B.actions; S.shop = null; if (S.day > B.days) S.finale = true; }
    }
  };
  // the Courier's Sandals make the first road of each day free
  const freeStep = S => (E.charm(S, 0, 'freeMove') || E.charm(S, 1, 'freeMove')) && S.movedDay !== S.day;
  E.cost = (S, to) => { const d = E.dist(S.at, to); return d > 0 && freeStep(S) ? d - 1 : d; };
  E.travel = (S, to) => { const c = E.cost(S, to); if (to !== S.at) S.movedDay = S.day; E.spend(S, c); S.at = to; };
  E.nearestShrine = S => Object.keys(UF.PLACES).filter(k => UF.PLACES[k].shrine)
    .sort((a, b) => E.dist(S.at, a) - E.dist(S.at, b))[0];
  E.shaken = S => {
    S.at = E.nearestShrine(S); S.shakenN++;
    [0, 1].forEach(i => { S.P[i].hp = Math.ceil(E.maxHp(S, i) / 2); });
    S.coins -= Math.floor(S.coins * B.shakenCoins); E.spend(S, 1);
  };
  E.shop = S => {
    if (!S.shop || S.shop.at !== S.at || S.shop.day !== S.day)
    {
      const stock = [];
      while (stock.length < 4) { const it = E.rollItem('shop', 0, S); if (!stock.some(x => x.b === it.b && UF.ITEMS[it.b].named)) stock.push(it); }
      S.shop = { at: S.at, day: S.day, stock };
    }
    return S.shop;
  };

  // ---------- events ----------
  E.meets = (S, q) => !q || (S.rehearsal && q.coins === undefined) || ((q.coins === undefined || S.coins >= q.coins) && (!q.flag || S.flags[q.flag]) &&
    (!q.dread || S.dread >= q.dread) && (!q.mirth || S.mirth >= q.mirth) &&
    (!q.legend || S.items.filter(x => x.r === 4).length >= q.legend) && (!q.bless || S.bless.length >= q.bless));
  E.pool = (S, slot, place) => Object.values(UF.EV).filter(e => e.slot === slot && e.place === place &&
    !S.seen.includes(e.id) && !S.done[e.id]);
  E.exploreId = S => {
    let p = E.pool(S, 'x', S.at);
    if (!p.length) p = E.pool(S, 'x', UF.PLACES[S.at].shrine ? 'shrine' : 'road');
    if (!p.length) p = E.pool(S, 'x', 'road');
    if (!p.length) { S.seen = S.seen.filter(id => UF.EV[id].place !== 'road'); p = E.pool(S, 'x', 'road'); }
    return E.pick(p).id;
  };
  E.talkId = S => {
    let p = E.pool(S, 'talk', S.at);
    if (!p.length) { S.seen = S.seen.filter(id => !(UF.EV[id].slot === 'talk' && UF.EV[id].place === S.at)); p = E.pool(S, 'talk', S.at); }
    return E.pick(p).id;
  };
  E.quests = S => Object.values(UF.EV).filter(e => e.slot === 'quest' && e.place === S.at && !S.done[e.id]);
  E.kamiId = S => { const b = UF.PLACES[S.at].bless; return b && !S.bless.includes(b) ? 'kami_' + b : null; };
  E.floorId = S => (S.floor >= 4 ? 'finale' : 'fuji' + (S.floor + 1));

  E.applyFx = (S, fx) => {
    const g = []; if (!fx) return g;
    if (fx.coins) {
      let c = fx.coins;
      if (c > 0) c = Math.round(c * (1 + 0.25 * [0, 1].filter(i => E.hasWay(S, i, 'stage')).length) * (1 + E.charm(S, 0, 'coin') + E.charm(S, 1, 'coin')));
      c = Math.max(c, -S.coins); S.coins += c; if (c) g.push((c > 0 ? '+' : '') + c + ' coins');
    }
    if (fx.hp) {
      [0, 1].forEach(i => { S.P[i].hp = clamp(S.P[i].hp + fx.hp, 1, E.maxHp(S, i)); });
      g.push((fx.hp > 0 ? '+' : '') + fx.hp + ' Resolve each');
    }
    if (fx.herb) { const [h, n] = fx.herb; S.herbs[h] = (S.herbs[h] || 0) + n; g.push('+' + n + ' ' + UF.HERBS[h].n); }
    if (fx.loot) { const r = E.rollItem(fx.loot, fx.shift, S); g.push('Found: ' + E.itemName(E.addItem(S, r.b, r.r))); }
    if (fx.item) {
      const [b, r] = Array.isArray(fx.item) ? fx.item : [fx.item, UF.ITEMS[fx.item].r];
      g.push('Received: ' + E.itemName(E.addItem(S, b, r)));
    }
    if (fx.dread) { S.dread += fx.dread; g.push('The night feels closer.'); }
    if (fx.mirth) { S.mirth += fx.mirth; g.push('You are still smiling.'); }
    if (fx.harmony) { S.harmony += fx.harmony; g.push('The spirits take note.'); }
    if (fx.flag) S.flags[fx.flag] = 1;
    if (fx.bless && !S.bless.includes(fx.bless)) {
      S.bless.push(fx.bless);
      const learn = id => S.P.forEach(p => { if (!p.known.includes(id)) p.known.push(id); });
      learn(fx.bless); g.push(UF.BLESS[fx.bless].n + ': a new technique for each of you');
      for (const id in UF.TECHS) {
        const t = UF.TECHS[id];
        if (t.need && t.need.every(b => S.bless.includes(b)) && !S.P[0].known.includes(id)) {
          learn(id); g.push('Two blessings join: ' + t.n[0] + ' and ' + t.n[1]);
        }
      }
      g.push('Visit a shrine to take up new techniques.');
    }
    if (fx.done) S.done[fx.done] = 1;
    if (fx.floor) S.floor = Math.max(S.floor, fx.floor);
    if (fx.act) { E.spend(S, fx.act); g.push('It costs you ' + (fx.act === 1 ? 'an extra action' : fx.act + ' extra actions') + '.'); }
    return g;
  };

  // ---------- renown: the score a finished journey is remembered by ----------
  E.ENDPTS = { kami: 500, calming: 450, festival: 450, sealing: 350, bargain: 250, sleep: 120 };
  E.score = S => {
    const quests = Object.keys(S.done).length, tre = S.items.reduce((a, x) => a + 5 * (x.r + 1), 0);
    const lines = [['Ending: ' + UF.ENDINGS[S.over].t, E.ENDPTS[S.over] || 0], [`Blessings (${S.bless.length})`, 40 * S.bless.length],
      ['Right answers, harder ones count more', S.pts || 0], [`Fights won (${S.wins || 0})`, 10 * (S.wins || 0)],
      [`Quests finished (${quests})`, 30 * quests], ['Harmony with the spirits', 5 * S.harmony],
      [`Treasures (${S.items.length}), by rarity`, tre], [`Times shaken (${S.shakenN})`, -25 * S.shakenN]];
    return { total: Math.max(0, lines.reduce((a, l) => a + l[1], 0)), lines };
  };

  E.fightEnding = (S, won) => (won && S.bless.length >= B.sealNeeds ? 'sealing' : 'sleep');

  // After a fight: rewards on a win, the shrine on a loss. Returns lines to show.
  E.afterFight = (S, c) => {
    S.fights++;
    if (c.result === 'lose') { if (!c.d.boss) E.shaken(S); return []; }
    S.P.forEach((p, i) => { if (p.hp <= 0) p.hp = Math.min(B.reviveHp, E.maxHp(S, i)); else p.hp = Math.ceil(p.hp); });
    if (c.result === 'win' || c.result === 'finish') S.wins = (S.wins || 0) + 1;
    if (c.result === 'flee' || c.d.boss) return [];
    const fx = { coins: B.tierCoins[c.d.tier] + rnd(4) };
    if (c.result === 'finish') { fx.loot = c.d.tier > 1 ? 'danger' : 'road'; fx.harmony = 1; }
    else if (Math.random() < B.tierLoot[c.d.tier]) fx.loot = c.d.tier > 2 ? 'danger' : 'road';
    return E.applyFx(S, fx);
  };

  // One event from first text to last outcome. io supplies the screen (or the simulator's dice).
  // io.choose(ev, opts) -> index, io.test(test, ev) -> bool, io.fight(id) -> 'win'|'finish'|'lose'|'flee', io.show(ev, text, gains)
  E.runEvent = async (S, id, io, chained) => {
    const ev = UF.EV[id];
    if (!S.seen.includes(id)) S.seen.push(id);
    E.helpReset(S);
    const opts = ev.c.map(c => ({ c, ok: E.meets(S, c[6]) }));
    const ch = ev.c[await io.choose(ev, opts)], t = ch[1];
    let pass = true, res = null;
    if (t) { if (t.fight) { res = await io.fight(t.fight); pass = res === 'win' || res === 'finish'; } else pass = await io.test(t, ev); }
    let text = pass ? ch[2] : ch[4], fx = (pass ? ch[3] : ch[5]) || {};
    if (res === 'lose' && !ev.finale) { text = 'You come to under the gate of the nearest shrine, with a priest fanning you and your purse a little lighter. The road is still there. So are you.'; fx = { free: 1 }; }
    if (res === 'flee') { text = 'You withdraw, and it lets you go.'; fx = {}; }
    const gains = E.applyFx(S, fx);
    if (text || gains.length) await io.show(ev, text, gains);
    let lost = res === 'lose';
    if (fx.fight) { const r = await io.fight(fx.fight); lost = r === 'lose'; if (lost) await io.show(ev, 'You come to under the gate of the nearest shrine. The road is still there. So are you.', []); }
    if (fx.finalFight) { const r = await io.fight('iwanaga'); S.over = E.fightEnding(S, r === 'win'); return; }
    if (fx.end) { S.over = fx.end === 'fight' ? E.fightEnding(S, pass) : fx.end; return; }
    if (!fx.free && !chained && !(res === 'lose')) E.spend(S, 1);
    if (fx.next && !lost) return E.runEvent(S, fx.next, io, true);
  };

  // chance the simulator gives a test, from a player's plain four-choice hit rate p
  E.simP = (p, t) => {
    const k = clamp((p - 0.25) / 0.75, 0, 1); let x = p;
    if (t.m === 'b') x = k + (1 - k) / 2; else if (t.m === 't') x = k * 0.75;
    if (t.d) x -= 0.15 * t.d; if (t.lore) x += 0.05;
    return clamp(x, 0.05, 0.98);
  };
  E.simTest = (p, t) => {
    if (t.wait) return Math.random() < 0.85;
    let right = 0, wrong = 0; const n = t.n || 1, lives = t.lives || 1, x = E.simP(p, t);
    while (right < n && wrong < lives) { if (Math.random() < x) right++; else wrong++; }
    return right >= n;
  };
})();
