import { NextRequest, NextResponse } from 'next/server';
import { conflictError, loadCollection, requireSession, saveCollection, secureRandom } from '../../../../lib/collectionServer';
import { rollSecret } from '../../../../components/rpg/gacha';
import { loadProgression, progressionStorageError, saveProgression } from '../../../../lib/progressionServer';
import { getAnyLevel } from '../../../../components/rpg/levels3d';
import { customRewardWeight, toLevelDef } from '../../../../components/rpg/customLevels';
import { loadCustomLevel, markVerified } from '../../../../lib/customLevelsServer';
import { minimumCreditedMs, runReward } from '../../../../components/rpg/progression';

const CLOCK_TOLERANCE_MS = 1000;

// Every credited clear has a 1% chance of a Secret hero the player doesn't have yet.
async function maybeGrantSecret(profileId: string): Promise<string | null> {
  const first = await loadCollection(profileId);
  if (!first) return null;
  const secret = rollSecret(first.owned, secureRandom);
  if (!secret) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const collection = attempt === 0 ? first : await loadCollection(profileId);
    if (!collection) return null;
    if (collection.owned.includes(secret)) return null;
    const next = { shards: collection.shards, owned: [...collection.owned, secret] };
    if (await saveCollection(profileId, collection.shards, next)) return secret;
  }
  return null;
}

// Called when a signed-in player finishes a level: faster runs pay more Aizodon.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const customId = body?.customLevelId === undefined ? null : Number(body.customLevelId);
  const custom = customId !== null ? await loadCustomLevel(customId) : null;
  const level = custom ? toLevelDef(custom.id, custom.name, custom.mode, custom.map) : customId === null ? getAnyLevel(Number(body?.levelId)) : undefined;
  const timeMs = Number(body?.timeMs);
  const usedAbility = Boolean(body?.usedAbility);
  if (!level) return NextResponse.json({ error: 'Invalid level.' }, { status: 400 });
  // Public levels pay half, and nobody earns from their own level.
  // Beating your own level verifies it (and makes it public).
  if (custom && custom.authorId === auth.profileId) {
    const current = await loadProgression(auth.profileId);
    const verified = !custom.verifiedAt && Number.isFinite(timeMs) && timeMs > 0 && (await markVerified(custom.id, timeMs));
    const reason = verified ? 'Level verified! It’s now on Public Levels for everyone to play.' : 'You can’t earn Aizodon on your own level.';
    return NextResponse.json({ earned: 0, rank: '', aizodon: current?.aizodon ?? 0, reason, own: true, verified });
  }
  if (custom && !custom.verifiedAt) return NextResponse.json({ error: 'That level hasn’t been verified yet.' }, { status: 400 });
  if (!Number.isFinite(timeMs) || timeMs <= 0 || timeMs > 1000 * 60 * 60) {
    return NextResponse.json({ error: 'Invalid run time.' }, { status: 400 });
  }

  const full = runReward(timeMs, level.enemies, usedAbility, level.parBonusMs);
  // Public levels: half pay, scaled down further for small levels (see customRewardWeight).
  const reward = custom ? { ...full, earned: full.earned > 0 ? Math.max(1, Math.round((full.earned / 2) * customRewardWeight(level.enemies))) : 0 } : full;
  const creditedMs = Math.max(timeMs, minimumCreditedMs(level.enemies, level.parBonusMs));

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await loadProgression(auth.profileId);
    if (!current) return progressionStorageError();

    // A run can't have taken longer than the time since the previous reward was claimed.
    const sinceLast = current.claimedAt ? Date.now() - new Date(current.claimedAt).getTime() : Infinity;
    if (sinceLast + CLOCK_TOLERANCE_MS < creditedMs) {
      return NextResponse.json({ earned: 0, rank: reward.rank, aizodon: current.aizodon, reason: 'That run finished too soon after your last reward.' });
    }

    const aizodon = current.aizodon + reward.earned;
    const saved = await saveProgression(auth.profileId, current.aizodon, { aizodon, aizodon_claimed_at: new Date().toISOString() });
    if (saved) return NextResponse.json({ earned: reward.earned, rank: reward.rank, aizodon, secret: await maybeGrantSecret(auth.profileId) });
  }
  return conflictError();
}
