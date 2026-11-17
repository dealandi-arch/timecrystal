import { NextRequest, NextResponse } from 'next/server';
import { requireSession, secureRandom } from '../../../lib/collectionServer';
import { grantReward, loadDaily, saveDaily } from '../../../lib/daily';
import { QUESTS, type QuestId, spinWheel } from '../../../components/rpg/daily';

export const dynamic = 'force-dynamic';
const notReady = () => NextResponse.json({ error: 'Daily rewards are not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const state = await loadDaily(auth.profileId);
  if (!state) return notReady();
  return NextResponse.json({ state });
}

// { action: 'spin' } once a day; { action: 'claim', quest } when a quest is complete.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const state = await loadDaily(auth.profileId);
  if (!state) return notReady();

  if (body?.action === 'spin') {
    if (state.spun) return NextResponse.json({ error: 'You’ve already spun today. Come back tomorrow!' }, { status: 400 });
    const slice = spinWheel(secureRandom);
    // Mark the spin first, so a double click can't spin twice.
    if (!(await saveDaily(auth.profileId, { ...state, spun: true, spinId: slice.id }))) return notReady();
    const got = await grantReward(auth.profileId, slice.reward);
    return NextResponse.json({ slice: slice.id, got, state: { ...state, spun: true, spinId: slice.id } });
  }

  if (body?.action === 'claim') {
    const quest = QUESTS.find((q) => q.id === (body?.quest as QuestId));
    if (!quest) return NextResponse.json({ error: 'Unknown quest.' }, { status: 400 });
    if (state.claimed.includes(quest.id)) return NextResponse.json({ error: 'Already claimed today.' }, { status: 400 });
    if ((state.progress[quest.id] ?? 0) < quest.goal) return NextResponse.json({ error: 'Not finished yet.' }, { status: 400 });
    const next = { ...state, claimed: [...state.claimed, quest.id] };
    if (!(await saveDaily(auth.profileId, next))) return notReady();
    const got = await grantReward(auth.profileId, quest.reward);
    return NextResponse.json({ got, state: next });
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
