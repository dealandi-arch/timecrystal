'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ABILITIES } from './abilities';
import { SoundEngine } from './audio';
import { COLS, FLOOR, ROWS, SECRET, TILE, type LevelDef, type Point, TOTAL_LEVELS } from './levels';
import { getEffectiveLevel } from './levelOverrides';
import { type Particle, drawParticles, spawnBurst, updateParticles } from './particles';
import {
  BOSS_PALETTE,
  BOSS_SPRITE,
  CHARACTERS,
  type CharacterDef,
  ENEMY_FROZEN_PALETTE,
  ENEMY_PALETTE,
  ENEMY_SPRITE,
  FLOOR_A,
  FLOOR_A_PALETTE,
  FLOOR_B,
  FLOOR_B_PALETTE,
  WALL,
  WALL_PALETTE,
  getSpriteCanvas
} from './pixelArt';
import { type AbilityId, type Save, loadSave, persistSave } from './save';
import { type LevelRunStats, getLocalBest, saveLocalBestIfBetter } from './runStats';
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
const BULLET_RADIUS = 5;
const PIXEL_SIZE = TILE / 12;

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
  wanderTimer: number;
  isBoss: boolean;
}

interface RuntimeBullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  alive: boolean;
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

function makePlayer(level: LevelDef): RuntimePlayer {
  return {
    gx: level.start.x,
    gy: level.start.y,
    fromX: level.start.x,
    fromY: level.start.y,
    moveT: 1,
    moving: false,
    facing: 'down',
    hp: PLAYER_MAX_HP,
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
    wanderTimer: Math.random() * ENEMY_WANDER_MS,
    isBoss: level.isBoss
  }));
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
  onLevelComplete: (stats: LevelRunStats) => void;
  onAbilityUsed: () => void;
}

