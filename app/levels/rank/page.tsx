import Link from 'next/link';
import GroupRankView from '../../../components/profile/GroupRankView';

export default function PublicLevelsRankPage() {
  return (
    <main className="container">
      <Link href="/levels" className="back-link">
        ← Back to Public Levels
      </Link>
      <h1>Public Levels Rank</h1>
      <p>Who has cleared the most verified public levels, and fastest. Each level also has its own Level Rank on its page.</p>
      <GroupRankView api="/api/leaderboard/public" label="levels" levelTabs={false} emptyText="No one has cleared a public level yet. Be the first." />
    </main>
  );
}
