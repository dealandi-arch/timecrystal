import { getSupabase } from './supabase';
import { addNotification } from './notify';
import { FLOOR, type LevelDef } from '../components/rpg/levels';
import { kindAt } from '../components/rpg/terrain';
import { type Replay, REPLAY_EVERY_MS } from '../components/rpg/replay';

// The Cheat catcher checks every finished run's replay (recorded by the game while you play):
// the hero has to have really walked the level, beaten every enemy and reached the crystal, in the time claimed.
// Anything impossible is refused; the player gets a reminder, and every admin gets a report with the replay
// so they can watch exactly how it was done.

const FASTEST_TILES_PER_S = 25; // 40ms steps at the very fastest
const ALLOWED_JUMPS = 6; // blink/dash/teleport skills move several tiles at once a few times per run

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

  let jumps = 0;
  let wallAt: number | null = null;
  const solidAt = (x: number, y: number) => {
    const tile = level.grid[y]?.[x];
    return tile === undefined || (tile !== FLOOR && tile !== 2) || kindAt(level, x, y) === 'fence';
  };
  for (let i = 0; i < r.samples.length; i++) {
    const [t, x10, y10] = r.samples[i];
    if (!Number.isFinite(t) || !Number.isFinite(x10) || !Number.isFinite(y10)) {
      problems.push('The replay is broken.');
      break;
    }
    // Between two tiles (mid-step), both tiles have to be open.
    const xs = [Math.floor(x10 / 10), Math.ceil(x10 / 10)];
    const ys = [Math.floor(y10 / 10), Math.ceil(y10 / 10)];
    if (wallAt === null && xs.some((x) => ys.some((y) => solidAt(x, y)))) wallAt = t;
    if (i > 0) {
      const [pt, px10, py10] = r.samples[i - 1];
      const dt = Math.max(1, t - pt) / 1000;
      const dist = Math.abs(x10 - px10) / 10 + Math.abs(y10 - py10) / 10;
      if (dist / dt > FASTEST_TILES_PER_S * 1.3 && dist > 1.5) jumps++;
    }
  }
  if (wallAt !== null) problems.push(`The hero stood inside a wall at ${(wallAt / 1000).toFixed(1)}s.`);
  if (jumps > ALLOWED_JUMPS) problems.push(`The hero moved impossibly fast ${jumps} times.`);
  if (r.kills.length < level.enemies.length) problems.push(`Only ${r.kills.length} of the ${level.enemies.length} enemies were beaten.`);
  const last = r.samples[r.samples.length - 1];
  if (last) {
    const lx = last[1] / 10;
    const ly = last[2] / 10;
    const nearCrystal = level.crystalPath.some((p) => Math.abs(p.x - lx) + Math.abs(p.y - ly) <= 1.5);
    if (!nearCrystal) problems.push('The run finished nowhere near the crystal.');
  }
  return problems;
}

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

// Saves the report, reminds the player (only when the run was refused) and tells every admin.
export async function reportCheat(report: Report): Promise<void> {
  const supabase = getSupabase();
  try {
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
    if (report.status === 'rejected') {
      await addNotification(
        report.profileId,
        'warning',
        'Reminder: play fair',
        `The Cheat catcher stopped your run on ${report.level.name} (${(report.timeMs / 1000).toFixed(2)}s): ${report.reason} It didn’t count, and the admins have been sent the replay to review.`
      );
    }
    const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
    for (const a of (admins ?? []) as { id: string }[]) {
      await addNotification(
        a.id,
        'info',
        `Cheat catcher: ${name} on ${report.level.name}`,
        `${report.status === 'rejected' ? 'Refused' : 'Counted but suspicious'}: ${(report.timeMs / 1000).toFixed(2)}s. ${report.reason} Watch the replay: Admin → Cheat catcher → report #${saved.id}.`
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
