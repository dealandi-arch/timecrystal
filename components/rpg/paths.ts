import { COLS, FLOOR, ROWS, WALL, type EnemyDef, type LevelDef, type Point, type Tile } from './levels';

// Paths: each one is its own run of 11 crystal levels with its own look, level style and story.
// The Normal Path is the original 11 levels (ids 1-11). The others are built here, the same way every time
// (a seeded generator), so a level always has the same map for everyone and its World's Best is fair.
// Ids: Nature 1001-1011, Shadow 1101-1111, Sea 1201-1211, Politics 1301-1311, Fire 1401-1411.

export interface PathChapter {
  title: string;
  text: string;
}

export type PathStyle = 'organic' | 'maze' | 'islands' | 'rooms' | 'serpentine';

export interface PathDef {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  intro: string;
  villain: string;
  style: PathStyle | null; // null: the original levels
  idBase: number; // level n has id idBase + n
  theme: number; // index into LEVEL_THEMES
  chapters: PathChapter[]; // 11
}

export const NORMAL_PATH_IDS = Array.from({ length: 11 }, (_, i) => i + 1);

export const PATHS: PathDef[] = [
  {
    id: 'normal',
    name: 'The Normal Path',
    icon: '💎',
    tagline: 'The original journey through eleven shattered timelines.',
    intro: 'The first road: dungeons, crypts, ruins and the infernal boss at the end. Play it here or in Story mode.',
    villain: 'The Time Eater',
    style: null,
    idBase: 0,
    theme: 0,
    chapters: [],
  },
  {
    id: 'nature',
    name: 'The Nature Path',
    icon: '🌿',
    tagline: 'Open caves, mossy hollows and a forest that remembers.',
    intro: 'A sour rot is spreading from the roots of the oldest tree. Follow the crystal through winding, organic caves and end the blight.',
    villain: 'Blightroot',
    style: 'organic',
    idBase: 1000,
    theme: 11,
    chapters: [
      { title: 'Seedling Glade', text: 'A single green spark pulses in the grass. The forest is waking up, and something sour is creeping in from the roots.' },
      { title: 'Mossy Hollow', text: 'Fallen logs and soft moss muffle every step. The Time Crystal’s glow leaves a trail of bright flowers.' },
      { title: 'Whispering Roots', text: 'The roots whisper where the crystal went. Follow the voices before the thorn-beasts hear you listening.' },
      { title: 'Mushroom Ring', text: 'A fairy ring of giant mushrooms spins slowly. Inside it, time runs a little faster.' },
      { title: 'Thorn Tangle', text: 'Brambles close behind you. The only way is through the sleeping thorn guards.' },
      { title: 'River Bend', text: 'A cold river splits the forest in two. Stepping stones, hungry reeds, and one very quick crystal.' },
      { title: 'Canopy Climb', text: 'You climb into the leaves, where light spills gold and the vines move on their own.' },
      { title: 'Beast Den', text: 'Claw marks cover the bark. The forest’s guardians are not happy about visitors.' },
      { title: 'Heart Grove', text: 'The oldest trees stand in a circle. Their rings count backwards.' },
      { title: 'Blighted Meadow', text: 'Flowers wilt as you pass. Blightroot’s rot has spread across the last meadow.' },
      { title: 'The Last Bloom', text: 'Blightroot rises from the soil to swallow the final crystal. End the rot and let the forest bloom again.' },
    ],
  },
  {
    id: 'shadow',
    name: 'The Shadow Path',
    icon: '🌑',
    tagline: 'Twisting dark mazes where nothing is as it seems.',
    intro: 'The sun never finished setting here. Wind through narrow, maze-like halls and stop the Umbral Regent before the dusk becomes permanent.',
    villain: 'The Umbral Regent',
    style: 'maze',
    idBase: 1100,
    theme: 12,
    chapters: [
      { title: 'Dusk Gate', text: 'The sun never finished setting here. A gate of smoke opens for anyone brave enough to walk in.' },
      { title: 'Whisper Alley', text: 'Your shadow walks half a step ahead of you. You decide not to look at it.' },
      { title: 'The Hollow Hall', text: 'Candles burn with black flames. Every echo answers a little too late.' },
      { title: 'Mirror Maze', text: 'Dark glass doubles every corridor. Only one reflection is the real way forward.' },
      { title: 'Cloak and Dagger', text: 'Shade-thieves slip between the pillars. They steal light, and they want yours.' },
      { title: 'The Silent Library', text: 'Books whisper in a language of sighs. One of them describes the crystal’s next move.' },
      { title: 'Veil of Night', text: 'Stars hang inside the walls. The crystal blinks in and out of sight.' },
      { title: 'Gloom Bazaar', text: 'A market of lost things. Everything for sale was once someone’s shadow.' },
      { title: 'Eclipse Stair', text: 'The moon and sun overlap overhead. For one minute, the shadows have teeth.' },
      { title: 'Court of Dusk', text: 'The Umbral Regent’s courtiers bow low, then draw their blades.' },
      { title: 'The Umbral Throne', text: 'The Regent offers you a seat in eternal twilight. Refuse, break his throne, and bring back the dawn.' },
    ],
  },
  {
    id: 'sea',
    name: 'The Sea Path',
    icon: '🌊',
    tagline: 'Wide open reefs, scattered rocks and a hungry tide.',
    intro: 'The tide has swallowed a crystal and is pulling the whole coast down with it. Cross open reefs and sunken ruins to reach the Tidecaller.',
    villain: 'Maelra the Tidecaller',
    style: 'islands',
    idBase: 1200,
    theme: 13,
    chapters: [
      { title: 'Tidepool Shore', text: 'Warm water laps at your boots. A drifting crystal glints beyond the rocks.' },
      { title: 'Shell Beach', text: 'Giant shells hide small, angry crabs. The sand remembers where the tide used to stop.' },
      { title: 'Coral Garden', text: 'Every colour you know, and a few you don’t. The coral sings when you step near.' },
      { title: 'Sunken Ship', text: 'A wrecked galleon, still full of treasure and still full of ghosts.' },
      { title: 'Kelp Forest', text: 'Tall kelp sways in slow motion. Shapes move between the stems.' },
      { title: 'Whirlpool Reef', text: 'The water spins faster the closer you get. The crystal rides it like a carousel.' },
      { title: 'Pearl Caverns', text: 'Glowing pearls light the cave walls. Something large breathes on the other side.' },
      { title: 'Storm Surface', text: 'Lightning cracks over black waves. Dry land is only a rumour.' },
      { title: 'The Drowned Library', text: 'Books float like jellyfish. The tide rewrites the pages as you read.' },
      { title: 'Tidecaller’s Gate', text: 'Maelra’s gate opens with a roar of surf. Her guards rise from the foam.' },
      { title: 'The Abyssal Heart', text: 'At the bottom of the sea, Maelra holds the last crystal in a bubble of calm. Pop it, and let the tide turn.' },
    ],
  },
  {
    id: 'politics',
    name: 'The Politics Path',
    icon: '🏛️',
    tagline: 'Halls, committee rooms and backroom deals.',
    intro: 'A crystal has gone missing in the middle of an election, and every office has a different story. Work your way through the halls of power to the Final Vote.',
    villain: 'The Grand Chancellor',
    style: 'rooms',
    idBase: 1300,
    theme: 14,
    chapters: [
      { title: 'The Town Hall', text: 'A new election, a missing crystal, and a clerk who swears the ballots counted themselves.' },
      { title: 'Press Room', text: 'Cameras flash. Every reporter has a different story about where the crystal went.' },
      { title: 'Lobby Lane', text: 'Lobbyists in sharp suits block the corridors. Everyone wants a favour, and nobody wants you to pass.' },
      { title: 'Committee Room', text: 'Long tables, longer meetings. Somewhere in the minutes, the crystal is listed as “under review”.' },
      { title: 'Campaign Trail', text: 'Banners, rallies and promises that bounce off the walls. Your opponents mean every word, for now.' },
      { title: 'The Filibuster', text: 'Someone has been talking for six hours to stop you. Outlast them.' },
      { title: 'Secret Ballot', text: 'Hidden doors and sealed envelopes. One envelope has the crystal’s real address.' },
      { title: 'Embassy Row', text: 'Diplomats and spies share the same corridor. Keep your guard up and your smile on.' },
      { title: 'The Senate Floor', text: 'The whole chamber turns to watch. Procedure says you may only walk in straight lines.' },
      { title: 'The Chancellor’s Office', text: 'Polished desk, plush carpet, and a bodyguard on every corner.' },
      { title: 'The Final Vote', text: 'The Grand Chancellor rigs one last vote to keep the crystal. Overturn it the old-fashioned way.' },
    ],
  },
  {
    id: 'fire',
    name: 'The Fire Path',
    icon: '🔥',
    tagline: 'Zig-zag bridges over rivers of lava.',
    intro: 'Deep under the mountain a molten giant keeps the last crystal warm. Cross walls of fire through narrow gaps, one bridge at a time.',
    villain: 'Ignaros the Molten',
    style: 'serpentine',
    idBase: 1400,
    theme: 15,
    chapters: [
      { title: 'Ember Path', text: 'The ground is warm and getting warmer. A red crystal glows ahead, daring you to follow.' },
      { title: 'Ash Plains', text: 'Grey snow falls from a black sky. Embers hiss under every footstep.' },
      { title: 'Magma Bridges', text: 'Narrow rock bridges over rivers of lava. Don’t look down. Do look left.' },
      { title: 'Forge of the Ancients', text: 'Hammers strike by themselves. Whatever they’re making, it’s meant for you.' },
      { title: 'Cinder Canyon', text: 'Walls of red stone glow like coals. The canyon changes shape when you blink.' },
      { title: 'Smoke Maze', text: 'Black smoke hides the turns. Follow the heat, not your eyes.' },
      { title: 'Obsidian Halls', text: 'Glass walls reflect a thousand flames. One reflection waves back.' },
      { title: 'Geyser Field', text: 'Steam bursts from the cracks in a rhythm you must learn quickly.' },
      { title: 'The Burning Gate', text: 'A gate of living flame. It opens only for those who aren’t afraid to step through.' },
      { title: 'Ignaros’ Furnace', text: 'Pools of fire, walls of heat, and the sound of a giant heart beating.' },
      { title: 'The Molten Core', text: 'Ignaros the Molten wakes at the heart of the world. Cool the core and take the last crystal.' },
    ],
  },
];

