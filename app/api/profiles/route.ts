import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { BASE_PUBLIC, WITH_AVATAR, selectWithFallback } from '../../../lib/profileFields';

// Search profiles by nickname, e.g. /api/profiles?q=ghost
export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ profiles: [] });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ profiles: [] });

  const supabase = getSupabase();
  const { data, error } = await selectWithFallback(
    (columns) => supabase.from('profiles').select(columns).ilike('nickname', `%${q}%`).limit(20),
    WITH_AVATAR,
    BASE_PUBLIC
  );

  if (error) return NextResponse.json({ error: 'Search failed.' }, { status: 500 });

  const rows = (data ?? []) as unknown as { id: string; nickname: string; avatar_color: string; avatar_pixels?: string | null }[];
  return NextResponse.json({
    profiles: rows.map((p) => ({ id: p.id, nickname: p.nickname, avatarColor: p.avatar_color, avatarPixels: p.avatar_pixels ?? null }))
  });
}
