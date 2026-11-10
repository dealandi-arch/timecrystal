// Hero levelling rules shared by the client UI and the server API routes (no React, no browser APIs).
// Signed-in players earn Aizodon by finishing levels quickly and spend it levelling up heroes.
// Each level-up raises one or more stats, each stat at its own set levels. "If needed" stats
// (amount, range, bounces, pierce) only apply when the hero's special weapon can use them.

import { type Rarity, rarityOf } from './gacha';
import { BASIC_GUN, type WeaponDef, getSignatureWeapon } from './weapons';

export const MAX_HERO_LEVEL = 20;

export type UpgradeStat =
  | 'health' | 'speed' | 'invuln' | 'damage' | 'attackSpeed'
  | 'quality' | 'range' | 'amount' | 'bounce' | 'pierce';
export type Ranks = Record<UpgradeStat, number>;

export const STAT_LABELS: Record<UpgradeStat, string> = {
  health: 'Health',
  speed: 'Speed',
  invuln: 'Invulnerability window',
  damage: 'Attack damage',
  attackSpeed: 'Attack speed',
  quality: 'Weapon quality',
  range: 'Attack range',
  amount: 'Attack amount',
  bounce: 'Bounces',
  pierce: 'Pierce',
};

export const QUALITY_NAMES = ['Standard', 'Fine', 'Superior', 'Exquisite', 'Masterwork', 'Ascended'];

// The levels at which each upgrade arrives. Every level from 2 to 20 raises at least one stat.
export const UPGRADE_LEVELS: Record<UpgradeStat, number[]> = {
  health: [2, 7, 12, 17, 20],
  damage: [3, 8, 13, 18, 20],
  speed: [4, 10, 16],
  attackSpeed: [5, 9, 14, 19],
  invuln: [6, 11, 15],
  quality: [4, 8, 12, 16, 20],
  range: [3, 9, 15],
  amount: [5, 11, 17],
  bounce: [7, 13, 19],
  pierce: [6, 10, 14],
};
export const STAT_ORDER: UpgradeStat[] = ['health', 'speed', 'invuln', 'damage', 'attackSpeed', 'quality', 'range', 'amount', 'bounce', 'pierce'];

const finite = (v: number | undefined) => v !== undefined && v > 0 && Number.isFinite(v);

// The "if needed" stats only apply to weapons that can use them.
export function usesAmount(weapon: WeaponDef): boolean {
  return (weapon.count ?? 1) > 1;
}

export function usesRange(weapon: WeaponDef): boolean {
  if (weapon.kind === 'beam' || weapon.kind === 'rockfall') return false; // beams reach the next wall; rockslides cover a whole line
  if (weapon.kind === 'shot') return !!weapon.range && weapon.range <= 14;
  return true; // melee reach, blast/bubble/ripple radius, wave distance
}

export function usesBounce(weapon: WeaponDef): boolean {
  return finite(weapon.bounce);
}

// Pierce covers anything that hits a set number of extra enemies: piercing shots, chain lightning, ricochets.
export function usesPierce(weapon: WeaponDef): boolean {
  return finite(weapon.pierce) || finite(weapon.chain) || finite(weapon.ricochet);
}

export function usesStat(stat: UpgradeStat, weapon: WeaponDef): boolean {
  if (stat === 'range') return usesRange(weapon);
  if (stat === 'amount') return usesAmount(weapon);
  if (stat === 'bounce') return usesBounce(weapon);
  if (stat === 'pierce') return usesPierce(weapon);
  return true;
}

function plannedUpgrades(level: number): UpgradeStat[] {
  return STAT_ORDER.filter((stat) => UPGRADE_LEVELS[stat].includes(level));
}

// The upgrades a hero gets on reaching `level`.
export function upgradesAtLevel(level: number, weapon: WeaponDef): UpgradeStat[] {
  return plannedUpgrades(level).filter((s) => usesStat(s, weapon));
}

// The next level (after `level`) that brings this hero an upgrade, if any.
export function nextUpgradeLevel(level: number, weapon: WeaponDef): number | null {
  for (let l = level + 1; l <= MAX_HERO_LEVEL; l++) if (upgradesAtLevel(l, weapon).length) return l;
  return null;
}

