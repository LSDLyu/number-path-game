// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import rawPuzzles from "./number-path-puzzles.json";
import { App } from "./App";
import { NumberPathGame } from "./NumberPathGame";
import "./dialogTestSupport";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/number-path-game/?lang=zh");
});

describe("NumberPathGame progress persistence", () => {
  it("restores the last size, puzzle, and path after a refresh", async () => {
    window.localStorage.setItem("zide-number-path-progress-v1", JSON.stringify({
      paths: {},
      completed: Object.fromEntries(rawPuzzles["6"].slice(0, 16).map((puzzle) => [`6-${puzzle.number}`, 30])),
    }));
    const view = render(<NumberPathGame locale="zh" />);
    await screen.findByText(/继续勘察第 1 题/);

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
    render(<NumberPathGame locale="zh" />);

    await screen.findByRole("heading", { name: "第 17 题" });
    expect(screen.getByRole("button", { name: /6×6/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText((_, element) => element?.textContent === "已勘察 2 / 36 格")).toBeTruthy();
  });

  it("renders the complete English interface when locale is English", async () => {
    render(<NumberPathGame locale="en" />);

    await screen.findByRole("heading", { name: "Case 1" });
    expect(screen.getByRole("heading", { name: "Number Path Detectives" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Choose a board size" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "How to play" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Give me a clue" })).toBeTruthy();
  });

  it("switches the standalone package and its live links to English", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: "Switch to English" }));

    await screen.findByRole("heading", { name: "Case 1" });
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("Number Path Detectives | Zide Learning");
    expect(screen.getByRole("link", { name: "Official game page" }).getAttribute("href"))
      .toBe("https://edu.alading.org/en/games/number-path");
    expect(screen.getByText("ChatGPT collaboration · human review")).toBeTruthy();
  });
});
