// Weapon behaviour for the level runner: projectiles, melee, beams, mines, blasts, time bubbles,
// ripples, rolling waves and their effects.
// Positions are in tile units (cell centres are x + 0.5); drawing converts to pixels.

import { type Particle, spawnBurst } from './particles';
import type { BlastShape, WeaponDef } from './weapons';

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
interface Zone { gx: number; gy: number; life: number; maxLife: number; tick: number; weapon: WeaponDef }
interface Pulse { x: number; y: number; r: number; maxR: number; hit: Set<CombatEnemy>; weapon: WeaponDef }
interface Wave { x: number; y: number; dx: number; dy: number; travelled: number; hit: Set<CombatEnemy>; weapon: WeaponDef }
interface Dot { enemy: CombatEnemy; t: number; amount: number; weapon: WeaponDef }

export interface Combat {
  projectiles: Projectile[];
  slashes: Slash[];
  lines: Line[];
  rings: Ring[];
  mines: Mine[];
  zones: Zone[];
  pulses: Pulse[];
  waves: Wave[];
  dots: Dot[];
}

export function makeCombat(): Combat {
  return { projectiles: [], slashes: [], lines: [], rings: [], mines: [], zones: [], pulses: [], waves: [], dots: [] };
}

export interface CombatHooks {
  enemies: CombatEnemy[];
  particles: Particle[];
  tile: number;
  walkable: (x: number, y: number) => boolean;
  // Called after damage lands. `killed` is true when this hit finished the enemy off.
  onHit: (enemy: CombatEnemy, weapon: WeaponDef, killed: boolean) => void;
  // Lets speciality perks (critical hits, last stand...) change a hit's damage.
  modifyDamage?: (enemy: CombatEnemy, amount: number) => number;
  shake: (amount: number) => void;
  // Pushes an enemy away from the player (knockback weapons).
  push?: (enemy: CombatEnemy, tiles: number) => void;
}

const MAX_MINES = 3;
const MINE_LIFE_S = 8;
const CHAIN_RANGE = 3.5;
const ZONE_TICK_S = 0.6;
const PULSE_SPEED = 8; // tiles per second
const WAVE_SPEED = 7;
const POISON_DELAY_S = 1;

function damage(h: CombatHooks, enemy: CombatEnemy, amount: number, weapon: WeaponDef) {
  if (!enemy.alive) return;
  enemy.hp -= h.modifyDamage ? h.modifyDamage(enemy, amount) : amount;
  if (weapon.freezeMs) enemy.stunMs = Math.max(enemy.stunMs, weapon.freezeMs);
  const killed = enemy.hp <= 0;
  if (killed) enemy.alive = false;
  h.onHit(enemy, weapon, killed);
  if (killed) return;
  if (weapon.knockback && h.push) h.push(enemy, weapon.knockback);
  if (weapon.poison && c_dots) c_dots.push({ enemy, t: POISON_DELAY_S, amount: weapon.poison, weapon: { ...weapon, poison: 0, knockback: 0 } });
}

// Set while a combat update or attack runs, so damage() can queue poison without threading Combat everywhere.
let c_dots: Dot[] | null = null;

// Cells a blast covers around a centre, by shape. Cross arms stop at walls.
function blastCells(h: CombatHooks, cx: number, cy: number, r: number, shape: BlastShape): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  if (shape === 'cross') {
    cells.push({ x: cx, y: cy });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let i = 1; i <= r; i++) {
        if (!h.walkable(cx + dx * i, cy + dy * i)) break;
        cells.push({ x: cx + dx * i, y: cy + dy * i });
      }
    }
    return cells;
  }
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (shape === 'diamond' && Math.abs(dx) + Math.abs(dy) > r) continue;
      if (h.walkable(cx + dx, cy + dy)) cells.push({ x: cx + dx, y: cy + dy });
    }
  }
  return cells;
}

// Tiles in a straight line, stopping before the first wall.
function ray(h: CombatHooks, ox: number, oy: number, dx: number, dy: number, length: number) {
  const cells: { x: number; y: number }[] = [];
  for (let i = 1; i <= length; i++) {
    if (!h.walkable(ox + dx * i, oy + dy * i)) break;
    cells.push({ x: ox + dx * i, y: oy + dy * i });
  }
  return cells;
}

function enemiesAt(h: CombatHooks, x: number, y: number) {
  return h.enemies.filter((e) => e.alive && e.gx === x && e.gy === y);
}

