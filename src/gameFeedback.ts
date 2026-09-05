export type Point = [number, number];
export type FeedbackSettings = { effects: boolean; haptics: boolean; focus: boolean };
export const feedbackKey = "zide-number-path-feedback-v1";
export const celebrationLevels = {
  3: { particles: 16, bursts: 1, duration: 1200, vibration: [35, 60, 55] },
  4: { particles: 30, bursts: 1, duration: 1600, vibration: [40, 60, 70] },
  5: { particles: 54, bursts: 2, duration: 2100, vibration: [40, 60, 40, 70, 90] },
  6: { particles: 84, bursts: 3, duration: 2600, vibration: [45, 60, 45, 70, 110] },
};

export function loadFeedback(): FeedbackSettings {
  const defaults = { effects: true, haptics: true, focus: true };
  try {
    const saved = JSON.parse(window.localStorage.getItem(feedbackKey) || "null");
    for (const key of Object.keys(defaults) as (keyof FeedbackSettings)[]) {
      if (typeof saved?.[key] === "boolean") defaults[key] = saved[key];
    }
  } catch { /* Storage is optional. */ }
  return defaults;
}

// A local dead end means there is no legal forward step. This is deliberately
// not a comparison with the stored solution: another valid route is allowed.
export function hasForwardMove(path: Point[], size: number, clues: Map<string, number>, end: number) {
  if (path.length === size * size) return true;
  const [row, column] = path[path.length - 1];
  const visited = new Set(path.map(([r, c]) => `${r}-${c}`));
  const expected = Math.max(...path.map(([r, c]) => clues.get(`${r}-${c}`) || 1)) + 1;
  return [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]].some(([r, c]) => {
    if (r < 0 || c < 0 || r >= size || c >= size || visited.has(`${r}-${c}`)) return false;
    const clue = clues.get(`${r}-${c}`);
    if (clue && clue !== expected) return false;
    if (clue === end && path.length + 1 !== size * size) return false;
    if (path.length + 1 === size * size && clue !== end) return false;
    return true;
  });
}
