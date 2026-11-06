import { NextResponse } from 'next/server';
import { getSupabase } from './supabase';

export interface Progression {
  aizodon: number;
  levels: Record<string, number>;
  claimedAt: string | null;
}

export async function loadProgression(profileId: string): Promise<Progression | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('aizodon, character_levels, aizodon_claimed_at')
    .eq('id', profileId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    aizodon: data.aizodon ?? 0,
    levels: (data.character_levels ?? {}) as Record<string, number>,
    claimedAt: data.aizodon_claimed_at ?? null,
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
