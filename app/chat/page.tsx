'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ChatPanel from '../../components/chat/ChatPanel';

function Chat() {
  const channel = useSearchParams().get('channel') === 'admin' ? 'admin' : 'world';
  return <ChatPanel initialChannel={channel} />;
}

export default function ChatPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>💬 Chat</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Chat />
      </Suspense>
    </main>
  );
}
