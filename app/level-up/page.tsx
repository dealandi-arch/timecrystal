import Link from 'next/link';
import LevelUpScreen from '../../components/rpg/LevelUpScreen';

export default function LevelUpPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Time Crystal — Level Up</h1>
      <p>Spend Aizodon to make your heroes stronger. Each level costs more than the last.</p>
      <LevelUpScreen />
    </main>
  );
}
