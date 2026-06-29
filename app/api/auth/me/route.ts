import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../../lib/session';

export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ profile: null });

  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ profile: null });

  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_color')
    .eq('id', session.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: { id: profile.id, nickname: profile.nickname, avatarColor: profile.avatar_color } });
}
