import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../../lib/session';
import { BASE_PUBLIC, LAST_SEEN_EVERY_MS, selectWithFallback, shownNameOf } from '../../../../lib/profileFields';

export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ profile: null });

  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ profile: null });

  const supabase = getSupabase();
  const { data: profile } = await selectWithFallback(
    (columns) => supabase.from('profiles').select(columns).eq('id', session.id).maybeSingle(),
    `${BASE_PUBLIC}, avatar_pixels, last_seen_at, display_name, display_name_changed_at`,
    `${BASE_PUBLIC}, avatar_pixels, last_seen_at`,
    BASE_PUBLIC
  );
  if (!profile) return NextResponse.json({ profile: null });
  const row = profile as unknown as { id: string; nickname: string; display_name?: string | null; display_name_changed_at?: string | null; avatar_color: string; avatar_pixels?: string | null; last_seen_at?: string | null };

  // Checking in counts as being online (needs last_seen_at, which comes with the first two column lists).
  if ('last_seen_at' in row && (!row.last_seen_at || Date.now() - new Date(row.last_seen_at).getTime() > LAST_SEEN_EVERY_MS)) {
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', row.id);
  }

  return NextResponse.json({
    profile: { id: row.id, nickname: row.nickname, displayName: shownNameOf(row), nameChangedAt: row.display_name_changed_at ?? null, avatarColor: row.avatar_color, avatarPixels: row.avatar_pixels ?? null }
  });
}
