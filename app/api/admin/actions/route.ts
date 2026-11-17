import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { isSuperAdmin, logAdmin, requireAdmin } from '../../../../lib/admin';
import { addNotification } from '../../../../lib/notify';
import { UNLOCKABLE_CHARACTERS } from '../../../../components/rpg/gacha';
import { CHARACTERS } from '../../../../components/rpg/pixelArt';

// Admin actions on a player's records. Each one is logged in admin_log.
//   setTime      { targetId, levelId, timeMs }   change one World's Best time
//   deleteRun    { targetId, levelId }           remove one World's Best time
//   resetUnder   { targetId, timeMs }            every built-in level (1-11) faster than timeMs becomes timeMs
//   deleteCraze  { targetId, minutes }           remove a Craze score
//   warn         { targetId, title, message }    send the player a warning notification
//   setAdmin     { targetId, isAdmin }           give or remove admin power (not your own)
//   giveHero     { targetId, heroId }            give a gacha or Secret hero to keep
//   giveTrial    { targetId, heroId, days }      give a tryout of a hero for 1-30 days
//   removeHero   { targetId, heroId }            take a hero (and any tryout of them) away (super admin only)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? '');
  const targetId = String(body?.targetId ?? '');
  if (!/^\d+$/.test(targetId)) return NextResponse.json({ error: 'Pick a player.' }, { status: 400 });
  const supabase = getSupabase();
  const levelId = Number(body?.levelId);
  const timeMs = Math.round(Number(body?.timeMs));
  const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

  if (action === 'setTime' || action === 'deleteRun') {
    if (!Number.isInteger(levelId)) return NextResponse.json({ error: 'Pick a level.' }, { status: 400 });
    const { data: before } = await supabase.from('best_runs').select('time_ms').eq('profile_id', targetId).eq('level_id', levelId).maybeSingle();
    if (!before) return NextResponse.json({ error: 'That player has no time on that level.' }, { status: 404 });
    if (action === 'deleteRun') {
      const { error } = await supabase.from('best_runs').delete().eq('profile_id', targetId).eq('level_id', levelId);
      if (error) return NextResponse.json({ error: 'Could not delete the run.' }, { status: 500 });
      await logAdmin(admin.adminId, targetId, 'deleteRun', `level ${levelId}: removed ${fmt(before.time_ms)}`);
      return NextResponse.json({ ok: true });
    }
    if (!Number.isFinite(timeMs) || timeMs <= 0 || timeMs > 60 * 60 * 1000) return NextResponse.json({ error: 'Enter a time in seconds.' }, { status: 400 });
    const { error } = await supabase.from('best_runs').update({ time_ms: timeMs }).eq('profile_id', targetId).eq('level_id', levelId);
    if (error) return NextResponse.json({ error: 'Could not change the time.' }, { status: 500 });
    await logAdmin(admin.adminId, targetId, 'setTime', `level ${levelId}: ${fmt(before.time_ms)} → ${fmt(timeMs)}`);
    return NextResponse.json({ ok: true });
  }

  if (action === 'resetUnder') {
    if (!Number.isFinite(timeMs) || timeMs <= 0 || timeMs > 10 * 60 * 1000) return NextResponse.json({ error: 'Enter a time in seconds.' }, { status: 400 });
    const { data, error } = await supabase.from('best_runs').update({ time_ms: timeMs }).eq('profile_id', targetId).lte('level_id', 11).lt('time_ms', timeMs).select('level_id');
    if (error) return NextResponse.json({ error: 'Could not reset the times.' }, { status: 500 });
    const levels = (data ?? []).map((r) => r.level_id).sort((a, b) => a - b);
    await logAdmin(admin.adminId, targetId, 'resetUnder', `levels ${levels.join(', ') || 'none'} set to ${fmt(timeMs)}`);
    return NextResponse.json({ ok: true, changed: levels.length });
  }

  if (action === 'deleteCraze') {
    const minutes = Number(body?.minutes);
    const { data, error } = await supabase.from('craze_scores').delete().eq('profile_id', targetId).eq('minutes', minutes).select('kills');
    if (error || !data?.length) return NextResponse.json({ error: 'No Craze score to delete.' }, { status: 404 });
    await logAdmin(admin.adminId, targetId, 'deleteCraze', `${minutes} min: removed ${data[0].kills}`);
    return NextResponse.json({ ok: true });
  }

  if (action === 'setAdmin') {
    const makeAdmin = body?.isAdmin === true;
    if (targetId === admin.adminId && !makeAdmin) return NextResponse.json({ error: 'You can’t remove your own admin power.' }, { status: 400 });
    const { data, error } = await supabase.from('profiles').update({ is_admin: makeAdmin }).eq('id', targetId).select('nickname');
    if (error || !data?.length) return NextResponse.json({ error: 'Could not change admin power.' }, { status: 500 });
    await logAdmin(admin.adminId, targetId, makeAdmin ? 'makeAdmin' : 'removeAdmin', `${data[0].nickname} ${makeAdmin ? 'is now an admin' : 'is no longer an admin'}`);
    if (makeAdmin) await addNotification(targetId, 'info', 'You’re now an admin', 'You can open the Admin panel and the Admin chat from the 🛡 Admin link next to your name.');
    return NextResponse.json({ ok: true });
  }

  if (action === 'removeHero') {
    if (!(await isSuperAdmin(admin.adminId))) return NextResponse.json({ error: 'Only the super admin can remove heroes.' }, { status: 403 });
    const heroId = String(body?.heroId ?? '');
    const hero = CHARACTERS.find((c) => c.id === heroId);
    if (!hero || !UNLOCKABLE_CHARACTERS.includes(heroId)) return NextResponse.json({ error: 'Pick a gacha or Secret hero.' }, { status: 400 });
    const { data: p, error: readError } = await supabase.from('profiles').select('owned_characters, recent_characters, trials').eq('id', targetId).maybeSingle();
    if (readError || !p) return NextResponse.json({ error: 'Could not read that player.' }, { status: 500 });
    const row = p as { owned_characters?: string[]; recent_characters?: string[]; trials?: Record<string, string> };
    const owned = row.owned_characters ?? [];
    const trials = { ...(row.trials ?? {}) };
    if (!owned.includes(heroId) && !(heroId in trials)) return NextResponse.json({ error: `They don’t have ${hero.name}.` }, { status: 400 });
    delete trials[heroId];
    const { error } = await supabase
      .from('profiles')
      .update({ owned_characters: owned.filter((id) => id !== heroId), recent_characters: (row.recent_characters ?? []).filter((id) => id !== heroId), trials })
      .eq('id', targetId);
    if (error) return NextResponse.json({ error: 'Could not remove the hero.' }, { status: 500 });
    await addNotification(targetId, 'info', `${hero.name} was removed`, `An admin removed ${hero.name} from your heroes.`);
    await logAdmin(admin.adminId, targetId, 'removeHero', hero.name);
    return NextResponse.json({ ok: true });
  }

  if (action === 'giveHero' || action === 'giveTrial') {
    if (!(await isSuperAdmin(admin.adminId))) return NextResponse.json({ error: 'Only the super admin can give heroes or tryouts.' }, { status: 403 });
    const heroId = String(body?.heroId ?? '');
    const hero = CHARACTERS.find((c) => c.id === heroId);
    if (!hero || !UNLOCKABLE_CHARACTERS.includes(heroId)) return NextResponse.json({ error: 'Pick a gacha or Secret hero.' }, { status: 400 });
    const { data: p, error: readError } = await supabase.from('profiles').select('owned_characters, trials').eq('id', targetId).maybeSingle();
    if (readError || !p) return NextResponse.json({ error: 'Could not read that player. (Run the latest supabase/schema.sql if tryouts are new.)' }, { status: 500 });
    const owned = ((p as { owned_characters?: string[] }).owned_characters ?? []) as string[];
    if (action === 'giveHero') {
      if (owned.includes(heroId)) return NextResponse.json({ error: `They already have ${hero.name}.` }, { status: 400 });
      const { error } = await supabase.from('profiles').update({ owned_characters: [...owned, heroId] }).eq('id', targetId);
      if (error) return NextResponse.json({ error: 'Could not give the hero.' }, { status: 500 });
      await addNotification(targetId, 'info', `You got ${hero.name}!`, `An admin gave you ${hero.name}. They’re yours to keep: pick them from the hero list.`);
      await logAdmin(admin.adminId, targetId, 'giveHero', hero.name);
      return NextResponse.json({ ok: true });
    }
    const days = Math.round(Number(body?.days));
    if (!Number.isInteger(days) || days < 1 || days > 30) return NextResponse.json({ error: 'A tryout lasts 1 to 30 days.' }, { status: 400 });
    if (owned.includes(heroId)) return NextResponse.json({ error: `They already own ${hero.name}.` }, { status: 400 });
    const ends = new Date(Date.now() + days * 86400000).toISOString();
    const trials = { ...(((p as { trials?: Record<string, string> }).trials ?? {}) as Record<string, string>), [heroId]: ends };
    const { error } = await supabase.from('profiles').update({ trials }).eq('id', targetId);
    if (error) return NextResponse.json({ error: 'Could not give the tryout.' }, { status: 500 });
    await addNotification(targetId, 'info', `Free tryout: ${hero.name}`, `An admin gave you a ${days}-day tryout of ${hero.name}. Pick them from the hero list before it runs out!`);
    await logAdmin(admin.adminId, targetId, 'giveTrial', `${hero.name} for ${days} day${days > 1 ? 's' : ''}`);
    return NextResponse.json({ ok: true });
  }

  if (action === 'warn') {
    const title = String(body?.title ?? '').trim().slice(0, 80) || 'Warning from an admin';
    const message = String(body?.message ?? '').trim().slice(0, 500);
    if (message.length < 3) return NextResponse.json({ error: 'Write the warning message.' }, { status: 400 });
    if (!(await addNotification(targetId, 'warning', title, message))) return NextResponse.json({ error: 'Could not send the warning.' }, { status: 500 });
    await logAdmin(admin.adminId, targetId, 'warn', `${title}: ${message}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
