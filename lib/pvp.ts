import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from './supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';
import { shownNameOf } from './profileFields';
import { TOTAL_LEVELS } from '../components/rpg/levels';

// PvP races: rating (Elo), shard rewards, and the match view the pages poll.

export const START_RATING = 1000;
export const LIVE_K = 32;
export const GHOST_K = 16; // a ghost can't lose points back, so ghost races move your rating half as much
export const LIVE_WIN_SHARDS = 6;
export const GHOST_WIN_SHARDS = 2;
export const GHOST_REWARDS_PER_DAY = 5;
export const LIVE_START_DELAY_MS = 3000; // from both players at the start to "GO"
export const WAITING_TTL_MS = 90 * 1000;
export const INVITE_TTL_MS = 10 * 60 * 1000; // how long a challenge waits to be accepted
export const NO_SHOW_MS = 30 * 1000; // no news from the opponent for this long after the start: they forfeit
export const RACE_LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1);

export type PosRow = { x: number; y: number; ms: number; at: number; [extra: string]: unknown };

export type MatchRow = {
  id: number;
  mode: 'ghost' | 'live';
  kind: 'race' | 'arena'; // live matches are either a race or an arena fight (arena: level_id 0)
  invite: boolean; // a challenge sent to one player, not a queue match
  level_id: number;
  a_id: string;
  b_id: string | null;
  status: 'waiting' | 'ready' | 'done' | 'cancelled';
  start_at: string | null;
  a_pos: PosRow | null;
  b_pos: PosRow | null;
  a_time_ms: number | null;
  b_time_ms: number | null;
  winner_id: string | null;
  a_change: number | null;
  b_change: number | null;
  reward: number;
  created_at: string;
  finished_at: string | null;
};

export type Authed = { ok: true; profileId: string } | { ok: false; response: NextResponse };

export function requirePlayer(req: NextRequest): Authed {
  if (!isBackendConfigured()) return { ok: false, response: NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 }) };
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return { ok: false, response: NextResponse.json({ error: 'Sign in to race other players.' }, { status: 401 }) };
  return { ok: true, profileId: session.id };
}

