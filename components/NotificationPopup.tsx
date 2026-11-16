'use client';

import { useEffect, useState } from 'react';
import { useProfile } from './profile/ProfileContext';

interface Notice {
  id: number;
  kind: 'warning' | 'info';
  title: string;
  message: string;
  createdAt: string;
}

// Shows a signed-in player their unread notifications (like a cheating warning), one at a time.
export default function NotificationPopup() {
  const { profile } = useProfile();
  const [queue, setQueue] = useState<Notice[]>([]);

  useEffect(() => {
    if (!profile) {
      setQueue([]);
      return;
    }
    let cancelled = false;
    fetch('/api/notifications', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setQueue(data?.notifications ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const current = queue[0];
  if (!current) return null;

  function acknowledge() {
    fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: current.id }) }).catch(() => {});
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="update-backdrop notice-backdrop">
      <div className={`notice-box notice-${current.kind}`} role="alertdialog" aria-modal="true" aria-labelledby="notice-title" aria-describedby="notice-text">
        <h2 id="notice-title">{current.kind === 'warning' ? '⚠️ ' : ''}{current.title}</h2>
        <p id="notice-text">{current.message}</p>
        <small>{new Date(current.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</small>
        <button className="update-ok" onClick={acknowledge}>
          {current.kind === 'warning' ? 'I understand' : 'OK'}
        </button>
      </div>
    </div>
  );
}
