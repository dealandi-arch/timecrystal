'use client';

import { useEffect, useRef, useState } from 'react';
import { ABILITIES } from './abilities';
import { COLS, FLOOR, ROWS, SECRET, TILE, type LevelDef, type Point, TOTAL_LEVELS } from './levels';
import { getEffectiveLevel } from './levelOverrides';
import { type AbilityId, type Save, loadSave, persistSave } from './save';

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
  onLevelComplete: () => void;
  onAbilityUsed: () => void;
}

function LevelRunner({ level, save, onLevelComplete, onAbilityUsed }: LevelRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [enemiesLeft, setEnemiesLeft] = useState(level.enemies.length);
  const [toast, setToast] = useState<string | null>(null);
  const [won, setWon] = useState(false);

  const stateRef = useRef({
    player: makePlayer(level),
    enemies: makeEnemies(level),
    crystal: makeCrystal(level),
    bullets: [] as RuntimeBullet[],
    keys: new Set<string>(),
    abilityActive: { navigate: false, invisibility: false, iceAge: false } as AbilityActive,
    toastTimer: 0,
    won: false
  });

  function resetLevelRuntime() {
    const s = stateRef.current;
    s.player = makePlayer(level);
    s.enemies = makeEnemies(level);
    s.crystal = makeCrystal(level);
    s.bullets = [];
    s.won = false;
    setHp(PLAYER_MAX_HP);
    setEnemiesLeft(s.enemies.filter((e) => e.alive).length);
  }

  function activateAbility() {
    if (!save.ability || save.abilityUsed) return;
    if (save.ability === 'killAll' && level.isBoss) return;
    const s = stateRef.current;
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
    onAbilityUsed();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext('2d');
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;
    const s = stateRef.current;

    function onKeyDown(e: KeyboardEvent) {
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
      }
      attackWasPressed = attackKey;
      if (p.attackTimer > 0) p.attackTimer -= dt * 1000;
      if (p.invuln > 0) p.invuln -= dt;

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
            if (enemy.hp <= 0) {
              enemy.alive = false;
              enemyDiedFromBullet = true;
            }
            bullet.alive = false;
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
          setHp(p.hp);
          if (p.hp <= 0) {
            resetLevelRuntime();
            return;
          }
        }
      }

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

      if (crystal.gx === p.gx && crystal.gy === p.gy) {
        const remaining = s.enemies.filter((e) => e.alive).length;
        if (remaining === 0) {
          s.won = true;
          setWon(true);
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
      ctx.fillStyle = '#0b1330';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const tile = level.grid[y][x];
          if (tile === FLOOR) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#1a2356' : '#172050';
          } else if (tile === SECRET && s.abilityActive.iceAge) {
            ctx.fillStyle = '#1e4d6b';
          } else {
            ctx.fillStyle = '#312e81';
          }
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }

      const crystalPos = entityPixelPos(s.crystal);
      const time = performance.now() / 1000;
      const bob = Math.sin(time * 3) * 4;
      drawDiamond(ctx, crystalPos.x + TILE / 2, crystalPos.y + TILE / 2 + bob, 14, '#67e8f9');

      for (const enemy of s.enemies) {
        if (!enemy.alive) continue;
        const pos = entityPixelPos(enemy);
        const cx = pos.x + TILE / 2;
        const cy = pos.y + TILE / 2;
        ctx.beginPath();
        ctx.fillStyle = enemy.frozen ? '#93c5fd' : enemy.isBoss ? '#dc2626' : '#f472b6';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = enemy.isBoss ? 18 : 10;
        ctx.arc(cx, cy, enemy.isBoss ? 18 : 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (enemy.maxHp > 1) {
          const barW = 28;
          ctx.fillStyle = 'rgba(15,23,42,0.7)';
          ctx.fillRect(cx - barW / 2, cy - 28, barW, 5);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(cx - barW / 2, cy - 28, barW * (enemy.hp / enemy.maxHp), 5);
        }
      }

      const p = s.player;
      const ppos = entityPixelPos(p);
      const px = ppos.x;
      const py = ppos.y;
      const flashing = p.invuln > 0 && Math.floor(time * 10) % 2 === 0;
      ctx.fillStyle = flashing ? 'rgba(250, 204, 21, 0.4)' : '#facc15';
      ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);

      const { dx, dy } = DIR_VECTORS[p.facing];
      ctx.fillStyle = '#0b1330';
      ctx.beginPath();
      ctx.arc(px + TILE / 2 + dx * 10, py + TILE / 2 + dy * 10, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(px + TILE / 2 + dx * 14 - 4, py + TILE / 2 + dy * 14 - 4, 8, 8);

      if (p.attackTimer > 0) {
        const flashAlpha = p.attackTimer / ATTACK_DURATION_MS;
        ctx.fillStyle = `rgba(253, 224, 71, ${flashAlpha})`;
        ctx.beginPath();
        ctx.arc(px + TILE / 2 + dx * 24, py + TILE / 2 + dy * 24, 8, 0, Math.PI * 2);
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
        {won && (
          <div className="game-overlay">
            <h2>{level.isBoss ? 'The Time Crystal Is Whole Again' : 'Crystal Secured'}</h2>
            <p>{level.isBoss ? 'You defeated the guardian and restored the final shard.' : 'On to the next level.'}</p>
            <button onClick={onLevelComplete}>{level.isBoss ? 'Finish' : 'Next level'}</button>
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

function AbilitySelectScreen({ onChoose }: { onChoose: (id: AbilityId) => void }) {
  return (
    <div className="ability-select">
      <h1>Choose Your Help</h1>
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

export default function TimeCrystalRPG() {
  const [save, setSave] = useState<Save | null>(null);

  useEffect(() => {
    setSave(loadSave());
  }, []);

  if (!save) return null;

  function updateSave(next: Save) {
    setSave(next);
    persistSave(next);
  }

  if (!save.ability) {
    return (
      <AbilitySelectScreen
        onChoose={(id) => updateSave({ ...save, ability: id })}
      />
    );
  }

  if (save.currentLevel > TOTAL_LEVELS) {
    return (
      <FinaleScreen
        onRestart={() => updateSave({ ability: null, abilityUsed: false, currentLevel: 1, crystalsCollected: 0 })}
      />
    );
  }

  const level = getEffectiveLevel(save.currentLevel);
  if (!level) return null;

  return (
    <div>
      <div className="journey-bar">
        <span>Time Crystals: {save.crystalsCollected}/{TOTAL_LEVELS}</span>
        <div className="journey-track">
          <div
            className="journey-fill"
            style={{ width: `${(save.crystalsCollected / TOTAL_LEVELS) * 100}%` }}
          />
        </div>
      </div>
      <LevelRunner
        key={level.id}
        level={level}
        save={save}
        onAbilityUsed={() => updateSave({ ...save, abilityUsed: true })}
        onLevelComplete={() =>
          updateSave({
            ...save,
            crystalsCollected: save.crystalsCollected + 1,
            currentLevel: save.currentLevel + 1
          })
        }
      />
    </div>
  );
}
