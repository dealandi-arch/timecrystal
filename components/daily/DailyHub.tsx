'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '../profile/ProfileContext';
import { useCollection } from '../profile/CollectionContext';
import { type DailyState, QUESTS, WHEEL, rewardText } from '../rpg/daily';

const SLICE_DEG = 360 / WHEEL.length;

function untilMidnightUtc(): string {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const mins = Math.max(0, Math.round((next - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function DailyHub() {
  const { profile, loading } = useProfile();
  const { reload } = useCollection();
  const [state, setState] = useState<DailyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetch('/api/daily', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) setError(data?.error ?? 'Could not load your daily rewards.');
        else setState(data.state);
      })
      .catch(() => setError('Could not load your daily rewards.'));
  }, [profile]);

  async function spin() {
    if (!state || state.spun || spinning) return;
    setSpinning(true);
    setMessage(null);
    const res = await fetch('/api/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'spin' }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSpinning(false);
      setError(data?.error ?? 'The wheel got stuck. Try again.');
      return;
    }
    // Turn the wheel so the winning slice ends under the pointer at the top.
    const index = WHEEL.findIndex((w) => w.id === data.slice);
    const target = 360 * 6 + (360 - (index * SLICE_DEG + SLICE_DEG / 2));
    setAngle((a) => a - (a % 360) + target);
    window.setTimeout(() => {
      setSpinning(false);
      setState(data.state);
      setMessage(data.got ? `You won ${data.got}!` : 'You won, but it couldn’t be saved. Ask an admin.');
      reload();
    }, 4200);
  }

  async function claim(quest: string) {
    setMessage(null);
    const res = await fetch('/api/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'claim', quest }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data?.error ?? 'Could not claim that.');
    else {
      setState(data.state);
      setMessage(`Quest reward: ${data.got ?? 'saved'}!`);
      reload();
    }
  }

  if (loading) return <p>Loading…</p>;
  if (!profile) return <p className="event-error">Sign in to spin the wheel and do daily quests (rewards are saved on your profile).</p>;
  if (error && !state) return <p className="event-error">{error}</p>;
  if (!state) return <p>Loading…</p>;

  const gradient = `conic-gradient(${WHEEL.map((w, i) => `${w.color} ${i * SLICE_DEG}deg ${(i + 1) * SLICE_DEG}deg`).join(', ')})`;
  return (
    <div className="daily">
      <section className="daily-wheel-box">
        <h2>🎡 Daily wheel</h2>
        <div className="wheel-wrap">
          <div className="wheel-pointer" aria-hidden="true">▼</div>
          <div className="wheel" style={{ background: gradient, transform: `rotate(${angle}deg)` }}>
            {WHEEL.map((w, i) => (
              <span key={w.id} className="wheel-label" style={{ transform: `rotate(${i * SLICE_DEG + SLICE_DEG / 2}deg) translateY(-6.2rem)` }}>
                {w.label}
              </span>
            ))}
          </div>
        </div>
        <button className="ability-btn power-btn wheel-spin" onClick={spin} disabled={state.spun || spinning}>
          {spinning ? 'Spinning…' : state.spun ? `Next spin in ${untilMidnightUtc()}` : 'Spin!'}
        </button>
        <p className="gacha-fine">One free spin every day. Prizes: {WHEEL.map((w) => w.label).join(' · ')}.</p>
      </section>

      <section className="daily-quests">
        <h2>📋 Daily quests</h2>
        <p className="gacha-fine">New quests in {untilMidnightUtc()}.</p>
        {QUESTS.map((q) => {
          const have = Math.min(q.goal, state.progress[q.id] ?? 0);
          const done = have >= q.goal;
          const claimed = state.claimed.includes(q.id);
          return (
            <div key={q.id} className={`quest${claimed ? ' claimed' : done ? ' done' : ''}`}>
              <div className="quest-top">
                <strong>{q.label}</strong>
                <span>
                  {have}/{q.goal}
                </span>
              </div>
              <span className="card-progress quest-bar">
                <span style={{ width: `${(have / q.goal) * 100}%` }} />
              </span>
              <div className="quest-bottom">
                <small>Reward: {rewardText(q.reward)}</small>
                {claimed ? (
                  <span className="verified-badge">✔ Claimed</span>
                ) : (
                  <button className="ability-btn" disabled={!done} onClick={() => claim(q.id)}>
                    Claim
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
      {message && <p className="event-ok daily-message">{message}</p>}
      {error && state && <p className="event-error">{error}</p>}
    </div>
  );
}
