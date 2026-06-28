import level1 from './data/level1.json';
import level2 from './data/level2.json';
import level3 from './data/level3.json';
import level4 from './data/level4.json';
import level5 from './data/level5.json';
import level6 from './data/level6.json';
import level7 from './data/level7.json';
import level8 from './data/level8.json';
import level9 from './data/level9.json';
import level10 from './data/level10.json';
import level11 from './data/level11.json';

export const TILE = 48;
export const COLS = 15;
export const ROWS = 10;

export const FLOOR = 0;
export const WALL = 1;
export const SECRET = 2;

export type Tile = typeof FLOOR | typeof WALL | typeof SECRET;
export type Point = { x: number; y: number };

export interface EnemyDef {
  id: string;
  x: number;
  y: number;
  hp: number;
}

export interface LevelDef {
  id: number;
  name: string;
  isBoss: boolean;
  grid: Tile[][];
  start: Point;
  enemies: EnemyDef[];
  crystalPath: Point[];
}

// Each stage's data lives in ./data/levelN.json. Edit those files directly (or paste in
// the JSON produced by the "Show level JSON" button in the Stage Editor) to permanently
// change a stage — no code changes needed.
const RAW_LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10, level11];

export const LEVELS: LevelDef[] = RAW_LEVELS as unknown as LevelDef[];

export const TOTAL_LEVELS = LEVELS.length;

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((lvl) => lvl.id === id);
}