export function getPath(id: string): PathDef | undefined {
  return PATHS.find((p) => p.id === id);
}

// ---------- level generator ----------

function makeRng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
type Grid = Tile[][];

const blank = (fill: Tile): Grid => Array.from({ length: ROWS }, () => Array<Tile>(COLS).fill(fill));
const inside = (x: number, y: number) => x >= 1 && y >= 1 && x <= COLS - 2 && y <= ROWS - 2;
const pick = <T,>(rng: Rng, list: T[]): T => list[Math.floor(rng() * list.length)];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

// Walking distance from `from` to every floor tile it can reach.
function distances(grid: Grid, from: Point): Map<string, number> {
  const dist = new Map<string, number>([[`${from.x},${from.y}`, 0]]);
  let frontier: Point[] = [from];
  while (frontier.length) {
    const next: Point[] = [];
    for (const p of frontier) {
      for (const [dx, dy] of DIRS) {
        const x = p.x + dx;
        const y = p.y + dy;
        const key = `${x},${y}`;
        if (grid[y]?.[x] !== FLOOR || dist.has(key)) continue;
        dist.set(key, dist.get(`${p.x},${p.y}`)! + 1);
        next.push({ x, y });
      }
    }
    frontier = next;
  }
  return dist;
}

function organic(rng: Rng): Grid {
  const g = blank(WALL);
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) g[y][x] = rng() < 0.58 ? FLOOR : WALL;
  for (let pass = 0; pass < 3; pass++) {
    const next = blank(WALL);
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && g[y + dy][x + dx] === WALL) walls++;
        next[y][x] = walls >= 5 ? WALL : FLOOR;
      }
    }
    for (let y = 0; y < ROWS; y++) g[y] = next[y];
  }
  return g;
}

