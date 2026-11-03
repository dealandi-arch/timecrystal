// Weapon behaviour for the level runner: projectiles, melee, beams, mines, novas and their effects.
// Positions are in tile units (cell centres are x + 0.5); drawing converts to pixels.

import { type Particle, spawnBurst } from './particles';
import type { WeaponDef } from './weapons';

export interface CombatEnemy {
  gx: number;
  gy: number;
  alive: boolean;
  hp: number;
  frozen: boolean;
  stunMs: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  weapon: WeaponDef;
  travelled: number;
  pierceLeft: number;
  bounceLeft: number;
  returning: boolean;
  hit: Set<CombatEnemy>;
  alive: boolean;
  spin: number;
}

interface Fx {
  life: number;
  maxLife: number;
  color: string;
}
interface Slash extends Fx { cells: { x: number; y: number }[] }
interface Line extends Fx { x1: number; y1: number; x2: number; y2: number; width: number }
interface Ring extends Fx { x: number; y: number; radius: number }
interface Mine { gx: number; gy: number; life: number; weapon: WeaponDef }

export interface Combat {
  projectiles: Projectile[];
  slashes: Slash[];
  lines: Line[];
  rings: Ring[];
  mines: Mine[];
}

export function makeCombat(): Combat {
  return { projectiles: [], slashes: [], lines: [], rings: [], mines: [] };
}

export interface CombatHooks {
  enemies: CombatEnemy[];
  particles: Particle[];
  tile: number;
  walkable: (x: number, y: number) => boolean;
  // Called after damage lands. `killed` is true when this hit finished the enemy off.
  onHit: (enemy: CombatEnemy, weapon: WeaponDef, killed: boolean) => void;
  shake: (amount: number) => void;
}

const MAX_MINES = 3;
const MINE_LIFE_S = 8;
const CHAIN_RANGE = 3.5;

function damage(h: CombatHooks, enemy: CombatEnemy, amount: number, weapon: WeaponDef) {
  if (!enemy.alive) return;
  enemy.hp -= amount;
  if (weapon.freezeMs) enemy.stunMs = Math.max(enemy.stunMs, weapon.freezeMs);
  const killed = enemy.hp <= 0;
  if (killed) enemy.alive = false;
  h.onHit(enemy, weapon, killed);
}

function enemiesAt(h: CombatHooks, x: number, y: number) {
  return h.enemies.filter((e) => e.alive && e.gx === x && e.gy === y);
}

function explode(c: Combat, h: CombatHooks, cx: number, cy: number, radius: number, weapon: WeaponDef) {
  for (const e of h.enemies) {
    if (e.alive && Math.abs(e.gx - cx) <= radius && Math.abs(e.gy - cy) <= radius) damage(h, e, weapon.damage, weapon);
  }
  const px = (cx + 0.5) * h.tile;
  const py = (cy + 0.5) * h.tile;
  c.rings.push({ x: px, y: py, radius: (radius + 0.5) * h.tile, life: 0.35, maxLife: 0.35, color: weapon.color });
  spawnBurst(h.particles, px, py, [weapon.color, '#fff', '#f97316'], 22, 200, 0);
  h.shake(0.18);
}

