import Link from 'next/link';
import { notFound } from 'next/navigation';
import PathPlayer from '../../../components/rpg/PathPlayer';
import { PATHS, getPath } from '../../../components/rpg/paths';

export function generateStaticParams() {
  return PATHS.map((p) => ({ id: p.id }));
}

export default function PathPage({ params }: { params: { id: string } }) {
  const path = getPath(params.id);
  if (!path) notFound();
  return (
    <main className="container">
      <Link href="/paths" className="back-link">
        ← All paths
      </Link>
      <h1>
        {path.icon} {path.name}
      </h1>
      <p>{path.intro}</p>
      <PathPlayer pathId={path.id} />
    </main>
  );
}
