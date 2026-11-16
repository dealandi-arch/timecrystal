// Gacha rules shared by the client UI and the server API routes (no React, no browser APIs).

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';
export type GachaRarity = Exclude<Rarity, 'common' | 'secret'>;

export const RARITY_INFO: Record<Rarity, { name: string; color: string }> = {
  common: { name: 'Common', color: '#94a3b8' },
  rare: { name: 'Rare', color: '#38bdf8' },
  epic: { name: 'Epic', color: '#a855f7' },
  legendary: { name: 'Legendary', color: '#f59e0b' },
  mythic: { name: 'Mythic', color: '#f43f5e' },
  secret: { name: 'Secret', color: '#2dd4bf' },
};

export const GACHA_RARITIES: GachaRarity[] = ['rare', 'epic', 'legendary', 'mythic'];

// Characters not listed here are common: everyone has them from the start.
export const CHARACTER_RARITY: Record<string, GachaRarity> = {
  ghost: 'rare',
  grimsby: 'rare',
  gamer: 'rare',
  ovenhead: 'rare',
  jbsoo: 'rare',
  leboro: 'legendary',
  parkster: 'mythic',
  corsair: 'rare',
  falconer: 'rare',
  prospector: 'rare',
  bard: 'rare',
  alchemist: 'rare',
  ronin: 'rare',
  gladiator: 'rare',
  briar: 'rare',
  wraith: 'rare',
  null: 'epic',
  revenant: 'epic',
  puppeteer: 'epic',
  dragoon: 'epic',
  tidecaller: 'epic',
  automaton: 'epic',
  seraphine: 'epic',
  solaris: 'legendary',
  aurora: 'legendary',
  celestia: 'legendary',
  archon: 'legendary',
  weaver: 'legendary',
  paradox: 'mythic',
  genesis: 'mythic',
  oblivion: 'mythic',
  vector: 'mythic',
};

// Secret heroes: never in the gacha or the shop. Every level you clear has a 1% chance to give you
// one you don't have yet; they stay hidden from the hero list until you've got one (or a trial).
export const SECRET_CHARACTERS = ['bunny', 'nimbus', 'glitch'];
export const SECRET_DROP_CHANCE = 0.01;

export function isSecret(characterId: string): boolean {
  return SECRET_CHARACTERS.includes(characterId);
}

export function rarityOf(characterId: string): Rarity {
  if (isSecret(characterId)) return 'secret';
  return CHARACTER_RARITY[characterId] ?? 'common';
}

export const GACHA_CHARACTERS = Object.keys(CHARACTER_RARITY);
// Everything that can be owned (and so saved on a profile).
export const UNLOCKABLE_CHARACTERS = [...GACHA_CHARACTERS, ...SECRET_CHARACTERS];

// After clearing a level: 1% chance of a Secret hero you don't have yet.
export function rollSecret(owned: string[], random: () => number = Math.random): string | null {
  const missing = SECRET_CHARACTERS.filter((id) => !owned.includes(id));
  if (!missing.length || random() >= SECRET_DROP_CHANCE) return null;
  return missing[Math.floor(random() * missing.length)];
}

// Card gacha: each draw gives a card for one gacha hero, every hero equally likely.
// Collect enough cards for a hero to unlock them; rarer heroes need more cards.
export type DrawType = 'single' | 'ten';
export const DRAW_COST: Record<DrawType, number> = { single: 7, ten: 60 };
export const DRAW_COUNT: Record<DrawType, number> = { single: 1, ten: 10 };
export const CARDS_TO_UNLOCK: Record<GachaRarity, number> = { rare: 2, epic: 3, legendary: 5, mythic: 8 };
// A card for a hero you already own turns into Emerald Shards.
export const OWNED_CARD_REFUND = 1;

export type Cards = Record<string, number>;

export function cardsNeeded(characterId: string): number {
  const rarity = CHARACTER_RARITY[characterId];
  return rarity ? CARDS_TO_UNLOCK[rarity] : 0;
}

export interface CardDraw {
  characterId: string;
  rarity: GachaRarity;
  cards: number; // cards held for this hero after the draw
  needed: number;
  unlockedNow: boolean; // this card completed the set
  alreadyOwned: boolean; // turned into shards instead
}

// `random` returns a float in [0, 1). The server passes a crypto-backed source.
export function drawCards(type: DrawType, owned: string[], cards: Cards, random: () => number = Math.random): { draws: CardDraw[]; owned: string[]; cards: Cards; refund: number } {
  const nextOwned = [...owned];
  const nextCards: Cards = { ...cards };
  const draws: CardDraw[] = [];
  let refund = 0;
  for (let i = 0; i < DRAW_COUNT[type]; i++) {
    const characterId = GACHA_CHARACTERS[Math.floor(random() * GACHA_CHARACTERS.length)];
    const rarity = CHARACTER_RARITY[characterId];
    const needed = CARDS_TO_UNLOCK[rarity];
    if (nextOwned.includes(characterId)) {
      refund += OWNED_CARD_REFUND;
      draws.push({ characterId, rarity, cards: nextCards[characterId] ?? needed, needed, unlockedNow: false, alreadyOwned: true });
      continue;
    }
    nextCards[characterId] = (nextCards[characterId] ?? 0) + 1;
    const unlockedNow = nextCards[characterId] >= needed;
    if (unlockedNow) nextOwned.push(characterId);
    draws.push({ characterId, rarity, cards: nextCards[characterId], needed, unlockedNow, alreadyOwned: false });
  }
  return { draws, owned: nextOwned, cards: nextCards, refund };
}

// Keeps only real heroes and whole numbers.
export function cleanCards(raw: unknown): Cards {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(([id, n]) => id in CHARACTER_RARITY && Number.isInteger(n) && (n as number) > 0) as [string, number][]
  );
}

// Buying a specific character outright always costs more than drawing cards for them on average.
export const SHOP_PRICE: Record<GachaRarity, number> = { rare: 450, epic: 700, legendary: 1800, mythic: 7500 };

export const SHARDS_PER_LEVEL = 5;

