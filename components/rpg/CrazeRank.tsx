'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Avatar from '../profile/Avatar';
import { CRAZE_MINUTES, type CrazeMinutes } from './craze';

interface Entry {
  profileId: string | null;
  nickname: string;
  displayName?: string;
  avatarColor: string;
  avatarPixels: string | null;
  kills: number;
}

// The Craze Rank: most enemies beaten, one list per round length.
// refreshKey: change it to load the list again (e.g. once your score has been saved).
export default function CrazeRank({ minutes: initial, compact = false, refreshKey }: { minutes: CrazeMinutes; compact?: boolean; refreshKey?: unknown }) {
  const [minutes, setMinutes] = useState<CrazeMinutes>(initial);
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    setMinutes(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    fetch(`/api/craze?minutes=${minutes}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEntries(data?.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [minutes, refreshKey]);

  const rows = compact ? (entries ?? []).slice(0, 10) : entries ?? [];
  return (
    <div className="leaderboard-panel craze-rank">
      <h4>Craze Rank · {minutes} min</h4>
      {!compact && (
        <div className="rank3d-tabs" role="tablist">
          {CRAZE_MINUTES.map((m) => (
            <button key={m} role="tab" aria-selected={m === minutes} className={m === minutes ? 'on' : ''} onClick={() => setMinutes(m)}>
              {m} min
            </button>
          ))}
        </div>
      )}
      {entries === null ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p>No scores yet. Be the first.</p>
      ) : (
        rows.map((e, i) => (
          <div className="leaderboard-row" key={`${e.profileId ?? e.nickname}-${i}`}>
            <span className="leaderboard-rank">{i + 1}.</span>
            <Avatar nickname={e.displayName ?? e.nickname} color={e.avatarColor} pixels={e.avatarPixels} size={20} />
            {e.profileId ? <Link href={`/profiles/${e.profileId}`}>{e.displayName ?? e.nickname}</Link> : <span>{e.displayName ?? e.nickname}</span>}
            <span className="leaderboard-time">👾 {e.kills}</span>
          </div>
        ))
      )}
    </div>
  );
}
