import Link from 'next/link';
import WalletBar from '../components/profile/WalletBar';
import { WhatsNewButton } from '../components/UpdateLog';

const MODES = [
  { href: '/play', icon: '⚔️', title: 'Play', text: 'Eleven levels across a shattered timeline. Clear every enemy, then catch the crystal before it moves again.' },
  { href: '/story', icon: '📖', title: 'Story mode', text: 'The same journey with a story for every hero, and a nemesis of their own to face.' },
  { href: '/3d', icon: '🧊', title: '3D maps', text: 'Big maps to climb, with stairs, ladders, fences and dark corners. You only see what’s near you.' },
  { href: '/craze', icon: '👾', title: 'Multienemy Craze', text: 'Beat as many enemies as you can in 1, 2, 3 or 5 minutes. Every one you beat brings a new one.' },
  { href: '/levels', icon: '🧱', title: 'Public levels', text: 'Play levels other players built, or build and publish your own in 2D or 3D.' },
  { href: '/events', icon: '🎟️', title: 'Events', text: 'Hero tryouts, special levels and codes for Secret heroes.' },
];

const MORE = [
  { href: '/gacha', label: '🃏 Card gacha' },
  { href: '/level-up', label: '⬆ Level up heroes' },
  { href: '/chat', label: '💬 Chat' },
  { href: '/3d/rank', label: '🏆 3D World Rank' },
  { href: '/events/rank', label: '🏆 Event Rank' },
  { href: '/levels/rank', label: '🏆 Public Levels Rank' },
  { href: '/profiles', label: '👤 Find players' },
  { href: '/watch', label: '🎬 Story animation' },
];

export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Time Crystal</h1>
        <p>
          The Time Crystal has shattered and every timeline is falling apart. Pick a hero, fight through the broken worlds, and bring the shards home.
        </p>
        <WalletBar />
        <WhatsNewButton />
        <div className="actions">
          <Link href="/play">▶ Play now</Link>
          <Link href="/story">Story mode</Link>
        </div>
      </section>

      <section className="section">
        <h2>Ways to play</h2>
        <div className="home-modes">
          {MODES.map((m) => (
            <Link key={m.href} href={m.href} className="home-mode">
              <span className="home-mode-icon" aria-hidden="true">
                {m.icon}
              </span>
              <strong>{m.title}</strong>
              <span>{m.text}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Heroes, rewards and friends</h2>
        <ul className="home-features">
          <li><strong>62 heroes</strong>, each with their own weapon, speciality and story, from Common to Mythic, plus hidden Secret heroes.</li>
          <li><strong>Emerald Shards</strong> are hidden in every level: spend them on hero cards in the Card gacha.</li>
          <li><strong>Aizodon</strong> comes from fast clears: spend it to level up your heroes and buy skills.</li>
          <li><strong>World rankings</strong> for every level, the 3D maps, events, public levels and Craze.</li>
          <li><strong>Profiles</strong> with your own avatar, display name and best runs, and a world chat to talk to other players.</li>
        </ul>
        <div className="home-more">
          {MORE.map((m) => (
            <Link key={m.href} href={m.href}>
              {m.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
