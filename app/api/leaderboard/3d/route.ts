import { NextResponse } from 'next/server';
import { isBackendConfigured } from '../../../../lib/supabase';
import { buildGroupRank } from '../../../../lib/groupRank';
import { LEVEL_IDS_3D } from '../../../../components/rpg/levels3d';

export const dynamic = 'force-dynamic';

// The 3D World Rank across the 3D maps.
export async function GET() {
  if (!isBackendConfigured()) return NextResponse.json({ overall: [], maps: {} });
  const rank = await buildGroupRank(LEVEL_IDS_3D);
  if (!rank) return NextResponse.json({ error: 'Could not load the 3D World Rank.' }, { status: 500 });
  return NextResponse.json(rank);
}
