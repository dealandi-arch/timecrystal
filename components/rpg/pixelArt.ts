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

export interface CharacterStats {
  maxHp: number;
  moveMs: number;
  attackCooldownMs: number;
  attackDurationMs: number;
  invulnS: number;
  bulletSpeed: number;
  passiveName: string;
  passiveDesc: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  description: string;
  sprite: PixelGrid;
  palette: Palette;
  stats: CharacterStats;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'wanderer',
    name: 'Wanderer',
    description:
      "They drifted into the crystal's orbit through no path of their own choosing. A figure without origin or destination, they have learned that every timeline has its own rhythm — and they have learned to move with it. Their instincts are sharp and their nerves steady. Among all who have chased the shards, none are more reliably capable than the Wanderer.",
    sprite: PLAYER_SPRITE,
    palette: PLAYER_PALETTE,
    stats: { maxHp: 5, moveMs: 150, attackCooldownMs: 260, attackDurationMs: 180, invulnS: 0.7, bulletSpeed: 9, passiveName: 'Balanced', passiveDesc: 'All combat stats at their natural baseline.' },
  },
  {
    id: 'mage',
    name: 'Mage',
    description:
      "She spent decades in the Temporal Archive decoding the mathematics of time itself. When the crystals shattered, she did not hesitate — this was the problem she was born to solve. Her spells come faster than most can track and her bolts crackle with stored arcane energy. She just needs to stay alive long enough to use them.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#1a0a2e', y: '#a855f7', d: '#7c3aed', e: '#fde047' },
    stats: { maxHp: 3, moveMs: 150, attackCooldownMs: 150, attackDurationMs: 120, invulnS: 0.7, bulletSpeed: 13, passiveName: 'Arcane Focus', passiveDesc: 'Faster attack speed and projectile speed. Reduced health.' },
  },
  {
    id: 'knight',
    name: 'Knight',
    description:
      "He trained for thirty years in the Vault Guard, protecting the crystal chambers before anyone knew what was inside them. He has fought things that do not have names yet. Heavy with armor and battle-forged patience, he does not move quickly — but he does not need to. He is still standing when everything else is not.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#0f172a', y: '#94a3b8', d: '#475569', e: '#38bdf8' },
    stats: { maxHp: 8, moveMs: 200, attackCooldownMs: 300, attackDurationMs: 200, invulnS: 0.7, bulletSpeed: 9, passiveName: 'Iron Will', passiveDesc: 'Greatly increased health. Slower movement.' },
  },
  {
    id: 'scout',
    name: 'Scout',
    description:
      "She never stops moving. A former courier between timeline checkpoints, she memorized every shortcut, every gap in the patrols, every half-second window that most people do not even see. Her gear is light and her footsteps leave no echo. Speed is her armor, and she has never needed anything heavier.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#052e16', y: '#4ade80', d: '#16a34a', e: '#052e16' },
    stats: { maxHp: 3, moveMs: 95, attackCooldownMs: 260, attackDurationMs: 180, invulnS: 0.7, bulletSpeed: 9, passiveName: 'Fleet-Footed', passiveDesc: 'Greatly increased movement speed. Reduced health.' },
  },
  {
    id: 'phantom',
    name: 'Phantom',
    description:
      "No one knows where the Phantom came from — or if they arrived in the conventional sense at all. They phase between moments with unsettling ease, and when struck, they slip sideways in time just long enough to avoid the worst of it. The effect does not last, but it does not need to. A moment is a long time if you know how to stretch it.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#083344', y: '#67e8f9', d: '#0891b2', e: '#f0f9ff' },
    stats: { maxHp: 4, moveMs: 145, attackCooldownMs: 260, attackDurationMs: 180, invulnS: 1.5, bulletSpeed: 9, passiveName: 'Phase Shift', passiveDesc: 'Invulnerability window after taking damage is doubled.' },
  },
  {
    id: 'berserker',
    name: 'Berserker',
    description:
      "He broke out of a temporal detention chamber six timelines ago and has not slowed down since. There is not a careful bone in his body — just momentum, aggression, and a supernatural ability to channel raw time-energy into devastating speed. He hits hard and fast. He also gets hit hard and fast. That is the deal he made, and he has never regretted it.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#450a0a', y: '#f87171', d: '#dc2626', e: '#fde047' },
    stats: { maxHp: 3, moveMs: 120, attackCooldownMs: 170, attackDurationMs: 140, invulnS: 0.45, bulletSpeed: 13, passiveName: 'Blood Rush', passiveDesc: 'Faster attack, movement, and bullets. Very fragile.' },
  },
  {
    id: 'sage',
    name: 'Sage',
    description:
      "She has lived longer than most timelines stay intact. The Sage does not fight hard — she fights wisely, absorbing punishment while waiting for exactly the right moment. Years of surviving the impossible have left her with a constitution that borders on the supernatural. She takes hits that others could not walk away from, and keeps moving regardless.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#451a03', y: '#f59e0b', d: '#b45309', e: '#fef3c7' },
    stats: { maxHp: 8, moveMs: 165, attackCooldownMs: 280, attackDurationMs: 180, invulnS: 0.7, bulletSpeed: 9, passiveName: 'Resilience', passiveDesc: 'Significantly increased maximum health.' },
  },
  {
    id: 'trickster',
    name: 'Trickster',
    description:
      "They could be in three places at once — and often appear to be. The Trickster is chaos wearing a coat, slipping through enemy formations before anyone registers their presence. They are not particularly durable, but they rarely need to be. You cannot hurt what you cannot catch, and no one has caught the Trickster in a very long time.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#500724', y: '#ec4899', d: '#be185d', e: '#fce7f3' },
    stats: { maxHp: 4, moveMs: 85, attackCooldownMs: 240, attackDurationMs: 180, invulnS: 0.9, bulletSpeed: 9, passiveName: 'Evasion', passiveDesc: 'Near-maximum movement speed. Reduced health.' },
  },
  {
    id: 'warden',
    name: 'Warden',
    description:
      "He was stationed at the deepest crystal vault for eleven cycles — alone, by choice. Nothing got past him. He absorbed every hit, every breach attempt, every temporal anomaly thrown at those walls without flinching. He is the wall. He moves slowly, he always has, but he is almost impossible to kill and he has never once needed to hurry.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#020617', y: '#3b82f6', d: '#1d4ed8', e: '#bfdbfe' },
    stats: { maxHp: 9, moveMs: 220, attackCooldownMs: 330, attackDurationMs: 210, invulnS: 0.7, bulletSpeed: 7, passiveName: 'Fortress', passiveDesc: 'Massive health pool. Reduced speed and attack rate.' },
  },
  {
    id: 'chronomancer',
    name: 'Chronomancer',
    description:
      "She does not just move through time — she fires through it. A specialist in temporal projectile physics, her bolts travel at speeds that bend causality in small but measurable ways. Enemies who think they have dodged her shots find out, half a second later, that they were wrong. She has built her entire fighting style around that half-second gap.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#042f2e', y: '#14b8a6', d: '#0d9488', e: '#ccfbf1' },
    stats: { maxHp: 4, moveMs: 155, attackCooldownMs: 265, attackDurationMs: 180, invulnS: 0.7, bulletSpeed: 20, passiveName: 'Temporal Bolt', passiveDesc: 'Projectiles travel at more than twice the normal speed.' },
  },
  {
    id: 'shade',
    name: 'Shade',
    description:
      "They exist in the space between moments — uncomfortable in full light, fully present in shadow. When something strikes the Shade, they absorb the impact by briefly stepping outside the current frame. Most people call it luck. It is not. It is a skill that took a lifetime of painful practice in the darkest corridors of fractured time.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#030712', y: '#374151', d: '#111827', e: '#9ca3af' },
    stats: { maxHp: 4, moveMs: 125, attackCooldownMs: 255, attackDurationMs: 180, invulnS: 1.9, bulletSpeed: 9, passiveName: 'Wraithform', passiveDesc: 'Invulnerability window after damage is nearly tripled.' },
  },
  {
    id: 'templar',
    name: 'Templar',
    description:
      "He was the last of the Crystal Templars — an order dissolved when the first shard fell. He carries their oaths and their discipline into every fight, moving with the measured efficiency of someone who has never wasted a movement in his life. He is balanced, powerful, and almost unnervingly calm in situations that would break most people completely.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#292524', y: '#fafaf9', d: '#e7e5e4', e: '#292524' },
    stats: { maxHp: 7, moveMs: 160, attackCooldownMs: 210, attackDurationMs: 160, invulnS: 0.7, bulletSpeed: 9, passiveName: 'Valor', passiveDesc: 'Increased health and improved attack speed above baseline.' },
  },
  {
    id: 'drifter',
    name: 'Drifter',
    description:
      "She has been everywhere, fixed everything, and lost count of how many timelines she has patched back together with improvised tools and borrowed time. Nothing about her is extraordinary — except that everything about her works just a little better than it should. She has earned every edge through experience no training course could ever replicate.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#1c0a00', y: '#d97706', d: '#92400e', e: '#fef3c7' },
    stats: { maxHp: 5, moveMs: 140, attackCooldownMs: 235, attackDurationMs: 170, invulnS: 0.75, bulletSpeed: 10, passiveName: 'Road-Worn', passiveDesc: 'Every stat is slightly above the standard baseline.' },
  },
  {
    id: 'specter',
    name: 'Specter',
    description:
      "The Specter barely registers on timeline scanners — not because they are invisible, but because they are always between frames. They move like a dream slipping away at sunrise: fast, difficult to hold, gone before you fully process their presence. Taking a hit does not stop them. It barely slows them down at all.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#2e1065', y: '#c4b5fd', d: '#8b5cf6', e: '#ede9fe' },
    stats: { maxHp: 3, moveMs: 110, attackCooldownMs: 265, attackDurationMs: 180, invulnS: 1.2, bulletSpeed: 9, passiveName: 'Drift', passiveDesc: 'Increased movement speed and extended invulnerability.' },
  },
  {
    id: 'ironclad',
    name: 'Ironclad',
    description:
      "He is not fast. He is not graceful. He is also not dead, despite everything the fracture has thrown at him. Ironclad absorbed a catastrophic temporal surge that would have erased anyone else. Instead, it bonded the energy into his frame, leaving him nearly impervious to harm and significantly harder to move. He plods. He endures. He wins.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#020617', y: '#4b5563', d: '#1f2937', e: '#6b7280' },
    stats: { maxHp: 12, moveMs: 270, attackCooldownMs: 420, attackDurationMs: 260, invulnS: 0.7, bulletSpeed: 6, passiveName: 'Impervious', passiveDesc: 'Maximum possible health. Speed and attack are significantly reduced.' },
  },
  {
    id: 'viper',
    name: 'Viper',
    description:
      "She strikes before most people finish deciding to react. Her attack speed is a reflex, not a decision — conditioned through years in underground tournament circuits that did not care about legal timeline access. She hits three times in the window others manage once. She does not plan on getting touched, and usually does not need to.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#1a2e05', y: '#a3e635', d: '#65a30d', e: '#1a2e05' },
    stats: { maxHp: 3, moveMs: 150, attackCooldownMs: 110, attackDurationMs: 100, invulnS: 0.6, bulletSpeed: 10, passiveName: 'Rapid Strike', passiveDesc: 'Fastest attack speed of any character. Reduced health.' },
  },
  {
    id: 'ghost',
    name: 'Ghost',
    description:
      "No one has clocked them accurately. Timeline tracking stations record only blur and absence — a footprint where something passed but nothing can identify. The Ghost does not fight the same way twice, because they are never in the same place long enough for a pattern to form. They are, by every measurable metric, the fastest presence in the fracture.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#0c4a6e', y: '#e0f2fe', d: '#7dd3fc', e: '#0c4a6e' },
    stats: { maxHp: 4, moveMs: 75, attackCooldownMs: 265, attackDurationMs: 180, invulnS: 1.0, bulletSpeed: 9, passiveName: 'Blur', passiveDesc: 'Absolute maximum movement speed. Reduced health.' },
  },
  {
    id: 'ember',
    name: 'Ember',
    description:
      "She burned through every assignment the Archive ever gave her, finishing in half the expected time and leaving scorch marks on the records. Her shots are hot and fast and her reflexes are tuned to a pitch that makes her dangerous to be near even when she is not trying. When she is trying, she is a problem very few things survive.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#431407', y: '#f97316', d: '#c2410c', e: '#ffedd5' },
    stats: { maxHp: 4, moveMs: 150, attackCooldownMs: 200, attackDurationMs: 155, invulnS: 0.7, bulletSpeed: 13, passiveName: 'Ignition', passiveDesc: 'Both attack speed and bullet speed are increased.' },
  },
  {
    id: 'null',
    name: 'Null',
    description:
      "He exists at the absolute edge of temporal coherence. He has shed everything that slows him down — compassion, hesitation, most of his health. What remains is a weapon. His shots move faster than most defenses can track and his attacks land before most enemies expect them. He goes down in two hits. He knows. He does not care.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#111827', y: '#6b7280', d: '#374151', e: '#f3f4f6' },
    stats: { maxHp: 2, moveMs: 150, attackCooldownMs: 130, attackDurationMs: 110, invulnS: 0.4, bulletSpeed: 17, passiveName: 'Void Rush', passiveDesc: 'Extreme attack and bullet speed. Only two health points.' },
  },
  {
    id: 'titan',
    name: 'Titan',
    description:
      "They absorbed a temporal collapse at the core of the fracture and came back changed — larger in every sense. They move as though time itself has a weight that only they can feel, deliberate and almost geological in their pace. But they cannot be stopped. Not by enemies, not by damage, not by anything this fracture has thrown at them so far.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#1c0500', y: '#c2410c', d: '#7c2d12', e: '#fed7aa' },
    stats: { maxHp: 11, moveMs: 240, attackCooldownMs: 360, attackDurationMs: 230, invulnS: 0.7, bulletSpeed: 7, passiveName: 'Unstoppable', passiveDesc: 'Near-maximum health. Movement and attack are meaningfully slowed.' },
  },
  {
    id: 'rift',
    name: 'Rift',
    description:
      "She is what happens when you spend long enough inside a crystal shard — it changes you. The Rift does not specialize. She does not need to. Exposure to raw temporal energy has recalibrated every system she has, lifting her speed, resilience, reflexes, and endurance each just enough above the baseline to matter. In aggregate, she is simply better at all of it.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#1e1b4b', y: '#818cf8', d: '#4f46e5', e: '#e0e7ff' },
    stats: { maxHp: 6, moveMs: 130, attackCooldownMs: 220, attackDurationMs: 165, invulnS: 0.85, bulletSpeed: 11, passiveName: 'Harmonic', passiveDesc: 'Every stat is improved above the baseline simultaneously.' },
  },
  {
    id: 'oracle',
    name: 'Oracle',
    description:
      "She tied a blindfold over her eyes the day she realised she could see every future at once. Sight only got in the way. Now she moves through the fracture by memory of things that have not happened yet, stepping aside from blows a heartbeat before they are thrown. Her bolts fly true because she already watched them land.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#3b0764', y: '#e879f9', d: '#a21caf', e: '#fdf4ff' },
    stats: { maxHp: 4, moveMs: 150, attackCooldownMs: 240, attackDurationMs: 170, invulnS: 1.1, bulletSpeed: 11, passiveName: 'Foresight', passiveDesc: 'Longer invulnerability after damage and faster bolts.' },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    description:
      "He mapped the wild edges of the timeline where no Archive surveyor would go, living off the land in places where the land kept changing its mind. He is patient, quiet and deadly at range. His bolts carry farther and faster than anyone else's, and he never takes a shot he has not already lined up twice.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#1a2e05', y: '#65a30d', d: '#3f6212', e: '#fef9c3' },
    stats: { maxHp: 5, moveMs: 135, attackCooldownMs: 250, attackDurationMs: 175, invulnS: 0.7, bulletSpeed: 14, passiveName: 'Longshot', passiveDesc: 'Fast projectiles and slightly quicker movement.' },
  },
  {
    id: 'tinker',
    name: 'Tinker',
    description:
      "They have never met a broken thing they could not make run again — usually with a few spare parts left over. Their workshop sits in a pocket of stalled time where a single afternoon has lasted a decade. Their gear is held together with wire and stubbornness, and somehow every piece of it performs a little better than it was built to.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#292524', y: '#a8a29e', d: '#57534e', e: '#fbbf24' },
    stats: { maxHp: 5, moveMs: 150, attackCooldownMs: 230, attackDurationMs: 170, invulnS: 0.8, bulletSpeed: 10, passiveName: 'Jury-Rigged', passiveDesc: 'Slightly faster attacks and a longer recovery window.' },
  },
  {
    id: 'valkyrie',
    name: 'Valkyrie',
    description:
      "She rode the storm between timelines carrying fallen soldiers to whatever rest they had earned. When the crystal broke, the storm broke with it, and she came down to earth with her shield and her winged helm and a very short temper. She takes a beating and keeps pushing forward, because she has seen what waits for those who stop.",
    sprite: PLAYER_SPRITE,
    palette: { o: '#172554', y: '#e2e8f0', d: '#94a3b8', e: '#fde68a' },
    stats: { maxHp: 7, moveMs: 145, attackCooldownMs: 250, attackDurationMs: 180, invulnS: 0.7, bulletSpeed: 9, passiveName: 'Shieldmaiden', passiveDesc: 'High health without sacrificing movement speed.' },
  },
];

