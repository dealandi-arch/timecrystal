// Daily wheel and daily quests (shared by the client and the server; no React, no browser APIs).
// Everything resets at midnight UTC. Signed-in players only (rewards are saved on the profile).

export type DailyReward = { kind: 'shards'; amount: number } | { kind: 'aizodon'; amount: number } | { kind: 'card' };

export interface WheelSlice {
  id: string;
  label: string;
  color: string;
  weight: number; // relative chance
  reward: DailyReward;
}

// One free spin a day.
export const WHEEL: WheelSlice[] = [
  { id: 's5', label: '5 💎', color: '#0f766e', weight: 30, reward: { kind: 'shards', amount: 5 } },
  { id: 'a15', label: '15 ⬡', color: '#a16207', weight: 15, reward: { kind: 'aizodon', amount: 15 } },
  { id: 's10', label: '10 💎', color: '#0e7490', weight: 25, reward: { kind: 'shards', amount: 10 } },
  { id: 'card', label: '🃏 Card', color: '#7e22ce', weight: 10, reward: { kind: 'card' } },
  { id: 's20', label: '20 💎', color: '#1d4ed8', weight: 12, reward: { kind: 'shards', amount: 20 } },
  { id: 'a40', label: '40 ⬡', color: '#b45309', weight: 5, reward: { kind: 'aizodon', amount: 40 } },
  { id: 's50', label: '50 💎 Jackpot', color: '#be123c', weight: 3, reward: { kind: 'shards', amount: 50 } },
];

export function spinWheel(random: () => number = Math.random): WheelSlice {
  const total = WHEEL.reduce((s, w) => s + w.weight, 0);
  let roll = random() * total;
  for (const slice of WHEEL) {
    if (roll < slice.weight) return slice;
    roll -= slice.weight;
  }
  return WHEEL[0];
}

export type QuestId = 'clear3' | 'shards5' | 'craze15';
export interface Quest {
  id: QuestId;
  label: string;
  goal: number;
  reward: DailyReward;
}

// The same three quests every day; progress resets at midnight UTC.
export const QUESTS: Quest[] = [
  { id: 'clear3', label: 'Clear 3 levels', goal: 3, reward: { kind: 'shards', amount: 20 } },
  { id: 'shards5', label: 'Find 5 hidden Emerald Shards', goal: 5, reward: { kind: 'aizodon', amount: 15 } },
  { id: 'craze15', label: 'Beat 15 enemies in Multienemy Craze', goal: 15, reward: { kind: 'card' } },
];

export interface DailyState {
  day: string; // YYYY-MM-DD (UTC)
  spun: boolean;
  spinId?: string;
  progress: Partial<Record<QuestId, number>>;
  claimed: QuestId[];
}

export const todayUtc = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

// A saved state from an earlier day starts fresh.
export function freshDaily(raw: unknown, now = Date.now()): DailyState {
  const day = todayUtc(now);
  const r = raw as Partial<DailyState> | null;
  if (!r || r.day !== day) return { day, spun: false, progress: {}, claimed: [] };
  return { day, spun: !!r.spun, spinId: r.spinId, progress: { ...(r.progress ?? {}) }, claimed: Array.isArray(r.claimed) ? r.claimed : [] };
}

export function rewardText(r: DailyReward): string {
  return r.kind === 'shards' ? `${r.amount} Emerald Shards` : r.kind === 'aizodon' ? `${r.amount} Aizodon` : 'a hero card';
}
