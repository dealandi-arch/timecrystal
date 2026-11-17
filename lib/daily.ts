import { getSupabase } from './supabase';
import { loadCollection, saveCollection, secureRandom } from './collectionServer';
import { loadProgression, saveProgression } from './progressionServer';
import { type DailyReward, type DailyState, type QuestId, QUESTS, freshDaily } from '../components/rpg/daily';
import { drawCards } from '../components/rpg/gacha';

// Daily wheel and quests on the server: state lives in profiles.daily.

export async function loadDaily(profileId: string): Promise<DailyState | null> {
  const { data, error } = await getSupabase().from('profiles').select('daily').eq('id', profileId).maybeSingle();
  if (error || !data) return null;
  return freshDaily((data as { daily?: unknown }).daily);
}

export async function saveDaily(profileId: string, state: DailyState): Promise<boolean> {
  const { error } = await getSupabase().from('profiles').update({ daily: state }).eq('id', profileId);
  return !error;
}

// Adds quest progress (a level cleared, shards found, Craze enemies beaten). Never fails the action it's attached to.
export async function bumpDaily(profileId: string, quest: QuestId, amount: number): Promise<void> {
  try {
    const state = await loadDaily(profileId);
    if (!state || amount <= 0) return;
    const goal = QUESTS.find((q) => q.id === quest)?.goal ?? 0;
    state.progress[quest] = Math.min(goal, (state.progress[quest] ?? 0) + amount);
    await saveDaily(profileId, state);
  } catch {
    /* daily column not set up yet */
  }
}

// Gives a wheel or quest reward. Returns a short description for the player, or null if it couldn't be saved.
export async function grantReward(profileId: string, reward: DailyReward): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (reward.kind === 'aizodon') {
      const p = await loadProgression(profileId);
      if (!p) return null;
      if (await saveProgression(profileId, p.aizodon, { aizodon: p.aizodon + reward.amount })) return `+${reward.amount} Aizodon`;
      continue;
    }
    const c = await loadCollection(profileId);
    if (!c) return null;
    if (reward.kind === 'shards') {
      if (await saveCollection(profileId, c.shards, { shards: c.shards + reward.amount, owned: c.owned })) return `+${reward.amount} Emerald Shards`;
      continue;
    }
    // a free hero card
    if (!c.cardsReady) return null;
    const d = drawCards('single', c.owned, c.cards, secureRandom);
    if (await saveCollection(profileId, c.shards, { shards: c.shards + d.refund, owned: d.owned, cards: d.cards })) {
      const draw = d.draws[0];
      return draw.alreadyOwned ? `a card for ${draw.characterId} (+1 shard, you own them)` : draw.unlockedNow ? `the last card for ${draw.characterId}: unlocked!` : `a card for ${draw.characterId} (${draw.cards}/${draw.needed})`;
    }
  }
  return null;
}
