import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// Your unread notifications (newest first).
export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ notifications: [] });
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ notifications: [] });
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('id, kind, title, message, created_at')
    .eq('profile_id', session.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ notifications: [] }); // table not set up yet
  return NextResponse.json({
    notifications: (data ?? []).map((n) => ({ id: n.id, kind: n.kind, title: n.title, message: n.message, createdAt: n.created_at })),
  });
}

// Mark one of your notifications as read.
export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ ok: false });
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
  await getSupabase().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('profile_id', session.id);
  return NextResponse.json({ ok: true });
}
