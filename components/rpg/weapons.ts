import { type Rarity, rarityOf } from './gacha';

// Every hero carries the basic gun plus one signature weapon of their own (switch with Q).
// Weapons are data: the game reads these fields to decide how each one behaves.

export type WeaponKind = 'shot' | 'melee' | 'beam' | 'mine' | 'nova' | 'zone' | 'pulse' | 'wave';
export type MeleePattern = 'front' | 'sweep' | 'spin' | 'lunge' | 'arc' | 'x' | 'spear' | 'dash';
export type BlastShape = 'square' | 'diamond' | 'cross';

export interface WeaponDef {
  id: string;
  name: string;
  desc: string;
  kind: WeaponKind;
  color: string;
  cooldownMs: number;
  damage: number;
  // shot
  count?: number; // projectiles per shot
  spreadDeg?: number; // total fan angle
  speed?: number; // tiles per second
  range?: number; // tiles before it fades (or turns back if `returns`)
  pierce?: number; // extra enemies it passes through (Infinity = all)
  bounce?: number; // wall bounces
  homing?: number; // turn rate in radians per second
  explode?: number; // blast radius in tiles
  freezeMs?: number; // stuns enemies it hits
  chain?: number; // lightning jumps to nearby enemies
  returns?: boolean; // boomerang
  size?: number; // projectile radius in px
  // melee
  pattern?: MeleePattern;
  reach?: number; // extra tiles beyond the pattern (from levelling up)
  // beam: number of beams fanned out (1 = straight ahead)
  beams?: number;
  // nova / mine / zone / pulse
  radius?: number;
  shape?: BlastShape; // nova only; square by default
  durationMs?: number; // zone: how long it stays on the ground
  knockback?: number; // tiles a hit pushes enemies back
  poison?: number; // extra damage dealt one second after the hit
  explodeAtEnd?: boolean; // shot: blows up where it lands, not only on contact
  // heal 1 HP for each enemy this weapon finishes off
  lifesteal?: boolean;
}

export const BASIC_GUN: WeaponDef = {
  id: 'basic',
  name: 'Basic Gun',
  desc: 'A reliable blaster. Speed and fire rate depend on your hero.',
  kind: 'shot',
  color: '#fde047',
  cooldownMs: 0, // uses the hero's attack cooldown
  damage: 1,
  count: 1,
  speed: 0, // uses the hero's bullet speed
  range: 30,
};

const W = (def: Omit<WeaponDef, 'id'>, id: string): WeaponDef => ({ ...def, id });

