import Link from 'next/link';
import WalletBar from '../components/profile/WalletBar';

export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Time Crystal</h1>
        <p>Welcome to your new Next.js website. Start building your game hub here.</p>
        <WalletBar />
        <div className="actions">
          <Link href="/play">Play the game</Link>
          <Link href="/story">Story mode</Link>
          <Link href="/watch">Story animation</Link>
          <Link href="/gacha">Gacha</Link>
          <Link href="/level-up">Level up</Link>
          <Link href="/3d">3D test</Link>
          <Link href="/editor">Stage editor</Link>
          <Link href="#features">Explore features</Link>
        </div>
      </section>

      <section id="features" className="section">
        <h2>Features</h2>
        <ul>
          <li>Fast server-side rendering and static pages</li>
          <li>Modern React with the Next.js App Router</li>
          <li>Built with TypeScript and ready to expand</li>
        </ul>
      </section>
    </main>
  );
}
