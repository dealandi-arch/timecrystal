import { NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { START_RATING } from '../../../../lib/pvp';
import { shownNameOf } from '../../../../lib/profileFields';

export const dynamic = 'force-dynamic';

// The PvP rank: highest rating first, for players with at least one race.
export async function GET() {
  if (!isBackendConfigured()) return NextResponse.json({ entries: [] });
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, nickname, display_name, avatar_color, pvp_rating, pvp_wins, pvp_losses')
    .or('pvp_wins.gt.0,pvp_losses.gt.0')
    .order('pvp_rating', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ entries: [], notReady: true });
  const entries = ((data ?? []) as { id: string; nickname: string; display_name?: string | null; avatar_color: string; pvp_rating: number | null; pvp_wins: number | null; pvp_losses: number | null }[]).map((p) => ({
    profileId: p.id,
    name: shownNameOf(p),
    avatarColor: p.avatar_color,
    rating: p.pvp_rating ?? START_RATING,
    wins: p.pvp_wins ?? 0,
    losses: p.pvp_losses ?? 0,
  }));
  return NextResponse.json({ entries });
}
