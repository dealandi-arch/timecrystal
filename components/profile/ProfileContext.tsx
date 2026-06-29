'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface Profile {
  id: string;
  nickname: string;
  avatarColor: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  signUp: (nickname: string, password: string, avatarColor: string) => Promise<AuthResult>;
  logIn: (nickname: string, password: string) => Promise<AuthResult>;
  logOut: () => Promise<void>;
  submitRun: (levelId: number, timeMs: number, kills: number, secrets: number, usedAbility: boolean) => Promise<{ savedAsPersonalBest: boolean; isWorldBest: boolean; skipped?: boolean } | null>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then(parseJson)
      .then((data) => {
        if (!cancelled) setProfile(data?.profile ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signUp = useCallback(async (nickname: string, password: string, avatarColor: string): Promise<AuthResult> => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, password, avatarColor })
    });
    const data = await parseJson(res);
    if (!res.ok) return { ok: false, error: data?.error ?? 'Sign up failed.' };
    setProfile(data.profile);
    return { ok: true };
  }, []);

  const logIn = useCallback(async (nickname: string, password: string): Promise<AuthResult> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, password })
    });
    const data = await parseJson(res);
    if (!res.ok) return { ok: false, error: data?.error ?? 'Login failed.' };
    setProfile(data.profile);
    return { ok: true };
  }, []);

  const logOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setProfile(null);
  }, []);

  const submitRun = useCallback(
    async (levelId: number, timeMs: number, kills: number, secrets: number, usedAbility: boolean) => {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId, timeMs, kills, secrets, usedAbility })
      });
      if (!res.ok) return null;
      return parseJson(res) as Promise<{ savedAsPersonalBest: boolean; isWorldBest: boolean; skipped?: boolean }>;
    },
    []
  );

  const value = useMemo(
    () => ({ profile, loading, signUp, logIn, logOut, submitRun }),
    [profile, loading, signUp, logIn, logOut, submitRun]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
