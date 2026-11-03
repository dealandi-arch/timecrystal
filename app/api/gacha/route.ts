import { NextRequest, NextResponse } from 'next/server';
import { conflictError, loadCollection, requireSession, saveCollection, secureRandom, storageError } from '../../../lib/collectionServer';
import { PULL_COST, type PullType, rollPull } from '../../../components/rpg/gacha';

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const type = body?.type as PullType;
  if (type !== 'normal' && type !== 'lucky') return NextResponse.json({ error: 'Invalid summon type.' }, { status: 400 });

  const current = await loadCollection(auth.profileId);
  if (!current) return storageError();
  const cost = PULL_COST[type];
  if (current.shards < cost) return NextResponse.json({ error: `You need ${cost} Emerald Shards.` }, { status: 400 });

  const result = rollPull(type, current.owned, secureRandom);
  const next = {
    shards: current.shards - cost + result.refund,
    owned: result.duplicate ? current.owned : [...current.owned, result.characterId],
  };
  if (!(await saveCollection(auth.profileId, current.shards, next))) return conflictError();
  return NextResponse.json({ ...next, result });
}
