'use client';

import { useState, type ReactNode } from 'react';
import { CHARACTERS } from './pixelArt';
import { HeroSprite } from './GachaScreen';
import { useCollection } from '../profile/CollectionContext';
import { useProfile } from '../profile/ProfileContext';
import { useProgression } from '../profile/ProgressionContext';
import AuthWidget from '../profile/AuthWidget';
import { type WeaponDef, getSignatureWeapon } from './weapons';
import {
  type HeroSnapshot as Snapshot,
  MAX_HERO_LEVEL,
  QUALITY_NAMES,
  RUN_RANKS,
  STAT_LABELS,
  heroSnapshot,
  levelUpCost,
  upgradesAtLevel,
  usesAmount,
  usesRange,
} from './progression';

const num = (v: number, digits = 1) => (Number.isInteger(v) ? String(v) : v.toFixed(digits));

function rangeText(w: WeaponDef): string {
  if (w.kind === 'shot') return `${num(w.range ?? 0)} tiles`;
  if (w.kind === 'melee') return `+${w.reach ?? 0} tile reach`;
  return `${w.radius ?? 0} tile radius`;
}

function StatRow({ label, now, next, highlight }: { label: string; now: ReactNode; next?: ReactNode; highlight?: boolean }) {
  return (
    <tr className={highlight ? 'levelup-rising' : ''}>
      <td>{label}</td>
      <td className="levelup-now">{now}</td>
      <td className="levelup-next">{next !== undefined && next !== now ? `→ ${next}` : ''}</td>
    </tr>
  );
}

