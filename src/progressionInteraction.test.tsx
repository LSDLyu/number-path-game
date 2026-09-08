// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NumberPathGame } from "./NumberPathGame";
import puzzles from "./number-path-puzzles.json";

const storageKey = "zide-number-path-progress-v1";
const sizes = [3, 4, 5, 6] as const;

function step([row, column]: number[]) {
  fireEvent.click(screen.getByRole("gridcell", { name: new RegExp(`^${row + 1} 行 ${column + 1} 列`) }));
}

function caseButton(number: number) {
  return screen.getByRole("button", { name: new RegExp(`^第 ${number} 题(?:，| ·|$)`) }) as HTMLButtonElement;
}

function nextButton() {
  return screen.getByRole("button", { name: "下一题" }) as HTMLButtonElement;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("sequential case progression", () => {
  it.each(sizes)("starts size %i with only Case 1 unlocked and guards every selector", async (size) => {
    render(<NumberPathGame />);
    await screen.findByText(/继续勘察第 1 题/);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${size}×${size}`) }));

    expect(caseButton(1).disabled).toBe(false);
    expect(caseButton(2).disabled).toBe(true);
    expect(caseButton(puzzles[`${size}`].length).disabled).toBe(true);
    expect(nextButton().disabled).toBe(true);
    expect((screen.getByRole("button", { name: "上一题" }) as HTMLButtonElement).disabled).toBe(true);
    const select = screen.getByLabelText("快速选择题目") as HTMLSelectElement;
    expect(Array.from(select.options).slice(1).every((option) => option.disabled)).toBe(true);

    fireEvent.click(caseButton(2));
    fireEvent.click(nextButton());
    // Even a programmatic change event must pass the shared navigation guard.
    fireEvent.change(select, { target: { value: "2" } });
    expect(screen.getByRole("heading", { name: "第 1 题" })).toBeTruthy();
    expect(screen.getByText("请先完成第 1 题，再继续后面的题目。")).toBeTruthy();
  });

  it.each(sizes)("unlocks the next size %i case after completion and keeps other sizes independent", async (size) => {
    const view = render(<NumberPathGame />);
    await screen.findByText(/继续勘察第 1 题/);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${size}×${size}`) }));
    puzzles[`${size}`][0].route.slice(1).forEach(step);

    expect(caseButton(2).disabled).toBe(false);
    expect(caseButton(3).disabled).toBe(true);
    expect(nextButton().disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "挑战下一题" }));
    expect(screen.getByRole("heading", { name: "第 2 题" })).toBeTruthy();
    expect(nextButton().disabled).toBe(true);

    view.unmount();
    render(<NumberPathGame />);
    await screen.findByText(/继续勘察第 2 题/);
    expect(caseButton(2).disabled).toBe(false);
    expect(caseButton(3).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${size === 3 ? 4 : 3}×${size === 3 ? 4 : 3}`) }));
    expect(caseButton(2).disabled).toBe(true);
  });

  it("keeps unlocks and best time when restarting, refreshing, and finishing a replay", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const route = puzzles["3"][0].route;
    localStorage.setItem(storageKey, JSON.stringify({
      paths: { "3-1": route }, completed: { "3-1": 1 }, lastCase: { size: 3, number: 1 },
    }));
    const view = render(<NumberPathGame />);
    await screen.findByText(/这宗谜案已归档/);
    fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
    expect(screen.queryByText("破案成功！")).toBeNull();
    expect(caseButton(2).disabled).toBe(false);
    expect(nextButton().disabled).toBe(false);
    step(route[1]);
    expect(JSON.parse(localStorage.getItem(storageKey)!).completed["3-1"]).toBe(1);

    view.unmount();
    render(<NumberPathGame />);
    await screen.findByText(/继续勘察第 1 题：已走 2 格/);
    expect(screen.queryByText("破案成功！")).toBeNull();
    expect(caseButton(2).disabled).toBe(false);
    vi.mocked(Date.now).mockReturnValue(11000);
    route.slice(2).forEach(step);
    expect(screen.getByText("破案成功！")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(storageKey)!).completed["3-1"]).toBe(1);
  });

  it("retains legacy records while requiring earlier gaps to be completed", async () => {
    localStorage.setItem(storageKey, JSON.stringify({
      paths: { "3-3": puzzles["3"][2].route }, completed: { "3-3": 12 }, lastCase: { size: 3, number: 3 },
    }));
    render(<NumberPathGame />);
    await screen.findByText(/继续勘察第 1 题/);
    expect(caseButton(3).disabled).toBe(true);
    puzzles["3"][0].route.slice(1).forEach(step);
    expect(caseButton(2).disabled).toBe(false);
    expect(caseButton(3).disabled).toBe(true);
    fireEvent.click(nextButton());
    puzzles["3"][1].route.slice(1).forEach(step);
    expect(caseButton(3).disabled).toBe(false);
    expect(caseButton(4).disabled).toBe(false);
    expect(caseButton(5).disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(storageKey)!).completed["3-3"]).toBe(12);
  });

  it("finishes the last case without wrapping to another case", async () => {
    const list = puzzles["3"];
    const last = list.at(-1)!;
    localStorage.setItem(storageKey, JSON.stringify({
      paths: {},
      completed: Object.fromEntries(list.slice(0, -1).map((item) => [`3-${item.number}`, 30])),
      lastCase: { size: 3, number: last.number },
    }));
    render(<NumberPathGame />);
    await screen.findByText(new RegExp(`继续勘察第 ${last.number} 题`));
    last.route.slice(1).forEach(step);
    expect(nextButton().disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "挑战下一题" })).toBeNull();
    expect(screen.getByText(/本类别已全部通关/)).toBeTruthy();
    fireEvent.click(nextButton());
    expect(screen.getByRole("heading", { name: `第 ${last.number} 题` })).toBeTruthy();
  });

  it("explains locked cases in English", async () => {
    render(<NumberPathGame locale="en" />);
    await screen.findByText(/Continue Case 1/);
    expect((screen.getByRole("button", { name: "Case 2 · Locked" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Progress separately in each board size. Solve cases in order to unlock the next one.")).toBeTruthy();
  });
});
