'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Avatar from './Avatar';
import { AVATAR_COLORS, AVATAR_LENGTH, AVATAR_PALETTE, AVATAR_SIZE, EMPTY_PIXEL, PALETTE_KEYS, colorOf, emptyAvatar, isValidAvatar } from './avatarData';

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker';

interface AvatarEditorProps {
  nickname: string;
  color: string;
  pixels: string | null;
  onSave: (pixels: string | null, color: string) => Promise<string | null>; // resolves to an error message, or null
  onClose: () => void;
}

const CELL = 10; // editing canvas: 320×320
const MAX_UNDO = 40;

export default function AvatarEditor({ nickname, color: startColor, pixels: startPixels, onSave, onClose }: AvatarEditorProps) {
  const [pixels, setPixels] = useState<string[]>(() => (isValidAvatar(startPixels) ? startPixels : emptyAvatar()).split(''));
  const [color, setColor] = useState(startColor);
  const [ink, setInk] = useState('7');
  const [tool, setTool] = useState<Tool>('pencil');
  const [mirror, setMirror] = useState(false);
  const [grid, setGrid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const undoRef = useRef<string[][]>([]);
  const lastCell = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const size = AVATAR_SIZE * CELL;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    pixels.forEach((key, i) => {
      const fill = colorOf(key);
      if (!fill) return;
      ctx.fillStyle = fill;
      ctx.fillRect((i % AVATAR_SIZE) * CELL, Math.floor(i / AVATAR_SIZE) * CELL, CELL, CELL);
    });
    if (grid) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 1;
      for (let i = 1; i < AVATAR_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL + 0.5, 0);
        ctx.lineTo(i * CELL + 0.5, size);
        ctx.moveTo(0, i * CELL + 0.5);
        ctx.lineTo(size, i * CELL + 0.5);
        ctx.stroke();
      }
    }
    if (mirror) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.stroke();
    }
  }, [pixels, color, grid, mirror]);

  function remember() {
    undoRef.current.push(pixels);
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
  }

  function undo() {
    const previous = undoRef.current.pop();
    if (previous) setPixels(previous);
  }

  function cellAt(e: PointerEvent<HTMLCanvasElement>): number | null {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * AVATAR_SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * AVATAR_SIZE);
    if (x < 0 || y < 0 || x >= AVATAR_SIZE || y >= AVATAR_SIZE) return null;
    return y * AVATAR_SIZE + x;
  }

  function paint(next: string[], index: number, key: string) {
    next[index] = key;
    if (mirror) {
      const x = index % AVATAR_SIZE;
      next[index - x + (AVATAR_SIZE - 1 - x)] = key;
    }
  }

  // Draws every cell on the straight line between two cells, so quick strokes have no gaps.
  function stroke(from: number, to: number, key: string) {
    setPixels((current) => {
      const next = [...current];
      let x0 = from % AVATAR_SIZE, y0 = Math.floor(from / AVATAR_SIZE);
      const x1 = to % AVATAR_SIZE, y1 = Math.floor(to / AVATAR_SIZE);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        paint(next, y0 * AVATAR_SIZE + x0, key);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return next;
    });
  }

  function fill(start: number, key: string) {
    setPixels((current) => {
      const target = current[start];
      if (target === key) return current;
      const next = [...current];
      const stack = [start];
      while (stack.length) {
        const i = stack.pop() as number;
        if (next[i] !== target) continue;
        next[i] = key;
        const x = i % AVATAR_SIZE;
        if (x > 0) stack.push(i - 1);
        if (x < AVATAR_SIZE - 1) stack.push(i + 1);
        if (i >= AVATAR_SIZE) stack.push(i - AVATAR_SIZE);
        if (i < AVATAR_LENGTH - AVATAR_SIZE) stack.push(i + AVATAR_SIZE);
      }
      return next;
    });
  }

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    const cell = cellAt(e);
    if (cell === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'picker') {
      if (pixels[cell] !== EMPTY_PIXEL) setInk(pixels[cell]);
      setTool('pencil');
      return;
    }
    remember();
    if (tool === 'fill') {
      fill(cell, ink);
      return;
    }
    lastCell.current = cell;
    stroke(cell, cell, tool === 'eraser' ? EMPTY_PIXEL : ink);
  }

  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    if (lastCell.current === null || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const cell = cellAt(e);
    if (cell === null || cell === lastCell.current) return;
    stroke(lastCell.current, cell, tool === 'eraser' ? EMPTY_PIXEL : ink);
    lastCell.current = cell;
  }

  async function save(remove = false) {
    setBusy(true);
    setError(null);
    const joined = pixels.join('');
    const message = await onSave(remove || !/[^.]/.test(joined) ? null : joined, color);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  const preview = pixels.join('');
  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="avatar-editor" role="dialog" aria-modal="true" aria-label="Avatar creator" onClick={(e) => e.stopPropagation()}>
        <h2>Avatar Creator</h2>
        <div className="avatar-editor-body">
          <div>
            <canvas
              ref={canvasRef}
              className="avatar-editor-canvas"
              width={AVATAR_SIZE * CELL}
              height={AVATAR_SIZE * CELL}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={() => (lastCell.current = null)}
              onPointerCancel={() => (lastCell.current = null)}
            />
            <div className="avatar-tools" role="toolbar" aria-label="Tools">
              {(['pencil', 'eraser', 'fill', 'picker'] as Tool[]).map((t) => (
                <button key={t} className={tool === t ? 'active' : ''} onClick={() => setTool(t)}>
                  {t === 'pencil' ? '✏ Pencil' : t === 'eraser' ? '⌫ Eraser' : t === 'fill' ? '🪣 Fill' : '⦿ Pick colour'}
                </button>
              ))}
              <button className={mirror ? 'active' : ''} onClick={() => setMirror(!mirror)}>⇋ Mirror</button>
              <button className={grid ? 'active' : ''} onClick={() => setGrid(!grid)}># Grid</button>
              <button onClick={undo} disabled={!undoRef.current.length}>↶ Undo</button>
              <button onClick={() => { remember(); setPixels(emptyAvatar().split('')); }}>Clear</button>
            </div>
          </div>
          <div className="avatar-side">
            <p className="avatar-label">Colours</p>
            <div className="avatar-palette">
              {AVATAR_PALETTE.map((hex, i) => (
                <button
                  key={hex}
                  className={`avatar-swatch${ink === PALETTE_KEYS[i] && tool !== 'eraser' ? ' selected' : ''}`}
                  style={{ background: hex }}
                  onClick={() => { setInk(PALETTE_KEYS[i]); if (tool === 'eraser' || tool === 'picker') setTool('pencil'); }}
                  aria-label={`Colour ${hex}`}
                />
              ))}
            </div>
            <p className="avatar-label">Background (your avatar colour)</p>
            <div className="avatar-palette">
              {AVATAR_COLORS.map((hex) => (
                <button key={hex} className={`avatar-swatch${color === hex ? ' selected' : ''}`} style={{ background: hex }} onClick={() => setColor(hex)} aria-label={`Background ${hex}`} />
              ))}
            </div>
            <p className="avatar-label">Preview</p>
            <div className="avatar-previews">
              <Avatar nickname={nickname} color={color} pixels={preview} size={64} />
              <Avatar nickname={nickname} color={color} pixels={preview} size={32} />
              <Avatar nickname={nickname} color={color} pixels={null} size={32} />
              <small>Without a drawing, people see your initial.</small>
            </div>
          </div>
        </div>
        {error && <p className="gacha-error">{error}</p>}
        <div className="avatar-actions">
          <button className="ability-btn story-skip" onClick={() => save(true)} disabled={busy}>Use my initial instead</button>
          <button className="ability-btn story-skip" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ability-btn" onClick={() => save()} disabled={busy}>{busy ? 'Saving…' : 'Save avatar'}</button>
        </div>
      </div>
    </div>
  );
}