// Human look (story mode). Each character gets a unique 16×16 sprite assembled from layers:
// a body build, a face, hair and gear. Presentation follows the pronouns in their description.
// Palette keys: o outline, y/d clothing (from the character), s skin, h/k hair, e eyes,
// a accent, m metal, v shadow, w white, l lips, r red.
const HUMAN_SIZE = 16;
type Layer = Record<number, string>;

function compose(layers: Layer[]): PixelGrid {
  const rows: string[][] = Array.from({ length: HUMAN_SIZE }, () => Array(HUMAN_SIZE).fill('.'));
  for (const layer of layers) {
    for (const [y, row] of Object.entries(layer)) {
      for (let x = 0; x < HUMAN_SIZE; x++) {
        const ch = row[x];
        if (ch && ch !== '.') rows[Number(y)][x] = ch;
      }
    }
  }
  return rows.map((r) => r.join(''));
}

const HEAD: Layer = {
  2: '.....oooooo.....',
  3: '....osssssso....',
  4: '....osesseso....',
  5: '....osssssso....',
  6: '.....osssso.....',
  7: '......osso......',
};

// Builds
const BROAD: Layer = {
  8: '..oyyyyyyyyyyo..',
  9: '.oyyoyyyyyyoyyo.',
  10: '.oyyoyyyyyyoyyo.',
  11: '.oyyoddddddoyyo.',
  12: '.ossoyyyyyyosso.',
  13: '....oddooddo....',
  14: '....oddooddo....',
  15: '...oooo..oooo...',
};
const BULKY: Layer = {
  8: '.ommmyyyyyymmmo.',
  9: '.ommoyyyyyyommo.',
  10: 'oyyyoyyyyyyoyyyo',
  11: 'oyyyoddddddoyyyo',
  12: 'osssoyyyyyyossso',
  13: '...odddoodddo...',
  14: '...odddoodddo...',
  15: '..ooooo..ooooo..',
};
const SLIM: Layer = {
  8: '...oyyyyyyyyo...',
  9: '..oyoyyyyyyoyo..',
  10: '..oyoyyyyyyoyo..',
  11: '..oyooyyyyooyo..',
  12: '..osoddddddoso..',
  13: '....oddooddo....',
  14: '....oddooddo....',
  15: '...oooo..oooo...',
};
const DRESS: Layer = {
  8: '...oyyyyyyyyo...',
  9: '..oyoyyyyyyoyo..',
  10: '..oyoyyyyyyoyo..',
  11: '..oyooyyyyooyo..',
  12: '..osoyyyyyyoso..',
  13: '...oyyyyyyyyo...',
  14: '..oddddddddddo..',
  15: '.....oo..oo.....',
};
const NEUTRAL: Layer = {
  8: '...oyyyyyyyyo...',
  9: '..oyoyyyyyyoyo..',
  10: '..oyoyyyyyyoyo..',
  11: '..oyoddddddoyo..',
  12: '..osoyyyyyyoso..',
  13: '....oddooddo....',
  14: '....oddooddo....',
  15: '...oooo..oooo...',
};
const ROBE: Layer = {
  8: '...oyyyyyyyyo...',
  9: '..oyyoyddyoyyo..',
  10: '..oyyoyddyoyyo..',
  11: '..ossoyddyosso..',
  12: '...oyyyddyyyo...',
  13: '...oyyyddyyyo...',
  14: '..oyyyyddyyyyo..',
  15: '..oooooooooooo..',
};
const FLOAT: Layer = {
  8: '...oyyyyyyyyo...',
  9: '..oyoyyyyyyoyo..',
  10: '..oyoyyyyyyoyo..',
  11: '..osoyyyyyyoso..',
  12: '...oyyyyyyyyo...',
  13: '....oyyyyyyo....',
  14: '.....oyo.oyo....',
  15: '......o...o.....',
};

