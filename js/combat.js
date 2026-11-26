// Fights. Every enemy has a Body bar and a Spirit bar. The Ronin cuts Body, the Spirit-Talker cuts Spirit.
// All damage is whole numbers. Damage beyond an empty bar spills into the other bar at half strength.
(function () {
  const UF = globalThis.UF, B = UF.B, E = UF.E, C = UF.C = {};
  const ownBar = C.ownBar = role => (role === 'ronin' ? 'body' : 'spirit');
  const other = b => (b === 'body' ? 'spirit' : 'body');
  const NAME = { body: 'Body', spirit: 'Spirit' };
  const larger = c => (c.body >= c.spirit ? 'body' : 'spirit');

  C.start = (S, id) => {
    const d = UF.ENEMIES[id], k = 1 + B.dayScale * (S.day - 1) * (d.boss ? 0 : 1);
    const m = d.boss ? 1 - B.bossBless * S.bless.length : 1;
    const body = Math.round(d.body * k * m), spirit = Math.round(d.spirit * k * m);
    E.helpReset(S);
    return { id, d, body, spirit, mb: body, ms: spirit, atk: d.atk * k, target: E.rnd(2), weak: 1, guardBy: null, guardM: 1,
      block: false, bounce: false, boost: [0, 0], acted: [false, false], right: [false, false], spare: [0, 0], streak: [0, 0],
      used: {}, round: 1, log: [], result: null, spill: 0 };
  };

  // Damage a bar. What is left over spills into the other bar at half strength. c.spill holds the spilled part.
  C.hit = (c, b, x) => {
    x = Math.max(0, Math.round(x));
    const a = Math.min(c[b], x); c[b] -= a;
    const o = other(b), s = Math.min(c[o], Math.round((x - a) * 0.5)); c[o] -= s; c.spill = s;
    return a + s;
  };
  const done = c => c.body <= 0 && c.spirit <= 0;
  const won = c => { c.body = c.spirit = 0; c.result = 'win'; return c; };

  // mode: 'steady' | 'bold' | 'blind'. ok: was the answer right.
  C.act = (S, c, i, tid, mode, ok) => {
    const p = S.P[i], t = UF.TECHS[tid], own = ownBar(p.role), name = t.n[p.role === 'ronin' ? 0 : 1], said = [];
    const answered = ok;
    if (!ok && E.charm(S, i, 'freeMiss') && !c.spare[i]) { c.spare[i] = 1; ok = true; said.push('the Daruma rights itself and it counts'); }
    let m;
    if (mode === 'steady') m = ok ? 1 : Math.max(0, B.wrong + E.charm(S, i, 'wrong'));
    else m = ok ? B[mode] + E.charm(S, i, mode === 'bold' ? 'boldAdd' : 'blindAdd') : E.charm(S, i, 'safety');
    let dealt = 0;
    if (t.own || t.other) {
      const low = p.hp < E.maxHp(S, i) / 2 ? E.charm(S, i, 'lowHp') : 0;
      const k = m * (1 + E.charm(S, i, 'dmg') + low + E.charm(S, i, 'streak') * c.streak[i]) * (1 + c.boost[i]);
      const combo = !!(t.combo && ok && c.right[1 - i]);
      const base = (t.own || 0) + (combo ? t.combo : 0);
      let spilled = 0;
      if (base) { dealt += C.hit(c, own, base * k); spilled = c.spill; }
      const oth = (t.other || 0) * k + base * k * E.charm(S, i, 'cleave');
      if (oth > 0) dealt += C.hit(c, other(own), oth);
      if (m > 0) c.boost[i] = 0;
      said.push(dealt ? dealt + ' damage' + (combo ? ` (+${t.combo} for ${S.P[1 - i].name}'s right answer)` : '') +
        (spilled ? `, ${spilled} of it spilling into ${NAME[other(own)]}` : '') : 'no damage');
    }
    if (m > 0) {
      if (t.healAll) { [0, 1].forEach(j => { if (S.P[j].hp > 0) E.heal(S, j, Math.max(1, Math.round(t.healAll * m))); }); said.push('you both mend'); }
      if (t.weaken) { c.weak = Math.min(c.weak, ok ? B.weaken[0] : B.weaken[1]); said.push('its next blow is weakened'); }
      if (t.guard) { c.guardBy = i; c.guardM = mode === 'steady' ? B.guard.steady[ok ? 0 : 1] : ok ? B.guard[mode] : 0.7; said.push('the next blow is turned'); }
      if (t.boost) {
        const b = (mode === 'steady' ? B.boost.steady[ok ? 0 : 1] : ok ? B.boost[mode] : 0.2) * (E.hasWay(S, i, 'brush') ? 1.25 : 1);
        c.boost[1 - i] += b; said.push(S.P[1 - i].name + "'s next strike +" + Math.round(b * 100) + '%');
      }
    } else if (!t.own && !t.other) said.push('it fizzles');
    if (ok) { const j = 1 - i, h = E.charm(S, j, 'partnerHeal'); if (h && S.P[j].hp > 0) E.heal(S, j, h); }
    c.streak[i] = ok ? c.streak[i] + 1 : 0;
    p.dmg += dealt; c.acted[i] = true; c.right[i] = ok; // c.right keeps each player's latest answer, across rounds
    c.log.push(`${p.name}: ${name}, ${answered ? 'right' : 'wrong'}${mode !== 'steady' ? ' (' + mode + ')' : ''}: ${said.join(', ')}.`);
    return C.check(S, c);
  };

  C.check = (S, c) => {
    if (done(c)) return won(c);
    if ([0, 1].every(i => c.acted[i] || S.P[i].hp <= 0)) C.enemyTurn(S, c);
    return c;
  };

  C.enemyTurn = (S, c) => {
    let t = c.guardBy !== null && S.P[c.guardBy].hp > 0 ? c.guardBy : c.target;
    if (S.P[t].hp <= 0) t = 1 - t;
    const who = S.P[t];
    let d = c.atk * c.weak * (c.guardBy === t ? c.guardM : 1) * (1 - E.charm(S, t, 'armor'));
    d = c.block || c.bounce || d <= 0 ? 0 : Math.max(1, Math.round(d));
    if (c.bounce) { const x = C.hit(c, larger(c), c.atk); c.log.push(`The gourd swallows the blow and spits it back for ${x}.`); }
    else if (c.block) c.log.push(`${c.d.n} strikes at smoke.`);
    else {
      if (d >= who.hp) {
        const doll = E.satchel(S).find(x => E.def(x).fx.ward && !c.used[S.items.indexOf(x)]);
        if (doll) { c.used[S.items.indexOf(doll)] = true; d = Math.max(0, Math.ceil(who.hp) - 1); c.log.push('The Paper Stand-In tears in two, and takes the worst of it.'); }
      }
      who.hp = Math.max(0, who.hp - d);
      c.log.push(`${c.d.n} hits ${who.name} for ${d}.` + (who.hp <= 0 ? ` ${who.name} is shaken.` : ''));
      const r = Math.round(d * E.charm(S, t, 'reflect'));
      if (r > 0) { C.hit(c, larger(c), r); c.log.push(`The mirror throws ${r} of it back.`); }
    }
    c.weak = 1; c.guardBy = null; c.guardM = 1; c.block = false; c.bounce = false; c.acted = [false, false];
    c.target = 1 - c.target; c.round++;
    if (done(c)) return won(c);
    if (S.P[0].hp <= 0 && S.P[1].hp <= 0) c.result = 'lose';
  };

  // The finisher: Decisive Duel (Ronin) or Soothe (Spirit-Talker), on the enemy's larger bar once it is half down.
  C.canFinish = (S, c, i) => {
    if (c.d.nofin || c.acted[i] || S.P[i].hp <= 0) return false;
    const own = ownBar(S.P[i].role), mine = own === 'body' ? c.mb : c.ms, theirs = own === 'body' ? c.ms : c.mb;
    return mine >= theirs && c[own] <= mine * (B.finishAt + E.charm(S, i, 'finishAt'));
  };
  C.finish = (S, c, i, ok) => {
    const p = S.P[i];
    if (ok) { c.result = 'finish'; c.log.push(`${p.name} ends it without another blow.`); return c; }
    const d = Math.max(1, Math.round(c.atk)); p.hp = Math.max(0, p.hp - d); c.acted[i] = true; c.right[i] = false; c.streak[i] = 0;
    c.log.push(`${p.name} misjudges the moment and takes ${d}.`);
    if (S.P[0].hp <= 0 && S.P[1].hp <= 0) { c.result = 'lose'; return c; }
    return C.check(S, c);
  };

  // A relic from the satchel: once per fight, costs no turn.
  C.useItem = (S, c, it) => {
    const k = S.items.indexOf(it); if (c.used[k]) return false; c.used[k] = true;
    const v = E.vals(it);
    if (v.block) c.block = true;
    if (v.bounce) c.bounce = true;
    if (v.heal) E.heal(S, E.hurt(S), v.heal);
    if (v.healAll) [0, 1].forEach(j => E.heal(S, j, v.healAll));
    if (v.boostAll) { c.boost[0] += v.boostAll; c.boost[1] += v.boostAll; }
    if (v.body) C.hit(c, 'body', v.body);
    if (v.spirit) C.hit(c, 'spirit', v.spirit);
    if (v.pct) { c.body -= Math.round(c.body * v.pct); c.spirit -= Math.round(c.spirit * v.pct); }
    if (v.flip) { [c.body, c.spirit] = [c.spirit, c.body]; [c.mb, c.ms] = [c.ms, c.mb]; }
    if (v.bind) c.atk *= v.bind;
    if (v.again) c.acted = [false, false];
    c.log.push(`You use the ${E.def(it).n}.`);
    if (done(c)) won(c);
    return true;
  };
  // relics that work by themselves from the satchel are not clicked
  C.activeRelic = it => { const f = UF.ITEMS[it.b].fx; return !(f.fifty || f.swap || f.ward); };
})();
