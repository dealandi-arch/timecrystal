// Speciality perks: what makes each hero's speciality its own, on top of their stat profile.
// Every common hero has a different perk; gacha heroes have unique combinations, and higher tiers
// get more perks with stronger values. Perks work while the speciality is active.

import { type Rarity, rarityOf } from './gacha';
import { areaBonus } from './skills';

export type PerkKind =
  | 'regen' | 'shield' | 'thorns' | 'crit' | 'dodge' | 'killHaste' | 'deathBurst' | 'slowAura'
  | 'frostOnHurt' | 'revive' | 'shardSense' | 'crystalSense' | 'echoShot' | 'lastStand' | 'vampire'
  | 'timeSlow' | 'stunTouch' | 'secretSight' | 'knockback' | 'killShield' | 'headstart' | 'momentum' | 'giantSlayer';

export interface Perk {
  kind: PerkKind;
  name: string;
  desc: string;
  value: number;
}

// How strong perks are in each tier.
const TIER_STRENGTH: Record<Rarity, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2, mythic: 2.5 };

const round1 = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number) => `${Math.round(v * 100)}%`;

// value(strength) and the sentence shown to players.
const PERK_DEFS: Record<PerkKind, { name: string; value: (s: number) => number; desc: (v: number) => string }> = {
  regen: { name: 'Regeneration', value: (s) => round1(12 / s), desc: (v) => `Heal 1 HP every ${v}s.` },
  shield: { name: 'Barrier', value: (s) => round1(15 / s), desc: (v) => `A barrier blocks one hit, then recharges in ${v}s.` },
  thorns: { name: 'Thorns', value: (s) => round1(s), desc: (v) => `Enemies that touch you take ${v} damage.` },
  crit: { name: 'Critical Hits', value: (s) => round1(0.12 * s * 100) / 100, desc: (v) => `${pct(v)} chance for any hit to deal double damage.` },
  dodge: { name: 'Evasion', value: (s) => round1(0.1 * s * 100) / 100, desc: (v) => `${pct(v)} chance to dodge a hit completely.` },
  killHaste: { name: 'Adrenaline', value: (s) => round1(1.5 * s), desc: (v) => `Move 50% faster for ${v}s after each kill.` },
  deathBurst: { name: 'Chain Reaction', value: (s) => (s >= 2 ? 2 : 1), desc: (v) => `Enemies you defeat explode, hitting everything within ${v} tile${v > 1 ? 's' : ''}.` },
  slowAura: { name: 'Heavy Presence', value: (s) => (s >= 2 ? 3 : 2), desc: (v) => `Enemies within ${v} tiles of you move at half speed.` },
  frostOnHurt: { name: 'Frost Armour', value: (s) => round1(1.5 * s), desc: (v) => `When you're hit, enemies around you freeze for ${v}s.` },
  revive: { name: 'Second Life', value: (s) => Math.min(1, round1(0.25 * s * 100) / 100), desc: (v) => `Once per level, survive a fatal hit and recover ${pct(v)} of your health.` },
  shardSense: { name: 'Treasure Sense', value: (s) => Math.round(2 + s), desc: (v) => `Hidden Emerald Shards within ${v} tiles of you sparkle.` },
  crystalSense: { name: 'Foresight', value: (s) => (s >= 2 ? 2 : 1), desc: (v) => `See where the crystal will stop next${v > 1 ? `, ${v} stops ahead` : ''}.` },
  echoShot: { name: 'Echo', value: (s) => Math.max(2, Math.round(5 / s)), desc: (v) => `Every ${v === 2 ? '2nd' : v === 3 ? '3rd' : `${v}th`} attack fires twice.` },
  lastStand: { name: 'Last Stand', value: (s) => round1(1 + 0.5 * s), desc: (v) => `Deal ${v}× damage while your health is a third or less.` },
  vampire: { name: 'Life Drain', value: (s) => Math.max(1, Math.round(5 / s)), desc: (v) => `Heal 1 HP for every ${v === 1 ? '' : `${v} `}kill${v === 1 ? '' : 's'}.` },
  timeSlow: { name: 'Time Drag', value: (s) => round1((1 - 0.12 * s) * 100) / 100, desc: (v) => `All enemies move ${pct(1 - v)} slower.` },
  stunTouch: { name: 'Shockwave Skin', value: (s) => round1(s), desc: (v) => `Enemies that touch you are stunned for ${v}s.` },
  secretSight: { name: 'Secret Sight', value: () => 1, desc: () => 'Secret passages glow so you can find them.' },
  knockback: { name: 'Impact', value: (s) => (s >= 2 ? 2 : 1), desc: (v) => `Your hits knock enemies back ${v} tile${v > 1 ? 's' : ''}.` },
  killShield: { name: 'Spoils of War', value: (s) => Math.min(1, round1(0.35 * s * 100) / 100), desc: (v) => `${pct(v)} chance for a kill to give you a barrier that blocks one hit.` },
  headstart: { name: 'Ambush', value: (s) => round1(3 * s), desc: (v) => `Invulnerable for the first ${v}s of every level and after every restart.` },
  momentum: { name: 'Momentum', value: (s) => Math.min(1, round1(0.4 * s * 100) / 100), desc: (v) => `${pct(v)} chance for a kill to recharge your weapon instantly.` },
  giantSlayer: { name: 'Giant Slayer', value: (s) => round1(1 + 0.5 * s), desc: (v) => `Deal ${v}× damage to tough enemies like the boss.` },
};