// Face details
const LIPS: Layer = { 5: '.......ll.......' };
const BEARD: Layer = { 5: '.....k....k.....', 6: '.....khhhhk.....', 7: '......khhk......' };
const BARE_ARMS: Layer = { 9: '..ss........ss..', 10: '..ss........ss..', 11: '..ss........ss..' };
const MARKS: Layer = { 5: '......a..a......' };

// Hair
const SHORT: Layer = { 1: '.....kkkkkk.....', 2: '....khhhhhhk....', 3: '....khhhhssk....' };
const SPIKY: Layer = { 0: '....k..kk..k....', 1: '...khkkhhkkhk...', 2: '...khhhhhhhhk...', 3: '....khhhhhhk....' };
const LONG: Layer = {
  1: '.....kkkkkk.....',
  2: '....khhhhhhk....',
  3: '...khhhsshhhk...',
  4: '...kh......hk...',
  5: '...kh......hk...',
  6: '...kh......hk...',
  7: '...khh....hhk...',
  8: '...khh....hhk...',
  9: '....kh....hk....',
};
const PONYTAIL: Layer = {
  1: '.....kkkkkk.....',
  2: '....khhhhhhkk...',
  3: '....khhhhhhkhk..',
  4: '...........khk..',
  5: '............hk..',
  6: '............hk..',
  7: '............k...',
};
const BUN: Layer = { 0: '......kkkk......', 1: '.....khhhhk.....', 2: '....khhhhhhk....', 3: '....khhsshhk....', 4: '....k......k....' };
const BOB: Layer = {
  1: '.....kkkkkk.....',
  2: '....khhhhhhk....',
  3: '...khhhhhhhhk...',
  4: '...kh......hk...',
  5: '...kh......hk...',
  6: '...khh....hhk...',
  7: '....kk....kk....',
};
const PIGTAILS: Layer = {
  1: '.....kkkkkk.....',
  2: '....khhhhhhk....',
  3: '....khhhhhhk....',
  4: '..kh........hk..',
  5: '.khh........hhk.',
  6: '.khh........hhk.',
  7: '..k..........k..',
};
const MEDIUM: Layer = {
  1: '.....kkkkkk.....',
  2: '....khhhhhhk....',
  3: '...khhhhhssk....',
  4: '...kh......k....',
  5: '...kh...........',
  6: '....k...........',
};
const MESSY: Layer = {
  0: '......k..k......',
  1: '....kkhkkhkk....',
  2: '...khhhhhhhhk...',
  3: '...khhhshhhhk...',
  4: '...kh......hk...',
  5: '....k......k....',
};

