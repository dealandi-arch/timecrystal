// 3D terrain: heights, stairs, ladders, fences and dark spots on top of the normal tile grid.
// Levels without terrain behave exactly as before (everything flat, nothing dark).
//
// Movement rules: you can step to a tile at the same height, or half a level up or down. Stairs sit
// halfway between two heights, so they're the way up and down. A ladder lets you climb straight onto
// any raised tile next to it. Fences block walking but shots fly over them. Dark spots hide enemies
// until you're right next to them.

import { FLOOR, SECRET, WALL, type LevelDef, type Point, type Tile } from './levels';

export type TerrainKind = 'floor' | 'stair' | 'ladder' | 'fence';

export interface Terrain {
  height: number[][]; // in levels: 0 = ground, 1, 2, 3; stairs are .5, 1.5, 2.5
  kind: TerrainKind[][];
  dark: boolean[][];
}

export function heightAt(level: LevelDef, x: number, y: number): number {
  return level.terrain?.height[y]?.[x] ?? 0;
}

export function kindAt(level: LevelDef, x: number, y: number): TerrainKind {
  return level.terrain?.kind[y]?.[x] ?? 'floor';
}

export function isDark(level: LevelDef, x: number, y: number): boolean {
  return level.terrain?.dark[y]?.[x] ?? false;
}

// Height rule only; the caller also checks the target tile can be walked on at all.
export function canStep(level: LevelDef, fx: number, fy: number, tx: number, ty: number): boolean {
  if (!level.terrain) return true;
  if (kindAt(level, fx, fy) === 'ladder' || kindAt(level, tx, ty) === 'ladder') return true;
  return Math.abs(heightAt(level, tx, ty) - heightAt(level, fx, fy)) <= 0.5 + 1e-6;
}

// ----- map format ----- (any size; every row the same length)
// '#' wall  '.' ground  '1' '2' '3' raised floor  'a' 'b' 'c' stairs (between 0-1, 1-2, 2-3)
// 'L' ladder  'f' fence  '?' secret passage.  The dark map marks dark tiles with 'x'.
const HEIGHTS: Record<string, number> = { '.': 0, '1': 1, '2': 2, '3': 3, a: 0.5, b: 1.5, c: 2.5, L: 0, f: 0, '?': 0 };

export interface MapSpec {
  id: number;
  name: string;
  themeIndex: number;
  rows: string[];
  dark: string[];
  start: Point;
  enemies: { x: number; y: number; hp: number }[];
  crystalPath: Point[];
  parBonusMs?: number; // extra target time for big maps (Aizodon ranks)
}

export function parseMap(spec: MapSpec): LevelDef {
  const cols = spec.rows[0].length;
  if (spec.dark.length !== spec.rows.length) throw new Error(`${spec.name}: dark map needs ${spec.rows.length} rows`);
  const grid: Tile[][] = [];
  const height: number[][] = [];
  const kind: TerrainKind[][] = [];
  const dark: boolean[][] = [];
  spec.rows.forEach((row, y) => {
    if (row.length !== cols || spec.dark[y].length !== cols) throw new Error(`${spec.name}: row ${y} needs ${cols} tiles`);
    grid.push([...row].map((ch) => (ch === '#' ? WALL : ch === '?' ? SECRET : FLOOR) as Tile));
    height.push([...row].map((ch) => HEIGHTS[ch] ?? 0));
    kind.push([...row].map((ch) => (ch === 'L' ? 'ladder' : ch === 'f' ? 'fence' : 'abc'.includes(ch) ? 'stair' : 'floor')));
    dark.push([...spec.dark[y]].map((ch) => ch === 'x'));
  });
  return {
    id: spec.id,
    name: spec.name,
    isBoss: false,
    grid,
    start: spec.start,
    enemies: spec.enemies.map((e, i) => ({ id: `e${i + 1}`, ...e })),
    crystalPath: spec.crystalPath,
    themeIndex: spec.themeIndex,
    parBonusMs: spec.parBonusMs,
    terrain: { height, kind, dark },
  };
}
