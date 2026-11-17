import Link from 'next/link';
import DailyHub from '../../components/daily/DailyHub';

export default function DailyPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Daily wheel & quests</h1>
      <DailyHub />
    </main>
  );
}
