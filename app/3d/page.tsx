import Link from 'next/link';
import TimeCrystalRPG from '../../components/rpg/TimeCrystalRPG';

// Read at request time, so the test-only switch can't be baked into the live build.
export const dynamic = 'force-dynamic';

export default function ThreeDPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Time Crystal — 3D Test</h1>
      <p>
        Four big maps built for climbing: take the stairs and ladders up onto rooftops and towers, jump (Shift / K) onto ledges and over fences, and
        watch the dark corners. You only see what’s around you, and high ground lets you see further. Activate your hero’s speciality to see the
        whole map and unlock the overview camera. Fast clears earn Aizodon and put you on the <Link href="/3d/rank">3D World Rank</Link>.
      </p>
      <TimeCrystalRPG mode="3d" testLevels={process.env.TC_TEST_LEVELS === '1'} />
    </main>
  );
}
