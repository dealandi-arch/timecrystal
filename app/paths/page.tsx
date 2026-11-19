import Link from 'next/link';
import { PATHS } from '../../components/rpg/paths';

export default function PathsPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Choose your path</h1>
      <p>
        Every path is its own run of 11 crystal levels with a different look, different maps and its own story, ending in a boss. Every level on every path
        has its own World’s Best.
      </p>
      <div className="path-grid">
        {PATHS.map((p) => (
          <div key={p.id} className="path-tile">
            <strong>
              {p.icon} {p.name}
            </strong>
            <span>{p.tagline}</span>
            <small>{p.intro}</small>
            <div>
              <Link className="event-play" href={p.style ? `/paths/${p.id}` : '/play'}>
                Play
              </Link>
              <Link className="ability-btn" href={`/paths/${p.id}#rank`}>
                World records
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
