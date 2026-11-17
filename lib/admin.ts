import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from './supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';

// Admins (profiles.is_admin) can fix records and warn players from /admin. Every action is checked here,
// on the server, and written to admin_log.

type AdminCheck = { ok: true; adminId: string } | { ok: false; response: NextResponse };

export async function isAdmin(profileId: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('profiles').select('is_admin').eq('id', profileId).maybeSingle();
  return !error && !!(data as { is_admin?: boolean } | null)?.is_admin;
}

// The super admin is the only one who can give heroes or tryouts. Matched by login name (nicknames are unique).
export const SUPER_ADMIN_NICKNAME = 'lavatatorr';

export async function isSuperAdmin(profileId: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('profiles').select('nickname, is_admin').eq('id', profileId).maybeSingle();
  const p = data as { nickname?: string; is_admin?: boolean } | null;
  return !error && !!p?.is_admin && p.nickname?.toLowerCase() === SUPER_ADMIN_NICKNAME;
}

export async function requireAdmin(req: NextRequest): Promise<AdminCheck> {
  if (!isBackendConfigured()) return { ok: false, response: NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 }) };
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return { ok: false, response: NextResponse.json({ error: 'Sign in first.' }, { status: 401 }) };
  if (!(await isAdmin(session.id))) return { ok: false, response: NextResponse.json({ error: 'Admins only.' }, { status: 403 }) };
  return { ok: true, adminId: session.id };
}

export async function logAdmin(adminId: string, targetId: string | null, action: string, detail: string) {
  await getSupabase().from('admin_log').insert({ admin_id: adminId, target_id: targetId, action, detail });
}
