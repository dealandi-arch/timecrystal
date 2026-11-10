'use client';

import { useEffect, useRef, useState } from 'react';
import { type SoundEngine, getSoundEngine } from './audio';
import { CHARACTERS, type Appearance, type CharacterDef, getCharacterLook, getSpriteCanvas } from './pixelArt';
import {
  DUPLICATE_REFUND,
  GACHA_CHARACTERS,
  GACHA_RARITIES,
  PULL_COST,
  PULL_RATES,
  type PullResult,
  type PullType,
  RARITY_INFO,
  SHARDS_PER_LEVEL,
  SHOP_PRICE,
  rarityOf,
} from './gacha';
import { getSignatureWeapon } from './weapons';
import { getPerks } from './perks';
import { useCollection } from '../profile/CollectionContext';
import { useProfile } from '../profile/ProfileContext';
import AuthWidget from '../profile/AuthWidget';

const MUTE_STORAGE_KEY = 'timeCrystalMuted';
type Tab = 'summon' | 'shop' | 'collection';

export function HeroSprite({ char, size = 96, appearance = 'original', silhouette = false }: { char: CharacterDef; size?: number; appearance?: Appearance; silhouette?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const look = getCharacterLook(char, appearance);
    const ps = Math.max(1, Math.floor(size / look.sprite.length));
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const sprite = getSpriteCanvas(`gacha:${char.id}:${appearance}`, look.sprite, look.palette, ps);
    const offset = (size - sprite.width) / 2;
    ctx.drawImage(sprite, offset, offset);
    if (silhouette) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [char, size, appearance, silhouette]);
  return <canvas ref={ref} width={size} height={size} className="gacha-sprite" />;
}

function Reveal({ result, onClose }: { result: PullResult; onClose: () => void }) {
  const [phase, setPhase] = useState<'charge' | 'burst' | 'show'>('charge');
  const char = CHARACTERS.find((c) => c.id === result.characterId) ?? CHARACTERS[0];
  const info = RARITY_INFO[result.rarity];
  const weapon = getSignatureWeapon(char.id);

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('burst'), 1300);
    const t2 = window.setTimeout(() => setPhase('show'), 1750);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div className={`gacha-reveal phase-${phase}`} style={{ ['--rarity' as string]: info.color }} onClick={phase === 'show' ? onClose : () => setPhase('show')}>
      {phase !== 'show' && (
        <div className="gacha-capsule">
          <div className="gacha-capsule-gem" />
        </div>
      )}
      {phase === 'burst' && <div className="gacha-flash" />}
      {phase === 'show' && (
        <div className="gacha-card">
          <div className="gacha-rays" />
          <span className="rarity-badge big" style={{ background: info.color }}>{info.name}</span>
          <HeroSprite char={char} size={144} />
          <h2>{char.name}</h2>
          <p className="gacha-weapon" style={{ color: weapon.color }}>⚔ {weapon.name} — {weapon.desc}</p>
          <p>{char.stats.passiveName} — {char.stats.passiveDesc}</p>
          <ul className="char-perks">
            {getPerks(char.id).map((perk) => (
              <li key={perk.kind}><strong>{perk.name}:</strong> {perk.desc}</li>
            ))}
          </ul>
          {result.duplicate ? (
            <p className="gacha-dup">Already owned — refunded 💎 {result.refund}</p>
          ) : (
            <p className="gacha-new">NEW HERO UNLOCKED!</p>
          )}
          <button className="ability-btn" onClick={onClose}>Continue</button>
        </div>
      )}
    </div>
  );
}

