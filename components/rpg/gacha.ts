// Gacha rules shared by the client UI and the server API routes (no React, no browser APIs).

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type PullType = 'normal' | 'lucky';
export type GachaRarity = Exclude<Rarity, 'common'>;

export const RARITY_INFO: Record<Rarity, { name: string; color: string }> = {
  common: { name: 'Common', color: '#94a3b8' },
  rare: { name: 'Rare', color: '#38bdf8' },
  epic: { name: 'Epic', color: '#a855f7' },
  legendary: { name: 'Legendary', color: '#f59e0b' },
  mythic: { name: 'Mythic', color: '#f43f5e' },
};

export const GACHA_RARITIES: GachaRarity[] = ['rare', 'epic', 'legendary', 'mythic'];

// Characters not listed here are common: everyone has them from the start.
export const CHARACTER_RARITY: Record<string, GachaRarity> = {
  ghost: 'rare',
  grimsby: 'rare',
  corsair: 'rare',
  falconer: 'rare',
  prospector: 'rare',
  bard: 'rare',
  alchemist: 'rare',
  ronin: 'rare',
  gladiator: 'rare',
  null: 'epic',
  revenant: 'epic',
  puppeteer: 'epic',
  dragoon: 'epic',
  tidecaller: 'epic',
  automaton: 'epic',
  solaris: 'legendary',
  aurora: 'legendary',
  celestia: 'legendary',
  archon: 'legendary',
  paradox: 'mythic',
  genesis: 'mythic',
  oblivion: 'mythic',
};

export function rarityOf(characterId: string): Rarity {
  return CHARACTER_RARITY[characterId] ?? 'common';
}

export const GACHA_CHARACTERS = Object.keys(CHARACTER_RARITY);

export const PULL_COST: Record<PullType, number> = { normal: 20, lucky: 70 };

// Percent chance of each rarity per pull. Each row adds up to 100.
export const PULL_RATES: Record<PullType, Record<GachaRarity, number>> = {
  normal: { rare: 70, epic: 22, legendary: 7, mythic: 1 },
  lucky: { rare: 35, epic: 39, legendary: 21, mythic: 5 },
};

// Buying a specific character outright always costs more than summoning for one on average.
export const SHOP_PRICE: Record<GachaRarity, number> = { rare: 300, epic: 650, legendary: 1300, mythic: 4500 };

// Pulling a character you already own gives some shards back.
export const DUPLICATE_REFUND: Record<GachaRarity, number> = { rare: 5, epic: 12, legendary: 30, mythic: 80 };

export const SHARDS_PER_LEVEL = 5;

export interface PullResult {
  characterId: string;
  rarity: GachaRarity;
  duplicate: boolean;
  refund: number;
}

// `random` returns a float in [0, 1). The server passes a crypto-backed source.
export function rollPull(type: PullType, owned: string[], random: () => number = Math.random): PullResult {
  const rates = PULL_RATES[type];
  let roll = random() * 100;
  let rarity: GachaRarity = 'rare';
  for (const r of GACHA_RARITIES) {
    if (roll < rates[r]) {
      rarity = r;
      break;
    }
    roll -= rates[r];
  }
  const pool = GACHA_CHARACTERS.filter((id) => CHARACTER_RARITY[id] === rarity);
  const characterId = pool[Math.floor(random() * pool.length)];
  const duplicate = owned.includes(characterId);
  return { characterId, rarity, duplicate, refund: duplicate ? DUPLICATE_REFUND[rarity] : 0 };
}
