import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../../lib/session';
import { NAME_CHANGE_DAYS, nextNameChange, validateDisplayName } from '../../../../components/profile/displayName';

// Change your display name. Free, but after a change it's locked for 5 days.
export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 });
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: 'Sign in to change your display name.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const displayName = validateDisplayName(body?.displayName);
  if (!displayName) {
    return NextResponse.json({ error: 'Display names are 3–20 letters, numbers, spaces or _ - . \' ! ?' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('profiles').select('display_name, display_name_changed_at').eq('id', session.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Display names are not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  const current = data as { display_name: string | null; display_name_changed_at: string | null };
  if (current.display_name === displayName) return NextResponse.json({ error: 'That’s already your display name.' }, { status: 400 });

  const next = nextNameChange(current.display_name_changed_at);
  if (next) {
    return NextResponse.json(
      { error: `You can change your display name once every ${NAME_CHANGE_DAYS} days.`, nextChangeAt: new Date(next).toISOString() },
      { status: 429 }
    );
  }

  const changedAt = new Date().toISOString();
  // Only write if nobody changed it in the meantime (two tabs racing can't get two changes in).
  let update = supabase.from('profiles').update({ display_name: displayName, display_name_changed_at: changedAt }).eq('id', session.id);
  update = current.display_name_changed_at ? update.eq('display_name_changed_at', current.display_name_changed_at) : update.is('display_name_changed_at', null);
  const { data: saved, error: saveError } = await update.select('id');
  if (saveError) return NextResponse.json({ error: 'Could not save your display name.' }, { status: 500 });
  if (!Array.isArray(saved) || saved.length !== 1) return NextResponse.json({ error: 'Your name changed at the same time. Reload and try again.' }, { status: 409 });
  return NextResponse.json({ displayName, nameChangedAt: changedAt });
}