export const notReady = () => NextResponse.json({ error: 'PvP isn’t set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });

export function expectedScore(mine: number, theirs: number): number {
  return 1 / (1 + Math.pow(10, (theirs - mine) / 400));
}

export async function loadMatch(id: number): Promise<MatchRow | null> {
  const { data, error } = await getSupabase().from('pvp_matches').select('*').eq('id', id).maybeSingle();
  return error || !data ? null : (data as unknown as MatchRow);
}

type PlayerRow = { id: string; nickname: string; display_name?: string | null; pvp_rating?: number | null };

export async function loadPlayer(id: string): Promise<PlayerRow | null> {
  const { data } = await getSupabase().from('profiles').select('id, nickname, display_name, pvp_rating').eq('id', id).maybeSingle();
  return (data as PlayerRow | null) ?? null;
}

// Adds shards if the balance is still what we read (so two payouts can't overwrite each other).
async function addShards(profileId: string, amount: number): Promise<void> {
  const supabase = getSupabase();
  for (let i = 0; i < 4; i++) {
    const { data } = await supabase.from('profiles').select('emerald_shards').eq('id', profileId).maybeSingle();
    if (!data) return;
    const before = (data as { emerald_shards: number | null }).emerald_shards ?? 0;
    const { data: done } = await supabase.from('profiles').update({ emerald_shards: before + amount }).eq('id', profileId).eq('emerald_shards', before).select('id');
    if (done?.length) return;
  }
}

async function addRecord(profileId: string, won: boolean, change: number): Promise<void> {
  const supabase = getSupabase();
  const { data } = await supabase.from('profiles').select('pvp_rating, pvp_wins, pvp_losses').eq('id', profileId).maybeSingle();
  if (!data) return;
  const row = data as { pvp_rating: number | null; pvp_wins: number | null; pvp_losses: number | null };
  await supabase
    .from('profiles')
    .update({
      pvp_rating: Math.max(0, (row.pvp_rating ?? START_RATING) + change),
      pvp_wins: (row.pvp_wins ?? 0) + (won ? 1 : 0),
      pvp_losses: (row.pvp_losses ?? 0) + (won ? 0 : 1),
    })
    .eq('id', profileId);
}

// Ends a match exactly once (the first caller flips ready → done), then pays out rating and shards.
// Returns the finished match, or null if someone else already ended it.
export async function settleMatch(match: MatchRow, winnerId: string, times: { a?: number; b?: number } = {}): Promise<MatchRow | null> {
  const supabase = getSupabase();
  const live = match.mode === 'live' && !!match.b_id;
  const aWon = winnerId === match.a_id;
  const a = await loadPlayer(match.a_id);
  const b = match.b_id ? await loadPlayer(match.b_id) : null;
  const ra = a?.pvp_rating ?? START_RATING;
  const rb = b?.pvp_rating ?? START_RATING;
  let aChange: number;
  let bChange = 0;
  if (live) {
    const winChange = Math.round(LIVE_K * (1 - expectedScore(aWon ? ra : rb, aWon ? rb : ra)));
    aChange = aWon ? winChange : -winChange;
    bChange = -aChange;
  } else {
    // Ghost race: only the racer (a) is rated; the ghost's owner isn't touched.
    const e = expectedScore(ra, rb);
    aChange = aWon ? Math.round(GHOST_K * (1 - e)) : -Math.round(GHOST_K * e);
  }
  // Shards for the winner: live wins always; ghost wins a few times a day.
  let reward = 0;
  if (live) reward = LIVE_WIN_SHARDS;
  else if (aWon) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase.from('pvp_matches').select('id', { count: 'exact', head: true }).eq('a_id', match.a_id).eq('mode', 'ghost').gt('reward', 0).gte('finished_at', since);
    if ((count ?? 0) < GHOST_REWARDS_PER_DAY) reward = GHOST_WIN_SHARDS;
  }
  const { data, error } = await supabase
    .from('pvp_matches')
    .update({
      status: 'done',
      winner_id: winnerId,
      a_time_ms: times.a ?? match.a_time_ms,
      b_time_ms: live ? times.b ?? match.b_time_ms : match.b_time_ms,
      a_change: aChange,
      b_change: live ? bChange : null,
      reward,
      finished_at: new Date().toISOString(),
    })
    .eq('id', match.id)
    .eq('status', 'ready')
    .select('*');
  if (error || !data?.length) return null;
  await addRecord(match.a_id, aWon, aChange);
  if (live && match.b_id) await addRecord(match.b_id, !aWon, bChange);
  if (reward > 0) await addShards(winnerId, reward);
  return data[0] as unknown as MatchRow;
}

// What a player's page needs to know about a match.
export async function matchView(match: MatchRow, me: string) {
  const iAmA = match.a_id === me;
  const opponentId = iAmA ? match.b_id : match.a_id;
  const opponent = opponentId ? await loadPlayer(opponentId) : null;
  const oppPos = iAmA ? match.b_pos : match.a_pos;
  const myChange = iAmA ? match.a_change : match.b_change;
  return {
    id: match.id,
    mode: match.mode,
    kind: match.kind,
    invite: match.invite,
    side: iAmA ? 'a' : 'b',
    levelId: match.level_id,
    status: match.status,
    startAt: match.start_at ? new Date(match.start_at).getTime() : null,
    serverNow: Date.now(),
    opponent: opponent ? { id: opponent.id, name: shownNameOf(opponent), rating: opponent.pvp_rating ?? START_RATING } : null,
    opponentPos: oppPos ? { x: oppPos.x, y: oppPos.y } : null,
    finished: match.status === 'done',
    youWon: match.status === 'done' ? match.winner_id === me : null,
    ratingChange: myChange,
    reward: match.status === 'done' && match.winner_id === me ? match.reward : 0,
    myTimeMs: iAmA ? match.a_time_ms : match.b_time_ms,
    opponentTimeMs: iAmA ? match.b_time_ms : match.a_time_ms,
  };
}
