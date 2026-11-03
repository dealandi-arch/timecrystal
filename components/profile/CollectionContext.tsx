'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useProfile } from './ProfileContext';
import { CHARACTER_RARITY, PULL_COST, type PullResult, type PullType, SHOP_PRICE, rarityOf, rollPull } from '../rpg/gacha';

// Emerald Shards + gacha heroes. Signed-in players keep them on their profile (the server rolls
// the gacha); guests keep them in this browser.

interface Collection {
  shards: number;
  owned: string[];
}

type ActionResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

interface CollectionContextValue extends Collection {
  ready: boolean;
  storage: 'profile' | 'browser';
  warning: string | null;
  isUnlocked: (characterId: string) => boolean;
  addShards: (count: number) => void;
  pull: (type: PullType) => Promise<ActionResult<PullResult>>;
  buy: (characterId: string) => Promise<ActionResult>;
}

const LOCAL_KEY = 'timeCrystalCollection';
const EMPTY: Collection = { shards: 0, owned: [] };

function readLocal(): Collection {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      shards: Number.isFinite(parsed?.shards) ? Math.max(0, Math.floor(parsed.shards)) : 0,
      owned: Array.isArray(parsed?.owned) ? parsed.owned.filter((id: unknown) => typeof id === 'string' && id in CHARACTER_RARITY) : [],
    };
  } catch {
    return EMPTY;
  }
}

function writeLocal(c: Collection) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable — progress lasts for this visit only */
  }
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const { profile, loading: profileLoading } = useProfile();
  const [collection, setCollection] = useState<Collection>(EMPTY);
  const [storage, setStorage] = useState<'profile' | 'browser'>('browser');
  const [warning, setWarning] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const storageRef = useRef(storage);
  storageRef.current = storage;

  const fallBackToBrowser = useCallback((message: string | null) => {
    setStorage('browser');
    setWarning(message);
    setCollection(readLocal());
    setReady(true);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) {
      fallBackToBrowser(null);
      return;
    }
    let cancelled = false;
    setReady(false);
    fetch('/api/collection')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setStorage('profile');
          setWarning(null);
          setCollection({ shards: data.shards ?? 0, owned: data.owned ?? [] });
          setReady(true);
        } else {
          fallBackToBrowser(`Couldn’t load your profile collection (${data?.error ?? 'server error'}). Saving in this browser for now.`);
        }
      })
      .catch(() => {
        if (!cancelled) fallBackToBrowser('Couldn’t reach the server. Saving in this browser for now.');
      });
    return () => {
      cancelled = true;
    };
  }, [profile, profileLoading, fallBackToBrowser]);

  const updateLocal = useCallback((fn: (c: Collection) => Collection) => {
    setCollection((prev) => {
      const next = fn(prev);
      writeLocal(next);
      return next;
    });
  }, []);

  const addShards = useCallback(
    (count: number) => {
      if (storageRef.current === 'browser') {
        updateLocal((c) => ({ ...c, shards: c.shards + count }));
        return;
      }
      setCollection((c) => ({ ...c, shards: c.shards + count })); // optimistic
      postJson('/api/collection/shards', { count }).then(({ res, data }) => {
        if (res.ok) setCollection({ shards: data.shards, owned: data.owned });
      });
    },
    [updateLocal]
  );

  const pull = useCallback(
    async (type: PullType): Promise<ActionResult<PullResult>> => {
      if (storageRef.current === 'browser') {
        const current = readLocal();
        if (current.shards < PULL_COST[type]) return { ok: false, error: `You need ${PULL_COST[type]} Emerald Shards.` };
        const result = rollPull(type, current.owned);
        updateLocal(() => ({
          shards: current.shards - PULL_COST[type] + result.refund,
          owned: result.duplicate ? current.owned : [...current.owned, result.characterId],
        }));
        return { ok: true, value: result };
      }
      const { res, data } = await postJson('/api/gacha', { type });
      if (!res.ok) return { ok: false, error: data?.error ?? 'Summon failed.' };
      setCollection({ shards: data.shards, owned: data.owned });
      return { ok: true, value: data.result as PullResult };
    },
    [updateLocal]
  );

  const buy = useCallback(
    async (characterId: string): Promise<ActionResult> => {
      const rarity = CHARACTER_RARITY[characterId];
      if (!rarity) return { ok: false, error: 'Not for sale.' };
      if (storageRef.current === 'browser') {
        const current = readLocal();
        if (current.owned.includes(characterId)) return { ok: false, error: 'You already own this character.' };
        if (current.shards < SHOP_PRICE[rarity]) return { ok: false, error: `You need ${SHOP_PRICE[rarity]} Emerald Shards.` };
        updateLocal(() => ({ shards: current.shards - SHOP_PRICE[rarity], owned: [...current.owned, characterId] }));
        return { ok: true, value: undefined };
      }
      const { res, data } = await postJson('/api/shop', { characterId });
      if (!res.ok) return { ok: false, error: data?.error ?? 'Purchase failed.' };
      setCollection({ shards: data.shards, owned: data.owned });
      return { ok: true, value: undefined };
    },
    [updateLocal]
  );

  const isUnlocked = useCallback(
    (characterId: string) => rarityOf(characterId) === 'common' || collection.owned.includes(characterId),
    [collection.owned]
  );

  const value = useMemo(
    () => ({ ...collection, ready, storage, warning, isUnlocked, addShards, pull, buy }),
    [collection, ready, storage, warning, isUnlocked, addShards, pull, buy]
  );
  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection(): CollectionContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollection must be used within a CollectionProvider');
  return ctx;
}