function maze(rng: Rng): Grid {
  const g = blank(WALL);
  const cols = (COLS - 1) / 2; // cells at odd x
  const rows = Math.floor((ROWS - 2) / 2); // cells at odd y (1, 3, 5, 7)
  const seen = new Set<string>();
  const stack: [number, number][] = [[0, 0]];
  seen.add('0,0');
  g[1][1] = FLOOR;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = DIRS.map(([dx, dy]) => [cx + dx, cy + dy, dx, dy] as const).filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !seen.has(`${x},${y}`));
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [nx, ny, dx, dy] = pick(rng, [...options]);
    g[1 + cy * 2 + dy][1 + cx * 2 + dx] = FLOOR; // the wall between the two cells
    g[1 + ny * 2][1 + nx * 2] = FLOOR;
    seen.add(`${nx},${ny}`);
    stack.push([nx, ny]);
  }
  // Knock out some walls so there are loops (a perfect maze has no way round an enemy).
  for (let y = 1; y < ROWS - 2; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (g[y][x] === WALL && (x + y) % 2 === 1 && rng() < 0.16) g[y][x] = FLOOR;
    }
  }
  return g;
}

function islands(rng: Rng): Grid {
  const g = blank(WALL);
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) g[y][x] = FLOOR;
  const rocks = 7 + Math.floor(rng() * 4);
  for (let i = 0; i < rocks; i++) {
    const cx = 2 + Math.floor(rng() * (COLS - 4));
    const cy = 2 + Math.floor(rng() * (ROWS - 4));
    const size = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < size; k++) {
      const x = cx + Math.floor(rng() * 3) - 1;
      const y = cy + Math.floor(rng() * 2);
      if (inside(x, y) && Math.abs(x - 1) + Math.abs(y - 1) > 2) g[y][x] = WALL;
    }
  }
  return g;
}

