import { describe, expect, it } from "vitest";
import puzzles from "./number-path-puzzles.json";
import { hasForwardMove, type Point } from "./gameFeedback";

describe("local dead-end detection", () => {
  it("never flags any prefix of all 319 verified solutions as a dead end", () => {
    let count = 0;
    for (const [size, cases] of Object.entries(puzzles)) {
      for (const puzzle of cases) {
        const clues = new Map(puzzle.clues.map(([r, c, n]) => [`${r}-${c}`, n]));
        const end = Math.max(...clues.values());
        for (let length = 1; length <= puzzle.route.length; length++) {
          expect(hasForwardMove(puzzle.route.slice(0, length) as Point[], Number(size), clues, end)).toBe(true);
        }
        count++;
      }
    }
    expect(count).toBe(319);
  });

  it("detects a trapped head while treating the premature finish as unavailable", () => {
    const clues = new Map(puzzles["3"][0].clues.map(([r, c, n]) => [`${r}-${c}`, n]));
    const route: Point[] = [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [2, 1], [2, 0]];
    expect(hasForwardMove(route, 3, clues, 4)).toBe(true); // Can still visit clue 3.
    expect(hasForwardMove([...route, [1, 0]], 3, clues, 4)).toBe(false);
    expect(hasForwardMove([[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [2, 1]], 3, clues, 4)).toBe(true);
  });
});