// Gear
const WIZARD_HAT: Layer = { 0: '.......oyo......', 1: '......oyyyo.....', 2: '.....oaaaaao....', 3: '..oyyyyyyyyyyo..' };
const PLUMED_HELM: Layer = {
  0: '......aaaa......',
  1: '.....oooooo.....',
  2: '....ommmmmmo....',
  3: '...ommmmmmmmo...',
  4: '...omoooooomo...',
  5: '...ommmmmmmmo...',
  6: '....ommmmmmo....',
  7: '.....oooooo.....',
};
const GREAT_HELM: Layer = {
  1: '.....oooooo.....',
  2: '....ommmmmmo....',
  3: '...ommmmmmmmo...',
  4: '...omoooooomo...',
  5: '...ommmoommmo...',
  6: '...ommmmmmmmo...',
  7: '....oooooooo....',
};
const OPEN_HELM: Layer = {
  1: '.....oooooo.....',
  2: '....ommmmmmo....',
  3: '...ommmmmmmmo...',
  4: '...om..mm..mo...',
  5: '...om......mo...',
  6: '....o......o....',
};
const HORNED_HELM: Layer = { 0: '.oa..........ao.', 1: '.oa..oooooo..ao.', 2: '..oaommmmmmoao..', 3: '...ommmmmmmmo...' };
const WINGED_HELM: Layer = { 0: '.w............w.', 1: '.ww..oooooo..ww.', 2: '..wwommmmmmoww..', 3: '....ommmmmmo....' };
const FEATHER_CAP: Layer = { 0: '..........a.....', 1: '.....oyyyyoa....', 2: '....oyyyyyyo....', 3: '...odddddddddo..' };
const TOP_HAT: Layer = { 0: '.....oooooo.....', 1: '.....oddddo.....', 2: '.....oaaaao.....', 3: '...oddddddddo...' };
const CROWN: Layer = { 0: '....a.a..a.a....', 1: '....aaaaaaaa....' };
const SMALL_HORNS: Layer = { 0: '...a........a...', 1: '....a......a....' };
const BLINDFOLD: Layer = { 4: '....aaaaaaaa....', 5: '...a............', 6: '..a.............' };
const EYE_GOGGLES: Layer = { 4: '....oaaooaao....' };
const MONOCLE: Layer = { 4: '........oao.....' };
const MUSTACHE: Layer = { 5: '......kkkk......' };
const APRON: Layer = { 9: '......dddd......', 10: '.....dddddd.....', 11: '.....dadadd.....', 12: '.....dddddd.....' };
const HOOD: Layer = {
  0: '......oooo......',
  1: '.....oddddo.....',
  2: '....oddddddo....',
  3: '...oddddddddo...',
  4: '...od......do...',
  5: '...od......do...',
  6: '...odd....ddo...',
  7: '...oddd..dddo...',
  8: '..oddddddddddo..',
};
const SHADOW_FACE: Layer = { 4: '.....vavvav.....', 5: '.....vvvvvv.....', 6: '......vvvv......' };
const FACE_WRAP: Layer = { 5: '.....aaaaaa.....', 6: '......aaaa......' };
const HALF_MASK: Layer = { 3: '.....www........', 4: '.....wew........', 5: '.....www........', 6: '......w.........' };
const SCARF: Layer = { 7: '....oaaaaaao....', 8: '...oaaaaaaaao...', 9: '.........oao....', 10: '.........oao....' };
const JESTER_HAT: Layer = { 0: '.a............a.', 1: '.oyo........odo.', 2: '..oyyo....oddo..', 3: '...oyyyyddddo...' };
const DOMINO: Layer = { 4: '.....vwvvwv.....' };
const GOGGLES: Layer = { 3: '...oaaommoaao...' };
const BANDANA: Layer = { 3: '...oaaaaaaaao...', 4: '..aa............', 5: '..a.............' };
const CIRCLET: Layer = { 3: '....mmmaammm....' };
const BRIM_HAT: Layer = { 0: '.....oooooo.....', 1: '....oddddddo....', 2: '....oaaaaaao....', 3: 'oddddddddddddddo' };
const FLAME_TIPS: Layer = { 0: '....a.a..a.a....' };
const VISOR: Layer = { 4: '....aaaaaaaa....' };
const CROSS: Layer = { 9: '.......rr.......', 10: '......rrrr......', 11: '.......rr.......' };

