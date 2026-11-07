'use client';

import { useEffect, useRef } from 'react';
import { AVATAR_SIZE, colorOf, isValidAvatar } from './avatarData';

interface AvatarProps {
  nickname: string;
  color: string;
  pixels?: string | null;
  size?: number; // displayed size in px
}

// A player's 32×32 pixel avatar on their avatar colour, or the first letter of their name if they haven't drawn one.
export default function Avatar({ nickname, color, pixels, size = 32 }: AvatarProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawn = isValidAvatar(pixels);

  useEffect(() => {
    if (!drawn) return;
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !pixels) return;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    for (let i = 0; i < pixels.length; i++) {
      const fill = colorOf(pixels[i]);
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(i % AVATAR_SIZE, Math.floor(i / AVATAR_SIZE), 1, 1);
    }
  }, [drawn, pixels, color]);

  const style = { width: size, height: size };
  if (drawn) {
    return <canvas ref={ref} className="avatar" width={AVATAR_SIZE} height={AVATAR_SIZE} style={style} role="img" aria-label={`${nickname}'s avatar`} />;
  }
  const letter = (nickname.trim()[0] ?? '?').toUpperCase();
  return (
    <span className="avatar avatar-letter" style={{ ...style, background: color, fontSize: size * 0.5 }} role="img" aria-label={`${nickname}'s avatar`}>
      {letter}
    </span>
  );
}
