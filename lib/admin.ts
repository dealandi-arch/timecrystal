import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from './supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';
import { type AdminTier, MIN_TIER_FOR, TIER_BY_ID, atLeast, tierOfRow } from '../components/admin/tiers';

// Admins (profiles.is_admin, with a tier in profiles.admin_tier) can fix records and warn players from /admin.
// Every action is checked here, on the server, against the admin's tier, and written to admin_log.
// See components/admin/tiers.ts for the tiers, their spots and what each one can do.

type AdminCheck = { ok: true; adminId: string; tier: AdminTier } | { ok: false; response: NextResponse };

export async function adminTierOf(profileId: string): Promise<AdminTier | null> {
  const supabase = getSupabase();
  let result = await supabase.from('profiles').select('nickname, is_admin, admin_tier').eq('id', profileId).maybeSingle();
  if (result.error) result = await supabase.from('profiles').select('nickname, is_admin').eq('id', profileId).maybeSingle(); // admin_tier not added yet
  return result.error ? null : tierOfRow(result.data as { nickname?: string; is_admin?: boolean; admin_tier?: string } | null);
}

export async function isAdmin(profileId: string): Promise<boolean> {
  return (await adminTierOf(profileId)) !== null;
}

// The Godly Admin (lavatatorr).
export async function isGodly(profileId: string): Promise<boolean> {
  return (await adminTierOf(profileId)) === 'godly';
}

// Admins of at least this tier. Without `min`, any admin.
export async function requireAdmin(req: NextRequest, min: AdminTier = 'admin'): Promise<AdminCheck> {
  if (!isBackendConfigured()) return { ok: false, response: NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 }) };
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return { ok: false, response: NextResponse.json({ error: 'Sign in first.' }, { status: 401 }) };
  const tier = await adminTierOf(session.id);
  if (!tier) return { ok: false, response: NextResponse.json({ error: 'Admins only.' }, { status: 403 }) };
  if (!atLeast(tier, min)) return { ok: false, response: NextResponse.json({ error: `That needs a ${TIER_BY_ID[min].name} or higher.` }, { status: 403 }) };
  return { ok: true, adminId: session.id, tier };
}

export { MIN_TIER_FOR };

export async function logAdmin(adminId: string, targetId: string | null, action: string, detail: string) {
  await getSupabase().from('admin_log').insert({ admin_id: adminId, target_id: targetId, action, detail });
}

// Tiers for many players at once (null = not an admin).
export async function tiersOf(ids: string[]): Promise<Map<string, AdminTier | null>> {
  const out = new Map<string, AdminTier | null>();
  if (!ids.length) return out;
  const supabase = getSupabase();
  type Row = { id: string; nickname: string; is_admin?: boolean; admin_tier?: string };
  let rows: Row[] = [];
  const full = await supabase.from('profiles').select('id, nickname, is_admin, admin_tier').in('id', ids);
  if (full.error) rows = ((await supabase.from('profiles').select('id, nickname, is_admin').in('id', ids)).data ?? []) as Row[];
  else rows = (full.data ?? []) as Row[];
  for (const row of rows) out.set(row.id, tierOfRow(row));
  return out;
}
