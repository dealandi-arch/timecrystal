import Link from 'next/link';
import AdminPanel from '../../components/admin/AdminPanel';

export default function AdminPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>🛡 Admin</h1>
      <p>Find a player to review their records, fix or remove made-up times, send a warning, or make them an admin. Everything you do here is logged.</p>
      <AdminPanel />
    </main>
  );
}
