import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { LIVE_START_DELAY_MS, NO_SHOW_MS, type MatchRow, type PosRow, loadMatch, matchView, requirePlayer, settleMatch } from '../../../../lib/pvp';
import { ARENA_H, ARENA_HP, ARENA_MS, ARENA_W, MAX_SHOTS_SENT } from '../../../../components/pvp/arenaConfig';

export const dynamic = 'force-dynamic';

// Arena fights. POST { id, x, y, landed, taken, shots } every fraction of a second.
//
// Each fighter reports where they are, the shots they fired, how many hits they LANDED and how many they TOOK.
// A hit only counts when both sides agree: damage to a fighter = min(hits the other landed, hits they took).
// So a cheater can't invent hits on an honest player, and can't make an honest player's hits vanish for free
// (they'd only draw at the end). First to ARENA_HP damage loses; when time runs out the fighter who dealt
// more wins, and equal damage is a draw (no rating change).

const num = (v: unknown, lo: number, hi: number, fallback = lo) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const count = (v: unknown, previous: number) => Math.min(ARENA_HP + 3, Math.max(previous, Math.min(previous + 2, Math.floor(num(v, 0, 99)))));

function cleanShots(raw: unknown): { n: number; x: number; y: number; dx: number; dy: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-MAX_SHOTS_SENT).map((s) => {
    const dx = num(s?.dx, -1, 1, 0);
    const dy = num(s?.dy, -1, 1, 0);
    return { n: Math.floor(num(s?.n, 0, 1e6)), x: num(s?.x, 0, ARENA_W), y: num(s?.y, 0, ARENA_H), dx, dy };
  });
}

function damage(a: PosRow | null, b: PosRow | null) {
  const aLanded = Number(a?.landed ?? 0);
  const aTaken = Number(a?.taken ?? 0);
  const bLanded = Number(b?.landed ?? 0);
  const bTaken = Number(b?.taken ?? 0);
  return { toA: Math.min(bLanded, aTaken), toB: Math.min(aLanded, bTaken) };
}

export async function POST(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const me = auth.profileId;
  const body = await req.json().catch(() => null);
  let match = await loadMatch(Number(body?.id));
  if (!match || match.kind !== 'arena' || (match.a_id !== me && match.b_id !== me)) return NextResponse.json({ error: 'That fight doesn’t exist.' }, { status: 404 });

  const supabase = getSupabase();
  const now = Date.now();
  const iAmA = match.a_id === me;

  if (match.status === 'ready') {
    const previous = (iAmA ? match.a_pos : match.b_pos) ?? null;
    const mine: PosRow = {
      x: num(body?.x, 0, ARENA_W),
      y: num(body?.y, 0, ARENA_H),
      ms: Math.round(num(body?.ms, -1, 60 * 60 * 1000, -1)),
      at: now,
      landed: count(body?.landed, Number(previous?.landed ?? 0)),
      taken: count(body?.taken, Number(previous?.taken ?? 0)),
      shots: cleanShots(body?.shots),
    };
    await supabase.from('pvp_matches').update(iAmA ? { a_pos: mine } : { b_pos: mine }).eq('id', match.id).eq('status', 'ready');
    match = (iAmA ? { ...match, a_pos: mine } : { ...match, b_pos: mine }) as MatchRow;
    const theirs = iAmA ? match.b_pos : match.a_pos;

    // Both fighters are in the arena: start in a few seconds.
    if (!match.start_at && theirs) {
      const startAt = new Date(now + LIVE_START_DELAY_MS).toISOString();
      const { data: set } = await supabase.from('pvp_matches').update({ start_at: startAt }).eq('id', match.id).is('start_at', null).select('start_at');
      match = { ...match, start_at: set?.[0]?.start_at ?? (await loadMatch(match.id))?.start_at ?? null } as MatchRow;
    }
    const start = match.start_at ? new Date(match.start_at).getTime() : null;

    if (start !== null && now >= start) {
      const dmg = damage(match.a_pos, match.b_pos);
      let done: MatchRow | null = null;
      if (dmg.toA >= ARENA_HP || dmg.toB >= ARENA_HP) {
        done = await settleMatch(match, dmg.toA >= ARENA_HP ? match.b_id ?? me : match.a_id);
      } else if (now - (theirs?.at ?? start) > NO_SHOW_MS && now > start + NO_SHOW_MS) {
        done = await settleMatch(match, me); // the other fighter went quiet
      } else if (now > start + ARENA_MS) {
        if (dmg.toA !== dmg.toB) done = await settleMatch(match, dmg.toB > dmg.toA ? match.a_id : match.b_id ?? me);
        else await supabase.from('pvp_matches').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('id', match.id).eq('status', 'ready'); // a draw
      }
      match = done ?? (await loadMatch(match.id)) ?? match;
    }
  }

  const dmg = damage(match.a_pos, match.b_pos);
  const theirs = iAmA ? match.b_pos : match.a_pos;
  return NextResponse.json({
    match: await matchView(match, me),
    arena: {
      opponent: theirs ? { x: theirs.x, y: theirs.y, landed: theirs.landed ?? 0, taken: theirs.taken ?? 0, shots: theirs.shots ?? [] } : null,
      hpMe: Math.max(0, ARENA_HP - (iAmA ? dmg.toA : dmg.toB)),
      hpOpponent: Math.max(0, ARENA_HP - (iAmA ? dmg.toB : dmg.toA)),
      draw: match.status === 'cancelled' && !!match.start_at,
    },
  });
}