interface HumanLook {
  layers: Layer[];
  s: string; // skin
  h: string; // hair
  a: string; // accent
}

const HUMAN_LOOKS: Record<string, HumanLook> = {
  // they
  wanderer: { layers: [NEUTRAL, HEAD, MESSY, SCARF], s: '#e0ac69', h: '#4a2c17', a: '#dc2626' },
  phantom: { layers: [NEUTRAL, HEAD, MEDIUM, HALF_MASK], s: '#e2e8f0', h: '#0e7490', a: '#f0f9ff' },
  trickster: { layers: [NEUTRAL, HEAD, JESTER_HAT, DOMINO], s: '#f1c27d', h: '#7e22ce', a: '#facc15' },
  shade: { layers: [ROBE, HEAD, HOOD, SHADOW_FACE], s: '#a8a29e', h: '#030712', a: '#a5f3fc' },
  specter: { layers: [FLOAT, HEAD, MEDIUM], s: '#f5f3ff', h: '#a78bfa', a: '#ede9fe' },
  ghost: { layers: [NEUTRAL, HEAD, HOOD, FACE_WRAP], s: '#f8fafc', h: '#bae6fd', a: '#0369a1' },
  titan: { layers: [BULKY, HEAD, HORNED_HELM], s: '#5c3a21', h: '#7c2d12', a: '#fed7aa' },
  // she
  mage: { layers: [DRESS, HEAD, LIPS, LONG, WIZARD_HAT], s: '#f1c27d', h: '#e5e7eb', a: '#fde047' },
  scout: { layers: [SLIM, HEAD, LIPS, PIGTAILS, BANDANA], s: '#ffdbac', h: '#b45309', a: '#facc15' },
  sage: { layers: [ROBE, HEAD, LIPS, BUN], s: '#8d5524', h: '#f8fafc', a: '#fef3c7' },
  chronomancer: { layers: [SLIM, HEAD, LIPS, BOB, GOGGLES], s: '#e0ac69', h: '#134e4a', a: '#5eead4' },
  drifter: { layers: [SLIM, HEAD, LIPS, BOB, BRIM_HAT], s: '#d4a373', h: '#78350f', a: '#fbbf24' },
  viper: { layers: [SLIM, HEAD, LIPS, MARKS, PONYTAIL], s: '#ffdbac', h: '#166534', a: '#a3e635' },
  ember: { layers: [SLIM, HEAD, LIPS, LONG, FLAME_TIPS], s: '#e0ac69', h: '#ea580c', a: '#fde047' },
  rift: { layers: [DRESS, HEAD, LIPS, LONG, CIRCLET], s: '#f1c27d', h: '#312e81', a: '#22d3ee' },
  // he
  knight: { layers: [BROAD, HEAD, PLUMED_HELM], s: '#c68642', h: '#1f2937', a: '#38bdf8' },
  berserker: { layers: [BROAD, BARE_ARMS, HEAD, BEARD, SPIKY], s: '#d4a373', h: '#991b1b', a: '#fde047' },
  warden: { layers: [BULKY, HEAD, BEARD, OPEN_HELM], s: '#5c3a21', h: '#111827', a: '#bfdbfe' },
  templar: { layers: [BROAD, CROSS, HEAD, BEARD, SHORT], s: '#c68642', h: '#fbbf24', a: '#fafaf9' },
  ironclad: { layers: [BULKY, HEAD, GREAT_HELM], s: '#8d5524', h: '#374151', a: '#6b7280' },
  null: { layers: [BROAD, HEAD, SHORT, VISOR], s: '#d6d3d1', h: '#0f172a', a: '#ef4444' },
  // new characters
  oracle: { layers: [ROBE, HEAD, LIPS, LONG, BLINDFOLD], s: '#8d5524', h: '#1e1b4b', a: '#f0abfc' },
  ranger: { layers: [BROAD, HEAD, BEARD, FEATHER_CAP], s: '#e0ac69', h: '#713f12', a: '#ef4444' },
  tinker: { layers: [NEUTRAL, APRON, HEAD, MESSY, EYE_GOGGLES], s: '#c68642', h: '#57534e', a: '#fbbf24' },
  valkyrie: { layers: [SLIM, HEAD, LIPS, LONG, WINGED_HELM], s: '#ffdbac', h: '#fcd34d', a: '#fde68a' },
};

