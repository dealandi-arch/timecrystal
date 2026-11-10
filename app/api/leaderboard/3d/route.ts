import { NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { BASE_PUBLIC, WITH_AVATAR, selectWithFallback } from '../../../../lib/profileFields';
import { LEVEL_IDS_3D } from '../../../../components/rpg/levels3d';

export const dynamic = 'force-dynamic';

type LeaderProfile = { id: string; nickname: string; avatar_color: string; avatar_pixels?: string | null };
type Row = { level_id: number; time_ms: number; profiles: LeaderProfile | LeaderProfile[] | null };

interface Player {
  profileId: string;
  nickname: string;
  avatarColor: string;
  avatarPixels: string | null;
}

// The 3D World Rank: players who cleared more maps rank higher, then the lowest total of their best times.
export async function GET() {
  if (!isBackendConfigured()) return NextResponse.json({ overall: [], maps: {} });
  const supabase = getSupabase();
  const { data, error } = await selectWithFallback(
    (profileColumns) =>
      supabase
        .from('best_runs')
        .select(`level_id, time_ms, profiles ( ${profileColumns} )`)
        .in('level_id', LEVEL_IDS_3D)
        .order('time_ms', { ascending: true })
        .limit(5000),
    WITH_AVATAR,
    BASE_PUBLIC
  );
  if (error) return NextResponse.json({ error: 'Could not load the 3D World Rank.' }, { status: 500 });

  const players = new Map<string, Player & { totalMs: number; maps: number }>();
  const maps: Record<number, (Player & { timeMs: number })[]> = {};
  for (const id of LEVEL_IDS_3D) maps[id] = [];
  for (const row of (data ?? []) as unknown as Row[]) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile) continue;
    const who: Player = { profileId: profile.id, nickname: profile.nickname, avatarColor: profile.avatar_color, avatarPixels: profile.avatar_pixels ?? null };
    if (maps[row.level_id] && maps[row.level_id].length < 20) maps[row.level_id].push({ ...who, timeMs: row.time_ms });
    const entry = players.get(profile.id) ?? { ...who, totalMs: 0, maps: 0 };
    entry.totalMs += row.time_ms;
    entry.maps += 1;
    players.set(profile.id, entry);
  }
  const overall = [...players.values()].sort((a, b) => b.maps - a.maps || a.totalMs - b.totalMs).slice(0, 100);
  return NextResponse.json({ overall, maps });
}
