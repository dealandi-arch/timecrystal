import type { Replay } from './replay';

// PvP Race: you and one opponent play the same level; the faster finish wins.
// The opponent is either a ghost (a recorded run) or a live player (their position is streamed in).

export const RACE_COUNTDOWN_MS = 3500;

export interface RaceLive {
  // Local epoch ms when everyone is let go, or null while the other player hasn't reached the level yet.
  getStartAt: () => number | null;
  // Report my position (ms = -1 while waiting at the start; that tells the server I'm ready).
  send: (x: number, y: number, ms: number) => void;
  opponent: { current: { x: number; y: number } | null }; // latest opponent position, in tiles
}

export interface RaceConfig {
  opponentName: string;
  ghost?: Replay;
  live?: RaceLive;
  onFinish: (stats: { timeMs: number; usedAbility: boolean; replay?: Replay }, ticket: string | null) => void;
}