function chain(c: Combat, h: CombatHooks, from: CombatEnemy, jumps: number, weapon: WeaponDef) {
  const hit = new Set<CombatEnemy>([from]);
  let current = from;
  for (let i = 0; i < jumps; i++) {
    let best: CombatEnemy | null = null;
    let bestD = CHAIN_RANGE;
    for (const e of h.enemies) {
      if (!e.alive || hit.has(e)) continue;
      const d = Math.hypot(e.gx - current.gx, e.gy - current.gy);
      if (d <= bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) return;
    c.lines.push({
      x1: (current.gx + 0.5) * h.tile, y1: (current.gy + 0.5) * h.tile,
      x2: (best.gx + 0.5) * h.tile, y2: (best.gy + 0.5) * h.tile,
      width: 2, life: 0.2, maxLife: 0.2, color: weapon.color,
    });
    hit.add(best);
    damage(h, best, 1, weapon);
    current = best;
  }
}

// origin: player cell; dir: facing unit vector; basicSpeed: hero bullet speed for the basic gun.
export function fireWeapon(c: Combat, h: CombatHooks, weapon: WeaponDef, origin: { x: number; y: number }, dir: { dx: number; dy: number }, basicSpeed: number) {
  const fx = dir.dx;
  const fy = dir.dy;
  const px = -fy;
  const py = fx;
  const ocx = origin.x + 0.5;
  const ocy = origin.y + 0.5;

  if (weapon.kind === 'shot') {
    const count = weapon.count ?? 1;
    const spread = ((weapon.spreadDeg ?? 0) * Math.PI) / 180;
    const base = Math.atan2(fy, fx);
    const speed = weapon.speed || basicSpeed;
    for (let i = 0; i < count; i++) {
      const angle = count === 1 ? base : base - spread / 2 + (spread * i) / (count - 1);
      c.projectiles.push({
        x: ocx + fx * 0.5, y: ocy + fy * 0.5,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, speed,
        weapon, travelled: 0,
        pierceLeft: weapon.pierce ?? 0, bounceLeft: weapon.bounce ?? 0,
        returning: false, hit: new Set(), alive: true, spin: 0,
      });
    }
    return;
  }

  if (weapon.kind === 'melee') {
    const pattern = weapon.pattern ?? 'front';
    let offsets: [number, number][];
    if (pattern === 'front') offsets = [[fx, fy]];
    else if (pattern === 'sweep') offsets = [[fx, fy], [fx + px, fy + py], [fx - px, fy - py]];
    else if (pattern === 'lunge') offsets = [[fx, fy], [fx * 2, fy * 2]];
    else offsets = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    const cells = offsets
      .map(([dx, dy]) => ({ x: origin.x + dx, y: origin.y + dy }))
      .filter((cell) => h.walkable(cell.x, cell.y));
    for (const cell of cells) for (const e of enemiesAt(h, cell.x, cell.y)) damage(h, e, weapon.damage, weapon);
    c.slashes.push({ cells, life: 0.2, maxLife: 0.2, color: weapon.color });
    return;
  }

  if (weapon.kind === 'beam') {
    const beams = weapon.beams ?? 1;
    const dirs: [number, number][] = beams === 1 ? [[fx, fy]] : [[fx, fy], [fx + px, fy + py], [fx - px, fy - py]];
    for (const [dx, dy] of dirs) {
      let x = origin.x;
      let y = origin.y;
      const hit = new Set<CombatEnemy>();
      for (let step = 0; step < 30; step++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!h.walkable(nx, ny)) break;
        x = nx;
        y = ny;
        for (const e of enemiesAt(h, x, y)) {
          if (!hit.has(e)) {
            hit.add(e);
            damage(h, e, weapon.damage, weapon);
          }
        }
      }
      c.lines.push({
        x1: ocx * h.tile, y1: ocy * h.tile, x2: (x + 0.5) * h.tile, y2: (y + 0.5) * h.tile,
        width: 7, life: 0.22, maxLife: 0.22, color: weapon.color,
      });
    }
    h.shake(0.08);
    return;
  }

  if (weapon.kind === 'nova') {
    const r = weapon.radius ?? 1;
    for (const e of h.enemies) {
      if (e.alive && Math.abs(e.gx - origin.x) <= r && Math.abs(e.gy - origin.y) <= r) damage(h, e, weapon.damage, weapon);
    }
    c.rings.push({ x: ocx * h.tile, y: ocy * h.tile, radius: (r + 0.5) * h.tile, life: 0.4, maxLife: 0.4, color: weapon.color });
    spawnBurst(h.particles, ocx * h.tile, ocy * h.tile, [weapon.color, '#fff'], 18, 160, 0);
    if (r >= 2) h.shake(0.2);
    return;
  }

  // mine
  if (c.mines.length >= MAX_MINES) c.mines.shift();
  c.mines.push({ gx: origin.x, gy: origin.y, life: MINE_LIFE_S, weapon });
}

