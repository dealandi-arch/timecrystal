import Link from 'next/link';
import PvpHub from '../../components/pvp/PvpHub';

export default function PvpPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>PvP Race</h1>
      <PvpHub />
    </main>
  );
}
