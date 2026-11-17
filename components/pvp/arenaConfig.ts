// The PvP arena: a small walled room, two fighters, first to take 5 hits loses.
// Shared by the game (browser) and the arena route (server).

export const ARENA_W = 16; // tiles
export const ARENA_H = 10;
export const ARENA_HP = 5;
export const ARENA_MS = 3 * 60 * 1000; // when time runs out, the fighter who landed more hits wins (equal: a draw)

export const PLAYER_SPEED = 5; // tiles per second
export const PLAYER_R = 0.35;
export const BULLET_SPEED = 10;
export const BULLET_LIFE_S = 1.1;
export const BULLET_R = 0.12;
export const FIRE_EVERY_MS = 450;

// Pillars [x, y, width, height] in tiles. Nothing can walk or shoot through them.
export const ARENA_WALLS: [number, number, number, number][] = [
  [7, 2, 2, 1],
  [7, 7, 2, 1],
  [3, 4, 1, 2],
  [12, 4, 1, 2],
];

export const SPAWN = { a: { x: 1.5, y: 5 }, b: { x: 14.5, y: 5 } };

export const MAX_SHOTS_SENT = 8;

export interface ArenaShot {
  n: number; // shot number (counts up per player)
  x: number;
  y: number;
  dx: number;
  dy: number;
}

// What each fighter reports about themselves.
export interface ArenaState {
  x: number;
  y: number;
  landed: number; // hits I landed on the opponent
  taken: number; // hits I took
  shots: ArenaShot[]; // my most recent shots
}

// Does a circle at (x, y) with radius r touch a pillar?
export function touchesWall(x: number, y: number, r: number): boolean {
  if (x - r < 0 || y - r < 0 || x + r > ARENA_W || y + r > ARENA_H) return true;
  return ARENA_WALLS.some(([wx, wy, ww, wh]) => {
    const nx = Math.max(wx, Math.min(x, wx + ww));
    const ny = Math.max(wy, Math.min(y, wy + wh));
    return (x - nx) ** 2 + (y - ny) ** 2 < r * r;
  });
}
