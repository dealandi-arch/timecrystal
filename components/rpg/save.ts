export type AbilityId = 'navigate' | 'killAll' | 'invisibility' | 'iceAge';

export interface Save {
  ability: AbilityId | null;
  abilityUsed: boolean;
  currentLevel: number;
  crystalsCollected: number;
  characterId: string | null;
  powerActivated: boolean;
}

export function defaultSave(): Save {
  return { ability: null, abilityUsed: false, currentLevel: 1, crystalsCollected: 0, characterId: null, powerActivated: false };
}

// No persistence — progress exists only while the page is open.
export function loadSave(): Save { return defaultSave(); }
export function persistSave(_save: Save) { /* no-op */ }
export function clearSave() { /* no-op */ }
