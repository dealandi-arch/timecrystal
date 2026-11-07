'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ABILITIES } from './abilities';
import { type SoundEngine, getSoundEngine } from './audio';
import TouchControls from './TouchControls';
import { COLS, FLOOR, ROWS, SECRET, TILE, type LevelDef, type Point, TOTAL_LEVELS } from './levels';
import { getEffectiveLevel } from './levelOverrides';
import { type Particle, drawParticles, spawnBurst, updateParticles } from './particles';
import {
  CHARACTERS,
  type CharacterDef,
  FLOOR_A,
  FLOOR_B,
  WALL,
  type Appearance,
  type Palette,
  getCharacterLook,
  getEnemyLook,
  getSpriteCanvas
} from './pixelArt';
import { STORY_CHAPTER_COUNT, VILLAINS, getChapterTitle, getNemesis } from './story';
import StoryStage from './StoryStage';
import SettingsPanel from './SettingsPanel';
import { DEFAULT_SETTINGS, type GameSettings, loadSettings, persistSettings } from './settings';
import { type AbilityId, type Save, clearSave, defaultSave, loadSave, persistSave } from './save';
import { type LevelRunStats, getLocalBest, saveLocalBestIfBetter } from './runStats';
import { BASIC_GUN, getSignatureWeapon } from './weapons';
import { type CombatHooks, drawCombat, explode, fireWeapon, makeCombat, updateCombat } from './combat';
import { RARITY_INFO, SHARDS_PER_LEVEL, rarityOf } from './gacha';
import { useCollection } from '../profile/CollectionContext';
import { type ClaimResult, useProgression } from '../profile/ProgressionContext';
import { applyWeaponRanks, heroSnapshot, ranksAtLevel } from './progression';
import { getPerkValues, getPerks } from './perks';
import { useProfile } from '../profile/ProfileContext';
import AuthWidget from '../profile/AuthWidget';
import SignInBanner from '../profile/SignInBanner';
import LeaderboardPanel from '../profile/LeaderboardPanel';
import { formatTime } from '../profile/formatTime';

const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
const MOVE_MS = 150;
const ATTACK_DURATION_MS = 180;
const ATTACK_COOLDOWN_MS = 260;
const PLAYER_MAX_HP = 5;
const HIT_INVULN_S = 0.7;
const CRYSTAL_DWELL_MS = 2200;
const CRYSTAL_MOVE_MS = 550;
const ENEMY_WANDER_MS = 900;
const BULLET_SPEED = 9;
const PIXEL_SIZE = TILE / 12;

const BASELINE_STATS = {
  maxHp: PLAYER_MAX_HP,
  moveMs: MOVE_MS,
  attackCooldownMs: ATTACK_COOLDOWN_MS,
  attackDurationMs: ATTACK_DURATION_MS,
  invulnS: HIT_INVULN_S,
  bulletSpeed: BULLET_SPEED,
};

export interface LevelTheme {
  pageGradient: string;
  floorAPalette: Palette;
  floorBPalette: Palette;
  wallPalette: Palette;
}

export const LEVEL_THEMES: LevelTheme[] = [
  // 1 — Blue Dungeon (default)
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #07070f 100%)',
    floorAPalette: { b: '#11173a', a: '#1a2356', h: '#232f6b', c: '#0d1230' },
    floorBPalette: { b: '#0e1433', a: '#172050', h: '#202b63', c: '#0b0f29' },
    wallPalette:   { m: '#211f57', a: '#312e81' } },
  // 2 — Purple Crypt
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #2e1065 0%, #0d0520 100%)',
    floorAPalette: { b: '#1e1040', a: '#2d1a5c', h: '#3d2270', c: '#140c2a' },
    floorBPalette: { b: '#190d38', a: '#271550', h: '#351c64', c: '#100924' },
    wallPalette:   { m: '#4c1d95', a: '#6d28d9' } },
  // 3 — Mossy Ruins
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #14532d 0%, #031a0d 100%)',
    floorAPalette: { b: '#0a2e10', a: '#0f3d18', h: '#145224', c: '#061a09' },
    floorBPalette: { b: '#08280e', a: '#0d3514', h: '#12491e', c: '#051608' },
    wallPalette:   { m: '#15803d', a: '#16a34a' } },
  // 4 — Desert Ruins
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #78350f 0%, #1c0a00 100%)',
    floorAPalette: { b: '#3d2200', a: '#5c3400', h: '#7a4600', c: '#271500' },
    floorBPalette: { b: '#361e00', a: '#4f2c00', h: '#6b3c00', c: '#221200' },
    wallPalette:   { m: '#92400e', a: '#b45309' } },
  // 5 — Volcanic
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #7f1d1d 0%, #1c0000 100%)',
    floorAPalette: { b: '#3d0a00', a: '#5c1200', h: '#7a1a00', c: '#200500' },
    floorBPalette: { b: '#360800', a: '#4f0f00', h: '#6b1600', c: '#1a0300' },
    wallPalette:   { m: '#7f1d1d', a: '#991b1b' } },
  // 6 — Frozen
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #0c4a6e 0%, #020c18 100%)',
    floorAPalette: { b: '#0c2540', a: '#0f3454', h: '#134468', c: '#071828' },
    floorBPalette: { b: '#0a2038', a: '#0d2e4a', h: '#103c5e', c: '#061420' },
    wallPalette:   { m: '#0369a1', a: '#0284c7' } },
  // 7 — Teal Depths
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #134e4a 0%, #021414 100%)',
    floorAPalette: { b: '#0d3534', a: '#134746', h: '#185c5b', c: '#082120' },
    floorBPalette: { b: '#0b2f2e', a: '#113f3e', h: '#165251', c: '#071b1a' },
    wallPalette:   { m: '#0f766e', a: '#0d9488' } },
  // 8 — Void
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #18181b 0%, #030303 100%)',
    floorAPalette: { b: '#0a0a12', a: '#0f0f1a', h: '#141424', c: '#050508' },
    floorBPalette: { b: '#08080f', a: '#0d0d16', h: '#12121e', c: '#040406' },
    wallPalette:   { m: '#27272a', a: '#3f3f46' } },
  // 9 — Golden Temple
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #451a03 0%, #1a0a00 100%)',
    floorAPalette: { b: '#3d2d00', a: '#574200', h: '#705600', c: '#251c00' },
    floorBPalette: { b: '#362400', a: '#4f3600', h: '#6b4a00', c: '#221600' },
    wallPalette:   { m: '#78350f', a: '#d97706' } },
  // 10 — Crystal Chamber
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #083344 0%, #010e14 100%)',
    floorAPalette: { b: '#0a2d3d', a: '#0d3d52', h: '#115068', c: '#061d28' },
    floorBPalette: { b: '#082836', a: '#0b3548', h: '#0e465e', c: '#051820' },
    wallPalette:   { m: '#0e7490', a: '#0891b2' } },
  // 11 — Infernal Boss
  { pageGradient: 'radial-gradient(ellipse at 50% 0%, #450a0a 0%, #0f0000 100%)',
    floorAPalette: { b: '#2d0505', a: '#440808', h: '#5c0c0c', c: '#1a0303' },
    floorBPalette: { b: '#280404', a: '#3c0707', h: '#510a0a', c: '#160202' },
    wallPalette:   { m: '#450a0a', a: '#7f1d1d' } },
];

