'use client';

import { useState } from 'react';
import Link from 'next/link';
import Avatar from '../../components/profile/Avatar';

interface SearchResult {
  id: string;
  nickname: string;
  displayName?: string;
  avatarColor: string;
  avatarPixels?: string | null;
}

export default function ProfilesBrowsePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/profiles?q=${encodeURIComponent(q.trim())}`);
    const data = await res.json().catch(() => ({}));
    setSearching(false);
    setResults(data?.profiles ?? []);
  }

  return (
    <main className="profiles-shell">
      <Link href="/play" className="back-link">
        &larr; Back to the game
      </Link>
      <h1>Browse Profiles</h1>
      <p>Search for other players to see their avatar, heroes, levels and best runs.</p>
      <div className="profile-search">
        <input
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => search(e.target.value)}
        />
      </div>
      {searching && <p>Searching...</p>}
      {results && results.length === 0 && <p>No profiles found.</p>}
      {results &&
        results.map((p) => (
          <Link key={p.id} href={`/profiles/${p.id}`} className="profile-result-row">
            <Avatar nickname={p.displayName ?? p.nickname} color={p.avatarColor} pixels={p.avatarPixels} size={32} />
            <span>{p.displayName ?? p.nickname}</span>
            {p.displayName && p.displayName !== p.nickname && <span className="profile-username">@{p.nickname}</span>}
            <span style={{ opacity: 0.6, marginLeft: 'auto' }}>#{p.id}</span>
          </Link>
        ))}
    </main>
  );
}
