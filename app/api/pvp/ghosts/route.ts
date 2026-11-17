import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { RACE_LEVELS, START_RATING, requirePlayer } from '../../../../lib/pvp';
import { shownNameOf } from '../../../../lib/profileFields';

export const dynamic = 'force-dynamic';

type Joined = { nickname: string; display_name?: string | null; pvp_rating?: number | null };

// Players whose best run on a level was recorded, fastest first: the ghosts you can race.
export async function GET(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const levelId = Number(req.nextUrl.searchParams.get('levelId'));
  if (!RACE_LEVELS.includes(levelId)) return NextResponse.json({ error: 'Pick one of the 11 levels.' }, { status: 400 });
  const { data, error } = await getSupabase()
    .from('run_replays')
    .select('profile_id, time_ms, profiles ( nickname, display_name, pvp_rating )')
    .eq('level_id', levelId)
    .not('replay', 'is', null)
    .neq('profile_id', auth.profileId)
    .order('time_ms', { ascending: true })
    .limit(30);
  if (error) return NextResponse.json({ ghosts: [], notReady: true });
  const ghosts = ((data ?? []) as unknown as { profile_id: string; time_ms: number; profiles: Joined | Joined[] | null }[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return { profileId: r.profile_id, name: p ? shownNameOf(p) : 'Unknown', rating: p?.pvp_rating ?? START_RATING, timeMs: r.time_ms };
  });
  return NextResponse.json({ ghosts });
}
