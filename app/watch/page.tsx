import Link from 'next/link';
import StoryMovie from '../../components/rpg/StoryMovie';

export default function WatchPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Time Crystal — Story Animation</h1>
      <p>
        Just the story: pick a hero and watch their journey as an animated movie. Want to play it instead?{' '}
        <Link href="/story">Play story mode</Link>
      </p>
      <StoryMovie />
    </main>
  );
}
