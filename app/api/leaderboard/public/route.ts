import { NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { buildGroupRank } from '../../../../lib/groupRank';
import { CUSTOM_ID_OFFSET } from '../../../../components/rpg/customLevels';

export const dynamic = 'force-dynamic';

// The Public Levels Rank: who has cleared the most verified public levels, and fastest.
export async function GET() {
  if (!isBackendConfigured()) return NextResponse.json({ overall: [], maps: {}, levels: [] });
  const { data, error } = await getSupabase()
    .from('custom_levels')
    .select('id, name')
    .not('verified_at', 'is', null)
    .order('plays', { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: 'Could not load the Public Levels Rank.' }, { status: 500 });
  const levels = ((data ?? []) as { id: number; name: string }[]).map((l) => ({ id: CUSTOM_ID_OFFSET + l.id, name: l.name, levelId: l.id }));
  const rank = await buildGroupRank(levels.map((l) => l.id));
  if (!rank) return NextResponse.json({ error: 'Could not load the Public Levels Rank.' }, { status: 500 });
  return NextResponse.json({ ...rank, levels });
}
