'use client';

import { useState } from 'react';
import { useProfile } from './ProfileContext';

export default function SignInBanner() {
  const { profile, loading } = useProfile();
  const [dismissed, setDismissed] = useState(false);

  if (loading || profile || dismissed) return null;

  return (
    <div className="signin-banner">
      <span>Recommended: sign in (top-left) so your best runs count toward the world leaderboard. You can still play anonymously.</span>
      <button className="auth-link" onClick={() => setDismissed(true)}>
        Got it
      </button>
    </div>
  );
}
