import { getLevel, type LevelDef } from './levels';

const STORAGE_KEY = 'timeCrystalLevelOverrides';

type OverrideMap = Record<number, LevelDef>;

function loadOverrides(): OverrideMap {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as OverrideMap;
  } catch {
    return {};
  }
}

function persistOverrides(map: OverrideMap) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function cloneLevel(level: LevelDef): LevelDef {
  return JSON.parse(JSON.stringify(level)) as LevelDef;
}

export function getEffectiveLevel(id: number): LevelDef | undefined {
  const override = loadOverrides()[id];
  if (override) return override;
  return getLevel(id);
}

export function hasOverride(id: number): boolean {
  return !!loadOverrides()[id];
}

export function saveLevelOverride(level: LevelDef) {
  const overrides = loadOverrides();
  overrides[level.id] = level;
  persistOverrides(overrides);
}

export function clearLevelOverride(id: number) {
  const overrides = loadOverrides();
  delete overrides[id];
  persistOverrides(overrides);
}
