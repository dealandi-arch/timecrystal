import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { INVITE_TTL_MS, RACE_LEVELS, type MatchRow, loadPlayer, matchView, notReady, requirePlayer } from '../../../../lib/pvp';
import { addNotification } from '../../../../lib/notify';
import { secureRandom } from '../../../../lib/collectionServer';
import { shownNameOf } from '../../../../lib/profileFields';

export const dynamic = 'force-dynamic';

// Challenge a friend to a Player Fight (or a live race). A challenge stays open for 10 minutes.
//   GET                                          { challenges: sent to you, waiting for an answer; outgoing: yours that are open or just accepted }
//   POST { action: 'send', who, kind, levelId? } challenge a player by username or #ID (race: levelId optional, random if left out)
//   POST { action: 'accept', matchId }           accept a challenge sent to you (both of you then go to the match)
// To decline (or cancel your own challenge), use /api/pvp/leave.

export async function GET(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const since = new Date(Date.now() - INVITE_TTL_MS).toISOString();
  const supabase = getSupabase();
  const { data, error } = await supabase.from('pvp_matches').select('*').eq('b_id', auth.profileId).eq('invite', true).eq('status', 'waiting').gte('created_at', since).order('id', { ascending: false }).limit(10);
  if (error) return NextResponse.json({ challenges: [], outgoing: [], notReady: true });
  const challenges = await Promise.all(((data ?? []) as unknown as MatchRow[]).map((m) => matchView(m, auth.profileId)));
  // Challenges I sent that are still open, or were accepted while I was away (so the site can pull me into the match).
  const { data: sent } = await supabase.from('pvp_matches').select('*').eq('a_id', auth.profileId).eq('invite', true).in('status', ['waiting', 'ready']).gte('created_at', since).order('id', { ascending: false }).limit(3);
  const outgoing = await Promise.all(((sent ?? []) as unknown as MatchRow[]).filter((m) => m.status === 'waiting' || !m.a_pos).map((m) => matchView(m, auth.profileId)));
  return NextResponse.json({ challenges, outgoing });
}

export async function POST(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const me = auth.profileId;
  const body = await req.json().catch(() => null);
  const supabase = getSupabase();

  if (body?.action === 'send') {
    const who = String(body?.who ?? '').trim().replace(/^#/, '');
    const kind: 'race' | 'arena' = body?.kind === 'arena' ? 'arena' : 'race';
    if (!who || who.length > 40) return NextResponse.json({ error: 'Type the username or #ID of the player to challenge.' }, { status: 400 });
    const lookup = /^\d+$/.test(who) ? supabase.from('profiles').select('id').eq('id', who) : supabase.from('profiles').select('id').ilike('nickname', who.replace(/[%_]/g, ''));
    const { data: found } = await lookup.limit(1).maybeSingle();
    const opponentId = (found as { id: string } | null)?.id;
    if (!opponentId) return NextResponse.json({ error: 'No player found with that name.' }, { status: 404 });
    if (opponentId === me) return NextResponse.json({ error: 'You can’t challenge yourself.' }, { status: 400 });
    let levelId = 0;
    if (kind === 'race') {
      levelId = Number(body?.levelId);
      if (!RACE_LEVELS.includes(levelId)) levelId = RACE_LEVELS[Math.floor(secureRandom() * RACE_LEVELS.length)];
    }
    // One open challenge at a time.
    const cleanup = await supabase.from('pvp_matches').update({ status: 'cancelled' }).eq('a_id', me).eq('status', 'waiting');
    if (cleanup.error) return notReady();
    const { data: created, error } = await supabase.from('pvp_matches').insert({ mode: 'live', kind, invite: true, level_id: levelId, a_id: me, b_id: opponentId, status: 'waiting' }).select('*').single();
    if (error || !created) return notReady();
    const [mine, theirs] = await Promise.all([loadPlayer(me), loadPlayer(opponentId)]);
    await addNotification(opponentId, 'info', `${shownNameOf(mine)} challenged you!`, `${shownNameOf(mine)} wants a ${kind === 'arena' ? 'Player Fight' : 'live race'} with you. Open PvP Race to accept (it’s open for 10 minutes).`);
    return NextResponse.json({ match: await matchView(created as unknown as MatchRow, me), opponentName: shownNameOf(theirs) });
  }

  if (body?.action === 'accept') {
    const matchId = Number(body?.matchId);
    const since = new Date(Date.now() - INVITE_TTL_MS).toISOString();
    const { data } = await supabase.from('pvp_matches').update({ status: 'ready' }).eq('id', matchId).eq('b_id', me).eq('invite', true).eq('status', 'waiting').gte('created_at', since).select('*');
    if (!data?.length) return NextResponse.json({ error: 'That challenge has expired or was cancelled.' }, { status: 404 });
    return NextResponse.json({ match: await matchView(data[0] as unknown as MatchRow, me) });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