const DEFAULT_HUMAN: HumanLook = HUMAN_LOOKS.wanderer;

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

const humanSpriteCache = new Map<string, PixelGrid>();

export type Appearance = 'original' | 'human';
export interface Look {
  sprite: PixelGrid;
  palette: Palette;
}

interface Clothes {
  o: string;
  y: string;
  d: string;
}

function humanLook(cacheKey: string, look: HumanLook, clothes: Clothes, eyes = '#0b1330'): Look {
  let sprite = humanSpriteCache.get(cacheKey);
  if (!sprite) {
    sprite = compose(look.layers);
    humanSpriteCache.set(cacheKey, sprite);
  }
  return {
    sprite,
    palette: {
      o: clothes.o,
      y: clothes.y,
      d: clothes.d,
      e: eyes,
      s: look.s,
      h: look.h,
      k: darken(look.h, 0.35),
      a: look.a,
      m: '#cbd5e1',
      v: '#0b1330',
      w: '#f8fafc',
      l: '#be185d',
      r: '#dc2626',
    },
  };
}

export function getCharacterLook(char: CharacterDef, appearance: Appearance): Look {
  if (appearance === 'original') return { sprite: char.sprite, palette: char.palette };
  const { o, y, d } = char.palette;
  return humanLook(char.id, HUMAN_LOOKS[char.id] ?? DEFAULT_HUMAN, { o, y, d });
}

