import Link from 'next/link';
import PlayCustomLevel from '../../../components/levels/PlayCustomLevel';

export default function CustomLevelPage({ params }: { params: { id: string } }) {
  return (
    <main className="container">
      <Link href="/levels" className="back-link">
        ← Back to Public Levels
      </Link>
      <PlayCustomLevel id={Number(params.id)} />
    </main>
  );
}
