export type PixelGrid = string[];
export type Palette = Record<string, string>;

function mirror(left: string): string {
  return left + left.split('').reverse().join('');
}

export function buildGrid(leftHalves: string[]): PixelGrid {
  return leftHalves.map(mirror);
}

const cache = new Map<string, HTMLCanvasElement>();

export function getSpriteCanvas(key: string, grid: PixelGrid, palette: Palette, pixelSize: number): HTMLCanvasElement {
  const cacheKey = `${key}:${pixelSize}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const size = grid.length;
  const canvas = document.createElement('canvas');
  canvas.width = size * pixelSize;
  canvas.height = size * pixelSize;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let y = 0; y < size; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }
  cache.set(cacheKey, canvas);
  return canvas;
}

export const FLOOR_A: PixelGrid = buildGrid([
  'bbbbbb',
  'baaaaa',
  'baahaa',
  'baaaaa',
  'baaaca',
  'baaaca',
  'baaaaa',
  'baahaa',
  'baaaaa',
  'baaaaa',
  'baacaa',
  'bbbbbb'
]);
export const FLOOR_A_PALETTE: Palette = {
  b: '#11173a',
  a: '#1a2356',
  h: '#232f6b',
  c: '#0d1230'
};

export const FLOOR_B: PixelGrid = buildGrid([
  'bbbbbb',
  'baaaaa',
  'baaaca',
  'baaaaa',
  'baahaa',
  'baaaaa',
  'baaaaa',
  'baacaa',
  'baaaaa',
  'baahaa',
  'baaaaa',
  'bbbbbb'
]);
export const FLOOR_B_PALETTE: Palette = {
  b: '#0e1433',
  a: '#172050',
  h: '#202b63',
  c: '#0b0f29'
};

export const WALL: PixelGrid = buildGrid([
  'mmmmmm',
  'maaaam',
  'maaaam',
  'mmmmmm',
  'maamaa',
  'maamaa',
  'mmmmmm',
  'maaaam',
  'maaaam',
  'mmmmmm',
  'maamaa',
  'maamaa'
]);
export const WALL_PALETTE: Palette = {
  m: '#211f57',
  a: '#312e81'
};

export const PLAYER_SPRITE: PixelGrid = buildGrid([
  '......',
  '.ooooo',
  'oyyyyo',
  'oyeyyo',
  'oyyyyo',
  'oyddyo',
  'oyyyyo',
  'oyyyyo',
  '.oyyo.',
  '.oyyo.',
  '.o..o.',
  '......'
]);
export const PLAYER_PALETTE: Palette = {
  o: '#0b1330',
  y: '#facc15',
  d: '#ca8a04',
  e: '#0b1330'
};

export const ENEMY_SPRITE: PixelGrid = buildGrid([
  '......',
  '.oooo.',
  'opeppo',
  'oppppo',
  'oplplo',
  'oppppo',
  '.oppo.',
  '.oppo.',
  '..oo..',
  '......',
  '......',
  '......'
]);
export const ENEMY_PALETTE: Palette = {
  o: '#831843',
  p: '#f472b6',
  l: '#fbcfe8',
  e: '#0b1330'
};

export const ENEMY_FROZEN_PALETTE: Palette = {
  o: '#1e3a5f',
  p: '#93c5fd',
  l: '#eff6ff',
  e: '#0b1330'
};

export const BOSS_SPRITE: PixelGrid = buildGrid([
  'h.....',
  'ho....',
  'oorrro',
  'orrero',
  'orrrro',
  'ordrro',
  'orrrro',
  'orrrro',
  '.orro.',
  '.orro.',
  '..oo..',
  '......'
]);
export const BOSS_PALETTE: Palette = {
  h: '#1f2937',
  o: '#450a0a',
  r: '#dc2626',
  d: '#7f1d1d',
  e: '#fde047'
};
