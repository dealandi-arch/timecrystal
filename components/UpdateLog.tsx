'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, getCharacterLook, getSpriteCanvas } from './rpg/pixelArt';

// What's new: pops up once per browser for each update, and can be reopened from the home page.
export const CURRENT_UPDATE = '10';
const SEEN_KEY = 'timeCrystalSeenUpdate';
export const SHOW_UPDATES_EVENT = 'timeCrystal:showUpdates';

const NOTES: { icon: string; title: string; text: string; href?: string }[] = [
  {
    icon: '🍞',
    title: 'New Rare hero: Ovenhead',
    text: 'A baker who leaned too close to his own oven and became it. Oven Door sends out a ring of heat 3 tiles wide that leaves enemies burning, and anyone who touches him gets scorched. Find him in the Gacha or the Shop.',
    href: '/gacha',
  },
  {
    icon: '✔',
    title: 'Public level verification',
    text: 'New public levels stay hidden until their creator beats them once. Every level on Public Levels is proven to be clearable, and shows how fast its creator verified it.',
    href: '/levels',
  },
  {
    icon: '🏆',
    title: 'A ranking for every public level',
    text: 'Each public level now has its own Level Rank: the fastest clears by every player, shown on the level’s page and after you win.',
    href: '/levels',
  },
  {
    icon: '🏅',
    title: 'Event Rank and Public Levels Rank',
    text: 'Event runs now have their own Event Rank, separate from the main World’s Best lists. The Public Levels Rank shows who has cleared the most public levels, and fastest.',
    href: '/events/rank',
  },
  {
    icon: '🪪',
    title: 'Display names',
    text: 'Change the name everyone sees, for free, from your profile: on leaderboards, rankings, public levels and search. Your original name stays as your @username (you still log in with it) and shows under your display name. After a change, you can change it again in 5 days.',
  },
  {
    icon: '🛡',
    title: 'Stage editor removed',
    text: 'The Stage editor could change the original levels and make them easier while still earning Aizodon and World’s Best times. It’s gone, and the game always plays the original levels. Build your own levels in the Level Builder on Public Levels instead.',
    href: '/levels',
  },
  {
    icon: '🛒',
    title: 'Shop price change',
    text: 'Rare heroes now cost 450 Emerald Shards in the Shop, so buying one outright still costs more than summoning for it.',
  },
];

function OvenheadPortrait() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const hero = CHARACTERS.find((c) => c.id === 'ovenhead');
    const ctx = ref.current?.getContext('2d');
    if (!hero || !ctx) return;
    const look = getCharacterLook(hero, 'human');
    const sprite = getSpriteCanvas('update10:ovenhead', look.sprite, look.palette, 5);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 80, 80);
    ctx.drawImage(sprite, 0, 0, 80, 80);
  }, []);
  return <canvas ref={ref} width={80} height={80} className="update-portrait" aria-label="Ovenhead" />;
}

export default function UpdateLog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY) !== CURRENT_UPDATE) setOpen(true);
    } catch {
      /* no storage: don't nag every page load */
    }
    const show = () => setOpen(true);
    window.addEventListener(SHOW_UPDATES_EVENT, show);
    return () => window.removeEventListener(SHOW_UPDATES_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(SEEN_KEY, CURRENT_UPDATE);
    } catch {
      /* ignore */
    }
  }

  if (!open) return null;
  return (
    <div className="update-backdrop" onClick={close}>
      <div className="update-log" role="dialog" aria-modal="true" aria-labelledby="update-title" onClick={(e) => e.stopPropagation()}>
        <button className="update-close" onClick={close} aria-label="Close">
          ✕
        </button>
        <div className="update-head">
          <OvenheadPortrait />
          <div>
            <span className="update-version">Update {CURRENT_UPDATE}</span>
            <h2 id="update-title">What’s new in Time Crystal</h2>
          </div>
        </div>
        <ul className="update-notes">
          {NOTES.map((n) => (
            <li key={n.title}>
              <span className="update-icon" aria-hidden="true">
                {n.icon}
              </span>
              <div>
                <strong>{n.title}</strong>
                <p>{n.text}</p>
                {n.href && (
                  <Link href={n.href} onClick={close}>
                    Take a look ▸
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button className="update-ok" onClick={close}>
          Let’s go!
        </button>
      </div>
    </div>
  );
}

export function WhatsNewButton() {
  return (
    <button className="whats-new" onClick={() => window.dispatchEvent(new Event(SHOW_UPDATES_EVENT))}>
      ✨ What’s new in Update {CURRENT_UPDATE}
    </button>
  );
}
