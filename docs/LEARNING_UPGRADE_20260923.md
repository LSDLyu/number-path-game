# Learning-game upgrade checkpoint — not released

Implemented in this branch:
- Lisa: versioned device-local save/continue and unlocked replay; pause/defeat choices retaining collected letters; safe learning card with explicit continue and repeat audio; contextual button/tutorial labels; first letter before hazards; three-question sound-picture/case review without heart penalties; first-response learning records/parent view; train stamp emphasis, slope help and bubble status; mobile progress and menu navigation.
- Number Path: three-stage hints, interactive tutorial, route dots, ordered practice focuses, optional timer and route-step review, persistent hint-assisted/independent completion plus strategy records, parent view and focus layout.
- Games router: Learning Games title, learning labels, landscape advice and local-save disclosure. Existing routing is preserved.

Validation:
- Number Path: 45 tests passed; TypeScript and production build passed. Browser checked region hints, exact third-stage hints and guided-practice dialog.
- Lisa: ten-level Canvas/physics regression passed; new learning regression passed for save/restore, safe indefinite pause, retry retention, first-answer scoring, locked levels and contextual slope help.
- For the mirrored Lisa regression, install `@napi-rs/canvas` in the test environment and run `LISA_DIST=public/games/lisa-letter-adventure node tests/lisa/game-regression.cjs` and the equivalent command for `learning-regression.cjs`.
- Real iPad multi-touch/audio and static Lisa browser layout checks have not been certified.

Remaining release gates:
1. Bundle and verify the 52 licensed word recordings. The audio manifest is still empty; working system speech remains the fallback. No claim of bundled recording completion is made.
2. Restore authorized Cloudflare publication access. Dashboard security verification blocked the available session; no safeguard was bypassed.
3. Publish the games router and Number Path routes through their existing Cloudflare services. Updating GitHub alone does not update those two official routes.
4. Verify the official pages and Lisa Sites publication, then merge/release this checkpoint. Preserve any newer changes on main.

No production deployment was performed for this checkpoint.
