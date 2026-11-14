import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../../lib/session';
import { loadCustomLevel } from '../../../../lib/customLevelsServer';

export const dynamic = 'force-dynamic';

// A level that hasn't been verified yet can only be opened by its creator.
async function visibleLevel(req: NextRequest, id: number) {
  const level = await loadCustomLevel(id);
  if (!level) return null;
  if (level.verifiedAt) return level;
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  return session && session.id === level.authorId ? level : null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isBackendConfigured()) return NextResponse.json({ error: 'Public levels are not set up on this server.' }, { status: 503 });
  const level = await visibleLevel(req, Number(params.id));
  if (!level) return NextResponse.json({ error: 'That level doesn’t exist, or its creator hasn’t verified it yet.' }, { status: 404 });
  return NextResponse.json({ level });
}

// Counts a play when someone starts a verified level.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isBackendConfigured()) return NextResponse.json({ ok: false });
  const level = await visibleLevel(req, Number(params.id));
  if (!level) return NextResponse.json({ error: 'That level doesn’t exist.' }, { status: 404 });
  if (!level.verifiedAt) return NextResponse.json({ ok: true, counted: false });
  await getSupabase().from('custom_levels').update({ plays: (level.plays ?? 0) + 1 }).eq('id', level.id);
  return NextResponse.json({ ok: true, counted: true });
}
