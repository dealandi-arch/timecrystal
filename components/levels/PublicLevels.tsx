'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useProfile } from '../profile/ProfileContext';
import { formatTime } from '../profile/formatTime';

interface ListedLevel {
  id: number;
  name: string;
  mode: '2d' | '3d';
  author: string;
  authorId: string;
  plays: number;
  enemies: number;
  createdAt: string;
  verifiedAt: string | null;
  verifyTimeMs: number | null;
}

type Tab = 'new' | 'popular' | 'mine';

export default function PublicLevels() {
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>('new');
  const [levels, setLevels] = useState<ListedLevel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLevels(null);
    setError(null);
    const query = tab === 'mine' ? 'mine=1' : `sort=${tab}`;
    fetch(`/api/levels?${query}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error ?? 'Could not load levels.');
        setLevels(data.levels ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load levels.'));
  }, [tab]);

  return (
    <div className="public-levels">
      <div className="rank3d-tabs">
        <Link href="/levels/new" className="event-play">
          ✎ Build a level
        </Link>
        <Link href="/levels/rank" className="rank-link">
          🏆 Rank
        </Link>
        <button className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>
          Newest
        </button>
        <button className={tab === 'popular' ? 'on' : ''} onClick={() => setTab('popular')}>
          Most played
        </button>
        {profile && (
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
            Your levels
          </button>
        )}
      </div>
      {tab === 'mine' && <p className="gacha-fine">New levels stay hidden until you beat them once to verify them.</p>}
      {error && <p className="event-error">{error}</p>}
      {!error && levels === null && <p>Loading…</p>}
      {levels?.length === 0 && <p>{tab === 'mine' ? 'You haven’t published any levels yet.' : 'No public levels yet. Build the first one!'}</p>}
      {levels && levels.length > 0 && (
        <div className="public-level-list">
          {levels.map((l) => (
            <Link key={l.id} href={`/levels/${l.id}`} className="public-level">
              <span className="view3d-tag">{l.mode.toUpperCase()}</span>
              <strong>{l.name}</strong>
              {l.verifiedAt ? <span className="verified-badge">✔ Verified</span> : <span className="unverified-badge">Needs verifying: beat it once</span>}
              <span className="gacha-fine">
                by {l.author} · {l.enemies} enem{l.enemies === 1 ? 'y' : 'ies'} · {l.plays} play{l.plays === 1 ? '' : 's'}
                {l.verifyTimeMs ? ` · verified in ${formatTime(l.verifyTimeMs)}` : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
