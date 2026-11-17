'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useProfile } from './ProfileContext';
import { CHARACTER_RARITY, type CardDraw, type Cards, DRAW_COST, type DrawType, SHARDS_PER_LEVEL, SHOP_PRICE, UNLOCKABLE_CHARACTERS, cleanCards, drawCards, rarityOf, rollSecret } from '../rpg/gacha';

// Emerald Shards + gacha heroes. Signed-in players keep them on their profile (the server rolls
// the gacha); guests keep them in this browser.

interface Collection {
  shards: number;
  owned: string[];
  cards: Cards; // hero cards collected towards unlocking gacha heroes
}

type ActionResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

interface CollectionContextValue extends Collection {
  ready: boolean;
  storage: 'profile' | 'browser';
  warning: string | null;
  isUnlocked: (characterId: string) => boolean;
  addShards: (count: number) => void;
  draw: (type: DrawType) => Promise<ActionResult<{ draws: CardDraw[]; refund: number }>>;
  buy: (characterId: string) => Promise<ActionResult>;
  // Free trials (event tryouts and codes), kept in this browser: heroId → when it ends (ms).
  trials: Record<string, number>;
  trialEndsAt: (characterId: string) => number | null;
  startTrial: (characterId: string, days: number) => ActionResult<number>;
  // A Secret hero was won: the server already saved it for signed-in players.
  grantSecret: (characterId: string) => void;
  // Guests roll for a Secret hero here after each clear (signed-in players roll on the server).
  rollSecretLocally: () => string | null;
  // Load the collection again from the server (after a trade or a daily reward).
  reload: () => void;
}

const LOCAL_KEY = 'timeCrystalCollection';
const TRIALS_KEY = 'timeCrystalTrials';

function readTrials(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TRIALS_KEY) ?? '{}');
    return Object.fromEntries(Object.entries(parsed).filter(([id, t]) => UNLOCKABLE_CHARACTERS.includes(id) && typeof t === 'number')) as Record<string, number>;
  } catch {
    return {};
  }
}
const EMPTY: Collection = { shards: 0, owned: [], cards: {} };

