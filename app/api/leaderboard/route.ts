import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ entries: [] });

  const levelId = Number(req.nextUrl.searchParams.get('levelId'));
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 11) {
    return NextResponse.json({ error: 'Invalid levelId.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('best_runs')
    .select('time_ms, kills, secrets, completed_at, profiles ( id, nickname, avatar_color )')
    .eq('level_id', levelId)
    .order('time_ms', { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: 'Could not load leaderboard.' }, { status: 500 });

  type Row = {
    time_ms: number;
    kills: number;
    secrets: number;
    completed_at: string;
    profiles: { id: string; nickname: string; avatar_color: string } | { id: string; nickname: string; avatar_color: string }[] | null;
  };

  const entries = ((data ?? []) as Row[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      profileId: profile?.id ?? null,
      nickname: profile?.nickname ?? 'Unknown',
      avatarColor: profile?.avatar_color ?? '#888888',
      timeMs: row.time_ms,
      kills: row.kills,
      secrets: row.secrets,
      completedAt: row.completed_at
    };
  });

  return NextResponse.json({ entries });
}
