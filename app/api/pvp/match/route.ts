import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { LIVE_START_DELAY_MS, NO_SHOW_MS, WAITING_TTL_MS, loadMatch, matchView, requirePlayer, settleMatch } from '../../../../lib/pvp';

export const dynamic = 'force-dynamic';

const MAX_LIVE_MATCH_MS = 30 * 60 * 1000;

// GET: the match as you should see it (while waiting for an opponent, and after the race).
// POST { id, x, y, ms }: report your position during a live race; the reply has the opponent's.
async function respond(id: number, me: string, pos?: { x: number; y: number; ms: number }) {
  let match = await loadMatch(id);
  if (!match || (match.a_id !== me && match.b_id !== me)) return NextResponse.json({ error: 'That match doesn’t exist.' }, { status: 404 });
  const now = Date.now();
  const supabase = getSupabase();

  // Tidy up matches that can't finish.
  if (match.status === 'waiting' && now - new Date(match.created_at).getTime() > WAITING_TTL_MS) {
    await supabase.from('pvp_matches').update({ status: 'cancelled' }).eq('id', id).eq('status', 'waiting');
    match = { ...match, status: 'cancelled' };
  }
  if (match.status === 'ready' && match.mode === 'live' && now - new Date(match.start_at ?? match.created_at).getTime() > MAX_LIVE_MATCH_MS) {
    await supabase.from('pvp_matches').update({ status: 'cancelled' }).eq('id', id).eq('status', 'ready');
    match = { ...match, status: 'cancelled' };
  }

  if (pos && match.status === 'ready' && match.mode === 'live') {
    const iAmA = match.a_id === me;
    const mine = { x: Number(pos.x), y: Number(pos.y), ms: Number(pos.ms), at: now };
    if ([mine.x, mine.y, mine.ms].every(Number.isFinite)) {
      await supabase.from('pvp_matches').update(iAmA ? { a_pos: mine } : { b_pos: mine }).eq('id', id).eq('status', 'ready');
      match = iAmA ? { ...match, a_pos: mine } : { ...match, b_pos: mine };
    }
    const theirs = iAmA ? match.b_pos : match.a_pos;
    // Both players are at the start: set the start time a few seconds ahead.
    if (!match.start_at && theirs) {
      const startAt = new Date(now + LIVE_START_DELAY_MS).toISOString();
      const { data: set } = await supabase.from('pvp_matches').update({ start_at: startAt }).eq('id', id).is('start_at', null).select('start_at');
      match = { ...match, start_at: set?.[0]?.start_at ?? (await loadMatch(id))?.start_at ?? null };
    }
    // The opponent went quiet after the start: they forfeit.
    const start = match.start_at ? new Date(match.start_at).getTime() : null;
    if (start !== null && now > start + NO_SHOW_MS && now - (theirs?.at ?? start) > NO_SHOW_MS) {
      const done = await settleMatch(match, me);
      if (done) match = done;
      else match = (await loadMatch(id)) ?? match;
    }
  }
  return NextResponse.json({ match: await matchView(match, me) });
}

export async function GET(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Pick a match.' }, { status: 400 });
  return respond(id, auth.profileId);
}

export async function POST(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Pick a match.' }, { status: 400 });
  return respond(id, auth.profileId, { x: body?.x, y: body?.y, ms: body?.ms });
}
