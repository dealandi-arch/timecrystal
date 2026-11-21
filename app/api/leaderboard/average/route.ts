import { NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { BASE_PUBLIC, WITH_AVATAR, WITH_NAME, selectWithFallback, shownNameOf } from '../../../../lib/profileFields';
import { CUSTOM_ID_OFFSET } from '../../../../components/rpg/customLevels';

export const dynamic = 'force-dynamic';

const PAGE = 1000;
const MAX_ROWS = 100000;

type Row = { profile_id: string; level_id: number; time_ms: number };
type LeaderProfile = { id: string; nickname: string; display_name?: string | null; avatar_color: string; avatar_pixels?: string | null };

// The Average World Rank: on every level a player has played, their place on that level's World's Best list
// (1 = fastest; ties share a place), averaged to 3 decimal places. The lowest average ranks first, and players who've
// played more levels come first when averages tie. Public (player-made) levels aren't counted.
export async function GET() {
  if (!isBackendConfigured()) return NextResponse.json({ entries: [] });
  const supabase = getSupabase();
  const rows: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from('best_runs')
      .select('profile_id, level_id, time_ms')
      .lt('level_id', CUSTOM_ID_OFFSET)
      .order('level_id', { ascending: true })
      .order('time_ms', { ascending: true })
      .order('profile_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ entries: [], error: 'Could not load the rank.' }, { status: 500 });
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }

  // Place on each level (rows arrive sorted by level, then fastest first).
  const totals = new Map<string, { sum: number; levels: number }>();
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j < rows.length && rows[j].level_id === rows[i].level_id) j++;
    let place = 1;
    for (let k = i; k < j; k++) {
      if (k > i && rows[k].time_ms > rows[k - 1].time_ms) place = k - i + 1;
      const entry = totals.get(rows[k].profile_id) ?? { sum: 0, levels: 0 };
      entry.sum += place;
      entry.levels += 1;
      totals.set(rows[k].profile_id, entry);
    }
    i = j;
  }

  const ranked = [...totals.entries()]
    .map(([profileId, t]) => ({ profileId, average: Math.round((t.sum / t.levels) * 1000) / 1000, levels: t.levels }))
    .sort((a, b) => a.average - b.average || b.levels - a.levels)
    .slice(0, 200);

  const ids = ranked.map((r) => r.profileId);
  const { data: profiles } = await selectWithFallback(
    (columns) => supabase.from('profiles').select(columns).in('id', ids),
    WITH_NAME,
    WITH_AVATAR,
    BASE_PUBLIC
  );
  const byId = new Map(((profiles ?? []) as unknown as LeaderProfile[]).map((p) => [p.id, p]));
  const entries = ranked.map((r, index) => {
    const p = byId.get(r.profileId);
    return {
      rank: index + 1,
      profileId: r.profileId,
      nickname: p?.nickname ?? 'Unknown',
      displayName: p ? shownNameOf(p) : 'Unknown',
      avatarColor: p?.avatar_color ?? '#888888',
      avatarPixels: p?.avatar_pixels ?? null,
      average: r.average,
      levels: r.levels,
    };
  });
  return NextResponse.json({ entries });
}
