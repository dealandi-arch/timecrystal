import Link from 'next/link';
import AverageRank from '../../components/profile/AverageRank';

export default function AverageRankPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Average World Rank</h1>
      <p>
        On every level a player has played, take their place on that level’s World’s Best list (1 = fastest), then average those places to 3 decimal places.
        The lowest average ranks first, and when averages tie, the player who has played more levels comes first. Player-made public levels aren’t counted.
      </p>
      <AverageRank />
    </main>
  );
}
