'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ARENA_H,
  ARENA_HP,
  ARENA_MS,
  ARENA_W,
  ARENA_WALLS,
  BULLET_LIFE_S,
  BULLET_R,
  BULLET_SPEED,
  FIRE_EVERY_MS,
  MAX_SHOTS_SENT,
  PLAYER_R,
  PLAYER_SPEED,
  SPAWN,
  type ArenaShot,
  touchesWall,
} from './arenaConfig';

const T = 40; // pixels per tile
const SEND_EVERY_MS = 150;

interface Props {
  matchId: number;
  side: 'a' | 'b';
  opponentName: string;
  onMatch: (match: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  age: number;
  mine: boolean;
}

// A live 1v1 fight. You move and fire (your shots fly toward the opponent); you decide when the opponent's
// shots hit YOU, and they decide when yours hit them. The server only counts a hit when both sides agree.
export default function ArenaGame({ matchId, side, opponentName, onMatch }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useRef(new Set<string>());
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;
  const [hud, setHud] = useState({ hpMe: ARENA_HP, hpOpp: ARENA_HP, count: 99, left: Math.round(ARENA_MS / 1000), over: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const spawn = SPAWN[side];
    const me = { x: spawn.x, y: spawn.y };
    let opp: { x: number; y: number } | null = null;
    let oppTarget: { x: number; y: number } | null = null;
    let landed = 0;
    let taken = 0;
    let shotN = 0;
    let lastOppShot = -1;
    const myShots: ArenaShot[] = [];
    const bullets: Bullet[] = [];
    let startLocal: number | null = null;
    let finished = false;
    let sending = false;
    let lastSend = 0;
    let lastFire = 0;
    let hpOppServer = ARENA_HP;
    let shown = { hpMe: ARENA_HP, hpOpp: ARENA_HP, count: 99, left: Math.round(ARENA_MS / 1000), over: false };

    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      keys.current.add(k);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    function send(ready: boolean) {
      if (sending) return;
      sending = true;
      lastSend = performance.now();
      const ms = ready && startLocal !== null ? Math.max(0, Math.round(Date.now() - startLocal)) : -1;
      fetch('/api/pvp/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matchId, x: me.x, y: me.y, ms, landed, taken, shots: myShots }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data?.match) return;
          const m = data.match;
          onMatchRef.current(m);
          if (m.startAt) startLocal = m.startAt - (m.serverNow - Date.now()); // corrected for the server clock
          const a = data.arena;
          if (a?.opponent) {
            oppTarget = { x: a.opponent.x, y: a.opponent.y };
            if (!opp) opp = { ...oppTarget };
            const fresh = (a.opponent.shots as ArenaShot[]).filter((s) => s.n > lastOppShot).sort((p, q) => p.n - q.n);
            for (const s of fresh) {
              bullets.push({ x: s.x, y: s.y, dx: s.dx, dy: s.dy, age: 0.08, mine: false });
              lastOppShot = s.n;
            }
          }
          if (a) hpOppServer = a.hpOpponent;
          if (m.finished || m.status === 'cancelled') finished = true;
        })
        .catch(() => {})
        .finally(() => {
          sending = false;
        });
    }

    function dist(ax: number, ay: number, bx: number, by: number) {
      return Math.hypot(ax - bx, ay - by);
    }

    function update(dt: number, now: number) {
      const open = startLocal !== null && Date.now() >= startLocal;
      if (!open || finished) return;
      // Move.
      let mx = 0;
      let my = 0;
      const k = keys.current;
      if (k.has('a') || k.has('arrowleft')) mx -= 1;
      if (k.has('d') || k.has('arrowright')) mx += 1;
      if (k.has('w') || k.has('arrowup')) my -= 1;
      if (k.has('s') || k.has('arrowdown')) my += 1;
      if (mx || my) {
        const len = Math.hypot(mx, my);
        const nx = me.x + (mx / len) * PLAYER_SPEED * dt;
        if (!touchesWall(nx, me.y, PLAYER_R)) me.x = nx;
        const ny = me.y + (my / len) * PLAYER_SPEED * dt;
        if (!touchesWall(me.x, ny, PLAYER_R)) me.y = ny;
      }
      // Fire toward the opponent.
      if ((k.has(' ') || k.has('fire')) && now - lastFire > FIRE_EVERY_MS) {
        lastFire = now;
        const tx = (opp?.x ?? (side === 'a' ? ARENA_W : 0)) - me.x;
        const ty = (opp?.y ?? me.y) - me.y;
        const len = Math.hypot(tx, ty) || 1;
        const s: ArenaShot = { n: ++shotN, x: me.x, y: me.y, dx: tx / len, dy: ty / len };
        myShots.push(s);
        if (myShots.length > MAX_SHOTS_SENT) myShots.shift();
        bullets.push({ x: s.x, y: s.y, dx: s.dx, dy: s.dy, age: 0, mine: true });
      }
      // Bullets: fly, hit walls, hit fighters.
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.dx * BULLET_SPEED * dt;
        b.y += b.dy * BULLET_SPEED * dt;
        b.age += dt;
        let gone = b.age > BULLET_LIFE_S || touchesWall(b.x, b.y, BULLET_R);
        if (!gone && b.mine && opp && dist(b.x, b.y, opp.x, opp.y) < PLAYER_R + BULLET_R + 0.1) {
          landed++;
          gone = true;
        } else if (!gone && !b.mine && dist(b.x, b.y, me.x, me.y) < PLAYER_R + BULLET_R + 0.05) {
          taken++;
          gone = true;
        }
        if (gone) bullets.splice(i, 1);
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, ARENA_W * T, ARENA_H * T);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, ARENA_W * T, ARENA_H * T);
      ctx.strokeStyle = 'rgba(148,163,184,0.12)';
      for (let x = 0; x <= ARENA_W; x++) {
        ctx.beginPath();
        ctx.moveTo(x * T, 0);
        ctx.lineTo(x * T, ARENA_H * T);
        ctx.stroke();
      }
      for (let y = 0; y <= ARENA_H; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * T);
        ctx.lineTo(ARENA_W * T, y * T);
        ctx.stroke();
      }
      ctx.fillStyle = '#475569';
      for (const [x, y, w, h] of ARENA_WALLS) ctx.fillRect(x * T, y * T, w * T, h * T);
      for (const b of bullets) {
        ctx.fillStyle = b.mine ? '#67e8f9' : '#fb923c';
        ctx.beginPath();
        ctx.arc(b.x * T, b.y * T, BULLET_R * T + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      const fighter = (p: { x: number; y: number }, color: string, name: string) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x * T, p.y * T, PLAYER_R * T, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, p.x * T, p.y * T - PLAYER_R * T - 6);
      };
      if (opp) fighter(opp, '#fb923c', opponentName);
      fighter(me, '#22d3ee', 'You');
    }

    let raf = 0;
    let last = performance.now();
    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (opp && oppTarget) {
        const k = Math.min(1, dt * 12);
        opp.x += (oppTarget.x - opp.x) * k;
        opp.y += (oppTarget.y - opp.y) * k;
      }
      update(dt, now);
      if (now - lastSend > SEND_EVERY_MS) send(startLocal !== null && Date.now() >= startLocal);
      draw();
      // HUD (only when something changed).
      const wait = startLocal === null ? Infinity : startLocal - Date.now();
      const count = wait === Infinity ? 99 : wait > 0 ? Math.ceil(wait / 1000) : 0;
      const left = startLocal === null ? Math.round(ARENA_MS / 1000) : Math.max(0, Math.ceil((ARENA_MS - (Date.now() - startLocal)) / 1000));
      const next = { hpMe: Math.max(0, ARENA_HP - taken), hpOpp: Math.min(hpOppServer, Math.max(0, ARENA_HP - landed)), count, left: count > 0 ? Math.round(ARENA_MS / 1000) : left, over: finished };
      if (next.hpMe !== shown.hpMe || next.hpOpp !== shown.hpOpp || next.count !== shown.count || next.left !== shown.left || next.over !== shown.over) {
        shown = next;
        setHud(next);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    send(false); // tell the server I'm in the arena

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [matchId, side, opponentName]);

  const hold = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      keys.current.add(key);
    },
    onPointerUp: () => keys.current.delete(key),
    onPointerLeave: () => keys.current.delete(key),
    onPointerCancel: () => keys.current.delete(key),
  });

  return (
    <div className="arena">
      <div className="arena-hud">
        <span>You {'❤'.repeat(hud.hpMe)}{'♡'.repeat(ARENA_HP - hud.hpMe)}</span>
        <span>
          ⏱ {Math.floor(hud.left / 60)}:{String(hud.left % 60).padStart(2, '0')}
        </span>
        <span>
          {opponentName} {'❤'.repeat(hud.hpOpp)}{'♡'.repeat(ARENA_HP - hud.hpOpp)}
        </span>
      </div>
      <div className="arena-stage">
        <canvas ref={canvasRef} width={ARENA_W * T} height={ARENA_H * T} className="arena-canvas" />
        {!hud.over && hud.count > 0 && (
          <div className="game-overlay race-count">
            <h2>{hud.count > 4 ? 'Waiting for your opponent…' : hud.count}</h2>
          </div>
        )}
      </div>
      <p className="arena-help">Move: WASD or arrows. Fire: Space (hold to keep firing). Your shots fly toward your opponent, so dodge theirs! First to take {ARENA_HP} hits loses.</p>
      <div className="arena-pad">
        <div>
          <button {...hold('arrowleft')}>◀</button>
          <button {...hold('arrowup')}>▲</button>
          <button {...hold('arrowdown')}>▼</button>
          <button {...hold('arrowright')}>▶</button>
        </div>
        <button className="arena-fire" {...hold('fire')}>
          🔫 Fire
        </button>
      </div>
    </div>
  );
}
