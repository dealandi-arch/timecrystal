'use client';

import Link from 'next/link';
import TimeCrystalRPG from '../../../components/rpg/TimeCrystalRPG';
import { PARKSTER_EVENT_LEVELS } from '../../../components/rpg/events';

const PLAY = {
  levels: PARKSTER_EVENT_LEVELS,
  heroes: ['parkster'],
  rank: { title: 'Event Rank', link: { href: '/events/rank', label: 'See the full Event Rank' } },
  finale: { title: 'Tryout Complete', text: 'You cleared every Parkster event level. Get him from the Gacha to keep the rockslides coming.' },
};

export default function ParksterEventPage() {
  return (
    <main className="container">
      <Link href="/events" className="back-link">
        ← Back to Events
      </Link>
      <h1>Parkster Tryout</h1>
      <p>
        Three levels laid out in long rows and columns. Switch to Parkster’s Rockslide Call (Q) and flatten a whole line at a time. Your times go on the{' '}
        <Link href="/events/rank">Event Rank</Link>.
      </p>
      <TimeCrystalRPG mode="custom" custom={PLAY} />
    </main>
  );
}
