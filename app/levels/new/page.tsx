import Link from 'next/link';
import LevelBuilder from '../../../components/levels/LevelBuilder';

export default function NewLevelPage() {
  return (
    <main className="container">
      <Link href="/levels" className="back-link">
        ← Back to Public Levels
      </Link>
      <h1>Level Builder</h1>
      <LevelBuilder />
    </main>
  );
}
