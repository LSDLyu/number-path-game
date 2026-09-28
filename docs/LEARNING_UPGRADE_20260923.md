# Learning-game upgrade — release preparation 2026-09-28

Implemented in this branch:
- Lisa: versioned device-local save/continue and unlocked replay; pause/defeat choices retaining collected letters; safe learning card with explicit continue and repeat audio; contextual button/tutorial labels; first letter before hazards; three-question sound-picture/case review without heart penalties; first-response learning records/parent view; train stamp emphasis, slope help and bubble status; mobile progress and menu navigation.
- Number Path: three-stage hints, interactive tutorial, route dots, ordered practice focuses, optional timer and route-step review, persistent hint-assisted/independent completion plus strategy records, parent view and focus layout.
- Games router: Learning Games title, learning labels, landscape advice and local-save disclosure. Existing routing is preserved.

Validation:
- Number Path: 45 tests passed; TypeScript and production build passed. Browser checked region hints, exact third-stage hints and guided-practice dialog.
- Lisa: ten-level Canvas/physics regression passed; new learning regression passed for save/restore, safe indefinite pause, retry retention, first-answer scoring, locked levels and contextual slope help.
- For the mirrored Lisa regression, install `@napi-rs/canvas` in the test environment and run `LISA_DIST=public/games/lisa-letter-adventure node tests/lisa/game-regression.cjs` and the equivalent command for `learning-regression.cjs`.
- Real iPad multi-touch/audio and static Lisa browser layout checks have not been certified.

Release scope:
- Publish the validated learning features with device speech as fallback; fixed recordings are an explicitly partial delivery.
- Eleven licensed Commons recordings are bundled: apple, ant, ball, banana, cat, cake, dog, duck, egg, frog, goat. Each MP3 has source, author, CC BY-SA 3.0 license and conversion credit in audio/credits.json and audio/credits.html.
- Forty-one words still use device speech. The strict check-word-audio.py gate intentionally reports these missing recordings. Commons media downloads returned HTTP 429; import-commons-audio.py stops new requests on rate limiting and resumes from existing attributed files.
- Number Path: all 45 tests and production build passed on 2026-09-28. Lisa: ten-level game and learning regressions passed. Bundled audio codec, duration and attribution checked.
- workers/lisa-games-router.js now includes a scoped Number Path proxy and asset rewriting, so both games can later follow GitHub Pages without replacing the main website. Exact routes, methods, directory response and unrelated-route pass-through are checked.
- Cloudflare dashboard is still blocked by human-verification in the available browser. The router has NOT been deployed. The official Number Path route and games directory therefore remain unchanged until this update is deployed.
- Real iPad audio and multi-touch testing remains outstanding. No claim of complete device certification is made.
