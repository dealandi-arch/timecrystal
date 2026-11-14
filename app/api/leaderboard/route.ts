import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { isRankedLevelId } from '../../../components/rpg/levels3d';
import { customLevelForRuns } from '../../../lib/customLevelsServer';
import { BASE_PUBLIC, WITH_AVATAR, WITH_NAME, selectWithFallback, shownNameOf } from '../../../lib/profileFields';

export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ entries: [] });

  const levelId = Number(req.nextUrl.searchParams.get('levelId'));
  if (!isRankedLevelId(levelId) && !(await customLevelForRuns(levelId, null))) {
    return NextResponse.json({ error: 'Invalid levelId.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await selectWithFallback(
    (profileColumns) =>
      supabase
        .from('best_runs')
        .select(`time_ms, kills, secrets, completed_at, profiles ( ${profileColumns} )`)
        .eq('level_id', levelId)
        .order('time_ms', { ascending: true })
        .limit(50),
    WITH_NAME,
    WITH_AVATAR,
    BASE_PUBLIC
  );

  if (error) return NextResponse.json({ error: 'Could not load leaderboard.' }, { status: 500 });

  type LeaderProfile = { id: string; nickname: string; display_name?: string | null; avatar_color: string; avatar_pixels?: string | null };
  type Row = {
    time_ms: number;
    kills: number;
    secrets: number;
    completed_at: string;
    profiles: LeaderProfile | LeaderProfile[] | null;
  };

  const entries = ((data ?? []) as unknown as Row[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      profileId: profile?.id ?? null,
      nickname: profile?.nickname ?? 'Unknown',
      displayName: shownNameOf(profile),
      avatarColor: profile?.avatar_color ?? '#888888',
      avatarPixels: profile?.avatar_pixels ?? null,
      timeMs: row.time_ms,
      kills: row.kills,
      secrets: row.secrets,
      completedAt: row.completed_at
    };
  });

  return NextResponse.json({ entries });
}