function rooms(rng: Rng): Grid {
  const g = blank(WALL);
  const colSpans = [[1, 4], [6, 8], [10, 13]];
  const rowSpans = [[1, 3], [5, 8]];
  const centre: Point[][] = [];
  for (let r = 0; r < 2; r++) {
    centre.push([]);
    for (let c = 0; c < 3; c++) {
      const [x0, x1] = colSpans[c];
      const [y0, y1] = rowSpans[r];
      const x2 = x0 + Math.floor(rng() * 2);
      const x3 = x1 - Math.floor(rng() * 2);
      const y2 = y0 + (r === 1 ? Math.floor(rng() * 2) : 0);
      const y3 = y1 - (r === 0 ? Math.floor(rng() * 1) : 0);
      for (let y = y2; y <= y3; y++) for (let x = x2; x <= x3; x++) g[y][x] = FLOOR;
      centre[r].push({ x: Math.floor((x2 + x3) / 2), y: Math.floor((y2 + y3) / 2) });
    }
  }
  const link = (a: Point, b: Point) => {
    let { x, y } = a;
    while (x !== b.x) {
      g[y][x] = FLOOR;
      x += Math.sign(b.x - x);
    }
    while (y !== b.y) {
      g[y][x] = FLOOR;
      y += Math.sign(b.y - y);
    }
    g[y][x] = FLOOR;
  };
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) link(centre[r][c], centre[r][c + 1]);
  link(centre[0][0], centre[1][0]);
  link(centre[0][2], centre[1][2]);
  if (rng() < 0.7) link(centre[0][1], centre[1][1]);
  return g;
}

