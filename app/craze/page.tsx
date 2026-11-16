'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import TimeCrystalRPG from '../../components/rpg/TimeCrystalRPG';
import CrazeRank from '../../components/rpg/CrazeRank';
import { CRAZE_MINUTES, type CrazeMinutes, crazeArena } from '../../components/rpg/craze';

export default function CrazePage() {
  const [minutes, setMinutes] = useState<CrazeMinutes | null>(null);
  const [round, setRound] = useState(0);
  const play = useMemo(
    () =>
      minutes
        ? {
            levels: [crazeArena(minutes)],
            craze: { minutes },
            finale: { title: 'Round over', text: 'Pick your hero again for another round, or go back to choose a different length.' },
          }
        : null,
    [minutes]
  );

  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Multienemy Craze</h1>
      {!minutes || !play ? (
        <>
          <p>
            Beat as many enemies as you can before the clock runs out. Every enemy you beat is replaced by a new one, and they get tougher as you
            go. Each round length has its own world rank. Help abilities are off, and if you’re knocked out the round ends.
          </p>
          <div className="craze-pick">
            {CRAZE_MINUTES.map((m) => (
              <button key={m} className="ability-card craze-length" onClick={() => setMinutes(m)}>
                <strong>{m}</strong>
                <span>minute{m > 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
          <CrazeRank minutes={1} />
        </>
      ) : (
        <>
          <p>
            <button className="ability-btn story-skip" onClick={() => setMinutes(null)}>
              ← Choose a different length
            </button>{' '}
            <button className="ability-btn story-skip" onClick={() => setRound((r) => r + 1)}>
              ↺ New round
            </button>
          </p>
          <TimeCrystalRPG key={`${minutes}-${round}`} mode="custom" custom={play} />
        </>
      )}
    </main>
  );
}
