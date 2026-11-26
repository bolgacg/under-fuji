// Music and sound effects, all synthesised in the browser. No audio files.
// Music is generated note by note from Japanese pentatonic scales, one mood per place and per kind of fight.
(function () {
  const UF = globalThis.UF, A = UF.A = {};
  const ls = k => localStorage.getItem('underfuji_' + k);
  // music: off, soft or full. sfx and narr: on or off. voice: the narrator's edge-tts voice id.
  const num = (k, d) => { const v = parseFloat(ls(k)); return isFinite(v) ? Math.max(0, Math.min(100, v)) : d; };
  // music, sfx, narr: on or off. vol: the three sliders in Settings, 0 to 100. voice: the narrator's voice id.
  const pref = A.pref = { music: ls('music') !== 'off', sfx: ls('sfx') !== 'off', narr: ls('narr') !== 'off',
    voice: ls('voice') || 'en-US-AndrewMultilingualNeural', vol: { music: num('vol_music', 50), sfx: num('vol_sfx', 70), narr: num('vol_narr', 100) } };
  let G = null, cur = null, curName = null, want = 'title', moodOut = null, step = 0, nextT = 0, moodStart = 0, speaking = null;
  // Sliders are squared so that half way sounds about half as loud. The music starts at 50, which is quiet enough
  // to sit under the narrator, and it steps back further while the narrator speaks.
  const musicLevel = () => (pref.music ? 0.5 * Math.pow(pref.vol.music / 100, 2) * (speaking ? 0.5 : 1) : 0);
  const sfxLevel = () => (pref.sfx ? Math.pow(pref.vol.sfx / 100, 2) : 0);
  const R = Math.random, pick = a => a[Math.floor(R() * a.length)];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // yo: bright folk scale. hira: the koto tuning hirajoshi. miyako: the dark city scale. insen and iwato: darker still.
  const SC = { yo: [0, 2, 5, 7, 9], hira: [0, 2, 3, 7, 8], miyako: [0, 1, 5, 7, 8], insen: [0, 1, 5, 7, 10], iwato: [0, 1, 5, 6, 10] };

  function build(ctx) {
    const g = { ctx }, comp = ctx.createDynamicsCompressor();
    g.master = ctx.createGain(); g.master.gain.value = 0.9; g.master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2; g.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = g.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = R() * 2 - 1;
    const il = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, il, ctx.sampleRate); // a plain hall echo
    for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < il; i++) x[i] = (R() * 2 - 1) * Math.pow(1 - i / il, 2.6); }
    g.verb = ctx.createConvolver(); g.verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.3; g.verb.connect(vg); vg.connect(g.master);
    // the music passes a low-pass filter, which takes the sharp edge off drums, flutes and bells
    const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2600; soft.Q.value = 0.5; soft.connect(g.master); soft.connect(g.verb);
    g.music = ctx.createGain(); g.music.gain.value = musicLevel(); g.music.connect(soft);
    g.sfx = ctx.createGain(); g.sfx.gain.value = sfxLevel(); g.sfx.connect(g.master); g.sfx.connect(g.verb);
    return g;
  }

  // One oscillator note. o: a attack, hold+r sustain then release, from/glide pitch scoop, to pitch slide, lp filter, vib vibrato.
  function tone(out, type, f, t, dur, vol, o) {
    o = o || {}; const c = G.ctx, osc = c.createOscillator(), g = c.createGain(), a = o.a || 0.005; osc.type = type;
    osc.frequency.setValueAtTime(o.from ? f * o.from : f, t);
    if (o.from) osc.frequency.exponentialRampToValueAtTime(f, t + (o.glide || 0.1));
    if (o.to) osc.frequency.exponentialRampToValueAtTime(f * o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.hold) { g.gain.setValueAtTime(vol, t + Math.max(a, dur - (o.r || 0.2))); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = osc;
    if (o.lp) {
      const fl = c.createBiquadFilter(); fl.type = o.ft || 'lowpass'; fl.Q.value = o.q || 0.7; fl.frequency.setValueAtTime(o.lp, t);
      if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); osc.connect(fl); n = fl;
    }
    if (o.vib) {
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vibHz || 5.5;
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * o.vib, t + dur * 0.6);
      l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1);
    }
    n.connect(g); g.connect(out); osc.start(t); osc.stop(t + dur + 0.1);
  }
  // Filtered noise: breath, wind, drum skins, sword swishes.
  function hiss(out, t, dur, vol, o) {
    o = o || {}; const c = G.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), a = o.a || 0.004;
    s.buffer = G.noise; s.loop = true; fl.type = o.ft || 'bandpass'; fl.Q.value = o.q || 1; fl.frequency.setValueAtTime(o.f || 1000, t);
    if (o.fTo) fl.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.hold) { g.gain.setValueAtTime(vol, t + Math.max(a, dur - (o.r || 0.3))); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t, R() * 1.5); s.stop(t + dur + 0.1);
  }

  // ---------- instruments ----------
  const I = {
    koto(out, f, t, v, bend) { tone(out, 'triangle', f, t, 2.0, v, { lp: 3200, lpTo: 500, to: bend ? 1.059 : 0 }); tone(out, 'sawtooth', f * 1.003, t, 1.1, v * 0.3, { lp: 2400, lpTo: 400 }); hiss(out, t, 0.03, v * 0.5, { f: 2600, q: 2 }); },
    shami(out, f, t, v) { tone(out, 'sawtooth', f, t, 0.5, v, { lp: 1900, ft: 'bandpass', q: 2.5 }); tone(out, 'square', f, t, 0.25, v * 0.25, { lp: 3000 }); hiss(out, t, 0.025, v * 0.7, { f: 3500, q: 1.5 }); },
    flute(out, f, t, dur, v) { tone(out, 'sine', f, t, dur, v, { a: 0.09, hold: 1, r: 0.25, from: 0.94, glide: 0.12, vib: 0.012 }); tone(out, 'triangle', f * 2, t, dur, v * 0.12, { a: 0.12, hold: 1, r: 0.25 }); hiss(out, t, dur, v * 0.22, { f: f * 2, q: 3, a: 0.06, hold: 1, r: 0.25 }); },
    // the high stage flute whose rising wail announces a ghost
    nokan(out, f, t, dur, v) { tone(out, 'sine', f, t, dur, v, { a: 0.05, hold: 1, r: 0.4, from: 0.6, glide: dur * 0.35, vib: 0.03, vibHz: 7 }); hiss(out, t, dur, v * 0.3, { f: f * 1.5, q: 4, a: 0.05, hold: 1, r: 0.4 }); },
    taiko(out, t, v, f) { f = f || 82; tone(out, 'sine', f, t, 0.7, v, { from: 1.9, glide: 0.07, to: 0.6 }); hiss(out, t, 0.14, v * 0.5, { ft: 'lowpass', f: 500 }); },
    shime(out, t, v) { tone(out, 'sine', 240, t, 0.13, v, { from: 1.4, glide: 0.03 }); hiss(out, t, 0.06, v * 0.6, { f: 1300, q: 1.2 }); },
    clack(out, t, v, f) { f = f || 1500; tone(out, 'sine', f, t, 0.07, v); tone(out, 'sine', f * 1.48, t, 0.05, v * 0.6); hiss(out, t, 0.02, v * 0.6, { ft: 'highpass', f: 2500 }); },
    bell(out, f, t, v, dur) { [1, 2.76, 5.4, 8.93].forEach((p, i) => tone(out, 'sine', f * p, t, (dur || 4) / (1 + i * 0.7), v / (1 + i * 1.3))); },
    sho(out, fs, t, dur, v) { fs.forEach(f => tone(out, 'sawtooth', f, t, dur, v, { a: dur * 0.3, hold: 1, r: dur * 0.4, lp: 2200, vib: 0.002, vibHz: 4 })); },
    wind(out, t, dur, v, f) { hiss(out, t, dur, v, { f: f || 500, fTo: (f || 500) * 1.6, q: 0.8, a: dur * 0.45, hold: 1, r: dur * 0.5 }); },
    conch(out, t, v) { tone(out, 'sawtooth', 98, t, 3.2, v, { a: 0.5, hold: 1, r: 1, from: 0.8, glide: 0.6, lp: 500 }); },
    pon(out, t, v) { tone(out, 'sine', 330, t, 0.25, v, { to: 1.45 }); hiss(out, t, 0.04, v * 0.5, { f: 900, q: 1 }); }, // the hand drum whose pitch rises
  };

  // ---------- music: one generator per mood. s counts sixteenth notes. ----------
  const deg = (m, d) => { const L = m.scale.length, k = ((d % L) + L) % L; return hz(m.root + m.scale[k] + 12 * Math.floor(d / L)); };
  const walk = (m, lo, hi, key) => { key = key || 'pos'; const p = m[key] === undefined ? Math.round((lo + hi) / 2) : m[key]; return (m[key] = Math.max(lo, Math.min(hi, p + pick([-2, -1, -1, 0, 1, 1, 2])))); };
  const bar = s => Math.floor(s / 16), at = (s, ...xs) => xs.includes(s % 16);
  const M = {
    // teahouse, title: slow solo koto
    koto: { bpm: 60, root: 62, scale: SC.hira, vol: 1, play(s, t, o, m) {
      if (s % 16 === 0) I.koto(o, deg(m, -5), t, 0.22);
      if (s % 4 === 0 && R() < 0.7) I.koto(o, deg(m, walk(m, 0, 9)), t, 0.2, R() < 0.15);
      if (s % 16 === 8 && R() < 0.25) [0, 1, 2, 3].forEach(k => I.koto(o, deg(m, (m.pos || 4) + k), t + k * 0.09, 0.12));
    } },
    // Edo: busy shamisen with a small drum
    edo: { bpm: 96, root: 62, scale: SC.yo, vol: 1, play(s, t, o, m) {
      if (s % 2 === 0 && R() < 0.5) I.shami(o, deg(m, walk(m, 0, 8)), t, 0.16);
      if (s % 16 === 0) I.taiko(o, t, 0.3); if (at(s, 4, 12)) I.shime(o, t, 0.2);
      if (s % 16 === 14 && R() < 0.5) I.clack(o, t, 0.15);
      if (s % 32 === 16 && R() < 0.5) I.flute(o, deg(m, 5 + pick([0, 2, 4])), t, 1.2, 0.1);
    } },
    // Lantern Town: festival drums, hand gong and a bamboo flute
    festival: { bpm: 112, root: 67, scale: SC.yo, vol: 0.7, play(s, t, o, m) {
      if (at(s, 0, 4, 8, 10)) I.taiko(o, t, 0.3); if (at(s, 2, 6, 12, 14)) I.shime(o, t, 0.15);
      if (s % 16 === 6) I.bell(o, 1400, t, 0.04, 0.3);
      const rest = bar(s) % 4 === 3 && s % 16 >= 8;
      if (!rest && s % 2 === 0 && R() < 0.55) I.flute(o, deg(m, walk(m, 5, 11)), t, 0.26, 0.12);
    } },
    // shrines: the mouth organ of court music, a bowl bell, one long flute line
    shrine: { bpm: 50, root: 69, scale: SC.insen, vol: 1, play(s, t, o, m) {
      if (s % 32 === 0) I.sho(o, [deg(m, 5), deg(m, 7), deg(m, 8), deg(m, 10)], t, 11, 0.022);
      if (s % 32 === 12) I.bell(o, deg(m, 10), t, 0.12, 5);
      if (s % 16 === 4 && R() < 0.55) I.flute(o, deg(m, walk(m, 0, 7)), t, 2.6, 0.15);
    } },
    // Sea of Trees: wind, a low flute, and the tree spirits knocking three times
    forest: { bpm: 46, root: 60, scale: SC.iwato, vol: 1, play(s, t, o, m) {
      if (s % 16 === 0) I.wind(o, t, 6.5, 0.1, 420);
      if (s % 8 === 2 && R() < 0.45) I.flute(o, deg(m, walk(m, -3, 4)), t, 3, 0.14);
      if (s % 16 === 8 && R() < 0.4) [0, 1, 2].forEach(k => I.clack(o, t + k * 0.22, 0.18, 880));
    } },
    // Miho shore: surf and rolling koto
    coast: { bpm: 72, root: 64, scale: SC.yo, vol: 1, play(s, t, o, m) {
      if (s % 16 === 0) I.wind(o, t, 4, 0.12, 300);
      if (s % 2 === 0 && R() < 0.8) I.koto(o, deg(m, [0, 2, 4, 5, 7, 5, 4, 2][(s / 2) % 8] + (bar(s) % 2 ? 1 : 0)), t, 0.16);
      if (s % 32 === 16 && R() < 0.5) I.flute(o, deg(m, walk(m, 5, 9)), t, 2.5, 0.1);
    } },
    // the marsh: low bent plucks, drips, and wandering ghost lights
    marsh: { bpm: 54, root: 59, scale: SC.insen, vol: 1.5, play(s, t, o, m) {
      if (s % 4 === 0 && R() < 0.33) I.koto(o, deg(m, walk(m, -5, 2)), t, 0.22, R() < 0.4);
      if (R() < 0.05) tone(o, 'sine', 1700, t, 0.09, 0.06, { to: 0.7 });
      if (s % 16 === 6 && R() < 0.35) tone(o, 'sine', 700 + R() * 300, t, 2, 0.035, { a: 0.6, hold: 1, r: 0.9, to: 1.5, vib: 0.01 });
      if (s % 32 === 0) I.wind(o, t, 7, 0.05, 250);
    } },
    // Hakone: mountain wind and a wandering flute
    pass: { bpm: 58, root: 64, scale: SC.hira, vol: 0.65, play(s, t, o, m) {
      if (s % 16 === 0) { I.wind(o, t, 5, 0.09, 600); I.koto(o, deg(m, -5), t, 0.16); }
      if (s % 4 === 0 && R() < 0.5) I.flute(o, deg(m, walk(m, 0, 8)), t, 1.2 + R() * 1.2, 0.15);
    } },
    // hot springs: easy koto, a shamisen answering, water bubbling
    springs: { bpm: 80, root: 60, scale: SC.yo, vol: 1, play(s, t, o, m) {
      if (s % 4 === 0 && R() < 0.72) I.koto(o, deg(m, walk(m, 0, 9)), t, 0.2);
      if (s % 4 === 2 && R() < 0.25) I.shami(o, deg(m, walk(m, 0, 6, 'p2')), t, 0.12);
      if (s % 16 === 0) hiss(o, t, 3.2, 0.035, { ft: 'lowpass', f: 700, a: 1, hold: 1, r: 1.5 });
      if (R() < 0.06) tone(o, 'sine', 500 + R() * 500, t, 0.07, 0.04, { to: 1.6 });
    } },
    // the battlefield: a drum like a heartbeat, a war conch far off
    battlefield: { bpm: 60, root: 45, scale: SC.iwato, vol: 1, play(s, t, o, m) {
      if (at(s, 0, 3)) I.taiko(o, t, s % 16 ? 0.3 : 0.5, 62);
      if (s % 16 === 0) I.wind(o, t, 5, 0.09, 350);
      if (s % 8 === 4 && R() < 0.5) I.flute(o, deg(m, walk(m, 3, 9)), t, 2.8, 0.13);
      if (s % 64 === 32) I.conch(o, t, 0.1);
    } },
    // inside Fuji: a drone on the tritone, drum rolls rising, a deep bell
    fuji: { bpm: 52, root: 43, scale: SC.iwato, vol: 1, play(s, t, o, m) {
      if (s % 32 === 0) { tone(o, 'sawtooth', hz(m.root), t, 10.5, 0.09, { a: 3, hold: 1, r: 3, lp: 260 }); tone(o, 'sawtooth', hz(m.root + 6), t, 10.5, 0.05, { a: 4, hold: 1, r: 3, lp: 240 }); }
      if (bar(s) % 2 === 1 && s % 2 === 0) I.taiko(o, t, 0.08 + 0.1 * ((s % 16) / 16), 55);
      if (s % 64 === 16) I.bell(o, hz(m.root + 12), t, 0.16, 7);
      if (s % 32 === 20 && R() < 0.4) I.nokan(o, deg(m, 16), t, 2, 0.05);
    } },
    // a fight with mortals: driving drums and a hard shamisen
    battle: { fight: 1, bpm: 124, root: 62, scale: SC.miyako, vol: 1, play(s, t, o, m) {
      if (at(s, 0, 6, 8, 14)) I.taiko(o, t, s % 8 ? 0.28 : 0.42); else if (at(s, 4, 12)) I.shime(o, t, 0.1);
      if (s % 2 === 0 && R() < 0.6) I.shami(o, deg(m, R() < 0.3 ? m.pos || 0 : walk(m, -2, 6)), t, 0.14);
    } },
    // a fight with a spirit: the theatre's ghost cue, a rolling drum under a wailing flute
    yokai: { fight: 1, bpm: 104, root: 62, scale: SC.iwato, vol: 1, play(s, t, o, m) {
      const sw = Math.sin(Math.PI * ((s % 32) / 32)), v = sw * sw;
      if (s % 2 === 0 || v > 0.6) I.shime(o, t, 0.03 + 0.12 * v); if (s % 4 === 0) I.taiko(o, t, 0.05 + 0.14 * v, 60);
      if (s % 64 === 8) I.nokan(o, deg(m, pick([7, 8, 9])), t, 2.4, 0.08);
      if (s % 8 === 0 && R() < 0.5) I.shami(o, deg(m, pick([0, 3, -2])), t, 0.2);
      if (s % 64 === 0) I.bell(o, hz(50), t, 0.14, 6);
    } },
    // the last fight: both at once
    boss: { fight: 1, bpm: 132, root: 60, scale: SC.iwato, vol: 0.85, play(s, t, o, m) {
      M.battle.play(s, t, o, m);
      if (s % 64 === 16) I.nokan(o, deg(m, 8), t, 2, 0.07);
      if (s % 64 === 0) I.bell(o, hz(41), t, 0.2, 7);
    } },
  };
  M.title = M.koto; M.ending = Object.assign({}, M.koto, { scale: SC.yo, bpm: 56 });
  A.placeMood = { edo: 'edo', festival: 'festival', teahouse: 'koto', seashrine: 'shrine', foxshrine: 'shrine', cloudshrine: 'shrine',
    forest: 'forest', coast: 'coast', marsh: 'marsh', pass: 'pass', springs: 'springs', battlefield: 'battlefield', fuji: 'fuji' };

  function setMood(name) {
    want = name; if (!G || name === curName) return;
    const c = G.ctx, now = c.currentTime;
    if (moodOut) { const old = moodOut; old.gain.cancelScheduledValues(now); old.gain.setValueAtTime(old.gain.value, now); old.gain.linearRampToValueAtTime(0, now + 1.2); setTimeout(() => old.disconnect(), 6000); }
    curName = name; cur = Object.assign({}, M[name] || M.koto); delete cur.pos; delete cur.p2;
    moodOut = c.createGain(); moodOut.gain.setValueAtTime(0, now); moodOut.gain.linearRampToValueAtTime(cur.vol || 1, now + 1); moodOut.connect(G.music);
    step = 0; nextT = now + 0.4; moodStart = now;
  }
  // Calm moods breathe: six bars of music, then two of silence. After a minute in one place the music steps back.
  function tick() {
    if (!G || !cur || !pref.music || G.ctx.state !== 'running') return;
    const now = G.ctx.currentTime; if (nextT < now) nextT = now + 0.05;
    if (!cur.fight && !cur.settled && now - moodStart > 60) { cur.settled = 1; moodOut.gain.setTargetAtTime((cur.vol || 1) * 0.55, now, 8); }
    while (nextT < now + 0.3) { if (cur.fight || Math.floor(step / 16) % 8 < 6) cur.play(step, nextT, moodOut, cur); nextT += 15 / cur.bpm; step++; }
  }

  // ---------- sound effects ----------
  const S = {
    tick: (o, t) => I.clack(o, t, 0.04, 1100),
    right: (o, t) => { I.koto(o, hz(74), t, 0.25); I.koto(o, hz(79), t + 0.11, 0.28); I.bell(o, hz(86), t + 0.11, 0.08, 1.5); },
    wrong: (o, t) => { I.shami(o, hz(50), t, 0.3); I.shami(o, hz(51), t + 0.02, 0.25); I.taiko(o, t, 0.3, 60); },
    slash: (o, t) => { hiss(o, t, 0.22, 0.5, { f: 6000, fTo: 900, q: 1.2 }); tone(o, 'sine', 2900, t + 0.12, 0.35, 0.12); tone(o, 'sine', 4350, t + 0.12, 0.25, 0.07); },
    talisman: (o, t) => { [0, 1, 2].forEach(k => hiss(o, t + k * 0.05, 0.05, 0.2, { ft: 'highpass', f: 3000 })); I.bell(o, hz(81), t + 0.1, 0.16, 1.6); tone(o, 'sine', hz(88), t + 0.1, 0.8, 0.07, { to: 1.5 }); },
    guard: (o, t) => { I.clack(o, t, 0.35, 700); I.shime(o, t + 0.02, 0.3); },
    rally: (o, t) => { I.taiko(o, t, 0.5, 100); I.flute(o, hz(81), t + 0.05, 0.5, 0.14); },
    hurt: (o, t) => { I.taiko(o, t, 0.75, 55); hiss(o, t, 0.25, 0.3, { ft: 'lowpass', f: 900 }); },
    heal: (o, t) => { [62, 64, 67, 69, 74].forEach((m, k) => I.koto(o, hz(m + 12), t + k * 0.08, 0.14)); I.bell(o, hz(86), t + 0.4, 0.07, 2); },
    coin: (o, t) => { tone(o, 'sine', 2400, t, 0.18, 0.32); tone(o, 'sine', 3600, t + 0.07, 0.25, 0.26); },
    // a run up the koto, longer for rarer finds
    loot: (o, t, r) => { r = r || 0; const sc = [62, 64, 67, 69, 71, 74, 76, 79, 81, 83]; for (let k = 0; k < 5 + r; k++) I.koto(o, hz(sc[k] + 12), t + k * 0.055, 0.16); if (r >= 3) I.bell(o, hz(86), t + 0.4, 0.14, 3); if (r >= 4) S.gong(o, t + 0.45); },
    steps: (o, t) => { [0, 0.16, 0.34, 0.5].forEach((d, k) => I.clack(o, t + d, 0.12, k % 2 ? 520 : 600)); }, // wooden sandals
    dawn: (o, t) => I.bell(o, hz(45), t, 0.35, 7), // the temple bell at daybreak
    bless: (o, t) => { I.sho(o, [hz(81), hz(83), hz(86), hz(88)], t, 4, 0.03); I.bell(o, hz(93), t + 0.3, 0.14, 4); },
    win: (o, t) => { I.taiko(o, t, 0.6); I.taiko(o, t + 0.22, 0.7); [74, 76, 79, 81].forEach((m, k) => I.flute(o, hz(m + 12), t + 0.3 + k * 0.1, 0.16, 0.14)); },
    finish: (o, t) => { I.bell(o, hz(88), t, 0.25, 5); I.bell(o, hz(81), t + 0.5, 0.15, 5); },
    lose: (o, t) => { tone(o, 'sine', hz(69), t, 2.2, 0.2, { a: 0.1, hold: 1, r: 0.6, to: 0.7, vib: 0.02 }); I.taiko(o, t + 0.1, 0.4, 50); },
    gong: (o, t) => { I.bell(o, hz(38), t, 0.3, 8); I.taiko(o, t, 0.5, 48); hiss(o, t, 3, 0.12, { ft: 'lowpass', f: 1200, fTo: 200, a: 0.02 }); },
    // "hyu-dorodoro": the flute wail and drum roll that bring a ghost on stage
    yokai: (o, t) => { I.nokan(o, hz(84), t, 1.8, 0.1); for (let k = 0; k < 14; k++) I.shime(o, t + 0.3 + k * 0.07, 0.03 + 0.01 * k); },
    // wooden clappers speeding up, as before a sword scene in the theatre
    clappers: (o, t) => { let x = 0, gap = 0.34; for (let k = 0; k < 6; k++) { I.clack(o, t + x, 0.18, 1000); x += gap; gap *= 0.78; } },
    eerie: (o, t) => { I.nokan(o, hz(84), t, 1.6, 0.05); I.bell(o, hz(52), t + 0.2, 0.12, 5); },
    danger: (o, t) => { I.taiko(o, t, 0.6, 55); I.taiko(o, t + 0.35, 0.45, 55); I.conch(o, t + 0.2, 0.08); },
    pon: (o, t) => { I.shami(o, hz(69), t, 0.2); I.shami(o, hz(74), t + 0.12, 0.2); I.pon(o, t + 0.3, 0.3); },
    brew: (o, t) => { hiss(o, t, 0.9, 0.4, { f: 900, fTo: 2200, q: 2, a: 0.1 }); tone(o, 'sine', 600, t + 0.2, 0.5, 0.15, { to: 1.8 }); },
  };

  // ---------- public ----------
  A.unlock = () => {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return;
    if (!G) { G = build(new AC()); setInterval(tick, 90); setMood(want); loadClips(); }
    if (G.ctx.state === 'suspended') G.ctx.resume();
  };
  A.mood = setMood;
  A.sfx = (name, x) => { if (G && pref.sfx && S[name] && G.ctx.state === 'running') S[name](G.sfx, G.ctx.currentTime + 0.02, x); };
  const setMusic = () => { if (G) G.music.gain.setTargetAtTime(musicLevel(), G.ctx.currentTime, 0.25); };
  const setSfx = () => { if (G) G.sfx.gain.setTargetAtTime(sfxLevel(), G.ctx.currentTime, 0.1); };
  A.toggle = k => {
    pref[k] = !pref[k]; localStorage.setItem('underfuji_' + k, pref[k] ? 'on' : 'off');
    if (k === 'music') setMusic(); if (k === 'sfx') setSfx(); if (k === 'narr' && !pref.narr) A.hush();
  };
  A.setVol = (k, v) => {
    pref.vol[k] = Math.max(0, Math.min(100, +v || 0)); localStorage.setItem('underfuji_vol_' + k, pref.vol[k]);
    if (k === 'music') setMusic(); if (k === 'sfx') setSfx(); if (k === 'narr' && speaking) speaking.volume = pref.vol.narr / 100;
  };


  // ---------- the narrator: pre-rendered clips, one per story text, each named after a hash of its text ----------
  let clips = null, clipsAt = 0, clipsDone = false;
  A.hash = s => { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  function loadClips() {
    clipsAt = Date.now();
    return fetch(`assets/voice/${pref.voice}/manifest.json`, { cache: 'no-store' }).then(r => r.json())
      .then(j => { clips = new Set(j.clips); clipsDone = !!j.done; if (A.onReady) A.onReady(); }).catch(() => { clips = clips || new Set(); clipsDone = true; }); // no clips published with this copy: do not ask again
  }
  A.hasClips = () => !!(clips && clips.size);
  const quiet = el => { if (speaking === el) { speaking = null; setMusic(); } };
  A.hush = () => { if (speaking) { const el = speaking; el.pause(); quiet(el); } };
  A.say = text => {
    A.hush(); if (!pref.narr || !text) return;
    if (!clips || (!clipsDone && Date.now() - clipsAt > 15000)) loadClips();
    const k = A.hash(text); if (!clips || !clips.has(k)) return;
    const el = new Audio(`assets/voice/${pref.voice}/${k}.mp3`); el.volume = pref.vol.narr / 100; speaking = el; setMusic();
    el.onended = el.onerror = () => quiet(el); el.play().catch(() => quiet(el));
  };
  A.setVoice = v => { pref.voice = v; localStorage.setItem('underfuji_voice', v); clips = null; clipsDone = false; return loadClips(); };
  A.sample = v => { A.hush(); const el = new Audio(`assets/voice/samples/${v}.mp3`); el.volume = pref.vol.narr / 100; speaking = el; setMusic(); el.onended = el.onerror = () => quiet(el); el.play().catch(() => quiet(el)); };
  // Render a mood or an effect off-line and report its loudness. Used to balance levels without ears.
  A.measure = async (name, secs, isSfx) => {
    const keep = G, oc = new OfflineAudioContext(2, Math.floor(44100 * secs), 44100);
    G = build(oc); G.music.gain.value = 0.5 * 0.25; G.sfx.gain.value = 0.49; // the default slider positions
    if (isSfx) S[name](G.sfx, 0.05, 2);
    else { const m = Object.assign({}, M[name]), out = oc.createGain(); out.gain.value = m.vol || 1; out.connect(G.music); let t = 0.05, s = 0; while (t < secs - 0.5) { m.play(s, t, out, m); t += 15 / m.bpm; s++; } }
    G = keep;
    const d = (await oc.startRendering()).getChannelData(0); let peak = 0, sq = 0;
    for (let i = 0; i < d.length; i++) { const x = Math.abs(d[i]); if (x > peak) peak = x; sq += x * x; }
    const db = x => +(20 * Math.log10(Math.max(x, 1e-6))).toFixed(1);
    return { name, peak: db(peak), rms: db(Math.sqrt(sq / d.length)) };
  };
  A.names = { moods: Object.keys(M), sfx: Object.keys(S) };
})();
