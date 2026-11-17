# Chinese math-path original recordings (2026-11-17)

The three final approved MP3 files replace only `public/iris/audio/prompts/zh/path_rules.mp3`, `path_dead_end.mp3`, and `path_solved.mp3`. Byte hashes exactly match the approved source clips 01, 02, and 03.

- Rules: existing help and replay-instructions buttons.
- Dead end: existing no-legal-next-square event, retaining its 10-second cooldown; second recording take.
- Solved: existing puzzle completion event.

No playback logic, English prompt, common prompt, Lisa letter-game recording, puzzle data, or deployment routing is changed. Assets are not re-encoded, pitch-shifted, or synthesized.

`public/iris/chinese-prompts-20261117.json` is the narrow current provenance record, superseding the historical `manifest.json` entries for these three files only. `SHA256SUMS.txt` contains the current hashes. Historical `scripts.txt` is the original planned script, not a verbatim transcript of the newly recorded clips; the shorter approved dead-end wording is not expanded with synthesized speech.

## Verification

All three files match the approved source SHA-256 and decode fully with FFmpeg. The dedicated integrity tests also check event mappings and provenance. All 86 tests passed, including three new recording-integrity cases. TypeScript and the Vite production build passed. All three built assets match the source SHA-256, and `git diff --check` passed. Vite reported its existing classic `game-shell.js` script warning; the build completed successfully. Physical iPad/Safari playback and subjective audio quality are not claimed as reverified here.
