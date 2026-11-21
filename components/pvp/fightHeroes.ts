import { CHARACTERS } from '../rpg/pixelArt';
import { getSignatureWeapon } from '../rpg/weapons';

// How each hero fights in a Player Fight, worked out from their normal stats and their signature weapon:
// sturdy heroes have more health and hit softer, quick heroes run faster, and every hero has an ability
// (their signature weapon, turned into a PvP move) on a cooldown.

export interface FightStats {
  hp: number;
  speed: number; // world units per second
  fireMs: number; // time between shots
  damage: number; // per hit
}

export const REGEN_DELAY_MS = 3500; // health starts coming back this long after the last hit...
export const REGEN_FRACTION_PER_S = 0.08; // ...at this share of max health per second

export function fightStatsOf(heroId: unknown): FightStats | null {
  const hero = CHARACTERS.find((c) => c.id === heroId);
  if (!hero) return null;
  const s = hero.stats;
  return {
    hp: Math.round(Math.min(200, Math.max(80, 100 + (s.maxHp - 4) * 12))),
    speed: Math.round(Math.min(9, Math.max(4.5, 7 * (140 / s.moveMs))) * 10) / 10,
    fireMs: Math.round(300 + s.attackCooldownMs * 1.4),
    damage: Math.round(Math.min(20, Math.max(9, 18 - (s.maxHp - 4) * 0.8))),
  };
}

// ----- abilities -----
// volley: a spread of projectiles. strike: a close-range swing in front (or all around). beam: an instant line.
// burst: a shockwave around yourself. blast: a marked spot that explodes after a short delay (aimed, or under your feet for mines).
export type AbilityKind = 'volley' | 'strike' | 'beam' | 'burst' | 'blast';

export interface AbilityStats {
  name: string;
  desc: string;
  color: string;
  kind: AbilityKind;
  cooldownMs: number;
  damage: number; // per hit
  perCast: number; // most hits one use can land
  // volley
  count: number;
  spreadDeg: number;
  speed: number;
  life: number; // seconds a projectile flies
  homing: number; // radians per second it turns toward the target
  pierce: number;
  freezeMs: number; // slows whoever it hits
  // strike / burst / blast
  radius: number;
  reach: number;
  circle: boolean; // strike: hits all around, not just in front
  dash: boolean; // strike: lunges forward first
  delayMs: number; // blast: time before it goes off
  atFeet: boolean; // blast: placed under you (mines) instead of where you aim
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function abilityOf(heroId: unknown): AbilityStats | null {
  const base = fightStatsOf(heroId);
  const hero = CHARACTERS.find((c) => c.id === heroId);
  if (!base || !hero) return null;
  const w = getSignatureWeapon(hero.id);
  const mul = Math.min(2.2, 0.9 + w.damage * 0.45);
  const out: AbilityStats = {
    name: w.name,
    desc: w.desc,
    color: w.color,
    kind: 'volley',
    cooldownMs: Math.round(clamp(w.cooldownMs * 7, 4000, 12000)),
    damage: Math.round(base.damage * mul),
    perCast: 1,
    count: 1,
    spreadDeg: 0,
    speed: 26,
    life: 1.1,
    homing: 0,
    pierce: 0,
    freezeMs: w.freezeMs ?? 0,
    radius: 0,
    reach: 0,
    circle: false,
    dash: false,
    delayMs: 0,
    atFeet: false,
  };
  switch (w.kind) {
    case 'shot': {
      out.kind = 'volley';
      out.count = clamp(w.count ?? 1, 1, 5);
      out.spreadDeg = w.spreadDeg ?? 0;
      out.speed = clamp((w.speed ?? 10) * 2.4, 16, 40);
      out.life = clamp(((w.range ?? 14) * 1.5) / out.speed, 0.4, 1.6);
      out.homing = w.homing ?? 0;
      out.pierce = w.pierce === Infinity ? 99 : w.pierce ?? 0;
      out.perCast = out.count;
      if (out.count > 1) out.damage = Math.round(out.damage * 0.75);
      if (w.explode) out.radius = clamp(w.explode * 1.6 + 0.6, 1.5, 4);
      break;
    }
    case 'melee':
      out.kind = 'strike';
      out.circle = w.pattern === 'spin';
      out.dash = w.pattern === 'dash';
      out.reach = out.circle ? 3.6 : out.dash ? 7 : 4;
      out.damage = Math.round(out.damage * 1.1);
      break;
    case 'beam':
      out.kind = 'beam';
      out.reach = 40;
      out.damage = Math.round(out.damage * 1.2);
      break;
    case 'nova':
    case 'pulse':
    case 'wave':
    case 'orbit':
    case 'eruption':
      out.kind = 'burst';
      out.radius = clamp((w.radius ?? 3) * 1.7 + 1, 4, 9);
      break;
    default: // zone, mine, vortex, meteor, rockfall
      out.kind = 'blast';
      out.radius = clamp((w.radius ?? 2) * 1.6 + 1.5, 3.5, 8);
      out.delayMs = 900;
      out.atFeet = w.kind === 'mine';
      out.damage = Math.round(out.damage * 1.2);
  }
  return out;
}

// ----- health -----
export interface HitEvent {
  t: number; // ms since the start
  dmg: number;
}

// Health after being hit, with regeneration in between. Used by BOTH screens and the server,
// so everyone agrees on the same numbers.
export function simulateHp(hits: HitEvent[], maxHp: number, nowMs: number): { hp: number; deadAt: number | null } {
  const events = hits.filter((h) => Number.isFinite(h.t)).sort((a, b) => a.t - b.t);
  let hp = maxHp;
  let at = 0; // time up to which hp is up to date
  let lastHit = -Infinity;
  const regen = (to: number) => {
    const from = Math.max(at, lastHit + REGEN_DELAY_MS);
    if (to > from) hp = Math.min(maxHp, hp + ((to - from) / 1000) * maxHp * REGEN_FRACTION_PER_S);
    at = Math.max(at, to);
  };
  for (const h of events) {
    if (h.t > nowMs) break;
    regen(h.t);
    hp -= h.dmg;
    lastHit = h.t;
    if (hp <= 0) return { hp: 0, deadAt: h.t };
  }
  regen(nowMs);
  return { hp, deadAt: null };
}
