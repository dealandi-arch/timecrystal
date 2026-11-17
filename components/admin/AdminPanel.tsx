'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '../profile/ProfileContext';
import { formatTime } from '../profile/formatTime';
import { getAnyLevel } from '../rpg/levels3d';
import { CUSTOM_ID_OFFSET } from '../rpg/customLevels';
import CheatCatcher from './CheatCatcher';
import { CHARACTERS } from '../rpg/pixelArt';
import { RARITY_INFO, UNLOCKABLE_CHARACTERS, rarityOf } from '../rpg/gacha';

const GIVEABLE = CHARACTERS.filter((c) => UNLOCKABLE_CHARACTERS.includes(c.id)).sort((a, b) => a.name.localeCompare(b.name));

interface Found {
  id: string;
  nickname: string;
  displayName: string;
  isAdmin: boolean;
}
interface Detail {
  player: Found & { aizodon: number; shards: number; lastSeenAt: string | null };
  runs: { levelId: number; timeMs: number; kills: number; completedAt: string }[];
  craze: { minutes: number; kills: number; achievedAt: string }[];
  log: { id: number; adminId: string; action: string; detail: string; createdAt: string }[];
}

const levelName = (id: number) => (id > CUSTOM_ID_OFFSET ? `Public level #${id - CUSTOM_ID_OFFSET}` : getAnyLevel(id)?.name ?? `Level ${id}`);
const secondsToMs = (v: string) => Math.round(Number(v.replace(',', '.')) * 1000);

