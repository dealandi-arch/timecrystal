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
];
