'use client';

import { useState } from 'react';
import { NAME_CHANGE_DAYS, nextNameChange, validateDisplayName } from './displayName';

// "Change display name" on your own profile. Free, then locked for 5 days.
export default function DisplayNameEditor({
  current,
  changedAt,
  onSaved,
}: {
  current: string;
  changedAt: string | null;
  onSaved: (displayName: string, changedAt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lockedUntil = nextNameChange(changedAt);

  if (lockedUntil) {
    return (
      <p className="name-lock">
        🔒 You can change your display name again on{' '}
        {new Date(lockedUntil).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.
      </p>
    );
  }

  if (!open) {
    return (
      <button className="ability-btn profile-edit-name" onClick={() => { setValue(current); setError(null); setOpen(true); }}>
        Change display name
      </button>
    );
  }

  async function save() {
    const name = validateDisplayName(value);
    if (!name) {
      setError('Use 3–20 letters, numbers, spaces or _ - . \' ! ?');
      return;
    }
    if (name === current) {
      setOpen(false);
      return;
    }
    if (!window.confirm(`Change your display name to “${name}”? You won’t be able to change it again for ${NAME_CHANGE_DAYS} days.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: name }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Could not change your display name.');
      onSaved(data.displayName, data.nameChangedAt);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change your display name.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="name-editor"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={20} aria-label="Display name" autoFocus />
      <button type="submit" className="ability-btn" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className="ability-btn story-skip" onClick={() => setOpen(false)}>
        Cancel
      </button>
      <p className="gacha-fine">Free to change, but then it’s locked for {NAME_CHANGE_DAYS} days. Your @username and #ID never change.</p>
      {error && <p className="event-error">{error}</p>}
    </form>
  );
}