type Dir = 'up' | 'down' | 'left' | 'right';
const DIR_VECTORS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

interface RuntimePlayer {
  gx: number;
  gy: number;
  fromX: number;
  fromY: number;
  moveT: number;
  moving: boolean;
  facing: Dir;
  hp: number;
  invuln: number;
  attackTimer: number;
  attackCooldown: number;
}

interface RuntimeEnemy {
  id: string;
  gx: number;
  gy: number;
  fromX: number;
  fromY: number;
  moveT: number;
  moving: boolean;
  alive: boolean;
  hp: number;
  maxHp: number;
  frozen: boolean;
  stunMs: number;
  wanderTimer: number;
  isBoss: boolean;
}

interface RuntimeCrystal {
  path: Point[];
  index: number;
  gx: number;
  gy: number;
  fromX: number;
  fromY: number;
  moveT: number;
  moving: boolean;
  dwell: number;
}

interface AbilityActive {
  navigate: boolean;
  invisibility: boolean;
  iceAge: boolean;
}

function isWalkable(level: LevelDef, x: number, y: number, forEnemy: boolean): boolean {
  const row = level.grid[y];
  if (!row) return false;
  const tile = row[x];
  if (tile === undefined) return false;
  if (tile === FLOOR) return true;
  if (tile === SECRET) return !forEnemy;
  return false;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function makePlayer(level: LevelDef, maxHp: number): RuntimePlayer {
  return {
    gx: level.start.x,
    gy: level.start.y,
    fromX: level.start.x,
    fromY: level.start.y,
    moveT: 1,
    moving: false,
    facing: 'down',
    hp: maxHp,
    invuln: 0,
    attackTimer: 0,
    attackCooldown: 0
  };
}

function makeEnemies(level: LevelDef): RuntimeEnemy[] {
  return level.enemies.map((e) => ({
    id: e.id,
    gx: e.x,
    gy: e.y,
    fromX: e.x,
    fromY: e.y,
    moveT: 1,
    moving: false,
    alive: true,
    hp: e.hp,
    maxHp: e.hp,
    frozen: false,
    stunMs: 0,
    wanderTimer: Math.random() * ENEMY_WANDER_MS,
    isBoss: level.isBoss
  }));
}

// Hidden Emerald Shards: random walkable tiles (secret passages included), never the start tile.
function pickEmeralds(level: LevelDef): Set<string> {
  const cells: string[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isWalkable(level, x, y, false) && !(x === level.start.x && y === level.start.y)) cells.push(`${x},${y}`);
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return new Set(cells.slice(0, SHARDS_PER_LEVEL));
}

// Speciality perk timers and counters; reset when the level restarts.
function freshPerkState() {
  return { regenT: 0, shieldUp: true, shieldT: 0, hasteT: 0, attacks: 0, kills: 0, revived: false, started: false, echoT: -1 };
}

function makeCrystal(level: LevelDef): RuntimeCrystal {
  const first = level.crystalPath[0];
  return {
    path: level.crystalPath,
    index: 0,
    gx: first.x,
    gy: first.y,
    fromX: first.x,
    fromY: first.y,
    moveT: 1,
    moving: false,
    dwell: CRYSTAL_DWELL_MS
  };
}

interface LevelRunnerProps {
  level: LevelDef;
  save: Save;
  sound: SoundEngine;
  characterId: string;
  theme: LevelTheme;
  appearance: Appearance;
  displayName?: string;
  onToggleAppearance?: () => void;
  onLevelComplete: (stats: LevelRunStats) => void;
  onAbilityUsed: () => void;
  onPowerActivated: () => void;
  onEmeraldFound: () => void;
  autoWeapon: boolean;
  paused: boolean;
  heroLevel: number;
  onRunFinished: (stats: LevelRunStats) => Promise<ClaimResult | null>;
  signedIn: boolean;
}

function LevelRunner({ level, save, sound, characterId, theme, appearance, displayName, onToggleAppearance, onLevelComplete, onAbilityUsed, onPowerActivated, onEmeraldFound, autoWeapon, paused, heroLevel, onRunFinished, signedIn }: LevelRunnerProps) {
  const charDef = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const charStats = charDef.stats;
  const baseSignature = getSignatureWeapon(charDef.id);
  const ranks = ranksAtLevel(heroLevel, baseSignature);
  const signature = applyWeaponRanks(baseSignature, ranks, true);
  const basicGun = applyWeaponRanks(BASIC_GUN, ranks, false);
  const perks = getPerkValues(charDef.id);
  // Gear and perks in a ref so the game loop always reads the latest values.
  const gearRef = useRef({ hero: charStats, base: BASELINE_STATS, signature, basicGun, perks });
  gearRef.current = { hero: charStats, base: BASELINE_STATS, signature, basicGun, perks };
  const emeraldRef = useRef(onEmeraldFound);
  emeraldRef.current = onEmeraldFound;

  // Ref so the game loop picks up appearance changes without restarting the level
  const appearanceRef = useRef(appearance);
  appearanceRef.current = appearance;

  // Ref updated every render so the game loop always reads the latest value
  const powerActiveRef = useRef(save.powerActivated);
  powerActiveRef.current = save.powerActivated;

  const effectiveMaxHp = save.powerActivated ? gearRef.current.hero.maxHp : gearRef.current.base.maxHp;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hp, setHp] = useState(effectiveMaxHp);
  const [enemiesLeft, setEnemiesLeft] = useState(level.enemies.length);
  const [toast, setToast] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [runStats, setRunStats] = useState<LevelRunStats | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [weaponSlot, setWeaponSlot] = useState<0 | 1>(autoWeapon ? 1 : 0);
  const [emeraldsFound, setEmeraldsFound] = useState(0);
  const [reward, setReward] = useState<ClaimResult | null>(null);
  const claimedRef = useRef(false);

  useEffect(() => {
    if (!runStats || claimedRef.current) return;
    claimedRef.current = true;
    onRunFinished(runStats).then(setReward);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStats]);

  const stateRef = useRef({
    player: makePlayer(level, effectiveMaxHp),
    enemies: makeEnemies(level),
    crystal: makeCrystal(level),
    combat: makeCombat(),
    emeralds: pickEmeralds(level),
    weaponSlot: (autoWeapon ? 1 : 0) as 0 | 1,
    particles: [] as Particle[],
    discoveredSecrets: new Set<string>(),
    shake: 0,
    keys: new Set<string>(),
    abilityActive: { navigate: false, invisibility: false, iceAge: false } as AbilityActive,
    toastTimer: 0,
    won: false,
    startTime: performance.now(),
    usedAbilityThisRun: false,
    perk: freshPerkState()
  });

  function resetLevelRuntime() {
    const s = stateRef.current;
    const maxHp = powerActiveRef.current ? gearRef.current.hero.maxHp : gearRef.current.base.maxHp;
    s.player = makePlayer(level, maxHp);
    s.enemies = makeEnemies(level);
    s.crystal = makeCrystal(level);
    s.combat = makeCombat(); // shards already found stay found
    s.perk = freshPerkState();
    s.shake = 0.3;
    s.won = false;
    s.startTime = performance.now();
    setHp(maxHp);
    setEnemiesLeft(s.enemies.filter((e) => e.alive).length);
  }

  // Turning the setting on mid-level equips the weapon straight away.
  useEffect(() => {
    if (!autoWeapon) return;
    stateRef.current.weaponSlot = 1;
    setWeaponSlot(1);
  }, [autoWeapon]);

  // On a touch device, bring the game to the top of the screen when a level starts.
  const shellRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
      // Include the crystal counter above the game when it's showing (it's hidden on a phone held sideways).
      const shell = shellRef.current;
      const counter = shell?.previousElementSibling as HTMLElement | null | undefined;
      (counter?.offsetParent ? counter : shell)?.scrollIntoView({ block: 'start' });
    }
  }, []);

  function touchPress(key: string) {
    sound.resume();
    stateRef.current.keys.add(key);
  }

  function touchRelease(key: string) {
    stateRef.current.keys.delete(key);
  }

  function toggleWeapon() {
    const s = stateRef.current;
    s.weaponSlot = s.weaponSlot === 0 ? 1 : 0;
    setWeaponSlot(s.weaponSlot);
    sound.playMenuClick();
  }

  function activateAbility() {
    if (!save.ability || save.abilityUsed) return;
    if (save.ability === 'killAll' && level.isBoss) return;
    const s = stateRef.current;
    s.usedAbilityThisRun = true;
    if (save.ability === 'navigate') {
      s.abilityActive.navigate = true;
    } else if (save.ability === 'killAll') {
      s.enemies.forEach((e) => {
        e.alive = false;
      });
      setEnemiesLeft(0);
    } else if (save.ability === 'invisibility') {
      s.abilityActive.invisibility = true;
    } else if (save.ability === 'iceAge') {
      s.abilityActive.iceAge = true;
      s.abilityActive.navigate = true;
      s.enemies.forEach((e) => {
        e.frozen = true;
      });
    }
    sound.playMenuClick();
    onAbilityUsed();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext('2d');
    if (!rawCtx) return;
    rawCtx.imageSmoothingEnabled = false;
    const ctx: CanvasRenderingContext2D = rawCtx;
    const s = stateRef.current;

    function onKeyDown(e: KeyboardEvent) {
      if (pausedRef.current) return;
      sound.resume();
      s.keys.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
      if (e.key.toLowerCase() === 'q' && !e.repeat) toggleWeaponRef.current();
    }
    function onKeyUp(e: KeyboardEvent) {
      s.keys.delete(e.key.toLowerCase());
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastTime = performance.now();
    let rafId = 0;
    let attackWasPressed = false;

    const hooks: CombatHooks = {
      get enemies() {
        return s.enemies;
      },
      particles: s.particles,
      tile: TILE,
      walkable: (x, y) => isWalkable(level, x, y, false),
      shake: (amount) => {
        s.shake = Math.max(s.shake, amount);
      },
      push: (enemy, tiles) => knockBack(enemy as RuntimeEnemy, tiles),
      modifyDamage: (enemy, amount) => {
        const perk = activePerks();
        let dmg = amount;
        const maxHp = powerActiveRef.current ? gearRef.current.hero.maxHp : gearRef.current.base.maxHp;
        if (perk.lastStand && s.player.hp <= Math.max(1, Math.floor(maxHp / 3))) dmg *= perk.lastStand;
        if (perk.giantSlayer && (enemy as RuntimeEnemy).maxHp > 1) dmg *= perk.giantSlayer;
        if (perk.crit && Math.random() < perk.crit) {
          dmg *= 2;
          spawnBurst(s.particles, (enemy.gx + 0.5) * TILE, (enemy.gy + 0.5) * TILE, ['#fde047', '#fff'], 10, 160, 0);
        }
        return dmg;
      },
      onHit: (enemy, weapon, killed) => {
        const hitX = (enemy.gx + 0.5) * TILE;
        const hitY = (enemy.gy + 0.5) * TILE;
        if (killed) onPerkKill(enemy as RuntimeEnemy);
        else if (activePerks().knockback) knockBack(enemy as RuntimeEnemy, activePerks().knockback as number);
        if (killed) {
          spawnBurst(s.particles, hitX, hitY, ['#f472b6', '#fbcfe8', '#831843'], 14, 140, 220);
          sound.playEnemyDeath();
          setEnemiesLeft(s.enemies.filter((e) => e.alive).length);
          if (weapon.lifesteal) {
            const maxHp = powerActiveRef.current ? gearRef.current.hero.maxHp : gearRef.current.base.maxHp;
            s.player.hp = Math.min(maxHp, s.player.hp + 1);
            setHp(s.player.hp);
            spawnBurst(s.particles, (s.player.gx + 0.5) * TILE, (s.player.gy + 0.5) * TILE, ['#34d399', '#a7f3d0'], 10, 80, -60);
          }
        } else {
          spawnBurst(s.particles, hitX, hitY, [weapon.color, '#fff'], 6, 90, 160);
          sound.playHit();
        }
      },
    };

    // Perks only work while the speciality is active.
    function activePerks() {
      return powerActiveRef.current ? gearRef.current.perks : {};
    }

    function enemySpeed(enemy: RuntimeEnemy) {
      const perk = activePerks();
      let speed = perk.timeSlow ?? 1;
      if (perk.slowAura && Math.max(Math.abs(enemy.gx - s.player.gx), Math.abs(enemy.gy - s.player.gy)) <= perk.slowAura) speed *= 0.5;
      return speed;
    }

    function heal(amount: number, color = '#34d399') {
      const maxHp = powerActiveRef.current ? gearRef.current.hero.maxHp : gearRef.current.base.maxHp;
      if (s.player.hp >= maxHp) return;
      s.player.hp = Math.min(maxHp, s.player.hp + amount);
      setHp(s.player.hp);
      spawnBurst(s.particles, (s.player.gx + 0.5) * TILE, (s.player.gy + 0.5) * TILE, [color, '#fff'], 10, 80, -60);
    }

    function onPerkKill(enemy: RuntimeEnemy) {
      const perk = activePerks();
      if (perk.killHaste) s.perk.hasteT = perk.killHaste;
      if (perk.vampire) {
        s.perk.kills++;
        if (s.perk.kills % perk.vampire === 0) heal(1, '#f43f5e');
      }
      if (perk.killShield && !s.perk.shieldUp && Math.random() < perk.killShield) s.perk.shieldUp = true;
      if (perk.momentum && Math.random() < perk.momentum) s.player.attackCooldown = 0;
      if (perk.deathBurst) {
        explode(s.combat, hooks, enemy.gx, enemy.gy, perk.deathBurst, { ...gearRef.current.basicGun, color: '#fb923c', damage: 1 });
      }
    }

    function knockBack(enemy: RuntimeEnemy, tiles: number) {
      const dx = Math.sign(enemy.gx - s.player.gx);
      const dy = Math.sign(enemy.gy - s.player.gy);
      if (!dx && !dy) return;
      for (let i = 0; i < tiles; i++) {
        const nx = enemy.gx + dx;
        const ny = enemy.gy + dy;
        const blocked = !isWalkable(level, nx, ny, true) || s.enemies.some((o) => o !== enemy && o.alive && o.gx === nx && o.gy === ny);
        if (blocked) break;
        enemy.fromX = enemy.gx;
        enemy.fromY = enemy.gy;
        enemy.gx = nx;
        enemy.gy = ny;
        enemy.moveT = 0;
        enemy.moving = true;
      }
    }

    function heldDirection(): Dir | null {
      if (s.keys.has('arrowup') || s.keys.has('w')) return 'up';
      if (s.keys.has('arrowdown') || s.keys.has('s')) return 'down';
      if (s.keys.has('arrowleft') || s.keys.has('a')) return 'left';
      if (s.keys.has('arrowright') || s.keys.has('d')) return 'right';
      return null;
    }

    function stepEntityMove(
      entity: { fromX: number; fromY: number; gx: number; gy: number; moveT: number; moving: boolean },
      dt: number,
      durationMs: number
    ) {
      entity.moveT += dt / (durationMs / 1000);
      if (entity.moveT >= 1) {
        entity.moveT = 1;
        entity.moving = false;
      }
    }

    function update(dt: number) {
      if (s.won) return;
      const effectiveStats = powerActiveRef.current ? gearRef.current.hero : gearRef.current.base;
      const p = s.player;

      const dir = heldDirection();
      if (dir) p.facing = dir;

      if (!p.moving) {
        if (dir) {
          const { dx, dy } = DIR_VECTORS[dir];
          const nx = p.gx + dx;
          const ny = p.gy + dy;
          if (isWalkable(level, nx, ny, false)) {
            p.fromX = p.gx;
            p.fromY = p.gy;
            p.gx = nx;
            p.gy = ny;
            p.moving = true;
            p.moveT = 0;
          }
        }
      } else {
        stepEntityMove(p, dt, s.perk.hasteT > 0 ? effectiveStats.moveMs / 1.5 : effectiveStats.moveMs);
      }

      const perk = activePerks();
      if (s.perk.hasteT > 0) s.perk.hasteT -= dt;
      if (!s.perk.started) {
        s.perk.started = true;
        if (perk.shield) s.perk.shieldUp = true; // the Barrier is ready when a level starts
        if (perk.headstart) p.invuln = Math.max(p.invuln, perk.headstart);
      }
      if (perk.regen) {
        s.perk.regenT += dt;
        if (s.perk.regenT >= perk.regen) {
          s.perk.regenT = 0;
          heal(1);
        }
      }
      if (perk.shield && !s.perk.shieldUp) {
        s.perk.shieldT += dt;
        if (s.perk.shieldT >= perk.shield) {
          s.perk.shieldT = 0;
          s.perk.shieldUp = true;
        }
      }

      const attackKey = s.keys.has(' ') || s.keys.has('j');
      if (p.attackCooldown > 0) p.attackCooldown -= dt * 1000;
      if (attackKey && !attackWasPressed && p.attackCooldown <= 0) {
        const weapon = s.weaponSlot === 0 ? gearRef.current.basicGun : gearRef.current.signature;
        p.attackTimer = effectiveStats.attackDurationMs;
        p.attackCooldown = s.weaponSlot === 0 ? effectiveStats.attackCooldownMs : weapon.cooldownMs;
        const fired = fireWeapon(s.combat, hooks, weapon, { x: p.gx, y: p.gy }, DIR_VECTORS[p.facing], effectiveStats.bulletSpeed);
        if (fired.dashTo) {
          // Blink: slide the hero to where the attack ended.
          p.fromX = p.gx;
          p.fromY = p.gy;
          p.gx = fired.dashTo.x;
          p.gy = fired.dashTo.y;
          p.moving = true;
          p.moveT = 0;
        }
        if (weapon.kind === 'melee') sound.playHit();
        else sound.playShoot();
        s.perk.attacks++;
        if (perk.echoShot && s.perk.attacks % perk.echoShot === 0) s.perk.echoT = 0.12;
      }
      if (s.perk.echoT >= 0) {
        s.perk.echoT -= dt;
        if (s.perk.echoT < 0) {
          const weapon = s.weaponSlot === 0 ? gearRef.current.basicGun : gearRef.current.signature;
          fireWeapon(s.combat, hooks, weapon, { x: p.gx, y: p.gy }, DIR_VECTORS[p.facing], effectiveStats.bulletSpeed);
          spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#c084fc', '#fff'], 6, 70, 0);
        }
      }
      attackWasPressed = attackKey;
      if (p.attackTimer > 0) p.attackTimer -= dt * 1000;
      if (p.invuln > 0) p.invuln -= dt;
      if (s.shake > 0) s.shake -= dt;

      updateCombat(s.combat, hooks, dt, { x: p.gx, y: p.gy });

      for (const enemy of s.enemies) {
        if (enemy.stunMs > 0) enemy.stunMs -= dt * 1000;
      }


      for (const enemy of s.enemies) {
        if (!enemy.alive) continue;
        if (enemy.frozen || enemy.stunMs > 0) continue;
        if (!enemy.moving) {
          enemy.wanderTimer -= dt * 1000 * enemySpeed(enemy);
          if (enemy.wanderTimer <= 0) {
            enemy.wanderTimer = ENEMY_WANDER_MS * (0.6 + Math.random() * 0.8);
            const dirs: Dir[] = ['up', 'down', 'left', 'right'];
            const choice = dirs[Math.floor(Math.random() * dirs.length)];
            const { dx, dy } = DIR_VECTORS[choice];
            const nx = enemy.gx + dx;
            const ny = enemy.gy + dy;
            const occupied = s.enemies.some((other) => other !== enemy && other.alive && other.gx === nx && other.gy === ny);
            if (isWalkable(level, nx, ny, true) && !occupied) {
              enemy.fromX = enemy.gx;
              enemy.fromY = enemy.gy;
              enemy.gx = nx;
              enemy.gy = ny;
              enemy.moving = true;
              enemy.moveT = 0;
            }
          }
        } else {
          stepEntityMove(enemy, dt, MOVE_MS / enemySpeed(enemy));
        }

        if (
          !s.abilityActive.invisibility &&
          p.invuln <= 0 &&
          enemy.gx === p.gx &&
          enemy.gy === p.gy
        ) {
          // Touch effects happen whether or not the hit lands.
          if (perk.thorns) {
            enemy.hp -= perk.thorns;
            if (enemy.hp <= 0) {
              enemy.alive = false;
              hooks.onHit(enemy, gearRef.current.basicGun, true);
            }
          }
          if (perk.stunTouch && enemy.alive) enemy.stunMs = Math.max(enemy.stunMs, perk.stunTouch * 1000);
          p.invuln = effectiveStats.invulnS;
          if (perk.dodge && Math.random() < perk.dodge) {
            spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#e0f2fe', '#fff'], 8, 120, 0);
            continue;
          }
          if (s.perk.shieldUp && (perk.shield || perk.killShield)) {
            s.perk.shieldUp = false;
            s.perk.shieldT = 0;
            spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#38bdf8', '#bae6fd', '#fff'], 14, 140, 0);
            sound.playHit();
            continue;
          }
          p.hp -= 1;
          s.shake = 0.2;
          spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#f87171', '#fecaca'], 10, 110, 180);
          sound.playPlayerHurt();
          if (perk.frostOnHurt) {
            for (const other of s.enemies) {
              if (other.alive && Math.max(Math.abs(other.gx - p.gx), Math.abs(other.gy - p.gy)) <= 1) other.stunMs = Math.max(other.stunMs, perk.frostOnHurt * 1000);
            }
            spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#93c5fd', '#e0f2fe'], 18, 150, 0);
          }
          if (p.hp <= 0 && perk.revive && !s.perk.revived) {
            const maxHp = powerActiveRef.current ? gearRef.current.hero.maxHp : gearRef.current.base.maxHp;
            s.perk.revived = true;
            p.hp = Math.max(1, Math.round(maxHp * perk.revive));
            p.invuln = Math.max(p.invuln, 1.5);
            spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#fde047', '#fff', '#fbbf24'], 30, 180, -40);
          }
          setHp(p.hp);
          if (p.hp <= 0) {
            resetLevelRuntime();
            return;
          }
        }
      }

      if (level.grid[p.gy][p.gx] === SECRET) {
        const key = `${p.gx},${p.gy}`;
        if (!s.discoveredSecrets.has(key)) {
          s.discoveredSecrets.add(key);
          spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#67e8f9', '#a5f3fc', '#fff'], 16, 110, -40);
          sound.playSecretFound();
        }
      }

      const emeraldKey = `${p.gx},${p.gy}`;
      if (s.emeralds.has(emeraldKey)) {
        s.emeralds.delete(emeraldKey);
        spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#10b981', '#6ee7b7', '#d1fae5', '#fff'], 24, 150, -50);
        sound.playCrystalPickup();
        setEmeraldsFound((n) => n + 1);
        emeraldRef.current();
      }

      updateParticles(s.particles, dt);

      const crystal = s.crystal;
      if (!crystal.moving) {
        crystal.dwell -= dt * 1000;
        if (crystal.dwell <= 0) {
          const nextIndex = (crystal.index + 1) % crystal.path.length;
          const next = crystal.path[nextIndex];
          crystal.fromX = crystal.gx;
          crystal.fromY = crystal.gy;
          crystal.gx = next.x;
          crystal.gy = next.y;
          crystal.index = nextIndex;
          crystal.moving = true;
          crystal.moveT = 0;
        }
      } else {
        stepEntityMove(crystal, dt, CRYSTAL_MOVE_MS);
        if (!crystal.moving) crystal.dwell = CRYSTAL_DWELL_MS;
      }

      if (Math.random() < 0.05) {
        spawnBurst(s.particles, (lerp(crystal.fromX, crystal.gx, crystal.moveT) + 0.5) * TILE, (lerp(crystal.fromY, crystal.gy, crystal.moveT) + 0.5) * TILE, ['#67e8f9', '#a5f3fc'], 1, 20, -10);
      }

      if (crystal.gx === p.gx && crystal.gy === p.gy) {
        const remaining = s.enemies.filter((e) => e.alive).length;
        if (remaining === 0) {
          s.won = true;
          setWon(true);
          setRunStats({
            timeMs: Math.round(performance.now() - s.startTime),
            kills: level.enemies.length,
            secrets: s.discoveredSecrets.size,
            usedAbility: s.usedAbilityThisRun
          });
          spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#67e8f9', '#fde047', '#fff'], 30, 160, 60);
          sound.playLevelComplete();
        } else if (s.toastTimer <= 0) {
          s.toastTimer = 1800;
          setToast('Defeat every enemy before the crystal will let you near.');
        }
      }
      if (s.toastTimer > 0) {
        s.toastTimer -= dt * 1000;
        if (s.toastTimer <= 0) setToast(null);
      }
    }

    function entityPixelPos(entity: { fromX: number; fromY: number; gx: number; gy: number; moveT: number }) {
      const x = lerp(entity.fromX, entity.gx, entity.moveT) * TILE;
      const y = lerp(entity.fromY, entity.gy, entity.moveT) * TILE;
      return { x, y };
    }

    function draw() {
      const effectiveStats = powerActiveRef.current ? gearRef.current.hero : gearRef.current.base;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake * 18, (Math.random() - 0.5) * s.shake * 18);
      }

      const floorA = getSpriteCanvas(`floorA:${level.id}`, FLOOR_A, theme.floorAPalette, PIXEL_SIZE);
      const floorB = getSpriteCanvas(`floorB:${level.id}`, FLOOR_B, theme.floorBPalette, PIXEL_SIZE);
      const wall = getSpriteCanvas(`wall:${level.id}`, WALL, theme.wallPalette, PIXEL_SIZE);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const tile = level.grid[y][x];
          if (tile === FLOOR) {
            ctx.drawImage((x + y) % 2 === 0 ? floorA : floorB, x * TILE, y * TILE);
          } else {
            ctx.drawImage(wall, x * TILE, y * TILE);
            if (tile === SECRET && (s.abilityActive.iceAge || activePerks().secretSight)) {
              ctx.fillStyle = 'rgba(103, 232, 249, 0.3)';
              ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            }
          }
        }
      }

      const time = performance.now() / 1000;
      const drawPerks = activePerks();
      if (drawPerks.shardSense) {
        for (const key of s.emeralds) {
          const [ex, ey] = key.split(',').map(Number);
          if (Math.max(Math.abs(ex - s.player.gx), Math.abs(ey - s.player.gy)) > drawPerks.shardSense) continue;
          ctx.globalAlpha = 0.45 + Math.sin(time * 6 + ex) * 0.25;
          drawDiamond(ctx, (ex + 0.5) * TILE, (ey + 0.5) * TILE, 6, '#10b981');
          ctx.globalAlpha = 1;
        }
      }
      if (drawPerks.crystalSense) {
        for (let i = 1; i <= drawPerks.crystalSense; i++) {
          const stop = s.crystal.path[(s.crystal.index + i) % s.crystal.path.length];
          ctx.strokeStyle = `rgba(103, 232, 249, ${0.7 / i})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(stop.x * TILE + 6, stop.y * TILE + 6, TILE - 12, TILE - 12);
          ctx.setLineDash([]);
        }
      }
      const crystalPos = entityPixelPos(s.crystal);
      const bob = Math.sin(time * 3) * 4;
      drawDiamond(ctx, crystalPos.x + TILE / 2, crystalPos.y + TILE / 2 + bob, 14, '#67e8f9');

      for (const enemy of s.enemies) {
        if (!enemy.alive) continue;
        const pos = entityPixelPos(enemy);
        const kind = enemy.isBoss ? 'boss' : enemy.frozen || enemy.stunMs > 0 ? 'frozen' : 'enemy';
        const enemyLook = getEnemyLook(kind, appearanceRef.current);
        const sprite = getSpriteCanvas(`enemy:${kind}:${appearanceRef.current}`, enemyLook.sprite, enemyLook.palette, TILE / enemyLook.sprite.length);
        const bobY = Math.sin(time * 4 + pos.x) * 2;
        ctx.drawImage(sprite, pos.x, pos.y + bobY);
        if (enemy.maxHp > 1) {
          const barW = 28;
          const cx = pos.x + TILE / 2;
          const cy = pos.y - 6;
          ctx.fillStyle = 'rgba(15,23,42,0.7)';
          ctx.fillRect(cx - barW / 2, cy, barW, 5);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(cx - barW / 2, cy, barW * (enemy.hp / enemy.maxHp), 5);
        }
      }

      const p = s.player;
      const ppos = entityPixelPos(p);
      const px = ppos.x;
      const py = ppos.y;
      const look = getCharacterLook(charDef, appearanceRef.current);
      const playerSprite = getSpriteCanvas(`player:${characterId}:${appearanceRef.current}`, look.sprite, look.palette, TILE / look.sprite.length);
      const walkBob = p.moving ? Math.sin(time * 16) * 1.5 : 0;
      ctx.drawImage(playerSprite, px, py + walkBob);
      if (s.perk.shieldUp && (drawPerks.shield || drawPerks.killShield)) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2 + walkBob, TILE * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (s.perk.hasteT > 0 && p.moving) spawnBurst(s.particles, px + TILE / 2, py + TILE - 4, ['#facc15'], 1, 20, 0);
      const flashing = p.invuln > 0 && Math.floor(time * 10) % 2 === 0;
      if (flashing) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(248, 113, 113, 0.6)';
        ctx.fillRect(px, py + walkBob, TILE, TILE);
        ctx.globalCompositeOperation = 'source-over';
      }

      const { dx, dy } = DIR_VECTORS[p.facing];
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(px + TILE / 2 + dx * 14 - 4, py + TILE / 2 + dy * 14 - 4 + walkBob, 8, 8);

      if (p.attackTimer > 0) {
        const flashAlpha = p.attackTimer / effectiveStats.attackDurationMs;
        ctx.fillStyle = `rgba(253, 224, 71, ${flashAlpha})`;
        ctx.beginPath();
        ctx.arc(px + TILE / 2 + dx * 24, py + TILE / 2 + dy * 24 + walkBob, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      drawCombat(ctx, s.combat, TILE, time);

      if (s.abilityActive.navigate) {
        const pcx = px + TILE / 2;
        const pcy = py + TILE / 2;
        const ccx = crystalPos.x + TILE / 2;
        const ccy = crystalPos.y + TILE / 2;
        ctx.strokeStyle = 'rgba(165, 243, 252, 0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(pcx, pcy);
        ctx.lineTo(ccx, ccy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      drawParticles(ctx, s.particles);
      ctx.restore();
    }

    function drawDiamond(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
      c.beginPath();
      c.moveTo(x, y - size);
      c.lineTo(x + size, y);
      c.lineTo(x, y + size);
      c.lineTo(x - size, y);
      c.closePath();
      c.fillStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 12;
      c.fill();
      c.shadowBlur = 0;
    }

    function loop(now: number) {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      if (pausedRef.current) s.startTime += now - lastTime; // paused time doesn't count toward the run
      lastTime = now;
      if (!pausedRef.current) update(dt);
      draw();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const toggleWeaponRef = useRef(toggleWeapon);
  toggleWeaponRef.current = toggleWeapon;
  const currentWeapon = weaponSlot === 0 ? BASIC_GUN : signature;

  const abilityDef = ABILITIES.find((a) => a.id === save.ability);
  const abilityBlockedHere = save.ability === 'killAll' && level.isBoss;
  const canUseAbility = !!save.ability && !save.abilityUsed && !abilityBlockedHere;

  return (
    <div className="rpg-shell" ref={shellRef}>
      <div className="rpg-hud">
        <span>{displayName ?? level.name}</span>
        <span>HP: {'❤'.repeat(Math.max(0, hp))}{'♡'.repeat(Math.max(0, effectiveMaxHp - hp))}</span>
        <span>Enemies left: {enemiesLeft}</span>
        <span className="emerald-count" title="Hidden Emerald Shards found in this level">
          💎 {emeraldsFound}/{SHARDS_PER_LEVEL}
        </span>
        <button className="ability-btn weapon-btn" onClick={toggleWeapon} title={currentWeapon.desc} style={{ borderColor: currentWeapon.color }}>
          ⚔ {currentWeapon.name} <kbd>Q</kbd>
        </button>
        {onToggleAppearance && (
          <button className="ability-btn look-btn" onClick={() => { sound.playMenuClick(); onToggleAppearance(); }}>
            Look: {appearance === 'human' ? 'Human' : 'Original'}
          </button>
        )}
        <button
          className="ability-btn power-btn"
          disabled={save.powerActivated}
          onClick={() => { sound.playMenuClick(); onPowerActivated(); }}
        >
          {save.powerActivated ? `${charStats.passiveName} (active)` : `Activate ${charStats.passiveName}`}
        </button>
        {abilityDef && (
          <button className="ability-btn" disabled={!canUseAbility} onClick={activateAbility}>
            {save.abilityUsed ? `${abilityDef.name} (used)` : `Use ${abilityDef.name}`}
          </button>
        )}
      </div>
      <div className="rpg-canvas-wrap">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
        {toast && <div className="rpg-toast">{toast}</div>}
        {won && runStats && (
          <div className="game-overlay">
            <h2>{level.isBoss ? 'The Time Crystal Is Whole Again' : 'Crystal Secured'}</h2>
            <p>{level.isBoss ? 'You defeated the guardian and restored the final shard.' : 'On to the next level.'}</p>
            <p>
              Emerald Shards found: {emeraldsFound}/{SHARDS_PER_LEVEL}
            </p>
            {signedIn && reward && (
              <p className="run-reward">
                {reward.pending
                  ? 'Your Aizodon couldn’t be saved yet. It’s kept and will be added automatically.'
                  : reward.earned > 0
                    ? <>Rank {reward.rank} &nbsp;·&nbsp; ⬡ +{reward.earned} Aizodon</>
                    : reward.reason}
              </p>
            )}
            {!signedIn && <p className="run-reward">Sign in to earn Aizodon and level up your heroes.</p>}
            <p>
              Time: {formatTime(runStats.timeMs)} &nbsp;·&nbsp; Secrets found: {runStats.secrets}
              {(() => {
                const best = getLocalBest(level.id);
                return best ? <> &nbsp;·&nbsp; Your best: {formatTime(best.timeMs)}</> : null;
              })()}
            </p>
            {runStats.usedAbility && <p className="ability-disqualified-note">A help ability was used on this level, so this run will not count toward the world record.</p>}
            <LeaderboardPanel levelId={level.id} />
            <button
              onClick={() => {
                sound.playMenuClick();
                onLevelComplete(runStats);
              }}
            >
              {level.isBoss ? 'Finish' : 'Next level'}
            </button>
          </div>
        )}
      </div>
      {!won && (
        <TouchControls
          onPress={touchPress}
          onRelease={touchRelease}
          onToggleWeapon={toggleWeapon}
          weaponName={currentWeapon.name}
          weaponColor={currentWeapon.color}
        />
      )}
      <p className="game-controls">
        <span className="keyboard-hint">Move: Arrow keys / WASD &nbsp;·&nbsp; Attack: Space / J &nbsp;·&nbsp; Switch weapon: Q &nbsp;·&nbsp; </span>
        Clear every enemy, then catch the crystal. Five Emerald Shards are hidden on random tiles — step on them to collect.
      </p>
    </div>
  );
}

// Largest whole-pixel scale that fits ~80px (12-grid sprites → 6px, 16-grid → 5px)
const PREVIEW_MAX = 80;

function SpritePreview({ char, appearance = 'original' }: { char: CharacterDef; appearance?: Appearance }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const look = getCharacterLook(char, appearance);
  const ps = Math.floor(PREVIEW_MAX / look.sprite.length);
  const size = look.sprite.length * ps;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(getSpriteCanvas(`preview:${char.id}:${appearance}`, look.sprite, look.palette, ps), 0, 0);
  }, [char, appearance, look, ps, size]);
  return <canvas ref={ref} width={size} height={size} style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }} />;
}

function AppearanceToggle({ appearance, onChange }: { appearance: Appearance; onChange: (a: Appearance) => void }) {
  return (
    <div className="look-toggle" role="group" aria-label="Character look">
      <button className={appearance === 'original' ? 'active' : ''} onClick={() => onChange('original')}>
        Original
      </button>
      <button className={appearance === 'human' ? 'active' : ''} onClick={() => onChange('human')}>
        Human
      </button>
    </div>
  );
}

export function CharacterSelectScreen({
  onChoose,
  appearance,
  onAppearanceChange,
  showNemesis = false,
  title = 'Choose Your Character',
  subtitle = 'Pick who travels through time. This choice is yours to keep.'
}: {
  onChoose: (id: string) => void;
  appearance?: Appearance;
  onAppearanceChange?: (a: Appearance) => void;
  showNemesis?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const { isUnlocked, shards } = useCollection();
  const { signedIn, levelOf } = useProgression();
  return (
    <div className="ability-select">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <p className="select-shards">
        💎 {shards} Emerald Shards &nbsp;·&nbsp; <a href="/gacha">Summon more heroes</a>
        {signedIn && <> &nbsp;·&nbsp; <a href="/level-up">Level up heroes</a></>}
      </p>
      {appearance && onAppearanceChange && (
        <>
          <p>Switch between the original look and a human look at any time.</p>
          <AppearanceToggle appearance={appearance} onChange={onAppearanceChange} />
        </>
      )}
      <div className="ability-grid">
        {CHARACTERS.map((c) => {
          const rarity = rarityOf(c.id);
          const unlocked = isUnlocked(c.id);
          const weapon = getSignatureWeapon(c.id);
          return (
          <button
            key={c.id}
            className={`ability-card rarity-${rarity} ${unlocked ? '' : 'locked'}`}
            onClick={() => unlocked && onChoose(c.id)}
            aria-disabled={!unlocked}
          >
            <span className="rarity-badge" style={{ background: RARITY_INFO[rarity].color }}>{RARITY_INFO[rarity].name}</span>
            <div className="char-portrait">
              <SpritePreview char={c} appearance={appearance} />
              <div className="char-portrait-name">{c.name}</div>
              {signedIn && unlocked && (
                <div className="char-level">Lv {levelOf(c.id)} &nbsp;·&nbsp; OVRL {heroSnapshot(c, levelOf(c.id)).power}</div>
              )}
            </div>
            {!unlocked && <p className="locked-note">🔒 Locked — get this hero from the Gacha.</p>}
            <p className="char-desc">{c.description}</p>
            <p className="char-passive"><strong>{c.stats.passiveName}</strong> — {c.stats.passiveDesc}</p>
            <ul className="char-perks">
              {getPerks(c.id).map((perk) => (
                <li key={perk.kind}><strong>{perk.name}:</strong> {perk.desc}</li>
              ))}
            </ul>
            <p className="char-weapon" style={{ color: weapon.color }}>
              <strong>⚔ {weapon.name}</strong> — {weapon.desc}
            </p>
            {showNemesis && (
              <p className="char-nemesis">
                <strong>Nemesis: {VILLAINS[getNemesis(c.id)].name}</strong> — {VILLAINS[getNemesis(c.id)].blurb}
              </p>
            )}
          </button>
          );
        })}
      </div>
    </div>
  );
}

function AbilitySelectScreen({ onChoose }: { onChoose: (id: AbilityId) => void }) {
  return (
    <div className="ability-select">
      <h1>Choose Your Help</h1>
      <SignInBanner />
      <p>You may pick one. Once you use it, it is gone for the rest of the journey.</p>
      <div className="ability-grid">
        {ABILITIES.map((a) => (
          <button key={a.id} className="ability-card" onClick={() => onChoose(a.id)}>
            <h3>{a.name}</h3>
            <p>{a.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function FinaleScreen({ onRestart, story }: { onRestart: () => void; story?: boolean }) {
  return (
    <div className="ability-select">
      <h1>{story ? 'The End' : 'Time Crystal Restored'}</h1>
      <p>All eleven shards are yours. The timeline holds.</p>
      <button className="ability-card" onClick={onRestart}>
        Play again
      </button>
    </div>
  );
}

export const MUTE_STORAGE_KEY = 'timeCrystalMuted';

export default function TimeCrystalRPG({ mode = 'classic' }: { mode?: 'classic' | 'story' }) {
  const [save, setSave] = useState<Save | null>(null);
  const [muted, setMutedFlag] = useState(false);
  const soundRef = useRef<SoundEngine | null>(null);
  if (!soundRef.current) soundRef.current = getSoundEngine();
  const sound = soundRef.current;
  const { profile, submitRun } = useProfile();
  const { addShards } = useCollection();
  const { signedIn, levelOf, claimRun } = useProgression();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleLevelComplete(level: LevelDef, currentSave: Save, stats: LevelRunStats) {
    saveLocalBestIfBetter(level.id, stats);
    if (profile) submitRun(level.id, stats.timeMs, stats.kills, stats.secrets, stats.usedAbility);
    updateSave({
      ...currentSave,
      crystalsCollected: currentSave.crystalsCollected + 1,
      currentLevel: currentSave.currentLevel + 1
    });
  }

  useEffect(() => {
    setSave(loadSave());
    setSettings(loadSettings());
    const storedMuted = window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    setMutedFlag(storedMuted);
    sound.setMuted(storedMuted);
  }, [sound]);

  useEffect(() => {
    if (save && settings.autoSpeciality && save.characterId && !save.powerActivated) {
      updateSave({ ...save, powerActivated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, settings.autoSpeciality]);

  function changeSettings(next: GameSettings) {
    setSettings(next);
    persistSettings(next);
    sound.setMusicEnabled(next.musicOn);
    sound.setSfxEnabled(next.sfxOn);
  }

  function updateSave(next: Save) {
    setSave(next);
    persistSave(next);
  }

  function toggleMuted() {
    const next = !muted;
    setMutedFlag(next);
    sound.setMuted(next);
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
  }

  const isStory = mode === 'story';
  const storyChar = CHARACTERS.find((c) => c.id === save?.characterId) ?? CHARACTERS[0];

  function setAppearance(appearance: Appearance) {
    if (!save) return;
    sound.playMenuClick();
    updateSave({ ...save, appearance });
  }

  let body: ReactNode = null;
  if (save && save.characterId === null) {
    body = (
      <CharacterSelectScreen
        appearance={save.appearance}
        onAppearanceChange={setAppearance}
        showNemesis={isStory}
        onChoose={(id) => {
          sound.resume();
          sound.playMenuClick();
          updateSave({ ...save, characterId: id });
          if (profile) {
            fetch('/api/profile/recent', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: id }) }).catch(() => {});
          }
        }}
      />
    );
  } else if (save && !save.ability) {
    body = (
      <AbilitySelectScreen
        onChoose={(id) => {
          sound.resume();
          sound.playMenuClick();
          updateSave({ ...save, ability: id });
        }}
      />
    );
  } else if (save && isStory && save.currentLevel > TOTAL_LEVELS && save.storySeen <= TOTAL_LEVELS) {
    body = (
      <StoryStage
        key="epilogue"
        chapterIndex="epilogue"
        hero={storyChar}
        theme={LEVEL_THEMES[9]}
        sound={sound}
        appearance={save.appearance}
        onAppearanceChange={setAppearance}
        doneLabel="Finish"
        onDone={() => {
          sound.playMenuClick();
          updateSave({ ...save, storySeen: TOTAL_LEVELS + 1 });
        }}
      />
    );
  } else if (save && save.currentLevel > TOTAL_LEVELS) {
    body = (
      <FinaleScreen
        story={isStory}
        onRestart={() => updateSave({ ...defaultSave(), appearance: save.appearance })}
      />
    );
  } else if (save && isStory && save.storySeen < save.currentLevel && save.currentLevel <= STORY_CHAPTER_COUNT) {
    body = (
      <StoryStage
        key={save.currentLevel}
        chapterIndex={save.currentLevel - 1}
        hero={storyChar}
        theme={LEVEL_THEMES[Math.min(save.currentLevel - 1, LEVEL_THEMES.length - 1)]}
        sound={sound}
        appearance={save.appearance}
        onAppearanceChange={setAppearance}
        doneLabel="Begin ▸"
        onDone={() => {
          sound.playMenuClick();
          updateSave({ ...save, storySeen: save.currentLevel });
        }}
      />
    );
  } else if (save) {
    const level = getEffectiveLevel(save.currentLevel);
    if (level) {
      const theme = LEVEL_THEMES[Math.min(level.id - 1, LEVEL_THEMES.length - 1)];
      const chapterTitle = isStory ? getChapterTitle(level.id - 1) : undefined;
      body = (
        <div>
          <div className="journey-bar">
            <span>
              Time Crystals: {save.crystalsCollected}/{TOTAL_LEVELS}
            </span>
            <div className="journey-track">
              <div className="journey-fill" style={{ width: `${(save.crystalsCollected / TOTAL_LEVELS) * 100}%` }} />
            </div>
          </div>
          <LevelRunner
            key={level.id}
            level={level}
            save={save}
            sound={sound}
            characterId={save.characterId ?? 'wanderer'}
            theme={theme}
            appearance={save.appearance}
            displayName={chapterTitle}
            onToggleAppearance={() => updateSave({ ...save, appearance: save.appearance === 'human' ? 'original' : 'human' })}
            onAbilityUsed={() => updateSave({ ...save, abilityUsed: true })}
            onPowerActivated={() => updateSave({ ...save, powerActivated: true })}
            onEmeraldFound={() => addShards(1)}
            heroLevel={levelOf(save.characterId ?? 'wanderer')}
            signedIn={signedIn}
            onRunFinished={(stats) => claimRun(level.id, stats.timeMs, stats.usedAbility)}
            autoWeapon={settings.autoWeapon}
            paused={settingsOpen}
            onLevelComplete={(stats) => handleLevelComplete(level, save, stats)}
          />
        </div>
      );
    }
  }

  function handleRestart() {
    clearSave();
    setSave(defaultSave());
  }

  return (
    <div>
      <AuthWidget />
      {save && (
        <button className="mute-btn" onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      )}
      {save && (
        <button className="restart-btn" onClick={handleRestart} aria-label="Restart">
          ↺
        </button>
      )}
      {save && (
        <button className="settings-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          ⚙
        </button>
      )}
      {body}
      {settingsOpen && <SettingsPanel settings={settings} onChange={changeSettings} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
