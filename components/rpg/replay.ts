// Run replays: where the hero was (every 100ms) and when each enemy was beaten.
// Recorded by the game while you play and sent with the run, so the Cheat catcher can check it
// and admins can watch it. Kept small: positions are tenths of a tile.

export const REPLAY_EVERY_MS = 100;
export const MAX_REPLAY_SAMPLES = 6000; // 10 minutes

export interface Replay {
  v: 1;
  samples: [number, number, number][]; // [ms since start, x * 10, y * 10]
  kills: [number, number, number][]; // [ms, tile x, tile y]
  end: number; // ms
}

export function newReplay(): Replay {
  return { v: 1, samples: [], kills: [], end: 0 };
}

export function recordSample(r: Replay, t: number, x: number, y: number) {
  const last = r.samples[r.samples.length - 1];
  if (last && t - last[0] < REPLAY_EVERY_MS) return;
  if (r.samples.length >= MAX_REPLAY_SAMPLES) return;
  r.samples.push([Math.round(t), Math.round(x * 10), Math.round(y * 10)]);
}

// The hero's position at time t (for the replay viewer).
export function positionAt(r: Replay, t: number): { x: number; y: number } {
  const s = r.samples;
  if (!s.length) return { x: 0, y: 0 };
  let i = 0;
  while (i < s.length - 1 && s[i + 1][0] <= t) i++;
  const a = s[i];
  const b = s[Math.min(i + 1, s.length - 1)];
  const k = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : 0;
  return { x: (a[1] + (b[1] - a[1]) * k) / 10, y: (a[2] + (b[2] - a[2]) * k) / 10 };
}
