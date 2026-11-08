import { NextResponse } from 'next/server';
import { getSupabase } from './supabase';
import { selectWithFallback } from './profileFields';
import { type SkillState, parseSkillState } from '../components/rpg/skills';

export interface Progression {
  aizodon: number;
  levels: Record<string, number>;
  claimedAt: string | null;
  skills: SkillState;
  skillsReady: boolean; // false until the skills column exists
}

export async function loadProgression(profileId: string): Promise<Progression | null> {
  const supabase = getSupabase();
  const { data: raw, error, upToDate } = await selectWithFallback(
    (columns) => supabase.from('profiles').select(columns).eq('id', profileId).maybeSingle(),
    'aizodon, character_levels, aizodon_claimed_at, skills',
    'aizodon, character_levels, aizodon_claimed_at'
  );
  if (error || !raw) return null;
  const data = raw as unknown as { aizodon?: number; character_levels?: Record<string, number>; aizodon_claimed_at?: string | null; skills?: unknown };
  return {
    aizodon: data.aizodon ?? 0,
    levels: (data.character_levels ?? {}) as Record<string, number>,
    claimedAt: data.aizodon_claimed_at ?? null,
    skills: parseSkillState(data.skills),
    skillsReady: upToDate,
  };
}

// Writes only if the balance is still what we read, so two requests can't spend the same Aizodon twice.
export async function saveProgression(profileId: string, previousAizodon: number, fields: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update(fields)
    .eq('id', profileId)
    .eq('aizodon', previousAizodon)
    .select('id');
  return !error && Array.isArray(data) && data.length === 1;
}

export const progressionStorageError = () =>
  NextResponse.json({ error: 'Hero levelling is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
