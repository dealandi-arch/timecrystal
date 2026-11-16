'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';

// On-screen controls for phones and tablets (shown by CSS only on touch devices), made for two hands:
// - Left side: a floating joystick. Put your thumb down anywhere there and drag; the stick appears
//   under your thumb and follows it if you drag past the edge.
// - Right side: the fire zone. Hold anywhere on it to attack, with the weapon, skill and jump buttons
//   close by, and an auto-fire switch for one-handed play.
// They press the same keys the keyboard does, so the game loop treats both alike.

type Direction = 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright';

interface TouchControlsProps {
  onPress: (key: string) => void;
  onRelease: (key: string) => void;
  onToggleWeapon: () => void;
  weaponName: string;
  weaponColor: string;
  skillName?: string;
  skillReady?: boolean;
  skillWait?: number;
  onSkill?: () => void;
  onJump?: () => void;
}

const STICK_TRAVEL = 46; // px the knob can move from the centre of the stick
const DEAD_ZONE = 12; // px of drag before the hero starts moving
const AUTO_FIRE_KEY = 'timeCrystalAutoFire';

interface Stick {
  baseX: number; // where the stick sits, relative to the joystick zone
  baseY: number;
  knobX: number; // knob offset from the base
  knobY: number;
}

export default function TouchControls({ onPress, onRelease, onToggleWeapon, weaponName, weaponColor, skillName, skillReady, skillWait, onSkill, onJump }: TouchControlsProps) {
  const [dir, setDir] = useState<Direction | null>(null);
  const [stick, setStick] = useState<Stick | null>(null);
  const [firing, setFiring] = useState(false);
  const [autoFire, setAutoFire] = useState(false);
  const dirRef = useRef<Direction | null>(null);
  const stickPointer = useRef<number | null>(null);
  const firePointers = useRef(new Set<number>());
  const base = useRef({ x: 0, y: 0 });
  const fireHeld = useRef(false);

  function setDirection(next: Direction | null) {
    if (next === dirRef.current) return;
    if (dirRef.current) onRelease(dirRef.current);
    if (next) onPress(next);
    dirRef.current = next;
    setDir(next);
  }

  // Holds the attack key while a finger is on the fire zone, or all the time with auto-fire on.
  function updateFire(auto = autoFire) {
    const want = auto || firePointers.current.size > 0;
    if (want === fireHeld.current) return;
    fireHeld.current = want;
    if (want) onPress(' ');
    else onRelease(' ');
    setFiring(want);
  }

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AUTO_FIRE_KEY) === 'on';
      setAutoFire(saved);
      if (saved) updateFire(true);
    } catch {
      /* no storage: auto-fire starts off */
    }
    // Let go of everything when the controls go away (level won, page left).
    return () => {
      if (dirRef.current) onRelease(dirRef.current);
      if (fireHeld.current) onRelease(' ');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAutoFire() {
    const next = !autoFire;
    setAutoFire(next);
    try {
      window.localStorage.setItem(AUTO_FIRE_KEY, next ? 'on' : 'off');
    } catch {
      /* not remembered */
    }
    updateFire(next);
  }

  // ----- joystick -----
  function local(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function steer(x: number, y: number) {
    let dx = x - base.current.x;
    let dy = y - base.current.y;
    const dist = Math.hypot(dx, dy);
    // Past the edge: the stick slides along with the thumb, so you never run out of room.
    if (dist > STICK_TRAVEL) {
      base.current = { x: x - (dx / dist) * STICK_TRAVEL, y: y - (dy / dist) * STICK_TRAVEL };
      dx = (dx / dist) * STICK_TRAVEL;
      dy = (dy / dist) * STICK_TRAVEL;
    }
    setStick({ baseX: base.current.x, baseY: base.current.y, knobX: dx, knobY: dy });
    if (dist < DEAD_ZONE) setDirection(null);
    else if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 'arrowright' : 'arrowleft');
    else setDirection(dy > 0 ? 'arrowdown' : 'arrowup');
  }

  function stickDown(e: PointerEvent<HTMLDivElement>) {
    if (stickPointer.current !== null) return;
    stickPointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    base.current = p;
    steer(p.x, p.y);
  }

  function stickMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== stickPointer.current) return;
    const p = local(e);
    steer(p.x, p.y);
  }

  function stickUp(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== stickPointer.current) return;
    stickPointer.current = null;
    setStick(null);
    setDirection(null);
  }

  // ----- fire zone -----
  function fireDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button:not(.touch-attack)')) return; // the other buttons do their own thing
    e.currentTarget.setPointerCapture(e.pointerId);
    firePointers.current.add(e.pointerId);
    updateFire();
  }

  function fireUp(e: PointerEvent<HTMLDivElement>) {
    if (!firePointers.current.delete(e.pointerId)) return;
    updateFire();
  }

  return (
    <div className="touch-controls" onContextMenu={(e) => e.preventDefault()}>
      <div
        className={`touch-stick-zone${stick ? ' active' : ''}`}
        role="group"
        aria-label="Move: drag anywhere here"
        onPointerDown={stickDown}
        onPointerMove={stickMove}
        onPointerUp={stickUp}
        onPointerCancel={stickUp}
      >
        <div
          className="touch-stick-base"
          style={stick ? { left: stick.baseX, top: stick.baseY } : undefined}
          data-dir={dir ?? ''}
        >
          <span className={`touch-arrow up ${dir === 'arrowup' ? 'on' : ''}`}>▲</span>
          <span className={`touch-arrow left ${dir === 'arrowleft' ? 'on' : ''}`}>◀</span>
          <span className={`touch-arrow right ${dir === 'arrowright' ? 'on' : ''}`}>▶</span>
          <span className={`touch-arrow down ${dir === 'arrowdown' ? 'on' : ''}`}>▼</span>
          <div className="touch-stick-knob" style={stick ? { transform: `translate(${stick.knobX}px, ${stick.knobY}px)` } : undefined} />
        </div>
        {!stick && <span className="touch-zone-hint">Drag to move</span>}
      </div>

      <div className={`touch-fire-zone${firing ? ' firing' : ''}`} role="group" aria-label="Attack: hold anywhere here" onPointerDown={fireDown} onPointerUp={fireUp} onPointerCancel={fireUp}>
        <div className="touch-buttons">
          {skillName && onSkill && (
            <button type="button" className="touch-skill" disabled={!skillReady} aria-label={`Use skill: ${skillName}`} onClick={onSkill}>
              ✦ {skillName}
              {skillWait ? ` ${skillWait}s` : ''}
            </button>
          )}
          <button type="button" className="touch-weapon" style={{ borderColor: weaponColor }} aria-label={`Switch weapon, current: ${weaponName}`} onClick={onToggleWeapon}>
            ⇄ {weaponName}
          </button>
          {onJump && (
            <button type="button" className="touch-jump" aria-label="Jump" onClick={onJump}>
              ⤒ Jump
            </button>
          )}
          <button type="button" className={`touch-autofire${autoFire ? ' on' : ''}`} aria-pressed={autoFire} onClick={toggleAutoFire}>
            {autoFire ? '🔥 Auto-fire on' : 'Auto-fire off'}
          </button>
        </div>
        <button type="button" className={`touch-attack ${firing ? 'on' : ''}`} aria-label="Attack (hold)" tabIndex={-1}>
          ⚔
        </button>
        {!firing && <span className="touch-zone-hint">Hold to attack</span>}
      </div>
    </div>
  );
}
