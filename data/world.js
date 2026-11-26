// Places, roads, Ways, techniques, herbs, remedies, items and enemies.
(function () {
  const UF = globalThis.UF = globalThis.UF || {};

  UF.WAYS = {
    chronicle: { n: 'Way of the Chronicle', s: 'History, mythology, politics', cats: [23, 20, 24], i: '📜', perk: 'Duel and Soothe questions are not made harder.' },
    earth: { n: 'Way of the Earth', s: 'Geography, animals, nature', cats: [22, 27, 17], i: '⛰️', perk: 'Gathering yields one extra herb.' },
    brush: { n: 'Way of the Brush', s: 'Art, books, music, theatre', cats: [25, 10, 12, 13], i: '🖌️', perk: 'Your rallying technique lifts your partner a quarter higher.' },
    stage: { n: 'Way of the Stage', s: 'Film, television, anime, comics', cats: [11, 14, 26, 31, 32, 29], i: '🎭', perk: 'A quarter more coins from every reward.' },
    game: { n: 'Way of the Game', s: 'Video games, board games, sports', cats: [15, 16, 21], i: '🎲', perk: 'One free question swap in every fight or trial.' },
    mind: { n: 'Way of the Mind', s: 'Computers, maths, gadgets, general knowledge', cats: [18, 19, 30, 28, 9], i: '🔭', perk: 'One free "remove two choices" in every fight or trial.' },
  };
  UF.DIFF = ['Easy', 'Medium', 'Hard'];

  // x, y on a 1600 x 640 map
  UF.PLACES = {
    edo: { n: 'Edo Market', x: 1450, y: 440, img: 'edo', market: 1, blurb: 'The largest city in the world, and every part of it is selling something.' },
    teahouse: { n: 'Crossroads Teahouse', x: 1130, y: 430, img: 'teahouse', blurb: 'Every road in the province passes this door sooner or later.' },
    festival: { n: 'Lantern Town', x: 890, y: 455, img: 'festival', market: 1, blurb: 'A post town where the festival never quite ends.' },
    seashrine: { n: 'Sea Shrine', x: 1290, y: 575, img: 'market', shrine: 1, blurb: 'A shrine on the water. The tide reads the prayers.' },
    coast: { n: 'Miho Pine Shore', x: 970, y: 585, img: 'coast', herb: 'kelp', bless: 'coast', blurb: 'Black sand, old pines and a sea with opinions.' },
    marsh: { n: 'Ukishima Marsh', x: 660, y: 530, img: 'marsh', herb: 'lotus', bless: 'marsh', blurb: 'Reeds, slow water, and lights that are not lanterns.' },
    foxshrine: { n: 'Fox Shrine', x: 400, y: 490, img: 'foxshrine', shrine: 1, blurb: 'A thousand red gates, and something small watching from each.' },
    forest: { n: 'Sea of Trees', x: 500, y: 330, img: 'forest', herb: 'mugwort', bless: 'forest', blurb: 'Aokigahara. The forest at the foot of Fuji, where compasses sleep.' },
    battlefield: { n: 'Field of Broken Banners', x: 220, y: 270, img: 'snow', blurb: 'Two armies died here in an afternoon. Neither has been told.' },
    cloudshrine: { n: 'Cloud Shrine', x: 1010, y: 300, img: 'cloudshrine', shrine: 1, blurb: 'The shrine of the blossom princess, halfway up the sky.' },
    pass: { n: 'Hakone Pass', x: 1240, y: 265, img: 'pass', herb: 'ginseng', bless: 'pass', blurb: 'A checkpoint, a cedar road, and crows that look like priests.' },
    springs: { n: 'Yumoto Hot Springs', x: 1450, y: 175, img: 'springs', herb: 'yuzu', bless: 'springs', blurb: 'Snow on the roofs, steam in the streets, monkeys in the bath.' },
    fuji: { n: 'The Mouth of Fuji', x: 760, y: 225, img: 'fuji', blurb: 'Hitoana, the lava cave where pilgrims go down to be born again.' },
  };
  UF.ROADS = [['edo', 'teahouse'], ['edo', 'seashrine'], ['edo', 'springs'], ['seashrine', 'coast'], ['coast', 'marsh'],
    ['coast', 'teahouse'], ['teahouse', 'festival'], ['teahouse', 'pass'], ['pass', 'springs'], ['pass', 'cloudshrine'],
    ['festival', 'cloudshrine'], ['festival', 'marsh'], ['marsh', 'foxshrine'], ['foxshrine', 'forest'],
    ['foxshrine', 'battlefield'], ['forest', 'battlefield'], ['forest', 'fuji'], ['cloudshrine', 'fuji']];

  UF.BLESS = {
    forest: { n: 'Blessing of the Kodama', i: '🌲' }, coast: { n: 'Blessing of the Dragon Tide', i: '🌊' },
    marsh: { n: 'Blessing of the Kappa Elder', i: '🥒' }, pass: { n: 'Blessing of the Great Tengu', i: '🦅' },
    springs: { n: 'Blessing of the Ember', i: '🔥' },
  };

  // n: [name for the Ronin, name for the Spirit-Talker]. own = damage to your own bar, other = to the partner's bar.
  UF.TECHS = {
    strike: { n: ['Iaido Cut', 'Ink Talisman'], own: 5 },
    guard: { n: ['Stand Guard', 'Paper Ward'], guard: 1 },
    rally: { n: ['Kiai Shout', 'Blessing Chant'], boost: 1 },
    forest: { n: ['Bamboo Splitter', 'Kodama Chorus'], own: 4, healAll: 2, src: 'forest' },
    coast: { n: ['Tide Cut', 'Dragon Tide'], own: 7, src: 'coast' },
    marsh: { n: ['Sumo Throw', 'Mire Bind'], own: 4, weaken: 1, src: 'marsh' },
    pass: { n: ['Tengu Wind', 'Crow Feather'], own: 3, other: 3, src: 'pass' },
    springs: { n: ['Ember Blade', 'Ember Brush'], own: 5, combo: 3, src: 'springs' },
    f_storm: { n: ['Storm in the Pines', 'Rain on the Pines'], own: 8, healAll: 2, need: ['forest', 'coast'] },
    f_gale: { n: ['Whirlpool Throw', 'Whirlpool Gale'], own: 5, other: 4, weaken: 1, need: ['marsh', 'pass'] },
    f_steam: { n: ['Steam Dragon Cut', 'Steam Dragon'], own: 10, need: ['coast', 'springs'] },
    f_leaves: { n: ['Thousand Leaves', 'Thousand Voices'], own: 4, other: 4, boost: 1, need: ['forest', 'pass'] },
  };
  UF.techText = (t, role) => {
    const own = role === 'ronin' ? 'Body' : 'Spirit', oth = role === 'ronin' ? 'Spirit' : 'Body', p = [];
    if (t.own) p.push(t.own + ' to ' + own);
    if (t.other) p.push(t.other + ' to ' + oth);
    if (t.combo) p.push('+' + t.combo + " if your partner's last answer was right");
    if (t.healAll) p.push('heals you both ' + t.healAll);
    if (t.weaken) p.push('halves the next blow');
    if (t.guard) p.push('You take the next blow, most of it turned aside');
    if (t.boost) p.push((t.own ? 'partner' : 'Partner') + "'s next strike +60%");
    return p.join(', ') + '.';
  };

  UF.HERBS = {
    mugwort: { n: 'Mugwort', i: '🌿' }, kelp: { n: 'Kelp', i: '🥬' }, lotus: { n: 'Lotus root', i: '🌸' },
    ginseng: { n: 'Ginseng', i: '🥕' }, yuzu: { n: 'Yuzu', i: '🍋' },
  };
  // key: the two herbs in alphabetical order
  UF.REMEDIES = {
    'kelp+mugwort': { n: 'Sea-Moxa Poultice', heal: 8, d: 'Heals the more hurt of you 8.' },
    'lotus+mugwort': { n: 'Marsh Tea', healAll: 5, d: 'Heals you both 5.' },
    'ginseng+mugwort': { n: "Traveller's Tonic", heal: 6, boostAll: 0.3, d: 'Heals one of you 6. In a fight, both next strikes +30%.' },
    'mugwort+yuzu': { n: 'Warm Compress', heal: 11, d: 'Heals the more hurt of you 11.' },
    'kelp+lotus': { n: 'Kappa Broth', healAll: 4, weaken: 1, d: 'Heals you both 4. In a fight, halves the next blow.' },
    'ginseng+kelp': { n: 'Dragon Tonic', boostAll: 0.6, healAll: 2, d: 'Heals you both 2. In a fight, both next strikes +60%.' },
    'kelp+yuzu': { n: 'Salt-Citrus Draught', heal: 6, fifty: 1, d: 'Heals one of you 6 and grants one "remove two choices".' },
    'ginseng+lotus': { n: "Monk's Stew", healAll: 7, d: 'Heals you both 7.' },
    'lotus+yuzu': { n: 'Lotus Incense', healAll: 4, spirit: 6, d: 'Heals you both 4. In a fight, 6 to Spirit.' },
    'ginseng+yuzu': { n: 'Fire Root Elixir', full: 1, d: 'Fully restores you both.' },
  };

  // t: relic (shared satchel, once per fight) or charm (worn by one of you). u: unique, never rolled as loot.
  UF.ITEMS = {
    smoke: { n: 'Smoke Bomb', t: 'relic', i: '💨', fx: { block: 1 }, d: () => 'Cancels the next blow.' },
    gourd: { n: 'Sake Gourd', t: 'relic', i: '🍶', fx: { heal: 5 }, d: v => `Heals the more hurt of you ${v.heal}.` },
    fan: { n: 'War Fan', t: 'relic', i: '🌀', fx: { boostAll: 0.3 }, d: v => `Both next strikes +${Math.round(v.boostAll * 100)}%.` },
    bell: { n: 'Temple Bell', t: 'relic', i: '🔔', fx: { spirit: 3 }, d: v => `${v.spirit} to Spirit, no question asked.` },
    caltrops: { n: 'Caltrops', t: 'relic', i: '✴️', fx: { body: 3 }, d: v => `${v.body} to Body, no question asked.` },
    cat: { n: 'Beckoning Cat', t: 'relic', i: '🐱', fx: { fifty: 1 }, d: (v, u) => `Remove two wrong choices, ${u} time${u > 1 ? 's' : ''} per fight or trial.` },
    crane: { n: 'Paper Crane', t: 'relic', i: '🕊️', fx: { swap: 1 }, d: (v, u) => `Swap a question for another, ${u} time${u > 1 ? 's' : ''} per fight or trial.` },
    magatama: { n: 'Jade Magatama', t: 'charm', i: '💚', fx: { dmg: 0.2 }, d: v => `Strikes +${Math.round(v.dmg * 100)}%.` },
    tsuba: { n: 'Iron Sword Guard', t: 'charm', i: '🛡️', fx: { armor: 0.15 }, d: v => `Blows against the wearer -${Math.round(v.armor * 100)}%.` },
    feather: { n: 'Crane Feather', t: 'charm', i: '🦢', fx: { hp: 4 }, d: v => `Resolve +${Math.round(v.hp)}.` },
    mask: { n: 'Fox Mask', t: 'charm', i: '🦊', fx: { wrong: 0.12 }, d: v => `A missed steady answer still lands at ${Math.round((0.4 + v.wrong) * 100)}% instead of 40%.` },
    purse: { n: "Merchant's Purse", t: 'charm', i: '👛', fx: { coin: 0.3 }, d: v => `Coins found +${Math.round(v.coin * 100)}%.` },
    // uniques
    flask: { n: "Tanuki's Bottomless Flask", t: 'relic', i: '🍵', u: 1, r: 3, fx: { healAll: 4 }, d: v => `Heals you both ${Math.round(v.healAll)}.` },
    drum: { n: 'The Hundred-Year Drum', t: 'relic', i: '🥁', u: 1, r: 3, fx: { body: 3, spirit: 3, boostAll: 0.2 }, d: v => `${Math.round(v.body)} to Body and to Spirit, both next strikes +${Math.round(v.boostAll * 100)}%.` },
    sketch: { n: 'Unfinished Sketch of a Wave', t: 'charm', i: '🌊', u: 1, r: 2, fx: { dmg: 0.15, hp: 2 }, d: v => `Strikes +${Math.round(v.dmg * 100)}%, Resolve +${Math.round(v.hp)}.` },
    robe: { n: 'Stolen Feather Robe', t: 'charm', i: '👘', u: 1, r: 4, fx: { armor: 0.2, dmg: 0.15 }, d: v => `Blows -${Math.round(v.armor * 100)}%, strikes +${Math.round(v.dmg * 100)}%. It is not yours.` },
    cup: { n: 'Cup of the Patient Guest', t: 'charm', i: '🍵', u: 1, r: 3, fx: { hp: 5, wrong: 0.1 }, d: v => `Resolve +${Math.round(v.hp)}, and a missed steady answer lands harder.` },
    mirror: { n: "The Handmaiden's Mirror", t: 'charm', i: '🔮', u: 1, r: 4, fx: { armor: 0.15, hp: 4 }, d: v => `Blows -${Math.round(v.armor * 100)}%, Resolve +${Math.round(v.hp)}.` },
    // named treasures: one of a kind, and each one changes how you play. Their numbers do not scale with rarity.
    daruma: { n: 'Lucky Daruma', t: 'charm', i: '⭕', named: 1, fixed: 1, r: 2, fx: { freeMiss: 1 }, d: () => "The wearer's first wrong answer in every fight counts as right." },
    tabi: { n: "Courier's Sandals", t: 'charm', i: '👟', named: 1, fixed: 1, r: 2, fx: { freeMove: 1 }, d: () => 'The first road you walk each day costs no action.' },
    beads: { n: "Monk's Prayer Beads", t: 'charm', i: '📿', named: 1, fixed: 1, r: 2, fx: { finishAt: 0.25 }, d: () => 'The wearer may try the finisher when the bar is still three quarters full.' },
    doll: { n: 'Paper Stand-In', t: 'relic', i: '📃', named: 1, fixed: 1, r: 2, fx: { ward: 1 }, d: () => 'Works by itself: once per fight, a blow that would shake one of you leaves them at 1 Resolve.' },
    cucumber: { n: "Kappa's Cucumber", t: 'relic', i: '🥒', named: 1, fixed: 1, r: 2, fx: { flip: 1 }, d: () => "The enemy's Body and Spirit trade places." },
    tail: { n: "Kitsune's Tail", t: 'charm', i: '🦊', named: 1, fixed: 1, r: 3, fx: { safety: 0.5 }, d: () => 'A missed Bold or Blind answer still lands at half strength.' },
    cranes: { n: 'Twin Cranes Netsuke', t: 'charm', i: '🕊️', named: 1, fixed: 1, r: 3, fx: { partnerHeal: 2 }, d: () => 'Whenever your partner answers right, the wearer heals 2.' },
    dice: { n: "Gambler's Dice", t: 'charm', i: '🎲', named: 1, fixed: 1, r: 3, fx: { boldAdd: 0.5 }, d: () => "The wearer's Bold answers give ×2 instead of ×1.5." },
    deadlamp: { n: 'Lantern of the Dead', t: 'charm', i: '🏮', named: 1, fixed: 1, r: 3, fx: { lowHp: 0.5 }, d: () => 'Strikes +50% while the wearer is below half Resolve.' },
    brush: { n: "Poet's Brush", t: 'charm', i: '🖌️', named: 1, fixed: 1, r: 3, fx: { streak: 0.15 }, d: () => 'Each right answer in a row in a fight adds 15% to the next strike. A miss breaks the chain.' },
    gourd2: { n: 'Spirit-Catching Gourd', t: 'relic', i: '🏺', named: 1, fixed: 1, r: 3, fx: { bounce: 1 }, d: () => "Swallows the enemy's next blow and spits it back at its larger bar." },
    rope: { n: 'Sacred Straw Rope', t: 'relic', i: '🎗️', named: 1, fixed: 1, r: 3, fx: { bind: 0.65 }, d: () => 'Binds the enemy: its blows are a third weaker for the rest of the fight.' },
    sakecup: { n: "Oni's Sake Cup", t: 'charm', i: '🍶', named: 1, fixed: 1, r: 4, fx: { blindAdd: 1, wrong: -0.4 }, d: () => "The wearer's Blind answers give ×3 instead of ×2, but a missed steady answer does nothing." },
    sunmirror: { n: 'Mirror of the Sun Goddess', t: 'charm', i: '☀️', named: 1, fixed: 1, r: 4, fx: { reflect: 0.5 }, d: () => 'Half of every blow against the wearer is thrown back at the enemy. Wear it and stand guard.' },
    hourglass: { n: 'Hourglass of the Dragon Palace', t: 'relic', i: '⏳', named: 1, fixed: 1, r: 4, fx: { again: 1 }, d: () => 'Whoever has already acted this round may act again.' },
    tengufan: { n: "Tengu's Feather Fan", t: 'relic', i: '🍃', named: 1, fixed: 1, r: 4, fx: { pct: 0.25 }, d: () => 'Blows away a quarter of what is left of both bars.' },
    thousandth: { n: 'The Thousandth Sword', t: 'charm', i: '⚔️', u: 1, fixed: 1, r: 4, fx: { cleave: 0.6 }, d: () => "The wearer's strikes also cut the other bar at 60% strength." },
  };

  // body and spirit bars, blow per round, tier 1 to 3, picture slot and emoji
  UF.ENEMIES = {
    bandit: { n: 'Road Bandits', body: 12, spirit: 5, atk: 3, tier: 1, img: 'fox', e: '🗡️' },
    ashigaru: { n: 'Checkpoint Patrol', body: 14, spirit: 5, atk: 3, tier: 1, img: 'spider', e: '⛑️' },
    kappa: { n: 'Kappa', body: 6, spirit: 12, atk: 3, tier: 1, img: 'marsh', e: '🐢' },
    lantern: { n: 'Lantern Ghost', body: 4, spirit: 10, atk: 2, tier: 1, img: 'battlefield', e: '🏮' },
    duelist: { n: 'Hired Swordsmen', body: 18, spirit: 7, atk: 4, tier: 2, img: 'fox', e: '⚔️' },
    yurei: { n: 'Yurei, a Lingering Ghost', body: 4, spirit: 18, atk: 4, tier: 2, img: 'ghost', e: '👻' },
    tengu: { n: 'The Great Tengu', body: 13, spirit: 15, atk: 4, tier: 2, img: 'tengu', e: '👺' },
    armour: { n: 'Possessed Armour', body: 13, spirit: 13, atk: 4, tier: 2, img: 'spider', e: '🎎' },
    yukionna: { n: 'Yuki-onna, the Snow Woman', body: 6, spirit: 20, atk: 4, tier: 2, img: 'ghost', e: '❄️' },
    kappaelder: { n: 'The Kappa Elder', body: 16, spirit: 11, atk: 4, tier: 2, img: 'marsh', e: '🐢' },
    benkei: { n: 'The Monk of the Bridge', body: 20, spirit: 9, atk: 4, tier: 2, img: 'spider', e: '🗡️' },
    gasha: { n: 'Gashadokuro, the Hungry Skeleton', body: 26, spirit: 26, atk: 5, tier: 3, img: 'snow', e: '💀', nofin: 1 },
    ashsamurai: { n: 'The Ash Guardian', body: 22, spirit: 11, atk: 5, tier: 3, img: 'spider', e: '🌋' },
    wraith: { n: 'The Following Lantern', body: 8, spirit: 25, atk: 5, tier: 3, img: 'battlefield', e: '🏮' },
    handmaiden: { n: 'The Stone Handmaiden', body: 20, spirit: 20, atk: 5, tier: 3, img: 'cave', e: '🗿' },
    oni: { n: 'The Oni of the Stair', body: 22, spirit: 17, atk: 5, tier: 3, img: 'moon', e: '👹' },
    iwanaga: { n: 'The Shadow of the Rock Princess', body: 40, spirit: 40, atk: 6.5, tier: 3, img: 'fuji', e: '🌑', boss: 1, nofin: 1 },
  };
})();
