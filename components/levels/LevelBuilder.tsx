'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from '../profile/ProfileContext';
import TimeCrystalRPG from '../rpg/TimeCrystalRPG';
import { CUSTOM_ID_OFFSET, CUSTOM_LIMITS, CUSTOM_SIZE, type CustomMap, type CustomMode, emptyMap, toLevelDef, validateCustomLevel } from '../rpg/customLevels';

type Tool =
  | { kind: 'tile'; ch: string }
  | { kind: 'dark' }
  | { kind: 'start' }
  | { kind: 'enemy' }
  | { kind: 'crystal' }
  | { kind: 'erase' };

interface ToolDef {
  id: string;
  label: string;
  hint: string;
  tool: Tool;
  modes: CustomMode[];
}

const TOOLS: ToolDef[] = [
  { id: 'floor', label: '⬜ Floor', hint: 'Open ground', tool: { kind: 'tile', ch: '.' }, modes: ['2d', '3d'] },
  { id: 'wall', label: '🧱 Wall', hint: 'Blocks walking and shots', tool: { kind: 'tile', ch: '#' }, modes: ['2d', '3d'] },
  { id: 'secret', label: '❔ Secret', hint: 'Looks like a wall; the hero can walk through it', tool: { kind: 'tile', ch: '?' }, modes: ['2d', '3d'] },
  { id: 'h1', label: '▁ Height 1', hint: 'Raised ground, one level up', tool: { kind: 'tile', ch: '1' }, modes: ['3d'] },
  { id: 'h2', label: '▃ Height 2', hint: 'Two levels up', tool: { kind: 'tile', ch: '2' }, modes: ['3d'] },
  { id: 'h3', label: '▅ Height 3', hint: 'Three levels up', tool: { kind: 'tile', ch: '3' }, modes: ['3d'] },
  { id: 'a', label: '◢ Stairs 0→1', hint: 'Put between ground and height 1', tool: { kind: 'tile', ch: 'a' }, modes: ['3d'] },
  { id: 'b', label: '◢ Stairs 1→2', hint: 'Put between height 1 and height 2', tool: { kind: 'tile', ch: 'b' }, modes: ['3d'] },
  { id: 'c', label: '◢ Stairs 2→3', hint: 'Put between height 2 and height 3', tool: { kind: 'tile', ch: 'c' }, modes: ['3d'] },
  { id: 'ladder', label: '🪜 Ladder', hint: 'On the ground next to a ledge: climbs straight up', tool: { kind: 'tile', ch: 'L' }, modes: ['3d'] },
  { id: 'fence', label: '🚧 Fence', hint: 'Blocks walking, shots fly over, jump over it', tool: { kind: 'tile', ch: 'f' }, modes: ['3d'] },
  { id: 'dark', label: '🌑 Dark spot', hint: 'Click to toggle: enemies here stay hidden until you’re close', tool: { kind: 'dark' }, modes: ['3d'] },
  { id: 'start', label: '🧍 Start', hint: 'Where the hero begins', tool: { kind: 'start' }, modes: ['2d', '3d'] },
  { id: 'enemy', label: '👾 Enemy', hint: 'Click to place; click again to raise health', tool: { kind: 'enemy' }, modes: ['2d', '3d'] },
  { id: 'crystal', label: '💎 Crystal stop', hint: 'The crystal visits these in order', tool: { kind: 'crystal' }, modes: ['2d', '3d'] },
  { id: 'erase', label: '🧽 Clear', hint: 'Removes enemies and crystal stops, turns the tile back to floor', tool: { kind: 'erase' }, modes: ['2d', '3d'] },
];

const TILE_COLORS: Record<string, string> = {
  '#': '#334155',
  '.': '#1e293b',
  '?': '#4c1d95',
  '1': '#475569',
  '2': '#64748b',
  '3': '#94a3b8',
  a: '#57534e',
  b: '#78716c',
  c: '#a8a29e',
  L: '#a16207',
  f: '#92400e',
};
const TILE_MARK: Record<string, string> = { '1': '1', '2': '2', '3': '3', a: '◢', b: '◢', c: '◢', L: '🪜', f: '🚧', '?': '?' };

const draftKey = (mode: CustomMode) => `timeCrystalLevelDraft:${mode}`;

function setChar(row: string, x: number, ch: string) {
  return row.slice(0, x) + ch + row.slice(x + 1);
}

