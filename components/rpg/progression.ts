// Hero levelling rules shared by the client UI and the server API routes (no React, no browser APIs).
// Signed-in players earn Aizodon by finishing levels quickly and spend it levelling up heroes.

import { BASIC_GUN, type WeaponDef, getSignatureWeapon } from './weapons';

export const MAX_HERO_LEVEL = 20;

export type UpgradeStat = 'health' | 'speed' | 'invuln' | 'damage' | 'attackSpeed' | 'amount' | 'quality' | 'range';
export type Ranks = Record<UpgradeStat, number>;

export const STAT_LABELS: Record<UpgradeStat, string> = {
  health: 'Health',
  speed: 'Speed',
  invuln: 'Invulnerability window',
  damage: 'Attack damage',
  attackSpeed: 'Attack speed',
  amount: 'Attack amount',
  quality: 'Weapon quality',
  range: 'Attack range',
};

export const QUALITY_NAMES = ['Standard', 'Fine', 'Superior', 'Exquisite', 'Masterwork', 'Ascended'];

// What each level-up improves. Not everything rises at once: levels 2-10 follow this pattern,
// 11-19 repeat it, and reaching 20 raises everything.
const SCHEDULE: UpgradeStat[][] = [
  ['health', 'damage'],
  ['speed'],
  ['attackSpeed', 'range'],
  ['quality', 'invuln'],
  ['damage', 'amount'],
  ['health', 'speed'],
  ['attackSpeed', 'range'],
  ['invuln', 'damage'],
  ['quality', 'amount', 'health'],
];
const ALL_STATS: UpgradeStat[] = ['health', 'speed', 'invuln', 'damage', 'attackSpeed', 'amount', 'quality', 'range'];

// Some stats only mean something for certain weapons.
export function usesAmount(weapon: WeaponDef): boolean {
  return (weapon.count ?? 1) > 1;
}

export function usesRange(weapon: WeaponDef): boolean {
  if (weapon.kind === 'beam') return false; // beams already reach the next wall
  if (weapon.kind === 'shot') return !!weapon.range && weapon.range <= 14;
  return true;
}

// The stats a hero gains on reaching `level`.
export function upgradesAtLevel(level: number, weapon: WeaponDef): UpgradeStat[] {
  if (level < 2 || level > MAX_HERO_LEVEL) return [];
  const planned = level === MAX_HERO_LEVEL ? ALL_STATS : SCHEDULE[(level - 2) % SCHEDULE.length];
  return planned.filter((s) => (s !== 'amount' || usesAmount(weapon)) && (s !== 'range' || usesRange(weapon)));
}

export function ranksAtLevel(level: number, weapon: WeaponDef): Ranks {
  const ranks: Ranks = { health: 0, speed: 0, invuln: 0, damage: 0, attackSpeed: 0, amount: 0, quality: 0, range: 0 };
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

export function applyStatRanks<T extends CoreStats>(base: T, ranks: Ranks): T {
  return {
    ...base,
    maxHp: base.maxHp + ranks.health,
    moveMs: Math.max(60, base.moveMs * Math.pow(0.96, ranks.speed)),
    attackCooldownMs: Math.max(60, base.attackCooldownMs * Math.pow(0.95, ranks.attackSpeed)),
    invulnS: base.invulnS + ranks.invuln * 0.06,
  };
}

export function applyWeaponRanks(weapon: WeaponDef, ranks: Ranks, signature: boolean): WeaponDef {
  const damage = weapon.damage * (1 + ranks.damage * 0.2);
  if (!signature) return { ...weapon, damage }; // the basic gun's fire rate comes from the hero's stats
  const q = ranks.quality;
  const perTwo = Math.floor(q / 2);
  const finite = (v: number | undefined) => v !== undefined && v > 0 && Number.isFinite(v);
  const reachOrRadius = usesRange(weapon) ? ranks.range : 0;
  return {
    ...weapon,
    damage,
    cooldownMs: Math.max(60, weapon.cooldownMs * Math.pow(0.95, ranks.attackSpeed) * Math.pow(0.96, q)),
    count: weapon.count !== undefined && usesAmount(weapon) ? weapon.count + ranks.amount : weapon.count,
    speed: weapon.speed ? weapon.speed * Math.pow(1.05, q) : weapon.speed,
    range: weapon.kind === 'shot' && weapon.range ? weapon.range + reachOrRadius * 1.5 : weapon.range,
    radius: weapon.radius !== undefined ? weapon.radius + Math.floor(reachOrRadius / 3) : weapon.radius,
    reach: weapon.kind === 'melee' ? Math.floor(reachOrRadius / 2) : undefined,
    freezeMs: weapon.freezeMs ? weapon.freezeMs * (1 + q * 0.2) : weapon.freezeMs,
    homing: weapon.homing ? weapon.homing * (1 + q * 0.2) : weapon.homing,
    bounce: finite(weapon.bounce) ? (weapon.bounce as number) + perTwo : weapon.bounce,
    pierce: finite(weapon.pierce) ? (weapon.pierce as number) + perTwo : weapon.pierce,
    chain: finite(weapon.chain) ? (weapon.chain as number) + perTwo : weapon.chain,
    explode: weapon.explode && q >= 4 ? weapon.explode + 1 : weapon.explode,
  };
}

// A single score for comparing heroes; every level-up raises it.
export function totalPower(stats: CoreStats, weapon: WeaponDef, ranks: Ranks): number {
  const shots = weapon.kind === 'beam' ? weapon.beams ?? 1 : weapon.count ?? 1;
  const dps = (weapon.damage * shots * 1000) / Math.max(60, weapon.cooldownMs);
  return Math.round(
    stats.maxHp * 10 +
      15000 / stats.moveMs +
      stats.invulnS * 100 +
      26000 / stats.attackCooldownMs +
      dps * 20 +
      ranks.quality * 25 +
      ranks.range * 15
  );
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
    power: totalPower(stats, weapon, ranks),
    stats,
    weapon,
    basicDamage: applyWeaponRanks(BASIC_GUN, ranks, false).damage,
    quality: ranks.quality,
  };
}

// ----- Earning Aizodon -----

export const RUN_RANKS = [
  { rank: 'S', maxRatio: 0.5, reward: 50 },
  { rank: 'A', maxRatio: 0.75, reward: 35 },
  { rank: 'B', maxRatio: 1, reward: 25 },
  { rank: 'C', maxRatio: 1.5, reward: 15 },
  { rank: 'D', maxRatio: 2.5, reward: 10 },
  { rank: 'E', maxRatio: Infinity, reward: 5 },
];

// Target time grows with how many enemies a level has and how much health they carry.
export function targetTimeMs(enemies: { hp: number }[]): number {
  const extraHp = enemies.reduce((sum, e) => sum + Math.max(0, e.hp - 1), 0);
  return (15 + enemies.length * 5 + extraHp * 0.5) * 1000;
}

export function runReward(timeMs: number, enemies: { hp: number }[], usedAbility: boolean): { rank: string; earned: number } {
  const ratio = timeMs / targetTimeMs(enemies);
  const tier = RUN_RANKS.find((r) => ratio <= r.maxRatio) ?? RUN_RANKS[RUN_RANKS.length - 1];
  return { rank: tier.rank, earned: usedAbility ? Math.ceil(tier.reward / 2) : tier.reward };
}

// Fastest run time the server will credit, so forged times can't be claimed in rapid succession.
export function minimumCreditedMs(enemies: { hp: number }[]): number {
  return Math.max(2000, targetTimeMs(enemies) * 0.25);
}
