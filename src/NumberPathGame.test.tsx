// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import rawPuzzles from "./number-path-puzzles.json";
import { NumberPathGame } from "./NumberPathGame";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
});

describe("NumberPathGame progress persistence", () => {
  it("restores the last size, puzzle, and path after a refresh", async () => {
    const view = render(<NumberPathGame />);
    await screen.findByRole("heading", { name: "第 1 题" });

    fireEvent.click(screen.getByRole("button", { name: /6×6/ }));
    fireEvent.change(screen.getByLabelText("快速选择题目"), { target: { value: "16" } });
    await screen.findByRole("heading", { name: "第 17 题" });

    const secondStep = rawPuzzles["6"][16].route[1];
    fireEvent.click(screen.getByRole("gridcell", {
      name: new RegExp(`${secondStep[0] + 1} 行 ${secondStep[1] + 1} 列`),
    }));

    await waitFor(() => {
      expect(screen.getByText((_, element) => element?.textContent === "已勘察 2 / 36 格")).toBeTruthy();
    });

    view.unmount();
    render(<NumberPathGame />);

    await screen.findByRole("heading", { name: "第 17 题" });
    expect(screen.getByRole("button", { name: /6×6/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText((_, element) => element?.textContent === "已勘察 2 / 36 格")).toBeTruthy();
  });
});
