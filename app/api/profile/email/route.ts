import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

// Optional: link an email to your account (or unlink it with { email: null }).
// It's private: only you see it, on your own profile. It is never shown to other players.
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 });
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const supabase = getSupabase();

  if (body?.email === null) {
    const { error } = await supabase.from('profiles').update({ email: null }).eq('id', session.id);
    if (error) return NextResponse.json({ error: 'Email linking is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
    return NextResponse.json({ email: null });
  }
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ error: 'That doesn’t look like an email address.' }, { status: 400 });
  const { data: taken, error: readError } = await supabase.from('profiles').select('id').ilike('email', email).neq('id', session.id).limit(1);
  if (readError) return NextResponse.json({ error: 'Email linking is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
  if (taken?.length) return NextResponse.json({ error: 'That email is already linked to another account.' }, { status: 409 });
  const { error } = await supabase.from('profiles').update({ email }).eq('id', session.id);
  if (error) return NextResponse.json({ error: 'Could not link that email.' }, { status: 500 });
  return NextResponse.json({ email });
}
