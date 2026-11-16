// Multienemy Craze: beat as many enemies as you can before the time runs out. Every enemy you beat is
// replaced by a new one somewhere else, and they get tougher as your count climbs.
// Shared by the client and the server (no React, no browser APIs).
import type { LevelDef } from './levels';
import { parseMap } from './terrain';

export const CRAZE_MINUTES = [1, 2, 3, 5] as const;
export type CrazeMinutes = (typeof CRAZE_MINUTES)[number];

export function isCrazeMinutes(m: unknown): m is CrazeMinutes {
  return CRAZE_MINUTES.includes(m as CrazeMinutes);
}

// Each round length is its own "level" for start tickets (see lib/runCheck.ts).
export const crazeLevelId = (minutes: CrazeMinutes) => 300 + minutes;

// Nobody can beat more than this many enemies a second (the fastest weapons, every enemy in reach).
export const MAX_KILLS_PER_SECOND = 2.5;

// Enemies get tougher: 1 health, +1 for every 15 beaten.
export const crazeEnemyHp = (beaten: number) => 1 + Math.floor(beaten / 15);

const ARENA = parseMap({
  id: 300,
  name: 'Multienemy Craze',
  themeIndex: 4,
  rows: [
    '###############',
    '#.............#',
    '#..#.......#..#',
    '#.............#',
    '#.....#.#.....#',
    '#.............#',
    '#..#.......#..#',
    '#.............#',
    '#.............#',
    '###############',
  ],
  dark: Array(10).fill('...............'),
  start: { x: 7, y: 8 },
  enemies: [
    { x: 2, y: 1, hp: 1 },
    { x: 12, y: 1, hp: 1 },
    { x: 2, y: 7, hp: 1 },
    { x: 12, y: 7, hp: 1 },
  ],
  // The crystal isn't part of Craze: it sits in a wall where nobody can reach it, and isn't drawn.
  crystalPath: [{ x: 0, y: 0 }],
});

export function crazeArena(minutes: CrazeMinutes): LevelDef {
  return { ...ARENA, terrain: undefined, id: crazeLevelId(minutes), name: `Multienemy Craze · ${minutes} min` };
}
