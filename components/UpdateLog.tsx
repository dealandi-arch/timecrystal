'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, getCharacterLook, getSpriteCanvas } from './rpg/pixelArt';

// What's new: pops up once per browser for each update, and can be reopened from the home page.
export const CURRENT_UPDATE = '12';
const SEEN_KEY = 'timeCrystalSeenUpdate';
export const SHOW_UPDATES_EVENT = 'timeCrystal:showUpdates';

const NOTES: { icon: string; title: string; text: string; href?: string }[] = [
  // Newest first. Every update gets an entry here and a bump of CURRENT_UPDATE above.
  {
    icon: '🏁',
    title: 'New: PvP Race',
    text: 'Race another player on the same level and the faster finish wins. Play a live race against someone who’s online, or race the recorded run of any player as a ghost. Win to climb the PvP rank (everyone starts at 1000) and earn Emerald Shards. Help abilities are off in races.',
    href: '/pvp',
  },
  {
    icon: '👑',
    title: 'Super admin',
    text: 'Only the super admin can give heroes or tryouts, and take heroes away from players. Other admins can still fix records, send warnings and use the Admin chat.',
  },
  {
    icon: '👾',
    title: 'New mode: Multienemy Craze',
    text: 'Pick 1, 2, 3 or 5 minutes and beat as many enemies as you can. Every enemy you beat is replaced by a new one, and they get tougher as you go. Each round length has its own world rank.',
    href: '/craze',
  },
  {
    icon: '🃏',
    title: 'Card gacha',
    text: 'Draws now give hero cards, and every hero has the same chance. Collect enough cards to unlock a hero: Rare 2, Epic 3, Legendary 5, Mythic 8. One card costs 7 Emerald Shards, ten cost 60. A card for a hero you own gives 1 shard back. Cards you’ve collected are saved.',
    href: '/gacha',
  },
  {
    icon: '🕹️',
    title: 'Easier phone controls',
    text: 'The joystick reacts sooner, doesn’t flicker between directions near a diagonal, gives a tiny buzz when you turn, and has more room. Holding the fire zone now keeps attacking, and auto-fire shoots basic bullets only.',
  },
  {
    icon: '🎡',
    title: 'Daily wheel and quests',
    text: 'Spin the wheel once a day for Emerald Shards, Aizodon or a hero card, and finish three daily quests for more rewards.',
    href: '/daily',
  },
  {
    icon: '🤝',
    title: 'Trading',
    text: 'Offer Emerald Shards and hero cards to other players for theirs. They accept or decline, and the swap happens all at once.',
    href: '/trade',
  },
  {
    icon: '👥',
    title: 'Players list and email',
    text: 'The Players page shows everyone straight away, most recently online first. You can link an email to your account from your profile if you want to (it stays private).',
    href: '/profiles',
  },
  {
    icon: '🚨',
    title: 'Cheat catcher',
    text: 'The game now records a short replay of every run. Runs that look impossible are held back, and the admins watch the replay and choose Cheat or No cheat before anything is said to the player.',
  },
  {
    icon: '🪨',
    title: 'Parkster’s Rockslide Call, reworked',
    text: 'One boulder that rolls fast the way he faces, crushing every enemy in its path and scooping up shards. Aim it, and it’s ready again in under a second.',
  },
  {
    icon: '⚖️',
    title: 'Fairer special weapons',
    text: 'Weapons that beat the final boss in a few seconds at level 1 (such as Starfall, Carrot Barrage, Aurora Prism, Dragon Breath, Gatling Arm and Venom Fangs) now hit for normal damage, and get stronger as you level up.',
  },
  {
    icon: '💬',
    title: 'World chat and admins',
    text: 'Talk to everyone in the World chat. Admins have their own chat and an Admin panel for fixing records, giving heroes or tryouts, and making other players admins.',
    href: '/chat',
  },
  {
    icon: '🛡',
    title: 'Run checking and warnings',
    text: 'Every run on a World’s Best list is now checked: it must really have taken as long as it says, and be possible at the fastest speed any hero can reach. Made-up times are refused, and the player gets a warning.',
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
