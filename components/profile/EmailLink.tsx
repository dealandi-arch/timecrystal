'use client';

import { useState } from 'react';

// "Link email" on your own profile. Optional and private: nobody else ever sees it.
export default function EmailLink({ email, onChange }: { email: string | null; onChange: (email: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(next: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Could not save that.');
      onChange(data.email ?? null);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="email-link">
        {email ? (
          <>
            <span>📧 {email}</span>
            <button className="ability-btn story-skip" onClick={() => { setValue(email); setOpen(true); }}>
              Change
            </button>
            <button className="ability-btn story-skip" onClick={() => window.confirm('Unlink this email from your account?') && save(null)} disabled={busy}>
              Unlink
            </button>
          </>
        ) : (
          <button className="ability-btn profile-edit-name" onClick={() => setOpen(true)}>
            📧 Link email
          </button>
        )}
      </div>
    );
  }
  return (
    <form
      className="name-editor"
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
    >
      <input type="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="you@example.com" aria-label="Email" autoFocus maxLength={254} />
      <button type="submit" className="ability-btn" disabled={busy}>
        {busy ? 'Saving…' : 'Link'}
      </button>
      <button type="button" className="ability-btn story-skip" onClick={() => setOpen(false)}>
        Cancel
      </button>
      <p className="gacha-fine">Optional. Only you can see it: it’s never shown to other players.</p>
      {error && <p className="event-error">{error}</p>}
    </form>
  );
}
