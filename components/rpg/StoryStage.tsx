'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SoundEngine } from './audio';
import { type Particle, drawParticles, spawnBurst, updateParticles } from './particles';
import {
  type ActorId,
  type Appearance,
  type CharacterDef,
  FLOOR_A,
  FLOOR_B,
  type Look,
  type Palette,
  WALL,
  getActorLook,
  getCharacterLook,
  getSpriteCanvas
} from './pixelArt';
import { SPEAKER_NAMES, type Speaker, type StoryChapter, VILLAINS, buildChapter, getNemesis } from './story';

const W = 720;
const H = 264;
const TILE = 48;
const SPRITE_H = 96;
const FEET_Y = 232;
const HERO_X = 150;
const OTHER_X = 570;
const ENTER_S = 0.55;
const CHARS_PER_S = 48;
const AUTO_HOLD_MS = 1400;
const AUTO_HOLD_PER_CHAR_MS = 18;

export interface StageTheme {
  floorAPalette: Palette;
  floorBPalette: Palette;
  wallPalette: Palette;
}

interface StoryStageProps {
  chapterIndex: number | 'epilogue';
  hero: CharacterDef;
  appearance: Appearance;
  theme: StageTheme;
  sound: SoundEngine;
  onAppearanceChange: (a: Appearance) => void;
  onDone: () => void;
  doneLabel: string;
  // Animation mode: lines advance by themselves after a short pause.
  autoPlay?: boolean;
}

function actorFor(speaker: Speaker, nemesis: ActorId): ActorId | null {
  if (speaker === 'oren' || speaker === 'guardian') return speaker;
  if (speaker === 'nemesis') return nemesis;
  return null;
}

// Who stands opposite the hero on a given line: the latest non-hero speaker so far.
// Oren may already be waiting on stage before speaking; villains always make an entrance.
function rightActorAt(chapter: StoryChapter, index: number, nemesis: ActorId): ActorId | null {
  for (let i = index; i >= 0; i--) {
    const a = actorFor(chapter.lines[i].speaker, nemesis);
    if (a) return a;
  }
  for (let i = index + 1; i < chapter.lines.length; i++) {
    const a = actorFor(chapter.lines[i].speaker, nemesis);
    if (a) return a === 'oren' ? a : null;
  }
  return null;
}

function drawDiamond(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, glow: number) {
  c.beginPath();
  c.moveTo(x, y - size);
  c.lineTo(x + size * 0.75, y);
  c.lineTo(x, y + size);
  c.lineTo(x - size * 0.75, y);
  c.closePath();
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = glow;
  c.fill();
  c.shadowBlur = 0;
}

