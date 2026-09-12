export type Point = [number, number];
export type HintRequest = { size: number; clues: number[][]; path: Point[] };
export type HintResult = { status: "solved"; route: Point[] } | { status: "blocked" | "unknown" };

/** Bounded search from the player's path; a timeout never means the path is wrong. */
export function solveFromPath({ size, clues, path }: HintRequest, maxNodes = 100_000): HintResult {
  if (!Number.isInteger(size) || size < 3 || size > 6 || !path.length) return { status: "blocked" };
  const total = size * size;
  const clueAt = new Int8Array(total);
  for (const [r, c, value] of clues) clueAt[r * size + c] = value;
  const end = Math.max(...clues.map((clue) => clue[2]));
  const finish = clueAt.indexOf(end);
  const adjacent = Array.from({ length: total }, (_, cell) => {
    const r = Math.floor(cell / size), c = cell % size;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([y, x]) => y >= 0 && y < size && x >= 0 && x < size).map(([y, x]) => y * size + x);
  });
  const visited = new Uint8Array(total);
  const route: number[] = [];
  let expected = 1;
  for (const [r, c] of path) {
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r >= size || c >= size) return { status: "blocked" };
    const cell = r * size + c, previous = route.at(-1);
    if (visited[cell] || (previous !== undefined && !adjacent[previous].includes(cell))) return { status: "blocked" };
    if ((!route.length && clueAt[cell] !== 1) || (clueAt[cell] && clueAt[cell] !== expected)) return { status: "blocked" };
    if (clueAt[cell]) expected += 1;
    if (cell === finish && route.length !== total - 1) return { status: "blocked" };
    visited[cell] = 1; route.push(cell);
  }
  let nodes = 0, exhausted = false;
  const seen = new Int32Array(total);
  let stamp = 0;
  const reachable = (head: number) => {
    stamp += 1;
    const queue = [head]; seen[head] = stamp;
    for (let i = 0; i < queue.length; i++) {
      for (const cell of adjacent[queue[i]]) if (!visited[cell] && seen[cell] !== stamp) {
        seen[cell] = stamp; queue.push(cell);
      }
    }
    return queue.length === total - route.length + 1;
  };
  const search = (head: number, nextClue: number): boolean => {
    if (++nodes > maxNodes) { exhausted = true; return false; }
    if (route.length === total) return head === finish && nextClue === end + 1;
    const remaining = total - route.length;
    const distance = Math.abs(Math.floor(head / size) - Math.floor(finish / size)) + Math.abs(head % size - finish % size);
    if (distance > remaining || (remaining - distance) % 2 || !reachable(head)) return false;
    // Every unvisited internal square needs an entrance and an exit.
    for (let cell = 0; cell < total; cell++) if (!visited[cell]) {
      const degree = adjacent[cell].filter((n) => !visited[n] || n === head).length;
      if (degree < (cell === finish ? 1 : 2)) return false;
    }
    const options = adjacent[head].filter((cell) => !visited[cell]
      && (!clueAt[cell] || clueAt[cell] === nextClue)
      && (cell !== finish || route.length === total - 1));
    options.sort((a, b) => adjacent[a].filter((n) => !visited[n]).length - adjacent[b].filter((n) => !visited[n]).length);
    for (const cell of options) {
      visited[cell] = 1; route.push(cell);
      if (search(cell, nextClue + (clueAt[cell] ? 1 : 0))) return true;
      route.pop(); visited[cell] = 0;
      if (exhausted) return false;
    }
    return false;
  };
  if (search(route.at(-1)!, expected)) return { status: "solved", route: route.map((cell) => [Math.floor(cell / size), cell % size]) };
  return { status: exhausted ? "unknown" : "blocked" };
}