export default function LevelUpScreen() {
  const { profile, loading } = useProfile();
  const { isUnlocked } = useCollection();
  const { ready, error, aizodon, levelOf, levelUp } = useProgression();
  const roster = CHARACTERS.filter((c) => isUnlocked(c.id));
  const [selectedId, setSelectedId] = useState(CHARACTERS[0].id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [justLevelled, setJustLevelled] = useState(0);

  if (loading) return <p>Loading…</p>;
  if (!profile) {
    return (
      <div className="levelup-guest">
        <AuthWidget />
        <h2>Sign in to level up your heroes</h2>
        <p>Hero levels and Aizodon are saved to your profile, so this is only for signed-in players. Use the Sign in button at the top of the page.</p>
      </div>
    );
  }

  const hero = roster.find((c) => c.id === selectedId) ?? roster[0];
  const level = levelOf(hero.id);
  const atMax = level >= MAX_HERO_LEVEL;
  const now = heroSnapshot(hero, level);
  const next = atMax ? undefined : heroSnapshot(hero, level + 1);
  const baseWeapon = getSignatureWeapon(hero.id);
  const rising = atMax ? [] : upgradesAtLevel(level + 1, baseWeapon);
  const cost = levelUpCost(level);

  async function doLevelUp() {
    setBusy(true);
    setMessage(null);
    const res = await levelUp(hero.id);
    setBusy(false);
    if (res.ok) setJustLevelled((n) => n + 1);
    else setMessage(res.error ?? 'Level up failed.');
  }

  const fmt = {
    speed: (s: Snapshot) => `${num(1000 / s.stats.moveMs)} tiles/s`,
    invuln: (s: Snapshot) => `${s.stats.invulnS.toFixed(2)}s`,
    damage: (s: Snapshot) => `${num(s.weapon.damage)} / gun ${num(s.basicDamage)}`,
    attackSpeed: (s: Snapshot) => `${num(1000 / s.weapon.cooldownMs)}/s / gun ${num(1000 / s.stats.attackCooldownMs)}/s`,
    quality: (s: Snapshot) => QUALITY_NAMES[Math.min(s.quality, QUALITY_NAMES.length - 1)],
  };

  return (
    <div className="levelup">
      <AuthWidget />
      <div className="levelup-balance">
        <span className="levelup-coin" aria-hidden>⬡</span>
        <span><strong>{ready ? aizodon : '…'}</strong> Aizodon</span>
        <span className="gacha-storage">Saved to {profile.nickname}’s profile</span>
      </div>
      {error && <p className="gacha-warning">{error}</p>}

      <div className="levelup-layout">
        <div className="levelup-roster">
          {roster.map((c) => (
            <button key={c.id} className={`levelup-hero ${c.id === hero.id ? 'active' : ''}`} onClick={() => { setSelectedId(c.id); setMessage(null); }}>
              <HeroSprite char={c} size={48} />
              <span>{c.name}</span>
              <small>Lv {levelOf(c.id)}</small>
            </button>
          ))}
        </div>

        <div className="levelup-detail" key={`${hero.id}:${justLevelled}`}>
          <div className="levelup-head">
            <HeroSprite char={hero} size={96} />
            <div>
              <h2>{hero.name}</h2>
              <p className="levelup-weapon" style={{ color: baseWeapon.color }}>⚔ {baseWeapon.name}</p>
            </div>
          </div>
          <table className="levelup-stats">
            <tbody>
              <StatRow label="Level" now={level} next={next?.level} highlight={!atMax} />
              <StatRow label="OVRL Power" now={now.power} next={next?.power} highlight={!atMax} />
              <StatRow label={STAT_LABELS.invuln} now={fmt.invuln(now)} next={next && fmt.invuln(next)} highlight={rising.includes('invuln')} />
              <StatRow label={STAT_LABELS.speed} now={fmt.speed(now)} next={next && fmt.speed(next)} highlight={rising.includes('speed')} />
              <StatRow label={STAT_LABELS.health} now={now.stats.maxHp} next={next?.stats.maxHp} highlight={rising.includes('health')} />
              <StatRow label={STAT_LABELS.damage} now={fmt.damage(now)} next={next && fmt.damage(next)} highlight={rising.includes('damage')} />
              <StatRow label={STAT_LABELS.attackSpeed} now={fmt.attackSpeed(now)} next={next && fmt.attackSpeed(next)} highlight={rising.includes('attackSpeed')} />
              {usesAmount(baseWeapon) && <StatRow label={STAT_LABELS.amount} now={now.weapon.count} next={next?.weapon.count} highlight={rising.includes('amount')} />}
              <StatRow label={STAT_LABELS.quality} now={fmt.quality(now)} next={next && fmt.quality(next)} highlight={rising.includes('quality')} />
              {usesRange(baseWeapon) && <StatRow label={STAT_LABELS.range} now={rangeText(now.weapon)} next={next && rangeText(next.weapon)} highlight={rising.includes('range')} />}
            </tbody>
          </table>
          <p className="gacha-fine">Stats shown with the speciality on. Upgrades apply whether or not it’s active.</p>

          {atMax ? (
            <p className="gacha-notice">Maximum level reached.</p>
          ) : (
            <>
              <p className="levelup-rises">Next level raises: {rising.map((s) => STAT_LABELS[s]).join(', ')}</p>
              <button className="ability-btn levelup-buy" disabled={busy || !ready || !!error || aizodon < cost} onClick={doLevelUp}>
                Level up for ⬡ {cost}
              </button>
            </>
          )}
          {message && <p className="gacha-error">{message}</p>}
        </div>
      </div>

      <div className="levelup-earn">
        <h3>How to earn Aizodon</h3>
        <p>Finish a level in Play or Story mode while signed in. The quicker you are compared with that level’s target time, the more you get. Using a help ability halves the reward.</p>
        <table className="levelup-ranks">
          <thead>
            <tr><th>Rank</th><th>Your time vs target</th><th>Reward</th></tr>
          </thead>
          <tbody>
            {RUN_RANKS.map((r) => (
              <tr key={r.rank}>
                <td><strong>{r.rank}</strong></td>
                <td>{Number.isFinite(r.maxRatio) ? `Up to ${r.maxRatio * 100}%` : 'Over 250%'}</td>
                <td>⬡ {r.reward}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
