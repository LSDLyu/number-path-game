// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NumberPathGame } from "./NumberPathGame";
import puzzles from "./number-path-puzzles.json";
import "./dialogTestSupport";

const key = "zide-number-path-progress-v1";
const cell = ([r, c]: number[]) => screen.getByRole("gridcell", { name: new RegExp(`^${r + 1} 行 ${c + 1} 列`) });
const step = (point: number[]) => fireEvent.click(cell(point));
const saved = () => JSON.parse(localStorage.getItem(key)!);
const count = () => Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"));
async function start() {
  const view = render(<NumberPathGame />);
  await screen.findByText(/继续勘察第/);
  return view;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("focused play experience", () => {
  it("opens auxiliary panels on demand and cancels a restart without losing the path", async () => {
    await start();
    expect(screen.queryByRole("dialog")).toBeNull();
    puzzles["3"][0].route.slice(1, 4).forEach(step);
    fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
    const confirmation = screen.getByRole("dialog", { name: "重新开始这一题？" });
    expect(within(confirmation).getByText(/最佳成绩和解锁进度都会保留/)).toBeTruthy();
    fireEvent.click(within(confirmation).getByRole("button", { name: "继续游戏" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(count()).toBe(4);
    expect(saved().paths["3-1"]).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "选择关卡" }));
    const cases = screen.getByRole("dialog", { name: "选择关卡 · 3×3" });
    expect((within(cases).getByRole("button", { name: "第 2 题 · 未解锁" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(cases).getByRole("button", { name: /继续闯关/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(count()).toBe(4);
  });

  it("remembers each category's case and path, including legacy saves", async () => {
    localStorage.setItem(key, JSON.stringify({ paths: { "3-2": puzzles["3"][1].route.slice(0, 3) },
      completed: { "3-1": 20 }, lastCase: { size: 3, number: 2 } }));
    await start();
    expect(screen.getByRole("heading", { name: "第 2 题" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /4×4/ }));
    puzzles["4"][0].route.slice(1, 3).forEach(step);
    fireEvent.click(screen.getByRole("button", { name: /3×3/ }));
    expect(screen.getByRole("heading", { name: "第 2 题" })).toBeTruthy();
    expect(count()).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: /4×4/ }));
    expect(count()).toBe(3);
    expect(saved().lastCases).toEqual({ "3": 2, "4": 1 });
  });

  it("backtracks to a visited square and offers one keyboard tab stop for the board", async () => {
    await start();
    const route = puzzles["3"][0].route, grid = screen.getByRole("grid");
    route.slice(1, 5).forEach(step);
    step(route[1]);
    expect(count()).toBe(2);
    expect(grid.getAttribute("tabindex")).toBe("0");
    expect(screen.getAllByRole("gridcell").every((item) => item.getAttribute("tabindex") === "-1")).toBe(true);
    expect(grid.getAttribute("aria-activedescendant")).toBe(`cell-3-${route[1].join("-")}`);
    fireEvent.keyDown(grid, { key: "Backspace" });
    expect(count()).toBe(1);
    const delta = [route[1][0] - route[0][0], route[1][1] - route[0][1]];
    const direction = delta[0] ? (delta[0] > 0 ? "ArrowDown" : "ArrowUp") : (delta[1] > 0 ? "ArrowRight" : "ArrowLeft");
    fireEvent.keyDown(grid, { key: direction });
    expect(count()).toBe(2);
    fireEvent.keyDown(grid, { key: "z" });
    expect(count()).toBe(1);
  });

  it("fills fast straight drags, ignores other fingers, and stops at illegal moves or cancellation", async () => {
    await start();
    const grid = screen.getByRole("grid");
    Object.defineProperties(grid, {
      clientWidth: { value: 300 }, clientHeight: { value: 300 },
      clientLeft: { value: 0 }, clientTop: { value: 0 }, setPointerCapture: { value: vi.fn() },
    });
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({ left: 10, top: 20, right: 310, bottom: 320, width: 300, height: 300, x: 10, y: 20, toJSON() {} });
    const pointer = (target: Element, type: string, x: number, y: number, id = 1, samples?: { clientX: number; clientY: number }[]) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
      Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: true }, getCoalescedEvents: { value: () => samples ?? [] } });
      fireEvent(target, event);
    };
    pointer(cell([0, 0]), "pointerdown", 60, 70);
    pointer(grid, "pointermove", 260, 70, 2);
    expect(count()).toBe(1);
    pointer(grid, "pointermove", 260, 70);
    expect(saved().paths["3-1"]).toEqual([[0, 0], [0, 1], [0, 2]]);
    // Captured pointer clicks must not apply a second move to the starting cell.
    fireEvent.click(cell([0, 0]), { detail: 1 });
    expect(count()).toBe(3);
    pointer(grid, "pointermove", 260, 270);
    expect(count()).toBe(4); // Stops before the finish at row 3, column 3.
    pointer(grid, "pointercancel", 260, 270);
    pointer(grid, "pointermove", 160, 170);
    expect(count()).toBe(4);
    pointer(cell([1, 2]), "pointerdown", 260, 170);
    // Coalesced samples preserve a turn that is absent from the final event.
    pointer(grid, "pointermove", 160, 270, 1, [{ clientX: 160, clientY: 170 }]);
    expect(saved().paths["3-1"].slice(-2)).toEqual([[1, 1], [2, 1]]);
    pointer(grid, "pointerup", 160, 270);
  });

  it("announces the hint coordinates and discards stale worker results", async () => {
    const instances: { onmessage: ((event: MessageEvent) => void) | null; terminate: ReturnType<typeof vi.fn> }[] = [];
    vi.stubGlobal("Worker", class {
      onmessage = null;
      onerror = null;
      terminate = vi.fn();
      postMessage = vi.fn();
      constructor() { instances.push(this); }
    });
    await start();
    fireEvent.click(screen.getByRole("button", { name: "给我一条线索" }));
    expect(screen.getByText(/下一步可走第 1 行、第 2 列/)).toBeTruthy();
    [[0, 1], [0, 2], [1, 2], [1, 1], [2, 1]].forEach(step);
    fireEvent.click(screen.getByRole("button", { name: "给我一条线索" }));
    expect(instances).toHaveLength(1);
    expect(screen.getByRole("button", { name: "给我一条线索" }).getAttribute("aria-busy")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "撤回一步" }));
    expect(instances[0].terminate).toHaveBeenCalledOnce();
    act(() => instances[0].onmessage?.({ data: { status: "blocked" } } as MessageEvent));
    expect(screen.queryByText(/这条路线无法走满棋盘/)).toBeNull();
    expect(screen.getByRole("button", { name: "给我一条线索" }).getAttribute("aria-busy")).toBe("false");
  });

  it("preserves elapsed time and pauses in panels and background tabs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const view = render(<NumberPathGame />);
    await act(() => vi.advanceTimersByTimeAsync(1));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(saved().elapsedMs["3-1"]).toBe(0);
    step(puzzles["3"][0].route[1]);
    await act(() => vi.advanceTimersByTimeAsync(2500));
    fireEvent.click(screen.getByRole("button", { name: "体验设置" }));
    expect(saved().elapsedMs["3-1"]).toBe(2500);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(saved().elapsedMs["3-1"]).toBe(2500);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "关闭面板" }));
    await act(() => vi.advanceTimersByTimeAsync(1500));
    hidden.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(saved().elapsedMs["3-1"]).toBe(4000);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(saved().elapsedMs["3-1"]).toBe(4000);
    view.unmount();
    hidden.mockReturnValue(false);
    render(<NumberPathGame />);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByLabelText("本次用时 00:04")).toBeTruthy();
    expect(count()).toBe(2);
  });

  it("ends an unresponsive hint search without falsely declaring a dead end", async () => {
    const terminate = vi.fn();
    vi.stubGlobal("Worker", class { terminate = terminate; postMessage = vi.fn(); });
    await start();
    vi.useFakeTimers();
    [[0, 1], [0, 2], [1, 2], [1, 1], [2, 1]].forEach(step);
    fireEvent.click(screen.getByRole("button", { name: "给我一条线索" }));
    await act(() => vi.advanceTimersByTimeAsync(1500));
    expect(terminate).toHaveBeenCalledOnce();
    expect(screen.getByText(/暂时还没找到可靠的下一步/)).toBeTruthy();
    expect(screen.queryByText(/这条路线无法走满棋盘/)).toBeNull();
    expect((screen.getByRole("button", { name: "给我一条线索" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("recovers a malformed saved path without losing unlocked cases", async () => {
    localStorage.setItem(key, JSON.stringify({ paths: { "3-1": [[0, 0], null] }, completed: { "3-1": 20 } }));
    await start();
    expect(count()).toBe(1);
    expect((screen.getByRole("button", { name: "下一题" }) as HTMLButtonElement).disabled).toBe(false);
    expect(saved().completed["3-1"]).toBe(20);
  });

  it("keeps playing and displays an honest warning when progress cannot be saved", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Quota exceeded", "QuotaExceededError"); });
    await start();
    step(puzzles["3"][0].route[1]);
    expect(count()).toBe(2);
    expect(screen.getByText("当前浏览器无法保存进度，关闭页面后可能丢失。")).toBeTruthy();
  });
});
