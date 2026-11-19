'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile } from '../profile/ProfileContext';

type Challenge = { id: number; kind: 'race' | 'arena'; opponent: { name: string } | null; status: string };

const POLL_MS = 8000;

// Shows on every page (home included) for signed-in players:
//  - a challenge sent to you pops up with Accept / Decline (it stays open for 10 minutes),
//  - a challenge you sent that gets accepted while you're elsewhere takes you straight into the match
//    (a Player Fight starts with picking your hero).
export default function ChallengeWatcher() {
  const { profile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [incoming, setIncoming] = useState<Challenge[]>([]);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState<number[]>([]);
  const entered = useRef<Set<number>>(new Set());

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/pvp/challenge', { cache: 'no-store' });
      const data = await res.json();
      setIncoming(data.challenges ?? []);
      // My challenge was accepted: go to the match (once per match; the PvP page handles it from there).
      for (const m of (data.outgoing ?? []) as Challenge[]) {
        if (m.status === 'ready' && !entered.current.has(m.id) && !pathname.startsWith('/pvp')) {
          entered.current.add(m.id);
          router.push(`/pvp?match=${m.id}`);
          return;
        }
      }
    } catch {
      /* offline: try again next time */
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!profile) return;
    check();
    const timer = window.setInterval(check, POLL_MS);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [profile, check]);

  const shown = incoming.filter((c) => !hidden.includes(c.id));
  if (!profile || pathname.startsWith('/pvp') || shown.length === 0) return null;
  const c = shown[0];

  async function accept() {
    setBusy(true);
    const res = await fetch('/api/pvp/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', matchId: c.id }) });
    setBusy(false);
    if (res.ok) {
      entered.current.add(c.id);
      router.push(`/pvp?match=${c.id}`);
    } else {
      setHidden((h) => [...h, c.id]);
      check();
    }
  }

  async function decline() {
    setHidden((h) => [...h, c.id]);
    await fetch('/api/pvp/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: c.id }) }).catch(() => {});
  }

  return (
    <div className="challenge-pop" role="alertdialog" aria-label="Challenge">
      <strong>⚔️ {c.opponent?.name ?? 'A player'} challenged you!</strong>
      <span>{c.kind === 'arena' ? 'A Player Fight (PvP): pick a hero and fight.' : 'A live time race.'}</span>
      <div>
        <button className="ability-btn" disabled={busy} onClick={accept}>
          Accept
        </button>
        <button className="ability-btn story-skip" onClick={decline}>
          Decline
        </button>
      </div>
    </div>
  );
}
