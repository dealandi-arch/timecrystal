import { NextRequest, NextResponse } from 'next/server';
import { conflictError, loadCollection, requireSession, saveCollection, secureRandom, storageError } from '../../../lib/collectionServer';
import { DRAW_COST, type DrawType, drawCards } from '../../../components/rpg/gacha';

// Card gacha: 1 card for 7 shards, 10 cards for 60. The server draws, so results can't be picked.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const type = body?.type as DrawType;
  if (type !== 'single' && type !== 'ten') return NextResponse.json({ error: 'Invalid draw.' }, { status: 400 });

  const current = await loadCollection(auth.profileId);
  if (!current) return storageError();
  if (!current.cardsReady) return NextResponse.json({ error: 'The card gacha is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
  const cost = DRAW_COST[type];
  if (current.shards < cost) return NextResponse.json({ error: `You need ${cost} Emerald Shards.` }, { status: 400 });

  const result = drawCards(type, current.owned, current.cards, secureRandom);
  const next = { shards: current.shards - cost + result.refund, owned: result.owned, cards: result.cards };
  if (!(await saveCollection(auth.profileId, current.shards, next))) return conflictError();
  return NextResponse.json({ ...next, draws: result.draws, refund: result.refund });
}
