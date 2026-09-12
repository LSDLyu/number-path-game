/** Accumulates active play time, independently of display ticks. */
export function createPlayClock(initialMs = 0, now: () => number = Date.now) {
  let accumulated = Number.isFinite(initialMs) && initialMs > 0 ? initialMs : 0;
  let started: number | null = null;
  const read = () => accumulated + (started === null ? 0 : Math.max(0, now() - started));
  return {
    read,
    start() { if (started === null) started = now(); },
    pause() { accumulated = read(); started = null; return accumulated; },
    reset() { accumulated = 0; started = null; },
  };
}
