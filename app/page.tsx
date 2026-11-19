import Link from 'next/link';
import WalletBar from '../components/profile/WalletBar';
import { WhatsNewButton } from '../components/UpdateLog';

// Every place to go, as buttons on the first screen (no scrolling needed).
const BUTTONS = [
  { href: '/play', icon: '⚔️', label: 'Play', main: true },
  { href: '/paths', icon: '🗺️', label: 'Paths (6 stories)' },
  { href: '/story', icon: '📖', label: 'Story mode' },
  { href: '/3d', icon: '🧊', label: '3D maps' },
  { href: '/craze', icon: '👾', label: 'Multienemy Craze' },
  { href: '/pvp', icon: '🏁', label: 'PvP: Fights & Races' },
  { href: '/daily', icon: '🎡', label: 'Daily wheel & quests' },
  { href: '/levels', icon: '🧱', label: 'Public levels' },
  { href: '/events', icon: '🎟️', label: 'Events' },
  { href: '/gacha', icon: '🃏', label: 'Card gacha' },
  { href: '/trade', icon: '🤝', label: 'Trading' },
  { href: '/level-up', icon: '⬆️', label: 'Level up' },
  { href: '/chat', icon: '💬', label: 'Chat' },
  { href: '/profiles', icon: '👥', label: 'Players' },
  { href: '/3d/rank', icon: '🏆', label: '3D World Rank' },
  { href: '/events/rank', icon: '🏅', label: 'Event Rank' },
  { href: '/levels/rank', icon: '🥇', label: 'Public Levels Rank' },
  { href: '/watch', icon: '🎬', label: 'Story animation' },
];

export default function Home() {
  return (
    <main className="container home">
      <section className="hero home-hero">
        <h1>Time Crystal</h1>
        <p>The Time Crystal has shattered. Pick a hero, fight through the broken timelines, and bring the shards home.</p>
        <WalletBar />
        <div className="home-buttons">
          {BUTTONS.map((b) => (
            <Link key={b.href} href={b.href} className={`home-button${b.main ? ' main' : ''}`}>
              <span aria-hidden="true">{b.icon}</span>
              {b.label}
            </Link>
          ))}
        </div>
        <WhatsNewButton />
      </section>
    </main>
  );
}
