// Elements and skills, shared by the client and the server API (no React, no browser APIs).
// Every hero has an element. Skills are bought with Aizodon and can be equipped on any hero of
// the skill's element. Using a skill starts its cooldown, which gets shorter as the hero levels up;
// area skills also cover more tiles at higher levels.

export type Element = 'fire' | 'frost' | 'storm' | 'earth' | 'nature' | 'shadow' | 'light' | 'arcane' | 'tech';

export const ELEMENT_INFO: Record<Element, { name: string; icon: string; color: string }> = {
  fire: { name: 'Fire', icon: '🔥', color: '#f97316' },
  frost: { name: 'Frost', icon: '❄', color: '#7dd3fc' },
  storm: { name: 'Storm', icon: '⚡', color: '#facc15' },
  earth: { name: 'Earth', icon: '⛰', color: '#a16207' },
  nature: { name: 'Nature', icon: '🌿', color: '#4ade80' },
  shadow: { name: 'Shadow', icon: '☾', color: '#a78bfa' },
  light: { name: 'Light', icon: '✦', color: '#fde68a' },
  arcane: { name: 'Arcane', icon: '✷', color: '#e879f9' },
  tech: { name: 'Tech', icon: '⚙', color: '#94a3b8' },
};

export const ELEMENTS = Object.keys(ELEMENT_INFO) as Element[];

export const HERO_ELEMENT: Record<string, Element> = {
  ember: 'fire', berserker: 'fire', dragoon: 'fire', solaris: 'fire', prospector: 'fire',
  ghost: 'frost', aurora: 'frost', tidecaller: 'frost', valkyrie: 'frost', alchemist: 'frost',
  corsair: 'storm', falconer: 'storm', scout: 'storm', specter: 'storm', bard: 'storm',
  titan: 'earth', ironclad: 'earth', warden: 'earth', knight: 'earth', gladiator: 'earth',
  genesis: 'nature', ranger: 'nature', sage: 'nature', viper: 'nature', wanderer: 'nature',
  shade: 'shadow', phantom: 'shadow', revenant: 'shadow', oblivion: 'shadow', null: 'shadow',
  templar: 'light', archon: 'light', celestia: 'light', oracle: 'light', ronin: 'light',
  mage: 'arcane', rift: 'arcane', paradox: 'arcane', trickster: 'arcane', puppeteer: 'arcane',
  tinker: 'tech', automaton: 'tech', drifter: 'tech', grimsby: 'tech', chronomancer: 'tech',
  cinder: 'fire', glacius: 'frost', tempest: 'storm', terra: 'earth', briar: 'nature',
  wraith: 'shadow', seraphine: 'light', weaver: 'arcane', vector: 'tech',
};

export function elementOf(heroId: string): Element {
  return HERO_ELEMENT[heroId] ?? 'nature';
}

// Extra tiles for area skills and area perks as the hero levels up.
export const AREA_BONUS_LEVELS = [5, 12, 20];
export function areaBonus(level: number): number {
  return AREA_BONUS_LEVELS.filter((l) => level >= l).length;
}

export type SkillId =
  | 'inferno' | 'trapBomb' | 'freezeField' | 'blizzard' | 'lightning' | 'gust' | 'stoneSkin' | 'earthquake'
  | 'healingSpring' | 'vineSnare' | 'cloak' | 'shadowStep' | 'flash' | 'guidingLight' | 'blink' | 'timeFreeze'
  | 'radar' | 'turret';

export interface SkillDef {
  id: SkillId;
  name: string;
  element: Element;
  cost: number; // Aizodon
  area: boolean; // covers more tiles at higher hero levels
  base: number; // radius, tiles, targets or seconds, depending on the skill
  cooldown: number; // seconds at hero level 1
  describe: (amount: number) => string;
}

const S = (def: SkillDef) => def;

