import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_S } from '../../../../lib/session';
import { validateNickname, validatePassword } from '../../../../lib/profileValidation';

export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) {
    return NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const nickname = validateNickname(body?.nickname);
  const password = validatePassword(body?.password);
  if (!nickname || !password) {
    return NextResponse.json({ error: 'Invalid nickname or password.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, password_hash, avatar_color')
    .ilike('nickname', nickname)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: 'Nickname or password is incorrect.' }, { status: 401 });

  const ok = await bcrypt.compare(password, profile.password_hash);
  if (!ok) return NextResponse.json({ error: 'Nickname or password is incorrect.' }, { status: 401 });

  const token = createSessionToken({ id: profile.id, nickname: profile.nickname });
  const res = NextResponse.json({
    profile: { id: profile.id, nickname: profile.nickname, avatarColor: profile.avatar_color }
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_S
  });
  return res;
}
