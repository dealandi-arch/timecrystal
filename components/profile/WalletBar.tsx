'use client';

import Link from 'next/link';
import { useCollection } from './CollectionContext';
import { useProgression } from './ProgressionContext';

// Saved currency totals, so players can see what they kept after leaving a journey.
export default function WalletBar() {
  const { shards, ready: shardsReady } = useCollection();
  const { signedIn, ready, error, aizodon } = useProgression();
  return (
    <div className="wallet" aria-label="Your saved currency">
      <Link href="/gacha" className="wallet-item">
        <span aria-hidden>💎</span> <strong>{shardsReady ? shards : '…'}</strong> Emerald Shards
      </Link>
      {signedIn ? (
        <Link href="/level-up" className="wallet-item wallet-aizodon">
          <span aria-hidden>⬡</span> <strong>{!ready ? '…' : error ? '–' : aizodon}</strong> Aizodon
        </Link>
      ) : (
        <span className="wallet-note">Sign in to earn Aizodon and keep shards on your profile.</span>
      )}
      {signedIn && error && <span className="wallet-note">Aizodon can’t be saved right now. Rewards you earn are kept and added once it’s back.</span>}
    </div>
  );
}
