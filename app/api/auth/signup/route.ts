import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_S } from '../../../../lib/session';
import { generateProfileId, validateAvatarColor, validateNickname, validatePassword } from '../../../../lib/profileValidation';

export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) {
    return NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const nickname = validateNickname(body?.nickname);
  const password = validatePassword(body?.password);
  const avatarColor = validateAvatarColor(body?.avatarColor) ?? '#5865f2';

  if (!nickname) return NextResponse.json({ error: 'Nickname must be 3-20 characters (letters, numbers, _ - and spaces).' }, { status: 400 });
  if (!password) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

  const supabase = getSupabase();

  const { data: existing } = await supabase.from('profiles').select('id').ilike('nickname', nickname).maybeSingle();
  if (existing) return NextResponse.json({ error: 'That nickname is already taken.' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);

  let id = generateProfileId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from('profiles').insert({
      id,
      nickname,
      password_hash: passwordHash,
      avatar_color: avatarColor
    });
    if (!error) break;
    if (error.code === '23505' && attempt < 4) {
      id = generateProfileId();
      continue;
    }
    return NextResponse.json({ error: 'Could not create profile. Try again.' }, { status: 500 });
  }

  const token = createSessionToken({ id, nickname });
  const res = NextResponse.json({ profile: { id, nickname, avatarColor } });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_S
  });
  return res;
}
