// Admin tiers. 11 admin spots in all: 1 Godly, 1 Co-Godly, 3 Ultra, 4 Super and 2 Admin.
// Shared by the server (which enforces everything) and the admin panel (which only hides what you can't use).

export type AdminTier = 'admin' | 'super' | 'ultra' | 'co' | 'godly';

export const GODLY_NICKNAME = 'lavatatorr'; // the one Godly Admin (nicknames are unique)

export interface TierInfo {
  id: AdminTier;
  name: string;
  icon: string;
  level: number; // higher = more power
  spots: number;
  powers: string;
}

export const TIERS: TierInfo[] = [
  { id: 'admin', name: 'Admin', icon: '🛡', level: 1, spots: 2, powers: 'Open the Admin panel and Admin chat, warn players, and review cheat reports.' },
  { id: 'super', name: 'Super Admin', icon: '⭐', level: 2, spots: 4, powers: 'Everything an Admin can, plus fixing records: change or delete World’s Best times and Craze scores.' },
  { id: 'ultra', name: 'Ultra Admin', icon: '💫', level: 3, spots: 3, powers: 'Everything a Super Admin can, plus giving or taking up to 100 Emerald Shards at a time. Can promote someone to Super Admin.' },
  { id: 'co', name: 'Co-Godly Admin', icon: '🔱', level: 4, spots: 1, powers: 'Everything an Ultra Admin can, plus giving free hero tryouts and removing heroes (never from the Godly Admin). Can promote someone to Ultra Admin.' },
  { id: 'godly', name: 'Godly Admin', icon: '👑', level: 5, spots: 1, powers: 'Everything, including giving heroes for keeps. The only one who can promote anyone to any tier.' },
];

export const TIER_BY_ID: Record<AdminTier, TierInfo> = Object.fromEntries(TIERS.map((t) => [t.id, t])) as Record<AdminTier, TierInfo>;
export const TOTAL_ADMIN_SPOTS = TIERS.reduce((sum, t) => sum + t.spots, 0);

// The lowest tier that may do each admin action.
export const MIN_TIER_FOR: Record<string, AdminTier> = {
  warn: 'admin',
  setTime: 'super',
  deleteRun: 'super',
  resetUnder: 'super',
  deleteCraze: 'super',
  giveShards: 'ultra',
  giveTrial: 'co',
  giveHero: 'godly',
  removeHero: 'co',
  setTier: 'admin', // the promotion rules below decide the rest
};

export function parseTier(value: unknown): AdminTier {
  return TIERS.some((t) => t.id === value) ? (value as AdminTier) : 'admin';
}

// A profile row's tier, or null if they aren't an admin. Godly is decided by login name.
export function tierOfRow(row: { nickname?: string | null; is_admin?: boolean | null; admin_tier?: string | null } | null | undefined): AdminTier | null {
  if (!row) return null;
  if (row.nickname?.toLowerCase() === GODLY_NICKNAME) return 'godly';
  if (!row.is_admin) return null;
  const tier = parseTier(row.admin_tier);
  return tier === 'godly' ? 'admin' : tier; // nobody else can hold the Godly spot
}

export const atLeast = (tier: AdminTier | null | undefined, min: AdminTier) => !!tier && TIER_BY_ID[tier].level >= TIER_BY_ID[min].level;

// Can `mine` set a player who is currently `current` (null: not an admin) to `next` ('none' removes admin power)?
// Returns the reason it's not allowed, or null. Everyone can only promote to the tier directly below their own;
// only the Godly Admin can promote higher than that. You can always demote or remove someone below you.
export function tierChangeProblem(mine: AdminTier, current: AdminTier | null, next: AdminTier | 'none'): string | null {
  const myLevel = TIER_BY_ID[mine].level;
  if (next === 'godly') return 'There is only one Godly Admin.';
  if (current === 'godly') return 'Nobody can change the Godly Admin.';
  if (current && TIER_BY_ID[current].level >= myLevel) return 'You can only change admins below your own tier.';
  if (next === 'none') return null;
  const nextLevel = TIER_BY_ID[next].level;
  const currentLevel = current ? TIER_BY_ID[current].level : 0;
  if (nextLevel < currentLevel) return null; // a demotion
  if (mine === 'godly') return null;
  if (nextLevel !== myLevel - 1) {
    const below = TIERS.find((t) => t.level === myLevel - 1);
    return below ? `You can only promote someone to ${below.name}, the tier directly below yours. Only the Godly Admin can promote higher.` : 'You can’t promote anyone.';
  }
  return null;
}
