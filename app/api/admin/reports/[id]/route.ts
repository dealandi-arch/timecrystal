import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../../lib/supabase';
import { logAdmin, requireAdmin } from '../../../../../lib/admin';
import { addNotification } from '../../../../../lib/notify';
import { keepReplay } from '../../../../../lib/cheatCatcher';

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
  const { data: r } = await supabase.from('cheat_reports').select('id, profile_id, level_id, level_name, time_ms, status, replay').eq('id', Number(params.id)).maybeSingle();
  if (!r) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  let removed = false;
  let counted = false;
  if (decision === 'clear' && r.status === 'open') {
    // A held-back run that wasn't cheating after all: it goes on the list if it's the player's best.
    const { data: best } = await supabase.from('best_runs').select('time_ms').eq('profile_id', r.profile_id).eq('level_id', r.level_id).maybeSingle();
    if (!best || r.time_ms < best.time_ms) {
      await supabase.from('best_runs').upsert({ profile_id: r.profile_id, level_id: r.level_id, time_ms: r.time_ms, kills: 0, secrets: 0, completed_at: new Date().toISOString() });
      if (r.replay) await keepReplay(r.profile_id, r.level_id, r.time_ms, r.replay);
      counted = true;
    }
    await addNotification(r.profile_id, 'info', 'Your run counts', `An admin checked your ${(r.time_ms / 1000).toFixed(2)}s run on ${r.level_name}. It’s fine${counted ? ', and it’s now on the list' : ''}.`);
  }
  if (decision === 'confirm') {
    // Remove the record if it's the time that was reported (a refused run never made it onto the list).
    const { data: gone } = await supabase.from('best_runs').delete().eq('profile_id', r.profile_id).eq('level_id', r.level_id).eq('time_ms', r.time_ms).select('level_id');
    removed = !!gone?.length;
    await addNotification(
      r.profile_id,
      'warning',
      'Reminder: play fair',
      `An admin watched the replay of your ${(r.time_ms / 1000).toFixed(2)}s run on ${r.level_name} and found it wasn’t played fairly, so it doesn’t count${removed ? ' and has been removed' : ''}. Please play fair: next time your records may all be removed.`
    );
  }
  await supabase.from('cheat_reports').update({ status: decision === 'confirm' ? 'confirmed' : 'cleared', reviewed_by: admin.adminId, reviewed_at: new Date().toISOString() }).eq('id', r.id);
  await logAdmin(admin.adminId, r.profile_id, decision === 'confirm' ? 'cheat' : 'noCheat', `report #${r.id} (${r.level_name}, ${(r.time_ms / 1000).toFixed(2)}s)${removed ? ', record removed' : ''}${counted ? ', run put on the list' : ''}`);
  return NextResponse.json({ ok: true, removed, counted });
}
