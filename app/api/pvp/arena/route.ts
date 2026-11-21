import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { LIVE_START_DELAY_MS, NO_SHOW_MS, type MatchRow, type PosRow, loadMatch, matchView, requirePlayer, settleMatch } from '../../../../lib/pvp';
import { ARENA_D, ARENA_W, FIGHT_MS, MAX_HITS_SENT, MAX_SHOTS_SENT } from '../../../../components/pvp/arenaConfig';
import { type HitEvent, abilityOf, fightStatsOf, simulateHp } from '../../../../components/pvp/fightHeroes';
import { UNLOCKABLE_CHARACTERS } from '../../../../components/rpg/gacha';

export const dynamic = 'force-dynamic';

// Player Fight. POST { id, hero, x, z, yaw, ms, landed, hits, shots } several times a second.
//
// Each fighter reports where they are, the shots they fired, how many hits they LANDED, and when they TOOK hits.
// A hit only counts when both sides agree: the hits a fighter takes = the first min(hits the other landed, hits they
// report taking). Health (with regeneration) is then worked out here on the server from those hit times, so both
// screens show what the server decides. First to reach 0 health loses; when time runs out the fighter with more health
// left wins, and equal health is a draw (no rating change).

const num = (v: unknown, lo: number, hi: number, fallback = lo) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const count = (v: unknown, previous: number) => Math.min(MAX_HITS_SENT, Math.max(previous, Math.min(previous + 3, Math.floor(num(v, 0, 9999)))));

// Ability hits can't outrun the hero's cooldown: each use lands at most `perCast` hits.
function abilityCount(v: unknown, previous: number, hero: string, elapsedMs: number) {
  const a = abilityOf(hero);
  const cap = a ? (Math.floor(Math.max(0, elapsedMs) / (a.cooldownMs * 0.8)) + 1) * a.perCast : 0;
  return Math.min(cap, Math.max(previous, Math.min(previous + 3, Math.floor(num(v, 0, 9999)))));
}

function cleanShots(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-MAX_SHOTS_SENT).map((s) => {
    const len = Math.hypot(num(s?.dx, -1, 1, 0), num(s?.dy, -1, 1, 0), num(s?.dz, -1, 1, 0)) || 1;
    return {
      n: Math.floor(num(s?.n, 0, 1e6)),
      x: num(s?.x, 0, ARENA_W),
      y: num(s?.y, 0, 5),
      z: num(s?.z, 0, ARENA_D),
      dx: num(s?.dx, -1, 1, 0) / len,
      dy: num(s?.dy, -1, 1, 0) / len,
      dz: num(s?.dz, -1, 1, 0) / len,
      k: ['s', 'm', 'b', 'a'].includes(s?.k) ? s.k : 's',
      ab: s?.ab ? 1 : 0,
    };
  });
}

function cleanHits(raw: unknown, previous: number[]): number[] {
  if (!Array.isArray(raw)) return previous;
  const hits = raw.map(Number).filter(Number.isFinite).slice(0, MAX_HITS_SENT);
  // Hits already reported can't be taken back.
  return hits.length >= previous.length ? hits : previous;
}

async function heroAllowed(profileId: string, heroId: string): Promise<boolean> {
  if (!fightStatsOf(heroId)) return false;
  if (!UNLOCKABLE_CHARACTERS.includes(heroId)) return true;
  const { data } = await getSupabase().from('profiles').select('owned_characters, trials').eq('id', profileId).maybeSingle();
  const row = data as { owned_characters?: string[] | null; trials?: Record<string, string> | null } | null;
  if (row?.owned_characters?.includes(heroId)) return true;
  const ends = row?.trials?.[heroId];
  return !!ends && new Date(ends).getTime() > Date.now();
}

// The hits a fighter took that the attacker also says they landed (normal shots and ability hits count separately).
function confirmedHits(victim: PosRow | null, attacker: PosRow | null): HitEvent[] {
  const shot = fightStatsOf(attacker?.hero);
  const ability = abilityOf(attacker?.hero);
  if (!shot) return [];
  const basic = ((victim?.hits as number[] | undefined) ?? []).slice(0, Number(attacker?.landed ?? 0)).map((t) => ({ t, dmg: shot.damage }));
  const special = ((victim?.abilityHits as number[] | undefined) ?? []).slice(0, Number(attacker?.abilityLanded ?? 0)).map((t) => ({ t, dmg: ability?.damage ?? shot.damage * 2 }));
  return [...basic, ...special];
}

// Health of both fighters at `ms` after the start, from the hits both sides agree on.
function fighters(match: MatchRow, ms: number) {
  const a = match.a_pos;
  const b = match.b_pos;
  const sa = fightStatsOf(a?.hero);
  const sb = fightStatsOf(b?.hero);
  const simA = sa && sb ? simulateHp(confirmedHits(a, b), sa.hp, ms) : { hp: sa?.hp ?? 0, deadAt: null };
  const simB = sa && sb ? simulateHp(confirmedHits(b, a), sb.hp, ms) : { hp: sb?.hp ?? 0, deadAt: null };
  return { simA, simB, maxA: sa?.hp ?? 1, maxB: sb?.hp ?? 1 };
}

