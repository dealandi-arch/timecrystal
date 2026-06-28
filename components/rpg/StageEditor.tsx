'use client';

import { useEffect, useRef, useState } from 'react';
import {
  COLS,
  FLOOR,
  ROWS,
  SECRET,
  TILE,
  TOTAL_LEVELS,
  WALL,
  type LevelDef,
  getLevel
} from './levels';
import { cloneLevel, clearLevelOverride, getEffectiveLevel, hasOverride, saveLevelOverride } from './levelOverrides';

const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;

type Tool = 'tile' | 'enemy' | 'crystal' | 'start';

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'tile', label: 'Tiles', hint: 'Click a cell to cycle Floor → Wall → Secret passage.' },
  { id: 'enemy', label: 'Enemies', hint: 'Click an empty floor cell to add an enemy, click an enemy to remove it.' },
  { id: 'crystal', label: 'Crystal path', hint: 'Click cells in order to append crystal patrol waypoints.' },
  { id: 'start', label: 'Player start', hint: 'Click a cell to set where the player begins this stage.' }
];

function drawLevel(ctx: CanvasRenderingContext2D, level: LevelDef) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#0b1330';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = level.grid[y][x];
      if (tile === FLOOR) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#1a2356' : '#172050';
      } else {
        ctx.fillStyle = '#312e81';
      }
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (tile === SECRET) {
        ctx.fillStyle = 'rgba(103, 232, 249, 0.35)';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
        ctx.setLineDash([]);
      }
    }
  }

  if (level.crystalPath.length > 0) {
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    level.crystalPath.forEach((pt, i) => {
      const cx = pt.x * TILE + TILE / 2;
      const cy = pt.y * TILE + TILE / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    if (level.crystalPath.length > 1) {
      const first = level.crystalPath[0];
      ctx.lineTo(first.x * TILE + TILE / 2, first.y * TILE + TILE / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    level.crystalPath.forEach((pt, i) => {
      const cx = pt.x * TILE + TILE / 2;
      const cy = pt.y * TILE + TILE / 2;
      ctx.beginPath();
      ctx.fillStyle = '#67e8f9';
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b1330';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), cx, cy);
    });
  }

  level.enemies.forEach((enemy, i) => {
    const cx = enemy.x * TILE + TILE / 2;
    const cy = enemy.y * TILE + TILE / 2;
    ctx.beginPath();
    ctx.fillStyle = '#f472b6';
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b1330';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}:${enemy.hp}`, cx, cy);
  });

  const sx = level.start.x * TILE + TILE / 2;
  const sy = level.start.y * TILE + TILE / 2;
  ctx.beginPath();
  ctx.fillStyle = '#facc15';
  ctx.arc(sx, sy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0b1330';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default function StageEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [levelId, setLevelId] = useState(1);
  const [editable, setEditable] = useState<LevelDef | null>(null);
  const [tool, setTool] = useState<Tool>('tile');
  const [overrideExists, setOverrideExists] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    const lvl = getEffectiveLevel(levelId);
    if (lvl) setEditable(cloneLevel(lvl));
    setOverrideExists(hasOverride(levelId));
    setMessage(null);
  }, [levelId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !editable) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawLevel(ctx, editable);
  }, [editable]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !editable) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE);
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

    setEditable((prev) => {
      if (!prev) return prev;
      const next = cloneLevel(prev);
      if (tool === 'tile') {
        const cur = next.grid[y][x];
        next.grid[y][x] = cur === FLOOR ? WALL : cur === WALL ? SECRET : FLOOR;
      } else if (tool === 'enemy') {
        const idx = next.enemies.findIndex((en) => en.x === x && en.y === y);
        if (idx >= 0) {
          next.enemies.splice(idx, 1);
        } else if (next.grid[y][x] !== WALL) {
          next.enemies.push({ id: `e${next.id}-${next.enemies.length}-${Date.now()}`, x, y, hp: 1 });
        }
      } else if (tool === 'crystal') {
        next.crystalPath.push({ x, y });
      } else if (tool === 'start') {
        next.start = { x, y };
      }
      return next;
    });
  }

  function updateEnemyHp(index: number, hp: number) {
    setEditable((prev) => {
      if (!prev) return prev;
      const next = cloneLevel(prev);
      next.enemies[index].hp = Math.max(1, hp);
      return next;
    });
  }

  function removeEnemy(index: number) {
    setEditable((prev) => {
      if (!prev) return prev;
      const next = cloneLevel(prev);
      next.enemies.splice(index, 1);
      return next;
    });
  }

  function removeWaypoint(index: number) {
    setEditable((prev) => {
      if (!prev) return prev;
      const next = cloneLevel(prev);
      next.crystalPath.splice(index, 1);
      return next;
    });
  }

  function clearWaypoints() {
    setEditable((prev) => {
      if (!prev) return prev;
      const next = cloneLevel(prev);
      next.crystalPath = [];
      return next;
    });
  }

  function handleSave() {
    if (!editable) return;
    if (editable.crystalPath.length === 0) {
      setMessage('Add at least one crystal waypoint before saving.');
      return;
    }
    saveLevelOverride(editable);
    setOverrideExists(true);
    setMessage('Saved. This stage will use your edits next time it is played.');
  }

  function handleResetToDefault() {
    clearLevelOverride(levelId);
    const base = getLevel(levelId);
    if (base) setEditable(cloneLevel(base));
    setOverrideExists(false);
    setMessage('Reset to the built-in version of this stage.');
  }

  if (!editable) return null;

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <label>
          Stage:&nbsp;
          <select value={levelId} onChange={(e) => setLevelId(Number(e.target.value))}>
            {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((id) => (
              <option key={id} value={id}>
                Level {id}
                {hasOverride(id) ? ' (edited)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name:&nbsp;
          <input
            type="text"
            value={editable.name}
            onChange={(e) => setEditable((prev) => (prev ? { ...cloneLevel(prev), name: e.target.value } : prev))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={editable.isBoss}
            onChange={(e) => setEditable((prev) => (prev ? { ...cloneLevel(prev), isBoss: e.target.checked } : prev))}
          />
          &nbsp;Boss stage
        </label>
      </div>

      <div className="editor-tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'tool-btn-active' : ''}`}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="editor-hint">{TOOLS.find((t) => t.id === tool)?.hint}</p>

      <div className="editor-canvas-wrap">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} onClick={handleClick} />
      </div>

      <div className="editor-actions">
        <button onClick={handleSave}>Save changes</button>
        <button onClick={handleResetToDefault} disabled={!overrideExists}>
          Reset to default
        </button>
        <button onClick={() => setShowJson((v) => !v)}>{showJson ? 'Hide' : 'Show'} level JSON</button>
        {message && <span className="editor-message">{message}</span>}
      </div>

      {showJson && (
        <div>
          <p className="editor-hint">
            Paste this into <code>components/rpg/data/level{levelId}.json</code> to make it the permanent stage,
            no browser save needed.
          </p>
          <textarea className="editor-json" readOnly value={JSON.stringify(editable, null, 2)} />
        </div>
      )}

      <div className="editor-lists">
        <div className="editor-list">
          <h3>Enemies ({editable.enemies.length})</h3>
          {editable.enemies.map((enemy, i) => (
            <div key={enemy.id} className="editor-list-row">
              <span>
                ({enemy.x}, {enemy.y})
              </span>
              <label>
                HP:
                <input
                  type="number"
                  min={1}
                  value={enemy.hp}
                  onChange={(e) => updateEnemyHp(i, Number(e.target.value))}
                />
              </label>
              <button onClick={() => removeEnemy(i)}>Remove</button>
            </div>
          ))}
          {editable.enemies.length === 0 && <p className="editor-empty">No enemies placed.</p>}
        </div>

        <div className="editor-list">
          <h3>Crystal path ({editable.crystalPath.length})</h3>
          {editable.crystalPath.map((pt, i) => (
            <div key={i} className="editor-list-row">
              <span>
                {i + 1}. ({pt.x}, {pt.y})
              </span>
              <button onClick={() => removeWaypoint(i)}>Remove</button>
            </div>
          ))}
          {editable.crystalPath.length > 0 && (
            <button className="editor-clear-path" onClick={clearWaypoints}>
              Clear path
            </button>
          )}
          {editable.crystalPath.length === 0 && <p className="editor-empty">No waypoints yet.</p>}
        </div>
      </div>
    </div>
  );
}
