import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { requireSession } from '../../../../lib/collectionServer';
import { AVATAR_COLORS, isValidAvatar } from '../../../../components/profile/avatarData';

// Saves the signed-in player's 32×32 avatar (or clears it with pixels: null) and avatar colour.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const pixels = body?.pixels ?? null;
  const color = body?.color;
  if (pixels !== null && !isValidAvatar(pixels)) return NextResponse.json({ error: 'That avatar is not valid.' }, { status: 400 });
  if (!AVATAR_COLORS.includes(color)) return NextResponse.json({ error: 'Pick one of the avatar colours.' }, { status: 400 });

  const { error } = await getSupabase().from('profiles').update({ avatar_pixels: pixels, avatar_color: color }).eq('id', auth.profileId);
  if (error) return NextResponse.json({ error: 'Avatars are not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
  return NextResponse.json({ avatarPixels: pixels, avatarColor: color });
}
