// Profile columns added by later migrations. Routes ask for them, and if the database hasn't been
// migrated yet they quietly fall back to the original columns so sign-in and profiles keep working.
export const BASE_PUBLIC = 'id, nickname, avatar_color';
export const WITH_AVATAR = 'id, nickname, avatar_color, avatar_pixels';
export const WITH_NAME = 'id, nickname, avatar_color, avatar_pixels, display_name';
export const PROFILE_PAGE_EXTRAS = 'avatar_pixels, last_seen_at, recent_characters, owned_characters, character_levels';

// Tries each column list in turn (newest first) until the database accepts one.
export async function selectWithFallback<R extends { error: unknown }>(run: (columns: string) => PromiseLike<R>, full: string, ...older: string[]): Promise<R & { upToDate: boolean }> {
  let result = await run(full);
  if (!result.error) return { ...result, upToDate: true };
  for (const columns of older) {
    result = await run(columns);
    if (!result.error) break;
  }
  return { ...result, upToDate: false };
}

// The name everyone sees: the display name if set, otherwise the username.
export function shownNameOf(row: { nickname: string; display_name?: string | null } | null | undefined): string {
  return row?.display_name?.trim() || row?.nickname || 'Unknown';
}

// How often "last online" is written; anything more often is skipped to save database writes.
export const LAST_SEEN_EVERY_MS = 60 * 1000;
export const MAX_RECENT_HEROES = 6;
