// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NumberPathGame } from "./NumberPathGame";
import puzzles from "./number-path-puzzles.json";
import { celebrationLevels, feedbackKey } from "./gameFeedback";
import "./dialogTestSupport";

const vibration = vi.fn();
function step([r, c]: number[]) {
  fireEvent.click(screen.getByRole("gridcell", { name: new RegExp(`^${r + 1} 行 ${c + 1} 列`) }));
}
async function start() {
  const view = render(<NumberPathGame />);
  await screen.findByText(/继续勘察第 1 题/);
  return view;
}
beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibration });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
  vibration.mockClear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("game feedback", () => {
  it.each([3, 4, 5, 6] as const)("celebrates size %i exactly once and clears effects when changing case", async (size) => {
    const view = await start();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${size}×${size}`) }));
    vibration.mockClear();
    puzzles[String(size) as `${typeof size}`][0].route.slice(1).forEach(step);
    expect(screen.getByText("破案成功！")).toBeTruthy();
    expect(vibration).toHaveBeenCalledExactlyOnceWith(celebrationLevels[size].vibration);
    expect(view.container.querySelectorAll("[data-celebration] i")).toHaveLength(celebrationLevels[size].particles);
    step(puzzles[String(size) as `${typeof size}`][0].route.at(-1)!);
    expect(vibration).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "挑战下一题" }));
    expect(view.container.querySelector("[data-celebration]")).toBeNull();
  });

  it("warns and vibrates once on a dead end, then clears it after undo", async () => {
    await start();
    [[0, 1], [0, 2], [1, 2], [1, 1], [2, 1], [2, 0], [1, 0]].forEach(step);
    expect(screen.getByText(/这条路暂时走不通了/)).toBeTruthy();
    expect(vibration).toHaveBeenCalledExactlyOnceWith([30, 65, 30]);
    step([1, 0]);
    expect(vibration).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "撤回一步" }));
    expect(screen.queryByText(/这条路暂时走不通了/)).toBeNull();
  });

  it("persists all switches and completes silently when effects and vibration are off", async () => {
    let view = await start();
    fireEvent.click(screen.getByRole("button", { name: "体验设置" }));
    ["通关动效", "震动反馈", "自动聚焦棋盘"].forEach((name) => fireEvent.click(screen.getByLabelText(name)));
    fireEvent.click(screen.getByRole("button", { name: "关闭面板" }));
    expect(JSON.parse(localStorage.getItem(feedbackKey)!)).toEqual({ effects: false, haptics: false, focus: false });
    view.unmount();
    view = await start();
    vibration.mockClear();
    puzzles["3"][0].route.slice(1).forEach(step);
    expect(screen.getByText("破案成功！")).toBeTruthy();
    expect(view.container.querySelector("[data-celebration]")).toBeNull();
    expect(vibration).not.toHaveBeenCalled();
    expect((screen.getByLabelText("自动聚焦棋盘") as HTMLInputElement).checked).toBe(false);
  });

  it("does not replay celebrations or haptics on refresh", async () => {
    const view = await start();
    puzzles["3"][0].route.slice(1).forEach(step);
    view.unmount();
    vibration.mockClear();
    const restored = render(<NumberPathGame />);
    await screen.findByText(/这宗谜案已归档/);
    expect(restored.container.querySelector("[data-celebration]")).toBeNull();
    expect(vibration).not.toHaveBeenCalled();
  });

  it("degrades without vibration support and respects reduced motion", async () => {
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined });
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    const view = await start();
    fireEvent.click(screen.getByRole("button", { name: "体验设置" }));
    expect((screen.getByLabelText("震动反馈") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/已跟随系统减少动态效果/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "关闭面板" }));
    puzzles["3"][0].route.slice(1).forEach(step);
    await waitFor(() => expect(screen.getByText("破案成功！")).toBeTruthy());
    expect(view.container.querySelector("[data-celebration]")).toBeNull();
  });
});
