'use client';

import { useEffect, useRef, useState } from 'react';
import { type SoundEngine, getSoundEngine } from './audio';
import { CHARACTERS, type Appearance, type CharacterDef, getCharacterLook, getSpriteCanvas } from './pixelArt';
import {
  CARDS_TO_UNLOCK,
  type CardDraw,
  DRAW_COST,
  DRAW_COUNT,
  type DrawType,
  GACHA_CHARACTERS,
  GACHA_RARITIES,
  OWNED_CARD_REFUND,
  RARITY_INFO,
  SHARDS_PER_LEVEL,
  SHOP_PRICE,
  cardsNeeded,
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

function CardReveal({ draws, refund, onClose }: { draws: CardDraw[]; refund: number; onClose: () => void }) {
  const [shown, setShown] = useState(0); // cards flip over one after another
  useEffect(() => {
    if (shown >= draws.length) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 450 : 220);
    return () => window.clearTimeout(t);
  }, [shown, draws.length]);
  const unlocked = draws.filter((d) => d.unlockedNow);

  return (
    <div className="card-reveal" onClick={() => (shown < draws.length ? setShown(draws.length) : onClose())}>
      <div className="card-reveal-inner" onClick={(e) => e.stopPropagation()}>
        <h2>{draws.length === 1 ? 'Your card' : `Your ${draws.length} cards`}</h2>
        <div className={`card-grid count-${draws.length}`}>
          {draws.map((d, i) => {
            const char = CHARACTERS.find((c) => c.id === d.characterId) ?? CHARACTERS[0];
            const info = RARITY_INFO[d.rarity];
            const open = i < shown;
            return (
              <div key={i} className={`hero-card ${open ? 'open' : ''} ${d.unlockedNow ? 'unlocked' : ''}`} style={{ ['--rarity' as string]: info.color }}>
                {open ? (
                  <>
                    <span className="rarity-badge" style={{ background: info.color }}>{info.name}</span>
                    <HeroSprite char={char} size={64} />
                    <strong className="hero-card-name">{char.name}</strong>
                    {d.alreadyOwned ? (
                      <small className="hero-card-note">Owned · +{OWNED_CARD_REFUND} 💎</small>
                    ) : d.unlockedNow ? (
                      <small className="hero-card-new">UNLOCKED!</small>
                    ) : (
                      <>
                        <span className="card-progress"><span style={{ width: `${(d.cards / d.needed) * 100}%` }} /></span>
                        <small className="hero-card-note">{d.cards}/{d.needed} cards</small>
                      </>
                    )}
                  </>
                ) : (
                  <span className="hero-card-back">💎</span>
                )}
              </div>
            );
          })}
        </div>
        {shown >= draws.length && (
          <>
            {unlocked.length > 0 && <p className="gacha-new">New hero{unlocked.length > 1 ? 'es' : ''} unlocked: {unlocked.map((d) => CHARACTERS.find((c) => c.id === d.characterId)?.name).join(', ')}!</p>}
            {refund > 0 && <p className="gacha-dup">Cards for heroes you own: +{refund} 💎</p>}
            <button className="ability-btn" onClick={onClose}>Continue</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GachaScreen() {
  const { shards, owned, cards, ready, storage, warning, isUnlocked, draw, buy } = useCollection();
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>('summon');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<{ draws: CardDraw[]; refund: number } | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  if (!soundRef.current) soundRef.current = getSoundEngine();
  const sound = soundRef.current;

  useEffect(() => {
    sound.setMuted(window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true');
  }, [sound]);

  async function doDraw(type: DrawType) {
    sound.resume();
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = await draw(type);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    sound.playMenuClick();
    window.setTimeout(() => {
      if (res.value.draws.some((d) => d.unlockedNow)) sound.playLevelComplete();
      else sound.playCrystalPickup();
    }, 600);
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
            {t === 'summon' ? 'Card Draw' : t === 'shop' ? 'Shop' : `Collection (${owned.filter((id) => GACHA_CHARACTERS.includes(id)).length}/${GACHA_CHARACTERS.length})`}
          </button>
        ))}
      </div>

      {error && <p className="gacha-error">{error}</p>}
      {notice && <p className="gacha-notice">{notice}</p>}

      {tab === 'summon' && (
        <div className="gacha-banners">
          <div className="gacha-banner banner-cards">
            <h2>Card Draw</h2>
            <p>
              Every draw gives you a card for one hero, and every hero has the same chance: 1 in {GACHA_CHARACTERS.length} (
              {(100 / GACHA_CHARACTERS.length).toFixed(1)}%). Collect enough cards for a hero to unlock them. Rarer heroes need more cards.
            </p>
            <table className="gacha-rates">
              <tbody>
                {GACHA_RARITIES.map((r) => (
                  <tr key={r}>
                    <td>
                      <span className="rarity-dot" style={{ background: RARITY_INFO[r].color }} />
                      {RARITY_INFO[r].name}
                    </td>
                    <td className="gacha-rate">{CARDS_TO_UNLOCK[r]} cards to unlock</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="draw-buttons">
              {(['single', 'ten'] as DrawType[]).map((type) => (
                <button key={type} className="ability-btn gacha-pull" disabled={busy || !ready || shards < DRAW_COST[type]} onClick={() => doDraw(type)}>
                  Draw {DRAW_COUNT[type]} card{DRAW_COUNT[type] > 1 ? 's' : ''} · 💎 {DRAW_COST[type]}
                </button>
              ))}
            </div>
            <p className="gacha-fine">A card for a hero you already own gives back {OWNED_CARD_REFUND} 💎. Drawing 10 at once saves 10 shards.</p>
          </div>
          <div className="gacha-pool">
            <h3>Heroes you can draw</h3>
            <div className="gacha-pool-grid">
              {gachaHeroes.map((c) => {
                const r = rarityOf(c.id);
                return (
                  <div key={c.id} className="gacha-pool-item" style={{ borderColor: RARITY_INFO[r].color }}>
                    <HeroSprite char={c} size={64} silhouette={!isUnlocked(c.id)} />
                    <span>{isUnlocked(c.id) ? c.name : '???'}</span>
                    <small style={{ color: RARITY_INFO[r].color }}>{RARITY_INFO[r].name}</small>
                    {!isUnlocked(c.id) && <small className="pool-cards">🃏 {cards[c.id] ?? 0}/{cardsNeeded(c.id)}</small>}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {tab === 'shop' && (
        <div className="gacha-shop">
          <p>Pick exactly the hero you want. It costs more than drawing cards for them, but there is no luck involved.</p>
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
                <p className="char-weapon">{have ? `⚔ ${getSignatureWeapon(c.id).name}` : GACHA_CHARACTERS.includes(c.id) ? `🃏 ${cards[c.id] ?? 0}/${cardsNeeded(c.id)} cards` : 'Locked'}</p>
              </div>
            );
          })}
        </div>
      )}

      {result && <CardReveal draws={result.draws} refund={result.refund} onClose={() => setResult(null)} />}
    </div>
  );
}
