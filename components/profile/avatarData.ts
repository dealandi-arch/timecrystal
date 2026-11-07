// 32×32 pixel avatars, shared by the editor, the display component and the API (no browser APIs here).
// An avatar is stored as 1024 characters, one per pixel, row by row: '.' is see-through (the player's
// avatar colour shows behind it) and '0'-'9', 'a'-'v' pick one of the 32 palette colours.

export const AVATAR_SIZE = 32;
export const AVATAR_LENGTH = AVATAR_SIZE * AVATAR_SIZE;
export const EMPTY_PIXEL = '.';

export const AVATAR_PALETTE = [
  '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa',
  '#291814', '#111d35', '#422136', '#125359', '#742f29', '#49333b', '#a28879', '#f3ef7d',
  '#be1250', '#ff6c24', '#a8e72e', '#00b543', '#065ab5', '#754665', '#ff6e59', '#ff9d81',
];

export const PALETTE_KEYS = '0123456789abcdefghijklmnopqrstuv';

// Background colours players pick at sign-up; the avatar sits on top of it.
export const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#facc15', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
];

const AVATAR_PATTERN = new RegExp(`^[.${PALETTE_KEYS}]{${AVATAR_LENGTH}}$`);

export function isValidAvatar(pixels: unknown): pixels is string {
  return typeof pixels === 'string' && AVATAR_PATTERN.test(pixels) && /[^.]/.test(pixels);
}

export function emptyAvatar(): string {
  return EMPTY_PIXEL.repeat(AVATAR_LENGTH);
}

export function colorOf(key: string): string | null {
  const index = PALETTE_KEYS.indexOf(key);
  return index >= 0 ? AVATAR_PALETTE[index] : null;
}
