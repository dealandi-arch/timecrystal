export type AbilityId = 'navigate' | 'killAll' | 'invisibility' | 'iceAge';

export interface Save {
  ability: AbilityId | null;
  abilityUsed: boolean;
  currentLevel: number;
  crystalsCollected: number;
  characterId: string | null;
  powerActivated: boolean;
}

const STORAGE_KEY = 'timeCrystalSave';

export function defaultSave(): Save {
  return { ability: null, abilityUsed: false, currentLevel: 1, crystalsCollected: 0, characterId: null, powerActivated: false };
}

export function loadSave(): Save {
  if (typeof window === 'undefined') return defaultSave();
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultSave();
  try {
    const parsed = JSON.parse(raw) as Save;
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: Save) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function clearSave() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
