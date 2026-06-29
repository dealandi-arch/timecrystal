import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isBackendConfigured()) return NextResponse.json({ profile: null });

  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_color, created_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ profile: null });

  const { data: runs } = await supabase
    .from('best_runs')
    .select('level_id, time_ms, kills, secrets, completed_at')
    .eq('profile_id', profile.id)
    .order('level_id', { ascending: true });

  return NextResponse.json({
    profile: {
      id: profile.id,
      nickname: profile.nickname,
      avatarColor: profile.avatar_color,
      createdAt: profile.created_at
    },
    runs: (runs ?? []).map((r) => ({
      levelId: r.level_id,
      timeMs: r.time_ms,
      kills: r.kills,
      secrets: r.secrets,
      completedAt: r.completed_at
    }))
  });
}
