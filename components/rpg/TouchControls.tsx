'use client';

import { useRef, useState, type PointerEvent } from 'react';

// On-screen controls for phones and tablets (shown by CSS only on touch devices).
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

const DEAD_ZONE = 0.15; // fraction of the pad's width around the centre that means "not moving"

export default function TouchControls({ onPress, onRelease, onToggleWeapon, weaponName, weaponColor, skillName, skillReady, skillWait, onSkill, onJump }: TouchControlsProps) {
  const [dir, setDir] = useState<Direction | null>(null);
  const [attacking, setAttacking] = useState(false);
  const dirRef = useRef<Direction | null>(null);

  function setDirection(next: Direction | null) {
    if (next === dirRef.current) return;
    if (dirRef.current) onRelease(dirRef.current);
    if (next) onPress(next);
    dirRef.current = next;
    setDir(next);
  }

  // The whole pad works like a joystick, so a thumb can slide between directions.
  function steer(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
    const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
    if (Math.hypot(dx, dy) < DEAD_ZONE) setDirection(null);
    else if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 'arrowright' : 'arrowleft');
    else setDirection(dy > 0 ? 'arrowdown' : 'arrowup');
  }

  return (
    <div className="touch-controls" onContextMenu={(e) => e.preventDefault()}>
      <div
        className="touch-pad"
        role="group"
        aria-label="Move"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          steer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) steer(e);
        }}
        onPointerUp={() => setDirection(null)}
        onPointerCancel={() => setDirection(null)}
      >
        <span className={`touch-arrow up ${dir === 'arrowup' ? 'on' : ''}`}>▲</span>
        <span className={`touch-arrow left ${dir === 'arrowleft' ? 'on' : ''}`}>◀</span>
        <span className={`touch-arrow right ${dir === 'arrowright' ? 'on' : ''}`}>▶</span>
        <span className={`touch-arrow down ${dir === 'arrowdown' ? 'on' : ''}`}>▼</span>
      </div>
      <div className="touch-actions">
        {skillName && onSkill && (
          <button type="button" className="touch-skill" disabled={!skillReady} aria-label={`Use skill: ${skillName}`} onClick={onSkill}>
            ✦ {skillName}{skillWait ? ` ${skillWait}s` : ''}
          </button>
        )}
        {onJump && (
          <button type="button" className="touch-jump" aria-label="Jump" onClick={onJump}>
            ⤒ Jump
          </button>
        )}
        <button
          type="button"
          className="touch-weapon"
          style={{ borderColor: weaponColor }}
          aria-label={`Switch weapon, current: ${weaponName}`}
          onClick={onToggleWeapon}
        >
          ⇄ {weaponName}
        </button>
        <button
          type="button"
          className={`touch-attack ${attacking ? 'on' : ''}`}
          aria-label="Attack"
          onPointerDown={() => {
            setAttacking(true);
            onPress(' ');
          }}
          onPointerUp={() => {
            setAttacking(false);
            onRelease(' ');
          }}
          onPointerCancel={() => {
            setAttacking(false);
            onRelease(' ');
          }}
          onPointerLeave={() => {
            setAttacking(false);
            onRelease(' ');
          }}
        >
          ⚔
        </button>
      </div>
    </div>
  );
}
