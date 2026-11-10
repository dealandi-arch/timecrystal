// Player-made levels: the format the level builder saves, checks that a level is fair and finishable,
// and turning one into a playable level. Shared by the builder, the play page and the server.
import { FLOOR, type LevelDef, type Point } from './levels';
import { canStep, heightAt, kindAt, parseMap } from './terrain';

export type CustomMode = '2d' | '3d';

export const CUSTOM_SIZE: Record<CustomMode, { cols: number; rows: number }> = {
  '2d': { cols: 15, rows: 10 },
  '3d': { cols: 25, rows: 17 },
};

export const CUSTOM_LIMITS = { enemies: 20, enemyHp: 5, crystalStops: 6, nameMin: 3, nameMax: 40, perAuthor: 30 };

// Custom level ids in the game sit far above the built-in ones (and never go on the World's Best lists).
export const CUSTOM_ID_OFFSET = 100000;

const CHARS: Record<CustomMode, string> = { '2d': '#.?', '3d': '#.?123abcLf' };

export interface CustomMap {
  rows: string[];
  dark: string[];
  start: Point;
  enemies: { x: number; y: number; hp: number }[];
  crystalPath: Point[];
}

export interface CustomLevelInfo {
  id: number;
  name: string;
  mode: CustomMode;
  map: CustomMap;
  author?: string;
  authorId?: string;
  plays?: number;
  createdAt?: string;
}

export function emptyMap(mode: CustomMode): CustomMap {
  const { cols, rows } = CUSTOM_SIZE[mode];
  const grid = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => (x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? '#' : '.')).join('')
  );
  return { rows: grid, dark: grid.map((r) => '.'.repeat(r.length)), start: { x: 1, y: rows - 2 }, enemies: [], crystalPath: [] };
}

export function toLevelDef(id: number, name: string, mode: CustomMode, map: CustomMap): LevelDef {
  const level = parseMap({ id, name, themeIndex: id % 10, rows: map.rows, dark: map.dark, start: map.start, enemies: map.enemies, crystalPath: map.crystalPath });
  return mode === '2d' ? { ...level, terrain: undefined } : { ...level, parBonusMs: 10000 };
}

const isInt = (v: unknown): v is number => Number.isInteger(v);
const isPoint = (p: unknown): p is Point => !!p && isInt((p as Point).x) && isInt((p as Point).y);

// Where you can get to from the start. On 3D maps that includes jumps: up one level, down any drop, or over a fence.
function reachable(level: LevelDef, mode: CustomMode): Set<string> {
  const open = (x: number, y: number) => level.grid[y]?.[x] !== undefined && level.grid[y][x] !== 1 && kindAt(level, x, y) !== 'fence';
  const seen = new Set([`${level.start.x},${level.start.y}`]);
  const queue = [level.start];
  while (queue.length) {
    const { x, y } = queue.shift() as Point;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const targets: Point[] = [];
      const nx = x + dx;
      const ny = y + dy;
      if (open(nx, ny) && canStep(level, x, y, nx, ny)) targets.push({ x: nx, y: ny });
      if (mode === '3d') {
        const jumpTo = kindAt(level, nx, ny) === 'fence' && level.grid[ny]?.[nx] === FLOOR ? { x: nx + dx, y: ny + dy } : { x: nx, y: ny };
        if (open(jumpTo.x, jumpTo.y) && heightAt(level, jumpTo.x, jumpTo.y) <= heightAt(level, x, y) + 1) targets.push(jumpTo);
      }
      for (const t of targets) {
        const key = `${t.x},${t.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push(t);
      }
    }
  }
  return seen;
}

// Returns a message saying what's wrong, or null if the level can be published.
export function validateCustomLevel(name: unknown, mode: unknown, map: unknown): string | null {
  if (mode !== '2d' && mode !== '3d') return 'Pick 2D or 3D.';
  if (typeof name !== 'string' || name.trim().length < CUSTOM_LIMITS.nameMin || name.trim().length > CUSTOM_LIMITS.nameMax) {
    return `Give your level a name (${CUSTOM_LIMITS.nameMin}–${CUSTOM_LIMITS.nameMax} letters).`;
  }
  const m = map as CustomMap;
  const { cols, rows } = CUSTOM_SIZE[mode];
  if (!m || !Array.isArray(m.rows) || !Array.isArray(m.dark) || m.rows.length !== rows || m.dark.length !== rows) return 'The map is the wrong size.';
  for (let y = 0; y < rows; y++) {
    const row = m.rows[y];
    const dark = m.dark[y];
    if (typeof row !== 'string' || typeof dark !== 'string' || row.length !== cols || dark.length !== cols) return 'The map is the wrong size.';
    for (let x = 0; x < cols; x++) {
      if (!CHARS[mode].includes(row[x])) return 'The map has a tile this mode doesn’t support.';
      if (dark[x] !== '.' && dark[x] !== 'x') return 'The dark map is broken.';
      if (mode === '2d' && dark[x] === 'x') return 'Dark spots are for 3D levels.';
      const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      if (edge && row[x] !== '#') return 'The outside edge must be wall all the way round.';
    }
  }
  if (!isPoint(m.start)) return 'Place a start.';
  if (!Array.isArray(m.enemies) || m.enemies.length < 1) return 'Place at least one enemy.';
  if (m.enemies.length > CUSTOM_LIMITS.enemies) return `At most ${CUSTOM_LIMITS.enemies} enemies.`;
  if (m.enemies.some((e) => !isPoint(e) || !isInt(e.hp) || e.hp < 1 || e.hp > CUSTOM_LIMITS.enemyHp)) return `Enemies need 1–${CUSTOM_LIMITS.enemyHp} health.`;
  if (!Array.isArray(m.crystalPath) || m.crystalPath.length < 1) return 'Place at least one crystal stop.';
  if (m.crystalPath.length > CUSTOM_LIMITS.crystalStops) return `At most ${CUSTOM_LIMITS.crystalStops} crystal stops.`;
  if (m.crystalPath.some((p) => !isPoint(p))) return 'A crystal stop is broken.';
  const spots = new Set<string>();
  for (const e of m.enemies) {
    const key = `${e.x},${e.y}`;
    if (spots.has(key)) return 'Two enemies are on the same tile.';
    spots.add(key);
  }
  if (spots.has(`${m.start.x},${m.start.y}`)) return 'An enemy is standing on the start.';

  const level = toLevelDef(0, name, mode, m);
  const walkable = (p: Point) => level.grid[p.y]?.[p.x] === FLOOR && kindAt(level, p.x, p.y) !== 'fence';
  if (!walkable(m.start)) return 'The start must be on open ground.';
  if (m.enemies.some((e) => !walkable(e))) return 'Every enemy must stand on open ground.';
  if (m.crystalPath.some((p) => !walkable(p))) return 'Every crystal stop must be on open ground.';
  const seen = reachable(level, mode);
  if (m.enemies.some((e) => !seen.has(`${e.x},${e.y}`))) return 'An enemy can’t be reached from the start.';
  if (m.crystalPath.some((p) => !seen.has(`${p.x},${p.y}`))) return 'A crystal stop can’t be reached from the start.';
  return null;
}

// Height tools in the builder: what each one paints.
export const HEIGHT_CHAR = { 0: '.', 1: '1', 2: '2', 3: '3' } as const;
export const STAIR_CHAR = { 1: 'a', 2: 'b', 3: 'c' } as const; // stairs leading up to that level
