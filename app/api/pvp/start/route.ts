import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { RACE_LEVELS, WAITING_TTL_MS, type MatchRow, matchView, notReady, requirePlayer } from '../../../../lib/pvp';
import { secureRandom } from '../../../../lib/collectionServer';

export const dynamic = 'force-dynamic';

// Start a race.
//   { mode: 'ghost', levelId, opponentId }  race a recorded run of another player (the match starts right away)
//   { mode: 'live' }                        join the queue: you're matched with the next waiting player on a random level
export async function POST(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const me = auth.profileId;
  const body = await req.json().catch(() => null);
  const supabase = getSupabase();

  // Leave anything half-finished from before: waiting entries are dropped, old unfinished matches are closed without a result.
  const cleanup = await supabase.from('pvp_matches').update({ status: 'cancelled' }).eq('a_id', me).eq('status', 'waiting');
  if (cleanup.error) return notReady();

  if (body?.mode === 'ghost') {
    const levelId = Number(body?.levelId);
    const opponentId = String(body?.opponentId ?? '');
    if (!RACE_LEVELS.includes(levelId)) return NextResponse.json({ error: 'Pick one of the 11 levels.' }, { status: 400 });
    if (!/^\d+$/.test(opponentId) || opponentId === me) return NextResponse.json({ error: 'Pick another player to race.' }, { status: 400 });
    const { data: ghost } = await supabase.from('run_replays').select('time_ms, replay').eq('profile_id', opponentId).eq('level_id', levelId).maybeSingle();
    const g = ghost as { time_ms: number; replay: unknown } | null;
    if (!g?.replay) return NextResponse.json({ error: 'That player has no recorded run on this level.' }, { status: 404 });
    const { data: created, error } = await supabase
      .from('pvp_matches')
      .insert({ mode: 'ghost', level_id: levelId, a_id: me, b_id: opponentId, status: 'ready', b_time_ms: g.time_ms })
      .select('*')
      .single();
    if (error || !created) return notReady();
    return NextResponse.json({ match: await matchView(created as unknown as MatchRow, me), ghost: g.replay, ghostTimeMs: g.time_ms });
  }

  if (body?.mode === 'live') {
    // Stale queue entries are cleared so nobody is matched with someone who left.
    await supabase.from('pvp_matches').update({ status: 'cancelled' }).eq('status', 'waiting').lt('created_at', new Date(Date.now() - WAITING_TTL_MS).toISOString());
    const { data: waiting } = await supabase.from('pvp_matches').select('*').eq('mode', 'live').eq('status', 'waiting').neq('a_id', me).order('id', { ascending: true }).limit(5);
    for (const w of (waiting ?? []) as unknown as MatchRow[]) {
      // Claim it only if it's still waiting (two joiners can't take the same match).
      const { data: claimed } = await supabase
        .from('pvp_matches')
        .update({ b_id: me, status: 'ready' }) // the start time is set once both players are at the start
        .eq('id', w.id)
        .eq('status', 'waiting')
        .select('*');
      if (claimed?.length) return NextResponse.json({ match: await matchView(claimed[0] as unknown as MatchRow, me) });
    }
    const levelId = RACE_LEVELS[Math.floor(secureRandom() * RACE_LEVELS.length)];
    const { data: created, error } = await supabase.from('pvp_matches').insert({ mode: 'live', level_id: levelId, a_id: me, status: 'waiting' }).select('*').single();
    if (error || !created) return notReady();
    return NextResponse.json({ match: await matchView(created as unknown as MatchRow, me) });
  }

  return NextResponse.json({ error: 'Pick ghost or live.' }, { status: 400 });
}
