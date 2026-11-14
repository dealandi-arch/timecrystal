'use client';

import { useEffect, useMemo, useState } from 'react';
import TimeCrystalRPG from '../rpg/TimeCrystalRPG';
import { CUSTOM_ID_OFFSET, type CustomLevelInfo, toLevelDef } from '../rpg/customLevels';
import { useProfile } from '../profile/ProfileContext';
import LeaderboardPanel from '../profile/LeaderboardPanel';
import { formatTime } from '../profile/formatTime';

export default function PlayCustomLevel({ id }: { id: number }) {
  const [info, setInfo] = useState<CustomLevelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useProfile();

  useEffect(() => {
    fetch(`/api/levels/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error ?? 'Could not load this level.');
        setInfo(data.level);
        fetch(`/api/levels/${id}`, { method: 'POST' }).catch(() => {}); // count the play
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this level.'));
  }, [id]);

  const play = useMemo(() => {
    if (!info) return null;
    return {
      levels: [toLevelDef(CUSTOM_ID_OFFSET + info.id, info.name, info.mode, info.map)],
      customLevelId: info.id,
      ownLevel: profile?.id === info.authorId,
      finale: info.verifiedAt
        ? { title: 'Level Cleared!', text: `You beat “${info.name}” by ${info.author}. Find another one on the Public Levels page.` }
        : { title: 'Verification Run Complete', text: `If your clear was saved (see the message on the win screen), “${info.name}” is now on Public Levels for everyone to play.` },
    };
  }, [info, profile?.id]);

  if (error) return <p className="event-error">{error}</p>;
  if (!info || !play) return <p>Loading…</p>;
  const own = profile?.id === info.authorId;
  return (
    <div>
      <h1>{info.name}</h1>
      <p>
        <span className="view3d-tag">{info.mode.toUpperCase()}</span> &nbsp;by {info.author} · {info.plays ?? 0} plays &nbsp;
        {info.verifiedAt ? (
          <span className="verified-badge" title={info.verifyTimeMs ? `Verified in ${formatTime(info.verifyTimeMs)}` : undefined}>
            ✔ Verified{info.verifyTimeMs ? ` in ${formatTime(info.verifyTimeMs)}` : ''}
          </span>
        ) : (
          <span className="unverified-badge">Not verified yet</span>
        )}
      </p>
      {!info.verifiedAt ? (
        <p className="verify-note">
          Only you can see this level for now. <strong>Beat it once to verify it</strong>; that proves it can be cleared, and it goes public on
          Public Levels straight away.
        </p>
      ) : (
        <p className="gacha-fine">
          {own ? 'This is your level: you can play it and set times, but it won’t pay you Aizodon.' : 'Public levels pay half the usual Aizodon for your clear time, and can drop a Secret hero like any level.'}
        </p>
      )}
      <TimeCrystalRPG mode="custom" custom={play} />
      {info.verifiedAt && (
        <div className="level-rank">
          <LeaderboardPanel levelId={CUSTOM_ID_OFFSET + info.id} title="Level Rank" />
        </div>
      )}
    </div>
  );
}
