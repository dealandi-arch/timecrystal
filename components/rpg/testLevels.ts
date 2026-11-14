// Test levels for the automated browser tests only.
//
// The game always plays the original levels. The old Stage editor let players change those levels
// (and make them easier) while still earning Aizodon and World's Best times, so it has been removed.
// The only way a stored replacement level is used now is when the server is started with
// TC_TEST_LEVELS=1, which the live site never sets; the page passes that decision in as a prop.

import type { LevelDef } from './levels';

const STORAGE_KEY = 'timeCrystalLevelOverrides';

export function getTestLevel(id: number): LevelDef | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const map = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<number, LevelDef>;
    return map[id];
  } catch {
    return undefined;
  }
}
