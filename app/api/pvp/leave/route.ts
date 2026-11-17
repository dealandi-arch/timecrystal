import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { loadMatch, matchView, requirePlayer, settleMatch } from '../../../../lib/pvp';

export const dynamic = 'force-dynamic';

// Leave a match. { matchId }
// Before a live race starts (or in the first 15 seconds of a ghost race) nothing is lost; after that, leaving is a loss.
export async function POST(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const me = auth.profileId;
  const body = await req.json().catch(() => null);
  const match = await loadMatch(Number(body?.matchId));
  if (!match || (match.a_id !== me && match.b_id !== me)) return NextResponse.json({ error: 'That match doesn’t exist.' }, { status: 404 });
  if (match.status === 'done' || match.status === 'cancelled') return NextResponse.json({ match: await matchView(match, me) });

  const now = Date.now();
  const started = match.mode === 'live' ? !!match.start_at && now >= new Date(match.start_at).getTime() : now - new Date(match.created_at).getTime() > 15000;
  if (match.status === 'ready' && started) {
    const winner = match.mode === 'ghost' ? match.b_id : match.a_id === me ? match.b_id : match.a_id;
    if (winner) {
      const done = await settleMatch(match, winner);
      return NextResponse.json({ match: await matchView(done ?? (await loadMatch(match.id)) ?? match, me) });
    }
  }
  const { data } = await getSupabase().from('pvp_matches').update({ status: 'cancelled' }).eq('id', match.id).in('status', ['waiting', 'ready']).select('*');
  return NextResponse.json({ match: await matchView((data?.[0] as typeof match | undefined) ?? match, me) });
}