export const SKILLS: SkillDef[] = [
  S({ id: 'trapBomb', name: 'Trap', element: 'fire', cost: 200, area: true, base: 1, cooldown: 20, describe: (r) => `Place a bomb on your tile. It blows up when an enemy comes close, hitting everything within ${r} tile${r > 1 ? 's' : ''}.` }),
  S({ id: 'inferno', name: 'Inferno', element: 'fire', cost: 300, area: true, base: 2, cooldown: 25, describe: (r) => `Erupt in flames, hitting every enemy within ${r} tiles for heavy damage.` }),
  S({ id: 'freezeField', name: 'Freeze Field', element: 'frost', cost: 250, area: true, base: 3, cooldown: 25, describe: (r) => `Freeze every enemy within ${r} tiles for 3 seconds.` }),
  S({ id: 'blizzard', name: 'Blizzard', element: 'frost', cost: 300, area: false, base: 6, cooldown: 35, describe: (s) => `Every enemy moves at half speed for ${s} seconds.` }),
  S({ id: 'lightning', name: 'Lightning Strike', element: 'storm', cost: 300, area: true, base: 3, cooldown: 25, describe: (n) => `Lightning strikes the ${n} nearest enemies, wherever they are.` }),
  S({ id: 'gust', name: 'Gust', element: 'storm', cost: 200, area: true, base: 2, cooldown: 15, describe: (r) => `Blow every enemy within ${r} tiles 2 tiles away from you.` }),
  S({ id: 'stoneSkin', name: 'Stone Skin', element: 'earth', cost: 250, area: false, base: 2, cooldown: 30, describe: (n) => `Harden up: the next ${n} hits do no damage.` }),
  S({ id: 'earthquake', name: 'Earthquake', element: 'earth', cost: 300, area: true, base: 3, cooldown: 30, describe: (r) => `Shake the ground: enemies within ${r} tiles take damage and are stunned for 2 seconds.` }),
  S({ id: 'healingSpring', name: 'Healing Spring', element: 'nature', cost: 200, area: false, base: 2, cooldown: 30, describe: (n) => `Heal ${n} HP at once.` }),
  S({ id: 'vineSnare', name: 'Vine Snare', element: 'nature', cost: 250, area: true, base: 5, cooldown: 18, describe: (n) => `Vines shoot ${n} tiles ahead, rooting every enemy they reach for 3 seconds.` }),
  S({ id: 'cloak', name: 'Shadow Cloak', element: 'shadow', cost: 250, area: false, base: 4, cooldown: 30, describe: (s) => `Become untouchable for ${s} seconds.` }),
  S({ id: 'shadowStep', name: 'Shadow Step', element: 'shadow', cost: 200, area: true, base: 3, cooldown: 12, describe: (n) => `Step through the shadows up to ${n} tiles in the direction you face, passing through walls.` }),
  S({ id: 'flash', name: 'Flash', element: 'light', cost: 300, area: false, base: 2, cooldown: 35, describe: (s) => `A blinding flash stuns every enemy on the map for ${s} seconds.` }),
  S({ id: 'guidingLight', name: 'Guiding Light', element: 'light', cost: 200, area: false, base: 10, cooldown: 30, describe: (s) => `For ${s} seconds, see every stop on the crystal's path and every secret passage.` }),
  S({ id: 'blink', name: 'Crystal Blink', element: 'arcane', cost: 250, area: false, base: 0, cooldown: 45, describe: () => 'Teleport straight to wherever the time crystal is right now.' }),
  S({ id: 'timeFreeze', name: 'Time Freeze', element: 'arcane', cost: 300, area: false, base: 5, cooldown: 40, describe: (s) => `The time crystal stops moving for ${s} seconds.` }),
  S({ id: 'radar', name: 'Radar', element: 'tech', cost: 200, area: false, base: 10, cooldown: 30, describe: (s) => `Reveal every hidden Emerald Shard in the level for ${s} seconds.` }),
  S({ id: 'turret', name: 'Turret', element: 'tech', cost: 300, area: true, base: 4, cooldown: 30, describe: (r) => `Deploy a turret that shoots enemies within ${r} tiles for 8 seconds.` }),
];

export const SKILL_IDS = SKILLS.map((s) => s.id);

export function getSkill(id: string | null | undefined): SkillDef | null {
  return SKILLS.find((s) => s.id === id) ?? null;
}

// The skill's main number at a given hero level (area skills grow).
export function skillAmount(skill: SkillDef, heroLevel: number): number {
  return skill.base + (skill.area ? areaBonus(heroLevel) : 0);
}

// Cooldown shrinks by 2.5% per hero level: level 20 recharges in about half the time of level 1.
export function skillCooldown(skill: SkillDef, heroLevel: number): number {
  return Math.round(skill.cooldown * (1 - 0.025 * (Math.max(1, heroLevel) - 1)) * 10) / 10;
}

export function describeSkill(skill: SkillDef, heroLevel = 1): string {
  return skill.describe(skillAmount(skill, heroLevel));
}

export function skillsFor(element: Element): SkillDef[] {
  return SKILLS.filter((s) => s.element === element);
}

export interface SkillState {
  owned: SkillId[];
  equipped: Record<string, SkillId>; // heroId -> skill
}

export function parseSkillState(raw: unknown): SkillState {
  const value = (raw && typeof raw === 'object' ? raw : {}) as { owned?: unknown; equipped?: unknown };
  const owned = Array.isArray(value.owned) ? (value.owned.filter((id) => SKILL_IDS.includes(id as SkillId)) as SkillId[]) : [];
  const equipped: Record<string, SkillId> = {};
  if (value.equipped && typeof value.equipped === 'object') {
    for (const [hero, skill] of Object.entries(value.equipped as Record<string, unknown>)) {
      const def = getSkill(String(skill));
      if (def && owned.includes(def.id) && elementOf(hero) === def.element) equipped[hero] = def.id;
    }
  }
  return { owned, equipped };
}
