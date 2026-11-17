'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from '../../components/profile/Avatar';

interface Player {
  id: string;
  nickname: string;
  displayName?: string;
  avatarColor: string;
  avatarPixels?: string | null;
  lastSeenAt?: string | null;
}

const ONLINE_MS = 5 * 60 * 1000;

function seen(iso?: string | null): string {
  if (!iso) return '';
  const ago = Date.now() - new Date(iso).getTime();
  if (ago < ONLINE_MS) return '🟢 Online';
  const mins = Math.round(ago / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function PlayersPage() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  // Everyone straight away; typing searches.
  useEffect(() => {
    const ask = ++latest.current;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/profiles${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (ask !== latest.current) return;
        if (!res.ok) setError(data?.error ?? 'Could not load players.');
        else {
          setError(null);
          setPlayers(data.profiles ?? []);
        }
      } catch {
        if (ask === latest.current) setError('Could not load players.');
      }
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <main className="profiles-shell">
      <Link href="/" className="back-link">
        &larr; Back home
      </Link>
      <h1>Players</h1>
      <p>Everyone who plays Time Crystal, most recently online first. Tap a player to see their avatar, heroes and best runs.</p>
      <div className="profile-search">
        <input type="text" placeholder="Search by name or #ID…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search players" />
      </div>
      {error && <p className="event-error">{error}</p>}
      {players === null && !error && <p>Loading players…</p>}
      {players && players.length === 0 && <p>{query ? 'No players found.' : 'No players yet.'}</p>}
      {players?.map((p) => (
        <Link key={p.id} href={`/profiles/${p.id}`} className="profile-result-row">
          <Avatar nickname={p.displayName ?? p.nickname} color={p.avatarColor} pixels={p.avatarPixels} size={32} />
          <span>{p.displayName ?? p.nickname}</span>
          {p.displayName && p.displayName !== p.nickname && <span className="profile-username">@{p.nickname}</span>}
          <span className="player-seen">{seen(p.lastSeenAt)}</span>
          <span style={{ opacity: 0.6, marginLeft: 'auto' }}>#{p.id}</span>
        </Link>
      ))}
    </main>
  );
}
