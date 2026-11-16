import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../../lib/supabase';
import { requireAdmin } from '../../../../../lib/admin';
import { selectWithFallback, shownNameOf } from '../../../../../lib/profileFields';

export const dynamic = 'force-dynamic';

// Everything an admin needs to review a player: their records, Craze scores, and past admin actions on them.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  const supabase = getSupabase();
  const { data: p } = await selectWithFallback(
    (cols) => supabase.from('profiles').select(cols).eq('id', params.id).maybeSingle(),
    'id, nickname, display_name, is_admin, aizodon, emerald_shards, last_seen_at',
    'id, nickname, is_admin, aizodon, emerald_shards, last_seen_at'
  );
  if (!p) return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
  const profile = p as unknown as { id: string; nickname: string; display_name?: string | null; is_admin?: boolean; aizodon?: number; emerald_shards?: number; last_seen_at?: string | null };
  const [{ data: runs }, { data: craze }, { data: log }] = await Promise.all([
    supabase.from('best_runs').select('level_id, time_ms, kills, completed_at').eq('profile_id', params.id).order('level_id', { ascending: true }),
    supabase.from('craze_scores').select('minutes, kills, achieved_at').eq('profile_id', params.id).order('minutes', { ascending: true }),
    supabase.from('admin_log').select('id, admin_id, action, detail, created_at').eq('target_id', params.id).order('created_at', { ascending: false }).limit(20),
  ]);
  return NextResponse.json({
    player: { id: profile.id, nickname: profile.nickname, displayName: shownNameOf(profile), isAdmin: !!profile.is_admin, aizodon: profile.aizodon ?? 0, shards: profile.emerald_shards ?? 0, lastSeenAt: profile.last_seen_at ?? null },
    runs: (runs ?? []).map((r) => ({ levelId: r.level_id, timeMs: r.time_ms, kills: r.kills, completedAt: r.completed_at })),
    craze: (craze ?? []).map((c) => ({ minutes: c.minutes, kills: c.kills, achievedAt: c.achieved_at })),
    log: (log ?? []).map((l) => ({ id: l.id, adminId: l.admin_id, action: l.action, detail: l.detail, createdAt: l.created_at })),
  });
}
