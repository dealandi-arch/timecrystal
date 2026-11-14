import { NextResponse } from 'next/server';
import { isBackendConfigured } from '../../../../lib/supabase';
import { buildGroupRank } from '../../../../lib/groupRank';
import { PARKSTER_EVENT_LEVELS } from '../../../../components/rpg/events';

export const dynamic = 'force-dynamic';

// The Event Rank: everyone's times on the event levels, separate from the main World's Best lists.
export async function GET() {
  const levels = PARKSTER_EVENT_LEVELS.map((l) => ({ id: l.id, name: l.name.replace('Parkster Event · ', '') }));
  if (!isBackendConfigured()) return NextResponse.json({ overall: [], maps: {}, levels });
  const rank = await buildGroupRank(levels.map((l) => l.id));
  if (!rank) return NextResponse.json({ error: 'Could not load the Event Rank.' }, { status: 500 });
  return NextResponse.json({ ...rank, levels });
}
