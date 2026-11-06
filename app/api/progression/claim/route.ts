import { NextRequest, NextResponse } from 'next/server';
import { conflictError, requireSession } from '../../../../lib/collectionServer';
import { loadProgression, progressionStorageError, saveProgression } from '../../../../lib/progressionServer';
import { getLevel } from '../../../../components/rpg/levels';
import { minimumCreditedMs, runReward } from '../../../../components/rpg/progression';

const CLOCK_TOLERANCE_MS = 1000;

// Called when a signed-in player finishes a level: faster runs pay more Aizodon.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const level = getLevel(Number(body?.levelId));
  const timeMs = Number(body?.timeMs);
  const usedAbility = Boolean(body?.usedAbility);
  if (!level) return NextResponse.json({ error: 'Invalid level.' }, { status: 400 });
  if (!Number.isFinite(timeMs) || timeMs <= 0 || timeMs > 1000 * 60 * 60) {
    return NextResponse.json({ error: 'Invalid run time.' }, { status: 400 });
  }

  const reward = runReward(timeMs, level.enemies, usedAbility);
  const creditedMs = Math.max(timeMs, minimumCreditedMs(level.enemies));

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
    if (saved) return NextResponse.json({ earned: reward.earned, rank: reward.rank, aizodon });
  }
  return conflictError();
}
