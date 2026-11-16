import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../../lib/supabase';
import { logAdmin, requireAdmin } from '../../../../../lib/admin';
import { addNotification } from '../../../../../lib/notify';

export const dynamic = 'force-dynamic';

// One report, with its replay and the level it was on, for the replay viewer.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  const { data, error } = await getSupabase().from('cheat_reports').select('*').eq('id', Number(params.id)).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  const { data: who } = await getSupabase().from('profiles').select('nickname').eq('id', data.profile_id).maybeSingle();
  return NextResponse.json({
    report: {
      id: data.id,
      profileId: data.profile_id,
      player: (who as { nickname?: string } | null)?.nickname ?? `#${data.profile_id}`,
      levelId: data.level_id,
      levelName: data.level_name,
      timeMs: data.time_ms,
      reason: data.reason,
      status: data.status,
      createdAt: data.created_at,
      replay: data.replay,
      level: data.level_snapshot,
    },
  });
}

// Decide a report.
//   confirm: it was cheating. A record that counted is removed, and the player is warned.
//   clear:   not cheating after all.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== 'confirm' && decision !== 'clear') return NextResponse.json({ error: 'Choose confirm or clear.' }, { status: 400 });
  const supabase = getSupabase();
  const { data: r } = await supabase.from('cheat_reports').select('id, profile_id, level_id, level_name, time_ms, status').eq('id', Number(params.id)).maybeSingle();
  if (!r) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  let removed = false;
  if (decision === 'confirm') {
    // Remove the record if it's the time that was reported (a refused run never made it onto the list).
    const { data: gone } = await supabase.from('best_runs').delete().eq('profile_id', r.profile_id).eq('level_id', r.level_id).eq('time_ms', r.time_ms).select('level_id');
    removed = !!gone?.length;
    await addNotification(
      r.profile_id,
      'warning',
      'Cheating confirmed',
      `An admin watched the replay of your ${(r.time_ms / 1000).toFixed(2)}s run on ${r.level_name} and confirmed it wasn’t played fairly.${removed ? ' That time has been removed.' : ''} Next time your records may all be removed.`
    );
  }
  await supabase.from('cheat_reports').update({ status: decision === 'confirm' ? 'confirmed' : 'cleared', reviewed_by: admin.adminId, reviewed_at: new Date().toISOString() }).eq('id', r.id);
  await logAdmin(admin.adminId, r.profile_id, decision === 'confirm' ? 'confirmCheat' : 'clearReport', `report #${r.id} (${r.level_name}, ${(r.time_ms / 1000).toFixed(2)}s)${removed ? ', record removed' : ''}`);
  return NextResponse.json({ ok: true, removed });
}