// Enemies: in human form the pink minions are women and the boss is a man.
const ENEMY_HUMAN: HumanLook = { layers: [DRESS, HEAD, LIPS, BOB, SMALL_HORNS], s: '#fde2e4', h: '#fbcfe8', a: '#831843' };
const ENEMY_FROZEN_HUMAN: HumanLook = { ...ENEMY_HUMAN, s: '#e0f2fe', h: '#eff6ff', a: '#1e3a5f' };
const BOSS_HUMAN: HumanLook = { layers: [BULKY, HEAD, BEARD, SHORT, CROWN], s: '#d6d3d1', h: '#1f2937', a: '#fde047' };

export type EnemyKind = 'enemy' | 'frozen' | 'boss';

export function getEnemyLook(kind: EnemyKind, appearance: Appearance): Look {
  if (appearance === 'original') {
    if (kind === 'boss') return { sprite: BOSS_SPRITE, palette: BOSS_PALETTE };
    return { sprite: ENEMY_SPRITE, palette: kind === 'frozen' ? ENEMY_FROZEN_PALETTE : ENEMY_PALETTE };
  }
  if (kind === 'boss') return humanLook('boss', BOSS_HUMAN, { o: '#450a0a', y: '#dc2626', d: '#7f1d1d' }, '#fde047');
  if (kind === 'frozen') return humanLook('enemyFrozen', ENEMY_FROZEN_HUMAN, { o: '#1e3a5f', y: '#93c5fd', d: '#3b82f6' });
  return humanLook('enemy', ENEMY_HUMAN, { o: '#831843', y: '#f472b6', d: '#be185d' });
}

