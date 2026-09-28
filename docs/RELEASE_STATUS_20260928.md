# Learning upgrade release — 2026-09-28

- Feature/audio commit: 23ca45d1156e45304328f924bd65df024cdbb2dd; GitHub Pages workflow 36408663673 succeeded.
- Official Lisa page verified at https://edu.alading.org/games/lisa-letter-adventure/ with version 2026-09-28-learning-resume-review. Start/tutorial/menu and refresh-resume were checked in the browser.
- Number Path upgrade is live at https://lsdlyu.github.io/number-path-game/; first-stage reasoning hints and teaching controls were verified in the browser. All 45 tests and production build pass.
- Lisa Sites version 20 was deployed successfully. Both Lisa regression suites pass, including ten-level completion and learning/persistence behavior.
- 11 attributed CC BY-SA 3.0 recordings are bundled; 41 words use device speech. Remaining downloads were stopped after media-host HTTP 429. See audio/credits.html and tests/lisa/import-commons-audio.py. The strict full-audio checker still reports the missing words.
- Formal games directory and Number Path remain unchanged: the Cloudflare dashboard is blocked by human verification. Deploy workers/lisa-games-router.js to the existing games route after authorized access is restored. The prepared worker serves the learning directory and scopes both game proxies without replacing the main site.
- Physical iPad audio/multi-touch and portrait/short-landscape device checks remain unverified.