export async function POST(req: NextRequest) {
  const auth = requirePlayer(req);
  if (!auth.ok) return auth.response;
  const me = auth.profileId;
  const body = await req.json().catch(() => null);
  let match = await loadMatch(Number(body?.id));
  if (!match || match.kind !== 'arena' || (match.a_id !== me && match.b_id !== me)) return NextResponse.json({ error: 'That fight doesn’t exist.' }, { status: 404 });

  const supabase = getSupabase();
  const now = Date.now();
  const iAmA = match.a_id === me;

  if (match.status === 'ready') {
    const previous = (iAmA ? match.a_pos : match.b_pos) ?? null;
    const hero = String(body?.hero ?? previous?.hero ?? '');
    if (hero !== previous?.hero && !(await heroAllowed(me, hero))) return NextResponse.json({ error: 'You can’t use that hero.' }, { status: 400 });
    const mine: PosRow = {
      x: num(body?.x, 0, ARENA_W),
      y: num(body?.z, 0, ARENA_D), // "y" in the shared row is the floor depth (z)
      ms: Math.round(num(body?.ms, -1, 60 * 60 * 1000, -1)),
      at: now,
      hero,
      yaw: num(body?.yaw, -10, 10, 0),
      landed: count(body?.landed, Number(previous?.landed ?? 0)),
      abilityLanded: abilityCount(body?.abilityLanded, Number(previous?.abilityLanded ?? 0), hero, match.start_at ? now - new Date(match.start_at).getTime() : 0),
      hits: cleanHits(body?.hits, (previous?.hits as number[] | undefined) ?? []),
      abilityHits: cleanHits(body?.abilityHits, (previous?.abilityHits as number[] | undefined) ?? []),
      shots: cleanShots(body?.shots),
    };
    await supabase.from('pvp_matches').update(iAmA ? { a_pos: mine } : { b_pos: mine }).eq('id', match.id).eq('status', 'ready');
    match = (iAmA ? { ...match, a_pos: mine } : { ...match, b_pos: mine }) as MatchRow;
    const theirs = iAmA ? match.b_pos : match.a_pos;

    // Both fighters have picked a hero and are in the arena: start in a few seconds.
    if (!match.start_at && theirs?.hero) {
      const startAt = new Date(now + LIVE_START_DELAY_MS).toISOString();
      const { data: set } = await supabase.from('pvp_matches').update({ start_at: startAt }).eq('id', match.id).is('start_at', null).select('start_at');
      match = { ...match, start_at: set?.[0]?.start_at ?? (await loadMatch(match.id))?.start_at ?? null } as MatchRow;
    }
    const start = match.start_at ? new Date(match.start_at).getTime() : null;

    if (start !== null && now >= start) {
      const f = fighters(match, now - start);
      let done: MatchRow | null = null;
      if (f.simA.deadAt !== null || f.simB.deadAt !== null) {
        const aDies = f.simA.deadAt !== null && (f.simB.deadAt === null || f.simA.deadAt < f.simB.deadAt);
        const bDies = f.simB.deadAt !== null && (f.simA.deadAt === null || f.simB.deadAt < f.simA.deadAt);
        if (aDies || bDies) done = await settleMatch(match, aDies ? match.b_id ?? me : match.a_id);
        else await supabase.from('pvp_matches').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('id', match.id).eq('status', 'ready');
      } else if (now - (theirs?.at ?? start) > NO_SHOW_MS && now > start + NO_SHOW_MS) {
        done = await settleMatch(match, me); // the other fighter went quiet
      } else if (now > start + FIGHT_MS) {
        const fa = f.simA.hp / f.maxA;
        const fb = f.simB.hp / f.maxB;
        if (Math.abs(fa - fb) > 0.005) done = await settleMatch(match, fa > fb ? match.a_id : match.b_id ?? me);
        else await supabase.from('pvp_matches').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('id', match.id).eq('status', 'ready'); // a draw
      }
      match = done ?? (await loadMatch(match.id)) ?? match;
    }
  }

  const start = match.start_at ? new Date(match.start_at).getTime() : null;
  const f = fighters(match, start === null ? 0 : Math.max(0, now - start));
  const theirs = iAmA ? match.b_pos : match.a_pos;
  return NextResponse.json({
    match: await matchView(match, me),
    arena: {
      opponent: theirs ? { x: theirs.x, z: theirs.y, yaw: theirs.yaw ?? 0, hero: theirs.hero ?? null, landed: theirs.landed ?? 0, shots: theirs.shots ?? [] } : null,
      ability: abilityOf((iAmA ? match.a_pos : match.b_pos)?.hero),
      hpMe: Math.round(iAmA ? f.simA.hp : f.simB.hp),
      hpMaxMe: iAmA ? f.maxA : f.maxB,
      hpOpponent: Math.round(iAmA ? f.simB.hp : f.simA.hp),
      hpMaxOpponent: iAmA ? f.maxB : f.maxA,
      draw: match.status === 'cancelled' && !!match.start_at,
    },
  });
}