export default function StoryStage({ chapterIndex, hero, appearance, theme, sound, onAppearanceChange, onDone, doneLabel, autoPlay = false }: StoryStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const nemesis = getNemesis(hero.id);
  const chapter = useMemo(() => buildChapter(chapterIndex, hero.id) ?? { title: '', lines: [{ speaker: 'narrator' as const, text: '…' }] }, [chapterIndex, hero.id]);

  const line = chapter.lines[index];
  const text = line.text.split('{name}').join(hero.name);
  const typing = shown < text.length;
  const isLast = index === chapter.lines.length - 1;
  const speakerName =
    line.speaker === 'hero' ? hero.name
    : line.speaker === 'nemesis' ? VILLAINS[nemesis].name
    : line.speaker === 'narrator' ? ''
    : SPEAKER_NAMES[line.speaker];

  // Everything the animation loop reads lives in this ref so it never needs restarting.
  const live = useRef({
    appearance,
    index,
    textLen: text.length,
    lineStart: performance.now(),
    heroEnter: 0,
    right: null as ActorId | null,
    rightEnter: 0,
    shake: 0,
    flash: 0,
    particles: [] as Particle[],
    shownChars: 0,
    typedAt: 0,
    autoPlay,
  });
  live.current.appearance = appearance;
  live.current.autoPlay = autoPlay;

  // New line: reset typewriter and trigger entrances.
  useEffect(() => {
    const s = live.current;
    s.index = index;
    s.textLen = text.length;
    s.lineStart = performance.now();
    s.shownChars = 0;
    s.typedAt = 0;
    setShown(0);
    const nextRight = rightActorAt(chapter, index, nemesis);
    if (nextRight !== s.right) {
      s.right = nextRight;
      s.rightEnter = 0;
      if (nextRight && nextRight !== 'oren') {
        s.shake = 0.45;
        s.flash = 0.8;
        spawnBurst(s.particles, OTHER_X, FEET_Y - SPRITE_H / 2, ['#7f1d1d', '#dc2626', '#a855f7', '#0b1330'], 40, 260, 40);
        sound.playPlayerHurt();
      } else if (nextRight === 'oren') {
        spawnBurst(s.particles, OTHER_X, FEET_Y - SPRITE_H / 2, ['#67e8f9', '#a5f3fc', '#fff'], 24, 160, -30);
        sound.playSecretFound();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, chapter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const raw = canvas.getContext('2d');
    if (!raw) return;
    const ctx: CanvasRenderingContext2D = raw;
    ctx.imageSmoothingEnabled = false;
    const s = live.current;
    let last = performance.now();
    let raf = 0;

    function spriteFor(id: 'hero' | ActorId): { canvas: HTMLCanvasElement; look: Look } {
      const look = id === 'hero' ? getCharacterLook(hero, s.appearance) : getActorLook(id, s.appearance, hero);
      const key = id === 'hero' ? `stage:hero:${hero.id}` : id === 'mirror' ? `stage:mirror:${hero.id}` : `stage:${id}`;
      const ps = SPRITE_H / look.sprite.length;
      return { canvas: getSpriteCanvas(`${key}:${s.appearance}`, look.sprite, look.palette, ps), look };
    }

    function drawActor(id: 'hero' | ActorId, x: number, active: boolean, dim: boolean, time: number, talking: boolean) {
      const { canvas: sprite } = spriteFor(id);
      const villain = id !== 'hero' && id !== 'oren';
      const bob = Math.sin(time * (active ? 5 : 2.5) + x) * (active ? 3 : 1.5);
      const hop = talking ? Math.abs(Math.sin(time * 18)) * 3 : 0;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(x, FEET_Y + 2, 34, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = dim ? 0.45 : 1;
      if (villain) {
        ctx.shadowColor = id === 'guardian' ? '#dc2626' : '#a855f7';
        ctx.shadowBlur = 18 + Math.sin(time * 4) * 6;
      }
      ctx.drawImage(sprite, Math.round(x - SPRITE_H / 2), Math.round(FEET_Y - SPRITE_H + bob - hop));
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = now / 1000;

      s.heroEnter = Math.min(1, s.heroEnter + dt / ENTER_S);
      s.rightEnter = Math.min(1, s.rightEnter + dt / ENTER_S);
      if (s.shake > 0) s.shake -= dt;
      if (s.flash > 0) s.flash -= dt * 2;
      const chars = Math.min(s.textLen, Math.floor(((now - s.lineStart) / 1000) * CHARS_PER_S));
      if (chars !== s.shownChars) {
        s.shownChars = chars;
        setShown(chars);
      }
      const typingNow = chars < s.textLen;
      if (!typingNow && s.typedAt === 0) s.typedAt = now;
      if (s.autoPlay && s.typedAt > 0 && now - s.typedAt > AUTO_HOLD_MS + s.textLen * AUTO_HOLD_PER_CHAR_MS) {
        s.typedAt = Infinity; // fire once per line
        advanceRef.current();
      }
      const speaker = chapter.lines[s.index].speaker;

      ctx.save();
      ctx.clearRect(0, 0, W, H);
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake * 22, (Math.random() - 0.5) * s.shake * 22);

      // Room: two rows of wall, then floor.
      const wall = getSpriteCanvas(`stageWall:${theme.wallPalette.m}`, WALL, theme.wallPalette, TILE / 12);
      const floorA = getSpriteCanvas(`stageFloorA:${theme.floorAPalette.a}`, FLOOR_A, theme.floorAPalette, TILE / 12);
      const floorB = getSpriteCanvas(`stageFloorB:${theme.floorBPalette.a}`, FLOOR_B, theme.floorBPalette, TILE / 12);
      for (let ty = 0; ty * TILE < H; ty++) {
        for (let tx = 0; tx * TILE < W; tx++) {
          const img = ty < 2 ? wall : (tx + ty) % 2 === 0 ? floorA : floorB;
          ctx.drawImage(img, tx * TILE, ty * TILE);
        }
      }
      const shade = ctx.createLinearGradient(0, 0, 0, H);
      shade.addColorStop(0, 'rgba(2,6,23,0.55)');
      shade.addColorStop(0.45, 'rgba(2,6,23,0.1)');
      shade.addColorStop(1, 'rgba(2,6,23,0.6)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);

      // Floating shard
      const narrator = speaker === 'narrator';
      const cy = 92 + Math.sin(time * 2) * 6;
      drawDiamond(ctx, W / 2, cy, narrator ? 20 : 15, '#67e8f9', narrator ? 30 + Math.sin(time * 5) * 10 : 14);
      if (Math.random() < (narrator ? 0.5 : 0.15)) {
        spawnBurst(s.particles, W / 2 + (Math.random() - 0.5) * 30, cy, ['#67e8f9', '#a5f3fc', '#fff'], 1, 30, -20);
      }

      // Actors
      const heroX = -60 + (HERO_X + 60) * (1 - Math.pow(1 - s.heroEnter, 3));
      drawActor('hero', heroX, speaker === 'hero', speaker !== 'hero', time, speaker === 'hero' && typingNow);
      if (s.right) {
        const t = 1 - Math.pow(1 - s.rightEnter, 3);
        const rx = W + 60 - (W + 60 - OTHER_X) * t;
        const speaking = actorFor(speaker, nemesis) === s.right;
        drawActor(s.right, rx, speaking, !speaking, time, speaking && typingNow);
        if (s.right !== 'oren' && Math.random() < 0.2) {
          spawnBurst(s.particles, rx + (Math.random() - 0.5) * 60, FEET_Y - 10, ['#7f1d1d', '#a855f7'], 1, 20, -60);
        }
      }

      updateParticles(s.particles, dt);
      drawParticles(ctx, s.particles);

      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, s.flash) * 0.6})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [chapter, hero, nemesis, theme]);

  function advance() {
    sound.resume();
    if (typing) {
      live.current.lineStart = -1e9; // finish typing on the next frame
      setShown(text.length);
      return;
    }
    if (isLast) onDone();
    else {
      sound.playMenuClick();
      setIndex(index + 1);
    }
  }

  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Focused buttons handle their own Space/Enter
      if (e.target instanceof HTMLButtonElement) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        advanceRef.current();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="ability-select story-scene">
      <h1>{chapter.title}</h1>
      <div className="look-toggle" role="group" aria-label="Character look">
        <button className={appearance === 'original' ? 'active' : ''} onClick={() => onAppearanceChange('original')}>
          Original
        </button>
        <button className={appearance === 'human' ? 'active' : ''} onClick={() => onAppearanceChange('human')}>
          Human
        </button>
      </div>
      <div className="story-stage" onClick={advance}>
        <canvas ref={canvasRef} width={W} height={H} />
        <div className={`story-box story-${line.speaker}`}>
          <div className="story-text">
            {speakerName && <div className="story-speaker">{speakerName}</div>}
            <p>
              {text.slice(0, shown)}
              <span className="story-hidden">{text.slice(shown)}</span>
            </p>
          </div>
        </div>
      </div>
      <div className="story-actions">
        <span className="story-progress">{index + 1} / {chapter.lines.length}</span>
        <button className="ability-btn story-skip" onClick={onDone}>Skip</button>
        <button className="ability-btn" onClick={advance}>{typing ? '…' : isLast ? doneLabel : 'Next ▸'}</button>
      </div>
      <p className="story-hint">Click, Space or Enter to continue</p>
    </div>
  );
}
