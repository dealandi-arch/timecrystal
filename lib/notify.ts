import { getSupabase } from './supabase';

// Messages shown to a player the next time they open the site (warnings about rejected runs, etc.).
export type NoticeKind = 'warning' | 'info';

export async function addNotification(profileId: string, kind: NoticeKind, title: string, message: string): Promise<boolean> {
  try {
    const { error } = await getSupabase().from('notifications').insert({ profile_id: profileId, kind, title, message });
    return !error;
  } catch {
    return false; // notifications table not set up yet: the run is still refused
  }
}

// The warning a player gets when the game catches an impossible run.
export function warnCheater(profileId: string, where: string, reason: string) {
  return addNotification(
    profileId,
    'warning',
    'Warning: run rejected',
    `Your run on ${where} was not counted. ${reason} Runs have to be played for real. Sending made-up times can get your records removed.`
  );
}
