'use client';

import { useEffect, useState } from 'react';
import { formatTime } from './formatTime';

interface Entry {
  profileId: string | null;
  nickname: string;
  avatarColor: string;
  timeMs: number;
}

export default function LeaderboardPanel({ levelId }: { levelId: number }) {
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
  if (entries.length === 0) return <div className="leaderboard-panel"><h4>World's Best</h4><p>No runs recorded yet. Be the first.</p></div>;

  return (
    <div className="leaderboard-panel">
      <h4>World&apos;s Best</h4>
      {entries.map((entry, i) => (
        <div className="leaderboard-row" key={`${entry.profileId ?? entry.nickname}-${i}`}>
          <span className="leaderboard-rank">{i + 1}.</span>
          <span className="avatar-bar" style={{ background: entry.avatarColor }} />
          <span>{entry.nickname}</span>
          <span className="leaderboard-time">{formatTime(entry.timeMs)}</span>
        </div>
      ))}
    </div>
  );
}
