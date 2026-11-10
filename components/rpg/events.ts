// Events: limited-time hero trials and the levels built for them (shared by client and server).
import type { LevelDef } from './levels';
import { type MapSpec, parseMap } from './terrain';

export const TRIAL_DAYS = 3;

// Codes players can redeem on the Events page for a free trial of a Secret hero.
export const PROMO_CODES: Record<string, { heroId: string; days: number }> = {
  BUNNY: { heroId: 'bunny', days: TRIAL_DAYS },
};

export function redeemCode(code: string): { heroId: string; days: number } | null {
  return PROMO_CODES[code.trim().toUpperCase()] ?? null;
}

// A flat (2D) level from the same ASCII format as the 3D maps.
function flat(spec: Omit<MapSpec, 'dark' | 'themeIndex'> & { themeIndex?: number }): LevelDef {
  const level = parseMap({ ...spec, themeIndex: spec.themeIndex ?? 0, dark: spec.rows.map((r) => '.'.repeat(r.length)) });
  return { ...level, terrain: undefined };
}

// Parkster Tryout: levels laid out in long rows and columns, made for his Rockslide Call.
export const PARKSTER_EVENT_LEVELS: LevelDef[] = [
  flat({
    id: 201,
    name: 'Parkster Event · Rush Hour',
    themeIndex: 2,
    rows: [
      '###############',
      '#.............#',
      '#.............#',
      '#.............#',
      '#..##.....##..#',
      '#.............#',
      '#.............#',
      '#.............#',
      '#.............#',
      '###############',
    ],
    start: { x: 7, y: 8 },
    enemies: [2, 4, 6, 8, 10, 12].map((x) => ({ x, y: 2, hp: 1 })).concat([2, 6, 10].map((x) => ({ x, y: 6, hp: 2 }))),
    crystalPath: [{ x: 7, y: 1 }, { x: 13, y: 7 }, { x: 1, y: 5 }],
  }),
  flat({
    id: 202,
    name: 'Parkster Event · Rooftop Lanes',
    themeIndex: 5,
    rows: [
      '###############',
      '#.............#',
      '#.###########.#',
      '#.............#',
      '#.###########.#',
      '#.............#',
      '#.###########.#',
      '#.............#',
      '#.............#',
      '###############',
    ],
    start: { x: 7, y: 8 },
    enemies: [
      { x: 3, y: 1, hp: 1 }, { x: 9, y: 1, hp: 2 }, { x: 5, y: 3, hp: 1 }, { x: 11, y: 3, hp: 2 },
      { x: 2, y: 5, hp: 1 }, { x: 8, y: 5, hp: 2 }, { x: 12, y: 7, hp: 1 }, { x: 1, y: 3, hp: 1 },
    ],
    crystalPath: [{ x: 13, y: 1 }, { x: 1, y: 7 }, { x: 7, y: 3 }],
  }),
  flat({
    id: 203,
    name: 'Parkster Event · Crossroads',
    themeIndex: 8,
    rows: [
      '###############',
      '#.....#.#.....#',
      '#.....#.#.....#',
      '#.............#',
      '###.........###',
      '#.............#',
      '#.....#.#.....#',
      '#.....#.#.....#',
      '#.............#',
      '###############',
    ],
    start: { x: 1, y: 8 },
    enemies: [
      { x: 3, y: 1, hp: 1 }, { x: 11, y: 1, hp: 1 }, { x: 7, y: 3, hp: 2 }, { x: 3, y: 5, hp: 1 },
      { x: 11, y: 5, hp: 1 }, { x: 7, y: 7, hp: 2 }, { x: 12, y: 8, hp: 1 }, { x: 2, y: 2, hp: 1 }, { x: 7, y: 5, hp: 6 },
    ],
    crystalPath: [{ x: 7, y: 1 }, { x: 13, y: 8 }, { x: 1, y: 1 }],
  }),
];

export interface GameEvent {
  id: string;
  title: string;
  blurb: string;
  heroId: string;
}

export const PARKSTER_TRYOUT: GameEvent = {
  id: 'parkster-tryout',
  title: 'Parkster Tryout',
  blurb: `Play Parkster free for ${TRIAL_DAYS} days, with three event levels built in long rows and columns for his Rockslide Call. Clear them for Aizodon and a spot on each level’s World’s Best.`,
  heroId: 'parkster',
};
