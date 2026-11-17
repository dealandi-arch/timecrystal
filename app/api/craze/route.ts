import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../lib/session';
import { BASE_PUBLIC, WITH_AVATAR, WITH_NAME, selectWithFallback, shownNameOf } from '../../../lib/profileFields';
import { readRunTicket } from '../../../lib/runCheck';
import { bumpDaily } from '../../../lib/daily';
import { crazeLevelId, isCrazeMinutes } from '../../../components/rpg/craze';

export const dynamic = 'force-dynamic';
const TOLERANCE_MS = 1500;

type LeaderProfile = { id: string; nickname: string; display_name?: string | null; avatar_color: string; avatar_pixels?: string | null };

// The Craze Rank for one round length: most enemies beaten.
export async function GET(req: NextRequest) {
  const minutes = Number(req.nextUrl.searchParams.get('minutes'));
  if (!isCrazeMinutes(minutes)) return NextResponse.json({ error: 'Invalid round length.' }, { status: 400 });
  if (!isBackendConfigured()) return NextResponse.json({ entries: [] });
  const { data, error } = await selectWithFallback(
    (cols) =>
      getSupabase()
        .from('craze_scores')
        .select(`kills, achieved_at, profiles ( ${cols} )`)
        .eq('minutes', minutes)
        .order('kills', { ascending: false })
        .order('achieved_at', { ascending: true })
        .limit(50),
    WITH_NAME,
    WITH_AVATAR,
    BASE_PUBLIC
  );
  if (error) return NextResponse.json({ entries: [], notReady: true });
  const entries = ((data ?? []) as unknown as { kills: number; achieved_at: string; profiles: LeaderProfile | LeaderProfile[] | null }[]).map((row) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { profileId: p?.id ?? null, nickname: p?.nickname ?? 'Unknown', displayName: shownNameOf(p), avatarColor: p?.avatar_color ?? '#888888', avatarPixels: p?.avatar_pixels ?? null, kills: row.kills };
  });
  return NextResponse.json({ entries });
}

// Submit a finished round. Kept if it beats your best for that round length.
export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 });
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: 'Sign in to get on the Craze Rank.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const minutes = Number(body?.minutes);
  const kills = Number(body?.kills);
  const durationMs = Number(body?.durationMs);
  if (!isCrazeMinutes(minutes) || !Number.isInteger(kills) || kills < 0 || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > minutes * 60000 + TOLERANCE_MS) {
    return NextResponse.json({ error: 'Invalid round.' }, { status: 400 });
  }
  // A round needs the start ticket from when it began (so it comes from a real round in the game).
  if (readRunTicket(body?.ticket, session.id, crazeLevelId(minutes)) === null) return NextResponse.json({ error: 'This round couldn’t be saved. Reload the page and play again.' }, { status: 400 });

  await bumpDaily(session.id, 'craze15', kills); // daily quest: beat 15 Craze enemies
  const supabase = getSupabase();
  const { data: existing, error: readError } = await supabase.from('craze_scores').select('kills').eq('profile_id', session.id).eq('minutes', minutes).maybeSingle();
  if (readError) return NextResponse.json({ error: 'The Craze Rank is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
  const best = !existing || kills > existing.kills;
  if (best) {
    const { error } = await supabase.from('craze_scores').upsert({ profile_id: session.id, minutes, kills, duration_ms: Math.round(durationMs), achieved_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: 'Could not save your score.' }, { status: 500 });
  }
  const { count } = await supabase.from('craze_scores').select('profile_id', { count: 'exact', head: true }).eq('minutes', minutes).gt('kills', best ? kills : existing?.kills ?? kills);
  return NextResponse.json({ personalBest: best, best: best ? kills : existing?.kills ?? kills, place: (count ?? 0) + 1 });
}