function serpentine(rng: Rng): Grid {
  const g = blank(WALL);
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) g[y][x] = FLOOR;
  let top = rng() < 0.5;
  for (const x of [4, 7, 10]) {
    for (let y = 1; y < ROWS - 1; y++) g[y][x] = WALL;
    const gap = top ? 1 + Math.floor(rng() * 2) : ROWS - 3 + Math.floor(rng() * 2);
    g[gap][x] = FLOOR;
    g[gap + (top ? 1 : -1)][x] = FLOOR;
    top = !top;
  }
  // A few lava pits in the open parts.
  for (let i = 0; i < 6; i++) {
    const x = 1 + Math.floor(rng() * (COLS - 2));
    const y = 1 + Math.floor(rng() * (ROWS - 2));
    if (![4, 7, 10].includes(x) && Math.abs(x - 1) + Math.abs(y - 1) > 2) g[y][x] = WALL;
  }
  return g;
}

// The last level of every path: an open arena with pillars. The boss waits at the top, you start at the bottom.
function bossArena(path: PathDef, rng: Rng): Grid {
  const g = blank(WALL);
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) g[y][x] = FLOOR;
  const layouts: Record<string, [number, number][]> = {
    nature: [[3, 3], [3, 6], [11, 3], [11, 6], [7, 5]],
    shadow: [[4, 2], [4, 7], [10, 2], [10, 7], [7, 4], [7, 6]],
    sea: [[3, 4], [11, 4], [5, 2], [9, 2], [5, 7], [9, 7]],
    politics: [[3, 3], [5, 3], [9, 3], [11, 3], [3, 6], [5, 6], [9, 6], [11, 6]],
    fire: [[2, 4], [12, 4], [5, 3], [9, 3], [5, 6], [9, 6]],
  };
  for (const [x, y] of layouts[path.id] ?? layouts.nature) g[y][x] = WALL;
  for (let i = 0; i < 2; i++) {
    const x = 2 + Math.floor(rng() * (COLS - 4));
    const y = 3 + Math.floor(rng() * 3);
    if (g[y][x] === FLOOR && Math.abs(x - 7) > 1) g[y][x] = WALL;
  }
  return g;
}

const ENEMIES_BY_LEVEL = [2, 2, 3, 3, 4, 4, 5, 5, 6, 7];

