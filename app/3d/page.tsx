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
        A first look at the game in 3D, on four maps built for climbing: take the stairs and ladders up onto rooftops and towers, duck behind fences (shots fly over them, feet don’t) and watch the dark corners, where enemies stay hidden until you’re right next to them.
        Switch the camera between an overview of the whole level and following your hero.
      </p>
      <TimeCrystalRPG mode="3d" />
    </main>
  );
}
