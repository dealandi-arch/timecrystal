'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '../profile/ProfileContext';
import { useCollection } from '../profile/CollectionContext';
import { CHARACTERS } from '../rpg/pixelArt';
import { GACHA_CHARACTERS, RARITY_INFO, cardsNeeded, rarityOf } from '../rpg/gacha';

type Side = { shards: number; cards: Record<string, number> };
interface Trade {
  id: number;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  give: Side;
  want: Side;
  status: string;
  createdAt: string;
  mine: boolean;
}
interface Player {
  id: string;
  nickname: string;
  displayName?: string;
}

const heroName = (id: string) => CHARACTERS.find((c) => c.id === id)?.name ?? id;
const GACHA_HEROES = GACHA_CHARACTERS.map((id) => ({ id, name: heroName(id) })).sort((a, b) => a.name.localeCompare(b.name));

function SideText({ side }: { side: Side }) {
  const parts = [side.shards ? `💎 ${side.shards}` : '', ...Object.entries(side.cards ?? {}).map(([id, n]) => `🃏 ${n}× ${heroName(id)}`)].filter(Boolean);
  return <>{parts.length ? parts.join(' · ') : 'nothing'}</>;
}

function CardPicker({ cards, onChange, options, max }: { cards: Record<string, number>; onChange: (c: Record<string, number>) => void; options: { id: string; name: string }[]; max?: (id: string) => number }) {
  const [pick, setPick] = useState(options[0]?.id ?? '');
  useEffect(() => {
    if (!options.some((o) => o.id === pick)) setPick(options[0]?.id ?? '');
  }, [options, pick]);
  return (
    <div className="card-picker">
      {Object.entries(cards).map(([id, n]) => (
        <span key={id} className="card-chip" style={{ borderColor: RARITY_INFO[rarityOf(id)].color }}>
          🃏 {n}× {heroName(id)}
          <button type="button" onClick={() => { const next = { ...cards }; delete next[id]; onChange(next); }} aria-label={`Remove ${heroName(id)}`}>
            ✕
          </button>
        </span>
      ))}
      {options.length > 0 ? (
        <span className="card-add">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Hero card">
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {max ? ` (you have ${max(o.id)})` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ability-btn story-skip"
            onClick={() => {
              if (!pick) return;
              const limit = max ? max(pick) : 50;
              onChange({ ...cards, [pick]: Math.min(limit, (cards[pick] ?? 0) + 1) });
            }}
          >
            + card
          </button>
        </span>
      ) : (
        <small className="gacha-fine">No cards to add.</small>
      )}
    </div>
  );
}

export default function TradeHub() {
  const { profile, loading } = useProfile();
  const { shards, cards, owned, reload } = useCollection();
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [q, setQ] = useState('');
  const [to, setTo] = useState<Player | null>(null);
  const [give, setGive] = useState<Side>({ shards: 0, cards: {} });
  const [want, setWant] = useState<Side>({ shards: 0, cards: {} });

  const load = useCallback(async () => {
    const res = await fetch('/api/trades', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data?.error ?? 'Could not load your trades.');
    else setTrades(data.trades ?? []);
  }, []);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  useEffect(() => {
    if (!profile || to) return;
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/profiles${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setPlayers(((data.profiles ?? []) as Player[]).filter((p) => p.id !== profile.id).slice(0, 8));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, profile, to]);

  async function post(body: Record<string, unknown>, done: string) {
    setError(null);
    setMessage(null);
    const res = await fetch('/api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? 'That didn’t work.');
      return false;
    }
    setMessage(done);
    load();
    reload();
    return true;
  }

  if (loading) return <p>Loading…</p>;
  if (!profile) return <p className="event-error">Sign in to trade with other players.</p>;

  const tradeable = Object.entries(cards)
    .filter(([id, n]) => n > 0 && !owned.includes(id))
    .map(([id]) => ({ id, name: heroName(id) }));
  const incoming = (trades ?? []).filter((t) => !t.mine && t.status === 'pending');
  const outgoing = (trades ?? []).filter((t) => t.mine && t.status === 'pending');
  const history = (trades ?? []).filter((t) => t.status !== 'pending').slice(0, 15);

  return (
    <div className="trade">
      <p className="gacha-fine">
        You have 💎 {shards} Emerald Shards and {tradeable.length ? tradeable.map((c) => `${cards[c.id]}× ${c.name}`).join(', ') : 'no tradeable cards'}. Cards for heroes you already own can’t be traded.
      </p>
      {error && <p className="event-error">{error}</p>}
      {message && <p className="event-ok">{message}</p>}

      <section className="trade-box">
        <h2>📥 Offers for you</h2>
        {incoming.length === 0 ? (
          <p className="gacha-fine">No offers right now.</p>
        ) : (
          incoming.map((t) => (
            <div key={t.id} className="trade-row">
              <p>
                <strong>{t.fromName}</strong> gives <SideText side={t.give} /> and wants <SideText side={t.want} />
              </p>
              <button className="ability-btn report-fine" onClick={() => window.confirm('Accept this trade?') && post({ action: 'accept', id: t.id }, 'Trade done!')}>
                ✅ Accept
              </button>
              <button className="ability-btn story-skip" onClick={() => post({ action: 'decline', id: t.id }, 'Offer declined.')}>
                Decline
              </button>
            </div>
          ))
        )}
      </section>

      <section className="trade-box">
        <h2>🤝 Make an offer</h2>
        {to ? (
          <p>
            Trading with <strong>{to.displayName ?? to.nickname}</strong>{' '}
            <button className="ability-btn story-skip" onClick={() => setTo(null)}>
              Change
            </button>
          </p>
        ) : (
          <>
            <input className="trade-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a player…" aria-label="Find a player" />
            <div className="trade-players">
              {players.map((p) => (
                <button key={p.id} className="admin-player" onClick={() => setTo(p)}>
                  {p.displayName ?? p.nickname} <small>#{p.id}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {to && (
          <div className="trade-sides">
            <div>
              <h3>You give</h3>
              <label>
                💎 <input type="number" min={0} max={shards} value={give.shards} onChange={(e) => setGive({ ...give, shards: Math.max(0, Math.min(shards, Math.floor(Number(e.target.value) || 0))) })} aria-label="Shards you give" />
              </label>
              <CardPicker cards={give.cards} onChange={(c) => setGive({ ...give, cards: c })} options={tradeable} max={(id) => cards[id] ?? 0} />
            </div>
            <div>
              <h3>You want</h3>
              <label>
                💎 <input type="number" min={0} value={want.shards} onChange={(e) => setWant({ ...want, shards: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} aria-label="Shards you want" />
              </label>
              <CardPicker cards={want.cards} onChange={(c) => setWant({ ...want, cards: c })} options={GACHA_HEROES} />
              <small className="gacha-fine">Cards needed to unlock: {['rare', 'epic', 'legendary', 'mythic'].map((r) => `${RARITY_INFO[r as 'rare'].name} ${cardsNeeded(GACHA_CHARACTERS.find((id) => rarityOf(id) === r) ?? '')}`).join(' · ')}</small>
            </div>
            <button
              className="ability-btn power-btn"
              onClick={async () => {
                if (await post({ action: 'offer', toId: to.id, give, want }, `Offer sent to ${to.displayName ?? to.nickname}.`)) {
                  setGive({ shards: 0, cards: {} });
                  setWant({ shards: 0, cards: {} });
                }
              }}
            >
              Send offer
            </button>
          </div>
        )}
      </section>

      <section className="trade-box">
        <h2>📤 Your offers waiting</h2>
        {outgoing.length === 0 ? (
          <p className="gacha-fine">None.</p>
        ) : (
          outgoing.map((t) => (
            <div key={t.id} className="trade-row">
              <p>
                To <strong>{t.toName}</strong>: you give <SideText side={t.give} /> for <SideText side={t.want} />
              </p>
              <button className="ability-btn story-skip" onClick={() => post({ action: 'cancel', id: t.id }, 'Offer cancelled.')}>
                Cancel
              </button>
            </div>
          ))
        )}
      </section>

      {history.length > 0 && (
        <section className="trade-box">
          <h2>Recent trades</h2>
          {history.map((t) => (
            <p key={t.id} className="gacha-fine">
              {t.fromName} → {t.toName}: <SideText side={t.give} /> for <SideText side={t.want} /> · {t.status}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
