import Link from 'next/link';
import TradeHub from '../../components/trade/TradeHub';

export default function TradePage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>🤝 Trading</h1>
      <p>Swap Emerald Shards and hero cards with other players. They accept or decline your offer, and you can cancel it while it waits.</p>
      <TradeHub />
    </main>
  );
}
