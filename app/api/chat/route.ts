import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isBackendConfigured } from '../../../lib/supabase';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../lib/session';
import { isAdmin, logAdmin } from '../../../lib/admin';
import { selectWithFallback, shownNameOf } from '../../../lib/profileFields';

export const dynamic = 'force-dynamic';

// Online chat. 'world' is for everyone (anyone can read, signed-in players can post);
// 'admin' is only for admins. Admins can delete any message.
type Channel = 'world' | 'admin';
const MAX_LENGTH = 200;
const SLOW_MODE_MS = 2000; // one message every 2 seconds per player
const PAGE = 60;

type Author = { id: string; nickname: string; display_name?: string | null; avatar_color: string; avatar_pixels?: string | null; is_admin?: boolean };
type Row = { id: number; body: string; created_at: string; profile_id: string; profiles: Author | Author[] | null };

function channelOf(v: unknown): Channel | null {
  return v === 'world' || v === 'admin' ? v : null;
}

export async function GET(req: NextRequest) {
  const channel = channelOf(req.nextUrl.searchParams.get('channel'));
  if (!channel) return NextResponse.json({ error: 'Unknown channel.' }, { status: 400 });
  if (!isBackendConfigured()) return NextResponse.json({ messages: [] });
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (channel === 'admin' && !(session && (await isAdmin(session.id)))) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  const after = Number(req.nextUrl.searchParams.get('after') ?? 0);
  const { data, error } = await selectWithFallback(
    (cols) => {
      const q = getSupabase().from('chat_messages').select(`id, body, created_at, profile_id, profiles ( ${cols} )`).eq('channel', channel).is('deleted_at', null);
      return (after > 0 ? q.gt('id', after).order('id', { ascending: true }) : q.order('id', { ascending: false })).limit(PAGE);
    },
    'id, nickname, display_name, avatar_color, avatar_pixels, is_admin',
    'id, nickname, avatar_color, avatar_pixels, is_admin',
    'id, nickname, avatar_color'
  );
  if (error) return NextResponse.json({ messages: [], notReady: true });
  const rows = (data ?? []) as unknown as Row[];
  const messages = (after > 0 ? rows : rows.reverse()).map((m) => {
    const a = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return { id: m.id, body: m.body, createdAt: m.created_at, profileId: m.profile_id, name: shownNameOf(a), avatarColor: a?.avatar_color ?? '#888888', avatarPixels: a?.avatar_pixels ?? null, isAdmin: !!a?.is_admin };
  });
  return NextResponse.json({ messages });
}

// Post a message, or (admins) delete one: { action: 'delete', id }.
export async function POST(req: NextRequest) {
  if (!isBackendConfigured()) return NextResponse.json({ error: 'Chat is not set up on this server yet.' }, { status: 503 });
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: 'Sign in to chat.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const supabase = getSupabase();
  const admin = await isAdmin(session.id);

  if (body?.action === 'delete') {
    if (!admin) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    const id = Number(body?.id);
    const { data, error } = await supabase.from('chat_messages').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('profile_id, body');
    if (error || !data?.length) return NextResponse.json({ error: 'Could not delete that message.' }, { status: 404 });
    await logAdmin(session.id, data[0].profile_id, 'deleteChat', `deleted: “${String(data[0].body).slice(0, 80)}”`);
    return NextResponse.json({ ok: true });
  }

  const channel = channelOf(body?.channel);
  if (!channel) return NextResponse.json({ error: 'Unknown channel.' }, { status: 400 });
  if (channel === 'admin' && !admin) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  const text = String(body?.body ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });
  if (text.length > MAX_LENGTH) return NextResponse.json({ error: `Messages can be up to ${MAX_LENGTH} characters.` }, { status: 400 });

  const { data: last, error: lastError } = await supabase.from('chat_messages').select('created_at').eq('profile_id', session.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (lastError) return NextResponse.json({ error: 'Chat is not set up yet. Run the latest supabase/schema.sql.' }, { status: 500 });
  if (last && Date.now() - new Date(last.created_at).getTime() < SLOW_MODE_MS) return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  const { data, error } = await supabase.from('chat_messages').insert({ channel, profile_id: session.id, body: text }).select('id').single();
  if (error || !data) return NextResponse.json({ error: 'Could not send your message.' }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