function LevelRunner({ level, save, sound, characterId, onLevelComplete, onAbilityUsed }: LevelRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [enemiesLeft, setEnemiesLeft] = useState(level.enemies.length);
  const [toast, setToast] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [runStats, setRunStats] = useState<LevelRunStats | null>(null);

  const stateRef = useRef({
    player: makePlayer(level),
    enemies: makeEnemies(level),
    crystal: makeCrystal(level),
    bullets: [] as RuntimeBullet[],
    particles: [] as Particle[],
    discoveredSecrets: new Set<string>(),
    shake: 0,
    keys: new Set<string>(),
    abilityActive: { navigate: false, invisibility: false, iceAge: false } as AbilityActive,
    toastTimer: 0,
    won: false,
    startTime: performance.now(),
    usedAbilityThisRun: false
  });

  function resetLevelRuntime() {
    const s = stateRef.current;
    s.player = makePlayer(level);
    s.enemies = makeEnemies(level);
    s.crystal = makeCrystal(level);
    s.bullets = [];
    s.shake = 0.3;
    s.won = false;
    s.startTime = performance.now();
    setHp(PLAYER_MAX_HP);
    setEnemiesLeft(s.enemies.filter((e) => e.alive).length);
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
      sound.resume();
      s.keys.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
    }
    function onKeyUp(e: KeyboardEvent) {
      s.keys.delete(e.key.toLowerCase());
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastTime = performance.now();
    let rafId = 0;
    let attackWasPressed = false;

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
        stepEntityMove(p, dt, MOVE_MS);
      }

      const attackKey = s.keys.has(' ') || s.keys.has('j');
      if (p.attackCooldown > 0) p.attackCooldown -= dt * 1000;
      if (attackKey && !attackWasPressed && p.attackCooldown <= 0) {
        p.attackTimer = ATTACK_DURATION_MS;
        p.attackCooldown = ATTACK_COOLDOWN_MS;
        const { dx, dy } = DIR_VECTORS[p.facing];
        s.bullets.push({ x: p.gx + 0.5 + dx * 0.5, y: p.gy + 0.5 + dy * 0.5, dx, dy, alive: true });
        sound.playShoot();
      }
      attackWasPressed = attackKey;
      if (p.attackTimer > 0) p.attackTimer -= dt * 1000;
      if (p.invuln > 0) p.invuln -= dt;
      if (s.shake > 0) s.shake -= dt;

      let enemyDiedFromBullet = false;
      for (const bullet of s.bullets) {
        if (!bullet.alive) continue;
        bullet.x += bullet.dx * BULLET_SPEED * dt;
        bullet.y += bullet.dy * BULLET_SPEED * dt;
        const cellX = Math.floor(bullet.x);
        const cellY = Math.floor(bullet.y);
        if (!isWalkable(level, cellX, cellY, false)) {
          bullet.alive = false;
          continue;
        }
        for (const enemy of s.enemies) {
          if (enemy.alive && enemy.gx === cellX && enemy.gy === cellY) {
            enemy.hp -= 1;
            bullet.alive = false;
            const hitX = (cellX + 0.5) * TILE;
            const hitY = (cellY + 0.5) * TILE;
            if (enemy.hp <= 0) {
              enemy.alive = false;
              enemyDiedFromBullet = true;
              spawnBurst(s.particles, hitX, hitY, ['#f472b6', '#fbcfe8', '#831843'], 14, 140, 220);
              sound.playEnemyDeath();
            } else {
              spawnBurst(s.particles, hitX, hitY, ['#fde047', '#fff'], 6, 90, 160);
              sound.playHit();
            }
            break;
          }
        }
      }
      if (s.bullets.length > 0) s.bullets = s.bullets.filter((b) => b.alive);
      if (enemyDiedFromBullet) setEnemiesLeft(s.enemies.filter((e) => e.alive).length);

      for (const enemy of s.enemies) {
        if (!enemy.alive) continue;
        if (enemy.frozen) continue;
        if (!enemy.moving) {
          enemy.wanderTimer -= dt * 1000;
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
          stepEntityMove(enemy, dt, MOVE_MS);
        }

        if (
          !s.abilityActive.invisibility &&
          p.invuln <= 0 &&
          enemy.gx === p.gx &&
          enemy.gy === p.gy
        ) {
          p.hp -= 1;
          p.invuln = HIT_INVULN_S;
          s.shake = 0.2;
          spawnBurst(s.particles, (p.gx + 0.5) * TILE, (p.gy + 0.5) * TILE, ['#f87171', '#fecaca'], 10, 110, 180);
          sound.playPlayerHurt();
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
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake * 18, (Math.random() - 0.5) * s.shake * 18);
      }

      const floorA = getSpriteCanvas('floorA', FLOOR_A, FLOOR_A_PALETTE, PIXEL_SIZE);
      const floorB = getSpriteCanvas('floorB', FLOOR_B, FLOOR_B_PALETTE, PIXEL_SIZE);
      const wall = getSpriteCanvas('wall', WALL, WALL_PALETTE, PIXEL_SIZE);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const tile = level.grid[y][x];
          if (tile === FLOOR) {
            ctx.drawImage((x + y) % 2 === 0 ? floorA : floorB, x * TILE, y * TILE);
          } else {
            ctx.drawImage(wall, x * TILE, y * TILE);
            if (tile === SECRET && s.abilityActive.iceAge) {
              ctx.fillStyle = 'rgba(103, 232, 249, 0.3)';
              ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            }
          }
        }
      }

      const crystalPos = entityPixelPos(s.crystal);
      const time = performance.now() / 1000;
      const bob = Math.sin(time * 3) * 4;
      drawDiamond(ctx, crystalPos.x + TILE / 2, crystalPos.y + TILE / 2 + bob, 14, '#67e8f9');

      for (const enemy of s.enemies) {
        if (!enemy.alive) continue;
        const pos = entityPixelPos(enemy);
        const key = enemy.isBoss ? 'boss' : enemy.frozen ? 'enemyFrozen' : 'enemy';
        const grid = enemy.isBoss ? BOSS_SPRITE : ENEMY_SPRITE;
        const palette = enemy.isBoss ? BOSS_PALETTE : enemy.frozen ? ENEMY_FROZEN_PALETTE : ENEMY_PALETTE;
        const sprite = getSpriteCanvas(key, grid, palette, PIXEL_SIZE);
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
      const charDef = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
      const playerSprite = getSpriteCanvas(`player:${characterId}`, charDef.sprite, charDef.palette, PIXEL_SIZE);
      const walkBob = p.moving ? Math.sin(time * 16) * 1.5 : 0;
      ctx.drawImage(playerSprite, px, py + walkBob);
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
        const flashAlpha = p.attackTimer / ATTACK_DURATION_MS;
        ctx.fillStyle = `rgba(253, 224, 71, ${flashAlpha})`;
        ctx.beginPath();
        ctx.arc(px + TILE / 2 + dx * 24, py + TILE / 2 + dy * 24 + walkBob, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const bullet of s.bullets) {
        const bx = bullet.x * TILE;
        const by = bullet.y * TILE;
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bx, by, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

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
      lastTime = now;
      update(dt);
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

  const abilityDef = ABILITIES.find((a) => a.id === save.ability);
  const abilityBlockedHere = save.ability === 'killAll' && level.isBoss;
  const canUseAbility = !!save.ability && !save.abilityUsed && !abilityBlockedHere;

  return (
    <div className="rpg-shell">
      <div className="rpg-hud">
        <span>{level.name}</span>
        <span>HP: {'❤'.repeat(Math.max(0, hp))}{'♡'.repeat(Math.max(0, PLAYER_MAX_HP - hp))}</span>
        <span>Enemies left: {enemiesLeft}</span>
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
      <p className="game-controls">
        Move: Arrow keys / WASD &nbsp;·&nbsp; Shoot: Space / J &nbsp;·&nbsp; Find every secret passage, clear every
        enemy, then catch the crystal.
      </p>
    </div>
  );
}

const PREVIEW_PS = 6;

function SpritePreview({ char }: { char: CharacterDef }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const size = 12 * PREVIEW_PS;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(getSpriteCanvas(`preview:${char.id}`, char.sprite, char.palette, PREVIEW_PS), 0, 0);
  }, [char, size]);
  return <canvas ref={ref} width={size} height={size} style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto 0.75rem' }} />;
}

