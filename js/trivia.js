// Question draw, the lenient judge for typed answers, and hit-rate tracking.
(function () {
  const UF = globalThis.UF, B = UF.B, E = UF.E, T = UF.T = {};
  let buckets = null;
  const build = () => {
    buckets = {};
    (UF.Q || []).forEach((q, i) => { const k = q[0] + '|' + q[1] + '|' + q[2]; (buckets[k] = buckets[k] || []).push(i); });
  };

  // Can this question be answered without seeing the choices?
  T.typedOK = q => q[2] === 'm' && q[4].length <= 28 && !/^(all|none|both|neither)\b/i.test(q[4]) &&
    !/which (one )?of|of th(e|ese) following|following|these|\bNOT\b|which is|what is not|isn't|is not|except/i.test(q[3]);

  // i: player index. o: { d: steps harder, m: 'c' choices | 't' typed | 'b' true or false, lore }
  T.draw = (S, i, o) => {
    o = o || {};
    if (o.lore) {
      if (typeof o.lore === 'string') { const L = UF.LORE.find(x => x.id === o.lore); return { ...L, lore: 1, cat: 'Lore of the mountain', d: 1 }; }
      let pool = UF.LORE.map((x, k) => k).filter(k => !UF.LORE[k].id && !S.usedL.includes(k));
      if (!pool.length) { S.usedL = []; pool = UF.LORE.map((x, k) => k).filter(k => !UF.LORE[k].id); }
      const k = E.pick(pool); S.usedL.push(k);
      return { ...UF.LORE[k], lore: 1, cat: 'Lore of old Japan', d: 1 };
    }
    if (!buckets) build();
    const p = S.P[i], softer = p.ways.filter(w => w.d < 2), type = o.m === 'b' ? 'b' : 'm';
    const way = E.pick(o.d > 0 && softer.length ? softer : p.ways); // a harder question comes from a Way that can still get harder
    const want = Math.max(0, Math.min(2, way.d + (o.d || 0)));
    const used = new Set(S.usedQ);
    for (const d of [want, want - 1, want + 1, want - 2, want + 2]) {
      if (d < 0 || d > 2) continue;
      let pool = [];
      UF.WAYS[way.id].cats.forEach(c => { pool = pool.concat(buckets[c + '|' + d + '|' + type] || []); });
      pool = pool.filter(k => !used.has(k) && (o.m !== 't' || T.typedOK(UF.Q[k])));
      if (pool.length) {
        const k = E.pick(pool), q = UF.Q[k]; S.usedQ.push(k);
        return { way: way.id, cat: UF.QCATS[q[0]], d: q[1], type: q[2], q: q[3], a: q[4], wrong: q[5] };
      }
    }
    S.usedQ = []; // the whole Way has been asked: start over
    return T.draw(S, i, o);
  };

  // ---------- the judge ----------
  const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const WEAK = new Set(['north', 'south', 'east', 'west', 'new', 'saint', 'king', 'queen', 'lake', 'mount', 'river', 'city',
    'united', 'great', 'the', 'and', 'of', 'war', 'battle', 'prince', 'princess', 'lord', 'lady', 'sir']);
  T.norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, ' ')
    .replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(/\b(the|a|an)\b/g, ' ')
    .split(/\s+/).filter(Boolean).map(w => (NUM.indexOf(w) >= 0 ? String(NUM.indexOf(w)) : w)).join(' ');
  // edit distance where swapping two neighbouring letters counts as one slip
  T.dist = (a, b) => {
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; for (let j = 1; j <= b.length; j++) d[i][j] = i ? 0 : j; }
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  };
  const close = (x, y) => (/^\d+$/.test(y) ? x === y : T.dist(x, y) <= Math.floor(y.length / 5) + (y.length >= 4 && y.length < 5 ? 1 : 0));
  T.judge = (input, answer, alts) => {
    const x = T.norm(input); if (!x) return false;
    for (const raw of [answer].concat(alts || [])) {
      const y = T.norm(raw); if (!y) continue;
      if (x === y || close(x, y) || close(x.replace(/ /g, ''), y.replace(/ /g, ''))) return true;
      const yw = y.split(' '), xw = x.split(' ');
      // the full answer inside a longer reply
      if (xw.length > yw.length && xw.length <= yw.length + 3 && (' ' + x + ' ').includes(' ' + y + ' ')) return true;
      // a surname or first name alone
      if (yw.length > 1 && yw.length <= 4 && xw.length === 1 && x.length >= 4) {
        for (const w of [yw[0], yw[yw.length - 1]]) if (w.length >= 4 && !WEAK.has(w) && close(x, w)) return true;
      }
    }
    return false;
  };

  // ---------- hit rates per Way, steady answers only ----------
  T.record = (S, i, way, ok) => { if (!way) return; const r = S.P[i].rec[way] = S.P[i].rec[way] || [0, 0]; r[1]++; if (ok) r[0]++; };
  T.suggest = (S, i) => S.P[i].ways.map(w => {
    const r = S.P[i].rec[w.id]; if (!r || r[1] < B.minSamples) return null;
    const rate = r[0] / r[1];
    if (rate > B.suggestUp && w.d < 2) return { way: w.id, to: w.d + 1, rate };
    if (rate < B.suggestDown && w.d > 0) return { way: w.id, to: w.d - 1, rate };
    return null;
  }).filter(Boolean);
})();
