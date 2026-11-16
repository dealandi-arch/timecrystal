import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/admin';

export const dynamic = 'force-dynamic';

// Cheat catcher reports: 'open' (run refused), 'review' (counted but suspicious), or decided ones.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  const status = req.nextUrl.searchParams.get('status') ?? 'todo';
  let q = getSupabase().from('cheat_reports').select('id, profile_id, level_id, level_name, time_ms, reason, status, created_at, replay, profiles ( nickname )');
  q = status === 'todo' ? q.in('status', ['open', 'review']) : q.in('status', ['confirmed', 'cleared']);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ reports: [], notReady: true });
  const reports = ((data ?? []) as unknown as { id: number; profile_id: string; level_id: number; level_name: string; time_ms: number; reason: string; status: string; created_at: string; replay: unknown; profiles: { nickname: string } | { nickname: string }[] | null }[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return { id: r.id, profileId: r.profile_id, player: p?.nickname ?? `#${r.profile_id}`, levelId: r.level_id, levelName: r.level_name, timeMs: r.time_ms, reason: r.reason, status: r.status, createdAt: r.created_at, hasReplay: !!r.replay };
  });
  return NextResponse.json({ reports });
}
