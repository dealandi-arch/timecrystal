import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from './supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';
import { UNLOCKABLE_CHARACTERS } from '../components/rpg/gacha';

export interface Collection {
  shards: number;
  owned: string[];
}

// Crypto-backed float in [0, 1) so gacha rolls can't be predicted from the client.
export function secureRandom(): number {
  return randomBytes(4).readUInt32BE(0) / 2 ** 32;
}

type Authed = { ok: true; profileId: string } | { ok: false; response: NextResponse };

export function requireSession(req: NextRequest): Authed {
  if (!isBackendConfigured()) {
    return { ok: false, response: NextResponse.json({ error: 'Profiles are not set up on this server yet.' }, { status: 503 }) };
  }
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return { ok: false, response: NextResponse.json({ error: 'Sign in to use your profile collection.' }, { status: 401 }) };
  return { ok: true, profileId: session.id };
}

export async function loadCollection(profileId: string): Promise<Collection | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('emerald_shards, owned_characters')
    .eq('id', profileId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    shards: data.emerald_shards ?? 0,
    owned: ((data.owned_characters ?? []) as string[]).filter((id) => UNLOCKABLE_CHARACTERS.includes(id)),
  };
}

// Writes only if the balance is still what we read, so two requests can't spend the same shards twice.
export async function saveCollection(profileId: string, previousShards: number, next: Collection): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update({ emerald_shards: next.shards, owned_characters: next.owned })
    .eq('id', profileId)
    .eq('emerald_shards', previousShards)
    .select('id');
  return !error && Array.isArray(data) && data.length === 1;
}

export const storageError = () =>
  NextResponse.json({ error: 'Collection storage is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
export const conflictError = () => NextResponse.json({ error: 'Your collection changed at the same time. Try again.' }, { status: 409 });
