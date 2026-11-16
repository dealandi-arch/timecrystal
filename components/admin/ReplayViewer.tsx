'use client';

import { useEffect, useRef, useState } from 'react';
import { type Replay, positionAt } from '../rpg/replay';

interface LevelSnap {
  grid: number[][];
  start: { x: number; y: number };
  enemies: { x: number; y: number; hp: number }[];
  crystalPath: { x: number; y: number }[];
  name?: string;
}

const CELL = 28;

// Plays back a run's replay over a top-down map of the level, so admins can watch how it was done.
export default function ReplayViewer({ replay, level, claimedMs }: { replay: Replay | null; level: LevelSnap | null; claimedMs: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const end = replay?.end ?? 0;

  useEffect(() => {
    if (!playing || !replay) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setT((cur) => {
        const next = cur + (now - last) * speed;
        if (next >= end) {
          setPlaying(false);
          return end;
        }
        return next;
      });
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, end, replay]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !level) return;
    const rows = level.grid.length;
    const cols = level.grid[0]?.length ?? 0;
    ctx.clearRect(0, 0, cols * CELL, rows * CELL);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = level.grid[y][x] === 1 ? '#334155' : level.grid[y][x] === 2 ? '#4c1d95' : '#0f172a';
        ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
      }
    }
    // crystal stops
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2;
    for (const c of level.crystalPath) ctx.strokeRect(c.x * CELL + 5, c.y * CELL + 5, CELL - 11, CELL - 11);
    // enemies at their start, and an ✕ where each was beaten (once the replay reaches it)
    ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
    for (const e of level.enemies) ctx.fillRect(e.x * CELL + 8, e.y * CELL + 8, CELL - 17, CELL - 17);
    if (replay) {
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3;
      for (const [kt, kx, ky] of replay.kills) {
        if (kt > t) continue;
        ctx.beginPath();
        ctx.moveTo(kx * CELL + 6, ky * CELL + 6);
        ctx.lineTo(kx * CELL + CELL - 7, ky * CELL + CELL - 7);
        ctx.moveTo(kx * CELL + CELL - 7, ky * CELL + 6);
        ctx.lineTo(kx * CELL + 6, ky * CELL + CELL - 7);
        ctx.stroke();
      }
      // the path so far
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (const [st, sx, sy] of replay.samples) {
        if (st > t) break;
        const px = (sx / 10 + 0.5) * CELL;
        const py = (sy / 10 + 0.5) * CELL;
        if (!started) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        started = true;
      }
      ctx.stroke();
      const p = positionAt(replay, t);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc((p.x + 0.5) * CELL, (p.y + 0.5) * CELL, CELL * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [t, level, replay]);

  if (!level) return <p className="event-error">The level for this report isn’t available.</p>;
  const cols = level.grid[0]?.length ?? 0;
  return (
    <div className="replay">
      <canvas ref={canvasRef} width={cols * CELL} height={level.grid.length * CELL} className="replay-canvas" aria-label="Replay of the run" />
      {replay ? (
        <div className="replay-controls">
          <button className="ability-btn" onClick={() => (t >= end ? (setT(0), setPlaying(true)) : setPlaying(!playing))}>
            {playing ? '⏸ Pause' : t >= end && end > 0 ? '↺ Watch again' : '▶ Play'}
          </button>
          <input type="range" min={0} max={end} step={10} value={Math.min(t, end)} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} aria-label="Replay time" />
          <span className="replay-time">
            {(t / 1000).toFixed(2)}s / {(end / 1000).toFixed(2)}s
          </span>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Speed">
            <option value={0.25}>¼×</option>
            <option value={0.5}>½×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
          <span className="gacha-fine">
            {replay.samples.length} moments recorded · {replay.kills.length}/{level.enemies.length} enemies beaten · time sent {(claimedMs / 1000).toFixed(2)}s
          </span>
        </div>
      ) : (
        <p className="event-error">No replay: this time was sent without the level being played (or it’s from before the Cheat catcher existed).</p>
      )}
    </div>
  );
}
