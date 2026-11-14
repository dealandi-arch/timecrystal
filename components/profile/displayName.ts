// Display names (shared by the client and the server; no React, no browser APIs).
// Your nickname from sign-up is your permanent username (used to log in, shown as @username).
// The display name is what everyone sees. Changing it is free, but then it's locked for 5 days.

export const NAME_CHANGE_DAYS = 5;
export const NAME_CHANGE_COOLDOWN_MS = NAME_CHANGE_DAYS * 24 * 60 * 60 * 1000;

// Letters (any language), numbers, spaces and a few symbols; 3 to 20 characters.
export function validateDisplayName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} _\-.'!?]{3,20}$/u.test(trimmed)) return null;
  return trimmed;
}

// When this player may change their display name again (null = now).
export function nextNameChange(changedAt: string | null | undefined, now = Date.now()): number | null {
  if (!changedAt) return null;
  const next = new Date(changedAt).getTime() + NAME_CHANGE_COOLDOWN_MS;
  return Number.isFinite(next) && next > now ? next : null;
}

// The name to show for someone: their display name, or their username if they haven't set one.
export function shownName(p: { nickname: string; displayName?: string | null }): string {
  return p.displayName?.trim() || p.nickname;
}