export const SIGNATURE_WEAPONS: Record<string, WeaponDef> = {
  wanderer: W({ name: 'Pathfinder Sling', desc: 'Stones that ricochet off walls twice.', kind: 'shot', color: '#facc15', cooldownMs: 300, damage: 1, speed: 10, range: 18, bounce: 2 }, 'sling'),
  mage: W({ name: 'Arcane Orb', desc: 'A slow orb that hunts down the nearest enemy.', kind: 'shot', color: '#c084fc', cooldownMs: 340, damage: 1, speed: 6, range: 16, homing: 5, size: 7 }, 'orb'),
  knight: W({ name: 'Broadsword', desc: 'Cleaves the three tiles in front of you.', kind: 'melee', color: '#e2e8f0', cooldownMs: 420, damage: 2, pattern: 'sweep' }, 'broadsword'),
  scout: W({ name: 'Twin Darts', desc: 'Two fast darts in a narrow fan.', kind: 'shot', color: '#4ade80', cooldownMs: 250, damage: 1, count: 2, spreadDeg: 10, speed: 15, range: 14, size: 3 }, 'darts'),
  phantom: W({ name: 'Phase Blade', desc: 'Blink 2 tiles forward, cutting everything you pass through.', kind: 'melee', color: '#67e8f9', cooldownMs: 520, damage: 2, pattern: 'dash' }, 'phaseblade'),
  berserker: W({ name: 'War Axe', desc: 'A whirlwind that hits every tile around you.', kind: 'melee', color: '#f87171', cooldownMs: 520, damage: 2, pattern: 'spin' }, 'waraxe'),
  sage: W({ name: 'Staff of Ages', desc: 'Leaves a time bubble on the ground that freezes and hurts enemies inside it for 3 seconds.', kind: 'zone', color: '#fcd34d', cooldownMs: 1400, damage: 1, radius: 1, durationMs: 3000, freezeMs: 800 }, 'staff'),
  trickster: W({ name: 'Joker Cards', desc: 'Three cards thrown in a wide fan.', kind: 'shot', color: '#f472b6', cooldownMs: 420, damage: 1, count: 3, spreadDeg: 34, speed: 11, range: 12 }, 'cards'),
  warden: W({ name: 'Tower Mace', desc: 'One crushing blow to the tile ahead that leaves the enemy dazed.', kind: 'melee', color: '#93c5fd', cooldownMs: 520, damage: 3, pattern: 'front', freezeMs: 700 }, 'mace'),
  chronomancer: W({ name: 'Time Lance', desc: 'An instant beam that freezes every enemy in its line.', kind: 'beam', color: '#2dd4bf', cooldownMs: 700, damage: 1, beams: 1, freezeMs: 1500 }, 'lance'),
  shade: W({ name: 'Shadow Mine', desc: 'Drop a mine that bursts when an enemy steps near it.', kind: 'mine', color: '#a5b4fc', cooldownMs: 650, damage: 2, radius: 1 }, 'mine'),
  templar: W({ name: 'Holy Hammer', desc: 'A thrown hammer that explodes on impact.', kind: 'shot', color: '#fef3c7', cooldownMs: 650, damage: 2, speed: 8, range: 12, explode: 1, size: 7 }, 'hammer'),
  drifter: W({ name: 'Wrench Boomerang', desc: 'Flies out, hits everything, and comes back.', kind: 'shot', color: '#fb923c', cooldownMs: 600, damage: 1, speed: 10, range: 5, returns: true, pierce: Infinity, size: 6 }, 'wrench'),
  specter: W({ name: 'Wisp Swarm', desc: 'Three little wisps that seek out enemies.', kind: 'shot', color: '#ddd6fe', cooldownMs: 650, damage: 1, count: 3, spreadDeg: 50, speed: 8, range: 14, homing: 4, size: 3 }, 'wisps'),
  ironclad: W({ name: 'Siege Cannon', desc: 'A heavy, slow shell with a big blast.', kind: 'shot', color: '#9ca3af', cooldownMs: 1100, damage: 3, speed: 6, range: 14, explode: 1, size: 9 }, 'cannon'),
  viper: W({ name: 'Venom Fangs', desc: 'Lightning-fast bites. A bitten enemy takes another hit a second later.', kind: 'melee', color: '#a3e635', cooldownMs: 120, damage: 1, pattern: 'front', poison: 1 }, 'fangs'),
  ghost: W({ name: 'Frost Shuriken', desc: 'Bounces three times and freezes what it hits.', kind: 'shot', color: '#e0f2fe', cooldownMs: 400, damage: 1, speed: 14, range: 20, bounce: 3, freezeMs: 900, size: 4 }, 'shuriken'),
  ember: W({ name: 'Flame Burst', desc: 'A short-range spray of five flames.', kind: 'shot', color: '#f97316', cooldownMs: 520, damage: 1, count: 5, spreadDeg: 50, speed: 9, range: 3 }, 'flames'),
  null: W({ name: 'Void Rail', desc: 'A devastating beam that tears through a whole line.', kind: 'beam', color: '#f3f4f6', cooldownMs: 900, damage: 3, beams: 1 }, 'rail'),
  titan: W({ name: 'Quake Stomp', desc: 'Cracks the ground in a cross, 3 tiles in every direction.', kind: 'nova', shape: 'cross', color: '#fdba74', cooldownMs: 1100, damage: 2, radius: 3 }, 'stomp'),
  rift: W({ name: 'Harmonic Ring', desc: 'A ring of force ripples out 3 tiles, hitting each enemy once as it passes.', kind: 'pulse', color: '#818cf8', cooldownMs: 700, damage: 1, radius: 3 }, 'ring'),
  oracle: W({ name: 'Prophecy Bolt', desc: 'A piercing bolt that never misses its line.', kind: 'shot', color: '#f0abfc', cooldownMs: 700, damage: 2, speed: 16, range: 22, pierce: Infinity, size: 4 }, 'prophecy'),
  ranger: W({ name: 'Longbow', desc: 'A fast arrow that pierces two enemies.', kind: 'shot', color: '#bef264', cooldownMs: 600, damage: 2, speed: 18, range: 24, pierce: 2, size: 3 }, 'longbow'),
  tinker: W({ name: 'Spark Coil', desc: 'A spark that chains lightning to three more enemies.', kind: 'shot', color: '#fbbf24', cooldownMs: 500, damage: 1, speed: 9, range: 14, chain: 3 }, 'coil'),
  valkyrie: W({ name: 'Shield Bash', desc: 'Slams the tile ahead, knocking the enemy back 2 tiles and stunning it.', kind: 'melee', color: '#fde68a', cooldownMs: 450, damage: 1, pattern: 'front', knockback: 2, freezeMs: 1200 }, 'shieldbash'),
  grimsby: W({ name: 'Collector’s Net', desc: 'A big, slow net that traps enemies for a while.', kind: 'shot', color: '#fde047', cooldownMs: 700, damage: 1, speed: 7, range: 7, freezeMs: 2600, size: 9 }, 'net'),
  corsair: W({ name: 'Blunderbuss', desc: 'Four pellets in a short, wide blast.', kind: 'shot', color: '#7dd3fc', cooldownMs: 650, damage: 1, count: 4, spreadDeg: 36, speed: 12, range: 4 }, 'blunderbuss'),
  revenant: W({ name: 'Soul Siphon', desc: 'A draining beam. Each kill restores 1 HP.', kind: 'beam', color: '#34d399', cooldownMs: 800, damage: 2, beams: 1, lifesteal: true }, 'siphon'),
  solaris: W({ name: 'Sunspears', desc: 'Three beams of sunlight fanned out ahead.', kind: 'beam', color: '#fbbf24', cooldownMs: 900, damage: 2, beams: 3 }, 'sunspears'),
  aurora: W({ name: 'Aurora Prism', desc: 'Three bouncing light shards that freeze.', kind: 'shot', color: '#5eead4', cooldownMs: 600, damage: 2, count: 3, spreadDeg: 20, speed: 12, range: 18, bounce: 2, freezeMs: 1200 }, 'prism'),
  paradox: W({ name: 'Paradox Engine', desc: 'Twin seeking bolts that explode and chain.', kind: 'shot', color: '#f43f5e', cooldownMs: 700, damage: 2, count: 2, spreadDeg: 16, speed: 10, range: 18, homing: 4, explode: 1, chain: 2, size: 6 }, 'engine'),
  falconer: W({ name: 'Hawk Talons', desc: 'A hawk that hunts enemies down and rips through one.', kind: 'shot', color: '#d6d3d1', cooldownMs: 420, damage: 1, speed: 13, range: 20, homing: 7, pierce: 1, size: 3 }, 'talons'),
  prospector: W({ name: 'TNT Stick', desc: 'Throw a stick of dynamite that blows up where it lands, 2 tiles wide.', kind: 'shot', color: '#facc15', cooldownMs: 900, damage: 2, speed: 8, range: 4, explode: 2, explodeAtEnd: true, size: 5 }, 'tnt'),
  bard: W({ name: 'Sonic Chord', desc: 'Three short waves of sound that pass through everything.', kind: 'shot', color: '#f0abfc', cooldownMs: 650, damage: 1, count: 3, spreadDeg: 60, speed: 8, range: 6, pierce: Infinity, size: 6 }, 'chord'),
  alchemist: W({ name: 'Acid Flask', desc: 'Bursts on impact and freezes everything in the splash.', kind: 'shot', color: '#6ee7b7', cooldownMs: 700, damage: 1, speed: 9, range: 9, explode: 1, freezeMs: 1000, size: 5 }, 'flask'),
  ronin: W({ name: 'Katana', desc: 'A wide crescent cut across the tiles ahead and beside you.', kind: 'melee', color: '#e2e8f0', cooldownMs: 230, damage: 1, pattern: 'arc' }, 'katana'),
  gladiator: W({ name: 'Trident Thrust', desc: 'A long stab through the three tiles ahead.', kind: 'melee', color: '#fca5a5', cooldownMs: 560, damage: 3, pattern: 'spear' }, 'trident'),
  puppeteer: W({ name: 'Razor Strings', desc: 'A fast string that stuns and leaps between four more enemies.', kind: 'shot', color: '#e0e7ff', cooldownMs: 650, damage: 1, speed: 20, range: 10, chain: 4, freezeMs: 500, size: 2 }, 'strings'),
  dragoon: W({ name: 'Dragon Breath', desc: 'A wide, short gout of seven flames.', kind: 'shot', color: '#fb923c', cooldownMs: 700, damage: 1, count: 7, spreadDeg: 70, speed: 8, range: 4 }, 'breath'),
  tidecaller: W({ name: 'Tidal Wave', desc: 'A wall of water three tiles wide rolls forward, sweeping enemies back and freezing them.', kind: 'wave', color: '#22d3ee', cooldownMs: 1100, damage: 1, range: 6, speed: 7, knockback: 1, freezeMs: 1000 }, 'wave'),
  automaton: W({ name: 'Gatling Arm', desc: 'Small bullets, as fast as you can tap.', kind: 'shot', color: '#fbbf24', cooldownMs: 90, damage: 1, speed: 16, range: 16, size: 3 }, 'gatling'),
  celestia: W({ name: 'Starfall', desc: 'Five falling stars that seek out your enemies.', kind: 'shot', color: '#fde047', cooldownMs: 900, damage: 2, count: 5, spreadDeg: 120, speed: 9, range: 18, homing: 5, size: 4 }, 'starfall'),
  archon: W({ name: 'Judgment Blade', desc: 'Strikes in a great X, 3 tiles along each diagonal, and stuns.', kind: 'melee', color: '#fbbf24', cooldownMs: 850, damage: 4, pattern: 'x', freezeMs: 1200 }, 'judgment'),
  genesis: W({ name: 'Genesis Bloom', desc: 'Blooms in a wide diamond around you. Each kill restores 1 HP.', kind: 'nova', shape: 'diamond', color: '#4ade80', cooldownMs: 1300, damage: 3, radius: 3, lifesteal: true }, 'bloom'),
  oblivion: W({ name: 'Erasure', desc: 'Beams of nothing in all four directions at once. Each kill restores 1 HP.', kind: 'beam', color: '#f43f5e', cooldownMs: 1000, damage: 4, beams: 4, lifesteal: true }, 'erasure'),
};

// Higher tiers carry better weapons: harder hits and faster recharge on top of each weapon's own style.
export const TIER_WEAPON: Record<Rarity, { damage: number; cooldown: number }> = {
  common: { damage: 1, cooldown: 1 },
  rare: { damage: 1.2, cooldown: 0.95 },
  epic: { damage: 1.4, cooldown: 0.9 },
  legendary: { damage: 1.7, cooldown: 0.85 },
  mythic: { damage: 2, cooldown: 0.8 },
};

export function getSignatureWeapon(characterId: string): WeaponDef {
  const weapon = SIGNATURE_WEAPONS[characterId] ?? SIGNATURE_WEAPONS.wanderer;
  const tier = TIER_WEAPON[rarityOf(characterId)];
  return { ...weapon, damage: weapon.damage * tier.damage, cooldownMs: weapon.cooldownMs * tier.cooldown };
}
