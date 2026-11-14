'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { formatTime } from './formatTime';

interface Player {
  profileId: string;
  nickname: string;
  displayName?: string;
  avatarColor: string;
  avatarPixels: string | null;
}
interface Overall extends Player {
  totalMs: number;
  maps: number;
}
interface LevelRun extends Player {
  timeMs: number;
}
export interface RankLevel {
  id: number; // id on the World's Best lists
  name: string;
  href?: string; // where to play it
}

// Overall standings across a group of levels, plus a tab per level (when there aren't too many).
export default function GroupRankView({
  api,
  levels: givenLevels,
  label,
  emptyText,
  levelTabs = true,
}: {
  api: string;
  levels?: RankLevel[]; // known up front (3D maps); otherwise taken from the API
  label: string; // what a level is called: "maps", "levels"
  emptyText: string;
  levelTabs?: boolean;
}) {
  const [data, setData] = useState<{ overall: Overall[]; maps: Record<number, LevelRun[]>; levels?: { id: number; name: string; levelId?: number }[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<'overall' | number>('overall');

  useEffect(() => {
    fetch(api, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then(setData)
      .catch(() => setFailed(true));
  }, [api]);

  if (failed) return <p>The ranking couldn’t be loaded. Try again in a moment.</p>;
  if (!data) return <p>Loading…</p>;

  const levels: RankLevel[] =
    givenLevels ?? (data.levels ?? []).map((l) => ({ id: l.id, name: l.name, href: l.levelId ? `/levels/${l.levelId}` : undefined }));
  const name = (p: Player) => (
    <Link href={`/profiles/${p.profileId}`} className="rank3d-name">
      <Avatar nickname={p.displayName ?? p.nickname} color={p.avatarColor} pixels={p.avatarPixels} size={22} />
      {p.displayName ?? p.nickname}
    </Link>
  );
  const levelRuns = tab === 'overall' ? [] : data.maps[tab] ?? [];
  const current = levels.find((l) => l.id === tab);

  return (
    <div className="rank3d">
      <div className="rank3d-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'overall'} className={tab === 'overall' ? 'on' : ''} onClick={() => setTab('overall')}>
          Overall
        </button>
        {levelTabs &&
          levels.map((l) => (
            <button key={l.id} role="tab" aria-selected={tab === l.id} className={tab === l.id ? 'on' : ''} onClick={() => setTab(l.id)}>
              {l.name}
            </button>
          ))}
      </div>
      {tab === 'overall' ? (
        data.overall.length === 0 ? (
          <p>{emptyText}</p>
        ) : (
          <table className="profile-runs-table rank3d-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>{label[0].toUpperCase() + label.slice(1)} cleared</th>
                <th>Total time</th>
              </tr>
            </thead>
            <tbody>
              {data.overall.map((p, i) => (
                <tr key={p.profileId}>
                  <td>{i + 1}</td>
                  <td>{name(p)}</td>
                  <td>
                    {p.maps}/{levels.length}
                  </td>
                  <td>{formatTime(p.totalMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        <>
          {current?.href && (
            <p>
              <Link href={current.href}>Play {current.name} ▸</Link>
            </p>
          )}
          {levelRuns.length === 0 ? (
            <p>No runs here yet. Be the first.</p>
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
                {levelRuns.map((p, i) => (
                  <tr key={p.profileId}>
                    <td>{i + 1}</td>
                    <td>{name(p)}</td>
                    <td>{formatTime(p.timeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
