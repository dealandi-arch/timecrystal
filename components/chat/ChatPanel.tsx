'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useProfile } from '../profile/ProfileContext';
import Avatar from '../profile/Avatar';

type Channel = 'world' | 'admin';
interface Message {
  id: number;
  body: string;
  createdAt: string;
  profileId: string;
  name: string;
  avatarColor: string;
  avatarPixels: string | null;
  isAdmin: boolean;
}

const POLL_MS = 3000;

export default function ChatPanel({ initialChannel = 'world' }: { initialChannel?: Channel }) {
  const { profile } = useProfile();
  const isAdmin = !!profile?.isAdmin;
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const lastId = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (channel === 'admin' && !isAdmin) setChannel('world');
  }, [channel, isAdmin]);

  // Load the latest messages, then keep asking for newer ones.
  useEffect(() => {
    if (channel === 'admin' && !isAdmin) return;
    let cancelled = false;
    lastId.current = 0;
    setMessages([]);
    async function load() {
      try {
        const res = await fetch(`/api/chat?channel=${channel}&after=${lastId.current}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        setNotReady(!!data.notReady);
        const fresh: Message[] = data.messages ?? [];
        if (fresh.length) {
          lastId.current = fresh[fresh.length - 1].id;
          setMessages((m) => [...m, ...fresh].slice(-200));
        }
      } catch {
        /* offline: try again next tick */
      }
    }
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [channel, isAdmin]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError(null);
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, body: text }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? 'Could not send.');
      return;
    }
    setDraft('');
    // show it right away
    const r = await fetch(`/api/chat?channel=${channel}&after=${lastId.current}`, { cache: 'no-store' });
    const fresh = (await r.json().catch(() => ({}))).messages ?? [];
    if (fresh.length) {
      lastId.current = fresh[fresh.length - 1].id;
      setMessages((m) => [...m, ...fresh].slice(-200));
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Delete this message for everyone?')) return;
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    if (res.ok) setMessages((m) => m.filter((x) => x.id !== id));
  }

  return (
    <div className={`chat chat-${channel}`}>
      <div className="rank3d-tabs" role="tablist">
        <button role="tab" aria-selected={channel === 'world'} className={channel === 'world' ? 'on' : ''} onClick={() => setChannel('world')}>
          🌍 World chat
        </button>
        {isAdmin && (
          <button role="tab" aria-selected={channel === 'admin'} className={channel === 'admin' ? 'on' : ''} onClick={() => setChannel('admin')}>
            🛡 Admin chat
          </button>
        )}
      </div>
      {notReady && <p className="event-error">Chat is not set up yet. Run the latest supabase/schema.sql.</p>}
      <div className="chat-list" ref={listRef} aria-live="polite">
        {messages.length === 0 && <p className="gacha-fine">No messages yet. Say hi!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg${m.profileId === profile?.id ? ' mine' : ''}`}>
            <Avatar nickname={m.name} color={m.avatarColor} pixels={m.avatarPixels} size={24} />
            <div>
              <div className="chat-meta">
                <Link href={`/profiles/${m.profileId}`}>{m.name}</Link>
                {m.isAdmin && <span className="chat-admin">🛡 Admin</span>}
                <small>{new Date(m.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small>
                {isAdmin && (
                  <button className="chat-delete" onClick={() => remove(m.id)} aria-label="Delete message">
                    ✕
                  </button>
                )}
              </div>
              <p>{m.body}</p>
            </div>
          </div>
        ))}
      </div>
      {profile ? (
        <form className="chat-form" onSubmit={sendMessage}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} placeholder={channel === 'admin' ? 'Message the other admins…' : 'Say something to everyone…'} aria-label="Message" />
          <button className="ability-btn" type="submit" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      ) : (
        <p className="gacha-fine">Sign in to chat.</p>
      )}
      {error && <p className="event-error">{error}</p>}
      <p className="gacha-fine">Be kind. Admins can delete messages.</p>
    </div>
  );
}
