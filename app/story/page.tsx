import Link from 'next/link';
import TimeCrystalRPG from '../../components/rpg/TimeCrystalRPG';

// Read at request time, so the test-only switch can't be baked into the live build.
export const dynamic = 'force-dynamic';

export default function StoryPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Time Crystal — Story Mode</h1>
      <p>Follow Archivist Oren through eleven chapters to rebuild the shattered crystal. Switch between the original and human look whenever you like.</p>
      <p>
        Just want the story? <Link href="/watch">Watch it as an animation</Link>
      </p>
      <TimeCrystalRPG mode="story" testLevels={process.env.TC_TEST_LEVELS === '1'} />
    </main>
  );
}
