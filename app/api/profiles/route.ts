import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { BASE_PUBLIC, WITH_AVATAR, WITH_NAME, selectWithFallback, shownNameOf } from '../../../lib/profileFields';

export const dynamic = 'force-dynamic';

// Players: with ?q= it searches display names and usernames; without, it lists players,
// most recently online first (up to 100).
export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ profiles: [] });

  // Characters that mean something in a filter are dropped.
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().replace(/^#/, '').replace(/[,()*%\\]/g, '');
  const idMatch = /^\d+$/.test(q) ? `,id.eq.${q}` : ''; // "#9156728" finds that player
  const supabase = getSupabase();
  const { data, error } = await selectWithFallback(
    (columns) => {
      const base = supabase.from('profiles').select(columns);
      if (!q) {
        // Listing everyone: newest activity first (needs last_seen_at; older databases fall back to newest players).
        return columns.includes('display_name')
          ? base.order('last_seen_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(100)
          : base.order('created_at', { ascending: false }).limit(100);
      }
      return columns.includes('display_name')
        ? base.or(`nickname.ilike.%${q}%,display_name.ilike.%${q}%${idMatch}`).limit(50)
        : base.ilike('nickname', `%${q}%`).limit(50);
    },
    `${WITH_NAME}, last_seen_at`,
    WITH_AVATAR,
    BASE_PUBLIC
  );

  if (error) return NextResponse.json({ error: 'Could not load players.' }, { status: 500 });

  const rows = (data ?? []) as unknown as { id: string; nickname: string; display_name?: string | null; avatar_color: string; avatar_pixels?: string | null; last_seen_at?: string | null }[];
  return NextResponse.json({
    profiles: rows.map((p) => ({ id: p.id, nickname: p.nickname, displayName: shownNameOf(p), avatarColor: p.avatar_color, avatarPixels: p.avatar_pixels ?? null, lastSeenAt: p.last_seen_at ?? null })),
  });
}