export function updateCombat(c: Combat, h: CombatHooks, dt: number, player: { x: number; y: number }) {
  for (const p of c.projectiles) {
    if (!p.alive) continue;
    const w = p.weapon;
    p.spin += dt * 14;

    if (p.returning) {
      const dx = player.x + 0.5 - p.x;
      const dy = player.y + 0.5 - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.5) {
        p.alive = false;
        continue;
      }
      p.vx = (dx / d) * p.speed;
      p.vy = (dy / d) * p.speed;
    } else if (w.homing) {
      let target: CombatEnemy | null = null;
      let bestD = Infinity;
      for (const e of h.enemies) {
        if (!e.alive || p.hit.has(e)) continue;
        const d = Math.hypot(e.gx + 0.5 - p.x, e.gy + 0.5 - p.y);
        if (d < bestD) {
          bestD = d;
          target = e;
        }
      }
      if (target) {
        const current = Math.atan2(p.vy, p.vx);
        const wanted = Math.atan2(target.gy + 0.5 - p.y, target.gx + 0.5 - p.x);
        let diff = wanted - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-w.homing * dt, Math.min(w.homing * dt, diff));
        p.vx = Math.cos(current + turn) * p.speed;
        p.vy = Math.sin(current + turn) * p.speed;
      }
    }

    const nx = p.x + p.vx * dt;
    const ny = p.y + p.vy * dt;
    if (!p.returning && !h.walkable(Math.floor(nx), Math.floor(ny))) {
      if (p.bounceLeft > 0) {
        p.bounceLeft--;
        const blockX = !h.walkable(Math.floor(nx), Math.floor(p.y));
        const blockY = !h.walkable(Math.floor(p.x), Math.floor(ny));
        if (blockX) p.vx = -p.vx;
        if (blockY) p.vy = -p.vy;
        if (!blockX && !blockY) {
          p.vx = -p.vx;
          p.vy = -p.vy;
        }
        spawnBurst(h.particles, p.x * h.tile, p.y * h.tile, [w.color], 4, 60, 0);
        continue;
      }
      if (w.returns) {
        p.returning = true;
        p.hit.clear();
        continue;
      }
      if (w.explode) explode(c, h, Math.floor(p.x), Math.floor(p.y), w.explode, w);
      p.alive = false;
      continue;
    }
    p.x = nx;
    p.y = ny;
    p.travelled += p.speed * dt;
    if (!p.returning && p.travelled >= (w.range ?? 30)) {
      if (w.returns) {
        p.returning = true;
        p.hit.clear();
      } else {
        p.alive = false;
      }
      continue;
    }

    const cx = Math.floor(p.x);
    const cy = Math.floor(p.y);
    for (const e of enemiesAt(h, cx, cy)) {
      if (p.hit.has(e)) continue;
      p.hit.add(e);
      if (w.explode) {
        explode(c, h, cx, cy, w.explode, w);
      } else {
        damage(h, e, w.damage, w);
      }
      if (w.chain) chain(c, h, e, w.chain, w);
      if (w.explode || p.pierceLeft <= 0) {
        p.alive = false;
        break;
      }
      p.pierceLeft--;
    }
  }
  if (c.projectiles.length) c.projectiles = c.projectiles.filter((p) => p.alive);

  for (const m of c.mines) {
    m.life -= dt;
    const r = m.weapon.radius ?? 1;
    const triggered = h.enemies.some((e) => e.alive && Math.abs(e.gx - m.gx) <= r && Math.abs(e.gy - m.gy) <= r);
    if (triggered || m.life <= 0) {
      explode(c, h, m.gx, m.gy, r, m.weapon);
      m.life = -1;
    }
  }
  if (c.mines.length) c.mines = c.mines.filter((m) => m.life > 0);

  for (const list of [c.slashes, c.lines, c.rings] as Fx[][]) for (const fx of list) fx.life -= dt;
  c.slashes = c.slashes.filter((s) => s.life > 0);
  c.lines = c.lines.filter((l) => l.life > 0);
  c.rings = c.rings.filter((r) => r.life > 0);
}

export function drawCombat(ctx: CanvasRenderingContext2D, c: Combat, tile: number, time: number) {
  for (const m of c.mines) {
    const x = (m.gx + 0.5) * tile;
    const y = (m.gy + 0.5) * tile;
    const blink = Math.sin(time * (m.life < 2 ? 20 : 6)) > 0;
    ctx.fillStyle = '#0b1330';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blink ? m.weapon.color : '#334155';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of c.slashes) {
    ctx.globalAlpha = (s.life / s.maxLife) * 0.6;
    ctx.fillStyle = s.color;
    for (const cell of s.cells) ctx.fillRect(cell.x * tile + 4, cell.y * tile + 4, tile - 8, tile - 8);
  }
  ctx.globalAlpha = 1;

  for (const l of c.lines) {
    ctx.globalAlpha = l.life / l.maxLife;
    ctx.strokeStyle = l.color;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = l.width * (l.life / l.maxLife) + 1;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  for (const r of c.rings) {
    const t = 1 - r.life / r.maxLife;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius * (0.3 + 0.7 * t), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const p of c.projectiles) {
    const x = p.x * tile;
    const y = p.y * tile;
    const size = p.weapon.size ?? 5;
    ctx.fillStyle = p.weapon.color;
    ctx.shadowColor = p.weapon.color;
    ctx.shadowBlur = 8;
    if (p.weapon.returns || p.weapon.id === 'cards') {
      // spinning shapes for boomerangs and thrown cards
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.spin);
      ctx.fillRect(-size, -size / 2, size * 2, size);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}