export function ranksAtLevel(level: number, weapon: WeaponDef): Ranks {
  const ranks = Object.fromEntries(STAT_ORDER.map((s) => [s, 0])) as Ranks;
  for (let l = 2; l <= Math.min(level, MAX_HERO_LEVEL); l++) {
    for (const stat of upgradesAtLevel(l, weapon)) ranks[stat]++;
  }
  return ranks;
}

// Aizodon needed to go from `level` to `level + 1`; each level costs more than the last.
export function levelUpCost(level: number): number {
  return 5 * Math.round(8 * Math.pow(1.18, level - 1));
}

export interface CoreStats {
  maxHp: number;
  moveMs: number;
  attackCooldownMs: number;
  attackDurationMs: number;
  invulnS: number;
  bulletSpeed: number;
}

// The hero's own stats: health, speed, protection after a hit, and the basic gun's fire rate.
export function applyStatRanks<T extends CoreStats>(base: T, ranks: Ranks): T {
  return {
    ...base,
    maxHp: base.maxHp + ranks.health,
    moveMs: Math.max(60, base.moveMs * Math.pow(0.96, ranks.speed)),
    attackCooldownMs: Math.max(60, base.attackCooldownMs * Math.pow(0.92, ranks.attackSpeed)),
    invulnS: base.invulnS + ranks.invuln * 0.06,
  };
}

// Damage and attack speed help every weapon; quality strengthens the special weapon's effects;
// range, amount, bounces and pierce each improve one thing about it.
export function applyWeaponRanks(weapon: WeaponDef, ranks: Ranks, signature: boolean): WeaponDef {
  const damage = weapon.damage * (1 + ranks.damage * 0.2);
  if (!signature) return { ...weapon, damage }; // the basic gun's fire rate comes from the hero's stats
  const q = ranks.quality;
  const range = ranks.range;
  return {
    ...weapon,
    damage,
    cooldownMs: Math.max(60, weapon.cooldownMs * Math.pow(0.92, ranks.attackSpeed)),
    speed: weapon.speed ? weapon.speed * Math.pow(1.05, q) : weapon.speed,
    freezeMs: weapon.freezeMs ? weapon.freezeMs * (1 + q * 0.2) : weapon.freezeMs,
    homing: weapon.homing ? weapon.homing * (1 + q * 0.2) : weapon.homing,
    durationMs: weapon.durationMs ? weapon.durationMs * (1 + q * 0.1) : weapon.durationMs,
    explode: weapon.explode ? weapon.explode + (q >= 4 ? 1 : 0) + (weapon.kind === 'meteor' ? Math.ceil(range / 2) : 0) : weapon.explode,
    range: (weapon.kind === 'shot' || weapon.kind === 'wave' || weapon.kind === 'eruption') && weapon.range && usesRange(weapon) ? weapon.range + range * 1.5 : weapon.range,
    // Area weapons cover one more tile with every range upgrade (levels 3, 9 and 15).
    radius: weapon.radius !== undefined && usesRange(weapon) ? weapon.radius + range : weapon.radius,
    reach: weapon.kind === 'melee' ? range : undefined,
    width: weapon.kind === 'wave' ? 3 + 2 * Math.floor(range / 2) : weapon.width,
    count: weapon.count !== undefined && usesAmount(weapon) ? weapon.count + ranks.amount : weapon.count,
    bounce: usesBounce(weapon) ? (weapon.bounce as number) + ranks.bounce : weapon.bounce,
    pierce: finite(weapon.pierce) ? (weapon.pierce as number) + ranks.pierce : weapon.pierce,
    chain: finite(weapon.chain) ? (weapon.chain as number) + ranks.pierce : weapon.chain,
    ricochet: finite(weapon.ricochet) ? (weapon.ricochet as number) + ranks.pierce : weapon.ricochet,
  };
}

// ----- OVRL power -----
// Every hero in a tier has the same OVRL at the same level, and each tier sits above the one below.
// It's kept honest by balanceStats: a hero's level 1 stats are scaled to spend exactly their tier's budget.
export const TIER_BASE_OVRL: Record<Rarity, number> = { common: 350, rare: 400, epic: 450, legendary: 520, mythic: 600, secret: 650 };

