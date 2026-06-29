import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
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

  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 11) {
    return NextResponse.json({ error: 'Invalid levelId.' }, { status: 400 });
  }
  if (!Number.isFinite(timeMs) || timeMs <= 0 || timeMs > 1000 * 60 * 60) {
    return NextResponse.json({ error: 'Invalid timeMs.' }, { status: 400 });
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