function CharacterSelectScreen({ onChoose }: { onChoose: (id: string) => void }) {
  return (
    <div className="ability-select">
      <h1>Choose Your Character</h1>
      <p>Pick who travels through time. This choice is yours to keep.</p>
      <div className="ability-grid">
        {CHARACTERS.map((c) => (
          <button key={c.id} className="ability-card" onClick={() => onChoose(c.id)}>
            <SpritePreview char={c} />
            <h3>{c.name}</h3>
            <p>{c.description}</p>
          </button>
        ))}
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

function FinaleScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="ability-select">
      <h1>Time Crystal Restored</h1>
      <p>All eleven shards are yours. The timeline holds.</p>
      <button className="ability-card" onClick={onRestart}>
        Play again
      </button>
    </div>
  );
}

const MUTE_STORAGE_KEY = 'timeCrystalMuted';

export default function TimeCrystalRPG() {
  const [save, setSave] = useState<Save | null>(null);
  const [muted, setMutedFlag] = useState(false);
  const soundRef = useRef<SoundEngine | null>(null);
  if (!soundRef.current) soundRef.current = new SoundEngine();
  const sound = soundRef.current;
  const { profile, submitRun } = useProfile();

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
    const storedMuted = window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    setMutedFlag(storedMuted);
    sound.setMuted(storedMuted);
  }, [sound]);

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

  let body: ReactNode = null;
  if (save && save.characterId === null) {
    body = (
      <CharacterSelectScreen
        onChoose={(id) => {
          sound.resume();
          sound.playMenuClick();
          updateSave({ ...save, characterId: id });
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
  } else if (save && save.currentLevel > TOTAL_LEVELS) {
    body = (
      <FinaleScreen
        onRestart={() => updateSave({ ability: null, abilityUsed: false, currentLevel: 1, crystalsCollected: 0, characterId: null })}
      />
    );
  } else if (save) {
    const level = getEffectiveLevel(save.currentLevel);
    if (level) {
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
            onAbilityUsed={() => updateSave({ ...save, abilityUsed: true })}
            onLevelComplete={(stats) => handleLevelComplete(level, save, stats)}
          />
        </div>
      );
    }
  }

  return (
    <div>
      <AuthWidget />
      {save && (
        <button className="mute-btn" onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      )}
      {body}
    </div>
  );
}
