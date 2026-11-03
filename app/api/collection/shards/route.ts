import { NextRequest, NextResponse } from 'next/server';
import { conflictError, loadCollection, requireSession, saveCollection, storageError } from '../../../../lib/collectionServer';
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
    const next = { ...current, shards: current.shards + count };
    if (await saveCollection(auth.profileId, current.shards, next)) return NextResponse.json(next);
  }
  return conflictError();
}
