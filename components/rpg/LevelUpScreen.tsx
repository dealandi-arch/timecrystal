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
  STAT_ORDER,
  UPGRADE_LEVELS,
  heroSnapshot,
  levelUpCost,
  nextUpgradeLevel,
  upgradesAtLevel,
  usesStat,
} from './progression';
import { getPerks } from './perks';
import { ELEMENTS, ELEMENT_INFO, SKILLS, describeSkill, elementOf, skillCooldown, skillsFor } from './skills';

const num = (v: number, digits = 1) => (Number.isInteger(v) ? String(v) : v.toFixed(digits));

function rangeText(w: WeaponDef): string {
  if (w.kind === 'shot' || w.kind === 'wave' || w.kind === 'eruption') return `${num(w.range ?? 0)} tiles`;
  if (w.kind === 'meteor') return `${w.explode ?? 1} tile blast`;
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
  const { ready, error, aizodon, levelOf, levelUp, skills, skillsReady, buySkill, equipSkill } = useProgression();
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
    health: (s: Snapshot) => `${s.stats.maxHp} HP`,
    speed: (s: Snapshot) => `${num(1000 / s.stats.moveMs)} tiles/s`,
    invuln: (s: Snapshot) => `${s.stats.invulnS.toFixed(2)}s`,
    damage: (s: Snapshot) => `${num(s.weapon.damage)} / gun ${num(s.basicDamage)}`,
    attackSpeed: (s: Snapshot) => `${(s.weapon.cooldownMs / 1000).toFixed(2)}s / gun ${(s.stats.attackCooldownMs / 1000).toFixed(2)}s`,
    quality: (s: Snapshot) => QUALITY_NAMES[Math.min(s.quality, QUALITY_NAMES.length - 1)],
    range: (s: Snapshot) => rangeText(s.weapon),
    amount: (s: Snapshot) => `${s.weapon.count ?? 1} per attack`,
    bounce: (s: Snapshot) => `${s.weapon.bounce ?? 0}`,
    pierce: (s: Snapshot) => (s.weapon.chain ? `chains to ${s.weapon.chain}` : s.weapon.ricochet ? `ricochets ${s.weapon.ricochet}×` : `${s.weapon.pierce ?? 0} enemies`),
  };
  const nextUp = nextUpgradeLevel(level, baseWeapon);
  const perks = getPerks(hero.id, level);
  const element = elementOf(hero.id);
  const equippedId = skills.equipped[hero.id] ?? null;

  async function skillAction(run: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setMessage(null);
    const res = await run();
    setBusy(false);
    if (!res.ok) setMessage(res.error ?? 'That didn’t work.');
  }

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
              <p className="levelup-element" style={{ color: ELEMENT_INFO[element].color }}>
                {ELEMENT_INFO[element].icon} {ELEMENT_INFO[element].name}
              </p>
              <p className="levelup-weapon" style={{ color: baseWeapon.color }}>⚔ {baseWeapon.name}</p>
            </div>
          </div>
          <table className="levelup-stats">
            <tbody>
              <StatRow label="Level" now={level} next={next?.level} highlight={!atMax} />
              <StatRow label="OVRL Power" now={now.power} next={next?.power} highlight={!atMax} />
              {STAT_ORDER
                .filter((stat) => usesStat(stat, baseWeapon))
                .map((stat) => (
                  <StatRow
                    key={stat}
                    label={`${STAT_LABELS[stat]} (Lv ${UPGRADE_LEVELS[stat].join(', ')})`}
                    now={fmt[stat](now)}
                    next={next && fmt[stat](next)}
                    highlight={rising.includes(stat)}
                  />
                ))}
            </tbody>
          </table>
          <p className="gacha-fine">
            Each stat rises at the levels shown. Attack amount, range, bounces and pierce only appear when {hero.name}’s weapon can use them.
            Stats shown with the speciality on; upgrades apply either way.
          </p>
          <div className="levelup-skills">
            <strong>Skill slot</strong> <small>(only {ELEMENT_INFO[element].name} skills fit · press E or the skill button to use it, then wait for the cooldown)</small>
            {!skillsReady && <p className="gacha-warning">Skills need the latest supabase/schema.sql before they can be bought.</p>}
            <div className="skill-slot">
              {skillsFor(element).map((skill) => {
                const owned = skills.owned.includes(skill.id);
                const equipped = equippedId === skill.id;
                return (
                  <div key={skill.id} className={`skill-option ${equipped ? 'equipped' : ''}`}>
                    <div>
                      <strong>{skill.name}</strong>
                      <p>{describeSkill(skill, level)} Cooldown {skillCooldown(skill, level)}s.</p>
                    </div>
                    {!owned ? (
                      <button className="ability-btn" disabled={busy || !skillsReady || aizodon < skill.cost} onClick={() => skillAction(() => buySkill(skill.id))}>
                        Buy ⬡ {skill.cost}
                      </button>
                    ) : equipped ? (
                      <button className="ability-btn story-skip" disabled={busy} onClick={() => skillAction(() => equipSkill(hero.id, null))}>Unequip</button>
                    ) : (
                      <button className="ability-btn" disabled={busy} onClick={() => skillAction(() => equipSkill(hero.id, skill.id))}>Equip</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="levelup-perks">
            <strong>{hero.stats.passiveName}</strong>
            <ul className="char-perks">
              {perks.map((perk) => (
                <li key={perk.kind}><strong>{perk.name}:</strong> {perk.desc}</li>
              ))}
            </ul>
          </div>

          {atMax ? (
            <p className="gacha-notice">Maximum level reached.</p>
          ) : (
            <>
              <p className="levelup-rises">
                {rising.length
                  ? <>Next level upgrades: {rising.map((s) => STAT_LABELS[s]).join(', ')}</>
                  : <>Level {level + 1} raises Level and OVRL only.{nextUp ? ` Next weapon upgrade at level ${nextUp}.` : ' No weapon upgrades left.'}</>}
              </p>
              <button className="ability-btn levelup-buy" disabled={busy || !ready || !!error || aizodon < cost} onClick={doLevelUp}>
                Level up for ⬡ {cost}
              </button>
            </>
          )}
          {message && <p className="gacha-error">{message}</p>}
        </div>
      </div>

      <div className="skill-shop">
        <h3>All skills</h3>
        <p className="gacha-fine">Buy a skill once, then equip it on any hero of its element. Area skills cover more tiles at hero levels 5, 12 and 20, and every skill recharges faster as the hero levels up.</p>
        {ELEMENTS.map((el) => (
          <div key={el}>
            <h4 style={{ color: ELEMENT_INFO[el].color }}>{ELEMENT_INFO[el].icon} {ELEMENT_INFO[el].name}</h4>
            <div className="skill-shop-grid">
              {SKILLS.filter((sk) => sk.element === el).map((sk) => {
                const owned = skills.owned.includes(sk.id);
                return (
                  <div key={sk.id} className="skill-card" style={{ borderColor: ELEMENT_INFO[el].color }}>
                    <h4>{sk.name}</h4>
                    <p>{describeSkill(sk)} Cooldown {sk.cooldown}s at Lv 1, {skillCooldown(sk, 20)}s at Lv 20.</p>
                    <button className="ability-btn" disabled={owned || busy || !skillsReady || aizodon < sk.cost} onClick={() => skillAction(() => buySkill(sk.id))}>
                      {owned ? 'Owned' : `Buy ⬡ ${sk.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