// Story actors: the guide, the Guardian (boss) and each hero's nemesis.
export type VillainId = 'vex' | 'kestrel' | 'hollow' | 'sorrow' | 'tick' | 'mirror' | 'grimsby' | 'ashen';
export type ActorId = 'oren' | 'guardian' | VillainId;

interface ActorDef {
  clothes: Clothes;
  human: HumanLook;
  original: Look;
}

const enemyPalette = (o: string, p: string, l: string, e = '#0b1330'): Palette => ({ o, p, l, e });

const ACTORS: Record<Exclude<ActorId, 'guardian' | 'mirror'>, ActorDef> = {
  oren: {
    clothes: { o: '#0c1a3a', y: '#2563eb', d: '#1e3a8a' },
    human: { layers: [ROBE, HEAD, BEARD, SHORT], s: '#e0ac69', h: '#e5e7eb', a: '#67e8f9' },
    original: { sprite: PLAYER_SPRITE, palette: { o: '#0c1a3a', y: '#60a5fa', d: '#2563eb', e: '#f8fafc' } },
  },
  vex: {
    clothes: { o: '#052e16', y: '#15803d', d: '#14532d' },
    human: { layers: [DRESS, HEAD, LIPS, LONG, WIZARD_HAT], s: '#d6d3d1', h: '#0f172a', a: '#a3e635' },
    original: { sprite: ENEMY_SPRITE, palette: enemyPalette('#052e16', '#22c55e', '#bbf7d0') },
  },
  kestrel: {
    clothes: { o: '#1c0a0a', y: '#7f1d1d', d: '#450a0a' },
    human: { layers: [BROAD, HEAD, BEARD, OPEN_HELM], s: '#e0ac69', h: '#57534e', a: '#fca5a5' },
    original: { sprite: ENEMY_SPRITE, palette: enemyPalette('#450a0a', '#b91c1c', '#fecaca') },
  },
  hollow: {
    clothes: { o: '#020617', y: '#1f2937', d: '#111827' },
    human: { layers: [FLOAT, HEAD, HOOD, SHADOW_FACE], s: '#64748b', h: '#020617', a: '#ef4444' },
    original: { sprite: ENEMY_SPRITE, palette: enemyPalette('#020617', '#334155', '#94a3b8', '#ef4444') },
  },
  sorrow: {
    clothes: { o: '#1e0b2e', y: '#4c1d95', d: '#2e1065' },
    human: { layers: [ROBE, HEAD, LIPS, BUN], s: '#e2e8f0', h: '#a1a1aa', a: '#c4b5fd' },
    original: { sprite: ENEMY_SPRITE, palette: enemyPalette('#2e1065', '#7c3aed', '#ddd6fe') },
  },
  tick: {
    clothes: { o: '#1c1917', y: '#b45309', d: '#78350f' },
    human: { layers: [BROAD, HEAD, MUSTACHE, MONOCLE, TOP_HAT], s: '#ffdbac', h: '#44403c', a: '#fbbf24' },
    original: { sprite: ENEMY_SPRITE, palette: enemyPalette('#451a03', '#d97706', '#fde68a') },
  },
  grimsby: {
    clothes: { o: '#1c1917', y: '#ca8a04', d: '#854d0e' },
    human: { layers: [BULKY, HEAD, BEARD, MESSY], s: '#c68642', h: '#3f3f46', a: '#fde047' },
    original: { sprite: ENEMY_SPRITE, palette: enemyPalette('#422006', '#eab308', '#fef08a') },
  },
  ashen: {
    clothes: { o: '#0c0a09', y: '#57534e', d: '#292524' },
    human: { layers: [DRESS, HEAD, LIPS, LONG, CROWN], s: '#d6d3d1', h: '#e7e5e4', a: '#f97316' },
    original: { sprite: ENEMY_SPRITE, palette: enemyPalette('#1c1917', '#78716c', '#f97316') },
  },
};

// `hero` is needed for the Mirror, which is a dark copy of whoever it is haunting.
export function getActorLook(id: ActorId, appearance: Appearance, hero: CharacterDef): Look {
  if (id === 'guardian') return getEnemyLook('boss', appearance);
  if (id === 'mirror') {
    const base = getCharacterLook(hero, appearance);
    const palette: Palette = {};
    for (const [key, color] of Object.entries(base.palette)) palette[key] = darken(color, 0.6);
    palette.e = '#ef4444';
    return { sprite: base.sprite, palette };
  }
  const actor = ACTORS[id];
  return appearance === 'original' ? actor.original : humanLook(`actor:${id}`, actor.human, actor.clothes);
}
