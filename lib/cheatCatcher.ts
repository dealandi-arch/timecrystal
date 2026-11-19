import { getSupabase } from './supabase';
import { addNotification } from './notify';
import type { LevelDef } from '../components/rpg/levels';
import { type Replay, REPLAY_EVERY_MS } from '../components/rpg/replay';

// The Cheat catcher checks every finished run's replay (recorded by the game while you play):
// the hero has to have really walked the level, beaten every enemy and reached the crystal, in the time claimed.
// Anything impossible is held back and every admin gets a report with the replay. Nothing is said to the player
// until an admin decides: "Cheat" sends them a reminder, "No cheat" puts the run on the list.
// Admins are never reported.

// The catcher is deliberately quiet: at most this many reports a day go to the admins, and these players are never reported.
const MAX_REPORTS_PER_DAY = 2;
const NEVER_REPORTED = ['lavatatorr'];

// Test servers (TC_TEST_LEVELS=1) play small stand-in levels, so their replays can't match the real ones.
export const replayChecksOn = () => process.env.TC_TEST_LEVELS !== '1';

export function analyzeReplay(level: LevelDef, timeMs: number, replay: unknown): string[] {
  const r = replay as Replay | null;
  if (!r || r.v !== 1 || !Array.isArray(r.samples) || !Array.isArray(r.kills) || !Number.isFinite(r.end)) {
    return ['No replay: the time was sent without the level being played.'];
  }
  const problems: string[] = [];
  if (Math.abs(r.end - timeMs) > 600) problems.push(`The replay lasts ${(r.end / 1000).toFixed(2)}s but the time sent was ${(timeMs / 1000).toFixed(2)}s.`);
  const expected = timeMs / REPLAY_EVERY_MS;
  if (r.samples.length < Math.min(expected * 0.4, expected - 3)) problems.push(`The replay is missing most of the run (${r.samples.length} moments recorded for a ${(timeMs / 1000).toFixed(1)}s run).`);

  // Only clear-cut impossibilities count. Standing "in a wall", fast bursts (skills blink and dash) and finishing a
  // little away from the crystal all have honest explanations (start tiles, abilities, knockback), so they never
  // hold a run back.
  if (r.kills.length < level.enemies.length) problems.push(`Only ${r.kills.length} of the ${level.enemies.length} enemies were beaten.`);
  return problems;
}

import { isAdmin } from './admin';

interface Report {
  profileId: string;
  level: LevelDef;
  timeMs: number;
  reason: string; // what the catcher found, in plain words
  replay: unknown;
  // 'rejected': the run didn't count. 'review': it counted, but looks suspicious for an admin to check.
  status: 'rejected' | 'review';
}

async function playerName(profileId: string): Promise<string> {
  const { data } = await getSupabase().from('profiles').select('nickname').eq('id', profileId).maybeSingle();
  return (data as { nickname?: string } | null)?.nickname ?? `#${profileId}`;
}

// Saves the report and tells every admin. The player hears nothing until an admin decides.
export async function reportCheat(report: Report): Promise<void> {
  const supabase = getSupabase();
  try {
    if (await isAdmin(report.profileId)) return; // admins don't get reported
    if (NEVER_REPORTED.includes((await playerName(report.profileId)).toLowerCase())) return;
    // Only the most suspicious cases: a couple of reports a day, no more.
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: today } = await supabase.from('cheat_reports').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo);
    if ((today ?? 0) >= MAX_REPORTS_PER_DAY) return;
    // One report per player and level every 10 minutes is plenty (rewards and records are checked separately).
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabase.from('cheat_reports').select('id').eq('profile_id', report.profileId).eq('level_id', report.level.id).gte('created_at', since).limit(1);
    if (recent?.length) return;
    const { data: saved, error } = await supabase
      .from('cheat_reports')
      .insert({
        profile_id: report.profileId,
        level_id: report.level.id,
        level_name: report.level.name,
        time_ms: Math.round(report.timeMs),
        reason: report.reason,
        status: report.status === 'rejected' ? 'open' : 'review',
        replay: report.replay ?? null,
        level_snapshot: { grid: report.level.grid, start: report.level.start, enemies: report.level.enemies, crystalPath: report.level.crystalPath, name: report.level.name },
      })
      .select('id')
      .single();
    if (error || !saved) return;
    const name = await playerName(report.profileId);
    const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
    for (const a of (admins ?? []) as { id: string }[]) {
      await addNotification(
        a.id,
        'info',
        `Cheat catcher: ${name} on ${report.level.name}`,
        `${report.status === 'rejected' ? 'Held back' : 'Counted but suspicious'}: ${(report.timeMs / 1000).toFixed(2)}s. ${report.reason} Watch the replay and choose Cheat or No cheat: Admin → Cheat catcher → report #${saved.id}.`
      );
    }
  } catch {
    /* reports table not set up yet: the run is still refused */
  }
}

// Saves the replay of a run that became the player's best, so admins can watch any record later.
export async function keepReplay(profileId: string, levelId: number, timeMs: number, replay: unknown) {
  try {
    await getSupabase().from('run_replays').upsert({ profile_id: profileId, level_id: levelId, time_ms: Math.round(timeMs), replay, created_at: new Date().toISOString() });
  } catch {
    /* not set up yet */
  }
}
