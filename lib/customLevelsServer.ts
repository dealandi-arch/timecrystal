import { NextResponse } from 'next/server';
import { getSupabase } from './supabase';
import { selectWithFallback } from './profileFields';
import { CUSTOM_ID_OFFSET, type CustomLevelInfo, type CustomMap, type CustomMode } from '../components/rpg/customLevels';

type Row = {
  id: number;
  name: string;
  mode: CustomMode;
  data: CustomMap;
  plays: number;
  created_at: string;
  author_id: string;
  verified_at?: string | null;
  verify_time_ms?: number | null;
  profiles?: { nickname: string; display_name?: string | null } | { nickname: string; display_name?: string | null }[] | null;
};

export const LEVEL_COLUMNS = 'id, name, mode, data, plays, created_at, author_id, verified_at, verify_time_ms, profiles ( nickname, display_name )';
// Before the display-name columns exist.
export const LEVEL_COLUMNS_NO_NAME = 'id, name, mode, data, plays, created_at, author_id, verified_at, verify_time_ms, profiles ( nickname )';

export function toInfo(row: Row): CustomLevelInfo {
  const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    map: row.data,
    plays: row.plays,
    createdAt: row.created_at,
    authorId: row.author_id,
    author: author?.display_name?.trim() || author?.nickname || 'Unknown',
    verifiedAt: row.verified_at ?? null,
    verifyTimeMs: row.verify_time_ms ?? null,
  };
}

export async function loadCustomLevel(id: number): Promise<CustomLevelInfo | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  const { data, error } = await selectWithFallback((columns) => getSupabase().from('custom_levels').select(columns).eq('id', id).maybeSingle(), LEVEL_COLUMNS, LEVEL_COLUMNS_NO_NAME);
  if (error || !data) return null;
  return toInfo(data as unknown as Row);
}

// A public level's World's Best list uses its id above CUSTOM_ID_OFFSET. Runs count on verified
// levels, and on your own level while you're verifying it.
export async function customLevelForRuns(levelId: number, profileId: string | null): Promise<CustomLevelInfo | null> {
  if (!Number.isInteger(levelId) || levelId <= CUSTOM_ID_OFFSET) return null;
  const level = await loadCustomLevel(levelId - CUSTOM_ID_OFFSET);
  if (!level) return null;
  return level.verifiedAt || (profileId && level.authorId === profileId) ? level : null;
}

// The creator beat their own level: it's verified and goes public.
export async function markVerified(id: number, timeMs: number): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('custom_levels')
    .update({ verified_at: new Date().toISOString(), verify_time_ms: Math.round(timeMs) })
    .eq('id', id)
    .is('verified_at', null)
    .select('id');
  return !error && Array.isArray(data) && data.length === 1;
}

export const levelsStorageError = () =>
  NextResponse.json({ error: 'Public levels are not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
