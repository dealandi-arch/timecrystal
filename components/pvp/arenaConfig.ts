// The Player Fight arena: a walled 3D yard with crates. Two fighters, each with a hero they picked.
// Shared by the game (browser) and the arena route (server). World units: x runs left-right, z front-back, y up.

export const ARENA_W = 44;
export const ARENA_D = 30;
export const FIGHT_MS = 5 * 60 * 1000; // when time runs out, the fighter with more health left wins (equal: a draw)

export const PLAYER_R = 0.6;
export const PLAYER_H = 2.4;
export const BULLET_SPEED = 30;
export const BULLET_LIFE_S = 1.2;
export const BULLET_R = 0.25;
// A hit is checked on both screens. The shooter's check is generous and the target's is exact; the server only
// counts a hit when both agree, so in practice what the target sees is what happens.
export const HIT_R_VICTIM = 0.85;
export const HIT_R_ATTACKER = 1.3;

export const MAX_SHOTS_SENT = 8;
export const MAX_HITS_SENT = 200;

// Crates and pillars: centre x, centre z, width, depth, height. Nothing walks or shoots through them.
export const ARENA_BOXES: { x: number; z: number; w: number; d: number; h: number }[] = [
  { x: 22, z: 15, w: 4, d: 4, h: 4 },
  { x: 22, z: 6, w: 8, d: 1.5, h: 2.5 },
  { x: 22, z: 24, w: 8, d: 1.5, h: 2.5 },
  { x: 12, z: 9, w: 2, d: 2, h: 3.5 },
  { x: 12, z: 21, w: 2, d: 2, h: 3.5 },
  { x: 32, z: 9, w: 2, d: 2, h: 3.5 },
  { x: 32, z: 21, w: 2, d: 2, h: 3.5 },
  { x: 15, z: 15, w: 1.5, d: 5, h: 2 },
  { x: 29, z: 15, w: 1.5, d: 5, h: 2 },
];

export const SPAWN = { a: { x: 4, z: 15, yaw: Math.PI / 2 }, b: { x: 40, z: 15, yaw: -Math.PI / 2 } };

export interface ArenaShot {
  n: number; // shot number (counts up per player)
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
}

// Does a circle at (x, z) with radius r touch a crate or the edge?
export function touchesWall(x: number, z: number, r: number): boolean {
  if (x - r < 0 || z - r < 0 || x + r > ARENA_W || z + r > ARENA_D) return true;
  return ARENA_BOXES.some((b) => {
    const nx = Math.max(b.x - b.w / 2, Math.min(x, b.x + b.w / 2));
    const nz = Math.max(b.z - b.d / 2, Math.min(z, b.z + b.d / 2));
    return (x - nx) ** 2 + (z - nz) ** 2 < r * r;
  });
}

// Is a point (a bullet) inside a crate, or outside the arena?
export function pointBlocked(x: number, y: number, z: number): boolean {
  if (x < 0 || z < 0 || x > ARENA_W || z > ARENA_D || y < 0) return true;
  return ARENA_BOXES.some((b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2 && y < b.h);
}
