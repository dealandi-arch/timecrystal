import Link from 'next/link';
import GroupRankView from '../../../components/profile/GroupRankView';

export default function EventRankPage() {
  return (
    <main className="container">
      <Link href="/events" className="back-link">
        ← Back to Events
      </Link>
      <h1>Event Rank</h1>
      <p>Everyone’s best times on the event levels, ranked separately from the main World’s Best lists. Clear more event levels to climb higher; ties go to the lowest total time.</p>
      <GroupRankView api="/api/leaderboard/event" label="levels" emptyText="No one has cleared an event level yet. Be the first." />
    </main>
  );
}
