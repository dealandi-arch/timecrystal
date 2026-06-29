import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';

// Search profiles by nickname, e.g. /api/profiles?q=ghost
export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ profiles: [] });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ profiles: [] });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_color')
    .ilike('nickname', `%${q}%`)
    .limit(20);

  if (error) return NextResponse.json({ error: 'Search failed.' }, { status: 500 });

  return NextResponse.json({
    profiles: (data ?? []).map((p) => ({ id: p.id, nickname: p.nickname, avatarColor: p.avatar_color }))
  });
}
