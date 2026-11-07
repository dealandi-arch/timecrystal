'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useProfile } from './ProfileContext';

// Aizodon and hero levels. Signed-in players only: guests always play at level 1.

export interface ClaimResult {
  earned: number;
  rank: string;
  reason?: string;
  pending?: boolean; // couldn't be saved yet; kept and re-sent later
}

interface ProgressionContextValue {
  signedIn: boolean;
  ready: boolean;
  error: string | null;
  aizodon: number;
  levelOf: (characterId: string) => number;
  claimRun: (levelId: number, timeMs: number, usedAbility: boolean) => Promise<ClaimResult | null>;
  levelUp: (characterId: string) => Promise<{ ok: boolean; error?: string }>;
}

// Run rewards whose save failed, kept per profile and re-sent when the server is reachable.
interface PendingClaim {
  levelId: number;
  timeMs: number;
  usedAbility: boolean;
}
const MAX_PENDING_CLAIMS = 20;
const RETRY_TOO_SOON_MS = 15000;
const pendingKey = (profileId: string) => `timeCrystalPendingClaims:${profileId}`;

function readPending(profileId: string): PendingClaim[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(pendingKey(profileId)) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePending(profileId: string, claims: PendingClaim[]) {
  try {
    if (claims.length) window.localStorage.setItem(pendingKey(profileId), JSON.stringify(claims.slice(-MAX_PENDING_CLAIMS)));
    else window.localStorage.removeItem(pendingKey(profileId));
  } catch {
    /* storage unavailable: the reward can't be kept for a retry */
  }
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const ProgressionContext = createContext<ProgressionContextValue | null>(null);

export function ProgressionProvider({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile();
  const [aizodon, setAizodon] = useState(0);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedIn = !!profile;
  const profileId = profile?.id ?? null;
  const flushingRef = useRef(false);
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;

  // Sends saved-up rewards oldest first, stopping at the first one the server can't take yet.
  const flushPending = useCallback(async (id: string) => {
    if (flushingRef.current || profileIdRef.current !== id) return;
    flushingRef.current = true;
    let tooSoon = false;
    try {
      let left = readPending(id);
      while (left.length && profileIdRef.current === id) {
        const { res, data } = await postJson('/api/progression/claim', left[0]);
        if (!res.ok) break;
        if (data.earned === 0) {
          tooSoon = true; // the server spaces out rewards, so try this one again shortly
          break;
        }
        left = left.slice(1);
        writePending(id, left);
        setAizodon(data.aizodon);
      }
    } catch {
      /* still offline: try again next time */
    } finally {
      flushingRef.current = false;
    }
    if (tooSoon) window.setTimeout(() => flushPending(id), RETRY_TOO_SOON_MS);
  }, []);

  useEffect(() => {
    setAizodon(0);
    setLevels({});
    setError(null);
    if (loading || !profile) {
      setReady(!loading);
      return;
    }
    let cancelled = false;
    setReady(false);
    fetch('/api/progression')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setAizodon(data.aizodon ?? 0);
          setLevels(data.levels ?? {});
          flushPending(profile.id);
        } else {
          setError(data?.error ?? 'Could not load your hero levels.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the server to load your hero levels.');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, loading, flushPending]);

  const levelOf = useCallback((characterId: string) => levels[characterId] ?? 1, [levels]);

  const claimRun = useCallback(
    async (levelId: number, timeMs: number, usedAbility: boolean): Promise<ClaimResult | null> => {
      if (!profileId) return null;
      const claim = { levelId, timeMs, usedAbility };
      const keepForLater = (): ClaimResult => {
        writePending(profileId, [...readPending(profileId), claim]);
        return { earned: 0, rank: '', pending: true };
      };
      try {
        const { res, data } = await postJson('/api/progression/claim', claim);
        if (!res.ok) return keepForLater();
        setAizodon(data.aizodon);
        // The server spaces out rewards, so one refused as too soon is kept and paid shortly.
        const refused = data.earned === 0;
        const result = refused ? keepForLater() : { earned: data.earned, rank: data.rank };
        flushPending(profileId);
        return result;
      } catch {
        return keepForLater();
      }
    },
    [profileId, flushPending]
  );

  const levelUp = useCallback(async (characterId: string) => {
    try {
      const { res, data } = await postJson('/api/progression/upgrade', { characterId });
      if (!res.ok) return { ok: false, error: (data?.error as string) ?? 'Level up failed.' };
      setAizodon(data.aizodon);
      setLevels(data.levels);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach the server.' };
    }
  }, []);

  const value = useMemo(
    () => ({ signedIn, ready, error, aizodon, levelOf, claimRun, levelUp }),
    [signedIn, ready, error, aizodon, levelOf, claimRun, levelUp]
  );
  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}

export function useProgression(): ProgressionContextValue {
  const ctx = useContext(ProgressionContext);
  if (!ctx) throw new Error('useProgression must be used within a ProgressionProvider');
  return ctx;
}
