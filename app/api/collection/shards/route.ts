import { NextRequest, NextResponse } from 'next/server';
import { conflictError, loadCollection, requireSession, saveCollection, storageError } from '../../../../lib/collectionServer';
import { bumpDaily } from '../../../../lib/daily';
import { SHARDS_PER_LEVEL } from '../../../../components/rpg/gacha';

// Called when a hidden Emerald Shard is picked up in a level.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const count = Number(body?.count);
  if (!Number.isInteger(count) || count < 1 || count > SHARDS_PER_LEVEL) {
    return NextResponse.json({ error: 'Invalid shard count.' }, { status: 400 });
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await loadCollection(auth.profileId);
    if (!current) return storageError();
    // Only shards change here; cards are left alone (and work before the hero_cards column exists).
    const next = { shards: current.shards + count, owned: current.owned };
    if (await saveCollection(auth.profileId, current.shards, next)) {
      await bumpDaily(auth.profileId, 'shards5', count); // daily quest: find 5 shards
      return NextResponse.json({ ...next, cards: current.cards });
    }
  }
  return conflictError();
}
