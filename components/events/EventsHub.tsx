'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCollection } from '../profile/CollectionContext';
import { CHARACTERS } from '../rpg/pixelArt';
import { PARKSTER_EVENT_LEVELS, PARKSTER_TRYOUT, TRIAL_DAYS, redeemCode } from '../rpg/events';
import { RARITY_INFO, SECRET_CHARACTERS, SECRET_DROP_CHANCE, rarityOf } from '../rpg/gacha';
import { formatTrialLeft } from '../rpg/TimeCrystalRPG';

const heroName = (id: string) => CHARACTERS.find((c) => c.id === id)?.name ?? id;

export default function EventsHub() {
  const { owned, trialEndsAt, trials, startTrial } = useCollection();
  const [code, setCode] = useState('');
  const [codeMessage, setCodeMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [tryoutMessage, setTryoutMessage] = useState<string | null>(null);

  const parksterOwned = owned.includes('parkster');
  const parksterTrial = trialEndsAt('parkster');
  const parksterUsed = !!trials.parkster && !parksterTrial;

  function redeem() {
    const reward = redeemCode(code);
    if (!reward) {
      setCodeMessage({ ok: false, text: 'That code doesn’t work.' });
      return;
    }
    if (owned.includes(reward.heroId)) {
      setCodeMessage({ ok: false, text: `You already own ${heroName(reward.heroId)}.` });
      return;
    }
    const result = startTrial(reward.heroId, reward.days);
    setCodeMessage(
      result.ok
        ? { ok: true, text: `${heroName(reward.heroId)} unlocked for ${formatTrialLeft(result.value)}! Pick that hero from the hero list.` }
        : { ok: false, text: result.error }
    );
  }

  function startTryout() {
    const result = startTrial('parkster', TRIAL_DAYS);
    setTryoutMessage(result.ok ? null : result.error);
  }

  return (
    <div className="events">
      <p>
        <Link className="event-play" href="/events/rank">
          🏆 Event Rank
        </Link>
      </p>
      <section className="event-card event-parkster">
        <span className="rarity-badge" style={{ background: RARITY_INFO[rarityOf('parkster')].color }}>{RARITY_INFO[rarityOf('parkster')].name} hero</span>
        <h2>🏃 {PARKSTER_TRYOUT.title}</h2>
        <p>{PARKSTER_TRYOUT.blurb}</p>
        <ul className="event-levels">
          {PARKSTER_EVENT_LEVELS.map((l) => (
            <li key={l.id}>{l.name.replace('Parkster Event · ', '')} — {l.enemies.length} enemies</li>
          ))}
        </ul>
        {parksterOwned ? (
          <p className="event-status">You own Parkster, so the event is open to you any time.</p>
        ) : parksterTrial ? (
          <p className="event-status">⏳ Your tryout ends in {formatTrialLeft(parksterTrial)}.</p>
        ) : parksterUsed ? (
          <p className="event-status">Your tryout has ended. Get Parkster from the <Link href="/gacha">Gacha</Link> to keep playing him.</p>
        ) : (
          <button className="ability-btn power-btn" onClick={startTryout}>
            Start {TRIAL_DAYS}-day tryout
          </button>
        )}
        {tryoutMessage && <p className="event-error">{tryoutMessage}</p>}
        {(parksterOwned || parksterTrial) && (
          <p>
            <Link className="event-play" href="/events/parkster">
              Play the event levels ▸
            </Link>
          </p>
        )}
      </section>

      <section className="event-card event-secret">
        <span className="rarity-badge" style={{ background: RARITY_INFO.secret.color }}>Secret heroes</span>
        <h2>🎁 Secret hero trial</h2>
        <p>
          There are {SECRET_CHARACTERS.length} Secret heroes. They never appear in the Gacha or the Shop: every level you clear has a{' '}
          {Math.round(SECRET_DROP_CHANCE * 100)}% chance to give you one you don’t have yet, and once you have one it’s yours to keep.
        </p>
        <p>Got a code? Redeem it for a free {TRIAL_DAYS}-day trial of a Secret hero.</p>
        <form
          className="event-code"
          onSubmit={(e) => {
            e.preventDefault();
            redeem();
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" aria-label="Event code" maxLength={20} />
          <button type="submit" className="ability-btn">
            Redeem
          </button>
        </form>
        {codeMessage && <p className={codeMessage.ok ? 'event-ok' : 'event-error'}>{codeMessage.text}</p>}
        <p className="gacha-fine">Trials are saved in this browser.</p>
      </section>
    </div>
  );
}
