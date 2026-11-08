import { NextRequest, NextResponse } from 'next/server';
import { conflictError, loadCollection, requireSession, storageError } from '../../../lib/collectionServer';
import { loadProgression, progressionStorageError, saveProgression } from '../../../lib/progressionServer';
import { rarityOf } from '../../../components/rpg/gacha';
import { HERO_ELEMENT, getSkill } from '../../../components/rpg/skills';

// Buy a skill with Aizodon, or equip/unequip an owned skill on a hero of the same element.
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const current = await loadProgression(auth.profileId);
  if (!current) return progressionStorageError();
  if (!current.skillsReady) {
    return NextResponse.json({ error: 'Skills are not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
  }
  const skills = current.skills;

  if (action === 'buy') {
    const skill = getSkill(String(body?.skillId ?? ''));
    if (!skill) return NextResponse.json({ error: 'Unknown skill.' }, { status: 400 });
    if (skills.owned.includes(skill.id)) return NextResponse.json({ error: 'You already own this skill.' }, { status: 400 });
    if (current.aizodon < skill.cost) return NextResponse.json({ error: `You need ${skill.cost} Aizodon.` }, { status: 400 });
    const next = { ...skills, owned: [...skills.owned, skill.id] };
    const aizodon = current.aizodon - skill.cost;
    if (!(await saveProgression(auth.profileId, current.aizodon, { aizodon, skills: next }))) return conflictError();
    return NextResponse.json({ aizodon, skills: next });
  }

  if (action === 'equip') {
    const heroId = String(body?.heroId ?? '');
    if (!Object.prototype.hasOwnProperty.call(HERO_ELEMENT, heroId)) return NextResponse.json({ error: 'Unknown hero.' }, { status: 400 });
    if (rarityOf(heroId) !== 'common') {
      const collection = await loadCollection(auth.profileId);
      if (!collection) return storageError();
      if (!collection.owned.includes(heroId)) return NextResponse.json({ error: 'You don’t own this hero yet.' }, { status: 400 });
    }
    const equipped = { ...skills.equipped };
    if (body?.skillId === null) {
      delete equipped[heroId];
    } else {
      const skill = getSkill(String(body?.skillId ?? ''));
      if (!skill) return NextResponse.json({ error: 'Unknown skill.' }, { status: 400 });
      if (!skills.owned.includes(skill.id)) return NextResponse.json({ error: 'Buy this skill first.' }, { status: 400 });
      if (HERO_ELEMENT[heroId] !== skill.element) return NextResponse.json({ error: 'That skill doesn’t match this hero’s element.' }, { status: 400 });
      equipped[heroId] = skill.id;
    }
    const next = { ...skills, equipped };
    if (!(await saveProgression(auth.profileId, current.aizodon, { skills: next }))) return conflictError();
    return NextResponse.json({ aizodon: current.aizodon, skills: next });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