function readLocal(): Collection {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      shards: Number.isFinite(parsed?.shards) ? Math.max(0, Math.floor(parsed.shards)) : 0,
      owned: Array.isArray(parsed?.owned) ? parsed.owned.filter((id: unknown) => typeof id === 'string' && UNLOCKABLE_CHARACTERS.includes(id)) : [],
      cards: cleanCards(parsed?.cards),
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

// Shards whose save failed, kept per profile and re-sent on the next successful load or pickup.
const pendingKey = (profileId: string) => `timeCrystalPendingShards:${profileId}`;

function readPending(profileId: string): number {
  try {
    const n = Number(window.localStorage.getItem(pendingKey(profileId)));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writePending(profileId: string, count: number) {
  try {
    if (count > 0) window.localStorage.setItem(pendingKey(profileId), String(count));
    else window.localStorage.removeItem(pendingKey(profileId));
  } catch {
    /* storage unavailable: the shard can't be kept for a retry */
  }
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
  const profileIdRef = useRef<string | null>(null);
  profileIdRef.current = profile?.id ?? null;
  const flushingRef = useRef(false);
  const [trials, setTrials] = useState<Record<string, number>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const [profileTrials, setProfileTrials] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setTrials(readTrials());
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Sends any shards whose earlier save failed, in batches the server accepts.
  const flushPending = useCallback(async () => {
    const profileId = profileIdRef.current;
    if (!profileId || flushingRef.current) return;
    flushingRef.current = true;
    try {
      let left = readPending(profileId);
      while (left > 0) {
        const count = Math.min(left, SHARDS_PER_LEVEL);
        const { res, data } = await postJson('/api/collection/shards', { count });
        if (!res.ok) break;
        left -= count;
        writePending(profileId, left);
        setCollection((c) => ({ shards: data.shards + left, owned: data.owned, cards: data.cards ?? c.cards }));
      }
    } catch {
      /* still offline: try again next time */
    } finally {
      flushingRef.current = false;
    }
  }, []);

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
          setCollection({ shards: (data.shards ?? 0) + readPending(profile.id), owned: data.owned ?? [], cards: cleanCards(data.cards) });
          // Tryouts saved on the profile (an admin can give these).
          const fromProfile: Record<string, number> = {};
          for (const [id, end] of Object.entries((data.trials ?? {}) as Record<string, string>)) {
            const t = Date.parse(end);
            if (UNLOCKABLE_CHARACTERS.includes(id) && Number.isFinite(t)) fromProfile[id] = t;
          }
          setProfileTrials(fromProfile);
          setReady(true);
          flushPending();
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
  }, [profile, profileLoading, fallBackToBrowser, flushPending, reloadKey]);

  const updateLocal = useCallback((fn: (c: Collection) => Collection) => {
    setCollection((prev) => {
      const next = fn(prev);
      writeLocal(next);
      return next;
    });
  }, []);

  const addShards = useCallback(
    (count: number) => {
      const profileId = profileIdRef.current;
      if (!profileId) {
        updateLocal((c) => ({ ...c, shards: c.shards + count }));
        return;
      }
      setCollection((c) => ({ ...c, shards: c.shards + count })); // optimistic
      const keepForLater = () => writePending(profileId, readPending(profileId) + count);
      postJson('/api/collection/shards', { count })
        .then(({ res, data }) => {
          if (!res.ok) return keepForLater();
          setCollection((c) => ({ shards: data.shards + readPending(profileId), owned: data.owned, cards: data.cards ?? c.cards }));
          flushPending();
        })
        .catch(keepForLater);
    },
    [updateLocal, flushPending]
  );

  const draw = useCallback(
    async (type: DrawType): Promise<ActionResult<{ draws: CardDraw[]; refund: number }>> => {
      if (storageRef.current === 'browser') {
        const current = readLocal();
        if (current.shards < DRAW_COST[type]) return { ok: false, error: `You need ${DRAW_COST[type]} Emerald Shards.` };
        const result = drawCards(type, current.owned, current.cards);
        updateLocal(() => ({ shards: current.shards - DRAW_COST[type] + result.refund, owned: result.owned, cards: result.cards }));
        return { ok: true, value: { draws: result.draws, refund: result.refund } };
      }
      const { res, data } = await postJson('/api/gacha', { type });
      if (!res.ok) return { ok: false, error: data?.error ?? 'The draw failed.' };
      setCollection({ shards: data.shards, owned: data.owned, cards: cleanCards(data.cards) });
      return { ok: true, value: { draws: data.draws as CardDraw[], refund: data.refund as number } };
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
        updateLocal(() => ({ ...current, shards: current.shards - SHOP_PRICE[rarity], owned: [...current.owned, characterId] }));
        return { ok: true, value: undefined };
      }
      const { res, data } = await postJson('/api/shop', { characterId });
      if (!res.ok) return { ok: false, error: data?.error ?? 'Purchase failed.' };
      setCollection((c) => ({ shards: data.shards, owned: data.owned, cards: data.cards ?? c.cards }));
      return { ok: true, value: undefined };
    },
    [updateLocal]
  );

  // A tryout from this browser (events, codes) or from the profile (given by an admin): whichever lasts longer.
  const trialEndsAt = useCallback((characterId: string) => {
    const end = Math.max(trials[characterId] ?? 0, profileTrials[characterId] ?? 0);
    return end && end > now ? end : null;
  }, [trials, profileTrials, now]);

  // Each trial can be started once per browser; it unlocks the hero until it runs out.
  const startTrial = useCallback((characterId: string, days: number): ActionResult<number> => {
    const existing = readTrials();
    if (existing[characterId]) {
      return existing[characterId] > Date.now() ? { ok: true, value: existing[characterId] } : { ok: false, error: 'You’ve already used this trial.' };
    }
    const end = Date.now() + days * 24 * 60 * 60 * 1000;
    const next = { ...existing, [characterId]: end };
    try {
      window.localStorage.setItem(TRIALS_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: the trial lasts for this visit */
    }
    setTrials(next);
    setNow(Date.now());
    return { ok: true, value: end };
  }, []);

  const grantSecret = useCallback((characterId: string) => {
    if (storageRef.current === 'browser') updateLocal((c) => (c.owned.includes(characterId) ? c : { ...c, owned: [...c.owned, characterId] }));
    else setCollection((c) => (c.owned.includes(characterId) ? c : { ...c, owned: [...c.owned, characterId] }));
  }, [updateLocal]);

  const rollSecretLocally = useCallback(() => {
    if (storageRef.current !== 'browser') return null;
    const secret = rollSecret(readLocal().owned);
    if (secret) grantSecret(secret);
    return secret;
  }, [grantSecret]);

  const isUnlocked = useCallback(
    (characterId: string) => rarityOf(characterId) === 'common' || collection.owned.includes(characterId) || trialEndsAt(characterId) !== null,
    [collection.owned, trialEndsAt]
  );

  const value = useMemo(
    () => ({ ...collection, ready, storage, warning, isUnlocked, addShards, draw, buy, trials, trialEndsAt, startTrial, grantSecret, rollSecretLocally, reload }),
    [collection, ready, storage, warning, isUnlocked, addShards, draw, buy, trials, trialEndsAt, startTrial, grantSecret, rollSecretLocally, reload]
  );
  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection(): CollectionContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollection must be used within a CollectionProvider');
  return ctx;
}
