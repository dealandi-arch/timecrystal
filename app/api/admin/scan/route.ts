import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { logAdmin, requireAdmin } from '../../../../lib/admin';
import { getAnyLevel } from '../../../../components/rpg/levels3d';
import { fastestPossibleMs } from '../../../../lib/runCheck';

export const dynamic = 'force-dynamic';

// Scans every World's Best time already saved for signs of cheating and files a report for each one
// (status 'review', so admins can watch and decide). Runs from before the Cheat catcher have no replay.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  const supabase = getSupabase();
  const { data: rows, error } = await supabase.from('best_runs').select('profile_id, level_id, time_ms').limit(20000);
  if (error) return NextResponse.json({ error: 'Could not read the records.' }, { status: 500 });
  const runs = (rows ?? []) as { profile_id: string; level_id: number; time_ms: number }[];

  const flags = new Map<string, { profileId: string; levelId: number; timeMs: number; reasons: string[] }>();
  const flag = (r: (typeof runs)[number], reason: string) => {
    const key = `${r.profile_id}:${r.level_id}`;
    const f = flags.get(key) ?? { profileId: r.profile_id, levelId: r.level_id, timeMs: r.time_ms, reasons: [] };
    f.reasons.push(reason);
    flags.set(key, f);
  };

  // 1. Faster than anyone could possibly finish the level.
  for (const r of runs) {
    const level = getAnyLevel(r.level_id);
    if (level && r.time_ms < fastestPossibleMs(level)) flag(r, `Faster than the fastest possible time for this level (${(fastestPossibleMs(level) / 1000).toFixed(2)}s).`);
  }
  // 2. The same player with exactly the same time on 3 or more different levels (like a typed-in time).
  const byPlayerTime = new Map<string, typeof runs>();
  for (const r of runs) {
    const key = `${r.profile_id}:${Math.round(r.time_ms / 10)}`;
    byPlayerTime.set(key, [...(byPlayerTime.get(key) ?? []), r]);
  }
  for (const group of byPlayerTime.values()) {
    if (group.length >= 3) for (const r of group) flag(r, `The exact same time (${(r.time_ms / 1000).toFixed(2)}s) on ${group.length} different levels.`);
  }
  // 3. A record more than 40% faster than second place.
  const byLevel = new Map<number, typeof runs>();
  for (const r of runs) byLevel.set(r.level_id, [...(byLevel.get(r.level_id) ?? []), r]);
  for (const list of byLevel.values()) {
    const sorted = [...list].sort((a, b) => a.time_ms - b.time_ms);
    if (sorted.length >= 2 && sorted[0].time_ms < sorted[1].time_ms * 0.6) flag(sorted[0], `Record more than 40% faster than second place (${(sorted[1].time_ms / 1000).toFixed(2)}s).`);
  }

  // Skip ones already reported for the same time.
  const { data: existing } = await supabase.from('cheat_reports').select('profile_id, level_id, time_ms');
  const seen = new Set(((existing ?? []) as { profile_id: string; level_id: number; time_ms: number }[]).map((e) => `${e.profile_id}:${e.level_id}:${e.time_ms}`));
  const fresh = [...flags.values()].filter((f) => !seen.has(`${f.profileId}:${f.levelId}:${f.timeMs}`));
  if (fresh.length) {
    const { data: replays } = await supabase.from('run_replays').select('profile_id, level_id, time_ms, replay');
    const replayFor = new Map(((replays ?? []) as { profile_id: string; level_id: number; time_ms: number; replay: unknown }[]).map((r) => [`${r.profile_id}:${r.level_id}:${r.time_ms}`, r.replay]));
    await supabase.from('cheat_reports').insert(
      fresh.map((f) => {
        const level = getAnyLevel(f.levelId);
        return {
          profile_id: f.profileId,
          level_id: f.levelId,
          level_name: level?.name ?? (f.levelId > 100000 ? `Public level #${f.levelId - 100000}` : `Level ${f.levelId}`),
          time_ms: f.timeMs,
          reason: 'Found by a records scan: ' + f.reasons.join(' '),
          status: 'review',
          replay: replayFor.get(`${f.profileId}:${f.levelId}:${f.timeMs}`) ?? null,
          level_snapshot: level ? { grid: level.grid, start: level.start, enemies: level.enemies, crystalPath: level.crystalPath, name: level.name } : null,
        };
      })
    );
  }
  await logAdmin(admin.adminId, null, 'scan', `scanned ${runs.length} records, ${flags.size} suspicious, ${fresh.length} new reports`);
  return NextResponse.json({ scanned: runs.length, suspicious: flags.size, newReports: fresh.length });
}
