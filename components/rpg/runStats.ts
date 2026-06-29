export interface LevelRunStats {
  timeMs: number;
  kills: number;
  secrets: number;
  usedAbility: boolean;
}

interface LocalBest extends LevelRunStats {
  completedAt: string;
}

const STORAGE_KEY = 'timeCrystalBestRuns';

function readAll(): Record<number, LocalBest> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<number, LocalBest>) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<number, LocalBest>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getLocalBest(levelId: number): LocalBest | null {
  return readAll()[levelId] ?? null;
}

// Returns true if this run beat (or set) the local best for the level.
export function saveLocalBestIfBetter(levelId: number, stats: LevelRunStats): boolean {
  const all = readAll();
  const existing = all[levelId];
  if (existing && existing.timeMs <= stats.timeMs) return false;
  all[levelId] = { ...stats, completedAt: new Date().toISOString() };
  writeAll(all);
  return true;
}
