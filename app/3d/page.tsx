import Link from 'next/link';
import TimeCrystalRPG from '../../components/rpg/TimeCrystalRPG';

export default function ThreeDPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Time Crystal — 3D Test</h1>
      <p>
        A first look at the game in 3D, with the first two levels only. Everything plays the same as the normal game.
        Switch the camera between an overview of the whole level and following your hero.
      </p>
      <TimeCrystalRPG mode="3d" />
    </main>
  );
}
