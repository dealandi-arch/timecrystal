'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { useProfile } from './ProfileContext';

interface Entry {
  rank: number;
  profileId: string;
  nickname: string;
  displayName: string;
  avatarColor: string;
  avatarPixels: string | null;
  average: number;
  levels: number;
}

// Everyone's average place across every level they've played, to 3 decimal places.
export default function AverageRank() {
  const { profile } = useProfile();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard/average', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error ?? 'Could not load the rank.');
        setEntries(data.entries ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the rank.'));
  }, []);

  if (error) return <p className="event-error">{error}</p>;
  if (!entries) return <p>Loading…</p>;
  if (!entries.length) return <p>No one has a time on the board yet.</p>;
  const mine = profile ? entries.find((e) => e.profileId === profile.id) : null;
  return (
    <div>
      {mine && (
        <p className="event-ok">
          You’re #{mine.rank} with an average place of {mine.average.toFixed(3)} across {mine.levels} level{mine.levels === 1 ? '' : 's'}.
        </p>
      )}
      <table className="profile-runs-table rank3d-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Average place</th>
            <th>Levels played</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.profileId} className={e.profileId === profile?.id ? 'me' : ''}>
              <td>{e.rank}</td>
              <td>
                <Link href={`/profiles/${e.profileId}`} className="rank3d-name">
                  <Avatar nickname={e.nickname} color={e.avatarColor} pixels={e.avatarPixels} size={24} /> {e.displayName}
                </Link>
              </td>
              <td>{e.average.toFixed(3)}</td>
              <td>{e.levels}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
