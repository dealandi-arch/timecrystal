import { NextRequest, NextResponse } from 'next/server';
import { conflictError, loadCollection, requireSession, saveCollection, storageError } from '../../../lib/collectionServer';
import { CHARACTER_RARITY, SHOP_PRICE } from '../../../components/rpg/gacha';

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const characterId = String(body?.characterId ?? '');
  const rarity = CHARACTER_RARITY[characterId];
  if (!rarity) return NextResponse.json({ error: 'That character is not sold in the shop.' }, { status: 400 });

  const current = await loadCollection(auth.profileId);
  if (!current) return storageError();
  if (current.owned.includes(characterId)) return NextResponse.json({ error: 'You already own this character.' }, { status: 400 });
  const price = SHOP_PRICE[rarity];
  if (current.shards < price) return NextResponse.json({ error: `You need ${price} Emerald Shards.` }, { status: 400 });

  const next = { shards: current.shards - price, owned: [...current.owned, characterId] };
  if (!(await saveCollection(auth.profileId, current.shards, next))) return conflictError();
  return NextResponse.json(next);
}
