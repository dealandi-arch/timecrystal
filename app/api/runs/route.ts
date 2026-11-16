import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { getAnyLevel, isRankedLevelId } from '../../../components/rpg/levels3d';
import { CUSTOM_ID_OFFSET, toLevelDef } from '../../../components/rpg/customLevels';
import { checkRun } from '../../../lib/runCheck';
import { analyzeReplay, replayChecksOn, keepReplay, reportCheat } from '../../../lib/cheatCatcher';
import { customLevelForRuns } from '../../../lib/customLevelsServer';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../lib/session';

export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) {
    return NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 });
  }

  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: 'Sign in to submit a run.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const levelId = Number(body?.levelId);
  const timeMs = Number(body?.timeMs);
  const kills = Number.isFinite(Number(body?.kills)) ? Number(body?.kills) : 0;
  const secrets = Number.isFinite(Number(body?.secrets)) ? Number(body?.secrets) : 0;
  const usedAbility = Boolean(body?.usedAbility);

  // Built-in levels, or a public level (verified, or your own while you verify it).
  const custom = isRankedLevelId(levelId) ? null : await customLevelForRuns(levelId, session.id);
  const level = isRankedLevelId(levelId) ? getAnyLevel(levelId) : custom ? { ...toLevelDef(levelId - CUSTOM_ID_OFFSET, custom.name, custom.mode, custom.map), id: levelId } : undefined;
  if (!level) {
    return NextResponse.json({ error: 'Invalid levelId.' }, { status: 400 });
  }
  if (!Number.isFinite(timeMs) || timeMs <= 0 || timeMs > 1000 * 60 * 60) {
    return NextResponse.json({ error: 'Invalid timeMs.' }, { status: 400 });
  }
  // The run must have really happened (see lib/runCheck.ts). Impossible times earn a warning.
  const check = checkRun(body?.ticket, session.id, level, timeMs);
  if (!check.ok) {
    if (check.cheat) await reportCheat({ profileId: session.id, level, timeMs, reason: check.reason, replay: body?.replay, status: 'rejected' });
    return NextResponse.json({ error: check.reason, rejected: true }, { status: 400 });
  }
  // Cheat catcher: the replay has to show the level really being played.
  const problems = usedAbility || !replayChecksOn() ? [] : analyzeReplay(level, timeMs, body?.replay);
  if (problems.length) {
    await reportCheat({ profileId: session.id, level, timeMs, reason: problems.join(' '), replay: body?.replay, status: 'rejected' });
    return NextResponse.json({ error: 'The Cheat catcher stopped this run: ' + problems[0], rejected: true }, { status: 400 });
  }

  if (usedAbility) {
    return NextResponse.json({ savedAsPersonalBest: false, isWorldBest: false, skipped: true, reason: 'A help ability was used on this run.' });
  }

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('best_runs')
    .select('time_ms')
    .eq('profile_id', session.id)
    .eq('level_id', levelId)
    .maybeSingle();

  const isPersonalBest = !existing || timeMs < existing.time_ms;
  if (isPersonalBest) {
    // A new record far faster than the current one is saved, but sent to the admins to double-check.
    const { data: record } = await supabase.from('best_runs').select('time_ms').eq('level_id', levelId).order('time_ms', { ascending: true }).limit(1).maybeSingle();
    if (record && timeMs < record.time_ms * 0.6) {
      await reportCheat({ profileId: session.id, level, timeMs, reason: `Beat the world record of ${(record.time_ms / 1000).toFixed(2)}s by more than 40%. The replay checks out, but have a look.`, replay: body?.replay, status: 'review' });
    }
    await keepReplay(session.id, levelId, timeMs, body?.replay);
    const { error } = await supabase.from('best_runs').upsert({
      profile_id: session.id,
      level_id: levelId,
      time_ms: timeMs,
      kills,
      secrets,
      completed_at: new Date().toISOString()
    });
    if (error) return NextResponse.json({ error: 'Could not save run.' }, { status: 500 });
  }

  const { data: top } = await supabase
    .from('best_runs')
    .select('time_ms')
    .eq('level_id', levelId)
    .order('time_ms', { ascending: true })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    savedAsPersonalBest: isPersonalBest,
    isWorldBest: Boolean(top && top.time_ms === timeMs && isPersonalBest)
  });
}
