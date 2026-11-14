import { getSupabase } from './supabase';
import { BASE_PUBLIC, WITH_AVATAR, WITH_NAME, selectWithFallback, shownNameOf } from './profileFields';

// A ranking across a group of levels (the 3D maps, an event, every public level):
// players who cleared more of them rank higher, then the lowest total of their best times.
type LeaderProfile = { id: string; nickname: string; display_name?: string | null; avatar_color: string; avatar_pixels?: string | null };
type Row = { level_id: number; time_ms: number; profiles: LeaderProfile | LeaderProfile[] | null };

export interface RankPlayer {
  profileId: string;
  nickname: string;
  displayName: string;
  avatarColor: string;
  avatarPixels: string | null;
}
export interface GroupRank {
  overall: (RankPlayer & { totalMs: number; maps: number })[];
  maps: Record<number, (RankPlayer & { timeMs: number })[]>;
}

export async function buildGroupRank(levelIds: number[]): Promise<GroupRank | null> {
  const maps: GroupRank['maps'] = {};
  for (const id of levelIds) maps[id] = [];
  if (!levelIds.length) return { overall: [], maps };
  const { data, error } = await selectWithFallback(
    (profileColumns) =>
      getSupabase()
        .from('best_runs')
        .select(`level_id, time_ms, profiles ( ${profileColumns} )`)
        .in('level_id', levelIds)
        .order('time_ms', { ascending: true })
        .limit(5000),
    WITH_NAME,
    WITH_AVATAR,
    BASE_PUBLIC
  );
  if (error) return null;

  const players = new Map<string, RankPlayer & { totalMs: number; maps: number }>();
  for (const row of (data ?? []) as unknown as Row[]) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile) continue;
    const who: RankPlayer = { profileId: profile.id, nickname: profile.nickname, displayName: shownNameOf(profile), avatarColor: profile.avatar_color, avatarPixels: profile.avatar_pixels ?? null };
    if (maps[row.level_id] && maps[row.level_id].length < 20) maps[row.level_id].push({ ...who, timeMs: row.time_ms });
    const entry = players.get(profile.id) ?? { ...who, totalMs: 0, maps: 0 };
    entry.totalMs += row.time_ms;
    entry.maps += 1;
    players.set(profile.id, entry);
  }
  const overall = [...players.values()].sort((a, b) => b.maps - a.maps || a.totalMs - b.totalMs).slice(0, 100);
  return { overall, maps };
}
