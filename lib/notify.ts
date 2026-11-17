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