export function explode(c: Combat, h: CombatHooks, cx: number, cy: number, radius: number, weapon: WeaponDef) {
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
// Returns where the player ends up for blink attacks.
export function fireWeapon(c: Combat, h: CombatHooks, weapon: WeaponDef, origin: { x: number; y: number }, dir: { dx: number; dy: number }, basicSpeed: number): { dashTo?: { x: number; y: number } } {
  c_dots = c.dots;
  const result = fireInner(c, h, weapon, origin, dir, basicSpeed);
  c_dots = null;
  return result ?? {};
}

function fireInner(c: Combat, h: CombatHooks, weapon: WeaponDef, origin: { x: number; y: number }, dir: { dx: number; dy: number }, basicSpeed: number): { dashTo?: { x: number; y: number } } | void {
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
    const reach = weapon.reach ?? 0;
    const forward = (length: number) => ray(h, origin.x, origin.y, fx, fy, length);
    let cells: { x: number; y: number }[];
    let dashTo: { x: number; y: number } | undefined;
    if (pattern === 'front') cells = forward(1 + reach);
    else if (pattern === 'lunge') cells = forward(2 + reach);
    else if (pattern === 'spear') cells = forward(3 + reach);
    else if (pattern === 'dash') {
      // Blink forward, cutting every tile passed through.
      cells = forward(2 + reach);
      if (cells.length) dashTo = cells[cells.length - 1];
    } else if (pattern === 'x') {
      cells = [[1, 1], [1, -1], [-1, 1], [-1, -1]].flatMap(([dx, dy]) => ray(h, origin.x, origin.y, dx, dy, 3 + reach));
    } else if (pattern === 'spin') {
      cells = blastCells(h, origin.x, origin.y, 1 + reach, 'square').filter((cell) => cell.x !== origin.x || cell.y !== origin.y);
    } else {
      // sweep: the row ahead; arc: the row ahead plus the tiles beside you
      const offsets: [number, number][] = [[fx, fy], [fx + px, fy + py], [fx - px, fy - py]];
      if (pattern === 'arc') offsets.push([px, py], [-px, -py]);
      cells = offsets.map(([dx, dy]) => ({ x: origin.x + dx, y: origin.y + dy })).filter((cell) => h.walkable(cell.x, cell.y));
      if (reach > 0) cells.push(...forward(1 + reach).slice(1));
    }
    for (const cell of cells) for (const e of enemiesAt(h, cell.x, cell.y)) damage(h, e, weapon.damage, weapon);
    c.slashes.push({ cells, life: 0.2, maxLife: 0.2, color: weapon.color });
    return { dashTo };
  }

  if (weapon.kind === 'zone') {
    const life = (weapon.durationMs ?? 3000) / 1000;
    c.zones.push({ gx: origin.x, gy: origin.y, life, maxLife: life, tick: 0, weapon });
    return;
  }

  if (weapon.kind === 'pulse') {
    c.pulses.push({ x: ocx, y: ocy, r: 0, maxR: (weapon.radius ?? 3) + 0.5, hit: new Set(), weapon });
    return;
  }

  if (weapon.kind === 'wave') {
    c.waves.push({ x: ocx, y: ocy, dx: fx, dy: fy, travelled: 0, hit: new Set(), weapon });
    return;
  }

  if (weapon.kind === 'beam') {
    const beams = weapon.beams ?? 1;
    const dirs: [number, number][] =
      beams === 1 ? [[fx, fy]]
      : beams === 4 ? [[fx, fy], [-fx, -fy], [px, py], [-px, -py]]
      : [[fx, fy], [fx + px, fy + py], [fx - px, fy - py]];
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
    const shape = weapon.shape ?? 'square';
    const cells = blastCells(h, origin.x, origin.y, r, shape);
    const inBlast = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
    for (const e of h.enemies) {
      if (e.alive && inBlast.has(`${e.gx},${e.gy}`)) damage(h, e, weapon.damage, weapon);
    }
    if (shape === 'square') c.rings.push({ x: ocx * h.tile, y: ocy * h.tile, radius: (r + 0.5) * h.tile, life: 0.4, maxLife: 0.4, color: weapon.color });
    else c.slashes.push({ cells, life: 0.35, maxLife: 0.35, color: weapon.color });
    spawnBurst(h.particles, ocx * h.tile, ocy * h.tile, [weapon.color, '#fff'], 18, 160, 0);
    if (r >= 2) h.shake(0.2);
    return;
  }

  // mine
  if (c.mines.length >= MAX_MINES) c.mines.shift();
  c.mines.push({ gx: origin.x, gy: origin.y, life: weapon.durationMs ? weapon.durationMs / 1000 : MINE_LIFE_S, weapon });
}

export function updateCombat(c: Combat, h: CombatHooks, dt: number, player: { x: number; y: number }) {
  c_dots = c.dots;
  updateInner(c, h, dt, player);
  c_dots = null;
}

