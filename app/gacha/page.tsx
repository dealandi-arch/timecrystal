import Link from 'next/link';
import GachaScreen from '../../components/rpg/GachaScreen';

export default function GachaPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Time Crystal — Gacha</h1>
      <p>Spend Emerald Shards to summon new heroes, or buy the one you want in the shop.</p>
      <GachaScreen />
    </main>
  );
}
