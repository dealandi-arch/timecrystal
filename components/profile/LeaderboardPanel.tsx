'use client';

import { useEffect, useState } from 'react';
import { formatTime } from './formatTime';
import Avatar from './Avatar';

interface Entry {
  profileId: string | null;
  nickname: string;
  displayName?: string;
  avatarColor: string;
  avatarPixels?: string | null;
  timeMs: number;
}

export default function LeaderboardPanel({ levelId, title = 'World’s Best' }: { levelId: number; title?: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    fetch(`/api/leaderboard?levelId=${levelId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEntries(data?.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [levelId]);

  if (entries === null) return null;
  if (entries.length === 0) return <div className="leaderboard-panel"><h4>{title}</h4><p>No runs recorded yet. Be the first.</p></div>;

  return (
    <div className="leaderboard-panel">
      <h4>{title}</h4>
      {entries.map((entry, i) => (
        <div className="leaderboard-row" key={`${entry.profileId ?? entry.nickname}-${i}`}>
          <span className="leaderboard-rank">{i + 1}.</span>
          <Avatar nickname={entry.displayName ?? entry.nickname} color={entry.avatarColor} pixels={entry.avatarPixels} size={20} />
          <span>{entry.displayName ?? entry.nickname}</span>
          <span className="leaderboard-time">{formatTime(entry.timeMs)}</span>
        </div>
      ))}
    </div>
  );
}
