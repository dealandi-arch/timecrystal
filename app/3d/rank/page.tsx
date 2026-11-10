import Link from 'next/link';
import Rank3D from '../../../components/profile/Rank3D';

export default function Rank3DPage() {
  return (
    <main className="container">
      <Link href="/3d" className="back-link">
        ← Back to 3D
      </Link>
      <h1>3D World Rank</h1>
      <p>
        Everyone’s best times on the 3D maps. Clear more maps to climb higher; ties go to the lowest total time. Runs where a help ability was used
        don’t count.
      </p>
      <Rank3D />
    </main>
  );
}
