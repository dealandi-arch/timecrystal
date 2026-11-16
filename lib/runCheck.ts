import { createHmac, timingSafeEqual } from 'crypto';
import { FLOOR, type LevelDef, type Point } from '../components/rpg/levels';

// Checks that a submitted run could really have happened, so times can't simply be typed in.
//
// 1. Start ticket: when a signed-in player starts a level, the server hands out a signed ticket with
//    the start time. A finished run must come with it, and at least as much real time must have passed
//    since the ticket as the run claims to have taken.
// 2. Fastest possible: nobody can finish faster than walking the shortest path to the nearest
//    crystal stop at the fastest speed any hero can reach.

const TICKET_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // rewards that failed to save are re-sent later
const CLOCK_TOLERANCE_MS = 1500; // the ticket is fetched just after the level's clock starts
// Fastest a hero can ever step: the 60ms speed floor, sped up 1.5x by Adrenaline.
export const FASTEST_STEP_MS = 40;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('Backend not configured: set SESSION_SECRET');
  return s;
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

export function createRunTicket(profileId: string, levelId: number): string {
  const body = Buffer.from(JSON.stringify({ p: profileId, l: levelId, t: Date.now() }), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

// When the run started, or null if the ticket isn't valid for this player and level.
export function readRunTicket(ticket: unknown, profileId: string, levelId: number): number | null {
  if (typeof ticket !== 'string') return null;
  const dot = ticket.lastIndexOf('.');
  if (dot < 0) return null;
  const body = ticket.slice(0, dot);
  const given = Buffer.from(ticket.slice(dot + 1));
  const expected = Buffer.from(sign(body));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { p: string; l: number; t: number };
    if (data.p !== profileId || data.l !== levelId || !Number.isFinite(data.t)) return null;
    if (Date.now() - data.t > TICKET_MAX_AGE_MS) return null;
    return data.t;
  } catch {
    return null;
  }
}

// Shortest walk (in tiles) from the start to any crystal stop, through anything that isn't solid wall.
// Heights and fences are ignored, which only makes the limit more generous.
export function shortestPathSteps(level: LevelDef): number {
  const targets = new Set(level.crystalPath.map((p) => `${p.x},${p.y}`));
  const seen = new Set([`${level.start.x},${level.start.y}`]);
  let frontier: Point[] = [level.start];
  for (let steps = 0; frontier.length; steps++) {
    const next: Point[] = [];
    for (const p of frontier) {
      if (targets.has(`${p.x},${p.y}`)) return steps;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p.x + dx;
        const y = p.y + dy;
        const tile = level.grid[y]?.[x];
        if (tile === undefined || (tile !== FLOOR && tile !== 2) || seen.has(`${x},${y}`)) continue;
        seen.add(`${x},${y}`);
        next.push({ x, y });
      }
    }
    frontier = next;
  }
  return 0;
}

export function fastestPossibleMs(level: LevelDef): number {
  return shortestPathSteps(level) * FASTEST_STEP_MS;
}

export type RunCheck = { ok: true } | { ok: false; reason: string; cheat: boolean };

export function checkRun(ticket: unknown, profileId: string, level: LevelDef, timeMs: number): RunCheck {
  const startedAt = readRunTicket(ticket, profileId, level.id);
  // No (or a broken) ticket: refused, but not treated as cheating (an old page, a run from before this check).
  if (startedAt === null) return { ok: false, reason: 'This run couldn’t be checked. Reload the page and play the level again.', cheat: false };
  // A run can't have taken longer than the real time since the level started:
  // e.g. a ticket fetched and a 2.2s time sent half a second later.
  const realMs = Date.now() - startedAt;
  if (timeMs > realMs + CLOCK_TOLERANCE_MS) return { ok: false, reason: 'That time doesn’t match how long the level was really open.', cheat: true };
  // (Test servers play small stand-in levels, so the real level's shortest path doesn't apply there.)
  if (process.env.TC_TEST_LEVELS !== '1' && timeMs < fastestPossibleMs(level)) return { ok: false, reason: 'That time is faster than anyone could possibly finish this level.', cheat: true };
  return { ok: true };
}
