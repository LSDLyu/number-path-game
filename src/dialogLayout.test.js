import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./NumberPathGame.module.css", import.meta.url), "utf8");

describe("dialog layout", () => {
  it("centers dialogs in the viewport on desktop", () => {
    const desktopRule = styles.match(/\.dialog\s*\{([^}]*)\}/)?.[1];
    expect(desktopRule).toContain("margin: auto;");
  });

  it("keeps the mobile dialog anchored near the safe-area bottom", () => {
    expect(styles).toMatch(/@media \(max-width: 540px\)[\s\S]*\.dialog \{[^}]*bottom: max\(10px, env\(safe-area-inset-bottom\)\);[^}]*margin: 0 auto;/);
  });
});
