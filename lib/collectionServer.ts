import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from './supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';
import { type Cards, UNLOCKABLE_CHARACTERS, cleanCards } from '../components/rpg/gacha';
import { selectWithFallback } from './profileFields';

export interface Collection {
  shards: number;
  owned: string[];
  cards: Cards;
  cardsReady: boolean; // false until the hero_cards column exists
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
  const { data, error, upToDate } = await selectWithFallback(
    (columns) => getSupabase().from('profiles').select(columns).eq('id', profileId).maybeSingle(),
    'emerald_shards, owned_characters, hero_cards',
    'emerald_shards, owned_characters'
  );
  if (error || !data) return null;
  const row = data as unknown as { emerald_shards: number | null; owned_characters: string[] | null; hero_cards?: unknown };
  return {
    shards: row.emerald_shards ?? 0,
    owned: (row.owned_characters ?? []).filter((id) => UNLOCKABLE_CHARACTERS.includes(id)),
    cards: cleanCards(row.hero_cards),
    cardsReady: upToDate,
  };
}

// Writes only if the balance is still what we read, so two requests can't spend the same shards twice.
export async function saveCollection(profileId: string, previousShards: number, next: { shards: number; owned: string[]; cards?: Cards }): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update(next.cards ? { emerald_shards: next.shards, owned_characters: next.owned, hero_cards: next.cards } : { emerald_shards: next.shards, owned_characters: next.owned })
    .eq('id', profileId)
    .eq('emerald_shards', previousShards)
    .select('id');
  return !error && Array.isArray(data) && data.length === 1;
}

export const storageError = () =>
  NextResponse.json({ error: 'Collection storage is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
export const conflictError = () => NextResponse.json({ error: 'Your collection changed at the same time. Try again.' }, { status: 409 });
