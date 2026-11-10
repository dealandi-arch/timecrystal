import { NextResponse } from 'next/server';
import { getSupabase } from './supabase';
import { type CustomLevelInfo, type CustomMap, type CustomMode } from '../components/rpg/customLevels';

type Row = {
  id: number;
  name: string;
  mode: CustomMode;
  data: CustomMap;
  plays: number;
  created_at: string;
  author_id: string;
  profiles?: { nickname: string } | { nickname: string }[] | null;
};

export function toInfo(row: Row): CustomLevelInfo {
  const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return { id: row.id, name: row.name, mode: row.mode, map: row.data, plays: row.plays, createdAt: row.created_at, authorId: row.author_id, author: author?.nickname ?? 'Unknown' };
}

export async function loadCustomLevel(id: number): Promise<CustomLevelInfo | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  const { data, error } = await getSupabase()
    .from('custom_levels')
    .select('id, name, mode, data, plays, created_at, author_id, profiles ( nickname )')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return toInfo(data as unknown as Row);
}

export const levelsStorageError = () =>
  NextResponse.json({ error: 'Public levels are not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
