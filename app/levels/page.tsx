import Link from 'next/link';
import PublicLevels from '../../components/levels/PublicLevels';

export default function LevelsPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Public Levels</h1>
      <p>Levels built by players. Anyone can play them, and clearing one pays Aizodon for your time.</p>
      <PublicLevels />
    </main>
  );
}
