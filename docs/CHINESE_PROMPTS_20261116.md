# Chinese prompt recording replacement

Eight user-provided recordings replace the existing Chinese prompt MP3 files. English prompts, the 52 word recordings, sound effects, and all playback logic are unchanged.

| Existing prompt | Source clip |
| --- | --- |
| `common_start` | `01_start_game.mp3` |
| `lisa_jump` | `02_jump_instruction.mp3` |
| `lisa_slow` | `03_no_hearts_retry_take2.mp3` |
| `lisa_picture` | `04_listen_choose_image.mp3` |
| `lisa_retry` | `05_encouragement_recorded.mp3` |
| `common_continue` | `extra_continue.mp3` |
| `common_correct` | `extra_correct.mp3` |
| `common_listen_again` | `extra_listen_again.mp3` |

The retry prompt uses the explicitly approved shorter take; no missing words were synthesized. The original input files are preserved separately. The three common feedback clips retain their existing mapping and do not add new gameplay triggers.

The source recordings were copied byte-for-byte. Updated per-file checksums and media properties are in `iris/chinese-prompts.json`; prior assets remain recoverable in Git history.

## Validation

- 53 existing Vitest tests passed before adding the eight recording-integrity tests.
- All 52 unchanged word recordings passed their media/checksum/source check.
- All eight new prompts decoded with FFmpeg and matched the source clips byte-for-byte.
- TypeScript and the Vite production build passed.
- The older standalone learning harness does not run against the current page (`location is not defined`); it is not claimed as passed. No game behavior changed in this asset-only update.
- Physical iPad/Safari playback and subjective voice quality have not been revalidated here.

The historical package manifest is preserved unchanged and is not a current provenance source for these eight replaced prompts. The new narrow Chinese-prompt manifest supersedes its entries for those files.
