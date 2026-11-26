// Everything on screen: the map, the two character panels, and the pop-ups over the map.
(function () {
  const UF = globalThis.UF, { B, E, C, T, A } = UF;
  const SAVE = 'underfuji_save', USED = 'underfuji_used', ENDS = 'underfuji_endings', UNDO = 'underfuji_undo', FIN = 'underfuji_finale',
    REC = 'underfuji_records', PROF = 'underfuji_profile', TIPS = 'underfuji_tips', SIZE = 'underfuji_size', POSTED = 'underfuji_posted';
  let S = null, combat = null, pending = null, resolver = null, busy = false;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = k => `assets/prints/${k}.jpg`;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = E.rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const roleIdx = r => S.P.findIndex(p => p.role === r);
  const tname = (t, p) => UF.TECHS[t].n[p.role === 'ronin' ? 0 : 1];
  // Everything a player keeps lives in this browser's local storage, under keys that start with "underfuji_".
  const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  // The journey is written after every finished action. A crash in the middle of one resumes from before it.
  const save = () => { if (S && !S.rehearsal) { put(SAVE, S); put(USED, S.usedQ); } };
  const uid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => E.rnd(16).toString(16)));
  const applySize = () => document.documentElement.style.setProperty('--zoom', { small: 0.9, normal: 1, large: 1.12 }[get(SIZE, 'normal')] || 1);
  applySize();
  // One-time hints, shown as a strip at the top of the map.
  function tip(key, text) {
    const seen = get(TIPS, []); if (seen.includes(key)) return; seen.push(key); put(TIPS, seen);
    const el = $('#tip'); el.innerHTML = `<span>${text}</span><button data-a="tipok">Got it</button>`; el.hidden = false;
  }
  // The shared board: one table in a Supabase project, read and written with its public key. Off when no url is set.
  const BOARD = UF.CFG.board && UF.CFG.board.url ? UF.CFG.board : null;
  const boardHead = () => ({ apikey: BOARD.key, Authorization: 'Bearer ' + BOARD.key, 'Content-Type': 'application/json' });
  const boardPost = r => fetch(BOARD.url + '/rest/v1/scores', { method: 'POST', headers: Object.assign(boardHead(), { Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify({ id: r.id, team: r.team.slice(0, 40), score: r.score, ending: r.ending, blessings: r.bless, undos: r.undos }) }).then(x => x.ok);
  const boardGet = () => fetch(BOARD.url + '/rest/v1/scores?select=team,score,ending,blessings,undos,created_at&order=score.desc&limit=50', { headers: boardHead() }).then(x => x.json());
  const load = () => get(SAVE, null);
  // Undo: a copy of the game from before each of the last six actions.
  let undo = []; try { undo = JSON.parse(localStorage.getItem(UNDO)) || []; } catch (e) { undo = []; }
  const storeUndo = () => { try { localStorage.setItem(UNDO, JSON.stringify(undo)); } catch (e) { undo = undo.slice(-2); } };
  const snap = () => { undo.push(JSON.stringify(S)); if (undo.length > 6) undo.shift(); storeUndo(); };
  // A copy of the game from just before the finale, kept for the hidden rehearsal (press R on the title card).
  const checkpoint = () => { try { localStorage.setItem(FIN, JSON.stringify(S)); } catch (e) { /* storage full: no rehearsal copy */ } };

  // ---------- pop-up plumbing ----------
  function setCard(html, cls) {
    A.hush(); const card = $('#card'); card.className = cls || ''; card.innerHTML = html; $('#modal').hidden = false; card.scrollTop = 0;
    const inp = card.querySelector('input[type=text]'); if (inp) setTimeout(() => inp.focus(), 30);
  }
  // Show a card and wait for a click on any element with data-k. Resolves with that key.
  // speak: a story text for the narrator to read, or a function to run once the card is up.
  function ask(html, cls, speak) {
    setCard(html, cls); if (typeof speak === 'function') speak(); else if (speak) A.say(speak);
    return new Promise(res => {
      resolver = k => {
        ask.vals = {}; $('#card').querySelectorAll('input,select').forEach(e => { ask.vals[e.id] = e.value; });
        resolver = null; res(k);
      };
    });
  }
  const closeModal = () => { $('#modal').hidden = true; };
  document.addEventListener('click', e => {
    A.unlock(); if (e.target.closest('button,.place')) A.sfx('tick');
    const b = e.target.closest('[data-k]');
    if (b && !b.disabled && resolver && $('#card').contains(b)) { resolver(b.dataset.k); return; }
    const a = e.target.closest('[data-a]');
    if (a && !a.disabled) act(a.dataset.a, a.dataset.x);
  });
  document.addEventListener('keydown', e => {
    A.unlock(); if (!resolver) return;
    const card = $('#card'), typing = document.activeElement && document.activeElement.tagName === 'INPUT';
    if (e.key === 'Enter') {
      if (typing) resolver('enter'); else { const p = card.querySelector('.primary:not([disabled])'); if (p) resolver(p.dataset.k); }
      e.preventDefault();
    } else if (!typing && e.key.toLowerCase() === 'r' && card.classList.contains('title')) { resolver('rehearse');
    } else if (!typing && /^[1-9]$/.test(e.key)) {
      const o = [...card.querySelectorAll('.opt:not([disabled])')][+e.key - 1]; if (o) resolver(o.dataset.k);
    }
  });
  const gainsHtml = g => (g && g.length ? '<ul class="gains">' + g.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '');
  // Sounds for what an outcome gave you, read from the same lines the card shows.
  const gainSfx = g => {
    if (!g || !g.length) return; const s = g.join('|'); let d = 450; const q = (n, x) => { setTimeout(() => A.sfx(n, x), d); d += 380; };
    if (/Blessing/.test(s)) q('bless');
    const m = s.match(/(Found|Received): (\w+)/); if (m) q('loot', B.rarity.indexOf(m[2]));
    if (/\+\d+ coins/.test(s)) q('coin'); if (/\+\d+ Resolve|restored/.test(s)) q('heal'); if (/-\d+ Resolve/.test(s)) q('hurt');
  };
  const note = (a, b, g, p) => { gainSfx(g); return note0(a, b, g, p); };
  const note0 = (title, text, gains, pic) => ask(`<div class="evimg" style="background-image:url(${img(pic || UF.PLACES[S.at].img)})"></div><div class="evtxt"><h2>${esc(title)}</h2><p>${esc(text)}</p>${gainsHtml(gains)}<div class="choices"><button class="primary opt" data-k="ok"><i>1</i>Continue</button></div></div>`, 'event', text);

  // ---------- rendering ----------
  function render() {
    A.mood(!S ? 'title' : combat ? (combat.d.boss ? 'boss' : combat.ms > combat.mb ? 'yokai' : 'battle') : S.over ? 'ending' : A.placeMood[S.at]);
    $('#aud').innerHTML = `<button data-a="music">Music: ${A.pref.music}</button><button data-a="sound">Sound effects: ${A.pref.sfx ? 'on' : 'off'}</button>${A.hasClips() ? `<button data-a="narr">Narrator: ${A.pref.narr ? 'on' : 'off'}</button>` : ''}<button data-a="full">Full screen</button>`;
    document.body.classList.toggle('nogame', !S); // before a journey the menu has the whole screen
    if (!S) return;
    renderHud(); renderMap(); [0, 1].forEach(i => { $('#p' + i).innerHTML = panel(i); }); $('#mid').innerHTML = mid();
  }
  function renderHud() {
    const pips = Array.from({ length: B.actions }, (x, k) => `<span class="pip ${k < S.act ? 'on' : ''}"></span>`).join('');
    const day = Math.min(S.day, B.days), fin = !!S.finale;
    $('#hud').innerHTML = (fin ? `<span>The eclipse${S.rehearsal ? ', a rehearsal' : ''}</span>` : `<span>Day ${day} of ${B.days}</span><span>${pips}</span>`) +
      `<span class="sep">|</span><span>💰 ${S.coins}</span>` +
      (S.bless.length ? `<span class="sep">|</span><span title="Blessings">${S.bless.map(b => UF.BLESS[b].i).join(' ')}</span>` : '') +
      `<span class="sep">|</span><button data-a="menu">Menu</button><button data-a="journal">Journal</button><button data-a="undo" ${undo.length && !fin ? '' : 'disabled'} title="Take back the last action">Undo</button>`;
    // the moon's shadow closes on the sun day by day and covers it at the eclipse, when the land goes dark
    $('#shadow').setAttribute('cx', fin ? 1330 : 1346 + 110 * (1 - (day - 1) / (B.days - 1)));
    $('#shadow').setAttribute('r', fin ? 41 : 44);
    $('#map').classList.toggle('eclipse', fin);
  }
  function renderMap() {
    const rs = $('#roads');
    if (!rs.childNodes.length) rs.innerHTML = UF.ROADS.map(([a, b]) => { const p = UF.PLACES[a], q = UF.PLACES[b]; return `<line class="road" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`; }).join('');
    $('#places').innerHTML = Object.entries(UF.PLACES).map(([id, p]) => {
      const here = id === S.at, d = E.cost(S, id);
      const mark = p.shrine ? '⛩️' : p.market ? '🏮' : p.bless ? (S.bless.includes(p.bless) ? '✅' : UF.BLESS[p.bless].i) : '';
      const pawns = here ? `<div class="pawns">${S.P.map(pl => `<i style="background-image:url(${img(pl.role === 'ronin' ? 'ronin' : 'talker')})"></i>`).join('')}</div>` : '';
      return `<div class="place ${here ? 'here' : ''}" style="left:${p.x / 16}%;top:${p.y / 6.4}%" data-a="go" data-x="${id}" title="${here ? 'You are here' : 'Travel: ' + d + (d === 1 ? ' action' : ' actions')}">
        <div class="thumb" style="background-image:url(${img(p.img)})">${pawns}${here ? '' : `<span class="cost">${d}</span>`}<span class="mark">${mark}</span></div><span class="lbl">${esc(p.n)}</span></div>`;
    }).join('');
  }
  function panel(i) {
    const p = S.P[i], mh = E.maxHp(S, i), c = combat, ch = S.items.find(x => x.who === i);
    const can = c && !c.acted[i] && p.hp > 0 && !c.result;
    const techs = p.techs.map(t => `<button class="tech ${c ? (can ? 'live' : '') : 'idle'}" data-a="tech" data-x="${i}:${t}" ${c && !can ? 'disabled' : ''}><b>${esc(tname(t, p))}</b><small>${esc(UF.techText(UF.TECHS[t], p.role))}</small></button>`).join('');
    return `<div class="phead"><div class="portrait" style="background-image:url(${img(p.role === 'ronin' ? 'ronin' : 'talker')})"></div>
      <div class="pinfo"><div class="pname">${esc(p.name)}${!c && S.lead === i ? '<span class="badge" title="Answers the next question on the road">leads</span>' : ''}${c && c.boost[i] > 0 ? `<span class="badge">next strike +${Math.round(c.boost[i] * 100)}%</span>` : ''}</div>
      <div class="prole">${p.role === 'ronin' ? 'The Ronin. Cuts Body.' : 'The Spirit-Talker. Cuts Spirit.'}</div>
      <div class="bar"><span style="width:${100 * p.hp / mh}%"></span><em>${Math.ceil(p.hp)} / ${mh} Resolve${p.hp <= 0 ? ', shaken' : ''}</em></div>
      <div class="ways">${p.ways.map(w => `<span title="${esc(UF.WAYS[w.id].perk)}">${UF.WAYS[w.id].i} ${UF.WAYS[w.id].n.replace('Way of the ', '')}, ${UF.DIFF[w.d]}</span>`).join('')}</div></div></div>
      <div class="techs">${techs}</div>
      <div class="charm">${ch ? `${E.def(ch).i} <b class="r${ch.r}">${esc(E.itemName(ch))}</b> <small>${esc(E.itemText(ch))}</small>` : '<small>No charm worn.</small>'}</div>`;
  }
  function mid() {
    const pl = UF.PLACES[S.at], A = [], b = (a, label, sub, x) => `<button data-a="${a}" ${x !== undefined ? `data-x="${x}"` : ''}>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
    if (!combat) {
      A.push(b('explore', 'Explore', '1 action'));
      if (pl.market) { A.push(b('talk', 'Meet the locals', '1 action')); A.push(b('shop', 'Market')); A.push(b('gear', 'Pack the satchel', '', 0)); }
      if (E.kamiId(S)) A.push(b('kami', 'Seek the kami', '1 action'));
      E.quests(S).forEach(q => A.push(b('quest', esc(q.title), '', q.id)));
      if (pl.herb) A.push(b('gather', `Gather ${UF.HERBS[pl.herb].n.toLowerCase()}`, '1 action'));
      if (pl.shrine) { A.push(b('rest', 'Rest and heal', '1 action')); A.push(b('gear', 'Techniques and gear', '', 1)); A.push(b('brew', 'Brew remedies')); A.push(b('ways', 'Ways and difficulty')); }
      if (S.at === 'fuji') A.push(b('descend', S.floor >= 4 ? 'Enter the Heart of the Mountain' : `Go down: hall ${S.floor + 1} of 5`, S.floor >= 4 ? 'the ending' : '1 action'));
    }
    const relics = E.satchel(S).map(it => { const k = S.items.indexOf(it), live = combat && C.activeRelic(it) && !combat.used[k]; return `<button data-a="relic" data-x="${k}" ${live ? '' : 'disabled'} title="${esc(E.itemText(it))}">${E.def(it).i} <span class="r${it.r}">${esc(E.def(it).n)}</span></button>`; }).join('') || '<small>empty</small>';
    const rems = [...new Set(S.rem)].map(k => { const n = S.rem.filter(x => x === k).length; return `<button data-a="rem" data-x="${S.rem.indexOf(k)}" title="${esc(UF.REMEDIES[k].d)}">🍵 ${esc(UF.REMEDIES[k].n)}${n > 1 ? ' ×' + n : ''}</button>`; }).join('');
    const herbs = Object.keys(S.herbs).filter(h => S.herbs[h] > 0).map(h => `<button data-a="herb" data-x="${h}" title="Chew it: heals the more hurt of you ${B.herbHeal}">${UF.HERBS[h].i} ${UF.HERBS[h].n} ×${S.herbs[h]}</button>`).join('');
    return `<h3>${esc(pl.n)}</h3><div class="blurb">${esc(pl.blurb)}</div><div class="acts">${A.join('') || '<small>Choose a technique in your own panel.</small>'}</div>
      <div class="bag"><span class="lbl">Satchel</span>${relics}${rems || herbs ? `<span class="lbl">Remedies, herbs</span>${rems}${herbs}` : ''}</div>`;
  }

  // ---------- questions ----------
  async function quiz(i, o) {
    o = o || {};
    let q = T.draw(S, i, o), hide = [], order = null;
    const typed = o.m === 't', p = S.P[i];
    for (;;) {
      if (!order) order = q.type === 'b' ? ['True', 'False'] : shuffle([q.a].concat(q.wrong));
      const head = `<div class="qhead c${i}"><span><b>${esc(p.name)}</b> answers${o.title ? ': ' + esc(o.title) : ''}</span><span class="qmeta">${esc(q.cat)}, ${UF.DIFF[q.d]}${o.head ? ' · ' + esc(o.head) : ''}</span></div><div class="qtext">${esc(q.q)}</div>`;
      let h = head;
      if (typed) h += `<div class="typed"><input type="text" id="ans" autocomplete="off" spellcheck="false" placeholder="Type the answer, then press Enter"><button class="primary" data-k="enter">Answer</button></div>`;
      else h += '<div class="answers">' + order.map((a, k) => `<button class="opt" data-k="a${k}" ${hide.includes(a) ? 'disabled' : ''}><i>${k + 1}</i>${esc(a)}</button>`).join('') + '</div>';
      h += '<div class="helps">' + (!typed && S.help.fifty > 0 && order.length > 2 && !hide.length ? `<button data-k="fifty">Remove two choices (${S.help.fifty} left)</button>` : '') +
        (S.help.swap > 0 ? `<button data-k="swap">Swap the question (${S.help.swap} left)</button>` : '') +
        (typed && !o.lore ? '<button data-k="bad">This one cannot be typed: give another</button>' : '') + '</div>';
      const k = await ask(h, 'quiz');
      if (k === 'fifty') { S.help.fifty--; hide = shuffle(order.filter(a => a !== q.a)).slice(0, 2); continue; }
      if (k === 'swap' || k === 'bad') { if (k === 'swap') S.help.swap--; q = T.draw(S, i, o); order = null; hide = []; continue; }
      let ok, given;
      if (typed) { given = (ask.vals.ans || '').trim(); if (!given) continue; ok = T.judge(given, q.a, q.alts); }
      else { if (k === 'enter') continue; given = order[+k.slice(1)]; ok = given === q.a; }
      A.sfx(ok ? 'right' : 'wrong');
      const k2 = await ask(head + `<div class="verdict ${ok ? 'yes' : 'no'}">${ok ? 'Correct' : 'Not this time'}</div>
        <div class="reveal">${typed ? `You wrote: <b>${esc(given)}</b><br>` : ok ? '' : `You chose: ${esc(given)}<br>`}The answer: <b>${esc(q.a)}</b></div>
        <div class="choices rowed"><button class="primary opt" data-k="go"><i>1</i>Continue</button>${typed && !ok ? '<button data-k="had">We had it: count it as right</button>' : ''}${typed && ok ? '<button data-k="no">Too generous: count it as wrong</button>' : ''}</div>`, 'quiz');
      if (k2 === 'had') ok = true; if (k2 === 'no') ok = false;
      if (ok && !S.rehearsal) S.pts = (S.pts || 0) + (q.type === 'b' ? 1 : [2, 3, 5][q.d] || 3) + (typed ? 3 : 0); // renown: harder and typed answers count more
      if (!typed && !o.lore && !o.d && !o.noRecord && q.type !== 'b') T.record(S, i, q.way, ok);
      return ok;
    }
  }
  const testWho = (t, turn) => (t.who === 'ronin' || t.who === 'talker' ? roleIdx(t.who) : t.who === 'alt' ? (S.lead + turn) % 2 : S.lead);
  async function runTest(t, ev) {
    if (t.wait) return waitTest(t.wait, ev);
    const n = t.n || 1, lives = t.lives || 1; let right = 0, wrong = 0, turn = 0;
    while (right < n && wrong < lives) {
      const head = n > 1 ? `right ${right} of ${n}, ${lives - wrong - 1} slip${lives - wrong - 1 === 1 ? '' : 's'} left` : '';
      if (await quiz(testWho(t, turn++), { d: t.d, m: t.m, lore: t.lore, head, title: ev && ev.title })) right++; else wrong++;
    }
    if (t.who === 'lead' || t.who === 'alt' || !t.who) S.lead = 1 - S.lead;
    return right >= n;
  }
  async function waitTest(w, ev) {
    for (let step = 0; step <= w.lines.length; step++) {
      const ready = step === w.lines.length;
      const p = ask(`<div class="evimg" style="background-image:url(${img(ev.img)})"></div><div class="evtxt"><span class="tag patience">patience</span><h2>${esc(ev.title)}</h2>
        <p class="waitline">${w.lines.slice(0, step).map(esc).join('<br>') || 'The kettle sits on the coals. Nothing happens, beautifully.'}</p>
        <div class="choices">${ready ? '<button class="primary" data-k="ok">Accept the bowl</button>' : '<button disabled>The water is not ready</button>'}<button data-k="quit">Give up and ask for sake</button></div></div>`, 'event');
      const timer = ready ? 0 : setTimeout(() => { if (resolver) resolver('tick'); }, w.secs * 1000);
      const k = await p; clearTimeout(timer);
      if (k === 'quit') return false; if (k === 'ok') return true;
    }
    return true;
  }

  // ---------- fights ----------
  function combatCard(c) {
    const bar = (cls, v, m, label) => (m ? `<div class="bar ${cls}"><span style="width:${100 * v / m}%"></span><em>${label} ${Math.ceil(v)} / ${m}</em></div>` : '');
    let t = c.guardBy !== null && S.P[c.guardBy].hp > 0 ? c.guardBy : c.target; if (S.P[t].hp <= 0) t = 1 - t;
    const fin = [0, 1].filter(i => C.canFinish(S, c, i)).map(i => `<button class="primary" data-a="finish" data-x="${i}">${S.P[i].role === 'ronin' ? 'Decisive Duel' : 'Soothe the spirit'} (${esc(S.P[i].name)})<em>one question${E.hasWay(S, i, 'chronicle') ? '' : ', harder'}: right ends the fight, wrong costs a blow</em></button>`).join('');
    setCard(`<div class="evimg" style="background-image:url(${img(c.d.img)})"></div><div class="evtxt"><span class="tag danger">fight · round ${c.round}</span><h2>${c.d.e} ${esc(c.d.n)}</h2>
      ${bar('body', c.body, c.mb, 'Body')}${bar('spirit', c.spirit, c.ms, 'Spirit')}
      <p class="intent">${c.block ? 'It is lost in smoke.' : `It turns toward <b class="c${t}">${esc(S.P[t].name)}</b>. Its blow: about ${Math.round(c.atk)}${c.weak < 1 ? ', weakened' : ''}${c.guardBy !== null ? ', guarded' : ''}.`}</p>
      <div class="clog">${c.log.slice(-4).map(l => `<div>${esc(l)}</div>`).join('') || '<div>The Ronin wears down Body, the Spirit-Talker wears down Spirit. Both bars must be empty.</div>'}</div>
      <div class="choices rowed">${fin}${c.d.boss ? '' : '<button data-a="flee">Withdraw</button>'}</div>
      <p class="hint">Each of you picks one technique in your own panel below, in any order. Relics, remedies and herbs cost no turn. Damage beyond an empty bar spills into the other bar at half strength.</p></div>`, 'event');
  }
  async function runFight(id) {
    const c = combat = C.start(S, id);
    A.sfx(c.ms > c.mb ? 'yokai' : 'clappers');
    tip('fight', 'Each of you picks one technique in your own panel at the bottom. The Ronin empties the red Body bar, the Spirit-Talker the blue Spirit bar, and both must be empty.');
    let hpPrev = S.P[0].hp + S.P[1].hp;
    while (!c.result) {
      const hpNow = S.P[0].hp + S.P[1].hp; if (hpNow < hpPrev) setTimeout(() => A.sfx('hurt'), 350); hpPrev = hpNow;
      render();
      const inp = await new Promise(res => { pending = res; combatCard(c); });
      if (inp.a === 'flee') { c.result = 'flee'; break; }
      if (inp.a === 'relic') { const it = S.items[+inp.x]; if (it && C.activeRelic(it)) C.useItem(S, c, it); continue; }
      if (inp.a === 'rem') { A.sfx('heal'); E.useRemedy(S, +inp.x, c); C.check(S, c); continue; }
      if (inp.a === 'herb') { A.sfx('heal'); E.useHerb(S, inp.x); continue; }
      if (inp.a === 'finish') {
        const i = +inp.x; if (!C.canFinish(S, c, i)) continue;
        C.finish(S, c, i, await quiz(i, { d: E.hasWay(S, i, 'chronicle') ? 0 : 1, noRecord: 1, title: S.P[i].role === 'ronin' ? 'Decisive Duel' : 'Soothe the spirit' }));
        continue;
      }
      if (inp.a === 'tech') {
        const [a, tid] = inp.x.split(':'), i = +a, p = S.P[i];
        if (c.acted[i] || p.hp <= 0 || !p.techs.includes(tid)) continue;
        const canBold = p.ways.some(w => w.d < 2);
        const mode = await ask(`<div class="qhead c${i}"><span><b>${esc(p.name)}</b>: ${esc(tname(tid, p))}</span><span class="qmeta">${esc(UF.techText(UF.TECHS[tid], p.role))}</span></div>
          <p>How much do you stake on your answer?</p><div class="choices">
          <button class="opt primary" data-k="steady"><i>1</i>Steady<em>four choices. Right: full effect. Wrong: a weak effect.</em></button>
          <button class="opt" data-k="bold" ${canBold ? '' : 'disabled'}><i>2</i>Bold, ×1.5<em>a harder question. Wrong: nothing happens.</em></button>
          <button class="opt" data-k="blind"><i>3</i>Blind, ×2<em>no choices, you type the answer. Wrong: nothing happens.</em></button>
          <button data-k="back">Back</button></div>`, 'quiz');
        if (mode === 'back' || mode === 'enter') continue;
        const ok = await quiz(i, Object.assign({ title: tname(tid, p) }, mode === 'bold' ? { d: 1 } : mode === 'blind' ? { m: 't' } : {}));
        const tq = UF.TECHS[tid];
        if (ok || mode === 'steady') A.sfx(tq.guard ? 'guard' : tq.boost && !tq.own ? 'rally' : p.role === 'ronin' ? 'slash' : 'talisman');
        C.act(S, c, i, tid, mode, ok);
      }
    }
    A.sfx({ win: 'win', finish: 'finish', lose: 'lose', flee: 'steps' }[c.result]);
    pending = null; combat = null;
    const gains = E.afterFight(S, c); render();
    const last = c.log.slice(-2).join(' ');
    if (c.result === 'win') await note(`${c.d.n}: defeated`, last, gains, c.d.img);
    else if (c.result === 'finish') await note(`${c.d.n}: ended without another blow`, 'It is over, and nobody had to fall. That is remembered.', gains, c.d.img);
    else if (c.result === 'lose' && !c.d.boss) await note('You are both shaken', 'The world goes soft and far away.', [], c.d.img);
    return c.result;
  }

  // ---------- events ----------
  const testHint = t => {
    if (!t) return '';
    if (t.fight) return `fight: ${UF.ENEMIES[t.fight].n}`;
    if (t.wait) return 'no question, only waiting';
    const who = t.who === 'ronin' || t.who === 'talker' ? S.P[roleIdx(t.who)].name + ' answers' : t.who === 'alt' ? 'you take turns, ' + S.P[S.lead].name + ' first' : S.P[S.lead].name + ' answers';
    return who + (t.m === 't' ? ', typed' : t.m === 'b' ? ', true or false' : '') + (t.lore ? ', lore' : '');
  };
  const io = {
    choose: async (ev, opts) => (A.sfx({ eerie: 'eerie', danger: 'danger', funny: 'pon', patience: 'pon', kami: 'finish', finale: 'gong' }[ev.kind]), +(await ask(`<div class="evimg" style="background-image:url(${img(ev.img)})"></div><div class="evtxt"><span class="tag ${ev.kind}">${ev.kind}</span><h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p>
      <div class="choices">${opts.map((o, k) => (o.ok ? `<button class="opt" data-k="${k}"><i>${k + 1}</i>${esc(o.c[0])}<em>${esc(testHint(o.c[1]))}</em></button>` : `<button disabled>${ev.finale ? '🔒 A path you have not earned this time' : esc(o.c[0]) + ' <em>not enough coins</em>'}</button>`)).join('')}</div></div>`, 'event', ev.text))),
    test: runTest, fight: runFight,
    show: async (ev, text, gains) => { render(); await note(ev.title, text || '', gains, ev.img); },
  };

  // ---------- shrine, market and set-up screens ----------
  async function gear(full) {
    for (;;) {
      let h = `<h2>${full ? 'Techniques and gear' : 'Pack the satchel'}</h2>`;
      if (full) S.P.forEach((p, i) => {
        h += `<h3><b class="c${i}">${esc(p.name)}</b>: three techniques travel with you (${p.techs.length} chosen)</h3><div class="grid">` +
          p.known.map(t => `<button class="pick ${p.techs.includes(t) ? 'on' : ''}" data-k="t${i}:${t}"><b>${esc(tname(t, p))}</b><small>${esc(UF.techText(UF.TECHS[t], p.role))}</small></button>`).join('') + '</div>';
      });
      const rel = S.items.filter(x => E.def(x).t === 'relic'), chm = S.items.filter(x => E.def(x).t === 'charm');
      h += `<h3>Relics: four fit in the satchel (${E.satchel(S).length} packed)</h3><div class="grid">` + (rel.map(it => `<button class="pick ${it.on ? 'on' : ''}" data-k="r${S.items.indexOf(it)}"><b class="r${it.r}">${E.def(it).i} ${esc(E.itemName(it))}</b><small>${esc(E.itemText(it))}</small></button>`).join('') || '<small>None yet.</small>') + '</div>';
      h += '<h3>Charms: one each</h3>' + (chm.map(it => { const k = S.items.indexOf(it); return `<div class="row"><span>${E.def(it).i} <b class="r${it.r}">${esc(E.itemName(it))}</b> <small>${esc(E.itemText(it))}</small></span>${[0, 1].map(w => `<button class="${it.who === w ? 'on' : ''}" data-k="c${k}:${w}">${esc(S.P[w].name)}</button>`).join('')}</div>`; }).join('') || '<small>None yet.</small>');
      h += '<div class="choices"><button class="primary" data-k="x">Done</button></div>';
      const k = await ask(h, 'sheet'); if (k === 'x' || k === 'enter') break;
      if (k[0] === 't') { const [i, t] = k.slice(1).split(':'), p = S.P[+i]; if (p.techs.includes(t)) p.techs = p.techs.filter(x => x !== t); else if (p.techs.length < 3) p.techs.push(t); }
      if (k[0] === 'r') { const it = S.items[+k.slice(1)]; if (it.on) it.on = false; else if (E.satchel(S).length < 4) it.on = true; }
      if (k[0] === 'c') { const [idx, w] = k.slice(1).split(':').map(Number), it = S.items[idx]; if (it.who === w) delete it.who; else { S.items.forEach(x => { if (x.who === w) delete x.who; }); it.who = w; } }
    }
    S.P.forEach((p, i) => { if (!p.techs.length) p.techs.push('strike'); p.hp = Math.min(p.hp, E.maxHp(S, i)); });
  }
  async function brew() {
    for (;;) {
      const hs = Object.keys(UF.HERBS).filter(h => S.herbs[h] > 0), pairs = [];
      hs.forEach((a, x) => hs.slice(x + 1).forEach(b2 => pairs.push([a, b2])));
      const h = `<h2>Brew remedies</h2><p>Herbs from two different regions combine into something stronger. You hold: ${hs.map(x => `${UF.HERBS[x].i} ${UF.HERBS[x].n} ×${S.herbs[x]}`).join(', ') || 'no herbs'}.</p>
        <div class="choices">${pairs.map(([a, b2]) => { const r = UF.REMEDIES[E.remKey(a, b2)]; return `<button class="opt" data-k="${a}+${b2}">${UF.HERBS[a].n} + ${UF.HERBS[b2].n}: <b>${esc(r.n)}</b><em>${esc(r.d)}</em></button>`; }).join('') || '<small>You need herbs from two different regions.</small>'}</div>
        <p>Ready to use: ${S.rem.map(k => esc(UF.REMEDIES[k].n)).join(', ') || 'none'}.</p><div class="choices"><button class="primary" data-k="x">Done</button></div>`;
      const k = await ask(h, 'sheet'); if (k === 'x' || k === 'enter') break;
      const [a, b2] = k.split('+'); E.brew(S, a, b2); A.sfx('brew');
    }
  }
  const waysHtml = (ps, recs) => '<div class="cols">' + ps.map((p, i) => `<div><h3><b class="c${i}">${esc(p.name || (i ? 'Right player' : 'Left player'))}</b>: choose two Ways</h3>` +
    Object.entries(UF.WAYS).map(([id, w]) => {
      const on = p.ways.find(x => x.id === id), r = recs && recs[i][id];
      return `<div class="row"><button class="pick ${on ? 'on' : ''}" data-k="w${i}:${id}" style="flex:1"><b>${w.i} ${w.n}</b><small>${w.s}. ${w.perk}${r && r[1] ? ` You: ${r[0]} of ${r[1]} right.` : ''}</small></button>${on ? `<button data-k="d${i}:${id}">${UF.DIFF[on.d]}</button>` : ''}</div>`;
    }).join('') + '</div>').join('') + '</div>';
  const waysClick = (ps, k) => {
    const [i, id] = k.slice(1).split(':'), p = ps[+i], on = p.ways.find(x => x.id === id);
    if (k[0] === 'w') { if (on) p.ways = p.ways.filter(x => x.id !== id); else if (p.ways.length < 2) p.ways.push({ id, d: 1 }); }
    if (k[0] === 'd' && on) on.d = (on.d + 1) % 3;
  };
  async function ways() {
    for (;;) {
      const sug = [0, 1].map(i => T.suggest(S, i).map(s => `<p><b class="c${i}">${esc(S.P[i].name)}</b> answers ${Math.round(s.rate * 100)}% of ${UF.WAYS[s.way].n} right. The priest suggests ${UF.DIFF[s.to]}.</p>`).join('')).join('');
      const k = await ask(`<h2>Ways and difficulty</h2><p>Click a difficulty to change it. Harder questions give the same effect, so set it where each of you gets about two in three right.</p>${sug}${waysHtml(S.P, S.P.map(p => p.rec))}
        <div class="choices"><button class="primary" data-k="x" ${S.P.every(p => p.ways.length === 2) ? '' : 'disabled'}>Done</button></div>`, 'sheet');
      if (k === 'x') break; if (k !== 'enter') waysClick(S.P, k);
    }
  }
  async function shop() {
    for (;;) {
      const st = E.shop(S).stock;
      const k = await ask(`<h2>Market</h2><p>💰 ${S.coins} coins. The stock changes every day.</p><div class="grid">` +
        st.map((it, n) => `<button class="pick" data-k="b${n}" ${it.sold || S.coins < B.price[it.r] ? 'disabled' : ''}><b class="r${it.r}">${E.def(it).i} ${esc(E.itemName(it))}</b><small>${esc(E.itemText(it))} ${E.def(it).t === 'charm' ? 'Charm.' : 'Relic.'}</small>${it.sold ? 'sold' : B.price[it.r] + ' coins'}</button>`).join('') +
        `<button class="pick" data-k="rice" ${S.coins < B.riceBall[0] ? 'disabled' : ''}><b>🍙 Rice balls</b><small>Heals you both ${B.riceBall[1]}, eaten on the spot.</small>${B.riceBall[0]} coins</button></div>
        <h3>Sell</h3><div class="grid">${S.items.map((it, n) => `<button class="pick" data-k="s${n}"><b class="r${it.r}">${E.def(it).i} ${esc(E.itemName(it))}</b>sell for ${Math.round(B.price[it.r] * B.sell)}</button>`).join('') || '<small>Nothing to sell.</small>'}</div>
        <div class="choices"><button class="primary" data-k="x">Done</button></div>`, 'sheet');
      if (k === 'x' || k === 'enter') break;
      A.sfx('coin');
      if (k === 'rice') { S.coins -= B.riceBall[0]; [0, 1].forEach(i => E.heal(S, i, B.riceBall[1])); }
      else if (k[0] === 'b') { const it = st[+k.slice(1)]; S.coins -= B.price[it.r]; it.sold = 1; E.addItem(S, it.b, it.r); }
      else if (k[0] === 's') { const it = S.items[+k.slice(1)]; S.coins += Math.round(B.price[it.r] * B.sell); S.items.splice(+k.slice(1), 1); }
      render();
    }
  }
  async function setup() {
    const prof = get(PROF, null); let team = prof ? prof.team || '' : '';
    const ps = prof && prof.ps ? JSON.parse(JSON.stringify(prof.ps)) : [{ name: '', role: 'ronin', ways: [] }, { name: '', role: 'talker', ways: [] }];
    for (;;) {
      const k = await ask(`<h2>Who walks the road?</h2><input type="text" id="team" value="${esc(team)}" placeholder="A name for the two of you, for the records (optional)" maxlength="30" style="margin-bottom:.7rem"><div class="cols">${ps.map((p, i) => `<div><input type="text" id="n${i}" value="${esc(p.name)}" placeholder="${i ? 'Right player' : 'Left player'}: your name" maxlength="14">
        <p><b>${p.role === 'ronin' ? 'The Ronin' : 'The Spirit-Talker'}</b><small>${p.role === 'ronin' ? 'An old sword without a master. Wears down the Body of an enemy, stands guard over the partner, and can end a fight with mortals by a single duel.' : 'A wandering shrine painter who hears what the dead say. Wears down the Spirit of an enemy, blesses the partner, and can soothe a spirit instead of destroying it.'}</small></p></div>`).join('')}</div>
        <div class="choices"><button data-k="swap">Swap the two roles</button></div>${waysHtml(ps)}
        <div class="choices rowed"><button class="primary" data-k="go" ${ps.every(p => p.ways.length === 2) ? '' : 'disabled'}>Begin the journey</button><button data-k="back">Back to the menu</button></div>`, 'sheet');
      ps.forEach((p, i) => { p.name = (ask.vals['n' + i] || '').trim(); }); team = (ask.vals.team || '').trim();
      if (k === 'back') return false;
      if (k === 'swap') { const r = ps[0].role; ps[0].role = ps[1].role; ps[1].role = r; }
      else if (k === 'go') break;
      else if (k !== 'enter') waysClick(ps, k);
    }
    ps.forEach((p, i) => { if (!p.name) p.name = i ? 'Right' : 'Left'; });
    put(PROF, { team, ps });
    S = E.newGame(ps[0], ps[1]); undo = []; storeUndo();
    S.id = uid(); S.team = team || ps[0].name + ' and ' + ps[1].name;
    try { S.usedQ = JSON.parse(localStorage.getItem(USED)) || []; } catch (e) { S.usedQ = []; }
    save(); render();
    await ask(`<div class="evimg" style="background-image:url(${img('edo')})"></div><div class="evtxt"><span class="tag">the road begins</span><h2>Fourteen days</h2>
      ${UF.INTRO.map(x => `<p>${esc(x)}</p>`).join('')}
      <div class="choices"><button class="primary opt" data-k="ok"><i>1</i>Set out</button></div></div>`, 'event', UF.INTRO.join(' '));
    tip('map', 'Click any place on the map to travel there. The number on it is what the road costs in actions. What you can do where you stand is in the middle panel below.');
    return true;
  }
  const HOW = `<h2>How to play</h2>
    <p><b>The goal.</b> In 14 days the eclipse comes and you face what sleeps under Fuji. You cannot lose, but what you did on the road decides which of six endings you get.</p>
    <p><b>A day</b> has three actions. Click any place to travel (the number on it is the cost). At a place you explore, meet people, seek the kami, gather herbs or take a quest.</p>
    <p><b>Questions instead of dice.</b> Every technique asks its user one question. Steady: right gives the full effect, wrong a weak one. Bold (harder) gives ×1.5 and Blind (typed) gives ×2, but a miss does nothing.</p>
    <p><b>Fights.</b> Every enemy has a Body bar and a Spirit bar. The Ronin cuts Body, the Spirit-Talker cuts Spirit, and both must be emptied. Each round you each use one technique, then the enemy strikes.</p>
    <p><b>Shrines</b> heal you, let you swap techniques and charms, brew two herbs into a remedy, and change your Ways and difficulty. <b>Markets</b> sell relics and charms.</p>
    <p><b>Danger pays best</b> (up to Legendary), <b>patience pays well</b> (up to Epic). Keys 1 to 4 pick an answer, Enter continues.</p>
    <p><b>Good to know.</b> The Journal in the top bar lists your blessings, the quests and what you have learned. Undo takes back an action. The journey is saved in this browser after every action, and Settings can write it to a file.</p>
    <div class="choices"><button class="primary" data-k="x">Back</button></div>`;
  const CREDITS = `<h2>Credits</h2>
    <p><b>Questions</b> come from the Open Trivia Database (opentdb.com), used under the Creative Commons Attribution-ShareAlike 4.0 licence. A few are out of date or debatable, which is what the "We had it" button is for.</p>
    <p><b>Pictures</b> are public domain woodblock prints by Katsushika Hokusai, Utagawa Hiroshige, Utagawa Kuniyoshi, Tsukioka Yoshitoshi, Toshusai Sharaku and Kitagawa Utamaro, from the open access collection of the Art Institute of Chicago.</p>
    <p><b>Lettering</b> is DotGothic16 by Fontworks, under the SIL Open Font Licence.</p>
    <p><b>Music and sound effects</b> are generated in your browser as you play.</p>
    <p><b>The story</b> draws on Japanese folklore: Iwanaga-hime, the rock princess, and her sister Konohanasakuya-hime, the blossom princess of Mount Fuji.</p>
    <div class="choices"><button class="primary" data-k="x">Back</button></div>`;
  async function title() {
    for (;;) {
      const sv = load(), going = sv && !sv.over;
      const k = await ask(`<div class="plate"><h1>Under Fuji</h1><p>A road story for two, told in questions. Fourteen days, one mountain, six endings.</p><div class="choices rowed">
        ${going ? `<button class="primary" data-k="cont">Continue: day ${Math.min(sv.day, B.days)}, ${esc(sv.P[0].name)} and ${esc(sv.P[1].name)}</button>` : ''}
        <button class="${going ? '' : 'primary'}" data-k="new">New journey</button><button data-k="how">How to play</button><button data-k="board">Records</button><button data-k="settings">Settings</button>
        ${localStorage.getItem(FIN) || (S && !S.over) || going ? '<button data-k="rehearse">Try the endings</button>' : ''}${S && !S.over ? '<button data-k="back">Back to the map</button>' : ''}</div>
        <p class="ver">The journey is saved in this browser after every action. <button class="link" data-k="credits">Credits</button> · version ${UF.CFG.version}</p></div>`, 'title');
      if (k === 'how') { await ask(HOW, 'sheet'); continue; }
      if (k === 'settings') { await settings(); continue; }
      if (k === 'board') { await board(); continue; }
      if (k === 'credits') { await ask(CREDITS, 'sheet'); continue; }
      if (k === 'rehearse') { await rehearse(); continue; }
      if (k === 'cont' || (k === 'enter' && going)) { S = sv; E.helpReset(S); break; }
      if (k === 'back') break;
      if (k === 'new') {
        if (going && (await ask('<h2>Start a new journey?</h2><p>The journey in progress will be replaced. To keep it, download a save file in Settings first.</p><div class="choices rowed"><button class="primary" data-k="no">Keep the journey</button><button data-k="yes">Start a new one</button></div>', 'sheet')) !== 'yes') continue;
        if (await setup()) break;
      }
    }
    closeModal(); render(); await tail();
  }
  const endingCard = id => {
    const e = UF.ENDINGS[id];
    return ask(`<div class="evimg" style="background-image:url(${img(e.img)})"></div><div class="evtxt"><span class="tag finale">ending</span><h2>${esc(e.t)}</h2><p>${esc(e.x)}</p>
      <div class="choices"><button class="primary opt" data-k="ok"><i>1</i>Go on</button></div></div>`, 'event', e.x);
  };
  // "Try the endings" on the menu, or R. Plays the finale on a copy of the game, with every path open. Nothing is saved.
  async function rehearse() {
    const sv = load(), live = S && !S.over ? JSON.stringify(S) : sv && !sv.over ? JSON.stringify(sv) : null, fin = localStorage.getItem(FIN);
    let src = live || fin;
    if (live && fin) src = (await ask('<h2>Finale rehearsal</h2><p>Which journey do you want to take into the finale?</p><div class="choices"><button class="primary opt" data-k="fin"><i>1</i>The last journey that reached the finale</button><button class="opt" data-k="live"><i>2</i>The journey in progress, as it stands now</button></div>', 'sheet')) === 'live' ? live : fin;
    if (!src) { await ask('<h2>Finale rehearsal</h2><p>There is no journey to rehearse with yet. Start one, or finish one, and come back.</p><div class="choices"><button class="primary" data-k="x">Back</button></div>', 'sheet'); return; }
    const keep = S;
    for (;;) {
      S = JSON.parse(src); S.over = null; S.finale = true; S.at = 'fuji'; S.floor = 4; S.rehearsal = true; E.rest(S); closeModal(); render();
      await E.runEvent(S, 'finale', io);
      if (S.over) { render(); await endingCard(S.over); }
      const k = await ask(`<h2>Finale rehearsal</h2><p>That was a rehearsal on a copy of your journey. Nothing was saved, no ending was recorded, and every path was open.</p>
        <div class="choices rowed"><button class="primary" data-k="again">Rehearse again</button><button data-k="x">Back</button></div>`, 'sheet');
      if (k !== 'again') break;
    }
    S = keep; combat = null; pending = null; closeModal(); render();
  }
  // The narrator's voices: from the local server when there is one, else from the list published with the game.
  let pickedFile = null;
  async function voiceList() {
    const here = ['localhost', '127.0.0.1'].includes(location.hostname); // only a local copy has the rendering server
    for (const u of (here ? ['voice/status'] : []).concat('assets/voice/index.json')) { try { const r = await fetch(u, { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (e) { /* try the next */ } }
    return null;
  }
  function exportSave() {
    const data = { game: 'under-fuji', v: 1, save: load(), finale: get(FIN, null), records: get(REC, []), endings: get(ENDS, []), profile: get(PROF, null) };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = 'under-fuji-save.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }
  async function importSave(file) {
    let ok = false;
    try {
      const d = JSON.parse(await file.text());
      if (d.game === 'under-fuji' && d.save && Array.isArray(d.save.P) && d.save.P.length === 2 && d.save.P.every(p => p.ways.every(w => UF.WAYS[w.id]))) {
        put(SAVE, d.save); if (d.finale) put(FIN, d.finale); if (d.records) put(REC, d.records); if (d.endings) put(ENDS, d.endings); if (d.profile) put(PROF, d.profile);
        S = null; undo = []; storeUndo(); ok = true;
      }
    } catch (e) { ok = false; }
    await ask(ok ? '<h2>Save file loaded</h2><p>Choose Continue on the menu to pick the journey up.</p><div class="choices"><button class="primary" data-k="x">Good</button></div>'
      : '<h2>That file could not be read</h2><p>It does not look like an Under Fuji save file.</p><div class="choices"><button class="primary" data-k="x">Back</button></div>', 'sheet');
  }
  async function settings() {
    let after = null;
    for (;;) {
      const st = await voiceList(), local = !!(st && st.service), size = get(SIZE, 'normal');
      const seg = (key, cur, opts) => opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-k="${key}:${v}">${l}</button>`).join('');
      const vs = st ? st.voices.filter(v => v.ready || local) : [];
      const k = await ask(`<h2>Settings</h2>
        <h3>Sound</h3><div class="row"><span>Music</span>${seg('m', A.pref.music, [['off', 'Off'], ['soft', 'Soft'], ['full', 'Full']])}</div>
        <div class="row"><span>Sound effects</span>${seg('f', A.pref.sfx ? 'on' : 'off', [['on', 'On'], ['off', 'Off']])}</div>
        <h3>Narrator</h3>${vs.length ? `<div class="row"><span>Reads the story texts aloud, not the questions</span>${seg('n', A.pref.narr ? 'on' : 'off', [['on', 'On'], ['off', 'Off']])}</div>` +
          vs.map(v => `<div class="row"><span><b>${esc(v.label)}</b> <small>${v.done ? '' : v.ready ? v.ready + ' of ' + v.total + ' texts rendered' : 'not rendered yet'}</small></span><button data-k="s:${v.id}">Listen</button><button class="${A.pref.voice === v.id ? 'on' : ''}" data-k="u:${v.id}">${A.pref.voice === v.id ? 'In use' : v.done || !local ? 'Use' : 'Render and use'}</button></div>`).join('')
          : '<p><small>This copy of the game comes without a narrator.</small></p>'}
        <h3>Text size</h3><div class="row"><span>Pick what reads well from where you sit</span>${seg('z', size, [['small', 'Smaller'], ['normal', 'Normal'], ['large', 'Larger']])}</div>
        <h3>Your journey</h3><div class="row"><span>It is kept in this browser. A save file carries it to another browser or computer.</span><button data-k="export" ${load() ? '' : 'disabled'}>Download a save file</button><label class="filebtn">Load a save file<input type="file" id="savefile" accept=".json,application/json"></label></div>
        <div class="row"><span>Remove the journey, records and settings from this browser</span><button data-k="wipe">Erase everything</button></div>
        <div class="choices"><button class="primary" data-k="x">Done</button></div>`, 'sheet', () => {
        if (after) after(); after = null;
        $('#savefile').onchange = e => { const f = e.target.files[0]; if (f && resolver) { pickedFile = f; resolver('import'); } };
      });
      if (k === 'x' || k === 'enter') break;
      if (k === 'import') { await importSave(pickedFile); continue; }
      if (k === 'export') { exportSave(); continue; }
      if (k === 'wipe') {
        if ((await ask('<h2>Erase everything?</h2><p>The journey, your records, the endings you found and your settings will be removed from this browser. This cannot be undone.</p><div class="choices rowed"><button class="primary" data-k="no">Keep it all</button><button data-k="yes">Erase</button></div>', 'sheet')) === 'yes') {
          Object.keys(localStorage).filter(x => x.startsWith('underfuji_')).forEach(x => localStorage.removeItem(x)); location.reload(); return;
        }
        continue;
      }
      const a = k[0], v = k.slice(2);
      if (a === 'm') while (A.pref.music !== v) A.toggle('music');
      if (a === 'f' && (A.pref.sfx ? 'on' : 'off') !== v) A.toggle('sfx');
      if (a === 'n' && (A.pref.narr ? 'on' : 'off') !== v) A.toggle('narr');
      if (a === 'z') { put(SIZE, v); applySize(); }
      if (a === 's') after = () => A.sample(v);
      if (a === 'u') {
        const vo = vs.find(x => x.id === v);
        if (vo && !vo.done && local) await fetch('voice/render?v=' + encodeURIComponent(v)).catch(() => {});
        await A.setVoice(v);
      }
      render();
    }
  }
  const recTable = (rows, posted) => (rows.length ? `<table class="board"><tr><th></th><th>Travellers</th><th>Renown</th><th>Ending</th><th>Blessings</th><th>Undos</th><th>Date</th>${posted ? '<th></th>' : ''}</tr>` +
    rows.map((r, n) => `<tr><td>${n + 1}</td><td>${esc(r.team)}</td><td><b>${+r.score || 0}</b></td><td>${esc((UF.ENDINGS[r.ending] || { t: '?' }).t)}</td><td>${+(r.blessings !== undefined ? r.blessings : r.bless) || 0}</td><td>${+r.undos || 0}</td><td>${esc(String(r.created_at || r.date || '').slice(0, 10))}</td>${posted ? `<td>${posted.includes(r.id) ? 'on the board' : `<button data-k="p:${esc(r.id)}">Add to the shared board</button>`}</td>` : ''}</tr>`).join('') + '</table>'
    : '<p><small>Nothing here yet.</small></p>');
  // A journey finished before the game kept records is rebuilt from what its save still holds.
  // Older versions did not count answer points or fights won, so those two are estimated from the hit rates and the fight count.
  function legacyRecords() {
    const recs = get(REC, []), seen = {}, sig = v => [v.over, v.P[0].name, v.P[1].name, v.day, v.coins, v.fights].join('|');
    [[SAVE, load()], [FIN, get(FIN, null)]].forEach(([key, v]) => {
      if (!v || !v.over || !UF.ENDINGS[v.over] || !Array.isArray(v.P)) return;
      if (!v.id) { v.id = seen[sig(v)] || uid(); put(key, v); } // the save and the finale copy can be the same journey
      seen[sig(v)] = v.id;
      if (recs.some(r => r.id === v.id)) return;
      const est = v.pts === undefined;
      if (est) {
        v.pts = v.P.reduce((a, p) => a + p.ways.reduce((x, w) => x + ((p.rec[w.id] || [0])[0]) * [2, 3, 5][w.d], 0), 0);
        v.wins = Math.max(0, (v.fights || 0) - (v.shakenN || 0));
      }
      recs.push({ id: v.id, team: v.team || v.P[0].name + ' and ' + v.P[1].name, score: E.score(v).total, ending: v.over, bless: v.bless.length, undos: v.undos || 0, date: new Date().toISOString(), est });
    });
    put(REC, recs);
  }
  async function board() {
    let msg = '';
    for (;;) {
      let online = null, err = '';
      if (BOARD) { try { online = await boardGet(); if (!Array.isArray(online)) throw new Error('no list'); } catch (e) { online = null; err = 'The shared board could not be reached just now.'; } }
      const mine = get(REC, []).slice().sort((a, b) => b.score - a.score);
      const k = await ask(`<h2>Records</h2>${BOARD ? `<h3>All travellers</h3>${online ? recTable(online) : `<p><small>${err}</small></p>`}` : ''}<h3>Journeys finished in this browser</h3>${recTable(mine, BOARD ? get(POSTED, []) : null)}
        ${msg ? `<p><small>${esc(msg)}</small></p>` : ''}
        <p><small>Renown counts the ending, blessings, right answers (harder and typed ones count more), fights won, quests and treasures. Being shaken costs some. Undos are shown, not punished.</small></p>
        <div class="choices"><button class="primary" data-k="x">Back</button></div>`, 'sheet');
      if (k.slice(0, 2) !== 'p:') break;
      const rec = mine.find(r => r.id === k.slice(2));
      if (rec && await boardPost(rec).catch(() => false)) { put(POSTED, get(POSTED, []).concat(rec.id)); msg = rec.team + ' is on the board.'; } else msg = 'The board could not be reached. Try again in a moment.';
    }
  }
  async function journal() {
    const f = S.flags, place = b => Object.values(UF.PLACES).find(p => p.bless === b).n, clues = [], left = B.days - S.day;
    if (f.rumour) clues.push('Pilgrims whisper that the goddess of the mountain had an elder sister, sent home in shame, who waits under Fuji.');
    if (f.name1 && !f.truename) clues.push('You have heard her name: Iwanaga. Behind the Cloud Shrine stands a small shrine whose nameplate was chiselled blank.');
    if (f.truename) clues.push('You carved the name Iwanaga back onto her shrine. You could say it to her face.');
    if (f.drum) clues.push('The Hundred-Year Drum travels with you. It wants an audience.');
    if (S.dread >= 4) clues.push('You have walked in dark places, and something below has noticed. It may offer you a bargain.');
    if (S.mirth >= 4) clues.push('You have laughed a great deal on this road. Laughter once brought the sun out of a cave.');
    if (S.items.filter(x => x.r === 4).length >= 2) clues.push('You carry two Legendary things. Held together, they hum.');
    const mark = on => (on ? '\u2705' : '\u25FB\uFE0F'), sm = t => `<small style="display:inline">${esc(t)}</small>`;
    await ask(`<h2>Journal</h2><p>${S.finale ? 'The eclipse has come.' : `Day ${S.day} of ${B.days}. ${left > 0 ? left + (left === 1 ? ' day' : ' days') + ' remain after this one' : 'This is the last day'} before the eclipse.`}</p>
      <div class="cols"><div><h3>Blessings: ${S.bless.length} of 5</h3>${Object.keys(UF.BLESS).map(b => `<div>${mark(S.bless.includes(b))} ${UF.BLESS[b].i} ${esc(UF.BLESS[b].n)} ${S.bless.includes(b) ? '' : sm('at ' + place(b))}</div>`).join('')}
        <h3>Quests</h3>${Object.values(UF.EV).filter(e => e.slot === 'quest').map(q => `<div>${mark(S.done[q.id])} ${esc(q.title)} ${sm('at ' + UF.PLACES[q.place].n)}</div>`).join('')}</div>
        <div><h3>What you know</h3>${clues.map(c => `<p>${esc(c)}</p>`).join('') || '<p><small>Nothing yet. Listen at the teahouse, at the shrines and in the baths.</small></p>'}
        <h3>Inside Fuji</h3><p>${S.floor >= 4 ? 'The way to the Heart of the Mountain is open.' : `You have passed ${S.floor} of 4 halls. On the last day the mountain calls you whether you have or not.`}</p></div></div>
      <div class="choices"><button class="primary" data-k="x">Close</button></div>`, 'sheet');
  }
  async function ending() {
    render();
    const found = get(ENDS, []); if (!found.includes(S.over)) found.push(S.over); put(ENDS, found); save();
    const sc = E.score(S), rec = { id: S.id || uid(), team: S.team || S.P[0].name + ' and ' + S.P[1].name, score: sc.total, ending: S.over, bless: S.bless.length, undos: S.undos || 0, date: new Date().toISOString() };
    const recs = get(REC, []); if (!recs.some(r => r.id === rec.id)) { recs.push(rec); put(REC, recs); }
    const tot = S.P[0].dmg + S.P[1].dmg || 1;
    const rate = p => p.ways.map(w => { const r = p.rec[w.id]; return `${UF.WAYS[w.id].n.replace('Way of the ', '')} ${r && r[1] ? Math.round(100 * r[0] / r[1]) + '%' : 'n/a'}`; }).join(', ');
    await endingCard(S.over);
    let posted = get(POSTED, []).includes(rec.id), msg = '';
    for (;;) {
      const k = await ask(`<h2>The road behind you</h2><div class="cols"><div><h3>Renown: ${sc.total}</h3><table class="board">${sc.lines.map(l => `<tr><td>${esc(l[0])}</td><td>${l[1] > 0 ? '+' : ''}${l[1]}</td></tr>`).join('')}</table></div>
        <div><h3>${esc(rec.team)}</h3><p><b class="c0">${esc(S.P[0].name)}</b>: ${Math.round(100 * S.P[0].dmg / tot)}% of the damage. Right answers: ${rate(S.P[0])}.</p>
        <p><b class="c1">${esc(S.P[1].name)}</b>: ${Math.round(100 * S.P[1].dmg / tot)}% of the damage. Right answers: ${rate(S.P[1])}.</p>
        <p>Fights: ${S.fights}, shaken ${S.shakenN} time${S.shakenN === 1 ? '' : 's'}. Dread ${S.dread}, mirth ${S.mirth}, harmony ${S.harmony}. Undos: ${S.undos || 0}.</p>
        <h3>Endings found: ${found.length} of 6</h3><p>${Object.entries(UF.ENDINGS).map(([id, x]) => (found.includes(id) ? `<b>${esc(x.t)}</b>` : '???')).join(' · ')}</p></div></div>
        ${msg ? `<p><small>${esc(msg)}</small></p>` : ''}
        <div class="choices rowed">${BOARD && !posted ? '<button class="primary" data-k="post">Add us to the shared board</button>' : ''}<button class="${BOARD && !posted ? '' : 'primary'}" data-k="x">To the menu</button><button data-k="share">Copy our result to share</button><button data-k="board">Records</button></div>`, 'sheet');
      if (k === 'share') {
        const t = `${rec.team} reached "${UF.ENDINGS[S.over].t}" in Under Fuji with ${sc.total} renown. ${UF.CFG.site}`;
        try { await navigator.clipboard.writeText(t); msg = 'Copied. Paste it wherever your friends are.'; } catch (e) { msg = t; }
        continue;
      }
      if (k === 'post') {
        posted = await boardPost(rec).catch(() => false);
        if (posted) { put(POSTED, get(POSTED, []).concat(rec.id)); msg = 'You are on the board.'; } else msg = 'The board could not be reached. You can try again from here.';
        continue;
      }
      if (k === 'board') { await board(); continue; }
      break;
    }
    await title(); // back to the menu
  }

  // ---------- actions from the map and panels ----------
  const run = id => { if (id === 'finale' && !S.rehearsal) checkpoint(); return E.runEvent(S, id, io); };
  const ACT = {
    go: async x => {
      if (x !== S.at) E.travel(S, x);
      if (UF.PLACES[S.at].shrine) tip('shrine', 'A shrine is where you rest, swap techniques and charms, brew two herbs into a remedy, and change your Ways and difficulty.');
    },
    explore: () => run(E.exploreId(S)), talk: () => run(E.talkId(S)), kami: () => run(E.kamiId(S)), quest: x => run(x), descend: () => run(E.floorId(S)),
    gather: async () => {
      const pl = UF.PLACES[S.at], who = S.lead; E.helpReset(S);
      const ok = await runTest({ who: 'lead' }, { title: 'Gathering ' + UF.HERBS[pl.herb].n.toLowerCase() });
      const n = B.gather[ok ? 0 : 1] + ([0, 1].some(i => E.hasWay(S, i, 'earth')) ? 1 : 0);
      const g = E.applyFx(S, { herb: [pl.herb, n] }); E.spend(S, 1);
      await note('Gathering', ok ? `${S.P[who].name} knows exactly where it grows.` : `${S.P[who].name} finds a little, the slow way.`, g);
    },
    rest: async () => { E.rest(S); E.spend(S, 1); await note('Rest', 'You sleep under the eaves of the shrine. In the morning, whatever hurt has gone out of you like a tide.', ['Both fully restored']); },
    gear: x => gear(+x === 1), brew, ways, shop, journal,
  };
  // After any action: the eclipse, then the ending.
  async function tail() {
    while (S && S.finale && !S.over) {
      if (S.at !== 'fuji') { S.at = 'fuji'; render(); await note('The sun begins to go out', UF.ECLIPSE, [], 'fuji'); }
      S.floor = 4; await run('finale'); save();
    }
    if (S && S.over) await ending();
  }
  async function act(a, x) {
    if (a === 'music' || a === 'sound' || a === 'narr') { A.toggle(a === 'sound' ? 'sfx' : a); render(); return; }
    if (a === 'tipok') { $('#tip').hidden = true; return; }
    if (a === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); return; }
    if (combat) { if (pending && ['tech', 'relic', 'rem', 'herb', 'finish', 'flee'].includes(a)) { const p = pending; pending = null; p({ a, x }); } return; }
    if (!S) return;
    if (a === 'undo') {
      if (busy || !undo.length) return;
      const used = S.usedQ, n = (S.undos || 0) + 1; S = JSON.parse(undo.pop()); S.usedQ = used; S.undos = n; storeUndo(); save(); render(); return;
    }
    // used while an event is open, these are saved when that action finishes, not in the middle of it
    if (a === 'herb') { A.sfx('heal'); E.useHerb(S, x); if (!busy) save(); render(); return; }
    if (a === 'rem') { A.sfx('heal'); E.useRemedy(S, +x, null); if (!busy) save(); render(); return; }
    if (busy || !(ACT[a] || a === 'menu')) return;
    busy = true;
    try {
      if (a === 'menu') await title();
      else {
        const d0 = S.day; if (a === 'go' && x !== S.at) A.sfx('steps');
        if (a !== 'go' || x !== S.at) snap();
        await ACT[a](x);
        if (undo.length && undo[undo.length - 1] === JSON.stringify(S)) { undo.pop(); storeUndo(); } // nothing changed
        if (S.day > d0 && !S.finale && !S.over) setTimeout(() => A.sfx('dawn'), 500);
        closeModal(); save(); render(); await tail();
      }
    } finally { busy = false; closeModal(); save(); render(); }
  }

  UF.debug = { get S() { return S; }, set S(v) { S = v; render(); }, render, save };
  { const sv = load(); if (sv && sv.over && !localStorage.getItem(FIN)) { try { localStorage.setItem(FIN, JSON.stringify(sv)); } catch (e) { /* no room */ } } }
  legacyRecords();
  A.onReady = () => render();
  render(); busy = true; title().finally(() => { busy = false; save(); render(); });
})();
