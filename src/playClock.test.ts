import { describe, expect, it } from "vitest";
import { createPlayClock } from "./playClock";

describe("active play clock", () => {
  it("counts play, pauses between sessions, and resumes a saved duration", () => {
    let now = 1000;
    const clock = createPlayClock(2300, () => now);
    now += 60_000;
    expect(clock.read()).toBe(2300);
    clock.start();
    now += 1500;
    clock.start(); // A repeated start must not discard the running segment.
    expect(clock.pause()).toBe(3800);
    now += 60_000;
    expect(clock.pause()).toBe(3800);
    clock.start();
    now += 2200;
    expect(clock.pause()).toBe(6000);
    const restored = createPlayClock(clock.read(), () => now);
    now += 60_000;
    expect(restored.read()).toBe(6000);
    restored.start();
    now += 1000;
    expect(restored.read()).toBe(7000);
  });

  it("resets only the current clock and ignores invalid saved durations", () => {
    let now = 1000;
    const clock = createPlayClock(4000, () => now);
    clock.start();
    now += 500;
    clock.reset();
    now += 2000;
    expect(clock.read()).toBe(0);
    for (const invalid of [-100, NaN, Infinity]) expect(createPlayClock(invalid).read()).toBe(0);
  });
});
