// Profile columns added by later migrations. Routes ask for them, and if the database hasn't been
// migrated yet they quietly fall back to the original columns so sign-in and profiles keep working.
export const BASE_PUBLIC = 'id, nickname, avatar_color';
export const WITH_AVATAR = 'id, nickname, avatar_color, avatar_pixels';
export const PROFILE_PAGE_EXTRAS = 'avatar_pixels, last_seen_at, recent_characters, owned_characters, character_levels';

export async function selectWithFallback<R extends { error: unknown }>(run: (columns: string) => PromiseLike<R>, full: string, base: string): Promise<R & { upToDate: boolean }> {
  const first = await run(full);
  if (!first.error) return { ...first, upToDate: true };
  const second = await run(base);
  return { ...second, upToDate: false };
}

// How often "last online" is written; anything more often is skipped to save database writes.
export const LAST_SEEN_EVERY_MS = 60 * 1000;
export const MAX_RECENT_HEROES = 6;
