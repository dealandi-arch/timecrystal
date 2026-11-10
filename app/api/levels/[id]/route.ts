import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../../lib/supabase';
import { loadCustomLevel } from '../../../../lib/customLevelsServer';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isBackendConfigured()) return NextResponse.json({ error: 'Public levels are not set up on this server.' }, { status: 503 });
  const level = await loadCustomLevel(Number(params.id));
  if (!level) return NextResponse.json({ error: 'That level doesn’t exist.' }, { status: 404 });
  return NextResponse.json({ level });
}

// Counts a play when someone starts the level.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isBackendConfigured()) return NextResponse.json({ ok: false });
  const level = await loadCustomLevel(Number(params.id));
  if (!level) return NextResponse.json({ error: 'That level doesn’t exist.' }, { status: 404 });
  await getSupabase().from('custom_levels').update({ plays: (level.plays ?? 0) + 1 }).eq('id', level.id);
  return NextResponse.json({ ok: true });
}