export default function GachaScreen() {
  const { shards, owned, ready, storage, warning, isUnlocked, pull, buy } = useCollection();
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>('summon');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<PullResult | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  if (!soundRef.current) soundRef.current = getSoundEngine();
  const sound = soundRef.current;

  useEffect(() => {
    sound.setMuted(window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true');
  }, [sound]);

  async function doPull(type: PullType) {
    sound.resume();
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = await pull(type);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    sound.playMenuClick();
    window.setTimeout(() => {
      if (res.value.rarity === 'legendary' || res.value.rarity === 'mythic') sound.playLevelComplete();
      else sound.playCrystalPickup();
    }, 1500);
    setResult(res.value);
  }

  async function doBuy(id: string) {
    sound.resume();
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = await buy(id);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else {
      sound.playCrystalPickup();
      setNotice(`${CHARACTERS.find((c) => c.id === id)?.name ?? 'Hero'} joined your roster!`);
    }
  }

  const gachaHeroes = GACHA_CHARACTERS.map((id) => CHARACTERS.find((c) => c.id === id)).filter((c): c is CharacterDef => !!c);

  return (
    <div className="gacha">
      <AuthWidget />
      <div className="gacha-balance">
        <span className="gacha-gem" aria-hidden>💎</span>
        <span>
          <strong>{ready ? shards : '…'}</strong> Emerald Shards
        </span>
        <span className="gacha-storage">
          {storage === 'profile' && profile ? `Saved to ${profile.nickname}’s profile` : 'Saved in this browser — sign in to keep it on your profile'}
        </span>
      </div>
      {warning && <p className="gacha-warning">{warning}</p>}
      <p className="gacha-howto">
        Every level in Play and Story mode hides {SHARDS_PER_LEVEL} Emerald Shards on random tiles. You can’t see them — step on the right tile to collect one.
      </p>

      <div className="gacha-tabs" role="tablist">
        {(['summon', 'shop', 'collection'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'summon' ? 'Summon' : t === 'shop' ? 'Shop' : `Collection (${owned.length}/${GACHA_CHARACTERS.length})`}
          </button>
        ))}
      </div>

      {error && <p className="gacha-error">{error}</p>}
      {notice && <p className="gacha-notice">{notice}</p>}

      {tab === 'summon' && (
        <div className="gacha-banners">
          {(['normal', 'lucky'] as PullType[]).map((type) => (
            <div key={type} className={`gacha-banner banner-${type}`}>
              <h2>{type === 'normal' ? 'Summon' : 'Lucky Summon'}</h2>
              <p>{type === 'normal' ? 'A standard summon from the shard well.' : 'Much better odds of Epic, Legendary and Mythic heroes.'}</p>
              <table className="gacha-rates">
                <tbody>
                  {GACHA_RARITIES.map((r) => (
                    <tr key={r}>
                      <td>
                        <span className="rarity-dot" style={{ background: RARITY_INFO[r].color }} />
                        {RARITY_INFO[r].name}
                      </td>
                      <td className="gacha-rate-bar">
                        <span style={{ width: `${PULL_RATES[type][r]}%`, background: RARITY_INFO[r].color }} />
                      </td>
                      <td className="gacha-rate">{PULL_RATES[type][r]}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="ability-btn gacha-pull" disabled={busy || !ready || shards < PULL_COST[type]} onClick={() => doPull(type)}>
                Summon for 💎 {PULL_COST[type]}
              </button>
            </div>
          ))}
          <div className="gacha-pool">
            <h3>Heroes in the well</h3>
            <div className="gacha-pool-grid">
              {gachaHeroes.map((c) => {
                const r = rarityOf(c.id);
                return (
                  <div key={c.id} className="gacha-pool-item" style={{ borderColor: RARITY_INFO[r].color }}>
                    <HeroSprite char={c} size={64} silhouette={!isUnlocked(c.id)} />
                    <span>{isUnlocked(c.id) ? c.name : '???'}</span>
                    <small style={{ color: RARITY_INFO[r].color }}>{RARITY_INFO[r].name}</small>
                  </div>
                );
              })}
            </div>
            <p className="gacha-fine">Getting a hero you already own refunds shards: {GACHA_RARITIES.map((r) => `${RARITY_INFO[r].name} ${DUPLICATE_REFUND[r]}`).join(' · ')}.</p>
          </div>
        </div>
      )}

      {tab === 'shop' && (
        <div className="gacha-shop">
          <p>Pick exactly the hero you want. It costs more than summoning, but there is no luck involved.</p>
          <div className="ability-grid">
            {gachaHeroes.map((c) => {
              const r = rarityOf(c.id);
              const have = isUnlocked(c.id);
              const price = SHOP_PRICE[r as Exclude<typeof r, 'common' | 'secret'>];
              const weapon = getSignatureWeapon(c.id);
              return (
                <div key={c.id} className={`ability-card rarity-${r}`}>
                  <span className="rarity-badge" style={{ background: RARITY_INFO[r].color }}>{RARITY_INFO[r].name}</span>
                  <HeroSprite char={c} size={80} />
                  <h3>{c.name}</h3>
                  <p className="char-passive"><strong>{c.stats.passiveName}</strong> — {c.stats.passiveDesc}</p>
                  <p className="char-weapon" style={{ color: weapon.color }}><strong>⚔ {weapon.name}</strong> — {weapon.desc}</p>
                  <ul className="char-perks">
                    {getPerks(c.id).map((perk) => (
                      <li key={perk.kind}><strong>{perk.name}:</strong> {perk.desc}</li>
                    ))}
                  </ul>
                  <button className="ability-btn gacha-buy" disabled={have || busy || shards < price} onClick={() => doBuy(c.id)}>
                    {have ? 'Owned' : `Buy for 💎 ${price}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'collection' && (
        <div className="ability-grid">
          {CHARACTERS.map((c) => {
            const r = rarityOf(c.id);
            const have = isUnlocked(c.id);
            return (
              <div key={c.id} className={`ability-card rarity-${r} ${have ? '' : 'locked'}`}>
                <span className="rarity-badge" style={{ background: RARITY_INFO[r].color }}>{RARITY_INFO[r].name}</span>
                <HeroSprite char={c} size={80} silhouette={!have} />
                <h3>{have ? c.name : '???'}</h3>
                <p className="char-weapon">{have ? `⚔ ${getSignatureWeapon(c.id).name}` : 'Locked'}</p>
              </div>
            );
          })}
        </div>
      )}

      {result && <Reveal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
