import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '../../../lib/collectionServer';
import { loadProgression, progressionStorageError } from '../../../lib/progressionServer';

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const progression = await loadProgression(auth.profileId);
  if (!progression) return progressionStorageError();
  return NextResponse.json({ aizodon: progression.aizodon, levels: progression.levels, skills: progression.skills, skillsReady: progression.skillsReady });
}