function generateLevel(path: PathDef, n: number): LevelDef {
  const boss = n === PATH_LEVEL_COUNT;
  const style = path.style as PathStyle;
  const idBase = path.idBase;
  const start: Point = boss ? { x: 7, y: 8 } : { x: 1, y: 1 };

  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = makeRng(idBase * 7919 + n * 104729 + attempt * 15485863);
    const grid = boss ? bossArena(path, rng) : style === 'organic' ? organic(rng) : style === 'maze' ? maze(rng) : style === 'islands' ? islands(rng) : style === 'rooms' ? rooms(rng) : serpentine(rng);
    // The start tile and the tiles next to it are always open.
    grid[start.y][start.x] = FLOOR;
    for (const [dx, dy] of DIRS) if (inside(start.x + dx, start.y + dy) && (boss || dx + dy > 0)) grid[start.y + dy][start.x + dx] = FLOOR;
    // Only keep what the hero can actually reach.
    const dist = distances(grid, start);
    for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (grid[y][x] === FLOOR && !dist.has(`${x},${y}`)) grid[y][x] = WALL;
    const reachable = [...dist.entries()].map(([key, d]) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y, d };
    });
    if (reachable.length < (boss ? 60 : 38)) continue;

    // Enemies: spread out and away from the start.
    const wanted = boss ? 5 : ENEMIES_BY_LEVEL[n - 1];
    const enemies: EnemyDef[] = [];
    const taken: Point[] = [];
    const far = (p: Point, gap: number) => taken.every((q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y) >= gap);
    const candidates = reachable.filter((t) => t.d >= 4 && !(boss && t.x === 7 && t.y === 2));
    if (boss) taken.push({ x: 7, y: 2 });
    for (const gap of [4, 3, 2, 1]) {
      let guard = 0;
      while (enemies.length < wanted && guard++ < 200) {
        const t = pick(rng, candidates);
        if (!candidates.length || !far(t, gap)) continue;
        taken.push({ x: t.x, y: t.y });
        enemies.push({ id: `e${path.idBase + n}-${enemies.length + 1}`, x: t.x, y: t.y, hp: 1 });
      }
      if (enemies.length >= wanted) break;
    }
    if (enemies.length < wanted) continue;
    if (boss) {
      grid[2][7] = FLOOR;
      enemies.unshift({ id: 'boss', x: 7, y: 2, hp: 67 });
    }

    // The crystal's stops.
    const stops: Point[] = [];
    const stopCandidates = reachable.filter((t) => t.d >= 3 && !enemies.some((e) => e.x === t.x && e.y === t.y));
    const stopCount = boss ? 8 : n <= 5 ? 6 : 7;
    for (const gap of [4, 3, 2, 1]) {
      let guard = 0;
      while (stops.length < stopCount && guard++ < 300 && stopCandidates.length) {
        const t = pick(rng, stopCandidates);
        if (stops.every((q) => Math.abs(t.x - q.x) + Math.abs(t.y - q.y) >= gap)) stops.push({ x: t.x, y: t.y });
      }
      if (stops.length >= stopCount) break;
    }
    if (stops.length < 4) continue;

    return {
      id: idBase + n,
      name: path.chapters[n - 1].title,
      isBoss: boss,
      grid,
      start,
      enemies,
      crystalPath: stops,
      themeIndex: path.theme,
    };
  }
  // Can't happen with these generators, but never leave a level empty: an open room.
  const grid = blank(WALL);
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) grid[y][x] = FLOOR;
  return {
    id: idBase + n,
    name: path.chapters[n - 1].title,
    isBoss: boss,
    grid,
    start,
    enemies: boss ? [{ id: 'boss', x: 7, y: 2, hp: 67 }] : [{ id: `e${idBase + n}-1`, x: 8, y: 5, hp: 1 }],
    crystalPath: [{ x: 12, y: 7 }, { x: 4, y: 7 }, { x: 8, y: 3 }, { x: 12, y: 3 }],
    themeIndex: path.theme,
  };
}

export const PATH_LEVEL_COUNT = 11;

const cache = new Map<string, LevelDef[]>();

// The 11 levels of a path (the Normal Path's are the original levels, loaded by the game itself).
export function pathLevels(pathId: string): LevelDef[] {
  const path = getPath(pathId);
  if (!path || !path.style) return [];
  const cached = cache.get(pathId);
  if (cached) return cached;
  const levels = Array.from({ length: PATH_LEVEL_COUNT }, (_, i) => generateLevel(path, i + 1));
  cache.set(pathId, levels);
  return levels;
}

export function allPathLevels(): LevelDef[] {
  return PATHS.flatMap((p) => pathLevels(p.id));
}

// Ids of every level of a path (for its World Rank).
export function pathLevelIds(pathId: string): number[] {
  const path = getPath(pathId);
  if (!path) return [];
  return path.style ? Array.from({ length: PATH_LEVEL_COUNT }, (_, i) => path.idBase + i + 1) : NORMAL_PATH_IDS;
}

export function pathOfLevel(levelId: number): PathDef | undefined {
  return PATHS.find((p) => pathLevelIds(p.id).includes(levelId));
}
