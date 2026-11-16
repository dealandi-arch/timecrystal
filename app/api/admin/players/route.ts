import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/admin';
import { selectWithFallback, shownNameOf } from '../../../../lib/profileFields';

export const dynamic = 'force-dynamic';

// Find players by username, display name or #ID.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().replace(/^#/, '').replace(/[,()*%\\]/g, '');
  if (!q) return NextResponse.json({ players: [] });
  const supabase = getSupabase();
  const { data } = await selectWithFallback(
    (cols) =>
      cols.includes('display_name')
        ? supabase.from('profiles').select(cols).or(`nickname.ilike.%${q}%,display_name.ilike.%${q}%,id.eq.${q}`).limit(20)
        : supabase.from('profiles').select(cols).or(`nickname.ilike.%${q}%,id.eq.${q}`).limit(20),
    'id, nickname, display_name, is_admin',
    'id, nickname, is_admin'
  );
  const rows = (data ?? []) as unknown as { id: string; nickname: string; display_name?: string | null; is_admin?: boolean }[];
  return NextResponse.json({ players: rows.map((p) => ({ id: p.id, nickname: p.nickname, displayName: shownNameOf(p), isAdmin: !!p.is_admin })) });
}
