import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { loadCollection, requireSession, saveCollection } from '../../../lib/collectionServer';
import { addNotification } from '../../../lib/notify';
import { CHARACTER_RARITY, cardsNeeded } from '../../../components/rpg/gacha';
import { CHARACTERS } from '../../../components/rpg/pixelArt';

export const dynamic = 'force-dynamic';

// Trading Emerald Shards and hero cards between players.
// An offer says what you give and what you want back; the other player accepts or declines.
// Accepting runs the accept_trade database function, which checks both sides and swaps everything at once.
// Cards for heroes you already own can't be traded (otherwise unlocked sets could be passed around forever).

type Side = { shards: number; cards: Record<string, number> };
const MAX_PENDING = 5;
const heroName = (id: string) => CHARACTERS.find((c) => c.id === id)?.name ?? id;
const notReady = () => NextResponse.json({ error: 'Trading is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });

function cleanSide(raw: unknown): Side | null {
  const r = raw as { shards?: unknown; cards?: unknown } | null;
  const shards = Number(r?.shards ?? 0);
  if (!Number.isInteger(shards) || shards < 0 || shards > 100000) return null;
  const cards: Record<string, number> = {};
  for (const [id, n] of Object.entries((r?.cards ?? {}) as Record<string, unknown>)) {
    const count = Number(n);
    if (!(id in CHARACTER_RARITY) || !Number.isInteger(count) || count < 0 || count > 50) return null;
    if (count > 0) cards[id] = count;
  }
  return { shards, cards };
}

const describe = (s: Side) => [s.shards ? `${s.shards} 💎` : '', ...Object.entries(s.cards).map(([id, n]) => `${n}× ${heroName(id)} card`)].filter(Boolean).join(', ') || 'nothing';

// After a trade, any hero whose card set is now complete is unlocked.
async function unlockCompleted(profileId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const c = await loadCollection(profileId);
    if (!c) return;
    const done = Object.entries(c.cards).filter(([id, n]) => n >= cardsNeeded(id) && !c.owned.includes(id)).map(([id]) => id);
    if (!done.length) return;
    if (await saveCollection(profileId, c.shards, { shards: c.shards, owned: [...c.owned, ...done] })) {
      for (const id of done) await addNotification(profileId, 'info', `${heroName(id)} unlocked!`, `A trade completed your ${heroName(id)} cards. They’re in your hero list now.`);
      return;
    }
  }
}

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .select('id, from_id, to_id, give, want, status, created_at, decided_at')
    .or(`from_id.eq.${auth.profileId},to_id.eq.${auth.profileId}`)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) return notReady();
  const rows = (data ?? []) as { id: number; from_id: string; to_id: string; give: Side; want: Side; status: string; created_at: string; decided_at: string | null }[];
  const ids = [...new Set(rows.flatMap((t) => [t.from_id, t.to_id]))];
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, nickname, display_name').in('id', ids) : { data: [] };
  const names = new Map(((people ?? []) as { id: string; nickname: string; display_name?: string | null }[]).map((p) => [p.id, p.display_name?.trim() || p.nickname]));
  const trades = rows.map((t) => ({
    id: t.id,
    fromId: t.from_id,
    toId: t.to_id,
    fromName: names.get(t.from_id) ?? `#${t.from_id}`,
    toName: names.get(t.to_id) ?? `#${t.to_id}`,
    give: t.give,
    want: t.want,
    status: t.status,
    createdAt: t.created_at,
    mine: t.from_id === auth.profileId,
  }));
  return NextResponse.json({ trades });
}

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const supabase = getSupabase();
  const action = body?.action;

  if (action === 'offer') {
    const toId = String(body?.toId ?? '');
    const give = cleanSide(body?.give);
    const want = cleanSide(body?.want);
    if (!give || !want) return NextResponse.json({ error: 'Check the amounts in your offer.' }, { status: 400 });
    if (!/^\d+$/.test(toId) || toId === auth.profileId) return NextResponse.json({ error: 'Pick another player to trade with.' }, { status: 400 });
    if (!give.shards && !Object.keys(give.cards).length && !want.shards && !Object.keys(want.cards).length) return NextResponse.json({ error: 'Add something to the trade.' }, { status: 400 });
    const { data: other } = await supabase.from('profiles').select('id, owned_characters').eq('id', toId).maybeSingle();
    if (!other) return NextResponse.json({ error: 'That player doesn’t exist.' }, { status: 404 });
    const mine = await loadCollection(auth.profileId);
    if (!mine) return notReady();
    if (mine.shards < give.shards) return NextResponse.json({ error: `You only have ${mine.shards} Emerald Shards.` }, { status: 400 });
    for (const [id, n] of Object.entries(give.cards)) {
      if (mine.owned.includes(id)) return NextResponse.json({ error: `You own ${heroName(id)}, so those cards can’t be traded.` }, { status: 400 });
      if ((mine.cards[id] ?? 0) < n) return NextResponse.json({ error: `You only have ${mine.cards[id] ?? 0} ${heroName(id)} card(s).` }, { status: 400 });
    }
    const theirOwned = ((other as { owned_characters?: string[] }).owned_characters ?? []) as string[];
    for (const id of Object.keys(want.cards)) {
      if (theirOwned.includes(id)) return NextResponse.json({ error: `They own ${heroName(id)}, so they can’t trade those cards.` }, { status: 400 });
    }
    const { count } = await supabase.from('trades').select('id', { count: 'exact', head: true }).eq('from_id', auth.profileId).eq('status', 'pending');
    if ((count ?? 0) >= MAX_PENDING) return NextResponse.json({ error: `You can have ${MAX_PENDING} offers waiting at once. Cancel one first.` }, { status: 400 });
    const { data: saved, error } = await supabase.from('trades').insert({ from_id: auth.profileId, to_id: toId, give, want, status: 'pending' }).select('id').single();
    if (error || !saved) return notReady();
    const { data: me } = await supabase.from('profiles').select('nickname, display_name').eq('id', auth.profileId).maybeSingle();
    const myName = (me as { nickname?: string; display_name?: string | null } | null)?.display_name?.trim() || (me as { nickname?: string } | null)?.nickname || 'Someone';
    await addNotification(toId, 'info', `Trade offer from ${myName}`, `They give ${describe(give)} and want ${describe(want)}. Open Trading to accept or decline.`);
    return NextResponse.json({ ok: true, id: saved.id });
  }

  const id = Number(body?.id);
  const { data: t } = await supabase.from('trades').select('id, from_id, to_id, give, want, status').eq('id', id).maybeSingle();
  if (!t) return NextResponse.json({ error: 'That trade doesn’t exist.' }, { status: 404 });
  const trade = t as { id: number; from_id: string; to_id: string; give: Side; want: Side; status: string };
  if (trade.status !== 'pending') return NextResponse.json({ error: 'That trade is already finished.' }, { status: 400 });

  if (action === 'cancel') {
    if (trade.from_id !== auth.profileId) return NextResponse.json({ error: 'Only the player who offered it can cancel it.' }, { status: 403 });
    await supabase.from('trades').update({ status: 'cancelled', decided_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ ok: true });
  }
  if (trade.to_id !== auth.profileId) return NextResponse.json({ error: 'This offer isn’t for you.' }, { status: 403 });
  if (action === 'decline') {
    await supabase.from('trades').update({ status: 'declined', decided_at: new Date().toISOString() }).eq('id', id);
    await addNotification(trade.from_id, 'info', 'Trade declined', `Your offer (${describe(trade.give)} for ${describe(trade.want)}) was declined.`);
    return NextResponse.json({ ok: true });
  }
  if (action === 'accept') {
    const { data: result, error } = await supabase.rpc('accept_trade', { p_trade: id, p_by: auth.profileId });
    if (error) return notReady();
    if (result !== 'ok') return NextResponse.json({ error: String(result) }, { status: 400 });
    await unlockCompleted(trade.from_id);
    await unlockCompleted(trade.to_id);
    await addNotification(trade.from_id, 'info', 'Trade accepted!', `You gave ${describe(trade.give)} and got ${describe(trade.want)}.`);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