// Commons: one perk each, all different. Gacha: unique combinations, more perks in higher tiers.
const HERO_PERKS: Record<string, PerkKind[]> = {
  wanderer: ['shardSense'],
  mage: ['echoShot'],
  knight: ['shield'],
  scout: ['killHaste'],
  phantom: ['dodge'],
  berserker: ['lastStand'],
  sage: ['regen'],
  trickster: ['momentum'],
  warden: ['thorns'],
  chronomancer: ['timeSlow'],
  shade: ['headstart'],
  templar: ['killShield'],
  drifter: ['vampire'],
  specter: ['secretSight'],
  ironclad: ['revive'],
  viper: ['crit'],
  ember: ['deathBurst'],
  titan: ['stunTouch'],
  rift: ['frostOnHurt'],
  oracle: ['crystalSense'],
  ranger: ['giantSlayer'],
  tinker: ['knockback'],
  valkyrie: ['slowAura'],
  // rare: two perks
  ghost: ['dodge', 'killHaste'],
  grimsby: ['shardSense', 'revive'],
  corsair: ['momentum', 'crit'],
  falconer: ['crystalSense', 'giantSlayer'],
  prospector: ['deathBurst', 'thorns'],
  bard: ['slowAura', 'regen'],
  alchemist: ['frostOnHurt', 'vampire'],
  ronin: ['crit', 'echoShot'],
  gladiator: ['lastStand', 'shield'],
  // epic: two stronger perks
  null: ['echoShot', 'momentum'],
  revenant: ['revive', 'vampire'],
  puppeteer: ['stunTouch', 'slowAura'],
  dragoon: ['deathBurst', 'knockback'],
  tidecaller: ['frostOnHurt', 'timeSlow'],
  automaton: ['shield', 'thorns'],
  // legendary: three perks
  solaris: ['regen', 'deathBurst', 'secretSight'],
  aurora: ['dodge', 'frostOnHurt', 'timeSlow'],
  celestia: ['crystalSense', 'shardSense', 'crit'],
  archon: ['killShield', 'giantSlayer', 'knockback'],
  // mythic: three of the strongest perks
  paradox: ['echoShot', 'timeSlow', 'dodge'],
  genesis: ['regen', 'vampire', 'revive'],
  oblivion: ['lastStand', 'deathBurst', 'headstart'],
};

// Perks that cover an area reach one tile further at hero levels 5, 12 and 20.
export const AREA_PERKS: PerkKind[] = ['deathBurst', 'slowAura', 'shardSense'];

export function getPerks(heroId: string, heroLevel = 1): Perk[] {
  const strength = TIER_STRENGTH[rarityOf(heroId)];
  const bonus = areaBonus(heroLevel);
  return (HERO_PERKS[heroId] ?? []).map((kind) => {
    const def = PERK_DEFS[kind];
    const value = def.value(strength) + (AREA_PERKS.includes(kind) ? bonus : 0);
    const extra = kind === 'frostOnHurt' && bonus ? ` Reaches ${1 + bonus} tiles around you.` : '';
    return { kind, name: def.name, desc: def.desc(value) + extra, value };
  });
}

// Perk values by kind, for the game loop. Missing kinds mean the hero doesn't have that perk.
export type PerkValues = Partial<Record<PerkKind, number>>;

export function getPerkValues(heroId: string, heroLevel = 1): PerkValues {
  return Object.fromEntries(getPerks(heroId, heroLevel).map((p) => [p.kind, p.value]));
}

export const ALL_PERK_KINDS = Object.keys(PERK_DEFS) as PerkKind[];
export { HERO_PERKS };
