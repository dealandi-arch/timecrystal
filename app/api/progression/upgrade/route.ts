import { NextRequest, NextResponse } from 'next/server';
import { conflictError, loadCollection, requireSession, storageError } from '../../../../lib/collectionServer';
import { loadProgression, progressionStorageError, saveProgression } from '../../../../lib/progressionServer';
import { rarityOf } from '../../../../components/rpg/gacha';
import { MAX_HERO_LEVEL, levelUpCost } from '../../../../components/rpg/progression';
import { SIGNATURE_WEAPONS } from '../../../../components/rpg/weapons';

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const characterId = String(body?.characterId ?? '');
  if (!Object.prototype.hasOwnProperty.call(SIGNATURE_WEAPONS, characterId)) {
    return NextResponse.json({ error: 'Unknown hero.' }, { status: 400 });
  }

  if (rarityOf(characterId) !== 'common') {
    const collection = await loadCollection(auth.profileId);
    if (!collection) return storageError();
    if (!collection.owned.includes(characterId)) return NextResponse.json({ error: 'You don’t own this hero yet.' }, { status: 400 });
  }

  const current = await loadProgression(auth.profileId);
  if (!current) return progressionStorageError();
  const level = current.levels[characterId] ?? 1;
  if (level >= MAX_HERO_LEVEL) return NextResponse.json({ error: 'This hero is already at the maximum level.' }, { status: 400 });
  const cost = levelUpCost(level);
  if (current.aizodon < cost) return NextResponse.json({ error: `You need ${cost} Aizodon.` }, { status: 400 });

  const levels = { ...current.levels, [characterId]: level + 1 };
  const aizodon = current.aizodon - cost;
  if (!(await saveProgression(auth.profileId, current.aizodon, { aizodon, character_levels: levels }))) return conflictError();
  return NextResponse.json({ aizodon, levels });
}
