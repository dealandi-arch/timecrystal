'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ReportView } from '../../../../components/admin/CheatCatcher';
import { useProfile } from '../../../../components/profile/ProfileContext';

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const { profile, loading } = useProfile();
  return (
    <main className="container">
      <Link href="/admin" className="back-link">
        ← Back to Admin
      </Link>
      <h1>🚨 Cheat catcher report</h1>
      {loading ? <p>Loading…</p> : profile?.isAdmin ? <ReportView id={Number(params.id)} /> : <p className="event-error">Admins only.</p>}
    </main>
  );
}