const STAT_POINTS: Record<UpgradeStat, number> = { health: 10, speed: 8, invuln: 6, damage: 8, attackSpeed: 8, quality: 10, range: 6, amount: 6, bounce: 5, pierce: 5 };

export function overallPower(rarity: Rarity, level: number): number {
  let ovrl = TIER_BASE_OVRL[rarity];
  for (let l = 2; l <= Math.min(level, MAX_HERO_LEVEL); l++) {
    for (const stat of plannedUpgrades(l)) ovrl += STAT_POINTS[stat];
  }
  return ovrl;
}

// What a hero's stats are worth: health, how fast they move and attack, and how long they're protected after a hit.
// Weapons aren't counted, because each one works differently and has no fair single number.
export function statPoints(stats: CoreStats): number {
  return stats.maxHp * 10 + 15000 / stats.moveMs + 26000 / stats.attackCooldownMs + stats.invulnS * 100;
}

// Scales speed, attack rate and protection together so the hero spends exactly their tier's budget.
// Health is left alone and the ratios between the other stats are kept, so each hero keeps their personality.
export function balanceStats<T extends CoreStats>(stats: T, rarity: Rarity): T {
  const health = stats.maxHp * 10;
  const factor = (TIER_BASE_OVRL[rarity] - health) / (statPoints(stats) - health);
  return {
    ...stats,
    moveMs: stats.moveMs / factor,
    attackCooldownMs: stats.attackCooldownMs / factor,
    attackDurationMs: stats.attackDurationMs / factor,
    invulnS: stats.invulnS * factor,
  };
}

export interface HeroSnapshot {
  level: number;
  power: number;
  stats: CoreStats;
  weapon: WeaponDef;
  basicDamage: number;
  quality: number;
}

// A hero's upgraded stats at a given level, with their speciality on.
export function heroSnapshot(hero: { id: string; stats: CoreStats }, level: number): HeroSnapshot {
  const base = getSignatureWeapon(hero.id);
  const ranks = ranksAtLevel(level, base);
  const stats = applyStatRanks(hero.stats, ranks);
  const weapon = applyWeaponRanks(base, ranks, true);
  return {
    level,
    power: overallPower(rarityOf(hero.id), level),
    stats,
    weapon,
    basicDamage: applyWeaponRanks(BASIC_GUN, ranks, false).damage,
    quality: ranks.quality,
  };
}

// ----- Earning Aizodon -----

export const RUN_RANKS = [
  { rank: 'S', maxRatio: 0.6, reward: 50 },
  { rank: 'A', maxRatio: 0.8, reward: 35 },
  { rank: 'B', maxRatio: 1, reward: 25 },
  { rank: 'C', maxRatio: 1.5, reward: 15 },
  { rank: 'D', maxRatio: 2.5, reward: 10 },
  { rank: 'E', maxRatio: Infinity, reward: 5 },
];

// Target time grows with how many enemies a level has and how much health they carry.
// Tuned so the target is about a typical player's personal best on that level.
// Big 3D maps add a bonus for the extra ground to cover.
export function targetTimeMs(enemies: { hp: number }[], bonusMs = 0): number {
  const extraHp = enemies.reduce((sum, e) => sum + Math.max(0, e.hp - 1), 0);
  return (4 + enemies.length * 1.5 + extraHp * 0.15) * 1000 + bonusMs;
}

export function runReward(timeMs: number, enemies: { hp: number }[], usedAbility: boolean, bonusMs = 0): { rank: string; earned: number } {
  const ratio = timeMs / targetTimeMs(enemies, bonusMs);
  const tier = RUN_RANKS.find((r) => ratio <= r.maxRatio) ?? RUN_RANKS[RUN_RANKS.length - 1];
  return { rank: tier.rank, earned: usedAbility ? Math.ceil(tier.reward / 2) : tier.reward };
}

// Fastest run time the server will credit, so forged times can't be claimed in rapid succession.
export function minimumCreditedMs(enemies: { hp: number }[], bonusMs = 0): number {
  return Math.max(5000, targetTimeMs(enemies, bonusMs) * 0.5);
}
