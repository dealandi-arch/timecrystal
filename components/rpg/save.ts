export type AbilityId = 'navigate' | 'killAll' | 'invisibility' | 'iceAge';

export interface Save {
  ability: AbilityId | null;
  abilityUsed: boolean;
  currentLevel: number;
  crystalsCollected: number;
  characterId: string | null;
}

const STORAGE_KEY = 'timeCrystalSave';

export function defaultSave(): Save {
  return { ability: null, abilityUsed: false, currentLevel: 1, crystalsCollected: 0, characterId: null };
}

export function loadSave(): Save {
  if (typeof window === 'undefined') return defaultSave();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultSave();
  try {
    const parsed = JSON.parse(raw) as Save;
    const merged = { ...defaultSave(), ...parsed };
    // Migrate saves that already have progress but predate character selection
    if (merged.characterId === null && (merged.ability !== null || merged.crystalsCollected > 0)) {
      merged.characterId = 'wanderer';
    }
    return merged;
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: Save) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function clearSave() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