export default function AdminPanel() {
  const { profile, loading } = useProfile();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Found[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetTo, setResetTo] = useState('5');
  const [warnTitle, setWarnTitle] = useState('Warning from an admin');
  const [warnText, setWarnText] = useState('');
  const [giveId, setGiveId] = useState(GIVEABLE[0]?.id ?? '');
  const [giveDays, setGiveDays] = useState('3');

  const open = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/players/${id}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMessage({ ok: false, text: data?.error ?? 'Could not load that player.' });
    else setDetail(data);
  }, []);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setMessage(null);
    const res = await fetch(`/api/admin/players?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMessage({ ok: false, text: data?.error ?? 'Search failed.' });
    else setFound(data.players ?? []);
  }

  async function act(payload: Record<string, unknown>, done: string) {
    if (!detail) return;
    setMessage(null);
    const res = await fetch('/api/admin/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: detail.player.id, ...payload }) });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? { ok: true, text: done + (data.changed !== undefined ? ` (${data.changed} changed)` : '') } : { ok: false, text: data?.error ?? 'That didn’t work.' });
    if (res.ok) open(detail.player.id);
  }

  useEffect(() => {
    if (detail) setMessage(null);
  }, [detail?.player.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p>Loading…</p>;
  if (!profile?.isAdmin) return <p className="event-error">Admins only. Sign in with an admin account.</p>;

  return (
    <div className="admin">
      <p>
        <Link href="/chat?channel=admin" className="event-play">
          💬 Admin chat
        </Link>
      </p>
      <CheatCatcher />
      <h2>Players</h2>
      <form className="event-code" onSubmit={search}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Player name or #ID" aria-label="Find a player" />
        <button className="ability-btn" type="submit">
          Find
        </button>
      </form>
      {found && (
        <div className="admin-found">
          {found.length === 0 && <p>No players found.</p>}
          {found.map((p) => (
            <button key={p.id} className={`admin-player${detail?.player.id === p.id ? ' on' : ''}`} onClick={() => open(p.id)}>
              {p.displayName} <small>@{p.nickname} · #{p.id}</small> {p.isAdmin && <span className="verified-badge">🛡 Admin</span>}
            </button>
          ))}
        </div>
      )}
      {message && <p className={message.ok ? 'event-ok' : 'event-error'}>{message.text}</p>}

      {detail && (
        <div className="admin-detail">
          <h2>
            {detail.player.displayName} <small>@{detail.player.nickname} · #{detail.player.id}</small>
          </h2>
          <p className="gacha-fine">
            ⬡ {detail.player.aizodon} Aizodon · 💎 {detail.player.shards} shards · last online {detail.player.lastSeenAt ? new Date(detail.player.lastSeenAt).toLocaleString() : 'unknown'}
          </p>
          <p>
            {detail.player.isAdmin ? (
              <button className="ability-btn story-skip" disabled={detail.player.id === profile.id} onClick={() => window.confirm(`Remove ${detail.player.displayName}’s admin power?`) && act({ action: 'setAdmin', isAdmin: false }, 'Admin power removed.')}>
                Remove admin power
              </button>
            ) : (
              <button className="ability-btn" onClick={() => window.confirm(`Make ${detail.player.displayName} an admin? They’ll be able to change records and warn players.`) && act({ action: 'setAdmin', isAdmin: true }, 'They’re an admin now.')}>
                🛡 Make admin
              </button>
            )}
          </p>

          <h3>World’s Best times</h3>
          {detail.runs.length === 0 ? (
            <p>No times.</p>
          ) : (
            <table className="profile-runs-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Time</th>
                  <th>Set on</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {detail.runs.map((r) => (
                  <tr key={r.levelId}>
                    <td>{levelName(r.levelId)}</td>
                    <td>{formatTime(r.timeMs)}</td>
                    <td>{new Date(r.completedAt).toLocaleDateString()}</td>
                    <td className="admin-actions">
                      <button
                        className="ability-btn story-skip"
                        onClick={() => {
                          const v = window.prompt(`New time for ${levelName(r.levelId)}, in seconds:`, (r.timeMs / 1000).toFixed(2));
                          if (v) act({ action: 'setTime', levelId: r.levelId, timeMs: secondsToMs(v) }, `Time changed to ${v}s.`);
                        }}
                      >
                        Change
                      </button>
                      <button className="ability-btn story-skip" onClick={() => window.confirm(`Delete this time on ${levelName(r.levelId)}?`) && act({ action: 'deleteRun', levelId: r.levelId }, 'Time deleted.')}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form
            className="event-code"
            onSubmit={(e) => {
              e.preventDefault();
              if (window.confirm(`Set every normal-level time (levels 1–11) faster than ${resetTo}s to ${resetTo}s?`)) act({ action: 'resetUnder', timeMs: secondsToMs(resetTo) }, `Times under ${resetTo}s reset.`);
            }}
          >
            <span>Reset levels 1–11 times faster than</span>
            <input value={resetTo} onChange={(e) => setResetTo(e.target.value)} size={4} aria-label="Seconds" />
            <span>seconds</span>
            <button className="ability-btn" type="submit">
              Reset
            </button>
          </form>

          <h3>Craze scores</h3>
          {detail.craze.length === 0 ? (
            <p>No Craze scores.</p>
          ) : (
            detail.craze.map((c) => (
              <p key={c.minutes}>
                {c.minutes} min: 👾 {c.kills}{' '}
                <button className="ability-btn story-skip" onClick={() => window.confirm(`Delete the ${c.minutes}-minute Craze score?`) && act({ action: 'deleteCraze', minutes: c.minutes }, 'Craze score deleted.')}>
                  Delete
                </button>
              </p>
            ))
          )}

          {profile.nickname.toLowerCase() === 'lavatatorr' && <h3>Give a hero or a tryout</h3>}
          {profile.nickname.toLowerCase() === 'lavatatorr' && <div className="event-code admin-give">
            <select value={giveId} onChange={(e) => setGiveId(e.target.value)} aria-label="Hero">
              {GIVEABLE.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({RARITY_INFO[rarityOf(c.id)].name})
                </option>
              ))}
            </select>
            <button className="ability-btn" onClick={() => window.confirm(`Give ${GIVEABLE.find((c) => c.id === giveId)?.name} to ${detail.player.displayName} to keep?`) && act({ action: 'giveHero', heroId: giveId }, 'Hero given.')}>
              🎁 Give hero
            </button>
            <input value={giveDays} onChange={(e) => setGiveDays(e.target.value)} size={3} aria-label="Tryout days" />
            <span>days</span>
            <button className="ability-btn" onClick={() => act({ action: 'giveTrial', heroId: giveId, days: Number(giveDays) }, `${giveDays}-day tryout given.`)}>
              ⏳ Give tryout
            </button>
            <button className="ability-btn story-skip" onClick={() => window.confirm(`Remove ${GIVEABLE.find((c) => c.id === giveId)?.name} from ${detail.player.displayName}?`) && act({ action: 'removeHero', heroId: giveId }, 'Hero removed.')}>
              🗑 Remove hero
            </button>
          </div>}

          <h3>Send a warning</h3>
          <form
            className="admin-warn"
            onSubmit={(e) => {
              e.preventDefault();
              act({ action: 'warn', title: warnTitle, message: warnText }, 'Warning sent. They’ll see it next time they open the site.');
              setWarnText('');
            }}
          >
            <input value={warnTitle} onChange={(e) => setWarnTitle(e.target.value)} maxLength={80} aria-label="Warning title" />
            <textarea value={warnText} onChange={(e) => setWarnText(e.target.value)} maxLength={500} rows={3} placeholder="What did they do, and what happens next time?" aria-label="Warning message" />
            <button className="ability-btn" type="submit" disabled={warnText.trim().length < 3}>
              Send warning
            </button>
          </form>

          <h3>Admin history for this player</h3>
          {detail.log.length === 0 ? (
            <p>Nothing yet.</p>
          ) : (
            <ul className="admin-log">
              {detail.log.map((l) => (
                <li key={l.id}>
                  <small>{new Date(l.createdAt).toLocaleString()}</small> · {l.action}: {l.detail} <small>(by #{l.adminId})</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
