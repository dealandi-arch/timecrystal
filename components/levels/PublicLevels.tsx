'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ListedLevel {
  id: number;
  name: string;
  mode: '2d' | '3d';
  author: string;
  authorId: string;
  plays: number;
  enemies: number;
  createdAt: string;
}

export default function PublicLevels() {
  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [levels, setLevels] = useState<ListedLevel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLevels(null);
    setError(null);
    fetch(`/api/levels?sort=${sort}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error ?? 'Could not load levels.');
        setLevels(data.levels ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load levels.'));
  }, [sort]);

  return (
    <div className="public-levels">
      <div className="rank3d-tabs">
        <Link href="/levels/new" className="event-play">
          ✎ Build a level
        </Link>
        <button className={sort === 'new' ? 'on' : ''} onClick={() => setSort('new')}>
          Newest
        </button>
        <button className={sort === 'popular' ? 'on' : ''} onClick={() => setSort('popular')}>
          Most played
        </button>
      </div>
      {error && <p className="event-error">{error}</p>}
      {!error && levels === null && <p>Loading…</p>}
      {levels?.length === 0 && <p>No public levels yet. Build the first one!</p>}
      {levels && levels.length > 0 && (
        <div className="public-level-list">
          {levels.map((l) => (
            <Link key={l.id} href={`/levels/${l.id}`} className="public-level">
              <span className="view3d-tag">{l.mode.toUpperCase()}</span>
              <strong>{l.name}</strong>
              <span className="gacha-fine">
                by {l.author} · {l.enemies} enem{l.enemies === 1 ? 'y' : 'ies'} · {l.plays} play{l.plays === 1 ? '' : 's'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
