'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { formatTime } from './formatTime';
import { LEVELS_3D } from '../rpg/levels3d';

interface Player {
  profileId: string;
  nickname: string;
  avatarColor: string;
  avatarPixels: string | null;
}
interface Overall extends Player {
  totalMs: number;
  maps: number;
}
interface MapRun extends Player {
  timeMs: number;
}

export default function Rank3D() {
  const [data, setData] = useState<{ overall: Overall[]; maps: Record<number, MapRun[]> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<'overall' | number>('overall');

  useEffect(() => {
    fetch('/api/leaderboard/3d', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p>The 3D World Rank couldn’t be loaded. Try again in a moment.</p>;
  if (!data) return <p>Loading…</p>;

  const name = (p: Player) => (
    <Link href={`/profiles/${p.profileId}`} className="rank3d-name">
      <Avatar nickname={p.nickname} color={p.avatarColor} pixels={p.avatarPixels} size={22} />
      {p.nickname}
    </Link>
  );
  const mapRuns = tab === 'overall' ? [] : data.maps[tab] ?? [];

  return (
    <div className="rank3d">
      <div className="rank3d-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'overall'} className={tab === 'overall' ? 'on' : ''} onClick={() => setTab('overall')}>
          Overall
        </button>
        {LEVELS_3D.map((l) => (
          <button key={l.id} role="tab" aria-selected={tab === l.id} className={tab === l.id ? 'on' : ''} onClick={() => setTab(l.id)}>
            {l.name.replace('3D · ', '')}
          </button>
        ))}
      </div>
      {tab === 'overall' ? (
        data.overall.length === 0 ? (
          <p>No one has cleared a 3D map yet. Be the first.</p>
        ) : (
          <table className="profile-runs-table rank3d-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Maps cleared</th>
                <th>Total time</th>
              </tr>
            </thead>
            <tbody>
              {data.overall.map((p, i) => (
                <tr key={p.profileId}>
                  <td>{i + 1}</td>
                  <td>{name(p)}</td>
                  <td>
                    {p.maps}/{LEVELS_3D.length}
                  </td>
                  <td>{formatTime(p.totalMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : mapRuns.length === 0 ? (
        <p>No runs on this map yet. Be the first.</p>
      ) : (
        <table className="profile-runs-table rank3d-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Best time</th>
            </tr>
          </thead>
          <tbody>
            {mapRuns.map((p, i) => (
              <tr key={p.profileId}>
                <td>{i + 1}</td>
                <td>{name(p)}</td>
                <td>{formatTime(p.timeMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
