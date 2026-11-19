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
import { fightStatsOf, simulateHp } from './fightHeroes';

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
  mine: boolean;
  mesh: THREE.Mesh;
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
// left click or Space to fire where the crosshair points. Health comes back a few seconds after the last hit.
export default function FightGame3D({ matchId, side, heroId, opponentName, onMatch }: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touch = useRef({ moveX: 0, moveY: 0, fire: false });
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;
  const me0 = fightStatsOf(heroId);
  const [hud, setHud] = useState({ hp: me0?.hp ?? 100, hpMax: me0?.hp ?? 100, oppHp: 100, oppMax: 100, count: 99, left: Math.round(FIGHT_MS / 1000), over: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const holder = holderRef.current;
    const myStats = fightStatsOf(heroId);
    if (!canvas || !holder || !myStats) return;

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
    let oppHp = { hp: 100, max: 100 };

    const bullets: Bullet[] = [];
    const myShots: ArenaShot[] = [];
    const myHits: number[] = [];
    let landed = 0;
    let shotN = 0;
    let lastOppShot = -1;
    let startLocal: number | null = null;
    let finished = false;
    let dead = false;
    let sending = false;
    let lastSend = 0;
    let lastFire = 0;
    let shown = { hp: myStats.hp, hpMax: myStats.hp, oppHp: 100, oppMax: 100, count: 99, left: Math.round(FIGHT_MS / 1000), over: false };

    // ----- input -----
    const keys = new Set<string>();
    let mouseFire = false;
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      keys.add(k);
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const mm = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw -= e.movementX * 0.0025;
      pitch = Math.max(-0.45, Math.min(0.7, pitch - e.movementY * 0.002));
    };
    const md = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
      mouseFire = true;
    };
    const mu = (e: MouseEvent) => {
      if (e.button === 0) mouseFire = false;
    };
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
    window.addEventListener('mouseup', mu);

    // ----- network -----
    function send(ready: boolean) {
      if (sending) return;
      sending = true;
      lastSend = performance.now();
      const ms = ready && startLocal !== null ? Math.max(0, Math.round(Date.now() - startLocal)) : -1;
      fetch('/api/pvp/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matchId, hero: heroId, x: me.x, z: me.z, yaw, ms, landed, hits: myHits.slice(0, MAX_HITS_SENT), shots: myShots }),
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
              opp = { x: a.opponent.x, z: a.opponent.z, yaw: a.opponent.yaw ?? 0, hero: a.opponent.hero };
            }
            if (opp) opp.yaw = a.opponent.yaw ?? opp.yaw;
            const fresh = (a.opponent.shots as ArenaShot[]).filter((s) => s.n > lastOppShot).sort((p, q) => p.n - q.n);
            for (const s of fresh) {
              addBullet(s.x, s.y, s.z, s.dx, s.dy, s.dz, false, 0.07);
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

    function addBullet(x: number, y: number, z: number, dx: number, dy: number, dz: number, mine: boolean, age = 0) {
      const mesh = new THREE.Mesh(bulletGeo, mine ? mineMat : theirMat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      bullets.push({ x, y, z, dx, dy, dz, age, mine, mesh });
    }

    // ----- game step -----
    const dirVec = new THREE.Vector3();
    function update(dt: number, now: number) {
      const open = startLocal !== null && Date.now() >= startLocal;
      if (finished || dead) return;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const rx = -fz;
      const rz = fx;
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
          const nx = me.x + (fx * mf + rx * mr) * myStats!.speed * dt;
          if (!touchesWall(nx, me.z, PLAYER_R)) me.x = nx;
          const nz = me.z + (fz * mf + rz * mr) * myStats!.speed * dt;
          if (!touchesWall(me.x, nz, PLAYER_R)) me.z = nz;
        }
        // Fire where the crosshair points.
        if ((mouseFire || keys.has(' ') || touch.current.fire) && now - lastFire > myStats!.fireMs) {
          lastFire = now;
          camera.getWorldDirection(dirVec);
          const aimX = camera.position.x + dirVec.x * 50;
          const aimY = camera.position.y + dirVec.y * 50;
          const aimZ = camera.position.z + dirVec.z * 50;
          const sx = me.x + fx * 0.8;
          const sy = 1.5;
          const sz = me.z + fz * 0.8;
          const l = Math.hypot(aimX - sx, aimY - sy, aimZ - sz) || 1;
          const shot: ArenaShot = { n: ++shotN, x: sx, y: sy, z: sz, dx: (aimX - sx) / l, dy: (aimY - sy) / l, dz: (aimZ - sz) / l };
          myShots.push(shot);
          if (myShots.length > MAX_SHOTS_SENT) myShots.shift();
          addBullet(shot.x, shot.y, shot.z, shot.dx, shot.dy, shot.dz, true);
        }
      }
      // Bullets fly, hit crates, and hit fighters (my shots on them, theirs on me).
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.dx * BULLET_SPEED * dt;
        b.y += b.dy * BULLET_SPEED * dt;
        b.z += b.dz * BULLET_SPEED * dt;
        b.age += dt;
        let gone = b.age > BULLET_LIFE_S || pointBlocked(b.x, b.y, b.z);
        if (!gone && open) {
          if (b.mine && opp && b.y < PLAYER_H && Math.hypot(b.x - opp.x, b.z - opp.z) < HIT_R_ATTACKER) {
            landed++;
            gone = true;
          } else if (!b.mine && b.y < PLAYER_H && Math.hypot(b.x - me.x, b.z - me.z) < HIT_R_VICTIM && startLocal !== null && myHits.length < MAX_HITS_SENT) {
            myHits.push(Math.round(Date.now() - startLocal));
            gone = true;
          }
        }
        b.mesh.position.set(b.x, b.y, b.z);
        if (gone) {
          scene.remove(b.mesh);
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
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      camera.position.set(me.x - fx * 6.2 - fz * 1.3, 3.1 + Math.max(0, pitch) * 3, me.z - fz * 6.2 + fx * 1.3);
      camera.lookAt(me.x + fx * 10, 1.7 + pitch * 9, me.z + fz * 10);
      camera.updateMatrixWorld();
      update(dt, now);

      const ms = startLocal === null ? 0 : Math.max(0, Date.now() - startLocal);
      const sim = simulateHp(myHits, oppStats?.damage ?? 14, myStats!.hp, ms);
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
      const next = { hp: Math.round(sim.hp), hpMax: myStats!.hp, oppHp: Math.round(oppHp.hp), oppMax: oppHp.max, count, left, over: finished || dead };
      if (next.hp !== shown.hp || next.oppHp !== shown.oppHp || next.oppMax !== shown.oppMax || next.count !== shown.count || next.left !== shown.left || next.over !== shown.over) {
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
      window.removeEventListener('mouseup', mu);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      renderer.dispose();
    };
  }, [matchId, side, heroId, opponentName]);

  // On-screen controls for phones: left half = move stick, right half = look around, plus a fire button.
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
            // Dragging turns the camera: feed it to the same handler the mouse uses.
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
        Click the screen to aim with the mouse. Move: WASD. Fire: click or Space. Your health comes back a few seconds after the last hit. On a phone: left thumb moves,
        right thumb looks, 🔫 fires.
      </p>
    </div>
  );
}
