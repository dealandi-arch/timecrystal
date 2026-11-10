import Link from 'next/link';
import EventsHub from '../../components/events/EventsHub';

export default function EventsPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Events</h1>
      <p>Limited-time tryouts, special levels and codes for Secret heroes.</p>
      <EventsHub />
    </main>
  );
}
