'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useProfile } from './ProfileContext';

// Aizodon and hero levels. Signed-in players only: guests always play at level 1.

export interface ClaimResult {
  earned: number;
  rank: string;
  reason?: string;
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

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
  }, [profile, loading]);

  const levelOf = useCallback((characterId: string) => levels[characterId] ?? 1, [levels]);

  const claimRun = useCallback(
    async (levelId: number, timeMs: number, usedAbility: boolean): Promise<ClaimResult | null> => {
      if (!signedIn) return null;
      try {
        const { res, data } = await postJson('/api/progression/claim', { levelId, timeMs, usedAbility });
        if (!res.ok) return null;
        setAizodon(data.aizodon);
        return { earned: data.earned, rank: data.rank, reason: data.reason };
      } catch {
        return null;
      }
    },
    [signedIn]
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
