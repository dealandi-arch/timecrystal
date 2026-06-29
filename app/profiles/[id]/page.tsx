'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getLevel } from '../../../components/rpg/levels';
import { formatTime } from '../../../components/profile/formatTime';

interface RunRow {
  levelId: number;
  timeMs: number;
  kills: number;
  secrets: number;
  completedAt: string;
}

interface ProfileData {
  id: string;
  nickname: string;
  avatarColor: string;
  createdAt: string;
}

export default function ProfileViewPage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileData | null | undefined>(undefined);
  const [runs, setRuns] = useState<RunRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/profiles/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setProfile(data?.profile ?? null);
        setRuns(data?.runs ?? []);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <main className="profiles-shell">
      <Link href="/profiles" className="back-link">
        &larr; Back to search
      </Link>
      {profile === undefined && <p>Loading...</p>}
      {profile === null && <p>That profile does not exist.</p>}
      {profile && (
        <>
          <div className="profile-header">
            <span className="avatar-bar" style={{ background: profile.avatarColor, width: '2.4rem', height: '0.9rem' }} />
            <div>
              <h1 style={{ margin: 0 }}>{profile.nickname}</h1>
              <span style={{ opacity: 0.6 }}>#{profile.id}</span>
            </div>
          </div>
          {runs.length === 0 ? (
            <p>No completed levels yet.</p>
          ) : (
            <table className="profile-runs-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Best time</th>
                  <th>Secrets</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.levelId}>
                    <td>{getLevel(run.levelId)?.name ?? `Level ${run.levelId}`}</td>
                    <td>{formatTime(run.timeMs)}</td>
                    <td>{run.secrets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}
