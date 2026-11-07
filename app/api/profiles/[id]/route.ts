import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { PROFILE_PAGE_EXTRAS, selectWithFallback } from '../../../../lib/profileFields';

const BASE = 'id, nickname, avatar_color, created_at';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isBackendConfigured()) return NextResponse.json({ profile: null });

  const supabase = getSupabase();
  const { data } = await selectWithFallback(
    (columns) => supabase.from('profiles').select(columns).eq('id', params.id).maybeSingle(),
    `${BASE}, ${PROFILE_PAGE_EXTRAS}`,
    BASE
  );
  if (!data) return NextResponse.json({ profile: null });
  const profile = data as unknown as {
    id: string;
    nickname: string;
    avatar_color: string;
    created_at: string;
    avatar_pixels?: string | null;
    last_seen_at?: string | null;
    recent_characters?: string[] | null;
    owned_characters?: string[] | null;
    character_levels?: Record<string, number> | null;
  };

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
      createdAt: profile.created_at,
      avatarPixels: profile.avatar_pixels ?? null,
      lastSeenAt: profile.last_seen_at ?? null,
      recentCharacters: profile.recent_characters ?? [],
      ownedCharacters: profile.owned_characters ?? [],
      characterLevels: profile.character_levels ?? {}
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
