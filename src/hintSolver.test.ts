import { describe, expect, it } from "vitest";
import puzzles from "./number-path-puzzles.json";
import { solveFromPath, type Point } from "./hintSolver";

// This simple exhaustive oracle has no pruning shared with the production solver.
function solutions(size: number, clues: number[][]): Point[][] {
  const map = new Map(clues.map(([r, c, n]) => [`${r},${c}`, n]));
  const start = clues.find((clue) => clue[2] === 1)!.slice(0, 2) as Point;
  const end = Math.max(...clues.map((clue) => clue[2]));
  const result: Point[][] = [], path = [start], seen = new Set([start.join(",")]);
  const visit = (next: number) => {
    if (path.length === size * size) { if (next === end + 1) result.push([...path]); return; }
    const [r, c] = path.at(-1)!;
    for (const point of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Point[]) {
      const [y, x] = point, key = point.join(","), clue = map.get(key);
      if (y < 0 || x < 0 || y >= size || x >= size || seen.has(key) || (clue && clue !== next)) continue;
      if (clue === end && path.length !== size * size - 1) continue;
      path.push(point); seen.add(key); visit(next + (clue ? 1 : 0)); seen.delete(key); path.pop();
    }
  };
  visit(2);
  return result;
}

describe("path-aware hints", () => {
  it("accepts either valid route in a puzzle with multiple solutions", () => {
    const clues = [[0, 0, 1], [2, 2, 2]];
    const routes = solutions(3, clues);
    expect(routes.length).toBeGreaterThan(1);
    for (const route of routes) {
      const prefix = route.slice(0, 4);
      const result = solveFromPath({ size: 3, clues, path: prefix });
      expect(result.status).toBe("solved");
      if (result.status === "solved") {
        expect(result.route.slice(0, 4)).toEqual(prefix);
        expect(routes).toContainEqual(result.route);
      }
    }
  });

  it("agrees with exhaustive 3×3 solutions for every legal prefix", () => {
    const clues = [[0, 0, 1], [2, 2, 2]], routes = solutions(3, clues);
    const seen = new Set(["0,0"]), path: Point[] = [[0, 0]];
    let checked = 0;
    const visit = () => {
      const key = JSON.stringify(path);
      const possible = routes.some((route) => JSON.stringify(route.slice(0, path.length)) === key);
      expect(solveFromPath({ size: 3, clues, path }).status).toBe(possible ? "solved" : "blocked");
      checked++;
      if (path.length === 9) return;
      const [r, c] = path.at(-1)!;
      for (const point of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Point[]) {
        const [y, x] = point, pointKey = point.join(",");
        if (y < 0 || x < 0 || y >= 3 || x >= 3 || seen.has(pointKey)) continue;
        if (y === 2 && x === 2 && path.length !== 8) continue;
        path.push(point); seen.add(pointKey); visit(); seen.delete(pointKey); path.pop();
      }
    };
    visit();
    expect(checked).toBeGreaterThan(30);
  });

  it.each([3, 4, 5, 6] as const)("keeps valid solution prefixes in every size %i case", (size) => {
    for (const puzzle of puzzles[`${size}`]) {
      const path = puzzle.route.slice(0, -5) as Point[];
      const result = solveFromPath({ size, clues: puzzle.clues, path });
      expect(result.status, `case ${puzzle.number}`).toBe("solved");
      if (result.status === "solved") {
        expect(result.route).toHaveLength(size * size);
        expect(result.route.slice(0, path.length)).toEqual(path);
      }
    }
  });

  it("reports uncertainty on budget exhaustion and rejects illegal clue order", () => {
    const puzzle = puzzles["3"][0];
    expect(solveFromPath({ size: 3, clues: puzzle.clues, path: [puzzle.route[0] as Point] }, 0))
      .toEqual({ status: "unknown" });
    expect(solveFromPath({ size: 3, clues: [[0, 0, 1], [0, 1, 3], [2, 2, 2]], path: [[0, 0], [0, 1]] }))
      .toEqual({ status: "blocked" });
  });
});
