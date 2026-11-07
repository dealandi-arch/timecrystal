// Player preferences, kept in this browser.
export interface GameSettings {
  autoSpeciality: boolean; // activate the hero's speciality as soon as they are chosen
  autoWeapon: boolean; // start every level holding the signature weapon instead of the basic gun
  musicOn: boolean;
  sfxOn: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = { autoSpeciality: false, autoWeapon: false, musicOn: true, sfxOn: true };

const STORAGE_KEY = 'timeCrystalSettings';

export function loadSettings(): GameSettings {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      autoSpeciality: parsed?.autoSpeciality === true,
      autoWeapon: parsed?.autoWeapon === true,
      musicOn: parsed?.musicOn !== false,
      sfxOn: parsed?.sfxOn !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function persistSettings(settings: GameSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: settings last for this visit only */
  }
}
