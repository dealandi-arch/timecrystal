export function validateNickname(nickname: unknown): string | null {
  if (typeof nickname !== 'string') return null;
  const trimmed = nickname.trim();
  if (!/^[A-Za-z0-9_\- ]{3,20}$/.test(trimmed)) return null;
  return trimmed;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return null;
  if (password.length < 6 || password.length > 72) return null;
  return password;
}

export function validateAvatarColor(color: unknown): string | null {
  if (typeof color !== 'string') return null;
  const match = /^#?([0-9a-fA-F]{6})$/.exec(color.trim());
  if (!match) return null;
  return `#${match[1].toLowerCase()}`;
}

export function generateProfileId(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}
