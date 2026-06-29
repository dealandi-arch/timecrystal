'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProfile } from './ProfileContext';

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#facc15', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
];

export default function AuthWidget() {
  const { profile, loading, signUp, logIn, logOut } = useProfile();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return null;

  if (profile) {
    return (
      <div className="auth-widget">
        <span className="avatar-bar" style={{ background: profile.avatarColor }} />
        <span className="auth-nickname">{profile.nickname}</span>
        <span className="auth-id">#{profile.id}</span>
        <Link href={`/profiles/${profile.id}`} className="auth-link">
          My profile
        </Link>
        <Link href="/profiles" className="auth-link">
          Browse
        </Link>
        <button className="auth-link" onClick={() => logOut()}>
          Log out
        </button>
      </div>
    );
  }

  async function submit() {
    setError(null);
    if (!nickname.trim() || !password) {
      setError('Enter a nickname and password.');
      return;
    }
    setBusy(true);
    const result = mode === 'signup' ? await signUp(nickname, password, avatarColor) : await logIn(nickname, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    setOpen(false);
    setNickname('');
    setPassword('');
  }

  return (
    <div className="auth-widget">
      <button className="auth-signin-btn" onClick={() => setOpen((v) => !v)}>
        Sign in
      </button>
      {open && (
        <div className="auth-popover">
          <div className="auth-tabs">
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
              Sign up
            </button>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              Log in
            </button>
          </div>
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'signup' && (
            <>
              <p className="auth-avatar-label">Pick an avatar color</p>
              <div className="avatar-picker">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`avatar-swatch${avatarColor === c ? ' selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setAvatarColor(c)}
                    aria-label={`Choose color ${c}`}
                  />
                ))}
              </div>
            </>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit-btn" disabled={busy} onClick={submit}>
            {busy ? 'Please wait...' : mode === 'signup' ? 'Create profile' : 'Log in'}
          </button>
          <p className="auth-note">No email needed. You will get a 7-digit ID. There is no password recovery, so remember it.</p>
        </div>
      )}
    </div>
  );
}
