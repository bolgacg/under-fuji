// Every tunable number lives here. tools/simulate.mjs reads the same file.
(globalThis.UF = globalThis.UF || {}).B = {
  days: 14, actions: 3, coins: 15, hp: 20,
  // answer multipliers: steady keeps a weak effect on a miss, overcharge gives nothing on a miss
  wrong: 0.4, bold: 1.5, blind: 2,
  rarity: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
  rbonus: [0, 0.15, 0.3, 0.45, 0.6],
  price: [8, 16, 30, 55, 100], sell: 0.4,
  // chance weights per rarity for each loot table
  loot: {
    road: [50, 32, 14, 4, 0], shop: [40, 35, 20, 5, 0],
    patience: [0, 30, 40, 30, 0], danger: [0, 15, 40, 33, 12], deep: [0, 0, 30, 42, 28],
  },
  dayScale: 0.035,              // enemies grow this much per day
  guard: { steady: [0.3, 0.7], bold: 0.15, blind: 0 },   // share of the blow that still lands
  boost: { steady: [0.6, 0.2], bold: 0.9, blind: 1.2 },  // bonus on the partner's next strike
  weaken: [0.5, 0.8],
  finishAt: 0.5, reviveHp: 6, shakenCoins: 0.2,
  herbHeal: 3, gather: [2, 1], riceBall: [4, 5],        // price, heal
  suggestUp: 0.85, suggestDown: 0.5, minSamples: 6,
  bossBless: 0.08,               // each blessing weakens the last enemy by this share
  tierCoins: [0, 4, 7, 11], tierLoot: [0, 0.35, 0.6, 0.85],
  namedChance: 0.55,             // a Rare or better find is a named treasure this often
  sealNeeds: 3,                  // blessings needed for the Sealing ending
};
