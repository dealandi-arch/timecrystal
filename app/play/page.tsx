import Link from 'next/link';
import TimeCrystalRPG from '../../components/rpg/TimeCrystalRPG';

// Read at request time, so the test-only switch can't be baked into the live build.
export const dynamic = 'force-dynamic';

export default function PlayPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Time Crystal</h1>
      <p>Clear every enemy, uncover the secret passages, and predict where the time crystal will move next. Switch between the original and human look whenever you like.</p>
      <p>
        Want the full tale? <Link href="/story">Play story mode</Link>
      </p>
      <TimeCrystalRPG testLevels={process.env.TC_TEST_LEVELS === '1'} />
    </main>
  );
}
