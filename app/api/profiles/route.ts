import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { BASE_PUBLIC, WITH_AVATAR, WITH_NAME, selectWithFallback, shownNameOf } from '../../../lib/profileFields';

// Search profiles by display name or username, e.g. /api/profiles?q=ghost
export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ profiles: [] });

  // Characters that mean something in a filter are dropped.
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().replace(/[,()*%\\]/g, '');
  if (!q) return NextResponse.json({ profiles: [] });

  const supabase = getSupabase();
  const { data, error } = await selectWithFallback(
    (columns) =>
      columns.includes('display_name')
        ? supabase.from('profiles').select(columns).or(`nickname.ilike.%${q}%,display_name.ilike.%${q}%`).limit(20)
        : supabase.from('profiles').select(columns).ilike('nickname', `%${q}%`).limit(20),
    WITH_NAME,
    WITH_AVATAR,
    BASE_PUBLIC
  );

  if (error) return NextResponse.json({ error: 'Search failed.' }, { status: 500 });

  const rows = (data ?? []) as unknown as { id: string; nickname: string; display_name?: string | null; avatar_color: string; avatar_pixels?: string | null }[];
  return NextResponse.json({
    profiles: rows.map((p) => ({ id: p.id, nickname: p.nickname, displayName: shownNameOf(p), avatarColor: p.avatar_color, avatarPixels: p.avatar_pixels ?? null }))
  });
}
