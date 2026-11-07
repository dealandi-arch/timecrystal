import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { requireSession } from '../../../../lib/collectionServer';
import { MAX_RECENT_HEROES } from '../../../../lib/profileFields';
import { SIGNATURE_WEAPONS } from '../../../../components/rpg/weapons';

// Records the hero a signed-in player just picked, for "recently used" on their profile.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const characterId = String(body?.characterId ?? '');
  if (!Object.prototype.hasOwnProperty.call(SIGNATURE_WEAPONS, characterId)) {
    return NextResponse.json({ error: 'Unknown hero.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('profiles').select('recent_characters').eq('id', auth.profileId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Recent heroes are not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });

  const previous = ((data.recent_characters ?? []) as string[]).filter((id) => id !== characterId);
  const recent = [characterId, ...previous].slice(0, MAX_RECENT_HEROES);
  await supabase.from('profiles').update({ recent_characters: recent, last_seen_at: new Date().toISOString() }).eq('id', auth.profileId);
  return NextResponse.json({ recent });
}
