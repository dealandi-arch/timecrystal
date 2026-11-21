'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CHARACTERS, getCharacterLook, getSpriteCanvas } from '../rpg/pixelArt';
import {
  ARENA_BOXES,
  ARENA_D,
  ARENA_W,
  BULLET_LIFE_S,
  BULLET_SPEED,
  FIGHT_MS,
  HIT_R_ATTACKER,
  HIT_R_VICTIM,
  MAX_HITS_SENT,
  MAX_SHOTS_SENT,
  PLAYER_H,
  PLAYER_R,
  SPAWN,
  type ArenaShot,
  pointBlocked,
  touchesWall,
} from './arenaConfig';
import { type AbilityStats, abilityOf, fightStatsOf, simulateHp } from './fightHeroes';

const SEND_EVERY_MS = 110;

interface Props {
  matchId: number;
  side: 'a' | 'b';
  heroId: string;
  opponentName: string;
  onMatch: (match: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface Bullet {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  age: number;
  life: number;
  speed: number;
  mine: boolean;
  ability: boolean;
  homing: number;
  pierce: number;
  freezeMs: number;
  spent: boolean;
  mesh: THREE.Mesh;
}

interface Fx {
  obj: THREE.Object3D;
  born: number;
  life: number;
  update?: (k: number) => void;
}

function heroTexture(id: string): THREE.Texture {
  const hero = CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
  const look = getCharacterLook(hero, 'human');
  const tex = new THREE.CanvasTexture(getSpriteCanvas(`fight:${hero.id}`, look.sprite, look.palette, 8));
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A fighter standing in the arena: the hero's sprite, a shadow, and a name + health bar above their head.
function makeFighter(heroId: string, name: string, color: string) {
  const group = new THREE.Group();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: heroTexture(heroId), transparent: true }));
  sprite.scale.set(2.7, 2.7, 1);
  sprite.position.y = 1.35;
  group.add(sprite);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 48;
  const barTex = new THREE.CanvasTexture(canvas);
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: barTex, transparent: true, depthTest: false }));
  bar.scale.set(3.6, 0.9, 1);
  bar.position.y = 3.3;
  group.add(bar);
  let lastKey = '';
  function setBar(hp: number, max: number) {
    const key = `${Math.round(hp)}/${max}`;
    if (key === lastKey) return;
    lastKey = key;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, 192, 48);
    c.font = 'bold 20px sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#fff';
    c.strokeStyle = 'rgba(0,0,0,0.8)';
    c.lineWidth = 4;
    c.strokeText(name, 96, 18);
    c.fillText(name, 96, 18);
    c.fillStyle = 'rgba(0,0,0,0.65)';
    c.fillRect(8, 26, 176, 16);
    const frac = Math.max(0, Math.min(1, hp / max));
    c.fillStyle = frac > 0.5 ? '#4ade80' : frac > 0.25 ? '#facc15' : '#f87171';
    c.fillRect(10, 28, 172 * frac, 12);
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.strokeRect(8, 26, 176, 16);
    barTex.needsUpdate = true;
  }
  return { group, setBar };
}

