'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TimeCrystalRPG from '../rpg/TimeCrystalRPG';
import ArenaGame from './ArenaGame';
import { LEVELS, getLevel } from '../rpg/levels';
import type { Replay } from '../rpg/replay';
import type { RaceConfig } from '../rpg/race';
import { formatTime } from '../profile/formatTime';
import { useProfile } from '../profile/ProfileContext';

type MatchView = {
  id: number;
  mode: 'ghost' | 'live';
  kind: 'race' | 'arena';
  invite: boolean;
  side: 'a' | 'b';
  levelId: number;
  status: 'waiting' | 'ready' | 'done' | 'cancelled';
  startAt: number | null;
  serverNow: number;
  opponent: { id: string; name: string; rating: number } | null;
  opponentPos: { x: number; y: number } | null;
  finished: boolean;
  youWon: boolean | null;
  ratingChange: number | null;
  reward: number;
  myTimeMs: number | null;
  opponentTimeMs: number | null;
};
type Ghost = { profileId: string; name: string; rating: number; timeMs: number };
type Entry = { profileId: string; name: string; avatarColor: string; rating: number; wins: number; losses: number };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function PvpHub() {
  const { profile, loading } = useProfile();
  const [view, setView] = useState<MatchView | null>(null);
  const [ghost, setGhost] = useState<Replay | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [levelId, setLevelId] = useState(1);
  const [ghosts, setGhosts] = useState<Ghost[] | null>(null);
  const [board, setBoard] = useState<Entry[] | null>(null);
  const [challenges, setChallenges] = useState<MatchView[]>([]);
  const [friend, setFriend] = useState('');
  const [friendKind, setFriendKind] = useState<'race' | 'arena'>('arena');

  // Live race plumbing (refs so the game loop always sees the latest).
  const oppRef = useRef<{ x: number; y: number } | null>(null);
  const startRef = useRef<number | null>(null);
  const sendingRef = useRef(false);

  const apply = useCallback((m: MatchView) => {
    setView(m);
    oppRef.current = m.opponentPos;
    if (m.startAt) startRef.current = m.startAt - (m.serverNow - Date.now()); // corrected for the gap between the server's clock and this one
  }, []);

  const loadBoard = useCallback(() => {
    fetch('/api/pvp/leaderboard', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setBoard(d.entries ?? []))
      .catch(() => setBoard([]));
  }, []);
  useEffect(loadBoard, [loadBoard]);

  useEffect(() => {
    if (!profile) return;
    setGhosts(null);
    fetch(`/api/pvp/ghosts?levelId=${levelId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setGhosts(d.ghosts ?? []))
      .catch(() => setGhosts([]));
  }, [profile, levelId]);

  // Challenges other players sent you: check every few seconds while you're on the menu.
  const onMenu = !playing && !(view && view.status === 'waiting');
  useEffect(() => {
    if (!profile || !onMenu) return;
    const load = () =>
      fetch('/api/pvp/challenge', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => setChallenges(d.challenges ?? []))
        .catch(() => {});
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [profile, onMenu]);

  // Waiting for a live opponent: check every second.
  const waitingId = view?.mode === 'live' && view.status === 'waiting' ? view.id : null;
  const waitingInvite = !!view?.invite;
  useEffect(() => {
    if (waitingId === null) return;
    const timer = window.setInterval(async () => {
      const res = await fetch(`/api/pvp/match?id=${waitingId}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!data.match) return;
      apply(data.match);
      if (data.match.status === 'ready') setPlaying(true);
      if (data.match.status === 'cancelled') {
        setError(waitingInvite ? 'The challenge was declined or ran out of time.' : 'Nobody joined. Try again in a moment.');
        setView(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [waitingId, waitingInvite, apply]);

  async function raceGhost(g: Ghost) {
    setBusy(true);
    setError(null);
    const { ok, data } = await post('/api/pvp/start', { mode: 'ghost', levelId, opponentId: g.profileId });
    setBusy(false);
    if (!ok) return setError(data?.error ?? 'Could not start the race.');
    setGhost(data.ghost as Replay);
    apply(data.match);
    setPlaying(true);
  }

  async function sendChallenge() {
    setBusy(true);
    setError(null);
    const { ok, data } = await post('/api/pvp/challenge', { action: 'send', who: friend, kind: friendKind, levelId });
    setBusy(false);
    if (!ok) return setError(data?.error ?? 'Could not send the challenge.');
    setGhost(null);
    apply(data.match);
  }

  async function acceptChallenge(c: MatchView) {
    setBusy(true);
    setError(null);
    const { ok, data } = await post('/api/pvp/challenge', { action: 'accept', matchId: c.id });
    setBusy(false);
    if (!ok) return setError(data?.error ?? 'Could not accept.');
    setGhost(null);
    setChallenges([]);
    apply(data.match);
    setPlaying(true);
  }

  async function declineChallenge(c: MatchView) {
    await post('/api/pvp/leave', { matchId: c.id });
    setChallenges((list) => list.filter((x) => x.id !== c.id));
  }

  async function findLive(kind: 'race' | 'arena') {
    setBusy(true);
    setError(null);
    const { ok, data } = await post('/api/pvp/start', { mode: 'live', kind });
    setBusy(false);
    if (!ok) return setError(data?.error ?? 'Could not join the queue.');
    setGhost(null);
    apply(data.match);
    if (data.match.status === 'ready') setPlaying(true);
  }

  async function leave() {
    if (!view) return;
    const started = playing && !view.finished && (view.mode === 'ghost' || (view.startAt !== null && Date.now() > (startRef.current ?? Infinity)));
    if (started && !window.confirm('Leaving a race that has started counts as a loss. Leave?')) return;
    await post('/api/pvp/leave', { matchId: view.id });
    setPlaying(false);
    setView(null);
    setGhost(null);
    loadBoard();
  }

  function backToMenu() {
    setPlaying(false);
    setView(null);
    setGhost(null);
    loadBoard();
  }

  const race: RaceConfig | null = useMemo(() => {
    if (!view || !playing) return null;
    const matchId = view.id;
    return {
      opponentName: view.opponent?.name ?? 'Opponent',
      ghost: ghost ?? undefined,
      live:
        view.mode === 'live'
          ? {
              getStartAt: () => startRef.current,
              opponent: oppRef,
              send: (x: number, y: number, ms: number) => {
                if (sendingRef.current) return;
                sendingRef.current = true;
                post('/api/pvp/match', { id: matchId, x, y, ms })
                  .then(({ data }) => data?.match && apply(data.match))
                  .finally(() => {
                    sendingRef.current = false;
                  });
              },
            }
          : undefined,
      onFinish: async (stats, ticket) => {
        const { data } = await post('/api/pvp/finish', { matchId, timeMs: stats.timeMs, ticket, usedAbility: stats.usedAbility, replay: stats.replay });
        if (data?.match) apply(data.match);
        else setError(data?.error ?? 'Your result couldn’t be saved.');
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.id, playing, ghost]);

  const play = useMemo(() => {
    const level = view ? getLevel(view.levelId) : undefined;
    if (!level || !race) return null;
    return { levels: [level], race, finale: { title: 'Race over', text: 'Back to the race menu to go again.' } };
  }, [view?.levelId, race]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p>Loading…</p>;
  if (!profile) return <p>Sign in to race other players.</p>;

  if (playing && view && view.kind === 'arena') {
    const draw = view.status === 'cancelled' && !view.finished;
    return (
      <div>
        <p>
          <button className="ability-btn story-skip" onClick={view.finished || draw ? backToMenu : leave}>
            {view.finished || draw ? '← Back to the race menu' : '← Leave fight'}
          </button>{' '}
          <strong>
            ⚔️ Arena fight vs {view.opponent?.name ?? 'Opponent'}
            {view.opponent ? ` (${view.opponent.rating})` : ''}
          </strong>
        </p>
        {view.finished && (
          <div className="pvp-result">
            <h2>{view.youWon ? '🏆 You won!' : 'You lost'}</h2>
            <p>
              {view.ratingChange !== null && `Rating ${view.ratingChange >= 0 ? '+' : ''}${view.ratingChange}. `}
              {view.reward > 0 && `+${view.reward} Emerald Shards. `}
            </p>
          </div>
        )}
        {draw && (
          <div className="pvp-result">
            <h2>Draw</h2>
            <p>Time ran out with equal hits. No rating change.</p>
          </div>
        )}
        <ArenaGame key={view.id} matchId={view.id} side={view.side} opponentName={view.opponent?.name ?? 'Opponent'} onMatch={apply} />
      </div>
    );
  }

  if (playing && view && play) {
    const level = getLevel(view.levelId);
    return (
      <div>
        <p>
          <button className="ability-btn story-skip" onClick={view.finished ? backToMenu : leave}>
            {view.finished ? '← Back to the race menu' : '← Leave race'}
          </button>{' '}
          <strong>
            {view.mode === 'live' ? '⚡ Live' : '👻 Ghost'} race on {level?.name ?? `level ${view.levelId}`} vs {view.opponent?.name ?? 'Opponent'}
            {view.opponent ? ` (${view.opponent.rating})` : ''}
          </strong>
        </p>
        {error && <p className="event-error">{error}</p>}
        {view.finished && (
          <div className="pvp-result">
            <h2>{view.youWon ? '🏆 You won!' : 'You lost'}</h2>
            <p>
              {view.myTimeMs ? `Your time ${formatTime(view.myTimeMs)}. ` : ''}
              {view.mode === 'ghost' && view.opponentTimeMs ? `Ghost: ${formatTime(view.opponentTimeMs)}. ` : ''}
              {view.ratingChange !== null && `Rating ${view.ratingChange >= 0 ? '+' : ''}${view.ratingChange}. `}
              {view.reward > 0 && `+${view.reward} Emerald Shards. `}
              {view.mode === 'ghost' && view.youWon && view.reward === 0 && 'You’ve had today’s shard rewards for ghost races. '}
            </p>
          </div>
        )}
        <TimeCrystalRPG key={view.id} mode="custom" custom={play} />
      </div>
    );
  }

  if (view && view.mode === 'live' && view.status === 'waiting') {
    return (
      <div>
        <h2>{view.invite ? `Waiting for ${view.opponent?.name ?? 'your friend'} to accept…` : 'Looking for an opponent…'}</h2>
        <p>
          {view.invite
            ? 'They’ve been notified and have 5 minutes to accept.'
            : view.kind === 'arena'
              ? 'You’ll be matched with the next player who joins the arena.'
              : 'You’ll be matched with the next player who joins. The level is picked for you both.'}
        </p>
        <button className="ability-btn story-skip" onClick={leave}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="pvp-hub">
      <p>
        Race another player on the same level: the faster finish wins. Win to gain rating and Emerald Shards. Help abilities are off in races, and every
        run is checked like a World’s Best run.
      </p>
      {error && <p className="event-error">{error}</p>}

      {challenges.length > 0 && (
        <>
          <h2>📨 Challenges for you</h2>
          <ul className="pvp-list">
            {challenges.map((c) => (
              <li key={c.id}>
                <span>
                  {c.opponent?.name ?? 'A player'} <small>{c.kind === 'arena' ? 'arena fight' : `live race on ${getLevel(c.levelId)?.name ?? 'a level'}`}</small>
                </span>
                <button className="ability-btn" disabled={busy} onClick={() => acceptChallenge(c)}>
                  Accept
                </button>
                <button className="ability-btn story-skip" onClick={() => declineChallenge(c)}>
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>⚡ Live race</h2>
      <p>Get matched with another player right now. You each pick a hero, and the race starts when you’re both at the start. Win: +6 Emerald Shards.</p>
      <button className="event-play" disabled={busy} onClick={() => findLive('race')}>
        Find a race opponent
      </button>

      <h2>⚔️ Arena fight</h2>
      <p>A live 1v1 fight in a walled room. Dodge, fire, and land 5 hits before they do. Win: +6 Emerald Shards. Needs two players online at the same time.</p>
      <button className="event-play" disabled={busy} onClick={() => findLive('arena')}>
        Find an arena opponent
      </button>

      <h2>🤝 Challenge a friend</h2>
      <p>Type a player’s username or #ID. They get a notification and 5 minutes to accept.</p>
      <div className="event-code">
        <input value={friend} onChange={(e) => setFriend(e.target.value)} placeholder="Username or #ID" aria-label="Player to challenge" />
        <select value={friendKind} onChange={(e) => setFriendKind(e.target.value as 'race' | 'arena')} aria-label="Kind">
          <option value="arena">Arena fight</option>
          <option value="race">Race on level {levelId}</option>
        </select>
        <button className="ability-btn" disabled={busy || !friend.trim()} onClick={sendChallenge}>
          Challenge
        </button>
      </div>

      <h2>👻 Ghost race</h2>
      <p>Race the recorded best run of another player, any time. Win: +2 Emerald Shards (up to 5 rewarded wins a day), and half the rating.</p>
      <div className="craze-pick">
        {LEVELS.map((l) => (
          <button key={l.id} className={`ability-card craze-length${levelId === l.id ? ' on' : ''}`} onClick={() => setLevelId(l.id)} aria-pressed={levelId === l.id}>
            <strong>{l.id}</strong>
            <span>{l.name}</span>
          </button>
        ))}
      </div>
      {ghosts === null ? (
        <p>Loading ghosts…</p>
      ) : ghosts.length === 0 ? (
        <p>Nobody has a recorded run on this level yet.</p>
      ) : (
        <ul className="pvp-list">
          {ghosts.map((g) => (
            <li key={g.profileId}>
              <span>
                {g.name} <small>rating {g.rating}</small>
              </span>
              <span>{formatTime(g.timeMs)}</span>
              <button className="ability-btn" disabled={busy} onClick={() => raceGhost(g)}>
                Race
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>🏆 PvP rank</h2>
      {board === null ? (
        <p>Loading…</p>
      ) : board.length === 0 ? (
        <p>No races yet. Be the first!</p>
      ) : (
        <ol className="pvp-list">
          {board.map((e) => (
            <li key={e.profileId}>
              <span>{e.name}</span>
              <span>{e.rating}</span>
              <small>
                {e.wins}W {e.losses}L
              </small>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
