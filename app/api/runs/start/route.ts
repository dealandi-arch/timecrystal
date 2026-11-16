import { NextRequest, NextResponse } from 'next/server';
import { isBackendConfigured } from '../../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../../lib/session';
import { createRunTicket } from '../../../../lib/runCheck';

// A signed start ticket for a level (see lib/runCheck.ts). Finished runs must bring it back.
export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ ticket: null });
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ ticket: null });
  const body = await req.json().catch(() => null);
  const levelId = Number(body?.levelId);
  if (!Number.isInteger(levelId) || levelId < 1) return NextResponse.json({ error: 'Invalid level.' }, { status: 400 });
  return NextResponse.json({ ticket: createRunTicket(session.id, levelId) });
}