// A live 3D fight: third-person camera, mouse look (click the screen to capture the mouse), WASD to move,
// left click or Space to fire where the crosshair points, and E or right click for your hero's ability.
// Health comes back a few seconds after the last hit.
export default function FightGame3D({ matchId, side, heroId, opponentName, onMatch }: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touch = useRef({ moveX: 0, moveY: 0, fire: false, ability: false });
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;
  const me0 = fightStatsOf(heroId);
  const ability0 = abilityOf(heroId);
  const [hud, setHud] = useState({ hp: me0?.hp ?? 100, hpMax: me0?.hp ?? 100, oppHp: 100, oppMax: 100, count: 99, left: Math.round(FIGHT_MS / 1000), over: false, cd: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const holder = holderRef.current;
    const myStats = fightStatsOf(heroId);
    const myAbility = abilityOf(heroId);
    if (!canvas || !holder || !myStats || !myAbility) return;

    // ----- scene -----
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1226);
    scene.fog = new THREE.Fog(0x0b1226, 40, 90);
    const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x1b2540, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(-20, 40, 10);
    scene.add(sun);

    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fc = floorCanvas.getContext('2d');
    if (fc) {
      fc.fillStyle = '#1e293b';
      fc.fillRect(0, 0, 512, 512);
      fc.strokeStyle = 'rgba(148,163,184,0.35)';
      fc.lineWidth = 2;
      fc.strokeRect(0, 0, 512, 512);
      fc.fillStyle = 'rgba(103,232,249,0.08)';
      fc.fillRect(0, 0, 256, 256);
      fc.fillRect(256, 256, 256, 256);
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(ARENA_W / 4, ARENA_D / 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_W, ARENA_D), new THREE.MeshStandardMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ARENA_W / 2, 0, ARENA_D / 2);
    scene.add(floor);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    for (const b of ARENA_BOXES) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), crateMat);
      mesh.position.set(b.x, b.h / 2, b.z);
      scene.add(mesh);
    }
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    for (const [x, z, w, d] of [
      [ARENA_W / 2, -0.5, ARENA_W + 2, 1],
      [ARENA_W / 2, ARENA_D + 0.5, ARENA_W + 2, 1],
      [-0.5, ARENA_D / 2, 1, ARENA_D],
      [ARENA_W + 0.5, ARENA_D / 2, 1, ARENA_D],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), edgeMat);
      wall.position.set(x, 1.5, z);
      scene.add(wall);
    }

    const bulletGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const mineMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    const theirMat = new THREE.MeshBasicMaterial({ color: 0xfb923c });

    const spawn = SPAWN[side];
    const me = { x: spawn.x, z: spawn.z };
    let yaw = spawn.yaw;
    let pitch = 0.08;
    const self = makeFighter(heroId, 'You', '#22d3ee');
    scene.add(self.group);
    let opp: { x: number; z: number; yaw: number; hero: string } | null = null;
    let oppTarget: { x: number; z: number } | null = null;
    let oppFighter: ReturnType<typeof makeFighter> | null = null;
    let oppStats: ReturnType<typeof fightStatsOf> = null;
    let oppAbility: AbilityStats | null = null;
    let oppHp = { hp: 100, max: 100 };

    const bullets: Bullet[] = [];
    const fx: Fx[] = [];
    const myShots: ArenaShot[] = [];
    const myHits: number[] = [];
    const myAbilityHits: number[] = [];
    let landed = 0;
    let abilityLanded = 0;
    let shotN = 0;
    let lastOppShot = -1;
    let startLocal: number | null = null;
    let finished = false;
    let dead = false;
    let sending = false;
    let lastSend = 0;
    let lastFire = 0;
    let abilityReadyAt = 0;
    let slowUntil = 0;
    let shown = { hp: myStats.hp, hpMax: myStats.hp, oppHp: 100, oppMax: 100, count: 99, left: Math.round(FIGHT_MS / 1000), over: false, cd: 0 };

    // ----- input -----
    const keys = new Set<string>();
    let mouseFire = false;
    let abilityQueued = false;
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === 'e' && !keys.has('e')) abilityQueued = true;
      keys.add(k);
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const mm = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw -= e.movementX * 0.0025;
      pitch = Math.max(-0.45, Math.min(0.7, pitch - e.movementY * 0.002));
    };
    const md = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
      if (e.button === 0) mouseFire = true;
      if (e.button === 2) abilityQueued = true;
    };
    const mu = (e: MouseEvent) => {
      if (e.button === 0) mouseFire = false;
    };
    const noMenu = (e: Event) => e.preventDefault();
    const touchLook = (e: Event) => {
      const d = (e as CustomEvent<{ dx: number; dy: number }>).detail;
      yaw -= d.dx * 0.006;
      pitch = Math.max(-0.45, Math.min(0.7, pitch - d.dy * 0.004));
    };
    window.addEventListener('fight-look', touchLook);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    document.addEventListener('mousemove', mm);
    canvas.addEventListener('mousedown', md);
    canvas.addEventListener('contextmenu', noMenu);
    window.addEventListener('mouseup', mu);

    // ----- effects -----
    function addFx(obj: THREE.Object3D, life: number, update?: (k: number) => void) {
      scene.add(obj);
      fx.push({ obj, born: performance.now(), life, update });
    }
    function disposeObj(obj: THREE.Object3D) {
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | undefined;
        mat?.dispose?.();
      });
    }
    function flatMaterial(color: string, opacity: number) {
      return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    }
    function ringFx(x: number, z: number, radius: number, color: string, life: number, grow: boolean) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(radius * 0.92, radius, 40), flatMaterial(color, 0.7));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.08, z);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), flatMaterial(color, 0.18));
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(x, 0.07, z);
      const group = new THREE.Group();
      group.add(mesh, disc);
      addFx(group, life, (k) => {
        group.scale.setScalar(grow ? 0.25 + 0.75 * k : 1);
        (mesh.material as THREE.MeshBasicMaterial).opacity = grow ? 0.7 : 0.35 + 0.5 * k;
      });
    }
    function sectorFx(x: number, z: number, dx: number, dz: number, reach: number, circle: boolean, color: string) {
      const arc = circle ? Math.PI * 2 : (Math.PI * 2) / 3;
      const geo = new THREE.CircleGeometry(reach, 24, circle ? 0 : -arc / 2, arc);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, flatMaterial(color, 0.55));
      mesh.position.set(x, 0.9, z);
      mesh.rotation.y = -Math.atan2(dz, dx);
      addFx(mesh, 220, (k) => ((mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k)));
    }
    function beamFx(x: number, y: number, z: number, ex: number, ey: number, ez: number, color: string) {
      const len = Math.hypot(ex - x, ey - y, ez - z);
      const geo = new THREE.CylinderGeometry(0.14, 0.14, len, 8);
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      mesh.position.set((x + ex) / 2, (y + ey) / 2, (z + ez) / 2);
      mesh.lookAt(ex, ey, ez);
      addFx(mesh, 200, (k) => ((mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k)));
    }

    // ----- hits -----
    function registerHit(mine: boolean, byAbility: boolean, freezeMs: number) {
      if (mine) {
        if (byAbility) abilityLanded++;
        else landed++;
      } else if (startLocal !== null) {
        const t = Math.round(Date.now() - startLocal);
        if (byAbility && myAbilityHits.length < MAX_HITS_SENT) myAbilityHits.push(t);
        else if (!byAbility && myHits.length < MAX_HITS_SENT) myHits.push(t);
        if (freezeMs > 0) slowUntil = performance.now() + freezeMs;
      }
    }
    const targetOf = (mine: boolean) => (mine ? opp : me);
    const hitRadius = (mine: boolean) => (mine ? HIT_R_ATTACKER : HIT_R_VICTIM);

    // Works out one attack (mine, or the opponent's seen on my screen). Shots fly; everything else goes off at once or after a delay.
    function resolveAttack(s: ArenaShot, mine: boolean, ab: AbilityStats | null, age = 0) {
      const kind = s.k ?? 's';
      const color = mine ? ab?.color ?? '#67e8f9' : ab?.color ?? '#fb923c';
      if (kind === 's') {
        const isAb = !!s.ab && !!ab;
        const mesh = new THREE.Mesh(bulletGeo, isAb ? new THREE.MeshBasicMaterial({ color }) : mine ? mineMat : theirMat);
        mesh.position.set(s.x, s.y, s.z);
        if (isAb) mesh.scale.setScalar(1.25);
        scene.add(mesh);
        bullets.push({
          x: s.x, y: s.y, z: s.z, dx: s.dx, dy: s.dy, dz: s.dz, age,
          life: isAb ? ab!.life : BULLET_LIFE_S,
          speed: isAb ? ab!.speed : BULLET_SPEED,
          mine,
          ability: isAb,
          homing: isAb ? ab!.homing : 0,
          pierce: isAb ? ab!.pierce : 0,
          freezeMs: isAb ? ab!.freezeMs : 0,
          spent: false,
          mesh,
        });
        return;
      }
      if (!ab) return;
      const target = targetOf(mine);
      if (kind === 'm') {
        sectorFx(s.x, s.z, s.dx, s.dz, ab.reach, ab.circle, color);
        if (!target) return;
        const rx = target.x - s.x;
        const rz = target.z - s.z;
        const dist = Math.hypot(rx, rz);
        const hl = Math.hypot(s.dx, s.dz) || 1;
        const along = (rx * s.dx + rz * s.dz) / hl;
        const across = Math.abs(rx * s.dz - rz * s.dx) / hl;
        const inFront = ab.dash ? along > 0 && along < ab.reach && across < 1.6 : dist < ab.reach + hitRadius(mine) * 0.4 && along > -0.3 && Math.acos(Math.min(1, Math.max(-1, along / (dist || 1)))) < Math.PI / 3;
        if (ab.circle ? dist < ab.reach + 0.6 : inFront) registerHit(mine, true, ab.freezeMs);
      } else if (kind === 'b') {
        // Step along the line until something solid; hit if the target is close to it.
        let ex = s.x;
        let ey = s.y;
        let ez = s.z;
        let hit = false;
        for (let d = 0.5; d <= ab.reach; d += 0.5) {
          ex = s.x + s.dx * d;
          ey = s.y + s.dy * d;
          ez = s.z + s.dz * d;
          if (pointBlocked(ex, ey, ez)) break;
          if (target && ey < PLAYER_H && Math.hypot(ex - target.x, ez - target.z) < hitRadius(mine) * 0.9) {
            hit = true;
            break;
          }
        }
        beamFx(s.x, s.y, s.z, ex, ey, ez, color);
        if (hit) registerHit(mine, true, ab.freezeMs);
      } else {
        // An area: marked now, goes off after the delay (bursts go off almost at once).
        const delay = Math.max(120, ab.delayMs);
        ringFx(s.x, s.z, ab.radius, color, delay, true);
        window.setTimeout(() => {
          if (finished) return;
          const t = targetOf(mine);
          ringFx(s.x, s.z, ab.radius, color, 260, false);
          if (t && Math.hypot(t.x - s.x, t.z - s.z) < ab.radius + (mine ? 0.5 : 0)) registerHit(mine, true, ab.freezeMs);
        }, delay);
      }
    }

    // ----- network -----
    function send(ready: boolean) {
      if (sending) return;
      sending = true;
      lastSend = performance.now();
      const ms = ready && startLocal !== null ? Math.max(0, Math.round(Date.now() - startLocal)) : -1;
      fetch('/api/pvp/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: matchId, hero: heroId, x: me.x, z: me.z, yaw, ms, landed, abilityLanded,
          hits: myHits.slice(0, MAX_HITS_SENT), abilityHits: myAbilityHits.slice(0, MAX_HITS_SENT), shots: myShots,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data?.match) return;
          const m = data.match;
          onMatchRef.current(m);
          if (m.startAt) startLocal = m.startAt - (m.serverNow - Date.now()); // corrected for the server clock
          const a = data.arena;
          if (a?.opponent) {
            oppTarget = { x: a.opponent.x, z: a.opponent.z };
            if (a.opponent.hero && (!opp || opp.hero !== a.opponent.hero)) {
              if (oppFighter) scene.remove(oppFighter.group);
              oppFighter = makeFighter(a.opponent.hero, opponentName, '#fb923c');
              scene.add(oppFighter.group);
              oppStats = fightStatsOf(a.opponent.hero);
              oppAbility = abilityOf(a.opponent.hero);
              opp = { x: a.opponent.x, z: a.opponent.z, yaw: a.opponent.yaw ?? 0, hero: a.opponent.hero };
            }
            if (opp) opp.yaw = a.opponent.yaw ?? opp.yaw;
            const fresh = (a.opponent.shots as ArenaShot[]).filter((s) => s.n > lastOppShot).sort((p, q) => p.n - q.n);
            for (const s of fresh) {
              resolveAttack(s, false, oppAbility, 0.07);
              lastOppShot = s.n;
            }
          }
          if (a) oppHp = { hp: a.hpOpponent, max: a.hpMaxOpponent };
          if (m.finished || m.status === 'cancelled') finished = true;
        })
        .catch(() => {})
        .finally(() => {
          sending = false;
        });
    }

    // ----- game step -----
    const dirVec = new THREE.Vector3();
    function pushShot(s: ArenaShot) {
      myShots.push(s);
      if (myShots.length > MAX_SHOTS_SENT) myShots.shift();
    }
    function aimDirection(fx_: number, fz_: number) {
      camera.getWorldDirection(dirVec);
      const aimX = camera.position.x + dirVec.x * 50;
      const aimY = camera.position.y + dirVec.y * 50;
      const aimZ = camera.position.z + dirVec.z * 50;
      const sx = me.x + fx_ * 0.8;
      const sy = 1.5;
      const sz = me.z + fz_ * 0.8;
      const l = Math.hypot(aimX - sx, aimY - sy, aimZ - sz) || 1;
      return { sx, sy, sz, dx: (aimX - sx) / l, dy: (aimY - sy) / l, dz: (aimZ - sz) / l };
    }
    function castAbility(now: number, fx_: number, fz_: number) {
      abilityReadyAt = now + myAbility!.cooldownMs;
      const ab = myAbility!;
      const aim = aimDirection(fx_, fz_);
      if (ab.kind === 'volley') {
        for (let i = 0; i < ab.count; i++) {
          const off = ab.count > 1 ? ((i / (ab.count - 1)) - 0.5) * ((ab.spreadDeg * Math.PI) / 180) : 0;
          const c = Math.cos(off);
          const sn = Math.sin(off);
          const dx = aim.dx * c - aim.dz * sn;
          const dz = aim.dx * sn + aim.dz * c;
          const s: ArenaShot = { n: ++shotN, x: aim.sx, y: aim.sy, z: aim.sz, dx, dy: aim.dy, dz, k: 's', ab: 1 };
          pushShot(s);
          resolveAttack(s, true, ab);
        }
        return;
      }
      if (ab.kind === 'strike') {
        const s: ArenaShot = { n: ++shotN, x: me.x, y: 1.4, z: me.z, dx: fx_, dy: 0, dz: fz_, k: 'm', ab: 1 };
        pushShot(s);
        resolveAttack(s, true, ab);
        if (ab.dash) {
          // Lunge forward as far as nothing is in the way.
          for (let d = 0.5; d <= ab.reach; d += 0.5) {
            const nx = me.x + fx_ * 0.5;
            const nz = me.z + fz_ * 0.5;
            if (touchesWall(nx, nz, PLAYER_R)) break;
            me.x = nx;
            me.z = nz;
          }
        }
        return;
      }
      if (ab.kind === 'beam') {
        const s: ArenaShot = { n: ++shotN, x: aim.sx, y: aim.sy, z: aim.sz, dx: aim.dx, dy: aim.dy, dz: aim.dz, k: 'b', ab: 1 };
        pushShot(s);
        resolveAttack(s, true, ab);
        return;
      }
      // burst: around you. blast: under your feet (mines) or where the crosshair meets the floor.
      let cx = me.x;
      let cz = me.z;
      if (ab.kind === 'blast' && !ab.atFeet) {
        const t = aim.dy < -0.02 ? (0 - aim.sy) / aim.dy : 16;
        const reach = Math.min(Math.max(t, 4), 22);
        cx = Math.min(ARENA_W - 1, Math.max(1, aim.sx + aim.dx * reach));
        cz = Math.min(ARENA_D - 1, Math.max(1, aim.sz + aim.dz * reach));
      }
      const s: ArenaShot = { n: ++shotN, x: cx, y: 0, z: cz, dx: fx_, dy: 0, dz: fz_, k: 'a', ab: 1 };
      pushShot(s);
      resolveAttack(s, true, ab);
    }

    function update(dt: number, now: number) {
      const open = startLocal !== null && Date.now() >= startLocal;
      if (finished || dead) return;
      const fx_ = Math.sin(yaw);
      const fz_ = Math.cos(yaw);
      const rx = -fz_;
      const rz = fx_;
      if (keys.has('arrowleft')) yaw += 2.2 * dt;
      if (keys.has('arrowright')) yaw -= 2.2 * dt;
      if (keys.has('arrowup')) pitch = Math.min(0.7, pitch + 1.2 * dt);
      if (keys.has('arrowdown')) pitch = Math.max(-0.45, pitch - 1.2 * dt);
      if (open) {
        let mf = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0) + touch.current.moveY;
        let mr = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0) + touch.current.moveX;
        const len = Math.hypot(mf, mr);
        if (len > 1) {
          mf /= len;
          mr /= len;
        }
        if (len > 0.01) {
          const speed = myStats!.speed * (now < slowUntil ? 0.45 : 1);
          const nx = me.x + (fx_ * mf + rx * mr) * speed * dt;
          if (!touchesWall(nx, me.z, PLAYER_R)) me.x = nx;
          const nz = me.z + (fz_ * mf + rz * mr) * speed * dt;
          if (!touchesWall(me.x, nz, PLAYER_R)) me.z = nz;
        }
        // The hero's ability.
        if ((abilityQueued || touch.current.ability) && now >= abilityReadyAt) castAbility(now, fx_, fz_);
        abilityQueued = false;
        // Normal shot where the crosshair points.
        if ((mouseFire || keys.has(' ') || touch.current.fire) && now - lastFire > myStats!.fireMs) {
          lastFire = now;
          const aim = aimDirection(fx_, fz_);
          const s: ArenaShot = { n: ++shotN, x: aim.sx, y: aim.sy, z: aim.sz, dx: aim.dx, dy: aim.dy, dz: aim.dz, k: 's', ab: 0 };
          pushShot(s);
          resolveAttack(s, true, null);
        }
      } else abilityQueued = false;
      // Shots fly, hit crates, and hit fighters (mine on them, theirs on me).
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const target = targetOf(b.mine);
        if (b.homing > 0 && target) {
          const ax = target.x - b.x;
          const az = target.z - b.z;
          const l = Math.hypot(ax, az) || 1;
          const k = Math.min(1, b.homing * dt * 0.5);
          b.dx += (ax / l - b.dx) * k;
          b.dz += (az / l - b.dz) * k;
          const n = Math.hypot(b.dx, b.dy, b.dz) || 1;
          b.dx /= n;
          b.dy /= n;
          b.dz /= n;
        }
        b.x += b.dx * b.speed * dt;
        b.y += b.dy * b.speed * dt;
        b.z += b.dz * b.speed * dt;
        b.age += dt;
        let gone = b.age > b.life || pointBlocked(b.x, b.y, b.z);
        if (!gone && open && !b.spent && target && b.y < PLAYER_H && Math.hypot(b.x - target.x, b.z - target.z) < hitRadius(b.mine)) {
          registerHit(b.mine, b.ability, b.freezeMs);
          b.spent = true; // one shot can only hit once
          if (b.pierce > 0) b.pierce--;
          else gone = true;
        }
        b.mesh.position.set(b.x, b.y, b.z);
        if (gone) {
          scene.remove(b.mesh);
          if (b.ability) (b.mesh.material as THREE.Material).dispose();
          bullets.splice(i, 1);
        }
      }
    }

    // ----- render loop -----
    let raf = 0;
    let last = performance.now();
    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = holder!.clientWidth;
      const h = holder!.clientHeight;
      if (w > 0 && h > 0 && (canvas!.width !== Math.floor(w * renderer.getPixelRatio()) || canvas!.height !== Math.floor(h * renderer.getPixelRatio()))) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      if (opp && oppTarget) {
        const k = Math.min(1, dt * 12);
        opp.x += (oppTarget.x - opp.x) * k;
        opp.z += (oppTarget.z - opp.z) * k;
      }
      // Camera: over the shoulder, looking where you aim.
      const fx_ = Math.sin(yaw);
      const fz_ = Math.cos(yaw);
      camera.position.set(me.x - fx_ * 6.2 - fz_ * 1.3, 3.1 + Math.max(0, pitch) * 3, me.z - fz_ * 6.2 + fx_ * 1.3);
      camera.lookAt(me.x + fx_ * 10, 1.7 + pitch * 9, me.z + fz_ * 10);
      camera.updateMatrixWorld();
      update(dt, now);

      // Effects fade out.
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i];
        const k = (now - f.born) / f.life;
        if (k >= 1) {
          scene.remove(f.obj);
          disposeObj(f.obj);
          fx.splice(i, 1);
        } else f.update?.(k);
      }

      const ms = startLocal === null ? 0 : Math.max(0, Date.now() - startLocal);
      const events = [
        ...myHits.map((t) => ({ t, dmg: oppStats?.damage ?? 14 })),
        ...myAbilityHits.map((t) => ({ t, dmg: oppAbility?.damage ?? 22 })),
      ];
      const sim = simulateHp(events, myStats!.hp, ms);
      if (sim.deadAt !== null && !dead) dead = true;
      self.group.position.set(me.x, 0, me.z);
      self.setBar(sim.hp, myStats!.hp);
      if (oppFighter && opp) {
        oppFighter.group.position.set(opp.x, 0, opp.z);
        oppFighter.setBar(oppHp.hp, oppHp.max);
      }
      if (now - lastSend > SEND_EVERY_MS) send(startLocal !== null && Date.now() >= startLocal);
      renderer.render(scene, camera);

      const wait = startLocal === null ? Infinity : startLocal - Date.now();
      const count = wait === Infinity ? 99 : wait > 0 ? Math.ceil(wait / 1000) : 0;
      const left = count > 0 ? Math.round(FIGHT_MS / 1000) : Math.max(0, Math.ceil((FIGHT_MS - ms) / 1000));
      const cd = Math.max(0, Math.ceil((abilityReadyAt - now) / 1000));
      const next = { hp: Math.round(sim.hp), hpMax: myStats!.hp, oppHp: Math.round(oppHp.hp), oppMax: oppHp.max, count, left, over: finished || dead, cd };
      if (next.hp !== shown.hp || next.oppHp !== shown.oppHp || next.oppMax !== shown.oppMax || next.count !== shown.count || next.left !== shown.left || next.over !== shown.over || next.cd !== shown.cd) {
        shown = next;
        setHud(next);
      }
      if ((finished || dead) && document.pointerLockElement === canvas) document.exitPointerLock?.();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    send(false); // tell the server I'm in the arena with my hero

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('fight-look', touchLook);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      document.removeEventListener('mousemove', mm);
      canvas.removeEventListener('mousedown', md);
      canvas.removeEventListener('contextmenu', noMenu);
      window.removeEventListener('mouseup', mu);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      renderer.dispose();
    };
  }, [matchId, side, heroId, opponentName]);

  // On-screen controls for phones: left half = move stick, right half = look around, plus fire and ability buttons.
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const hero = CHARACTERS.find((c) => c.id === heroId);

  return (
    <div className="fight">
      <div className="fight-hud">
        <div className="fight-bar">
          <span>
            You · {hero?.name} {hud.hp}/{hud.hpMax}
          </span>
          <div>
            <i style={{ width: `${Math.max(0, Math.min(100, (hud.hp / hud.hpMax) * 100))}%` }} />
          </div>
        </div>
        <strong>
          ⏱ {Math.floor(hud.left / 60)}:{String(hud.left % 60).padStart(2, '0')}
        </strong>
        <div className="fight-bar opp">
          <span>
            {opponentName} {hud.oppHp}/{hud.oppMax}
          </span>
          <div>
            <i style={{ width: `${Math.max(0, Math.min(100, (hud.oppHp / hud.oppMax) * 100))}%` }} />
          </div>
        </div>
      </div>
      <div className="fight-stage" ref={holderRef}>
        <canvas ref={canvasRef} className="fight-canvas" />
        <div className="fight-cross" aria-hidden="true" />
        {ability0 && (
          <div className={`fight-ability${hud.cd > 0 ? ' cooling' : ''}`} style={{ borderColor: ability0.color }}>
            <strong>E · {ability0.name}</strong>
            <span>{hud.cd > 0 ? `${hud.cd}s` : 'Ready'}</span>
          </div>
        )}
        {!hud.over && hud.count > 0 && (
          <div className="game-overlay race-count">
            <h2>{hud.count > 4 ? 'Waiting for your opponent…' : hud.count}</h2>
          </div>
        )}
        <div
          className="fight-zone fight-zone-move"
          onPointerDown={(e) => {
            stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const s = stick.current;
            if (!s || s.id !== e.pointerId) return;
            touch.current.moveX = Math.max(-1, Math.min(1, (e.clientX - s.x) / 50));
            touch.current.moveY = Math.max(-1, Math.min(1, -(e.clientY - s.y) / 50));
          }}
          onPointerUp={() => {
            stick.current = null;
            touch.current.moveX = 0;
            touch.current.moveY = 0;
          }}
          onPointerCancel={() => {
            stick.current = null;
            touch.current.moveX = 0;
            touch.current.moveY = 0;
          }}
        />
        <div
          className="fight-zone fight-zone-look"
          onPointerDown={(e) => {
            look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const l = look.current;
            if (!l || l.id !== e.pointerId) return;
            const dx = e.clientX - l.x;
            const dy = e.clientY - l.y;
            l.x = e.clientX;
            l.y = e.clientY;
            window.dispatchEvent(new CustomEvent('fight-look', { detail: { dx, dy } }));
          }}
          onPointerUp={() => (look.current = null)}
          onPointerCancel={() => (look.current = null)}
        />
        <button
          className="fight-fire fight-ability-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            touch.current.ability = true;
          }}
          onPointerUp={() => (touch.current.ability = false)}
          onPointerLeave={() => (touch.current.ability = false)}
          onPointerCancel={() => (touch.current.ability = false)}
        >
          ✦
        </button>
        <button
          className="fight-fire"
          onPointerDown={(e) => {
            e.preventDefault();
            touch.current.fire = true;
          }}
          onPointerUp={() => (touch.current.fire = false)}
          onPointerLeave={() => (touch.current.fire = false)}
          onPointerCancel={() => (touch.current.fire = false)}
        >
          🔫
        </button>
      </div>
      <p className="arena-help">
        Click the screen to aim with the mouse. Move: WASD. Fire: click or Space. Ability: E or right click ({ability0?.desc}). Your health comes back a few seconds after the last hit.
        On a phone: left thumb moves, right thumb looks, 🔫 fires and ✦ uses your ability.
      </p>
    </div>
  );
}
