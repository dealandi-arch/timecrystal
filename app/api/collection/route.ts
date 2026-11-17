import { NextRequest, NextResponse } from 'next/server';
import { loadCollection, requireSession, storageError } from '../../../lib/collectionServer';
import { getSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const collection = await loadCollection(auth.profileId);
  if (!collection) return storageError();
  // Tryouts saved on the profile (e.g. given by an admin): { heroId: ends ISO }.
  const { data } = await getSupabase().from('profiles').select('trials').eq('id', auth.profileId).maybeSingle();
  return NextResponse.json({ ...collection, trials: (data as { trials?: Record<string, string> } | null)?.trials ?? {} });
}
