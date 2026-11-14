import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { requireSession } from '../../../lib/collectionServer';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../lib/session';
import { LEVEL_COLUMNS, LEVEL_COLUMNS_NO_NAME, levelsStorageError, toInfo } from '../../../lib/customLevelsServer';
import { selectWithFallback } from '../../../lib/profileFields';
import { CUSTOM_LIMITS, validateCustomLevel } from '../../../components/rpg/customLevels';

export const dynamic = 'force-dynamic';

// Public levels: verified ones only, newest first (or most played with ?sort=popular).
// ?mine=1 lists the signed-in player's own levels, verified or not.
export async function GET(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ levels: [] });
  const popular = req.nextUrl.searchParams.get('sort') === 'popular';
  const mine = req.nextUrl.searchParams.get('mine') === '1';
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (mine && !session) return NextResponse.json({ levels: [] });

  const { data, error } = await selectWithFallback(
    (columns) => {
      const query = getSupabase().from('custom_levels').select(columns);
      const filtered = mine && session ? query.eq('author_id', session.id) : query.not('verified_at', 'is', null);
      return filtered.order(popular ? 'plays' : 'created_at', { ascending: false }).limit(100);
    },
    LEVEL_COLUMNS,
    LEVEL_COLUMNS_NO_NAME
  );
  if (error) return levelsStorageError();
  // The list doesn't need every tile; the play page loads the full map.
  const levels = (data ?? []).map((row) => {
    const info = toInfo(row as never);
    return { ...info, map: undefined, enemies: info.map.enemies.length };
  });
  return NextResponse.json({ levels });
}

// Publish a level (signed-in players). It stays hidden until its creator beats it once.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const problem = validateCustomLevel(body?.name, body?.mode, body?.map);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const supabase = getSupabase();
  const { count, error: countError } = await supabase.from('custom_levels').select('id', { count: 'exact', head: true }).eq('author_id', auth.profileId);
  if (countError) return levelsStorageError();
  if ((count ?? 0) >= CUSTOM_LIMITS.perAuthor) {
    return NextResponse.json({ error: `You can publish up to ${CUSTOM_LIMITS.perAuthor} levels.` }, { status: 400 });
  }
  const map = body.map;
  const { data, error } = await supabase
    .from('custom_levels')
    .insert({
      author_id: auth.profileId,
      name: String(body.name).trim(),
      mode: body.mode,
      data: { rows: map.rows, dark: map.dark, start: map.start, enemies: map.enemies, crystalPath: map.crystalPath },
    })
    .select('id')
    .single();
  if (error || !data) return levelsStorageError();
  return NextResponse.json({ id: data.id });
}
