import { CHARACTERS } from '../rpg/pixelArt';

// How each hero fights in a Player Fight, worked out from their normal stats:
// sturdy heroes have more health and hit softer, quick heroes run faster.

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

// Health after being hit at the given times (ms since the start), with regeneration in between.
// Used by BOTH screens and the server, so everyone agrees on the same numbers.
export function simulateHp(hitTimes: number[], damage: number, maxHp: number, nowMs: number): { hp: number; deadAt: number | null } {
  const times = [...hitTimes].filter(Number.isFinite).sort((a, b) => a - b);
  let hp = maxHp;
  let at = 0; // time up to which hp is up to date
  let lastHit = -Infinity;
  const regen = (to: number) => {
    const from = Math.max(at, lastHit + REGEN_DELAY_MS);
    if (to > from) hp = Math.min(maxHp, hp + ((to - from) / 1000) * maxHp * REGEN_FRACTION_PER_S);
    at = Math.max(at, to);
  };
  for (const t of times) {
    if (t > nowMs) break;
    regen(t);
    hp -= damage;
    lastHit = t;
    if (hp <= 0) return { hp: 0, deadAt: t };
  }
  regen(nowMs);
  return { hp, deadAt: null };
}