function updateInner(c: Combat, h: CombatHooks, dt: number, player: { x: number; y: number }) {
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
        if (w.explodeAtEnd && w.explode) explode(c, h, Math.floor(p.x), Math.floor(p.y), w.explode, w);
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

  // Time bubbles: hurt and freeze whatever is inside, every tick, until they fade.
  for (const z of c.zones) {
    z.life -= dt;
    z.tick -= dt;
    if (z.tick <= 0) {
      z.tick = ZONE_TICK_S;
      const r = z.weapon.radius ?? 1;
      for (const e of h.enemies) {
        if (e.alive && Math.abs(e.gx - z.gx) <= r && Math.abs(e.gy - z.gy) <= r) damage(h, e, z.weapon.damage, z.weapon);
      }
    }
  }
  if (c.zones.length) c.zones = c.zones.filter((z) => z.life > 0);

  // Ripples: grow outward and hit each enemy once as the edge passes it.
  for (const pulse of c.pulses) {
    pulse.r += PULSE_SPEED * dt;
    for (const e of h.enemies) {
      if (!e.alive || pulse.hit.has(e)) continue;
      if (Math.hypot(e.gx + 0.5 - pulse.x, e.gy + 0.5 - pulse.y) <= pulse.r) {
        pulse.hit.add(e);
        damage(h, e, pulse.weapon.damage, pulse.weapon);
      }
    }
  }
  if (c.pulses.length) c.pulses = c.pulses.filter((pulse) => pulse.r < pulse.maxR);

  // Waves: a three-tile wall rolling forward until it hits a wall or runs out of range.
  for (const wave of c.waves) {
    const step = (wave.weapon.speed ?? WAVE_SPEED) * dt;
    wave.x += wave.dx * step;
    wave.y += wave.dy * step;
    wave.travelled += step;
    const cx = Math.floor(wave.x);
    const cy = Math.floor(wave.y);
    if (!h.walkable(cx, cy) || wave.travelled >= (wave.weapon.range ?? 6)) {
      wave.travelled = Infinity;
      continue;
    }
    const px = -wave.dy;
    const py = wave.dx;
    const half = Math.floor((wave.weapon.width ?? 3) / 2);
    for (let k = -half; k <= half; k++) {
      const ox = px * k;
      const oy = py * k;
      for (const e of enemiesAt(h, cx + ox, cy + oy)) {
        if (wave.hit.has(e)) continue;
        wave.hit.add(e);
        damage(h, e, wave.weapon.damage, wave.weapon);
      }
    }
  }
  if (c.waves.length) c.waves = c.waves.filter((wave) => Number.isFinite(wave.travelled));

  // Poison: the delayed second bite.
  for (const d of c.dots) {
    d.t -= dt;
    if (d.t <= 0) {
      damage(h, d.enemy, d.amount, d.weapon);
      spawnBurst(h.particles, (d.enemy.gx + 0.5) * h.tile, (d.enemy.gy + 0.5) * h.tile, ['#a3e635', '#365314'], 6, 60, -40);
    }
  }
  if (c.dots.length) c.dots = c.dots.filter((d) => d.t > 0);

  for (const list of [c.slashes, c.lines, c.rings] as Fx[][]) for (const fx of list) fx.life -= dt;
  c.slashes = c.slashes.filter((s) => s.life > 0);
  c.lines = c.lines.filter((l) => l.life > 0);
  c.rings = c.rings.filter((r) => r.life > 0);
}

export function drawCombat(ctx: CanvasRenderingContext2D, c: Combat, tile: number, time: number) {
  for (const z of c.zones) {
    const x = (z.gx + 0.5) * tile;
    const y = (z.gy + 0.5) * tile;
    const r = ((z.weapon.radius ?? 1) + 0.5) * tile;
    const fade = Math.min(1, z.life / 0.4);
    ctx.globalAlpha = 0.18 * fade + Math.sin(time * 8) * 0.04;
    ctx.fillStyle = z.weapon.color;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = z.weapon.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -time * 20;
    ctx.strokeRect(x - r, y - r, r * 2, r * 2);
    ctx.setLineDash([]);
    // clock hand sweeping round, so it reads as stopped time
    const angle = time * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * r * 0.8, y + Math.sin(angle) * r * 0.8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const pulse of c.pulses) {
    ctx.globalAlpha = Math.max(0, 1 - pulse.r / pulse.maxR) * 0.9 + 0.1;
    ctx.strokeStyle = pulse.weapon.color;
    ctx.shadowColor = pulse.weapon.color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(pulse.x * tile, pulse.y * tile, pulse.r * tile, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  for (const wave of c.waves) {
    const x = wave.x * tile;
    const y = wave.y * tile;
    const half = tile * ((wave.weapon.width ?? 3) / 2);
    const px = -wave.dy;
    const py = wave.dx;
    ctx.strokeStyle = wave.weapon.color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(x + px * half - wave.dx * 6, y + py * half - wave.dy * 6);
    ctx.quadraticCurveTo(x + wave.dx * 10, y + wave.dy * 10, x - px * half - wave.dx * 6, y - py * half - wave.dy * 6);
    ctx.stroke();
    ctx.strokeStyle = '#ecfeff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  ctx.globalAlpha = 1;

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
