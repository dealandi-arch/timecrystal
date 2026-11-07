'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getLevel } from '../../../components/rpg/levels';
import { formatTime } from '../../../components/profile/formatTime';
import Avatar from '../../../components/profile/Avatar';
import AvatarEditor from '../../../components/profile/AvatarEditor';
import { useProfile } from '../../../components/profile/ProfileContext';
import { CHARACTERS } from '../../../components/rpg/pixelArt';
import { RARITY_INFO, rarityOf } from '../../../components/rpg/gacha';
import { overallPower } from '../../../components/rpg/progression';
import { HeroSprite } from '../../../components/rpg/GachaScreen';

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
  avatarPixels: string | null;
  lastSeenAt: string | null;
  recentCharacters: string[];
  ownedCharacters: string[];
  characterLevels: Record<string, number>;
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function lastOnline(iso: string | null): string {
  if (!iso) return 'Not recorded yet';
  const ago = Date.now() - new Date(iso).getTime();
  if (ago < ONLINE_WINDOW_MS) return 'Online now';
  const minutes = Math.round(ago / 60000);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ProfileViewPage() {
  const params = useParams<{ id: string }>();
  const { profile: me, setAvatar } = useProfile();
  const [profile, setProfile] = useState<ProfileData | null | undefined>(undefined);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [editing, setEditing] = useState(false);

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

  const isMe = !!me && !!profile && me.id === profile.id;

  // Every hero this player has: all common heroes plus the gacha heroes they've unlocked.
  const heroes = profile
    ? CHARACTERS.filter((c) => rarityOf(c.id) === 'common' || profile.ownedCharacters.includes(c.id))
        .map((c) => {
          const level = profile.characterLevels[c.id] ?? 1;
          return { hero: c, level, ovrl: overallPower(rarityOf(c.id), level) };
        })
        .sort((a, b) => b.ovrl - a.ovrl || b.level - a.level || a.hero.name.localeCompare(b.hero.name))
    : [];
  const best = heroes[0];
  const recent = profile ? profile.recentCharacters.map((id) => heroes.find((h) => h.hero.id === id)).filter((h): h is (typeof heroes)[number] => !!h) : [];

  async function saveAvatar(pixels: string | null, color: string): Promise<string | null> {
    const res = await fetch('/api/profile/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pixels, color }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data?.error ?? 'Could not save your avatar.';
    setProfile((p) => (p ? { ...p, avatarPixels: data.avatarPixels, avatarColor: data.avatarColor } : p));
    setAvatar(data.avatarPixels, data.avatarColor);
    return null;
  }

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
            <Avatar nickname={profile.nickname} color={profile.avatarColor} pixels={profile.avatarPixels} size={96} />
            <div>
              <h1 style={{ margin: 0 }}>{profile.nickname}</h1>
              <span style={{ opacity: 0.6 }}>#{profile.id}</span>
              {isMe && (
                <div>
                  <button className="ability-btn profile-edit-avatar" onClick={() => setEditing(true)}>
                    {profile.avatarPixels ? 'Edit avatar' : 'Create avatar'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-stats">
            <div>
              <small>Last online</small>
              <strong className={lastOnline(profile.lastSeenAt) === 'Online now' ? 'profile-online' : ''}>{lastOnline(profile.lastSeenAt)}</strong>
            </div>
            <div>
              <small>Best OVRL</small>
              <strong>{best ? best.ovrl : '–'}</strong>
              {best && <span>{best.hero.name} · Lv {best.level}</span>}
            </div>
            <div>
              <small>Heroes</small>
              <strong>{heroes.length}/{CHARACTERS.length}</strong>
            </div>
          </div>

          <h2 className="profile-section">Recently used</h2>
          {recent.length === 0 ? (
            <p className="profile-empty">No heroes played yet.</p>
          ) : (
            <div className="profile-recent">
              {recent.map(({ hero, level }) => (
                <div key={hero.id} className="profile-hero-chip">
                  <HeroSprite char={hero} size={48} />
                  <span>{hero.name}</span>
                  <small>Lv {level}</small>
                </div>
              ))}
            </div>
          )}

          <h2 className="profile-section">Heroes</h2>
          <div className="profile-heroes">
            {heroes.map(({ hero, level, ovrl }) => {
              const rarity = rarityOf(hero.id);
              return (
                <div key={hero.id} className="profile-hero" style={{ borderColor: RARITY_INFO[rarity].color }}>
                  <HeroSprite char={hero} size={48} />
                  <span className="profile-hero-name">{hero.name}</span>
                  <small style={{ color: RARITY_INFO[rarity].color }}>{RARITY_INFO[rarity].name}</small>
                  <small>Lv {level} · OVRL {ovrl}</small>
                </div>
              );
            })}
          </div>

          <h2 className="profile-section">Best runs</h2>
          {runs.length === 0 ? (
            <p className="profile-empty">No completed levels yet.</p>
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
          {editing && (
            <AvatarEditor
              nickname={profile.nickname}
              color={profile.avatarColor}
              pixels={profile.avatarPixels}
              onSave={saveAvatar}
              onClose={() => setEditing(false)}
            />
          )}
        </>
      )}
    </main>
  );
}
