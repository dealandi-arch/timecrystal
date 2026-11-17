import { NextRequest, NextResponse } from 'next/server';
import { getLevel } from '../../../../components/rpg/levels';
import { isAdmin } from '../../../../lib/admin';
import { analyzeReplay, replayChecksOn, reportCheat } from '../../../../lib/cheatCatcher';
import { loadMatch, matchView, requirePlayer, settleMatch } from '../../../../lib/pvp';
import { checkRun, readRunTicket } from '../../../../lib/runCheck';

export const dynamic = 'force-dynamic';

// Report that you finished the level. { matchId, timeMs, ticket, usedAbility, replay }
// The run is checked like any ranked run (start ticket, fastest possible time, replay), and the ticket
// must have been issued after the match was made. Ghost race: you win if you're faster than the ghost.
// Live race: the first valid finish wins.
export async function POST(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const me = auth.profileId;
  const body = await req.json().catch(() => null);
  const match = await loadMatch(Number(body?.matchId));
  if (!match || (match.a_id !== me && match.b_id !== me)) return NextResponse.json({ error: 'That match doesn’t exist.' }, { status: 404 });
  if (match.status !== 'ready') return NextResponse.json({ match: await matchView(match, me) });

  const level = getLevel(match.level_id);
  const timeMs = Math.round(Number(body?.timeMs));
  if (!level || !Number.isFinite(timeMs) || timeMs <= 0 || timeMs > 60 * 60 * 1000) return NextResponse.json({ error: 'Invalid time.' }, { status: 400 });
  if (body?.usedAbility) return NextResponse.json({ error: 'Help abilities aren’t allowed in races.' }, { status: 400 });

  const startedAt = readRunTicket(body?.ticket, me, level.id);
  if (startedAt === null || startedAt < new Date(match.created_at).getTime() - 3000) {
    return NextResponse.json({ error: 'This run couldn’t be checked. Start the race again.' }, { status: 400 });
  }
  const check = checkRun(body?.ticket, me, level, timeMs);
  if (!check.ok) {
    if (check.cheat) await reportCheat({ profileId: me, level, timeMs, reason: `PvP race: ${check.reason}`, replay: body?.replay, status: 'rejected' });
    return NextResponse.json({ error: check.cheat ? 'This run is waiting for an admin to check it before it counts.' : check.reason }, { status: 400 });
  }
  const problems = !replayChecksOn() || (await isAdmin(me)) ? [] : analyzeReplay(level, timeMs, body?.replay);
  if (problems.length) {
    await reportCheat({ profileId: me, level, timeMs, reason: `PvP race: ${problems.join(' ')}`, replay: body?.replay, status: 'rejected' });
    return NextResponse.json({ error: 'This run is waiting for an admin to check it before it counts.' }, { status: 400 });
  }

  const iAmA = match.a_id === me;
  let done;
  if (match.mode === 'ghost') {
    const ghostMs = match.b_time_ms ?? Infinity;
    done = await settleMatch(match, timeMs < ghostMs ? me : match.b_id ?? me, { a: timeMs });
  } else {
    done = await settleMatch(match, me, iAmA ? { a: timeMs } : { b: timeMs });
  }
  const final = done ?? (await loadMatch(match.id)) ?? match;
  return NextResponse.json({ match: await matchView(final, me) });
}