export default function LevelBuilder() {
  const router = useRouter();
  const { profile } = useProfile();
  const [mode, setMode] = useState<CustomMode | null>(null);
  const [map, setMap] = useState<CustomMap | null>(null);
  const [name, setName] = useState('');
  const [toolId, setToolId] = useState('wall');
  const [testing, setTesting] = useState(0); // >0 = test play (changes to restart it)
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const painting = useRef(false);

  // Keep a draft per mode in this browser.
  useEffect(() => {
    if (!mode || !map) return;
    try {
      window.localStorage.setItem(draftKey(mode), JSON.stringify({ name, map }));
    } catch {
      /* storage unavailable: no draft */
    }
  }, [mode, map, name]);

  function choose(next: CustomMode) {
    setMode(next);
    setToolId('wall');
    try {
      const draft = JSON.parse(window.localStorage.getItem(draftKey(next)) ?? 'null');
      if (draft?.map?.rows?.length === CUSTOM_SIZE[next].rows) {
        setMap(draft.map);
        setName(draft.name ?? '');
        return;
      }
    } catch {
      /* broken draft: start fresh */
    }
    setMap(emptyMap(next));
    setName('');
  }

  const problem = useMemo(() => (mode && map ? validateCustomLevel(name.trim().length >= CUSTOM_LIMITS.nameMin ? name : 'Untitled', mode, map) : null), [mode, map, name]);
  const nameProblem = name.trim().length < CUSTOM_LIMITS.nameMin ? `Give your level a name (${CUSTOM_LIMITS.nameMin}–${CUSTOM_LIMITS.nameMax} letters).` : null;

  if (!mode || !map) {
    return (
      <div className="builder-choose">
        <p>What kind of level do you want to build?</p>
        <div className="builder-modes">
          <button className="ability-card" onClick={() => choose('2d')}>
            <h2>2D</h2>
            <p>The classic top-down board, 15 × 10. Walls, secret passages, enemies and the crystal.</p>
          </button>
          <button className="ability-card" onClick={() => choose('3d')}>
            <h2>3D</h2>
            <p>A big 25 × 17 map to climb: heights, stairs, ladders, fences and dark spots, with limited vision and jumping.</p>
          </button>
        </div>
      </div>
    );
  }

  const tool = TOOLS.find((t) => t.id === toolId)?.tool ?? TOOLS[0].tool;
  const { cols, rows } = CUSTOM_SIZE[mode];

  function apply(x: number, y: number, click: boolean) {
    if (!map) return;
    const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
    const next: CustomMap = { ...map, rows: [...map.rows], dark: [...map.dark], enemies: [...map.enemies], crystalPath: [...map.crystalPath] };
    const removeThings = () => {
      next.enemies = next.enemies.filter((e) => e.x !== x || e.y !== y);
      next.crystalPath = next.crystalPath.filter((p) => p.x !== x || p.y !== y);
    };
    if (tool.kind === 'tile') {
      if (edge) return;
      next.rows[y] = setChar(next.rows[y], x, tool.ch);
      if (tool.ch === '#' || tool.ch === 'f') removeThings();
    } else if (tool.kind === 'dark') {
      if (edge || !click) return;
      next.dark[y] = setChar(next.dark[y], x, next.dark[y][x] === 'x' ? '.' : 'x');
    } else if (tool.kind === 'erase') {
      removeThings();
      if (!edge) next.rows[y] = setChar(next.rows[y], x, '.');
      next.dark[y] = setChar(next.dark[y], x, '.');
    } else if (!click) {
      return;
    } else if (tool.kind === 'start') {
      next.start = { x, y };
      next.enemies = next.enemies.filter((e) => e.x !== x || e.y !== y);
    } else if (tool.kind === 'enemy') {
      if (next.start.x === x && next.start.y === y) return;
      const at = next.enemies.find((e) => e.x === x && e.y === y);
      if (at) next.enemies = next.enemies.map((e) => (e === at ? { ...e, hp: e.hp >= CUSTOM_LIMITS.enemyHp ? 1 : e.hp + 1 } : e));
      else if (next.enemies.length < CUSTOM_LIMITS.enemies) next.enemies.push({ x, y, hp: 1 });
    } else if (tool.kind === 'crystal') {
      if (next.crystalPath.some((p) => p.x === x && p.y === y)) next.crystalPath = next.crystalPath.filter((p) => p.x !== x || p.y !== y);
      else if (next.crystalPath.length < CUSTOM_LIMITS.crystalStops) next.crystalPath.push({ x, y });
    }
    setMap(next);
  }

  async function publish() {
    if (!mode || !map) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch('/api/levels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), mode, map }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Publishing failed.');
      try {
        window.localStorage.removeItem(draftKey(mode));
      } catch {
        /* ignore */
      }
      router.push(`/levels/${data.id}`);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Publishing failed.');
      setPublishing(false);
    }
  }

  if (testing) {
    const level = toLevelDef(CUSTOM_ID_OFFSET, name.trim() || 'Test level', mode, map);
    return (
      <div>
        <div className="builder-bar">
          <button className="ability-btn" onClick={() => setTesting(0)}>
            ✎ Back to building
          </button>
          <span className="gacha-fine">Test play — no rewards.</span>
        </div>
        <TimeCrystalRPG
          key={testing}
          mode="custom"
          custom={{ levels: [level], rewards: false, finale: { title: 'Test Complete', text: 'Your level can be cleared. Go back to building to publish it.' } }}
        />
      </div>
    );
  }

  const enemyAt = new Map(map.enemies.map((e) => [`${e.x},${e.y}`, e.hp]));
  const crystalAt = new Map(map.crystalPath.map((p, i) => [`${p.x},${p.y}`, i + 1]));

  return (
    <div className="builder">
      <div className="builder-bar">
        <span className="view3d-tag">{mode.toUpperCase()}</span>
        <input className="builder-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Level name" maxLength={CUSTOM_LIMITS.nameMax} aria-label="Level name" />
        <button className="ability-btn" onClick={() => setTesting(Date.now())} disabled={!!problem}>
          ▶ Test play
        </button>
        <button className="ability-btn power-btn" onClick={publish} disabled={!!problem || !!nameProblem || !profile || publishing}>
          {publishing ? 'Publishing…' : '⬆ Publish'}
        </button>
        <button
          className="ability-btn story-skip"
          onClick={() => {
            if (window.confirm('Start over with an empty map?')) setMap(emptyMap(mode));
          }}
        >
          Start over
        </button>
        <button className="ability-btn story-skip" onClick={() => setMode(null)}>
          Switch 2D / 3D
        </button>
      </div>
      <p className={problem || nameProblem ? 'event-error' : 'event-ok'}>
        {problem ?? nameProblem ?? (profile ? 'Ready to publish!' : 'Ready! Sign in to publish it.')}
      </p>
      {publishError && <p className="event-error">{publishError}</p>}
      <div className="builder-tools" role="toolbar" aria-label="Building tools">
        {TOOLS.filter((t) => t.modes.includes(mode)).map((t) => (
          <button key={t.id} className={`builder-tool ${toolId === t.id ? 'on' : ''}`} title={t.hint} aria-pressed={toolId === t.id} onClick={() => setToolId(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="gacha-fine">{TOOLS.find((t) => t.id === toolId)?.hint}. Drag to paint tiles. Enemies {map.enemies.length}/{CUSTOM_LIMITS.enemies}, crystal stops {map.crystalPath.length}/{CUSTOM_LIMITS.crystalStops}.</p>
      <div
        className="builder-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        onPointerUp={() => (painting.current = false)}
        onPointerLeave={() => (painting.current = false)}
      >
        {map.rows.map((row, y) =>
          [...row].map((ch, x) => {
            const key = `${x},${y}`;
            const isStart = map.start.x === x && map.start.y === y;
            const hp = enemyAt.get(key);
            const stop = crystalAt.get(key);
            return (
              <button
                key={key}
                className={`builder-cell${map.dark[y][x] === 'x' ? ' dark' : ''}`}
                style={{ background: TILE_COLORS[ch] }}
                aria-label={`Tile ${x}, ${y}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  painting.current = true;
                  apply(x, y, true);
                }}
                onPointerEnter={() => painting.current && apply(x, y, false)}
              >
                {isStart ? '🧍' : hp ? <span className="builder-enemy">👾{hp > 1 ? hp : ''}</span> : stop ? <span className="builder-crystal">💎{stop}</span> : TILE_MARK[ch] ?? ''}
              </button>
            );
          })
        )}
      </div>
      {!profile && (
        <p className="gacha-fine">
          You can build and test without an account. <Link href="/">Sign in</Link> to publish to Public Levels.
        </p>
      )}
    </div>
  );
}
