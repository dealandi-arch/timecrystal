import Link from 'next/link';
import TimeCrystalRPG from '../../components/rpg/TimeCrystalRPG';

export default function PlayPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Time Crystal</h1>
      <p>Clear every enemy, uncover the secret passages, and predict where the time crystal will move next.</p>
      <TimeCrystalRPG />
    </main>
  );
}
