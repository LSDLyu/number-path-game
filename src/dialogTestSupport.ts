// jsdom lacks native dialog methods; real focus containment is checked in a browser.
import { beforeAll, beforeEach, vi } from "vitest";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
    this.querySelector<HTMLButtonElement>("button")?.focus();
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

// jsdom cannot play media; browser checks cover real MP3 loading.
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
