import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../../lib/session';
import { BASE_PUBLIC, LAST_SEEN_EVERY_MS, selectWithFallback } from '../../../../lib/profileFields';

export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ profile: null });

  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ profile: null });

  const supabase = getSupabase();
  const { data: profile, upToDate } = await selectWithFallback(
    (columns) => supabase.from('profiles').select(columns).eq('id', session.id).maybeSingle(),
    `${BASE_PUBLIC}, avatar_pixels, last_seen_at`,
    BASE_PUBLIC
  );
  if (!profile) return NextResponse.json({ profile: null });
  const row = profile as unknown as { id: string; nickname: string; avatar_color: string; avatar_pixels?: string | null; last_seen_at?: string | null };

  // Checking in counts as being online.
  if (upToDate && (!row.last_seen_at || Date.now() - new Date(row.last_seen_at).getTime() > LAST_SEEN_EVERY_MS)) {
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', row.id);
  }

  return NextResponse.json({
    profile: { id: row.id, nickname: row.nickname, avatarColor: row.avatar_color, avatarPixels: row.avatar_pixels ?? null }
  });
}
