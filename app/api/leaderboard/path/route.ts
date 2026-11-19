import { NextRequest, NextResponse } from 'next/server';
import { isBackendConfigured } from '../../../../lib/supabase';
import { buildGroupRank } from '../../../../lib/groupRank';
import { getPath, pathLevelIds } from '../../../../components/rpg/paths';

export const dynamic = 'force-dynamic';

// A path's World Rank: everyone's best time on each of its 11 levels, and the overall standings.
export async function GET(req: NextRequest) {
  const path = getPath(req.nextUrl.searchParams.get('path') ?? '');
  if (!path) return NextResponse.json({ error: 'Unknown path.' }, { status: 400 });
  if (!isBackendConfigured()) return NextResponse.json({ overall: [], maps: {} });
  const rank = await buildGroupRank(pathLevelIds(path.id));
  if (!rank) return NextResponse.json({ error: 'Could not load the rank.' }, { status: 500 });
  return NextResponse.json(rank);
}
